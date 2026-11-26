import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseCsv } from '../src/data/csv';
import { buildSeries, fredToSeries } from '../src/data/series';
import { SeriesSchema } from '../src/data/schema';

const HEADER = 'series_id,name,unit,provider,kind,date,value,as_known_at,source_url,source_title,retrieved,status';

function row(over: Record<string, string> = {}): Record<string, string> {
  return {
    series_id: 'cds5y-oracle-ice', name: 'Oracle 5y CDS (ICE)', unit: 'bp', provider: 'ICE', kind: 'condition',
    date: '2025-11-14', value: '106', as_known_at: '2025-11-14', source_url: 'https://example.com/a',
    source_title: 'Example', retrieved: '2026-11-25', status: 'secondary', ...over,
  };
}

describe('parseCsv', () => {
  it('parses header-keyed records with quoted fields, escaped quotes and CRLF', () => {
    const text = 'a,b,c\r\n1,"x, y","say ""hi"""\r\n\r\n2,,z\n';
    expect(parseCsv(text)).toEqual([
      { a: '1', b: 'x, y', c: 'say "hi"' },
      { a: '2', b: '', c: 'z' },
    ]);
  });

  it('throws on a row with the wrong number of fields', () => {
    expect(() => parseCsv('a,b\n1,2,3\n')).toThrow(/field/i);
  });

  it('throws on an unterminated quote', () => {
    expect(() => parseCsv('a,b\n1,"oops\n')).toThrow(/quote/i);
  });
});

describe('buildSeries', () => {
  it('throws when one series_id has more than one provider', () => {
    expect(() => buildSeries([row({ series_id: 'cds5y-oracle', provider: 'ICE' }),
      row({ series_id: 'cds5y-oracle', provider: 'S&P Global MI' })])).toThrow(/provider/i);
  });

  it('groups rows into sorted series with a source on every point', () => {
    const series = buildSeries([
      row({ date: '2026-03-27', value: '198.18', as_known_at: '2026-03-30', source_url: 'https://example.com/b' }),
      row(),
      row({ series_id: 'cds5y-oracle-spgmi', name: 'Oracle 5y CDS (S&P Global MI)', provider: 'S&P Global MI',
        date: '2026-11-25', value: '356', as_known_at: '2026-11-25' }),
    ]);
    expect(series.map(s => s.id)).toEqual(['cds5y-oracle-ice', 'cds5y-oracle-spgmi']);
    const ice = series[0];
    expect(SeriesSchema.parse(ice)).toBeTruthy();
    expect(ice).toMatchObject({ provider: 'ICE', unit: 'bp', kind: 'condition' });
    expect(ice.points.map(p => [p.date, p.value, p.asKnownAt])).toEqual([
      ['2025-11-14', 106, '2025-11-14'], ['2026-03-27', 198.18, '2026-03-30'],
    ]);
    expect(ice.points[1].source).toEqual({ url: 'https://example.com/b', title: 'Example', retrieved: '2026-11-25',
      status: 'secondary' });
    // series-level source = source of the latest point
    expect(ice.source.url).toBe('https://example.com/b');
  });

  it('rejects inconsistent metadata, bad values, statuses and dates', () => {
    expect(() => buildSeries([row(), row({ unit: '%', date: '2026-01-01', as_known_at: '2026-01-01' })])).toThrow(/unit/i);
    expect(() => buildSeries([row({ value: '~106' })])).toThrow(/value/i);
    expect(() => buildSeries([row({ value: '' })])).toThrow(/value/i);
    expect(() => buildSeries([row({ status: 'Primary' })])).toThrow();
    expect(() => buildSeries([row({ date: 'Oct 2025' })])).toThrow();
    expect(() => buildSeries([row({ provider: '' })])).toThrow(/provider/i);
    expect(() => buildSeries([row(), row()])).toThrow(/duplicate/i);
  });

  it('rejects a point known before its observation date (look-ahead)', () => {
    expect(() => buildSeries([row({ date: '2025-12-09', as_known_at: '2025-12-08' })])).toThrow(/as_known_at/i);
    expect(buildSeries([row({ date: '2025-12-09', as_known_at: '2026-10-24' })])[0].points[0].asKnownAt)
      .toBe('2026-10-24');
  });
});

describe('fredToSeries', () => {
  const meta = { name: '10-year Treasury yield', unit: '%', kind: 'condition' as const, lagDays: 1 };

  it('parses FRED CSV, skips "." missing values and dates each point by its publication lag', () => {
    const s = fredToSeries('DGS10', 'observation_date,DGS10\n2026-11-20,4.1\n2026-11-21,.\n', meta);
    expect(s.points).toEqual([{ date: '2026-11-20', value: 4.1, asKnownAt: '2026-11-21' }]);
    const monthly = fredToSeries('RAMPAIALL', 'observation_date,RAMPAIALL\n2026-10-01,56.8\n',
      { ...meta, lagDays: 45 });
    expect(monthly.points[0].asKnownAt).toBe('2026-11-15');
    expect(s).toMatchObject({ id: 'DGS10', provider: 'FRED', name: meta.name, unit: '%', kind: 'condition' });
    expect(s.source.url).toBe('https://fred.stlouisfed.org/series/DGS10');
    expect(SeriesSchema.parse(s)).toBeTruthy();
  });

  it('throws when the CSV has no column for the series', () => {
    expect(() => fredToSeries('DGS10', 'observation_date,SOFR\n2026-11-20,4.1\n', meta)).toThrow(/DGS10/);
  });
});

