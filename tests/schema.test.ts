import { describe, it, expect } from 'vitest';
import { DealSchema, SourceRefSchema, FinancialFactSchema, EntitySchema, SeriesSchema, SeriesPointSchema } from '../src/data/schema';

const source = { url: 'https://example.com/f', retrieved: '2026-11-25', status: 'primary-filing' as const };

const validDeal = {
  id: 'openai-oracle-stargate',
  name: 'OpenAI / Oracle compute lease',
  payers: ['openai'],
  payees: ['oracle'],
  guarantors: [],
  types: ['compute-lease' as const],
  announced: '2025-07-22',
  values: { hardMinimumUsd: 1e9, ceilingUsd: 3e11 },
  terms: { recourse: 'unknown' as const, takeOrPay: 'unknown' as const, hellOrHighWater: 'no' as const },
  statusHistory: [{ date: '2025-07-22', asKnownAt: '2025-07-22', status: 'announced' as const }],
  sources: [source],
};

const validFact = {
  entityId: 'nvidia',
  metric: 'revenue' as const,
  quarter: '2026Q3',
  periodStart: '2026-07-27',
  periodEnd: '2026-10-25',
  weeks: 13,
  value: 5e10,
  derived: false,
  asKnownAt: '2026-11-19',
  source,
};

describe('schema', () => {
  it('accepts valid fixtures', () => {
    expect(DealSchema.safeParse(validDeal).success).toBe(true);
    expect(FinancialFactSchema.safeParse(validFact).success).toBe(true);
  });
  it('rejects unknown Deal keys such as totalUsd', () => {
    expect(DealSchema.safeParse({ ...validDeal, totalUsd: 5 }).success).toBe(false);
  });
  it('rejects a total field inside values and unknown keys inside terms', () => {
    expect(DealSchema.safeParse({ ...validDeal, values: { totalUsd: 5 } }).success).toBe(false);
    expect(DealSchema.safeParse({ ...validDeal, terms: { ...validDeal.terms, totalUsd: 5 } }).success).toBe(false);
  });
  it('requires every status entry to say when it became public, never before it happened', () => {
    expect(DealSchema.safeParse({ ...validDeal, statusHistory: [{ date: '2026-01-02', status: 'active' }] }).success).toBe(false)
    expect(DealSchema.safeParse({ ...validDeal, statusHistory: [{ date: '2026-01-02', asKnownAt: '2026-01-01', status: 'active' }] }).success).toBe(false) // known before it happened
    expect(DealSchema.safeParse({ ...validDeal, statusHistory: [{ date: '2026-01-02', asKnownAt: '2026-01-02', status: 'active' }] }).success).toBe(true)
    expect(DealSchema.safeParse({ ...validDeal, statusHistory: [{ date: '2026-01-02', asKnownAt: '2026-01-05', status: 'completed' }] }).success).toBe(true)
    expect(DealSchema.safeParse({ ...validDeal, statusHistory: [{ date: '2026-01-02', asKnownAt: '2026-1-5', status: 'completed' }] }).success).toBe(false)
  });
  it('accepts an optional terms.asKnownAt, not before the record was announced', () => {
    expect(DealSchema.safeParse({ ...validDeal, terms: { ...validDeal.terms, asKnownAt: '2026-03-02' } }).success).toBe(true);
    expect(DealSchema.safeParse({ ...validDeal, terms: { ...validDeal.terms, asKnownAt: '2025-07-22' } }).success).toBe(true);
    expect(DealSchema.safeParse({ ...validDeal, terms: { ...validDeal.terms, asKnownAt: '2025-07-21' } }).success).toBe(false);
    expect(DealSchema.safeParse({ ...validDeal, terms: { ...validDeal.terms, asKnownAt: 'March 2026' } }).success).toBe(false);
  });
  it('knows the share-count and remaining-performance-obligation metrics', () => {
    expect(FinancialFactSchema.safeParse({ ...validFact, metric: 'dilutedShares', value: 24.3e9 }).success).toBe(true);
    expect(FinancialFactSchema.safeParse({ ...validFact, metric: 'remainingPerformanceObligations' }).success).toBe(true);
  });
  it('rejects unknown verification status', () => {
    expect(SourceRefSchema.safeParse({ url: 'https://x', retrieved: '2026-11-25', status: 'rumour' }).success).toBe(false);
  });
  it('rejects invalid quarter keys', () => {
    expect(FinancialFactSchema.safeParse({ ...validFact, quarter: '2026Q5' }).success).toBe(false);
  });
  it('validates Entity id, cik and currency', () => {
    const e = { id: 'nvidia', name: 'NVIDIA', layer: 'chips', kind: 'public-company', cik: '0001045810', xbrl: true, currency: 'USD' };
    expect(EntitySchema.safeParse(e).success).toBe(true);
    expect(EntitySchema.safeParse({ ...e, id: 'Not Kebab' }).success).toBe(false);
    expect(EntitySchema.safeParse({ ...e, cik: '123' }).success).toBe(false);
  });
  it('validates Series', () => {
    const pt = { date: '2026-01-01', value: 1, asKnownAt: '2026-01-02' };
    const s = { id: 'x', name: 'X', unit: 'USD', provider: 'p', kind: 'indicator', source, points: [pt] };
    expect(SeriesSchema.safeParse(s).success).toBe(true);
    expect(SeriesSchema.safeParse({ ...s, kind: 'bogus' }).success).toBe(false);
  });
  it('requires an ISO asKnownAt and ISO date on every series point', () => {
    const pt = { date: '2026-01-01', value: 1, asKnownAt: '2026-01-02' };
    const ok = (p: object) => SeriesPointSchema.safeParse(p).success;
    expect(ok(pt)).toBe(true);
    expect(ok({ date: pt.date, value: 1 })).toBe(false);
    expect(ok({ ...pt, asKnownAt: '2026-1-2' })).toBe(false);
    expect(ok({ ...pt, date: 'Jan 2026' })).toBe(false);
  });
});
