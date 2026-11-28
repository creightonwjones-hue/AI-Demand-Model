import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

// ---- SourceRef ----
export const VerificationStatusSchema = z.enum(['primary-filing', 'primary-company', 'secondary', 'unverified']);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export const SourceRefSchema = z.object({
  url: z.string(),
  title: z.string().optional(),
  retrieved: isoDate,
  status: VerificationStatusSchema,
});
export type SourceRef = z.infer<typeof SourceRefSchema>;

// ---- Entity ----
export const LayerSchema = z.enum(['money', 'labs', 'financing', 'cloud', 'chips', 'supply']);
export type Layer = z.infer<typeof LayerSchema>;

export const EntityKindSchema = z.enum(['public-company', 'private-company', 'spv', 'lender', 'aggregate', 'government']);
export type EntityKind = z.infer<typeof EntityKindSchema>;

export const EntitySchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'expected kebab-case'),
  name: z.string(),
  layer: LayerSchema,
  group: z.string().optional(),
  kind: EntityKindSchema,
  ticker: z.string().optional(),
  cik: z.string().regex(/^\d{10}$/, 'expected 10 digits').optional(),
  xbrl: z.boolean(),
  currency: z.enum(['USD', 'TWD', 'KRW', 'EUR']),
});
export type Entity = z.infer<typeof EntitySchema>;

// ---- FinancialFact ----
export const QuarterKeySchema = z.string().regex(/^\d{4}Q[1-4]$/, 'expected YYYYQn');
export type QuarterKey = z.infer<typeof QuarterKeySchema>;

export const MetricSchema = z.enum([
  'revenue', 'capex', 'operatingCashFlow', 'cash', 'longTermDebt', 'netIncome',
  'epsDiluted', 'accountsReceivable', 'grossProfit', 'segmentRevenue',
  // Weighted-average diluted shares for the quarter (unit: shares, not USD; not split-adjusted across filings).
  'dilutedShares',
  // Contracted revenue not yet recognised, at the balance-sheet date (an instant, USD).
  'remainingPerformanceObligations',
]);
export type Metric = z.infer<typeof MetricSchema>;

export const FinancialFactSchema = z.object({
  entityId: z.string(),
  metric: MetricSchema,
  // XBRL tag the value came from (e.g. "LongTermDebtNoncurrent"); undefined for manual rows.
  tag: z.string().optional(),
  // Segments can overlap: "Data Center - Hyperscale" is part of "Data Center" (source title notes parentSegment).
  // Never sum a "<Parent> - <Sub>" row with its parent.
  segment: z.string().optional(),
  quarter: QuarterKeySchema,
  periodStart: isoDate,
  periodEnd: isoDate,
  weeks: z.number(),
  value: z.number(), // USD; USD/share for epsDiluted; shares for dilutedShares
  originalCurrency: z.string().optional(),
  originalValue: z.number().optional(),
  fxRate: z.number().optional(),
  derived: z.boolean(),
  asKnownAt: isoDate,
  form: z.string().optional(),
  source: SourceRefSchema,
});
export type FinancialFact = z.infer<typeof FinancialFactSchema>;

// ---- Series ----
export const SeriesPointSchema = z.object({
  date: isoDate,
  value: z.number(),
  asKnownAt: isoDate, // when the point became public (FRED: date + publication lag; manual: article date)
  // Per-point source for manually transcribed series (each point can come from a different article).
  // FRED points omit it and inherit the series-level source.
  source: SourceRefSchema.optional(),
});
export type SeriesPoint = z.infer<typeof SeriesPointSchema>;

export const SeriesSchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: z.string(),
  provider: z.string(),
  kind: z.enum(['condition', 'indicator', 'consensus', 'guidance']),
  source: SourceRefSchema,
  points: z.array(SeriesPointSchema),
});
export type Series = z.infer<typeof SeriesSchema>;

// ---- Deal ----
export const DealTypeSchema = z.enum([
  'compute-lease', 'chip-purchase', 'equity', 'loan', 'spv-financing', 'capacity-guarantee',
  'warrants', 'jv', 'buyer-of-last-resort', 'other',
]);
export type DealType = z.infer<typeof DealTypeSchema>;

export const DealStatusSchema = z.enum([
  'announced', 'active', 'expanded', 'delayed', 'renegotiated', 'cancelled', 'replaced', 'completed',
]);
export type DealStatus = z.infer<typeof DealStatusSchema>;

const triState = z.enum(['yes', 'no', 'unknown']);

// One dated step in a deal's life. `date` is when it happened; `asKnownAt` is when it became public (the date of the
// first source that reported it), never before `date`. A backtest applies the entry only from `asKnownAt`.
export const DealStatusEntrySchema = z.object({
  date: isoDate,
  asKnownAt: isoDate,
  status: DealStatusSchema,
  note: z.string().optional(),
}).refine(s => s.asKnownAt >= s.date, { message: 'asKnownAt is before date (known before it happened)', path: ['asKnownAt'] });
export type DealStatusEntry = z.infer<typeof DealStatusEntrySchema>;

export const DealSchema = z.object({
  id: z.string(),
  name: z.string(),
  payers: z.array(z.string()),
  payees: z.array(z.string()),
  guarantors: z.array(z.string()),
  vehicle: z.string().optional(),
  types: z.array(DealTypeSchema),
  // `announced` = first public disclosure of THIS record's values (a later expansion is its own record or a
  // statusHistory entry). Month-only dates use the last day of the month; a range uses its latest date. A backtest
  // may use the record only from this date. See docs/data/adding-a-deal.md.
  announced: isoDate,
  signed: isoDate.optional(),
  start: isoDate.optional(),
  end: isoDate.optional(),
  values: z.object({
    hardMinimumUsd: z.number().optional(),
    ceilingUsd: z.number().optional(),
    conditionalUsd: z.number().optional(),
    estimateUsd: z.number().optional(),
  }).strict(), // no total field: value types stay separate
  terms: z.object({
    rate: z.string().optional(),
    maturity: z.string().optional(),
    recourse: z.enum(['recourse', 'non-recourse', 'unknown']),
    collateral: z.string().optional(),
    takeOrPay: triState,
    hellOrHighWater: triState,
    terminationRights: z.string().optional(),
    exclusivity: z.string().optional(),
    notes: z.string().optional(),
    // When the terms as written became public (date of the source they came from). Absent: the `announced` date.
    asKnownAt: isoDate.optional(),
  }).strict(),
  statusHistory: z.array(DealStatusEntrySchema),
  sources: z.array(SourceRefSchema),
}).strict().refine(d => d.terms.asKnownAt === undefined || d.terms.asKnownAt >= d.announced,
  { message: 'terms.asKnownAt is before announced', path: ['terms', 'asKnownAt'] });
export type Deal = z.infer<typeof DealSchema>;
