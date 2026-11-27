// Rolling conditional backtest (spec §12): from each origin quarter the engine starts with only what was public 45
// days after the quarter ended, while conditions and deals follow what actually happened later. Each target is scored
// 1–8 quarters ahead against the latest-known actuals, next to three naive benchmarks built from origin-known data.
import { addQuarters } from '../data/quarters';
import type { QuarterKey } from '../data/schema';
import { asOfView, type AsOfData, type BuildData } from './asof';
import { buildConditions } from './conditions';
import { makeGrid } from './grid';
import { CASH_FUNDED } from './layers/clouds';
import { param } from './params';
import { runOnePath } from './run';
import type { EngineParams, RunResult } from './types';

export type BacktestTarget = 'nvidiaRevenue' | 'nvidiaDataCenter' | 'hyperscalerCapex' /* sum of the four cash-funded clouds */
  | 'anthropicRevenue';
export const BACKTEST_TARGETS: readonly BacktestTarget[] = ['nvidiaRevenue', 'nvidiaDataCenter', 'hyperscalerCapex', 'anthropicRevenue'];

export interface BacktestRow {
  origin: QuarterKey; horizon: number; target: BacktestTarget; quarter: QuarterKey;
  actual: number; model: number; naive: number; drift: number; ets: number;
}
export interface TargetSummary {
  modelMape: number; naiveMape: number; driftMape: number; etsMape: number; beatsAllBenchmarks: boolean; n: number;
}
export interface BacktestReport {
  rows: BacktestRow[];
  summary: Record<BacktestTarget, TargetSummary>;
  /** Rows where the actual direction of change differed from the trend at the origin. */
  turningPoints: BacktestRow[];
  /** Origins whose conditions had no real history yet at the origin (their early path is a backfill). */
  flaggedOrigins: { origin: QuarterKey; conditions: string[] }[];
  standard: 'point-only (ranges scored in phase 6)';
}

const HORIZONS = 8;
const FILING_LAG_DAYS = 45;
const DEFAULT_ORIGINS = (() => { const out: QuarterKey[] = []; for (let q: QuarterKey = '2023Q1'; q <= '2026Q2'; q = addQuarters(q, 1)) out.push(q); return out; })();

/** The day an origin quarter's filings were public: the quarter's last day plus 45 days. */
export function asOfFor(origin: QuarterKey): string {
  const y = Number(origin.slice(0, 4));
  const end = { 1: [y, 2, 31], 2: [y, 5, 30], 3: [y, 8, 30], 4: [y, 11, 31] }[Number(origin[5]) as 1 | 2 | 3 | 4];
  const d = new Date(Date.UTC(end[0], end[1], end[2] + FILING_LAG_DAYS));
  return d.toISOString().slice(0, 10);
}

/** Holt's linear exponential smoothing; α and β are fitted on `ys` only (grid search on one-step error). */
export function ets(ys: readonly number[], h: number): number[] {
  if (ys.length === 0) return Array(h).fill(0);
  if (ys.length === 1) return Array(h).fill(ys[0]);
  let best = { sse: Infinity, level: ys[ys.length - 1], trend: 0 };
  for (let a = 0.1; a <= 0.951; a += 0.05) for (let b = 0.05; b <= 0.951; b += 0.05) {
    let level = ys[0], trend = ys[1] - ys[0], sse = 0;
    for (let t = 1; t < ys.length; t++) {
      const e = ys[t] - (level + trend);
      sse += e * e;
      const prev = level;
      level = a * ys[t] + (1 - a) * (level + trend);
      trend = b * (level - prev) + (1 - b) * trend;
    }
    if (sse < best.sse) best = { sse, level, trend };
  }
  return Array.from({ length: h }, (_, k) => best.level + (k + 1) * best.trend);
}

/** Sum of the four calendar quarters whose midpoints fall in NVIDIA fiscal year `fy` (Feb of fy−1 to Jan of fy). */
export function fiscalYearSum(quarters: readonly { quarter: QuarterKey; revenue: number }[], fy: number): number {
  const inFy = (q: QuarterKey) => q.startsWith(String(fy - 1)); // midpoints Feb 15, May 15, Aug 15, Nov 15 of fy−1
  return quarters.filter(x => inFy(x.quarter)).reduce((t, x) => t + x.revenue, 0);
}

/** A target's actual value from a data view, or undefined when not reported. */
function actual(d: AsOfData, t: BacktestTarget, q: QuarterKey): number | undefined {
  switch (t) {
    case 'nvidiaRevenue': return d.fact('nvidia', 'revenue', q)?.value;
    case 'nvidiaDataCenter': return d.fact('nvidia', 'segmentRevenue', q, 'Data Center')?.value;
    case 'anthropicRevenue': return d.fact('anthropic', 'revenue', q)?.value;
    case 'hyperscalerCapex': {
      let t = 0;
      for (const c of CASH_FUNDED) { const v = d.fact(c, 'capex', q)?.value; if (v === undefined) return undefined; t += v; }
      return t;
    }
  }
}

