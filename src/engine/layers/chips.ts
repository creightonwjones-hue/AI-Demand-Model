// Chips layer (spec §8.2–8.3): GPU retirement and replacement, bullwhip ordering, weakest-link supply cap
// (CoWoS, HBM, power), chip-maker revenue and supplier payments. Units are accelerator-equivalents priced at the
// NVIDIA average selling price. Mutates s.market (installed base, backlog), s.pipeline and s.memory.
import type { EngineState } from '../init';
import { param } from '../params';
import type { Conditions, EngineEvent, EngineParams, Flow, NvidiaQuarter } from '../types';
import { CASH_FUNDED, type CloudsOut } from './clouds';

export type Binding = 'none' | 'cowos' | 'hbm' | 'power';

export interface ChipsOut {
  ordersUnits: number;
  shippedUnits: number;
  replacementUnits: number;
  shortfallUnits: number; // this quarter's paid demand that supply could not ship (backlog holds it, plus unpaid orders)
  bindingConstraint: Binding;
  revenueByMaker: Record<string, number>;
  supplierRevenue: Record<'tsmc' | 'sk-hynix' | 'asml', number>;
  nvidia: Omit<NvidiaQuarter, 'quarter' | 'netIncome' | 'eps'>;
  events: EngineEvent[];
  flows: Flow[];
}

/** Own-design chip programmes: the cloud that funds them and the partner paid for them. */
const CUSTOM: Record<string, string> = { alphabet: 'broadcom', amazon: 'marvell' };
const WEEKS_PER_QUARTER = 13;
const KW_PER_GW = 1e6;

/** Shipment ceiling this quarter and which input binds it. Power caps the installed base, so its limit is headroom. */
export function supplyCapacity(s: EngineState, c: Conditions, p: EngineParams): { units: number; binding: Exclude<Binding, 'none'> } {
  const installed = s.market.installedGpus.reduce((a, v) => a + v.units, 0);
  const powerUnits = (c.powerGw.values[s.q] * KW_PER_GW * param(p, 'powerLoadFactor')) / param(p, 'kwPerAccelerator');
  const caps: [Exclude<Binding, 'none'>, number][] = [
    ['cowos', param(p, 'cowosUnitsPerQuarter')],
    ['hbm', param(p, 'hbmUnitsPerQuarter')],
    ['power', Math.max(0, powerUnits - installed)],
  ];
  const [binding, units] = caps.reduce((a, b) => (b[1] < a[1] ? b : a));
  return { units, binding };
}

