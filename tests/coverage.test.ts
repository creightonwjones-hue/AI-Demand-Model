import { describe, it, expect } from 'vitest';
import { coverageReport } from '../src/data/coverage';
import type { Entity, FinancialFact, Metric } from '../src/data/schema';

const acme: Entity = { id: 'acme', name: 'Acme', layer: 'chips', kind: 'public-company', xbrl: true, currency: 'USD' };
const other: Entity = { id: 'other', name: 'Other', layer: 'cloud', kind: 'public-company', xbrl: true, currency: 'USD' };

function fact(entityId: string, metric: Metric, quarter: string, status: 'primary-filing' | 'unverified' = 'primary-filing',
  asKnownAt = '2026-01-01'): FinancialFact {
  return {
    entityId, metric, quarter, periodStart: '2025-01-01', periodEnd: '2025-03-31', weeks: 13, value: 5, derived: false,
    asKnownAt, source: { url: 'https://x', retrieved: '2026-01-01', status },
  };
}

describe('coverageReport', () => {
  it('reports gaps between first and last fact, never zero-fills', () => {
    const r = coverageReport([acme], [fact('acme', 'revenue', '2025Q1'), fact('acme', 'revenue', '2025Q3')], '2024Q1', '2025Q4');
    expect(r.find(x => x.metric === 'revenue')).toMatchObject({
      entityId: 'acme', firstQuarter: '2025Q1', lastQuarter: '2025Q3', gaps: ['2025Q2'],
    });
    expect(JSON.stringify(r)).not.toContain('"value":0');
  });

  it('does not treat quarters before the first fact as gaps; multiple vintages are one quarter', () => {
    const r = coverageReport([acme], [fact('acme', 'capex', '2025Q2'), fact('acme', 'capex', '2025Q2', 'primary-filing', '2026-02-01'),
      fact('acme', 'capex', '2025Q3')], '2022Q1', '2025Q4');
    expect(r.find(x => x.metric === 'capex')).toMatchObject({ firstQuarter: '2025Q2', lastQuarter: '2025Q3', gaps: [] });
  });

  it('counts unverified facts and ignores facts outside the window', () => {
    const r = coverageReport([acme], [fact('acme', 'revenue', '2025Q1', 'unverified'), fact('acme', 'revenue', '2020Q1', 'unverified'),
      fact('acme', 'revenue', '2025Q2')], '2022Q1', '2025Q4');
    expect(r.find(x => x.metric === 'revenue')).toMatchObject({ firstQuarter: '2025Q1', unverifiedCount: 1 });
  });

  it('reports a metric with no facts without first/last, and separates entities', () => {
    const r = coverageReport([acme, other], [fact('acme', 'revenue', '2025Q1')], '2024Q1', '2025Q4');
    expect(r.find(x => x.entityId === 'acme' && x.metric === 'netIncome')).toMatchObject({ gaps: [], unverifiedCount: 0 });
    expect(r.find(x => x.entityId === 'acme' && x.metric === 'netIncome')!.firstQuarter).toBeUndefined();
    expect(r.find(x => x.entityId === 'other' && x.metric === 'revenue')!.firstQuarter).toBeUndefined();
  });
});
