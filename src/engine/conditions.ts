// Condition catalogue: each outside input the user drags (phase 3) starts from real history known at the as-of date,
// continues on a default path to the end of the grid, and carries a forecast range whose source is shown on hover.
// Specs live in config/conditions.json; every tunable number is in config/engine-params.json.
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import type { QuarterKey, SeriesPoint } from '../data/schema';
import type { AsOfData } from './asof';
import { makeGrid } from './grid';
import { loadParams, param } from './params';
import type { ConditionId, ConditionPath, Conditions, EngineParams, Grid } from './types';

const ID_SET: Record<ConditionId, true> = {
  aiSpend: true, tokenPrice: true, priceElasticity: true, creditSpread: true, riskFree: true, gpuResale: true,
  gpuRental: true, powerGw: true, exportRegime: true, equitySentiment: true, physicalAiGrowth: true, labourSubstitution: true,
};
export const CONDITION_IDS = Object.keys(ID_SET) as readonly ConditionId[];

const HOURS_PER_YEAR = 8760;

const QuarterSchema = z.string().regex(/^\d{4}Q[1-4]$/);
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const PublishedPointSchema = z.object({
  quarter: QuarterSchema,
  value: z.number().finite(),
  asKnownAt: IsoDate,
  label: z.string().min(10),
  source: z.object({ url: z.string().url(), status: z.enum(['primary-filing', 'primary-company', 'secondary', 'unverified']) }),
});

const ConditionSpecSchema = z.object({
  name: z.string().min(3),
  unit: z.string().min(1),
  historyKind: z.enum(['series', 'ratio', 'lab-revenue', 'none']),
  /** Series ids. For historyKind 'series': priority order, first series with points in a quarter supplies it. */
  historySeries: z.array(z.string()),
  ratio: z.object({ numerator: z.array(z.string()).min(1), denominator: z.array(z.string()).min(1) }).optional(),
  labs: z.array(z.object({
    label: z.string(),
    entityId: z.string().optional(),
    metric: z.literal('revenue').optional(),
    // A revenue series for a lab without quarterly facts: per month (x3 per quarter) or a per-year run-rate (/4).
    revenueSeries: z.object({ id: z.string(), unit: z.enum(['USD per month', 'USD per year']) }).optional(),
    missingReason: z.string().optional(),
  })).optional(),
  initialGrowthSeries: z.object({ id: z.string(), unit: z.literal('percent-yoy') }).optional(),
  defaultMethod: z.enum(['hold-last', 'trend-decay', 'published']),
  rangeMethod: z.enum(['volatility', 'log-widening', 'published']),
  volMode: z.enum(['level', 'log']).optional(),
  bounds: z.object({ min: z.number().optional(), max: z.number().optional() }).optional(),
  params: z.object({
    noDataValue: z.string().optional(),
    fallbackVol: z.string().optional(),
    longRunGrowth: z.string().optional(),
    halfLife: z.string().optional(),
    rangeA: z.string().optional(),
    rangeB: z.string().optional(),
    loadFactor: z.string().optional(),
  }).strict(),
  published: z.object({
    sourceUnit: z.string(),
    conversion: z.enum(['none', 'twh-per-year-to-gw-capacity']),
    points: z.array(PublishedPointSchema).min(1),
    crossChecks: z.array(z.object({ label: z.string(), source: z.object({ url: z.string().url(), status: z.string() }) })).optional(),
  }).optional(),
  rangeSourceLabel: z.string().min(20),
  notes: z.string().optional(),
}).strict().superRefine((s, ctx) => {
  const need = (ok: unknown, msg: string) => { if (!ok) ctx.addIssue({ code: 'custom', message: msg }); };
  const pairs = { 'hold-last': 'volatility', 'trend-decay': 'log-widening', published: 'published' } as const;
  need(pairs[s.defaultMethod] === s.rangeMethod, `defaultMethod ${s.defaultMethod} needs rangeMethod ${pairs[s.defaultMethod]}`);
  if (s.defaultMethod === 'hold-last') need(s.volMode, 'hold-last needs volMode');
  if (s.defaultMethod === 'trend-decay') {
    need(s.params.longRunGrowth && s.params.halfLife && s.params.rangeA && s.params.rangeB, 'trend-decay needs longRunGrowth, halfLife, rangeA, rangeB params');
    need(s.historyKind !== 'none', 'trend-decay needs history');
  }
  if (s.defaultMethod === 'published') need(s.published && s.params.rangeA && s.params.rangeB, 'published needs points and rangeA, rangeB params');
  if (s.published?.conversion === 'twh-per-year-to-gw-capacity') need(s.params.loadFactor, 'TWh->GW conversion needs a loadFactor param');
  if (s.historyKind === 'none') need(s.params.noDataValue, 'a condition without history needs a noDataValue param');
  if (s.historyKind === 'ratio') need(s.ratio, 'ratio history needs ratio.numerator/denominator');
  if (s.historyKind === 'lab-revenue') need(s.labs?.length, 'lab-revenue history needs labs');
  if (s.historyKind === 'series') need(s.historySeries.length, 'series history needs historySeries');
});

