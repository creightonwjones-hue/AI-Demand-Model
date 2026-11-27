// First calibration (spec §12): exhaustive grid search over a few listed params, fitted on backtest origins
// 2023Q1–2025Q2 with target quarters in 2023–2025, and scored separately on the held-out 2026 quarters.
import type { QuarterKey } from '../data/schema';
import type { BuildData } from './asof';
import { rollingBacktest, type BacktestRow, type BacktestTarget } from './backtest';
import { param } from './params';
import type { EngineParams } from './types';

export const FIT_ORIGINS: QuarterKey[] = ['2023Q1', '2023Q2', '2023Q3', '2023Q4', '2024Q1', '2024Q2', '2024Q3', '2024Q4', '2025Q1', '2025Q2'];
export const ALL_ORIGINS: QuarterKey[] = [...FIT_ORIGINS, '2025Q3', '2025Q4', '2026Q1', '2026Q2'];
/** Targets the objective averages; Anthropic has no quarterly actuals yet. */
const SCORED: BacktestTarget[] = ['nvidiaRevenue', 'nvidiaDataCenter', 'hyperscalerCapex'];

export interface CalibrationResult { best: EngineParams; fitMape: number; holdoutMape: number; tried: number }

/** Mean over scored targets of each target's MAPE (percent); NaN when no row qualifies. */
export function objective(rows: readonly BacktestRow[]): number {
  const per = SCORED.map(t => rows.filter(r => r.target === t))
    .filter(rs => rs.length)
    .map(rs => rs.reduce((s, r) => s + Math.abs(r.model - r.actual) / Math.abs(r.actual), 0) / rs.length * 100);
  return per.length ? per.reduce((a, b) => a + b, 0) / per.length : NaN;
}

export const fitRows = (rows: readonly BacktestRow[]) => rows.filter(r => FIT_ORIGINS.includes(r.origin) && r.quarter <= '2025Q4');
export const holdoutRows = (rows: readonly BacktestRow[]) => rows.filter(r => r.quarter >= '2026Q1');

function withValues(p: EngineParams, values: Record<string, number>): EngineParams {
  const out = { ...p };
  for (const [k, v] of Object.entries(values)) out[k] = { ...p[k], value: v };
  return out;
}

export function calibrate(build: BuildData, params: EngineParams, keys: string[], grid: Record<string, number[]>): CalibrationResult {
  for (const k of keys) param(params, k); // throws on an unknown key
  const allowed = keys.map(k => (grid[k] ?? []).filter(v => (params[k].min === undefined || v >= params[k].min!) && (params[k].max === undefined || v <= params[k].max!)));
  // Every combination of allowed values; a key with no allowed value keeps its current value.
  let combos: Record<string, number>[] = [{}];
  keys.forEach((k, i) => {
    const vals = allowed[i].length ? allowed[i] : [params[k].value];
    combos = combos.flatMap(c => vals.map(v => ({ ...c, [k]: v })));
  });

  let best = { p: params, fit: Infinity, holdout: NaN };
  for (const c of combos) {
    const p = withValues(params, c);
    const rows = rollingBacktest(build, p, ALL_ORIGINS).rows;
    const fit = objective(fitRows(rows));
    if (fit < best.fit) best = { p, fit, holdout: objective(holdoutRows(rows)) };
  }
  return { best: best.p, fitMape: best.fit, holdoutMape: best.holdout, tried: combos.length };
}
