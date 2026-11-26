import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadDeals } from '../src/data/deals';
import { parseCsv } from '../src/data/csv';
import { loadManualSeries } from '../src/data/series';

const LOG = 'data/verification/2026-11-verification.md';
const readFile = (path: string) => readFileSync(path, 'utf8');

// Record ids are written in the log as `id:<record-id>`.
function extractRecordIds(log: string): string[] {
  return [...log.matchAll(/`id:([^`\s]+)`/g)].map(m => m[1]);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Deal ids, manual series ids, and manual financial rows as <entity>.<metric>.<period_end>[.<segment-slug>].
function allRecordIds(): string[] {
  const deals = loadDeals().map(d => d.id);
  const series = loadManualSeries(readFile('data/manual/series.csv')).map(s => s.id);
  const financials = parseCsv(readFile('data/manual/financials.csv'))
    .map(r => [r.entity_id, r.metric, r.period_end, ...(r.segment ? [slug(r.segment)] : [])].join('.'));
  return [...deals, ...series, ...financials];
}

describe('2026-11 verification log', () => {
  const log = readFile(LOG);

  it('has one section per flagged item, each with claim, where checked, result and records', () => {
    const sections = log.split(/^## /m).slice(1).filter(s => /^Item \d+/.test(s));
    expect(sections.length).toBeGreaterThanOrEqual(10);
    for (const s of sections) {
      const title = s.split('\n')[0];
      expect(s, title).toMatch(/\*\*Claim\*\*/);
      expect(s, title).toMatch(/\*\*Where checked\*\*/);
      expect(s, title).toMatch(/\*\*Result\*\*: (confirmed|corrected|not found|not checked — time)/);
      expect(s, title).toMatch(/\*\*Records updated\*\*/);
    }
  });

  it('references only records that exist', () => {
    const ids = extractRecordIds(log);
    expect(ids.length).toBeGreaterThan(0);
    const known = new Set(allRecordIds());
    for (const id of ids) expect(known.has(id), id).toBe(true);
  });

  it('labels primary-filing only where an SEC URL backs it', () => {
    const deals = loadDeals();
    for (const d of deals.filter(d => d.sources.some(s => s.status === 'primary-filing')))
      expect(d.sources.some(s => s.status === 'primary-filing' && /^https:\/\/www\.sec\.gov\//.test(s.url)), d.id)
        .toBe(true);
    for (const s of loadManualSeries(readFile('data/manual/series.csv')))
      for (const p of s.points)
        if (p.source?.status === 'primary-filing') expect(p.source.url, s.id).toMatch(/^https:\/\/www\.sec\.gov\//);
    for (const r of parseCsv(readFile('data/manual/financials.csv')))
      if (r.status === 'primary-filing') expect(r.source_url).toMatch(/^https:\/\/www\.sec\.gov\//);
  });

  it('enters NVIDIA\'s 10-Q guarantee exposure as primary-filing series points', () => {
    const series = loadManualSeries(readFile('data/manual/series.csv'));
    const point = (id: string) => series.find(s => s.id === id)?.points.find(p => p.date === '2026-07-26');
    const expected: Record<string, number> = {
      'nvidia-guarantees-total-10q': 108.5e9, 'nvidia-guarantees-sbenergy-10q': 105e9,
      'nvidia-guarantees-aicloud-lps-10q': 3.5e9,
    };
    for (const [id, value] of Object.entries(expected)) {
      const p = point(id);
      expect(p, id).toMatchObject({ value, asKnownAt: '2026-08-26' });
      expect(p!.source).toMatchObject({ status: 'primary-filing' });
      expect(p!.source!.url).toMatch(/^https:\/\/www\.sec\.gov\/.*nvda-20260726\.htm$/);
    }
    expect(expected['nvidia-guarantees-sbenergy-10q'] + expected['nvidia-guarantees-aicloud-lps-10q'])
      .toBe(expected['nvidia-guarantees-total-10q']);
  });
});