export type ConditionSpec = z.infer<typeof ConditionSpecSchema>;
export type ConditionSpecs = Record<ConditionId, ConditionSpec>;

const SpecsSchema = z.object(
  Object.fromEntries(CONDITION_IDS.map(id => [id, ConditionSpecSchema])) as Record<ConditionId, typeof ConditionSpecSchema>,
).strict();

/** Load and validate config/conditions.json (one entry per ConditionId, no extras). */
export function loadConditionSpecs(path = 'config/conditions.json'): ConditionSpecs {
  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
  const r = SpecsSchema.safeParse(raw);
  if (!r.success) {
    throw new Error(`Invalid condition specs in ${path}: ${r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  }
  return r.data as ConditionSpecs;
}

// ---- quarter arithmetic on plain numbers (year * 4 + quarter - 1) ----
const qNum = (q: QuarterKey) => Number(q.slice(0, 4)) * 4 + Number(q[5]) - 1;
const qKey = (n: number): QuarterKey => `${Math.floor(n / 4)}Q${(n % 4) + 1}`;
const dateQNum = (iso: string) => Number(iso.slice(0, 4)) * 4 + Math.floor((Number(iso.slice(5, 7)) - 1) / 3);

/** Mean of points per calendar quarter, counting only points known by asOf. */
function quarterMeans(points: readonly SeriesPoint[], asOf: string): Map<number, number> {
  const sum = new Map<number, number>();
  const cnt = new Map<number, number>();
  for (const p of points) {
    if (p.asKnownAt > asOf) continue; // defence in depth; the as-of view already filters
    const q = dateQNum(p.date);
    sum.set(q, (sum.get(q) ?? 0) + p.value);
    cnt.set(q, (cnt.get(q) ?? 0) + 1);
  }
  const out = new Map<number, number>();
  for (const [q, s] of sum) out.set(q, s / cnt.get(q)!);
  return out;
}

const meanOf = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

interface History {
  /** quarter number -> value, all quarters with data known by asOf (may extend before the grid). */
  values: Map<number, number>;
  /** quarter number -> which source supplied it (for splices). */
  sourceOf: Map<number, string>;
  notes: string[];
}

function readHistory(spec: ConditionSpec, data: AsOfData, grid: Grid, asOf: string): History {
  const values = new Map<number, number>();
  const sourceOf = new Map<number, string>();
  const notes: string[] = [];
  if (spec.historyKind === 'series') {
    const bySeries = spec.historySeries.map(id => ({ id, m: quarterMeans(data.series(id), asOf) }));
    const quarters = new Set<number>();
    for (const s of bySeries) for (const q of s.m.keys()) quarters.add(q);
    for (const q of quarters) {
      const s = bySeries.find(x => x.m.has(q))!;
      values.set(q, s.m.get(q)!);
      sourceOf.set(q, s.id);
    }
  } else if (spec.historyKind === 'ratio') {
    const num = spec.ratio!.numerator.map(id => quarterMeans(data.series(id), asOf));
    const den = spec.ratio!.denominator.map(id => quarterMeans(data.series(id), asOf));
    for (const q of num[0].keys()) {
      if (!num.every(m => m.has(q)) || !den.every(m => m.has(q))) continue;
      values.set(q, meanOf(num.map(m => m.get(q)!)) / meanOf(den.map(m => m.get(q)!)));
      sourceOf.set(q, 'ratio');
    }
  } else if (spec.historyKind === 'lab-revenue') {
    const missing = new Map<string, number[]>();
    for (const lab of spec.labs!) missing.set(lab.label, []);
    const revenue = spec.labs!.map(l => (l.revenueSeries ? quarterMeans(data.series(l.revenueSeries.id), asOf) : undefined));
    for (const q of grid.quarters) {
      const n = qNum(q);
      let total = 0;
      const present: string[] = [];
      spec.labs!.forEach((lab, i) => {
        let v: number | undefined;
        if (lab.entityId) v = data.fact(lab.entityId, lab.metric ?? 'revenue', q)?.value;
        else if (revenue[i]?.has(n)) {
          const m = revenue[i]!.get(n)!; // mean of the points dated in the quarter
          v = lab.revenueSeries!.unit === 'USD per month' ? m * 3 : m / 4; // -> USD per quarter
        }
        if (v === undefined) missing.get(lab.label)!.push(n);
        else { total += v; present.push(lab.label); }
      });
      // annualised: USD per year. The lab mix is the "source", so growth is never measured across a change in mix.
      if (present.length) { values.set(n, total * 4); sourceOf.set(n, `labs: ${present.join(' + ')}`); }
    }
    for (const lab of spec.labs!) {
      const gaps = missing.get(lab.label)!.filter(n => values.has(n));
      if (gaps.length) {
        notes.push(`History is partial: ${lab.label} is missing in ${gaps.length} of ${values.size} history quarters (${spanText(gaps)})${lab.missingReason ? ` — ${lab.missingReason}` : ''}.`);
      }
    }
  }
  return { values, sourceOf, notes };
}

/** Compact "2025Q1–2026Q3" style text for a set of quarter numbers. */
function spanText(qs: number[]): string {
  const s = [...qs].sort((a, b) => a - b);
  const runs: string[] = [];
  for (let i = 0; i < s.length;) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    runs.push(i === j ? qKey(s[i]) : `${qKey(s[i])}–${qKey(s[j])}`);
    i = j + 1;
  }
  return runs.join(', ');
}

const clamp = (v: number, b?: { min?: number; max?: number }) =>
  Math.min(b?.max ?? Infinity, Math.max(b?.min ?? -Infinity, v));

/** Per-quarter step size from history (RMS of gap-scaled changes within one source), or undefined if none. */
function historyVol(h: History, mode: 'level' | 'log', lastQ: number, lookback: number): number | undefined {
  const qs = [...h.values.keys()].filter(q => q <= lastQ && q > lastQ - lookback).sort((a, b) => a - b);
  const steps: number[] = [];
  for (let i = 1; i < qs.length; i++) {
    const a = qs[i - 1];
    const b = qs[i];
    if (h.sourceOf.get(a) !== h.sourceOf.get(b)) continue; // never measure a splice as a move
    const va = h.values.get(a)!;
    const vb = h.values.get(b)!;
    const d = mode === 'log' ? Math.log(vb / va) : vb - va;
    steps.push(d / Math.sqrt(b - a)); // random walk: variance grows with the gap
  }
  if (!steps.length) return undefined;
  return Math.sqrt(steps.reduce((acc, d) => acc + d * d, 0) / steps.length);
}

/** Build every condition path on the grid as seen at asOf. */
export function buildConditions(
  data: AsOfData, grid: Grid, asOf: string,
  opts: { specs?: ConditionSpecs; params?: EngineParams } = {},
): Conditions {
  if (data.asOf !== asOf) throw new Error(`buildConditions: asOf ${asOf} does not match the data view's asOf ${data.asOf}`);
  const specs = opts.specs ?? defaultSpecs();
  const params = opts.params ?? defaultParams();
  const out = {} as Conditions;
  for (const id of CONDITION_IDS) out[id] = buildOne(id, specs[id], data, grid, asOf, params);
  return out;
}

function buildOne(id: ConditionId, spec: ConditionSpec, data: AsOfData, grid: Grid, asOf: string, P: EngineParams): ConditionPath {
  const n = grid.quarters.length;
  const g0q = qNum(grid.quarters[0]);
  const asOfIdx = Math.min(n - 1, Math.max(0, dateQNum(asOf) - g0q));
  const values = new Array<number>(n).fill(NaN);
  const origin = new Array<ConditionPath['origin'][number]>(n).fill('default');
  const low = new Array<number>(n).fill(NaN);
  const high = new Array<number>(n).fill(NaN);
  const p = (role: keyof ConditionSpec['params']) => {
    const key = spec.params[role];
    if (!key) throw new Error(`${id}: no '${role}' param configured`);
    return param(P, key);
  };
  const notes: string[] = [];
  let rangeSource = spec.rangeSourceLabel;
  let firstHistory: QuarterKey | undefined;

  // Distance (quarters, at least 1) from each grid quarter to the nearest anchor quarter.
  const distances = (anchors: number[]) => grid.quarters.map((_, i) => {
    let d = Infinity;
    for (const a of anchors) d = Math.min(d, Math.abs(i - a));
    return Math.max(1, d);
  });

  const holdPlaceholder = (why: 'by-design' | 'no-data') => {
    const v = p('noDataValue');
    values.fill(v);
    if (why === 'no-data') {
      rangeSource = `Assumption: no data for this condition was public by ${asOf}, so it is held at a placeholder of ${v} ${spec.unit} (engine param ${spec.params.noDataValue}). Usual source: ${spec.rangeSourceLabel}`;
      notes.push(`No data known at ${asOf}: every quarter is the placeholder ${v} (model default, not data).`);
    }
    return distances([asOfIdx]);
  };

  // Band helpers: volatility (hold-last) and log widening (trend-decay, published).
  const volBand = (h: number[], sigma: number, mode: 'level' | 'log') => {
    const k = param(P, 'holdLastRangeK');
    for (let i = 0; i < n; i++) {
      if (origin[i] === 'history') { low[i] = high[i] = values[i]; continue; }
      const w = k * sigma * Math.sqrt(h[i]);
      low[i] = clamp(mode === 'log' ? values[i] * Math.exp(-w) : values[i] - w, spec.bounds);
      high[i] = clamp(mode === 'log' ? values[i] * Math.exp(w) : values[i] + w, spec.bounds);
    }
  };
  const logBand = (h: number[]) => {
    const a = p('rangeA');
    const b = p('rangeB');
    for (let i = 0; i < n; i++) {
      if (origin[i] === 'history') { low[i] = high[i] = values[i]; continue; }
      const w = a + b * h[i];
      low[i] = Math.min(low[i], values[i] * Math.exp(-w));
      high[i] = Math.max(high[i], values[i] * Math.exp(w));
    }
  };

  if (spec.defaultMethod === 'published') {
    const pub = spec.published!;
    const known = pub.points.filter(pt => pt.asKnownAt <= asOf);
    if (!known.length) {
      const h = holdPlaceholder('no-data');
      low.fill(Infinity); high.fill(-Infinity);
      logBand(h);
    } else {
      const conv = (v: number) => (pub.conversion === 'twh-per-year-to-gw-capacity' ? (v * 1000) / HOURS_PER_YEAR / p('loadFactor') : v);
      // Per quarter: value = latest-known edition; low/high = spread across known editions.
      const byQ = new Map<number, { v: number; at: string; lo: number; hi: number }>();
      for (const pt of known) {
        const q = qNum(pt.quarter);
        const v = conv(pt.value);
        const cur = byQ.get(q);
        if (!cur) byQ.set(q, { v, at: pt.asKnownAt, lo: v, hi: v });
        else {
          if (pt.asKnownAt >= cur.at) { cur.v = v; cur.at = pt.asKnownAt; }
          cur.lo = Math.min(cur.lo, v); cur.hi = Math.max(cur.hi, v);
        }
      }
      const pts = [...byQ.entries()].sort((x, y) => x[0] - y[0]);
      const interp = (q: number, f: (e: { v: number; lo: number; hi: number }) => number) => {
        if (q <= pts[0][0]) return f(pts[0][1]);
        if (q >= pts[pts.length - 1][0]) return f(pts[pts.length - 1][1]);
        const j = pts.findIndex(e => e[0] >= q);
        const [qa, ea] = pts[j - 1];
        const [qb, eb] = pts[j];
        return f(ea) + ((f(eb) - f(ea)) * (q - qa)) / (qb - qa);
      };
      for (let i = 0; i < n; i++) {
        const q = g0q + i;
        values[i] = interp(q, e => e.v);
        low[i] = interp(q, e => e.lo);
        high[i] = interp(q, e => e.hi);
      }
      logBand(distances([asOfIdx]));
      notes.push(`Published points known at ${asOf}: ${known.map(k => `${k.quarter} ${k.value} ${pub.sourceUnit} (${k.label})`).join('; ')}.`);
    }
  } else {
    const hist = spec.historyKind === 'none' ? undefined : readHistory(spec, data, grid, asOf);
    notes.push(...(hist?.notes ?? []));
    const histIdx: number[] = [];
    if (hist) {
      for (let i = 0; i < n; i++) {
        const v = hist.values.get(g0q + i);
        if (v !== undefined) { values[i] = v; origin[i] = 'history'; histIdx.push(i); }
      }
    }
    if (!histIdx.length) {
      const h = holdPlaceholder(hist ? 'no-data' : 'by-design');
      if (spec.defaultMethod === 'hold-last') {
        volBand(h, p('fallbackVol'), spec.volMode!);
      } else {
        low.fill(Infinity); high.fill(-Infinity);
        logBand(h);
      }
    } else {
      const first = histIdx[0];
      const last = histIdx[histIdx.length - 1];
      firstHistory = grid.quarters[first];
      const log = spec.defaultMethod === 'trend-decay' || spec.volMode === 'log';
      // Before the first history quarter: hold the first value. Gaps: interpolate (log-linear for log quantities).
      for (let i = 0; i < first; i++) values[i] = values[first];
      for (let k = 1; k < histIdx.length; k++) {
        const a = histIdx[k - 1];
        const b = histIdx[k];
        for (let i = a + 1; i < b; i++) {
          const t = (i - a) / (b - a);
          values[i] = log ? values[a] * Math.pow(values[b] / values[a], t) : values[a] + (values[b] - values[a]) * t;
        }
      }
      if (first > 0) notes.push(`No data before ${grid.quarters[first]}: earlier quarters hold the first history value (model default, not data).`);
      const gapIdx = grid.quarters.map((_, i) => i).filter(i => i > first && i < last && origin[i] !== 'history');
      if (gapIdx.length) notes.push(`Quarters without data between history quarters are interpolated (model default): ${spanText(gapIdx.map(i => g0q + i))}.`);
      if (hist!.sourceOf.size && new Set(histIdx.map(i => hist!.sourceOf.get(g0q + i))).size > 1) {
        const runs = new Map<string, number[]>();
        for (const i of histIdx) { const s = hist!.sourceOf.get(g0q + i)!; runs.set(s, [...(runs.get(s) ?? []), g0q + i]); }
        notes.push(`Sources by quarter: ${[...runs].map(([s, qs]) => `${s} ${spanText(qs)}`).join('; ')}.`);
      }

      const lastQ = g0q + last;
      if (spec.defaultMethod === 'hold-last') {
        for (let i = last + 1; i < n; i++) values[i] = values[last];
        let sigma = historyVol(hist!, spec.volMode!, lastQ, param(P, 'holdLastVolLookbackQuarters'));
        if (sigma === undefined || sigma === 0) {
          sigma = p('fallbackVol');
          notes.push(`Too little history for a volatility estimate: the range uses the assumed volatility in engine param ${spec.params.fallbackVol}.`);
          if (!rangeSource.startsWith('Assumption:')) {
            rangeSource = `Assumption: too little history to measure volatility, so the range uses an assumed quarterly volatility of ${sigma} (engine param ${spec.params.fallbackVol}). ${rangeSource}`;
          }
        }
        volBand(distances(histIdx), sigma, spec.volMode!);
        if (last < n - 1) notes.push(`Default from ${grid.quarters[last + 1]}: held at the ${grid.quarters[last]} value.`);
      } else {
        // trend-decay: starting log growth from the latest history steps, else a growth series, else the long-run rate.
        const gLR = Math.log(1 + p('longRunGrowth'));
        const allQ = [...hist!.values.keys()].filter(q => q <= lastQ).sort((a, b) => a - b);
        const look = param(P, 'trendDecayGrowthLookbackQuarters');
        const steps: number[] = [];
        for (let k = allQ.length - 1; k > 0 && steps.length < look; k--) {
          if (hist!.sourceOf.get(allQ[k]) !== hist!.sourceOf.get(allQ[k - 1])) continue; // mix changed: not growth
          steps.push(Math.log(hist!.values.get(allQ[k])! / hist!.values.get(allQ[k - 1])!) / (allQ[k] - allQ[k - 1]));
        }
        let g0: number;
        let g0Text: string;
        if (steps.length) { g0 = meanOf(steps); g0Text = `latest history growth (${steps.length} step${steps.length > 1 ? 's' : ''})`; }
        else {
          const s = spec.initialGrowthSeries ? data.series(spec.initialGrowthSeries.id).filter(pt => pt.asKnownAt <= asOf) : [];
          if (s.length) { g0 = Math.log(1 + s[s.length - 1].value / 100) / 4; g0Text = `${spec.initialGrowthSeries!.id} (${s[s.length - 1].value}% a year)`; }
          else { g0 = gLR; g0Text = 'the long-run rate (no growth observed yet)'; }
        }
        const decay = Math.pow(0.5, 1 / p('halfLife'));
        let cum = 0;
        for (let i = last + 1; i < n; i++) {
          const hq = i - last;
          cum += gLR + (g0 - gLR) * Math.pow(decay, hq);
          values[i] = values[last] * Math.exp(cum);
        }
        low.fill(Infinity); high.fill(-Infinity);
        logBand(distances(histIdx));
        if (last < n - 1) {
          notes.push(`Default from ${grid.quarters[last + 1]}: growth starts at ${(Math.exp(g0) - 1).toFixed(4)} a quarter from ${g0Text} and decays to ${p('longRunGrowth')} a quarter (half-life ${p('halfLife')} quarters).`);
        }
      }
    }
  }

  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(values[i]) || !Number.isFinite(low[i]) || !Number.isFinite(high[i])) {
      throw new Error(`${id}: non-finite value or range at ${grid.quarters[i]}`);
    }
  }
  if (firstHistory !== undefined && firstHistory !== grid.quarters[0]) {
    rangeSource += `${rangeSource.endsWith('.') ? '' : '.'} Assumption: quarters before ${firstHistory} hold the first observed value.`;
  }
  const allNotes = [spec.notes, ...notes].filter(Boolean).join(' ');
  return {
    id, unit: spec.unit, values, origin, low, high, rangeSource,
    ...(firstHistory !== undefined ? { firstHistory } : {}),
    ...(allNotes ? { notes: allNotes } : {}),
  };
}

