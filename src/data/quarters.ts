export type QuarterKey = string; // `${year}Q${1-4}`

const MS_DAY = 86_400_000;

function parseDate(d: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) throw new Error(`Invalid date (expected YYYY-MM-DD): ${d}`);
  return Date.UTC(+m[1], +m[2] - 1, +m[3]);
}

function parseQuarter(q: QuarterKey): { year: number; quarter: number } {
  const m = /^(\d{4})Q([1-4])$/.exec(q);
  if (!m) throw new Error(`Invalid quarter key: ${q}`);
  return { year: +m[1], quarter: +m[2] };
}

/** Calendar quarter containing the midpoint of the period. */
export function calendarQuarterFor(periodStart: string, periodEnd: string): QuarterKey {
  const mid = new Date((parseDate(periodStart) + parseDate(periodEnd)) / 2);
  return `${mid.getUTCFullYear()}Q${Math.floor(mid.getUTCMonth() / 3) + 1}`;
}

/** ISO date `n` calendar days after `iso` (negative `n` goes back). */
export function addDays(iso: string, n: number): string {
  return new Date(parseDate(iso) + n * MS_DAY).toISOString().slice(0, 10);
}

/**
 * Quarter of a balance-sheet instant: the quarter of the ~3-month period ending on it (midpoint rule), so instants
 * line up with flow quarters (e.g. NVIDIA's 2026-07-26 balance sheet is 2026Q2, like its Q2 FY27 revenue).
 */
export function instantQuarter(instant: string): QuarterKey {
  return calendarQuarterFor(addDays(instant, -90), instant);
}

/** Period length in whole weeks; end date is inclusive (e.g. 2026-10-26..2027-01-31 = 14). */
export function weeksBetween(periodStart: string, periodEnd: string): number {
  const days = (parseDate(periodEnd) - parseDate(periodStart)) / MS_DAY + 1;
  return Math.round(days / 7);
}

export function addQuarters(q: QuarterKey, n: number): QuarterKey {
  const { year, quarter } = parseQuarter(q);
  const idx = year * 4 + (quarter - 1) + n;
  return `${Math.floor(idx / 4)}Q${(((idx % 4) + 4) % 4) + 1}`;
}

/** Inclusive range of quarters from `from` to `to`. */
export function quarterRange(from: QuarterKey, to: QuarterKey): QuarterKey[] {
  const a = parseQuarter(from);
  const b = parseQuarter(to);
  const count = b.year * 4 + b.quarter - (a.year * 4 + a.quarter) + 1;
  return Array.from({ length: Math.max(count, 0) }, (_, i) => addQuarters(from, i));
}
