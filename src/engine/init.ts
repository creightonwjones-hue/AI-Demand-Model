// Initial engine state at a start quarter S, built only from an as-of view (no look-ahead).
//
// Rules (Phase 2):
// - Every entity gets a balance sheet. Filers (entities that file XBRL financials) are `active` once a revenue or cash
//   fact for a quarter before S is known at asOf; before that they are inactive with empty sheets. Every other entity
//   (aggregates, lenders, private companies and non-XBRL filers such as SK Hynix) is active from the start.
// - Opening stocks are the as-of facts for the quarter before S and are authoritative. When that quarter's balance
//   sheet is not yet filed at asOf, the latest fact up to `openingFactMaxStaleQuarters` older is used (noted). An entity
//   whose opening cash is not a reported fact has zero cash and is flagged in `modelled` (its outputs are modelled, not
//   actuals).
// - Debt: each loan deal drawn before S and not yet repaid at S opens as a DebtInstrument on the borrower and the
//   matching LoanAsset on the lender, with the same debt id its later interest/principal obligations use. A borrower
//   with a reported longTermDebt fact also gets one residual instrument owed to `bond-market` = reported debt − its
//   deal-based instruments, floored at 0, so reported debt equals the sum of its instruments. The residual has no stated
//   rate (priced by the finance layer), recourse to the company, and an assumed maturity `defaultLoanTermQuarters` from S.
// - Obligations: only those due at or after S (earlier ones are history, already in the reported stocks).
// - Lab shares: quarterly revenue shares among labs with a revenue fact or a company-stated revenue series known at
//   asOf (latest quarter within the staleness window). Labs without revenue data get no share while any lab has data;
//   when no lab has data, all labs get equal shares. `labShareBasis` records which rule set each share.
// - Installed GPU base: NVIDIA Data Center revenue in each of the previous `gpuEconomicLifeQuarters` quarters ÷
//   `nvidiaAspUsd`, one modelled Vintage per quarter with a known fact.
// - Market prices start at the conditions' no-data placeholders (params); the first step overwrites them from conditions.
//   Expectations start at the long-run AI spend growth for every cloud. Nothing is in the pipeline and backlog is zero.
import { addQuarters } from '../data/quarters';
import type { Metric, QuarterKey } from '../data/schema';
import type { AsOfData } from './asof';
import { loanPositions, scheduleObligations, type Obligation } from './contracts';
import { newLedger, type DebtInstrument, type Ledger, type Vintage } from './ledger';
import { param } from './params';
import type { EngineParams, Grid } from './types';

export interface PipelineItem { owner: string; kind: 'gpus' | 'buildings'; units: number; costUsd: number; arrives: QuarterKey }

/** How a lab's opening share was set: its revenue, an equal split (no lab had data), or none (no data of its own). */
export type LabShareBasis = 'revenue' | 'equal' | 'no-data';

export interface MarketState {
  labShares: Record<string, number>;
  /** Extension: the rule behind each lab share, so equal or zero shares are never read as data. */
  labShareBasis: Record<string, LabShareBasis>;
  installedGpus: Vintage[];
  backlogUnits: number;
  effectiveTokenPrice: number;
  gpuRental: number;
  gpuResale: number;
}

export interface EngineState {
  grid: Grid;
  q: number; // current grid index
  ledger: Ledger;
  obligations: Obligation[];
  market: MarketState;
  expectations: Record<string, number>; // expected next-quarter AI demand growth per buyer
  pipeline: PipelineItem[];
  active: Record<string, boolean>; // entity has entered the model
  defaulted: Record<string, boolean>;
  /** Extension: true when the entity's opening balances are not reported facts (outputs are modelled, not actuals). */
  modelled: Record<string, boolean>;
  /** Extension: plain-language caveats about the opening state (stale facts, placeholders, missing quarters). */
  notes: string[];
  /** Extension: entities NVIDIA has invested in or guarantees (deals known at asOf) — for customerFinancedShare. */
  nvidiaLinked: string[];
  /** Extension: entity kind by id — aggregates, lenders and governments never default. */
  kinds: Record<string, string>;
  /** Extension: values carried between quarters by the layers (e.g. last rent per cloud, expected shipments). */
  memory: Record<string, number>;
}

/** Company-stated lab revenue series for labs without quarterly facts (mirrors the aiSpend labs in conditions.json). */
const LAB_REVENUE_SERIES: Record<string, { id: string; unit: 'USD per month' | 'USD per year' }> = {
  openai: { id: 'openai-revenue-monthly-company', unit: 'USD per month' },
};
const MONTHS_PER_QUARTER = 3;
const QUARTERS_PER_YEAR = 4;
const NVIDIA = 'nvidia';
const DATA_CENTER = 'Data Center';
const RESIDUAL_LENDER = 'bond-market';

