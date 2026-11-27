import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import type { FinancialFact } from '../src/data/schema';
import { quarterRange } from '../src/data/quarters';
import { valueAsOf } from '../src/data/xbrl';

// Checks over the committed build output (data/build/financials.json). Run `npm run data:build` first after changes.
const facts: FinancialFact[] = JSON.parse(readFileSync('data/build/financials.json', 'utf8'));

/**
 * Vintages that differ from the latest vintage of the same quarter by more than 25%, reviewed and accepted.
 * Key: entity|metric|segment|quarter|asKnownAt of the earlier vintage.
 */
const ACCEPTED_LARGE_REVISIONS: Record<string, string> = {
  // Stock splits: later filings restate EPS on the split-adjusted share count.
  'alphabet|epsDiluted||2022Q1|2022-04-27': '20-for-1 split, July 2022',
  'amazon|epsDiluted||2022Q1|2022-04-29': '20-for-1 split, June 2022',
  'broadcom|epsDiluted||2023Q2|2023-09-06': '10-for-1 split, July 2024',
  'broadcom|epsDiluted||2023Q4|2024-03-14': '10-for-1 split, July 2024',
  'broadcom|epsDiluted||2024Q1|2024-06-13': '10-for-1 split, July 2024',
  'nvidia|epsDiluted||2023Q2|2023-08-28': '10-for-1 split, June 2024',
  'nvidia|epsDiluted||2023Q3|2023-11-21': '10-for-1 split, June 2024',
  'nvidia|epsDiluted||2024Q1|2024-05-29': '10-for-1 split, June 2024',
  // Same splits: later filings restate weighted-average diluted shares on the split-adjusted count.
  'amazon|dilutedShares||2022Q1|2022-04-29': '20-for-1 split, June 2022',
  'broadcom|dilutedShares||2023Q2|2023-09-06': '10-for-1 split, July 2024',
  'broadcom|dilutedShares||2023Q4|2024-03-14': '10-for-1 split, July 2024',
  'broadcom|dilutedShares||2024Q1|2024-06-13': '10-for-1 split, July 2024',
  'nvidia|dilutedShares||2023Q2|2023-08-28': '10-for-1 split, June 2024',
  'nvidia|dilutedShares||2023Q3|2023-11-21': '10-for-1 split, June 2024',
  'nvidia|dilutedShares||2024Q1|2024-05-29': '10-for-1 split, June 2024',
  // Alphabet tagged only LongTermDebt (total incl. current portion) before its FY24 10-K; later filings use
  // LongTermDebtNoncurrent. A definition change, visible through the fact's `tag`.
  'alphabet|longTermDebt||2023Q4|2024-01-31': 'LongTermDebt (total) vs later LongTermDebtNoncurrent',
};

function largeRevisions(fs: FinancialFact[], threshold = 0.25): string[] {
  const groups = new Map<string, FinancialFact[]>();
  for (const f of fs) {
    const k = [f.entityId, f.metric, f.segment ?? '', f.quarter].join('|');
    const arr = groups.get(k);
    if (arr) arr.push(f); else groups.set(k, [f]);
  }
  const out: string[] = [];
  for (const [k, vs] of groups) {
    const latest = vs.reduce((a, b) => (b.asKnownAt >= a.asKnownAt ? b : a));
    for (const v of vs) {
      if (v === latest || latest.value === 0) continue;
      if (Math.abs(v.value - latest.value) / Math.abs(latest.value) > threshold) out.push(`${k}|${v.asKnownAt}`);
    }
  }
  return out.sort();
}

