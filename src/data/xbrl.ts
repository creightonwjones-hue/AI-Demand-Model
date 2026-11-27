import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { MetricSchema, type Entity, type FinancialFact, type Metric, type QuarterKey } from './schema';
import { addDays, calendarQuarterFor, instantQuarter, weeksBetween } from './quarters';

/** metric -> taxonomy -> tags in priority order (config/sec-metrics.json). */
export type MetricMap = Partial<Record<Metric, Record<string, string[]>>>;

const MetricMapSchema = z.record(MetricSchema, z.record(z.string(), z.array(z.string())));

export function loadMetricMap(path = 'config/sec-metrics.json'): MetricMap {
  return MetricMapSchema.parse(JSON.parse(readFileSync(path, 'utf8'))) as MetricMap;
}

const ALLOWED_FORMS = new Set(['10-Q', '10-K', '10-Q/A', '10-K/A']);
const MONEY_UNITS = ['USD', 'USD/shares'];
/** XBRL units read per metric (all other metrics: MONEY_UNITS). */
const METRIC_UNITS: Partial<Record<Metric, string[]>> = { dilutedShares: ['shares'] };
const STOCK_METRICS = new Set<Metric>(['cash', 'longTermDebt', 'accountsReceivable', 'remainingPerformanceObligations']);
// Per-share values and weighted-average share counts are not additive over time: quarter facts only.
const NO_DECUMULATION = new Set<Metric>(['epsDiluted', 'dilutedShares']);
// Averages: a quarter equal to the year-to-date figure is normal (stable share count), not a mis-tagged total.
const NO_MISTAG_FILTER = new Set<Metric>(['dilutedShares']);

const RawFactSchema = z.object({
  start: z.string().optional(),
  end: z.string(),
  val: z.number(),
  accn: z.string(),
  form: z.string(),
  filed: z.string(),
});
type RawFact = z.infer<typeof RawFactSchema>;

const CompanyFactsSchema = z.object({
  facts: z.record(z.string(), z.record(z.string(), z.object({
    units: z.record(z.string(), z.array(z.unknown())),
  }).passthrough())),
}).passthrough();

// Duration buckets in weeks (end inclusive).
const isQuarter = (w: number) => w >= 12 && w <= 14;
const isHalf = (w: number) => w >= 25 && w <= 27;
const isNineMonth = (w: number) => w >= 38 && w <= 40;
const isAnnual = (w: number) => w >= 51 && w <= 53;

const nextDay = (d: string) => addDays(d, 1);

/** Raw facts for one tag: allowed forms and units only, exact repeats (period, value, filed) removed. */
function rawFactsFor(
  companyFacts: z.infer<typeof CompanyFactsSchema>, taxonomy: string, tag: string, allowedUnits: string[],
): RawFact[] {
  const units = companyFacts.facts[taxonomy]?.[tag]?.units;
  if (!units) return [];
  const seen = new Set<string>();
  const out: RawFact[] = [];
  for (const unit of allowedUnits) {
    for (const item of units[unit] ?? []) {
      const parsed = RawFactSchema.safeParse(item);
      if (!parsed.success || !ALLOWED_FORMS.has(parsed.data.form)) continue;
      const f = parsed.data;
      const key = `${f.start ?? ''}|${f.end}|${f.val}|${f.filed}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(f);
    }
  }
  return out;
}

function makeFact(
  entity: Entity, metric: Metric, tag: string, periodStart: string, periodEnd: string, weeks: number,
  value: number, derived: boolean, filing: RawFact,
  quarter: QuarterKey = calendarQuarterFor(periodStart, periodEnd),
): FinancialFact {
  const cik = String(Number(entity.cik));
  return {
    entityId: entity.id,
    metric,
    tag,
    quarter,
    periodStart,
    periodEnd,
    weeks,
    value,
    derived,
    asKnownAt: filing.filed,
    form: filing.form,
    source: {
      url: `https://www.sec.gov/Archives/edgar/data/${cik}/${filing.accn.replace(/-/g, '')}/`,
      title: `${entity.name} ${filing.form} filed ${filing.filed} (accn ${filing.accn})`,
      retrieved: filing.filed,
      status: 'primary-filing',
    },
  };
}

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    const arr = m.get(k);
    if (arr) arr.push(it); else m.set(k, [it]);
  }
  return m;
}

