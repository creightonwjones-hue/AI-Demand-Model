import { describe, it, expect } from 'vitest';
import { normalizeBuildFile, staleBuildFiles } from '../scripts/data/check-build-fresh';

const manifest = (builtAt: string, facts = 10) => JSON.stringify({ builtAt, counts: { facts } });
const files = (entries: Record<string, string>) => new Map(Object.entries(entries));

describe('check-build-fresh', () => {
  it('ignores manifest builtAt and JSON formatting', () => {
    const committed = files({ 'manifest.json': manifest('2026-11-26T10:00:00Z'), 'a.json': '[1,2]\n' });
    const rebuilt = files({ 'manifest.json': manifest('2026-11-27T09:00:00Z'), 'a.json': '[1, 2]' });
    expect(staleBuildFiles(committed, rebuilt)).toEqual([]);
  });

  it('flags changed content, including other manifest fields', () => {
    const committed = files({ 'manifest.json': manifest('t1', 10), 'a.json': '[1,2]' });
    const rebuilt = files({ 'manifest.json': manifest('t2', 11), 'a.json': '[1,3]' });
    expect(staleBuildFiles(committed, rebuilt)).toEqual(['a.json', 'manifest.json']);
  });

  it('flags files present on only one side', () => {
    expect(staleBuildFiles(files({ 'a.json': '1' }), files({ 'b.json': '1' }))).toEqual(['a.json', 'b.json']);
  });

  it('keeps builtAt in files other than manifest.json', () => {
    expect(normalizeBuildFile('other.json', '{"builtAt":"x"}')).toEqual({ builtAt: 'x' });
    expect(normalizeBuildFile('manifest.json', '{"builtAt":"x","n":1}')).toEqual({ n: 1 });
  });
});
