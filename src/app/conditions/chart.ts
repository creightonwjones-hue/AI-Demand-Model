// Condition chart maths (pure): history line, forecast-range band, draggable handles, clamping and the eased drag.
import { addQuarters } from '../../data/quarters';
import type { QuarterKey } from '../../data/schema';
import type { ConditionId, ConditionPath, Grid } from '../../engine/types';

export type ConditionBounds = Partial<Record<ConditionId, { min?: number; max?: number; allowed?: number[]; setting?: boolean }>>;

/** Keep a dragged value inside the condition's hard limits; snap to allowed values; NaN becomes the minimum. */
export function clampValue(id: ConditionId, v: number, bounds: ConditionBounds): number {
  const b = bounds[id] ?? {};
  if (b.allowed?.length) {
    const x = Number.isFinite(v) ? v : b.allowed[0];
    return b.allowed.reduce((best, a) => (Math.abs(a - x) < Math.abs(best - x) ? a : best));
  }
  const lo = b.min ?? -Infinity, hi = b.max ?? Infinity;
  if (!Number.isFinite(v)) return Number.isFinite(lo) ? lo : 0;
  return Math.min(hi, Math.max(lo, v));
}

export function outsideForecasts(p: ConditionPath, q: QuarterKey, v: number, grid: Grid): boolean {
  const i = grid.idx(q);
  return v < p.low[i] || v > p.high[i];
}

/** The quarter containing an ISO date. */
export function quarterOf(iso: string): QuarterKey {
  return `${iso.slice(0, 4)}Q${Math.floor((Number(iso.slice(5, 7)) - 1) / 3) + 1}` as QuarterKey;
}

export interface ChartModel {
  history: [number, number][];
  path: [number, number][];
  band: string;
  handles: { quarter: QuarterKey; x: number; y: number; outside: boolean }[];
  yToValue(y: number): number;
  valueToY(v: number): number;
  xOf(i: number): number;
}

const PAD = { l: 4, r: 6, t: 6, b: 6 };

export function chartModel(p: ConditionPath, grid: Grid, asOf: string, w: number, h: number): ChartModel {
  const first = quarterOf(asOf);
  const editable = (q: QuarterKey) => q >= first;
  const vals = [...p.values, ...p.low.filter((_, i) => editable(grid.quarters[i])), ...p.high.filter((_, i) => editable(grid.quarters[i]))]
    .filter(Number.isFinite);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  const span = hi - lo; lo -= span * 0.08; hi += span * 0.08;
  const n = grid.quarters.length;
  const xOf = (i: number) => PAD.l + (i / (n - 1)) * (w - PAD.l - PAD.r);
  const valueToY = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (h - PAD.t - PAD.b);
  const yToValue = (y: number) => lo + (1 - (y - PAD.t) / (h - PAD.t - PAD.b)) * (hi - lo);
  const idx = grid.quarters.map((q, i) => ({ q, i }));
  const fut = idx.filter(({ q }) => editable(q));
  const top = fut.map(({ i }) => `${xOf(i).toFixed(1)},${valueToY(p.high[i]).toFixed(1)}`);
  const bot = fut.map(({ i }) => `${xOf(i).toFixed(1)},${valueToY(p.low[i]).toFixed(1)}`).reverse();
  return {
    history: idx.filter(({ i }) => p.origin[i] === 'history').map(({ i }) => [xOf(i), valueToY(p.values[i])]),
    path: fut.map(({ i }) => [xOf(i), valueToY(p.values[i])]),
    band: top.length ? `M${top.join(' L')} L${bot.join(' L')} Z` : '',
    handles: fut.map(({ q, i }) => ({ quarter: q, x: xOf(i), y: valueToY(p.values[i]), outside: p.values[i] < p.low[i] || p.values[i] > p.high[i] })),
    yToValue, valueToY, xOf,
  };
}

/**
 * Overrides for dragging quarter i to v: the quarter moves fully, its neighbours by 50% and 25% of the change (two each
 * side), so the line stays smooth. Quarters before `firstEditable` never move.
 */
export function dragPath(values: readonly number[], grid: Grid, i: number, v: number, firstEditable: QuarterKey,
  clamp: (v: number) => number = x => x): Partial<Record<QuarterKey, number>> {
  const delta = v - values[i];
  const out: Partial<Record<QuarterKey, number>> = {};
  for (const [k, w] of [[0, 1], [-1, 0.5], [1, 0.5], [-2, 0.25], [2, 0.25]] as const) {
    const j = i + k;
    if (j < 0 || j >= grid.quarters.length || grid.quarters[j] < firstEditable) continue;
    out[grid.quarters[j]] = clamp(values[j] + delta * w);
  }
  return out;
}

export const nextQuarter = (q: QuarterKey) => addQuarters(q, 1);