/** Calendar quarter of an ISO date. */
function dateQuarter(iso: string): QuarterKey {
  return `${iso.slice(0, 4)}Q${Math.floor((Number(iso.slice(5, 7)) - 1) / MONTHS_PER_QUARTER) + 1}`;
}

/** Deal parties enter the model once a deal naming them is known (their rows are then flagged modelled). */
export function activateDealParties(s: Pick<EngineState, 'obligations' | 'active'>): void {
  for (const o of s.obligations) for (const id of [o.payer, o.payee]) if (s.active[id] === false) s.active[id] = true;
}

export function initState(data: AsOfData, params: EngineParams, grid: Grid, start: QuarterKey): EngineState {
  const q = grid.idx(start);
  const prev = addQuarters(start, -1);
  const maxStale = param(params, 'openingFactMaxStaleQuarters');
  const notes: string[] = [];
  const ids = data.entities.map(e => e.id);
  const ledger = newLedger(ids);
  const has = (id: string) => Object.hasOwn(ledger.sheets, id);

  /** Latest known fact for the quarter before S, or up to maxStale quarters older. */
  const opening = (id: string, metric: Metric) => {
    for (let k = 0; k <= maxStale; k++) {
      const f = data.fact(id, metric, addQuarters(prev, -k));
      if (f) return f;
    }
    return undefined;
  };
  // Filers enter at their first known revenue or cash fact before S (searched from the grid start, or the staleness
  // window when S is near the grid start).
  const searchFrom = [grid.quarters[0], addQuarters(prev, -maxStale)].sort()[0];
  const enteredBy = (id: string) => {
    for (let x = prev; x >= searchFrom; x = addQuarters(x, -1)) {
      if (data.fact(id, 'revenue', x) || data.fact(id, 'cash', x)) return true;
    }
    return false;
  };

  const active: Record<string, boolean> = {};
  const modelled: Record<string, boolean> = {};
  const defaulted: Record<string, boolean> = {};
  for (const e of data.entities) {
    active[e.id] = e.xbrl ? enteredBy(e.id) : true;
    defaulted[e.id] = false;
    const cash = active[e.id] ? opening(e.id, 'cash') : undefined;
    modelled[e.id] = cash === undefined;
    if (cash) {
      ledger.sheets[e.id].cash = cash.value;
      if (cash.quarter !== prev) notes.push(`${e.id}: opening cash is the ${cash.quarter} balance sheet; no ${prev} cash fact was known at ${data.asOf}.`);
    }
  }

  // Opening debt: deal loans outstanding at S, then a residual for reported debt.
  for (const p of loanPositions(data.deals, params)) {
    if (p.drawQuarter >= start || p.repayQuarter < start) continue;
    for (const id of [p.lender, p.borrower]) if (!has(id)) throw new Error(`loan ${p.debtId}: unknown entity ${id}`);
    const d: DebtInstrument = { id: p.debtId, lenderId: p.lender, principal: p.principal, maturity: p.repayQuarter,
      recourse: p.recourse, dealId: p.dealId };
    if (p.ratePerQuarter !== undefined) d.ratePerQuarter = p.ratePerQuarter;
    ledger.sheets[p.borrower].debt.push(d);
    ledger.sheets[p.lender].loansReceivable.push({ debtId: p.debtId, borrowerId: p.borrower, principal: p.principal });
  }
  const residualMaturity = addQuarters(start, param(params, 'defaultLoanTermQuarters') - 1);
  for (const id of ids) {
    if (!active[id]) continue;
    const reported = opening(id, 'longTermDebt');
    if (!reported) continue;
    const sheet = ledger.sheets[id];
    const fromDeals = sheet.debt.reduce((s, d) => s + d.principal, 0);
    const residual = reported.value - fromDeals;
    if (reported.quarter !== prev) notes.push(`${id}: opening debt is the ${reported.quarter} balance sheet; no ${prev} debt fact was known at ${data.asOf}.`);
    if (residual < 0) {
      notes.push(`${id}: deal loans outstanding at ${start} (${fromDeals} USD) exceed reported debt (${reported.value} USD); no residual instrument.`);
      continue;
    }
    if (residual === 0) continue;
    if (!has(RESIDUAL_LENDER)) throw new Error(`residual debt of ${id} needs a ${RESIDUAL_LENDER} entity`);
    const debtId = `reported-debt:${id}`;
    sheet.debt.push({ id: debtId, lenderId: RESIDUAL_LENDER, principal: residual, maturity: residualMaturity, recourse: 'recourse' });
    ledger.sheets[RESIDUAL_LENDER].loansReceivable.push({ debtId, borrowerId: id, principal: residual });
  }

  const obligations = scheduleObligations(data.deals, grid, params).filter(o => o.quarter >= start);

  // Lab shares.
  const labs = data.entities.filter(e => e.layer === 'labs' && active[e.id]).map(e => e.id);
  const window = new Set(Array.from({ length: maxStale + 1 }, (_, k) => addQuarters(prev, -k)));
  const labRevenue = (id: string): number | undefined => {
    const f = opening(id, 'revenue');
    if (f) return f.value;
    const spec = LAB_REVENUE_SERIES[id];
    if (!spec) return undefined;
    const pts = data.series(spec.id).filter(p => window.has(dateQuarter(p.date)));
    if (pts.length === 0) return undefined;
    const latest = pts.map(p => dateQuarter(p.date)).sort().at(-1)!;
    const inQ = pts.filter(p => dateQuarter(p.date) === latest);
    const mean = inQ.reduce((s, p) => s + p.value, 0) / inQ.length;
    return spec.unit === 'USD per month' ? mean * MONTHS_PER_QUARTER : mean / QUARTERS_PER_YEAR;
  };
  const revenues = new Map(labs.map(id => [id, labRevenue(id)]));
  const total = [...revenues.values()].reduce<number>((s, v) => s + (v ?? 0), 0);
  const labShares: Record<string, number> = {};
  const labShareBasis: Record<string, LabShareBasis> = {};
  for (const id of labs) {
    const r = revenues.get(id);
    if (total > 0) {
      labShares[id] = r !== undefined && r > 0 ? r / total : 0;
      labShareBasis[id] = r !== undefined && r > 0 ? 'revenue' : 'no-data';
    } else {
      labShares[id] = 1 / labs.length;
      labShareBasis[id] = 'equal';
    }
  }
  if (labs.length > 0 && total === 0) notes.push(`No lab revenue was public by ${data.asOf}: labs start with equal shares (modelled).`);
  else {
    const none = labs.filter(id => labShareBasis[id] === 'no-data');
    if (none.length) notes.push(`Labs without revenue data start with no share: ${none.join(', ')}.`);
  }

  // Installed GPU base.
  const life = param(params, 'gpuEconomicLifeQuarters');
  const asp = param(params, 'nvidiaAspUsd');
  const installedGpus: Vintage[] = [];
  let missing = 0;
  for (let k = life; k >= 1; k--) {
    const vq = addQuarters(start, -k);
    const f = data.fact(NVIDIA, 'segmentRevenue', vq, DATA_CENTER);
    if (f) installedGpus.push({ quarter: vq, units: f.value / asp, costUsd: f.value, modelled: true });
    else missing++;
  }
  notes.push(`Installed GPU base at ${start} is a modelled estimate: NVIDIA Data Center revenue over the previous ${life} quarters ÷ ${asp} USD per accelerator`
    + (missing ? ` (${missing} of ${life} quarters had no known Data Center revenue and add nothing).` : '.'));

  const expectations: Record<string, number> = {};
  for (const e of data.entities) if (e.layer === 'cloud') expectations[e.id] = param(params, 'aiSpendLongRunQuarterlyGrowth');
  // Each cloud's last reported quarterly capex anchors its capex momentum (memory key `capex:<id>`).
  const memory: Record<string, number> = {};
  for (const e of data.entities) {
    if (e.layer !== 'cloud') continue;
    const f = opening(e.id, 'capex');
    if (f) memory[`capex:${e.id}`] = f.value;
    // Non-AI operating cash flow available to fund AI capex: reported operating cash flow less the non-AI share of
    // reported capex (memory key `corecash:<id>`), held flat. Only the cash-funded clouds get it (clouds layer).
    const ocf = opening(e.id, 'operatingCashFlow');
    if (ocf) memory[`corecash:${e.id}`] = Math.max(0, ocf.value - (f?.value ?? 0) * (1 - param(params, 'hyperscalerAiCapexShare')));
  }

  return {
    grid, q, ledger, obligations,
    market: {
      labShares, labShareBasis, installedGpus, backlogUnits: 0,
      effectiveTokenPrice: param(params, 'tokenPriceIndexBase'),
      gpuRental: param(params, 'gpuRentalNoDataUsdPerGpuHour'),
      gpuResale: param(params, 'gpuResaleNoDataFraction'),
    },
    expectations, pipeline: [], active, defaulted, modelled, notes,
    nvidiaLinked: nvidiaLinkedEntities(data),
    kinds: Object.fromEntries(data.entities.map(e => [e.id, e.kind])),
    memory,
  };
}

/** Payees of NVIDIA equity deals and parties to deals NVIDIA guarantees, among deals known at asOf. */
export function nvidiaLinkedEntities(data: AsOfData): string[] {
  const linked = new Set<string>();
  for (const d of data.deals) {
    if (d.statusAsOf === 'cancelled' || d.statusAsOf === 'replaced') continue;
    if (d.payers.includes('nvidia') && d.types.includes('equity')) d.payees.forEach(x => linked.add(x));
    if (d.guarantors.includes('nvidia')) [...d.payers, ...d.payees].filter(x => x !== 'nvidia').forEach(x => linked.add(x));
  }
  return [...linked].sort();
}