/**
 * Return a copy of `c` with the user's values set on `id` for the given quarters (origin 'user').
 * The forecast range (low/high) is left as the reference band, so a user value may lie outside it.
 */
export function withUserPath(
  c: Conditions, id: ConditionId, values: Partial<Record<QuarterKey, number>>, grid: Grid = makeGrid(),
): Conditions {
  if (!Object.hasOwn(c, id)) throw new Error(`withUserPath: unknown condition ${id}`);
  const path = c[id];
  if (path.values.length !== grid.quarters.length) {
    throw new Error(`withUserPath: ${id} has ${path.values.length} quarters but the grid has ${grid.quarters.length}`);
  }
  const nv = path.values.slice();
  const no = path.origin.slice();
  for (const [q, v] of Object.entries(values)) {
    if (v === undefined) continue;
    const i = grid.idx(q); // throws naming the quarter when off the grid
    if (!Number.isFinite(v)) throw new Error(`withUserPath: ${id}@${q} must be a finite number, got ${v}`);
    nv[i] = v;
    no[i] = 'user';
  }
  return { ...c, [id]: { ...path, values: nv, origin: no } };
}

let cachedSpecs: ConditionSpecs | undefined;
let cachedParams: EngineParams | undefined;
const defaultSpecs = () => (cachedSpecs ??= loadConditionSpecs());
const defaultParams = () => (cachedParams ??= loadParams());
