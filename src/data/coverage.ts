import { MetricSchema, type Entity, type FinancialFact, type Metric, type QuarterKey } from './schema';
import { quarterRange } from './quarters';

export type CoverageRow = {
  entityId: string;
  metric: Metric;
  firstQuarter?: QuarterKey;
  lastQuarter?: QuarterKey;
  /** Quarters between firstQuarter and lastQuarter with no fact. Quarters before the first fact are not gaps. */
  gaps: QuarterKey[];
  /** Facts (all vintages) in the window whose source status is 'unverified'. */
  unverifiedCount: number;
};
export type CoverageReport = CoverageRow[];

/**
 * Per entity and metric: first/last quarter with a fact inside [from, to], quarters missing in between, and the
 * number of unverified facts. Gaps are reported, never filled. segmentRevenue rows appear only where facts exist
 * (any segment counts as covering the quarter); every other metric has a row for every entity.
 */
export function coverageReport(entities: Entity[], facts: FinancialFact[], from: QuarterKey, to: QuarterKey): CoverageReport {
  const window = new Set(quarterRange(from, to));
  const byKey = new Map<string, FinancialFact[]>();
  for (const f of facts) {
    if (!window.has(f.quarter)) continue;
    const k = `${f.entityId}|${f.metric}`;
    const arr = byKey.get(k);
    if (arr) arr.push(f); else byKey.set(k, [f]);
  }
  const out: CoverageReport = [];
  for (const e of entities) {
    for (const metric of MetricSchema.options) {
      const fs = byKey.get(`${e.id}|${metric}`) ?? [];
      if (metric === 'segmentRevenue' && !fs.length) continue;
      const have = new Set(fs.map(f => f.quarter));
      const unverifiedCount = fs.filter(f => f.source.status === 'unverified').length;
      if (!have.size) { out.push({ entityId: e.id, metric, gaps: [], unverifiedCount }); continue; }
      const sorted = [...have].sort();
      const firstQuarter = sorted[0];
      const lastQuarter = sorted[sorted.length - 1];
      const gaps = quarterRange(firstQuarter, lastQuarter).filter(q => !have.has(q));
      out.push({ entityId: e.id, metric, firstQuarter, lastQuarter, gaps, unverifiedCount });
    }
  }
  return out;
}
