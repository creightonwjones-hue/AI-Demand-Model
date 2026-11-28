import { describe, it, expect } from 'vitest';
import { loadEntities } from '../src/data/load-entities';

describe('entity registry', () => {
  it('loads a valid registry', () => {
    const e = loadEntities();
    expect(new Set(e.map(x => x.id)).size).toBe(e.length);
    expect(e.find(x => x.id === 'nvidia')).toMatchObject({ layer: 'chips', ticker: 'NVDA', cik: '0001045810', xbrl: true });
    expect(e.find(x => x.id === 'tsmc')).toMatchObject({ xbrl: false, currency: 'TWD' });
    expect(e.filter(x => x.group === 'debt-funded').map(x => x.id).sort())
      .toEqual(['coreweave', 'lambda', 'nebius', 'oracle']);
    expect(e.filter(x => x.xbrl).map(x => x.id).sort()).toEqual(
      ['amazon', 'amd', 'alphabet', 'broadcom', 'coreweave', 'intel', 'marvell', 'meta', 'micron', 'microsoft', 'nvidia', 'oracle'].sort());
  });
  it('throws on duplicate ids', () => {
    expect(() => loadEntities('tests/fixtures/entities-duplicate.json')).toThrow(/duplicate/i);
  });
});