/** Instant facts -> quarterly facts keyed by the quarter ending on the instant (latest instant in the quarter wins). */
function stockFacts(raw: RawFact[], entity: Entity, metric: Metric, tag: string): Map<QuarterKey, FinancialFact[]> {
  const instants = raw.filter(f => f.start === undefined);
  const byQuarter = groupBy(instants, f => instantQuarter(f.end));
  const out = new Map<QuarterKey, FinancialFact[]>();
  for (const [q, fs] of byQuarter) {
    const lastDate = fs.reduce((d, f) => (f.end > d ? f.end : d), fs[0].end);
    out.set(q, fs.filter(f => f.end === lastDate)
      .map(f => makeFact(entity, metric, tag, f.end, f.end, 0, f.val, false, f, q)));
  }
  return out;
}

/** Key identifying a value reported for a period ending on `end` in one filing. */
const longKey = (f: RawFact) => `${f.accn}|${f.end}|${f.val}`;

/**
 * `accn|end|val` of every duration fact of at least 25 weeks, across all of a metric's tags. A "3-month" fact whose
 * value equals one of these (same filing, same end date) is a mis-tagged year-to-date total, e.g. Oracle's FY22 10-K
 * tags the annual $42.44B under `Revenues` with start 2022-03-01.
 */
function longDurationKeys(raws: RawFact[]): Set<string> {
  return new Set(raws.filter(f => f.start !== undefined && weeksBetween(f.start, f.end) >= 25).map(longKey));
}

/** Duration facts -> quarterly facts: 3-month facts where present, else de-cumulated year-to-date facts. */
function flowFacts(
  raw: RawFact[], entity: Entity, metric: Metric, tag: string, longKeys: Set<string> = new Set(),
): Map<QuarterKey, FinancialFact[]> {
  const durations = raw.filter((f): f is RawFact & { start: string } => f.start !== undefined)
    .map(f => ({ ...f, weeks: weeksBetween(f.start, f.end) }))
    // Drop mis-tagged "3-month" facts that repeat a longer period's total from the same filing.
    .filter(f => !(isQuarter(f.weeks) && longKeys.has(longKey(f))));

  const direct = new Map<QuarterKey, FinancialFact[]>();
  for (const f of durations.filter(d => isQuarter(d.weeks))) {
    const fact = makeFact(entity, metric, tag, f.start, f.end, f.weeks, f.val, false, f);
    const arr = direct.get(fact.quarter);
    if (arr) arr.push(fact); else direct.set(fact.quarter, [fact]);
  }
  if (NO_DECUMULATION.has(metric)) return direct;

  // Period (start|end) -> versions of that period, sorted by filing date.
  const byPeriod = groupBy(durations, f => `${f.start}|${f.end}`);
  for (const vs of byPeriod.values()) vs.sort((a, b) => a.filed.localeCompare(b.filed));

  const derived = new Map<QuarterKey, FinancialFact[]>();
  const pairs: Array<[(w: number) => boolean, (w: number) => boolean]> = [
    [isHalf, isQuarter], [isNineMonth, isHalf], [isAnnual, isNineMonth],
  ];
  for (const [isLarger, isSmaller] of pairs) {
    for (const versions of byPeriod.values()) {
      const larger0 = versions[0];
      if (!isLarger(larger0.weeks)) continue;
      // Component: same fiscal year (same start), next-shorter YTD bucket.
      const component = [...byPeriod.values()].find(v =>
        v[0].start === larger0.start && v[0].end < larger0.end && isSmaller(v[0].weeks));
      if (!component) continue;
      const periodStart = nextDay(component[0].end);
      const periodEnd = larger0.end;
      const weeks = weeksBetween(periodStart, periodEnd);
      if (!isQuarter(weeks)) continue;
      const quarter = calendarQuarterFor(periodStart, periodEnd);
      if (direct.has(quarter)) continue; // a reported 3-month fact wins
      for (const larger of versions) {
        // Component value as known at the larger fact's filing (earliest version if none yet).
        const known = component.filter(c => c.filed <= larger.filed);
        const comp = known.length ? known[known.length - 1] : component[0];
        const later = comp.filed > larger.filed ? comp : larger;
        const fact = makeFact(entity, metric, tag, periodStart, periodEnd, weeks, larger.val - comp.val, true, later);
        const arr = derived.get(quarter);
        if (arr) arr.push(fact); else derived.set(quarter, [fact]);
      }
    }
  }
  for (const [q, fs] of derived) direct.set(q, fs);
  return direct;
}