describe('data/build/financials.json vintages', () => {
  const found = largeRevisions(facts);

  it('has no unreviewed vintage differing from the latest vintage by more than 25%', () => {
    if (found.length) console.log(`Vintages >25% from latest:\n  ${found.map(k => `${k}  ${ACCEPTED_LARGE_REVISIONS[k] ?? 'NOT REVIEWED'}`).join('\n  ')}`);
    expect(found.filter(k => !(k in ACCEPTED_LARGE_REVISIONS))).toEqual([]);
  });

  it('accepted list has no stale entries', () => {
    expect(Object.keys(ACCEPTED_LARGE_REVISIONS).filter(k => !found.includes(k))).toEqual([]);
  });

  it('Oracle 2022Q2 revenue is the quarter, not the FY22 annual total', () => {
    const first = facts.filter(f => f.entityId === 'oracle' && f.metric === 'revenue' && f.quarter === '2022Q2')
      .sort((a, b) => a.asKnownAt.localeCompare(b.asKnownAt))[0];
    expect(first.asKnownAt).toBe('2022-06-21');
    expect(first.value).toBeCloseTo(11.84e9, -7);
  });
});

describe('data/build/financials.json XBRL tags', () => {
  it('every SEC XBRL fact (the ones with a form) records its tag; manual rows do not', () => {
    for (const f of facts) expect(f.tag !== undefined, `${f.entityId} ${f.metric} ${f.quarter}`).toBe(f.form !== undefined);
    expect(facts.filter(f => f.tag).length).toBeGreaterThan(1000);
  });

  it('reports entity+metric series whose facts come from more than one XBRL tag', () => {
    const tags = new Map<string, Set<string>>();
    for (const f of facts) {
      if (!f.tag) continue;
      const k = `${f.entityId} ${f.metric}`;
      (tags.get(k) ?? tags.set(k, new Set()).get(k)!).add(f.tag);
    }
    const multi = [...tags].filter(([, s]) => s.size > 1).map(([k, s]) => `${k}: ${[...s].join(', ')}`).sort();
    console.log(`Entity+metric with more than one XBRL tag (${multi.length}):\n  ${multi.join('\n  ')}`);
    // Reporting only, but the debt definition must not switch for anyone except Alphabet's pre-FY24 filings.
    expect(multi.filter(m => m.includes('longTermDebt') && !m.startsWith('alphabet '))).toEqual([]);
  });
});

