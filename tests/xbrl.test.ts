import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { extractQuarterly, valueAsOf, loadMetricMap } from '../src/data/xbrl';
import { FinancialFactSchema, loadEntities, type Entity } from '../src/data/schema';

const readJson = (p: string): unknown => JSON.parse(readFileSync(p, 'utf8'));

const metricMap = loadMetricMap();
const fixture = readJson('tests/fixtures/xbrl-mini.json');
const entity: Entity = {
  id: 'mini-co', name: 'Mini Co', layer: 'chips', kind: 'public-company',
  ticker: 'MINI', cik: '0001234567', xbrl: true, currency: 'USD',
};

describe('extractQuarterly (fixture)', () => {
  const facts = extractQuarterly(fixture, entity, metricMap);
  const rev = (q: string) => facts.filter(f => f.metric === 'revenue' && f.quarter === q);

  it('de-cumulates year-to-date facts', () => {
    expect(rev('2026Q2')[0]).toMatchObject({ value: 150, derived: true, asKnownAt: '2026-07-30' });
    expect(rev('2026Q3')[0]).toMatchObject({ value: 170, derived: true });
    expect(rev('2026Q4')[0]).toMatchObject({ value: 180, derived: true, asKnownAt: '2027-02-15' });
    expect(rev('2026Q2')).toHaveLength(1);
    expect(rev('2026Q2')[0]).toMatchObject({ periodStart: '2026-04-01', periodEnd: '2026-06-30', weeks: 13 });
  });

  it('keeps restatement vintages and answers as-of queries', () => {
    expect(rev('2026Q1').map(f => f.value).sort()).toEqual([100, 110]); // both vintages kept
    expect(rev('2026Q1').every(f => !f.derived)).toBe(true);
    expect(valueAsOf(facts, entity.id, 'revenue', '2026Q1', '2026-12-31')!.value).toBe(100);
    expect(valueAsOf(facts, entity.id, 'revenue', '2026Q1', '2027-03-01')!.value).toBe(110);
    expect(valueAsOf(facts, entity.id, 'revenue', '2026Q1', '2026-04-29')).toBeUndefined();
    expect(valueAsOf(facts, entity.id, 'revenue', '2026Q4', '2027-02-14')).toBeUndefined();
  });

  it('extracts stock metrics as instants', () => {
    expect(facts.find(f => f.metric === 'cash' && f.quarter === '2026Q2')).toMatchObject({ value: 60, weeks: 0 });
    expect(facts.find(f => f.metric === 'cash' && f.quarter === '2026Q1'))
      .toMatchObject({ value: 50, periodStart: '2026-03-31', periodEnd: '2026-03-31', derived: false });
  });

  it('ignores non-periodic forms and non-USD units; never de-cumulates EPS', () => {
    expect(facts.some(f => f.form === '8-K')).toBe(false);
    expect(facts.some(f => f.value === 999)).toBe(false);
    expect(facts.some(f => f.metric === 'netIncome')).toBe(false);
    const eps = facts.filter(f => f.metric === 'epsDiluted');
    expect(eps.map(f => [f.quarter, f.value])).toEqual([['2026Q1', 0.5]]);
  });

  it('carries source, status and asKnownAt on every fact', () => {
    for (const f of facts) expect(() => FinancialFactSchema.parse(f)).not.toThrow();
    expect(rev('2026Q4')[0].source).toMatchObject({
      url: 'https://www.sec.gov/Archives/edgar/data/1234567/000123456727000005/',
      retrieved: '2027-02-15', status: 'primary-filing',
    });
    expect(rev('2026Q4')[0].form).toBe('10-K');
  });
});

describe('tag priority per filing', () => {
  const facts = extractQuarterly(fixture, entity, metricMap);
  it('keeps a fallback-tag vintage from an earlier filing when a later filing uses the priority tag', () => {
    const capex = facts.filter(f => f.metric === 'capex' && f.quarter === '2026Q1');
    // 10-Q (2026-04-30): fallback tag only -> 30; 10-K (2027-02-15): priority tag 31 beats fallback 32
    expect(capex.map(f => [f.asKnownAt, f.value])).toEqual([['2026-04-30', 30], ['2027-02-15', 31]]);
    expect(valueAsOf(facts, entity.id, 'capex', '2026Q1', '2026-12-31')!.value).toBe(30);
    expect(valueAsOf(facts, entity.id, 'capex', '2026Q1', '2027-03-01')!.value).toBe(31);
  });
});

