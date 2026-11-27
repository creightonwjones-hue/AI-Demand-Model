// The engine's ONLY gateway to data/build/*.json. A view at date D exposes only what was publicly known on D:
// facts and series points with asKnownAt <= D, deals with announced <= D, and status entries with asKnownAt <= D.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import {
  DealSchema, EntitySchema, FinancialFactSchema, SeriesSchema,
  type Deal, type DealStatus, type Entity, type FinancialFact, type Metric, type QuarterKey, type Series, type SeriesPoint,
} from '../data/schema';

export interface BuildData { entities: Entity[]; facts: FinancialFact[]; series: Series[]; deals: Deal[] }

export type DealView = Deal & { statusAsOf: DealStatus };

export interface AsOfData {
  asOf: string;
  entities: Entity[];
  fact(entityId: string, metric: Metric, quarter: QuarterKey, segment?: string): FinancialFact | undefined;
  /** Points of the series known by asOf; [] for an unknown series id. */
  series(id: string): SeriesPoint[];
  deals: DealView[];
}

function readValidated<T>(dir: string, file: string, schema: z.ZodType<T>): T {
  const path = join(dir, file);
  let raw: unknown;
  try { raw = JSON.parse(readFileSync(path, 'utf8')); }
  catch (e) { throw new Error(`${file}: cannot read/parse ${path}: ${(e as Error).message}`); }
  const r = schema.safeParse(raw);
  if (!r.success) throw new Error(`${file}: schema validation failed: ${r.error.message}`);
  return r.data;
}

export function loadBuild(dir = 'data/build'): BuildData {
  return {
    entities: readValidated(dir, 'entities.json', z.array(EntitySchema)),
    facts: readValidated(dir, 'financials.json', z.array(FinancialFactSchema)),
    series: readValidated(dir, 'series.json', z.array(SeriesSchema)),
    deals: readValidated(dir, 'deals.json', z.array(DealSchema)),
  };
}

const key = (entityId: string, metric: string, quarter: string, segment?: string) =>
  `${entityId}|${metric}|${quarter}|${segment ?? ''}`;

export function asOfView(build: BuildData, asOf: string): AsOfData {
  // Latest-filed known version per entity|metric|quarter|segment (same rule as valueAsOf, plus segment).
  const facts = new Map<string, FinancialFact>();
  for (const f of build.facts) {
    if (f.asKnownAt > asOf) continue;
    const k = key(f.entityId, f.metric, f.quarter, f.segment);
    const prev = facts.get(k);
    if (!prev || f.asKnownAt >= prev.asKnownAt) facts.set(k, f);
  }
  const seriesById = new Map<string, SeriesPoint[]>();
  for (const s of build.series) seriesById.set(s.id, s.points.filter(p => p.asKnownAt <= asOf));

  // terms.asKnownAt is informational in this phase: terms are exposed as written.
  const deals: DealView[] = build.deals
    .filter(d => d.announced <= asOf)
    .map(d => {
      const statusHistory = d.statusHistory.filter(s => s.asKnownAt <= asOf);
      let latest: (typeof statusHistory)[number] | undefined;
      for (const s of statusHistory) if (!latest || s.date >= latest.date) latest = s;
      return { ...d, statusHistory, statusAsOf: latest ? latest.status : 'announced' };
    });

  return {
    asOf,
    entities: build.entities,
    fact: (entityId, metric, quarter, segment) => facts.get(key(entityId, metric, quarter, segment)),
    series: id => seriesById.get(id) ?? [],
    deals,
  };
}
