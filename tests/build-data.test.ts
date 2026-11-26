import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import type { FinancialFact } from '../src/data/schema';

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