describe('zero values do not beat non-zero fallback tags within a filing', () => {
  const row = (val: number, filed: string, accn: string) =>
    ({ end: '2026-03-31', val, accn, fy: 2026, fp: 'Q1', form: '10-Q', filed });
  const doc = {
    cik: 1234567, entityName: 'Mini Co',
    facts: { 'us-gaap': {
      LongTermDebt: { units: { USD: [row(0, '2026-04-30', '0001234567-26-000001'), row(0, '2026-07-30', '0001234567-26-000002')] } },
      LongTermNotesAndLoans: { units: { USD: [row(70, '2026-04-30', '0001234567-26-000001')] } },
    } },
  };
  const facts = extractQuarterly(doc, entity, metricMap).filter(f => f.metric === 'longTermDebt');
  it('uses the non-zero lower-priority tag when the priority tag is zero in the same filing', () => {
    expect(facts.find(f => f.asKnownAt === '2026-04-30')!.value).toBe(70);
  });
  it('keeps a zero when every candidate tag in that filing is zero', () => {
    expect(facts.find(f => f.asKnownAt === '2026-07-30')!.value).toBe(0);
  });
});

describe('balance-sheet quarters align with flow quarters (off-calendar filer)', () => {
  const inst = (end: string, val: number) =>
    ({ end, val, accn: '0001234567-26-000099', fy: 2027, fp: 'Q2', form: '10-Q', filed: '2026-09-01' });
  const offCal = {
    cik: 1234567, entityName: 'Mini Co',
    facts: { 'us-gaap': {
      Revenues: { units: { USD: [
        { start: '2026-04-27', end: '2026-07-26', val: 500, accn: '0001234567-26-000099', fy: 2027, fp: 'Q2', form: '10-Q', filed: '2026-09-01' },
      ] } },
      CashAndCashEquivalentsAtCarryingValue: { units: { USD: [
        inst('2026-07-26', 1), inst('2026-08-31', 2), inst('2026-01-25', 3), inst('2026-03-31', 4),
      ] } },
    } },
  };
  const facts = extractQuarterly(offCal, entity, metricMap);
  const cashQ = (end: string) => facts.find(f => f.metric === 'cash' && f.periodEnd === end)?.quarter;
  it('assigns each instant to the quarter ending on it', () => {
    expect(facts.find(f => f.metric === 'revenue')!.quarter).toBe('2026Q2');
    expect(cashQ('2026-07-26')).toBe('2026Q2');
    expect(cashQ('2026-08-31')).toBe('2026Q3');
    expect(cashQ('2026-01-25')).toBe('2025Q4');
    expect(cashQ('2026-03-31')).toBe('2026Q1');
  });
});

describe('extractQuarterly (real Alphabet data)', () => {
  it('keeps the original 10-Q vintage filed under a fallback tag', () => {
    const alphabet = loadEntities().find(e => e.id === 'alphabet')!;
    const facts = extractQuarterly(readJson('data/raw/sec/GOOGL_companyfacts.json'), alphabet, metricMap);
    expect(valueAsOf(facts, 'alphabet', 'revenue', '2020Q1', '2020-12-31')!.value).toBe(41_159_000_000);
  });
});

describe('extractQuarterly (real NVIDIA data)', () => {
  it('matches reported revenue', () => {
    const nvidia = loadEntities().find(e => e.id === 'nvidia')!;
    const nv = extractQuarterly(readJson('data/raw/sec/NVDA_companyfacts.json'), nvidia, metricMap);
    expect(valueAsOf(nv, 'nvidia', 'revenue', '2026Q2', '2026-11-26')!.value).toBe(96_221_000_000);
    // fiscal Q4 FY2026 (Oct 27 2025 - Jan 25 2026) is only in the 10-K: annual - 9-month
    expect(valueAsOf(nv, 'nvidia', 'revenue', '2025Q4', '2026-11-26'))
      .toMatchObject({ value: 215_938_000_000 - 147_811_000_000, derived: true, asKnownAt: '2026-02-25' });
  });
});