/**
 * Quarterly financial facts from an SEC company-facts document. Every filing version of a period is kept
 * (restatements appear as extra facts with a later `asKnownAt`). For each metric, quarter and filing, the
 * highest-priority tag with a value for that quarter in that filing is used.
 */
export function extractQuarterly(companyFacts: unknown, entity: Entity, metricMap: MetricMap): FinancialFact[] {
  if (!entity.cik) throw new Error(`entity ${entity.id} has no CIK`);
  const doc = CompanyFactsSchema.parse(companyFacts);
  const out: FinancialFact[] = [];
  for (const metric of MetricSchema.options) {
    const taxonomies = metricMap[metric];
    if (!taxonomies) continue;
    // Tag priority is resolved per filing: (quarter, filing) -> facts from the highest-priority tag in that filing.
    // The source URL identifies the filing (one URL per accession number).
    const chosen = new Map<string, FinancialFact[]>();
    const tagged = Object.entries(taxonomies).flatMap(([taxonomy, tags]) =>
      tags.map(tag => ({ tag, raw: rawFactsFor(doc, taxonomy, tag, METRIC_UNITS[metric] ?? MONEY_UNITS) })));
    const longKeys = longDurationKeys(tagged.flatMap(t => t.raw));
    for (const { tag, raw } of tagged) {
      if (!raw.length) continue;
      const perQuarter = STOCK_METRICS.has(metric)
        ? stockFacts(raw, entity, metric, tag)
        : flowFacts(raw, entity, metric, tag, NO_MISTAG_FILTER.has(metric) ? new Set() : longKeys);
      const perFiling = groupBy([...perQuarter.values()].flat(), f => `${f.quarter}|${f.source.url}`);
      for (const [k, fs] of perFiling) {
        const prev = chosen.get(k);
        // First tag in priority order wins, except that an all-zero value never beats a lower-priority non-zero
        // one in the same filing and quarter (e.g. a placeholder LongTermDebt = 0 next to a real LongTermNotesAndLoans).
        if (!prev || (prev.every(f => f.value === 0) && fs.some(f => f.value !== 0))) chosen.set(k, fs);
      }
    }
    for (const fs of chosen.values()) out.push(...fs);
  }
  return out.sort((a, b) =>
    a.metric.localeCompare(b.metric) || a.quarter.localeCompare(b.quarter) || a.asKnownAt.localeCompare(b.asKnownAt));
}

/** The latest-filed version of a quarter's value with `asKnownAt <= asOf`. */
export function valueAsOf(
  facts: FinancialFact[], entityId: string, metric: Metric, quarter: QuarterKey, asOf: string,
): FinancialFact | undefined {
  let best: FinancialFact | undefined;
  for (const f of facts) {
    if (f.entityId !== entityId || f.metric !== metric || f.quarter !== quarter || f.asKnownAt > asOf) continue;
    if (!best || f.asKnownAt >= best.asKnownAt) best = f;
  }
  return best;
}
