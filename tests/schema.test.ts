import { describe, it, expect } from 'vitest';
import { DealSchema, SourceRefSchema, FinancialFactSchema, EntitySchema, SeriesSchema } from '../src/data/schema';

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
  statusHistory: [{ date: '2025-07-22', status: 'announced' as const }],
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
    const s = { id: 'x', name: 'X', unit: 'USD', provider: 'p', kind: 'indicator', source, points: [{ date: '2026-01-01', value: 1 }] };
    expect(SeriesSchema.safeParse(s).success).toBe(true);
    expect(SeriesSchema.safeParse({ ...s, kind: 'bogus' }).success).toBe(false);
  });
});
