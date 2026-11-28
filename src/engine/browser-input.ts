// What the browser engine is fed: the committed build with old series points dropped (the grid starts in 2022, and
// conditions use at most a year of history before it), so the page does not ship decades of daily rates.
import type { BuildData } from './asof';
import type { QuarterKey } from '../data/schema';
import { asOfView } from './asof';
import { latestBuildDate } from './backtest';
import type { ConditionSpecs } from './conditions';
import { makeGrid } from './grid';
import type { BaselineComparisons, EngineParams } from './types';

export function trimBuild(b: BuildData, from = '2021-01-01'): BuildData {
  return { ...b, series: b.series.map(s => ({ ...s, points: s.points.filter(p => p.date >= from) })) };
}


/** Everything the page's engine worker needs, served by the `virtual:engine-input` module. */
export interface EngineInputBundle {
  build: BuildData;
  params: EngineParams;
  specs: ConditionSpecs;
  /** Latest date anything in the build became public. */
  asOf: string;
  /** First quarter without reported NVIDIA revenue (the first simulated quarter). */
  start: QuarterKey;
  comparisons: BaselineComparisons;
}

export function makeBundle(full: BuildData, params: EngineParams, specs: ConditionSpecs, comparisons: BaselineComparisons): EngineInputBundle {
  const asOf = latestBuildDate(full);
  const view = asOfView(full, asOf);
  const grid = makeGrid();
  const start = grid.quarters.find((q, i) => !view.fact('nvidia', 'revenue', q) && grid.quarters.slice(0, i).some(p => view.fact('nvidia', 'revenue', p)))!;
  return { build: trimBuild(full), params, specs, asOf, start, comparisons };
}

/** The small part of the bundle the page itself needs (the worker gets the rest): served by `virtual:engine-meta`. */
export type EngineMeta = Pick<EngineInputBundle, 'asOf' | 'start' | 'comparisons'> & Pick<BuildData, 'entities' | 'deals'>
  & { conditionNames: Partial<Record<string, string>> };
export const metaOf = (b: EngineInputBundle): EngineMeta =>
  ({ asOf: b.asOf, start: b.start, comparisons: b.comparisons, entities: b.build.entities, deals: b.build.deals,
    conditionNames: Object.fromEntries(Object.entries(b.specs).map(([id, s]) => [id, s.name])) });
