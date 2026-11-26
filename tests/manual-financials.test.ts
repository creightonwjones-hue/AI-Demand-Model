import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadManualFinancials, buildFxTable, type FxTable } from '../src/data/manual-financials';
import { FinancialFactSchema, loadEntities, type Series } from '../src/data/schema';

const entities = loadEntities();
const HEADER = 'entity_id,metric,segment,period_start,period_end,value,currency,as_known_at,source_url,source_title,'
  + 'retrieved,status';
const TAIL = '2026-10-16,https://www.sec.gov/x,TSMC 6-K,2026-11-26,primary-filing';
const csv = (...lines: string[]) => [HEADER, ...lines].join('\n') + '\n';

const fx: FxTable = { TWD: [{ date: '2026-07-15', value: 32 }], KRW: [], EUR: [] };

describe('loadManualFinancials', () => {
  it('converts non-USD rows with the period-average rate and keeps the original', () => {
    const [f] = loadManualFinancials(csv(`tsmc,revenue,,2026-07-01,2026-09-30,3200000000000,TWD,${TAIL}`),
      entities, fx);
    expect(f).toMatchObject({ value: 100_000_000_000, originalCurrency: 'TWD', originalValue: 3_200_000_000_000,
      fxRate: 32 });
    expect(f).toMatchObject({ entityId: 'tsmc', metric: 'revenue', quarter: '2026Q3', weeks: 13, derived: false,
      asKnownAt: '2026-10-16', periodStart: '2026-07-01', periodEnd: '2026-09-30' });
    expect(f.source).toEqual({ url: 'https://www.sec.gov/x', title: 'TSMC 6-K', retrieved: '2026-11-26',
      status: 'primary-filing' });
    expect(FinancialFactSchema.parse(f)).toBeTruthy();
  });

  it('averages all daily rates inside the period and ignores rates outside it', () => {
    const fx2: FxTable = { TWD: [{ date: '2026-06-30', value: 99 }, { date: '2026-07-01', value: 30 },
      { date: '2026-09-30', value: 34 }, { date: '2026-10-01', value: 99 }], KRW: [], EUR: [] };
    const [f] = loadManualFinancials(csv(`tsmc,revenue,,2026-07-01,2026-09-30,3200000000000,TWD,${TAIL}`),
      entities, fx2);
    expect(f.fxRate).toBe(32);
  });

  it('uses the rate on or just before the date for instants and aligns the quarter with flows', () => {
    const fx2: FxTable = { TWD: [], KRW: [], EUR: [{ date: '2026-09-29', value: 0.8 }, { date: '2026-10-01', value: 9 }] };
    const [f] = loadManualFinancials(
      csv('asml,cash,,2026-09-30,2026-09-30,8000000000,EUR,2026-10-15,https://www.sec.gov/y,ASML 6-K,2026-11-26,'
        + 'primary-filing'), entities, fx2);
    expect(f).toMatchObject({ value: 10_000_000_000, fxRate: 0.8, originalCurrency: 'EUR', weeks: 0,
      quarter: '2026Q3' });
  });

  it('keeps USD rows as they are, with a segment', () => {
    const [f] = loadManualFinancials(csv('nvidia,segmentRevenue,"Data Center - AI Clouds, Industrial & Enterprise",'
      + '2026-07-27,2026-10-25,47474000000,USD,2026-11-17,https://example.com/p,NVIDIA,2026-11-25,primary-company'),
    entities, fx);
    expect(f).toMatchObject({ value: 47_474_000_000, segment: 'Data Center - AI Clouds, Industrial & Enterprise',
      quarter: '2026Q3', weeks: 13 });
    expect(f.originalCurrency).toBeUndefined();
    expect(f.fxRate).toBeUndefined();
  });

  it('rejects a missing currency, an unknown entity, and missing FX data', () => {
    expect(() => loadManualFinancials(csv(`tsmc,revenue,,2026-07-01,2026-09-30,1,,${TAIL}`), entities, fx))
      .toThrow(/currency/i);
    expect(() => loadManualFinancials(csv(`not-an-entity,revenue,,2026-07-01,2026-09-30,1,USD,${TAIL}`), entities,
      fx)).toThrow(/entity/i);
    expect(() => loadManualFinancials(csv(`sk-hynix,revenue,,2026-07-01,2026-09-30,1,KRW,${TAIL}`), entities, fx))
      .toThrow(/fx|rate/i);
    expect(() => loadManualFinancials(csv(`tsmc,revenue,,2026-07-01,2026-09-30,,TWD,${TAIL}`), entities, fx))
      .toThrow(/value/i);
    expect(() => loadManualFinancials(csv(`tsmc,ebitda,,2026-07-01,2026-09-30,1,TWD,${TAIL}`), entities, fx))
      .toThrow();
  });

  it('rejects periods that are neither a quarter nor an instant', () => {
    expect(() => loadManualFinancials(csv(`tsmc,revenue,,2026-07-01,2026-07-31,1,TWD,${TAIL}`), entities, fx))
      .toThrow(/quarter|period/i);
  });

  it('rejects a row known before its period ended (look-ahead), accepts one known on the last day', () => {
    const row = (asKnownAt: string) =>
      `tsmc,revenue,,2026-07-01,2026-09-30,3200000000000,TWD,${asKnownAt},https://www.sec.gov/x,TSMC 6-K,2026-11-26,`
      + 'primary-filing';
    expect(() => loadManualFinancials(csv(row('2026-09-29')), entities, fx)).toThrow(/look-ahead/);
    expect(loadManualFinancials(csv(row('2026-09-30')), entities, fx)[0].asKnownAt).toBe('2026-09-30');
  });
});

describe('buildFxTable', () => {
  const fred = (id: string, points: Array<[string, number]>): Series => ({
    id, name: id, unit: 'x', provider: 'FRED', kind: 'indicator',
    source: { url: `https://fred.stlouisfed.org/series/${id}`, retrieved: '2026-11-26', status: 'secondary' },
    points: points.map(([date, value]) => ({ date, value, asKnownAt: date })),
  });

  it('stores every currency as foreign units per USD (DEXUSEU is inverted)', () => {
    const t = buildFxTable(fred('DEXTAUS', [['2026-11-20', 31.5]]), fred('DEXKOUS', [['2026-11-20', 1400]]),
      fred('DEXUSEU', [['2026-11-20', 1.25]]));
    expect(t.TWD).toEqual([{ date: '2026-11-20', value: 31.5 }]);
    expect(t.KRW).toEqual([{ date: '2026-11-20', value: 1400 }]);
    expect(t.EUR).toEqual([{ date: '2026-11-20', value: 0.8 }]);
  });
});

describe('data/manual/financials.csv', () => {
  it('has the expected header and the NVIDIA Data Center split', () => {
    const text = readFileSync('data/manual/financials.csv', 'utf8');
    expect(text.split('\n')[0]).toBe(HEADER);
    const usdOnly: FxTable = { TWD: [], KRW: [], EUR: [] };
    const nvdaRows = text.split('\n').filter((l, i) => i === 0 || l.startsWith('nvidia,')).join('\n');
    const facts = loadManualFinancials(nvdaRows, entities, usdOnly);
    const seg = (s: string) => facts.find(f => f.segment === s)?.value;
    expect(seg('Data Center - Hyperscale')).toBe(60_136_000_000);
    expect(seg('Data Center - AI Clouds, Industrial & Enterprise')).toBe(47_474_000_000);
  });
});
