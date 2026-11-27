import { quarterRange } from '../data/quarters';
import type { QuarterKey } from '../data/schema';
import type { Grid } from './types';

/** Build the quarterly grid (default 2022Q1..2030Q4, 36 quarters). */
export function makeGrid(from: QuarterKey = '2022Q1', to: QuarterKey = '2030Q4'): Grid {
  const quarters = quarterRange(from, to);
  const index = new Map(quarters.map((q, i) => [q, i]));
  return {
    quarters,
    idx(q: QuarterKey): number {
      const i = index.get(q);
      if (i === undefined) throw new Error(`Quarter ${q} is outside the grid ${from}..${to}`);
      return i;
    },
  };
}
