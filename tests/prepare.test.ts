import { describe, it, expect } from 'vitest';
import { latestVintages, monthEnd } from '../src/explorer/prepare';
import type { FinancialFact } from '../src/data/schema';

const fact = (quarter: string, value: number, asKnownAt: string): FinancialFact => ({
  entityId: 'nvidia', metric: 'revenue', quarter, periodStart: '2024-01-01', periodEnd: '2024-03-31', weeks: 13,
  value, derived: false, asKnownAt, source: { url: 'u', retrieved: asKnownAt, status: 'primary-filing' },
});

describe('latestVintages', () => {
  it('keeps the latest-known vintage per quarter', () => {
    const out = latestVintages([fact('2024Q1', 10, '2024-05-01'), fact('2024Q1', 11, '2025-05-01'), fact('2024Q2', 12, '2024-08-01')]);
    expect(out.map(f => [f.quarter, f.value])).toEqual([['2024Q1', 11], ['2024Q2', 12]]);
  });
});

describe('monthEnd', () => {
  it('keeps the last point of each month from the start date', () => {
    const pts = [
      { date: '2018-12-31', value: 0 }, { date: '2019-01-02', value: 1 }, { date: '2019-01-31', value: 2 },
      { date: '2019-02-01', value: 3 },
    ];
    expect(monthEnd(pts, '2019-01-01').map(p => p.value)).toEqual([2, 3]);
  });
});
