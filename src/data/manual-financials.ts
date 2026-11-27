import { parseCsv } from './csv';
import { addDays, calendarQuarterFor, instantQuarter, weeksBetween } from './quarters';
import { parseNumber } from './series';
import { FinancialFactSchema, MetricSchema, SourceRefSchema, type Entity, type FinancialFact, type Series }
  from './schema';

/**
 * Daily FX rates, all stored as FOREIGN CURRENCY UNITS PER 1 USD (so USD = value / rate for every currency).
 * FRED DEXTAUS (TWD per USD) and DEXKOUS (KRW per USD) are already in that form. FRED DEXUSEU is quoted the other
 * way (USD per EUR), so each daily DEXUSEU value is inverted (EUR per USD = 1 / DEXUSEU) when the table is built.
 * `FinancialFact.fxRate` therefore always holds foreign-per-USD, including for EUR.
 */
export type FxPoint = { date: string; value: number };
export type FxTable = Record<'TWD' | 'KRW' | 'EUR', FxPoint[]>;
export type FxCurrency = keyof FxTable;

const FX_CURRENCIES: readonly FxCurrency[] = ['TWD', 'KRW', 'EUR'];
const INSTANT_LOOKBACK_DAYS = 7; // weekends/holidays: use the last rate on or before the instant, up to a week back

export function buildFxTable(dextaus: Series, dexkous: Series, dexuseu: Series): FxTable {
  const expect = (s: Series, id: string) => { if (s.id !== id) throw new Error(`expected FRED ${id}, got ${s.id}`); };
  expect(dextaus, 'DEXTAUS'); expect(dexkous, 'DEXKOUS'); expect(dexuseu, 'DEXUSEU');
  const plain = (s: Series) => s.points.map(p => ({ date: p.date, value: p.value }));
  return {
    TWD: plain(dextaus),
    KRW: plain(dexkous),
    EUR: dexuseu.points.map(p => ({ date: p.date, value: 1 / p.value })),
  };
}

/** Average of daily rates in [start, end]; for an instant, the last rate on or before it (up to a week back). */
export function fxRateFor(fx: FxTable, currency: FxCurrency, start: string, end: string): number {
  const pts = fx[currency];
  if (start === end) {
    const from = addDays(end, -INSTANT_LOOKBACK_DAYS);
    const hit = pts.filter(p => p.date >= from && p.date <= end).sort((a, b) => a.date.localeCompare(b.date)).at(-1);
    if (!hit) throw new Error(`no ${currency} FX rate on or within ${INSTANT_LOOKBACK_DAYS} days before ${end}`);
    return hit.value;
  }
  const inside = pts.filter(p => p.date >= start && p.date <= end);
  if (!inside.length) throw new Error(`no ${currency} FX rate between ${start} and ${end}`);
  return inside.reduce((s, p) => s + p.value, 0) / inside.length;
}

const COLUMNS = ['entity_id', 'metric', 'segment', 'period_start', 'period_end', 'value', 'currency', 'as_known_at',
  'source_url', 'source_title', 'retrieved', 'status'] as const;

const isQuarter = (w: number) => w >= 12 && w <= 14;

/**
 * Manual quarterly financials (data/manual/financials.csv) -> FinancialFact[]. Rows are quarter-length flows
 * (12–14 weeks) or instants (period_start == period_end, e.g. cash). Non-USD values are converted to USD with the
 * period-average FX rate; the original currency, value and rate are kept. Throws on a missing currency, an unknown
 * entity or metric, a non-quarter period, missing FX data, an `as_known_at` before `period_end`, or any invalid field.
 */
export function loadManualFinancials(csvText: string, entities: Entity[], fx: FxTable): FinancialFact[] {
  const known = new Set(entities.map(e => e.id));
  return parseCsv(csvText).map((r, idx) => {
    const where = `financials row ${idx + 2} (${r.entity_id ?? '?'} ${r.metric ?? '?'})`;
    for (const c of COLUMNS) if (r[c] === undefined) throw new Error(`${where}: missing column ${c}`);
    const entityId = r.entity_id.trim();
    if (!known.has(entityId)) throw new Error(`${where}: unknown entity "${entityId}"`);
    const metric = MetricSchema.parse(r.metric.trim());
    const currency = r.currency.trim();
    if (!currency) throw new Error(`${where}: missing currency`);
    if (currency !== 'USD' && !FX_CURRENCIES.includes(currency as FxCurrency)) {
      throw new Error(`${where}: unsupported currency "${currency}"`);
    }
    const periodStart = r.period_start.trim();
    const periodEnd = r.period_end.trim();
    const asKnownAt = r.as_known_at.trim();
    // Same rule as buildSeries: a figure cannot be public before the period it describes has ended.
    if (asKnownAt < periodEnd) {
      throw new Error(`${where}: as_known_at ${asKnownAt} is before period_end ${periodEnd} (look-ahead)`);
    }
    const instant = periodStart === periodEnd;
    const weeks = instant ? 0 : weeksBetween(periodStart, periodEnd);
    if (!instant && !isQuarter(weeks)) {
      throw new Error(`${where}: period ${periodStart}..${periodEnd} is ${weeks} weeks, not a quarter or an instant`);
    }
    // Instants use the same rule as XBRL balance sheets: the ~3-month period ending on the instant.
    const quarter = instant ? instantQuarter(periodEnd) : calendarQuarterFor(periodStart, periodEnd);
    const original = parseNumber(r.value, where);
    const segment = r.segment.trim() || undefined;
    const fact: FinancialFact = {
      entityId, metric, ...(segment ? { segment } : {}), quarter, periodStart, periodEnd, weeks,
      value: original, derived: false, asKnownAt,
      source: SourceRefSchema.parse({
        url: r.source_url.trim(), title: r.source_title.trim() || undefined, retrieved: r.retrieved.trim(),
        status: r.status.trim(),
      }),
    };
    if (currency !== 'USD') {
      const rate = fxRateFor(fx, currency as FxCurrency, periodStart, periodEnd);
      fact.value = original / rate;
      fact.originalCurrency = currency;
      fact.originalValue = original;
      fact.fxRate = rate;
    }
    return FinancialFactSchema.parse(fact);
  });
}