describe('data/manual/series.csv', () => {
  it('loads, validates and keeps providers separate', () => {
    const rows = parseCsv(readFileSync('data/manual/series.csv', 'utf8'));
    expect(Object.keys(rows[0]).join(',')).toBe(HEADER);
    const series = buildSeries(rows);
    for (const s of series) expect(SeriesSchema.parse(s)).toBeTruthy();
    const ids = new Set(series.map(s => s.id));
    for (const id of ['cds5y-oracle-spgmi', 'cds5y-oracle-ice', 'cds5y-coreweave-spgmi',
      'gpu-rent-h100-reserved-semianalysis', 'gpu-rent-h100-spot-silicondata', 'gpu-rent-h100-ornn',
      'guidance-capex-microsoft-cy2026']) expect(ids.has(id)).toBe(true);
    const ora = series.find(s => s.id === 'cds5y-oracle-spgmi')!;
    expect(ora.points.at(-1)).toMatchObject({ date: '2026-11-25', value: 356 });
  });

  it('has no look-ahead: back-reported and month-only points are known no earlier than the article could exist',
    () => {
      const rows = parseCsv(readFileSync('data/manual/series.csv', 'utf8'));
      const at = (id: string, date: string) => rows.find(r => r.series_id === id && r.date === date)!.as_known_at;
      // earlier point of a "from -> to" pair is known at the later point's date
      expect(at('cds5y-oracle-spgmi', '2026-10-08')).toBe('2026-10-15');
      expect(at('cds5y-oracle-ice', '2026-03-27')).toBe('2026-07-17');
      expect(at('cds5y-coreweave-ice', '2026-10-15')).toBe('2026-10-22');
      expect(at('cds5y-softbank-tvdelmarva', '2026-10-15')).toBe('2026-11-25');
      expect(at('gpu-rent-h100-spot-silicondata', '2025-12-09')).toBe('2026-10-24');
      for (const g of ['b200', 'h200', 'h100', 'a100']) expect(at(`gpu-rent-${g}-ornn`, '2026-10-11')).toBe('2026-10-25');
      expect(at('gpu-rent-h100-reserved-semianalysis', '2025-10-01')).toBe('2026-03-31');
      expect(at('gpu-rent-b200-ornn', '2026-03-01')).toBe('2026-04-30');
      // month-only rows: date = 1st of month, known at the month's last day (or later)
      const monthOnly = rows.filter(r => /date given as [A-Z][a-z]{2} \d{4} only|year to [A-Z][a-z]{2} \d{4}/.test(
        r.source_title));
      expect(monthOnly.length).toBeGreaterThanOrEqual(16);
      for (const r of monthOnly) {
        expect(r.date.endsWith('-01')).toBe(true);
        const [y, m] = r.date.split('-').map(Number);
        const monthEnd = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
        expect(r.as_known_at >= monthEnd, `${r.series_id} ${r.date}`).toBe(true);
      }
    });
});

describe('data/raw/fred', () => {
  const config = JSON.parse(readFileSync('config/fred-series.json', 'utf8')) as
    Array<{ id: string; name: string; unit: string; kind: 'condition' | 'indicator'; lagDays: number }>;
  const load = (id: string) => fredToSeries(id, readFileSync(`data/raw/fred/${id}.csv`, 'utf8'),
    config.find(c => c.id === id)!);

  it('has the 13 configured series, each parsing to a non-empty FRED series with asKnownAt on every point', () => {
    expect(config.map(c => c.id).sort()).toEqual(['AAA10Y', 'BAA10Y', 'BAMLC0A0CM', 'BAMLH0A0HYM2', 'DEXKOUS',
      'DEXTAUS', 'DEXUSEU', 'DFF', 'DGS10', 'RAMPAIALL', 'SOFR', 'SP500', 'VIXCLS']);
    for (const c of config) {
      expect(c.lagDays).toBe(c.id === 'RAMPAIALL' ? 45 : 1);
      const s = load(c.id);
      expect(s.points.length).toBeGreaterThan(0);
      expect(s.points.every(p => p.asKnownAt !== undefined && p.asKnownAt > p.date)).toBe(true);
    }
  });

  it('has full-history Baa and Aaa corporate spreads (the ICE BofA OAS start only in 2023)', () => {
    expect(load('BAA10Y').points[0].date < '2022-01-01').toBe(true);
    expect(load('AAA10Y').points[0].date < '2022-01-01').toBe(true);
  });

  it('has the Ramp AI Index through at least 2026-10-01', () => {
    const c = config.find(x => x.id === 'RAMPAIALL')!;
    const s = fredToSeries('RAMPAIALL', readFileSync('data/raw/fred/RAMPAIALL.csv', 'utf8'), c);
    expect(s.points.at(-1)!.date >= '2026-10-01').toBe(true);
  });
});