describe('data/build/financials.json phase 2 additions', () => {
  it('has NVIDIA Data Center revenue for every quarter 2022Q1-2026Q3, each known at its earnings 8-K', () => {
    const dc = facts.filter(f => f.entityId === 'nvidia' && f.metric === 'segmentRevenue' && f.segment === 'Data Center')
    expect(new Set(dc.map(f => f.quarter))).toEqual(new Set(quarterRange('2022Q1', '2026Q3')))
    const q = (quarter: string) => dc.find(f => f.quarter === quarter)!;
    expect(q('2022Q1')).toMatchObject({ value: 3_750_000_000, asKnownAt: '2022-05-25', periodEnd: '2022-05-01' });
    expect(q('2022Q4')).toMatchObject({ value: 3_616_000_000, asKnownAt: '2023-02-22', periodEnd: '2023-01-29' });
    expect(q('2025Q4')).toMatchObject({ value: 62_314_000_000, asKnownAt: '2026-02-25', periodEnd: '2026-01-25' });
    for (const f of dc.filter(x => x.quarter < '2026Q3')) {
      expect(f.source.status, f.quarter).toBe('primary-filing');
      expect(f.source.url, f.quarter).toMatch(/^https:\/\/www\.sec\.gov\/Archives\/edgar\/data\/1045810\/.*cfocommentary\.htm$/);
    }
  });

  it('keeps both vintages of the recast Q1 FY27 Hyperscale split', () => {
    const hs = facts.filter(f => f.entityId === 'nvidia' && f.segment === 'Data Center - Hyperscale' && f.quarter === '2026Q1')
      .sort((a, b) => a.asKnownAt.localeCompare(b.asKnownAt));
    expect(hs.map(f => [f.asKnownAt, f.value])).toEqual([['2026-05-20', 37_869_000_000], ['2026-08-26', 43_050_000_000]]);
  });

  it('has NVIDIA capex for 2022Q1-2023Q2 known at its original filing (cash-flow statements, before the late XBRL vintages)', () => {
    const capex = facts.filter(f => f.entityId === 'nvidia' && f.metric === 'capex');
    const first = (q: string) => capex.filter(f => f.quarter === q).sort((a, b) => a.asKnownAt.localeCompare(b.asKnownAt))[0];
    for (const q of quarterRange('2022Q1', '2023Q2')) {
      expect(first(q), q).toBeDefined();
      expect(first(q).asKnownAt <= '2023-09-30', `${q} ${first(q).asKnownAt}`).toBe(true);
    }
    const expected: Record<string, [number, string]> = {
      '2022Q1': [361e6, '2022-05-27'], '2022Q2': [433e6, '2022-08-31'], '2022Q3': [530e6, '2022-11-18'],
      '2022Q4': [509e6, '2023-02-24'], '2023Q1': [248e6, '2023-05-26'], '2023Q2': [289e6, '2023-08-28'],
    };
    for (const [q, [value, asKnownAt]] of Object.entries(expected)) {
      expect(first(q), q).toMatchObject({ value, asKnownAt });
      expect(first(q).source.status, q).toBe('primary-filing');
      // Every later vintage of the quarter (the late XBRL facts) agrees, so as-of lookups never flip value.
      for (const f of capex.filter(x => x.quarter === q)) expect(f.value, `${q} ${f.asKnownAt}`).toBe(value);
    }
    // As-of: the manual row answers from its filing date; the later XBRL vintage takes over once filed.
    expect(valueAsOf(facts, 'nvidia', 'capex', '2022Q4', '2023-02-23')).toBeUndefined();
    expect(valueAsOf(facts, 'nvidia', 'capex', '2022Q4', '2023-03-01')).toMatchObject({ value: 509e6, asKnownAt: '2023-02-24' });
    expect(valueAsOf(facts, 'nvidia', 'capex', '2022Q4', '2023-03-01')!.tag).toBeUndefined(); // the manual row
    expect(valueAsOf(facts, 'nvidia', 'capex', '2022Q4', '2024-03-01')).toMatchObject({ value: 509e6, asKnownAt: '2024-02-21',
      tag: 'PaymentsToAcquireProductiveAssets' });
  });

  it('has Anthropic quarterly revenue from the prospectus, known at the first filing that contained it', () => {
    const rev = facts.filter(f => f.entityId === 'anthropic' && f.metric === 'revenue');
    expect(facts.some(f => f.entityId === 'anthropic' && f.metric === 'revenue')).toBe(true);
    expect(rev.map(f => f.quarter).sort()).toEqual(quarterRange('2025Q1', '2026Q3'));
    expect(rev.find(f => f.quarter === '2026Q2')).toMatchObject({ value: 11_555_000_000, asKnownAt: '2026-10-26' });
    expect(rev.find(f => f.quarter === '2026Q3')).toMatchObject({ value: 16_956_000_000, asKnownAt: '2026-11-02' });
    expect(rev.every(f => f.source.status === 'primary-filing' && /sec\.gov/.test(f.source.url))).toBe(true);
  });

  it('extracts diluted share counts and remaining performance obligations from XBRL', () => {
    expect(facts.filter(f => f.metric === 'dilutedShares' && f.entityId === 'nvidia').length).toBeGreaterThan(0);
    const nv = facts.find(f => f.metric === 'dilutedShares' && f.entityId === 'nvidia' && f.quarter === '2026Q2');
    expect(nv).toMatchObject({ value: 24_285_000_000, tag: 'WeightedAverageNumberOfDilutedSharesOutstanding', derived: false });
    const rpo = facts.find(f => f.metric === 'remainingPerformanceObligations' && f.entityId === 'oracle' && f.quarter === '2026Q3');
    expect(rpo).toMatchObject({ value: 664_000_000_000, asKnownAt: '2026-09-11', periodEnd: '2026-08-31' });
  });
});
