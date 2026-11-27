// Build-time reduction of data/build/*.json into the small payload the explorer page ships.
// Runs in Node (via the Vite plugin in vite.config.ts); nothing here touches the DOM.
import type { Deal, Entity, FinancialFact, Layer, Series, VerificationStatus } from '../data/schema';
import type { BacktestReport } from '../engine/backtest';
import type { EngineBaseline } from '../engine/types';
import { engineSummary, type EngineSummary } from './engine-section';

export const TABLE_METRICS = ['revenue', 'capex', 'operatingCashFlow', 'cash', 'longTermDebt'] as const;
export type TableMetric = (typeof TABLE_METRICS)[number];

/** Series longer than this are cut to month-end points from SERIES_FROM onward. */
export const SAMPLE_ABOVE = 120;
export const SERIES_FROM = '2019-01-01';

export interface SourceInfo { url: string; title?: string; status: VerificationStatus }

export interface FactCell {
  entityId: string;
  metric: TableMetric;
  quarter: string;
  value: number;
  derived: boolean;
  asKnownAt: string;
  /** index into ExplorerData.sources */
  src: number;
}

export interface SeriesPointLite { date: string; value: number; src?: number }

export interface SeriesCard {
  id: string;
  name: string;
  unit: string;
  provider: string;
  kind: Series['kind'];
  src: number;
  points: SeriesPointLite[];
  /** true when points were cut to month-end values from SERIES_FROM */
  sampled: boolean;
  totalPoints: number;
  firstDate?: string;
}

export interface CoverageRowLite {
  entityId: string;
  metric: string;
  firstQuarter?: string;
  lastQuarter?: string;
  gaps: string[];
  unverifiedCount: number;
}

export interface Manifest {
  builtAt: string;
  counts: Record<string, number>;
  unverifiedCounts: Record<string, number>;
  window: { from: string; to: string };
}

export interface ExplorerData {
  manifest: Manifest;
  entities: Array<Pick<Entity, 'id' | 'name' | 'layer' | 'kind'> & { ticker?: string }>;
  sources: SourceInfo[];
  facts: FactCell[];
  series: SeriesCard[];
  deals: Deal[];
  coverage: CoverageRowLite[];
  /** Baseline engine run and backtest, reduced to what the Engine check section shows; absent before the first run. */
  engine?: EngineSummary;
}

/** One fact per (entity, metric, quarter): the vintage with the latest asKnownAt (later input wins ties). */
export function latestVintages(facts: FinancialFact[]): FinancialFact[] {
  const best = new Map<string, FinancialFact>();
  for (const f of facts) {
    const key = `${f.entityId}|${f.metric}|${f.segment ?? ''}|${f.quarter}`;
    const cur = best.get(key);
    if (!cur || f.asKnownAt >= cur.asKnownAt) best.set(key, f);
  }
  return [...best.values()];
}

/** Last observation in each calendar month, from `from` onward. */
export function monthEnd<T extends { date: string }>(points: T[], from: string): T[] {
  const byMonth = new Map<string, T>();
  for (const p of points) if (p.date >= from) byMonth.set(p.date.slice(0, 7), p);
  return [...byMonth.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function prepare(input: {
  entities: Entity[];
  financials: FinancialFact[];
  series: Series[];
  deals: Deal[];
  coverage: CoverageRowLite[];
  manifest: Manifest;
  'engine-baseline'?: EngineBaseline;
  backtest?: BacktestReport;
}): ExplorerData {
  const sources: SourceInfo[] = [];
  const srcIndex = new Map<string, number>();
  const src = (s: SourceInfo): number => {
    const key = `${s.url}|${s.title ?? ''}|${s.status}`;
    let i = srcIndex.get(key);
    if (i === undefined) {
      i = sources.length;
      sources.push({ url: s.url, title: s.title, status: s.status });
      srcIndex.set(key, i);
    }
    return i;
  };

  const metrics = new Set<string>(TABLE_METRICS);
  const facts: FactCell[] = latestVintages(input.financials.filter(f => metrics.has(f.metric) && !f.segment))
    .map(f => ({
      entityId: f.entityId, metric: f.metric as TableMetric, quarter: f.quarter, value: f.value,
      derived: f.derived, asKnownAt: f.asKnownAt, src: src(f.source),
    }))
    .sort((a, b) => a.entityId.localeCompare(b.entityId) || a.metric.localeCompare(b.metric) || a.quarter.localeCompare(b.quarter));

  const series: SeriesCard[] = input.series.map(s => {
    const sampled = s.points.length > SAMPLE_ABOVE;
    const pts = sampled ? monthEnd(s.points, SERIES_FROM) : s.points;
    return {
      id: s.id, name: s.name, unit: s.unit, provider: s.provider, kind: s.kind, src: src(s.source),
      points: pts.map(p => (p.source ? { date: p.date, value: p.value, src: src(p.source) } : { date: p.date, value: p.value })),
      sampled, totalPoints: s.points.length, firstDate: s.points[0]?.date,
    };
  });

  return {
    manifest: input.manifest,
    entities: input.entities.map(e => ({ id: e.id, name: e.name, layer: e.layer as Layer, kind: e.kind, ...(e.ticker ? { ticker: e.ticker } : {}) })),
    sources,
    facts,
    series,
    deals: input.deals,
    coverage: input.coverage,
    ...(input['engine-baseline'] && input.backtest ? { engine: engineSummary(input['engine-baseline'], input.backtest) } : {}),
  };
}
