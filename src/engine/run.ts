// One-path runner (spec §8.6): history quarters from actuals, then each simulated quarter runs
// demand → clouds → chips → finance. Deterministic; deals enter only once announced (rolling knowledge).
import type { QuarterKey } from '../data/schema';
import { asOfView, type AsOfData, type BuildData } from './asof';
import { buildConditions } from './conditions';
import { scheduleObligations } from './contracts';
import { makeGrid } from './grid';
import { initState, type EngineState } from './init';
import { stepChips } from './layers/chips';
import { stepClouds } from './layers/clouds';
import { stepDemand } from './layers/demand';
import { stepFinance } from './layers/finance';
import type { Conditions, EngineEvent, EngineParams, EntityQuarter, Flow, NvidiaQuarter, RunResult } from './types';

export interface EngineInput {
  build: BuildData;
  params: EngineParams;
  conditions?: Conditions; // default: buildConditions(asOfView(build, asOf), grid, asOf)
  asOf: string;
  start: QuarterKey;
  end?: QuarterKey;
  dealsKnownUntil?: string; // default asOf
}

const NVIDIA = 'nvidia';

/** Last calendar day of a quarter, e.g. 2026Q1 → 2026-03-31. */
function quarterEnd(q: QuarterKey): string {
  const y = q.slice(0, 4);
  return { 1: `${y}-03-31`, 2: `${y}-06-30`, 3: `${y}-09-30`, 4: `${y}-12-31` }[Number(q[5]) as 1 | 2 | 3 | 4];
}

function emptyEntityQuarter(quarter: QuarterKey): EntityQuarter {
  return { quarter, revenue: 0, operatingCost: 0, capex: 0, operatingCashFlow: 0, netIncome: 0, cash: 0, debt: 0,
    equityRaised: 0, minsky: 'hedge', defaulted: false, modelled: true };
}

/** A history quarter from reported facts; modelled when the entity reported nothing for it. */
function actualEntityQuarter(data: AsOfData, id: string, quarter: QuarterKey): EntityQuarter {
  const v = (m: Parameters<AsOfData['fact']>[1]) => data.fact(id, m, quarter)?.value;
  const revenue = v('revenue');
  const row = emptyEntityQuarter(quarter);
  if (revenue === undefined && v('cash') === undefined) return row;
  return { ...row, revenue: revenue ?? 0, capex: v('capex') ?? 0, operatingCashFlow: v('operatingCashFlow') ?? 0,
    netIncome: v('netIncome') ?? 0, cash: v('cash') ?? 0, debt: v('longTermDebt') ?? 0, modelled: false };
}

function actualNvidiaQuarter(data: AsOfData, quarter: QuarterKey): NvidiaQuarter {
  const f = (m: Parameters<AsOfData['fact']>[1], seg?: string) => data.fact(NVIDIA, m, quarter, seg)?.value ?? 0;
  return { quarter, revenue: f('revenue'), dataCenter: f('segmentRevenue', 'Data Center'),
    hyperscale: f('segmentRevenue', 'Hyperscale'), aiCloudsEnterprise: f('segmentRevenue', 'AI Clouds, Industrial & Enterprise'),
    edge: 0, physicalAi: 0, grossMargin: 0, netIncome: f('netIncome'), eps: f('epsDiluted'), unitsShipped: 0,
    supplyShortfallUnits: 0, customerFinancedShare: 0 };
}

/** Latest known NVIDIA diluted share count (for EPS); undefined when none is known. */
function latestShares(data: AsOfData, grid: { quarters: QuarterKey[] }, before: number): number | undefined {
  for (let i = before; i >= 0; i--) {
    const f = data.fact(NVIDIA, 'dilutedShares', grid.quarters[i]);
    if (f) return f.value;
  }
  return undefined;
}

/**
 * Re-schedule obligations from quarter index qi onward with deals known by `knownDate`. A loan deal whose draw is
 * already in the past is left out entirely (its debt, if any, is in reported balances), so repayments never target a
 * loan the ledger does not hold.
 */
function refreshObligations(s: EngineState, build: BuildData, params: EngineParams, knownDate: string, qi: number): void {
  const now = s.grid.quarters[qi];
  const all = scheduleObligations(asOfView(build, knownDate).deals, s.grid, params);
  const pastDraw = new Set(all.filter(o => o.kind === 'loan-draw' && o.quarter < now).map(o => o.dealId));
  const opening = new Set(s.obligations.map(o => o.dealId));
  s.obligations = all.filter(o => o.quarter >= now && !(pastDraw.has(o.dealId) && !opening.has(o.dealId)));
}

export function runOnePath(input: EngineInput): RunResult {
  const grid = makeGrid();
  const { build, params, asOf, start } = input;
  const endIdx = grid.idx(input.end ?? grid.quarters[grid.quarters.length - 1]);
  const startIdx = grid.idx(start);
  const data = asOfView(build, asOf);
  const conditions = input.conditions ?? buildConditions(data, grid, asOf);
  const knownUntil = input.dealsKnownUntil ?? asOf;
  const s = initState(data, params, grid, start);

  const ids = data.entities.map(e => e.id);
  const entities: Record<string, EntityQuarter[]> = Object.fromEntries(ids.map(id => [id, [] as EntityQuarter[]]));
  const nvidia: NvidiaQuarter[] = [];
  const flows: Flow[] = [];
  const events: EngineEvent[] = [];
  const invariantErrors: string[] = [];

  for (let i = 0; i < startIdx; i++) {
    const q = grid.quarters[i];
    for (const id of ids) entities[id].push(actualEntityQuarter(data, id, q));
    nvidia.push(actualNvidiaQuarter(data, q));
  }

  const shares = latestShares(data, grid, startIdx - 1);
  let knownDate = asOf;
  for (let i = startIdx; i < grid.quarters.length; i++) {
    const q = grid.quarters[i];
    if (i > endIdx) {
      for (const id of ids) entities[id].push(emptyEntityQuarter(q));
      nvidia.push({ ...actualNvidiaQuarter(data, q), revenue: 0, netIncome: 0, eps: 0 });
      continue;
    }
    s.q = i;
    const next = [quarterEnd(q), knownUntil].sort()[0];
    if (next > knownDate) { knownDate = next; refreshObligations(s, build, params, knownDate, i); }

    const demand = stepDemand(s, conditions, params);
    const clouds = stepClouds(s, demand, conditions, params);
    const chips = stepChips(s, clouds, conditions, params);
    const fin = stepFinance(s, [...demand.flows, ...clouds.flows, ...chips.flows], params,
      { newLoans: clouds.newLoans, creditSpread: conditions.creditSpread.values[i], riskFree: conditions.riskFree.values[i] });

    for (const id of ids) entities[id].push(fin.entityQuarters[id] ?? emptyEntityQuarter(q));
    const netIncome = fin.entityQuarters[NVIDIA]?.netIncome ?? 0;
    nvidia.push({ quarter: q, ...chips.nvidia, physicalAi: demand.physicalAiSpend,
      revenue: chips.nvidia.revenue + demand.physicalAiSpend, netIncome, eps: shares ? netIncome / shares : 0 });
    for (const fl of fin.flows) flows.push(fl);
    for (const e of [...chips.events, ...fin.events]) events.push(e);
    for (const e of fin.invariantErrors) invariantErrors.push(e);
  }

  return { grid, flows, entities, nvidia, events, invariantErrors, asOf, start };
}