/** The model's value for a target. Hyperscaler capex: modelled AI capex grossed up to total by hyperscalerAiCapexShare. */
function modelled(r: RunResult, t: BacktestTarget, i: number, p: EngineParams): number {
  switch (t) {
    case 'nvidiaRevenue': return r.nvidia[i].revenue;
    case 'nvidiaDataCenter': return r.nvidia[i].dataCenter;
    case 'anthropicRevenue': return r.entities.anthropic?.[i]?.revenue ?? 0;
    case 'hyperscalerCapex': return CASH_FUNDED.reduce((s, c) => s + (r.entities[c]?.[i]?.capex ?? 0), 0) / param(p, 'hyperscalerAiCapexShare');
  }
}

/** Latest date anything in the build became public. */
export function latestBuildDate(b: BuildData): string {
  let d = '0000-00-00';
  for (const f of b.facts) if (f.asKnownAt > d) d = f.asKnownAt;
  for (const s of b.series) for (const p of s.points) if (p.asKnownAt > d) d = p.asKnownAt;
  return d;
}

const mape = (rows: BacktestRow[], k: 'model' | 'naive' | 'drift' | 'ets') =>
  rows.length ? rows.reduce((t, r) => t + Math.abs(r[k] - r.actual) / Math.abs(r.actual), 0) / rows.length * 100 : NaN;

export function rollingBacktest(build: BuildData, params: EngineParams, origins: QuarterKey[] = DEFAULT_ORIGINS): BacktestReport {
  const grid = makeGrid();
  const latest = latestBuildDate(build);
  const truth = asOfView(build, latest);
  const conditions = buildConditions(truth, grid, latest);
  const rows: BacktestRow[] = [];
  const turningPoints: BacktestRow[] = [];
  const flaggedOrigins: BacktestReport['flaggedOrigins'] = [];

  for (const origin of origins) {
    const asOf = asOfFor(origin);
    const known = asOfView(build, asOf);
    const late = Object.values(conditions).filter(c => c.firstHistory && c.firstHistory > origin).map(c => c.id);
    if (late.length) flaggedOrigins.push({ origin, conditions: late });
    const start = addQuarters(origin, 1);
    const lastQ = grid.quarters[grid.quarters.length - 1];
    const end = [addQuarters(origin, HORIZONS), lastQ].sort()[0];
    const run = runOnePath({ build, params, conditions, asOf, start, end, dealsKnownUntil: latest });

    for (const target of BACKTEST_TARGETS) {
      // Origin-known history: the unbroken run of reported quarters ending at the last quarter known by asOf (a firm
      // that files later than 45 days, like NVIDIA, may not have reported the origin quarter itself yet).
      const hist: number[] = [];
      let q = origin;
      while (q >= grid.quarters[0] && actual(known, target, q) === undefined && q > addQuarters(origin, -2)) q = addQuarters(q, -1);
      for (; q >= grid.quarters[0]; q = addQuarters(q, -1)) {
        const v = actual(known, target, q);
        if (v === undefined) break;
        hist.unshift(v);
      }
      if (hist.length === 0) continue;
      const last = hist[hist.length - 1];
      const back = hist.slice(-5);
      const step = back.length > 1 ? (back[back.length - 1] - back[0]) / (back.length - 1) : 0;
      const etsPath = ets(hist, HORIZONS);
      const originTrend = Math.sign(step);
      let prevActual = last;
      for (let h = 1; h <= HORIZONS; h++) {
        const quarter = addQuarters(origin, h);
        if (quarter > end) break;
        const a = actual(truth, target, quarter);
        if (a === undefined || a === 0) { prevActual = a ?? prevActual; continue; }
        const row: BacktestRow = { origin, horizon: h, target, quarter, actual: a,
          model: modelled(run, target, grid.idx(quarter), params), naive: last, drift: last + h * step, ets: etsPath[h - 1] };
        rows.push(row);
        if (originTrend !== 0 && Math.sign(a - prevActual) === -originTrend) turningPoints.push(row);
        prevActual = a;
      }
    }
  }

  const summary = Object.fromEntries(BACKTEST_TARGETS.map(t => {
    const rs = rows.filter(r => r.target === t);
    const m = { modelMape: mape(rs, 'model'), naiveMape: mape(rs, 'naive'), driftMape: mape(rs, 'drift'), etsMape: mape(rs, 'ets') };
    return [t, { ...m, beatsAllBenchmarks: rs.length > 0 && m.modelMape < Math.min(m.naiveMape, m.driftMape, m.etsMape), n: rs.length }];
  })) as Record<BacktestTarget, TargetSummary>;

  return { rows, summary, turningPoints, flaggedOrigins, standard: 'point-only (ranges scored in phase 6)' };
}