export function stepChips(s: EngineState, cl: CloudsOut, c: Conditions, p: EngineParams): ChipsOut {
  const qi = s.q;
  const quarter = s.grid.quarters[qi];
  const asp = param(p, 'nvidiaAspUsd');
  const flows: Flow[] = [];
  const events: EngineEvent[] = [];

  // 1. Arrivals and retirements.
  for (const item of s.pipeline.filter(x => x.kind === 'gpus' && x.arrives === quarter))
    s.market.installedGpus.push({ quarter, units: item.units, costUsd: item.costUsd });
  s.pipeline = s.pipeline.filter(x => x.arrives !== quarter);
  const life = param(p, 'gpuEconomicLifeQuarters');
  const retireBefore = s.grid.quarters[Math.max(0, qi - life)];
  const retired = s.market.installedGpus.filter(v => v.quarter < retireBefore).reduce((a, v) => a + v.units, 0);
  s.market.installedGpus = s.market.installedGpus.filter(v => v.quarter >= retireBefore);

  // 2. What each cloud wants to buy, by maker.
  const wantUsd: Record<string, Record<string, number>> = {}; // maker -> cloud -> USD
  const addWant = (maker: string, cloud: string, usd: number) => { (wantUsd[maker] ??= {})[cloud] = (wantUsd[maker][cloud] ?? 0) + usd; };
  const nvShare = param(p, 'nvidiaShareOfAccelerators');
  for (const [cloud, budget] of Object.entries(cl.chipBudgetByCloud)) {
    if (budget <= 0 || s.defaulted[cloud]) continue;
    const custom = CUSTOM[cloud] ? budget * param(p, 'customChipShareOfBudget') : 0;
    if (custom > 0) addWant(CUSTOM[cloud], cloud, custom);
    addWant('nvidia', cloud, (budget - custom) * nvShare);
    addWant('amd', cloud, (budget - custom) * (1 - nvShare));
  }
  const demandUnits = Object.values(wantUsd).reduce((a, m) => a + Object.values(m).reduce((x, y) => x + y, 0), 0) / asp;

  // 3. Bullwhip ordering against a target backlog of expected shipments.
  const expKey = 'chips:expectedShipments';
  const expected = s.memory[expKey] ?? demandUnits;
  const target = (param(p, 'bullwhipInventoryWeeks') / WEEKS_PER_QUARTER) * expected;
  const ordersUnits = Math.max(0, demandUnits + param(p, 'bullwhipCorrectionRate') * (target - s.market.backlogUnits));
  s.memory[expKey] = expected + param(p, 'expectationGain') * (demandUnits - expected);

  // 4. Weakest-link supply cap.
  const cap = supplyCapacity(s, c, p);
  const available = ordersUnits + s.market.backlogUnits;
  // Units ship only against this quarter's paid demand; the rest (bullwhip extra, older backlog) waits in backlog.
  const shippedUnits = Math.min(available, cap.units, demandUnits);
  const bound = available > cap.units;
  s.market.backlogUnits = available - shippedUnits;
  const fill = demandUnits > 0 ? Math.min(1, shippedUnits / demandUnits) : 0;
  if (bound) events.push({ quarter, entityId: 'nvidia', kind: 'supply-bound',
    reason: `${cap.binding === 'hbm' ? 'HBM memory' : cap.binding === 'cowos' ? 'CoWoS packaging' : 'Data-centre power'} limits shipments to ${Math.round(cap.units).toLocaleString('en-US')} units` });

  // 5. Revenue and payments, in proportion to what shipped.
  const revenueByMaker: Record<string, number> = {};
  let hyperscale = 0;
  let aiCloudsEnterprise = 0;
  let linked = 0;
  for (const [maker, byCloud] of Object.entries(wantUsd)) {
    const label = maker in CUSTOM_PARTNER_LABEL ? CUSTOM_PARTNER_LABEL[maker] : 'Buys GPUs';
    for (const [cloud, usd] of Object.entries(byCloud)) {
      const paid = usd * fill;
      if (paid <= 0) continue;
      revenueByMaker[maker] = (revenueByMaker[maker] ?? 0) + paid;
      flows.push({ quarter, from: cloud, to: maker, amountUsd: paid, kind: 'chip-purchase', label });
      if (maker === 'nvidia') {
        if ((CASH_FUNDED as readonly string[]).includes(cloud)) hyperscale += paid; else aiCloudsEnterprise += paid;
        if (s.nvidiaLinked.includes(cloud)) linked += paid;
      }
    }
  }
  const chipRevenue = Object.values(revenueByMaker).reduce((a, b) => a + b, 0);
  const supplierRevenue = {
    tsmc: chipRevenue * param(p, 'tsmcShareOfChipCost'),
    'sk-hynix': chipRevenue * param(p, 'skHynixShareOfChipCost'),
    asml: 0,
  };
  supplierRevenue.asml = supplierRevenue.tsmc * param(p, 'asmlShareOfTsmcCapex');
  for (const [maker, rev] of Object.entries(revenueByMaker)) {
    const share = rev / chipRevenue;
    flows.push({ quarter, from: maker, to: 'tsmc', amountUsd: supplierRevenue.tsmc * share, kind: 'foundry', label: 'Manufacturing' });
    flows.push({ quarter, from: maker, to: 'sk-hynix', amountUsd: supplierRevenue['sk-hynix'] * share, kind: 'memory-purchase', label: 'Buys memory' });
  }
  if (supplierRevenue.asml > 0) flows.push({ quarter, from: 'tsmc', to: 'asml', amountUsd: supplierRevenue.asml, kind: 'lithography', label: 'Lithography' });

  // 6. Shipped units arrive after the GPU lead time; chip vintages land on the buyers' balance sheets.
  if (shippedUnits > 0) {
    const arrives = s.grid.quarters[Math.min(s.grid.quarters.length - 1, qi + param(p, 'gpuLeadQuarters'))];
    s.pipeline.push({ owner: 'clouds', kind: 'gpus', units: shippedUnits, costUsd: shippedUnits * asp, arrives });
    for (const [cloud, budget] of Object.entries(cl.chipBudgetByCloud)) {
      if (budget <= 0 || !s.ledger.sheets[cloud]) continue;
      s.ledger.sheets[cloud].chipVintages.push({ quarter, units: (budget * fill) / asp, costUsd: budget * fill });
    }
  }

  const edge = param(p, 'edgeNonAiQuarterlyUsd');
  if (edge > 0) flows.push({ quarter, from: 'non-ai-customers', to: 'nvidia', amountUsd: edge, kind: 'customer-spend', label: 'PCs & gaming' });
  const dataCenter = hyperscale + aiCloudsEnterprise;
  const nvRevenue = dataCenter + edge;
  return {
    ordersUnits, shippedUnits, replacementUnits: Math.min(retired, shippedUnits + retired),
    shortfallUnits: Math.max(0, demandUnits - shippedUnits), bindingConstraint: bound ? cap.binding : 'none',
    revenueByMaker, supplierRevenue,
    nvidia: {
      revenue: nvRevenue, dataCenter, hyperscale, aiCloudsEnterprise, edge, physicalAi: 0,
      grossMargin: param(p, 'nvidiaGrossMargin'), unitsShipped: (revenueByMaker.nvidia ?? 0) / asp,
      supplyShortfallUnits: s.market.backlogUnits, customerFinancedShare: nvRevenue > 0 ? linked / nvRevenue : 0,
    },
    events, flows,
  };
}

const CUSTOM_PARTNER_LABEL: Record<string, string> = { broadcom: 'Own chips', marvell: 'Own chips' };
