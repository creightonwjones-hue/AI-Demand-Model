import { describe, it, expect } from 'vitest';
import { loadDeals, sumValues, dealsTouching } from '../src/data/deals';
import { loadEntities, type Deal } from '../src/data/schema';

const dealWith = (values: Deal['values'], over: Partial<Deal> = {}): Deal => ({
  id: 'x',
  name: 'X',
  payers: ['openai'],
  payees: ['oracle'],
  guarantors: [],
  types: ['compute-lease'],
  announced: '2026-01-01',
  values,
  terms: { recourse: 'unknown', takeOrPay: 'unknown', hellOrHighWater: 'unknown' },
  statusHistory: [{ date: '2026-01-01', status: 'announced' }],
  sources: [{ url: 'https://example.com', retrieved: '2026-11-25', status: 'secondary' }],
  ...over,
});

describe('loadDeals', () => {
  const deals = loadDeals();
  const byId = (id: string) => {
    const d = deals.find(x => x.id === id);
    if (!d) throw new Error(`missing deal ${id}`);
    return d;
  };

  it('loads at least one record per capture row, each with a source', () => {
    expect(deals.length).toBeGreaterThanOrEqual(35);
    expect(deals.every(d => d.sources.length >= 1)).toBe(true);
    expect(deals.every(d => d.statusHistory.length >= 1)).toBe(true);
  });

  it('records the NVIDIA Ohio backstop as a capped guarantee', () => {
    const ohio = byId('nvidia-openai-ohio-backstop');
    expect(ohio).toMatchObject({ guarantors: ['nvidia'], types: ['capacity-guarantee', 'equity'] });
    expect(ohio.values.ceilingUsd).toBe(105_000_000_000);
    expect(ohio.terms.notes).toMatch(/20 years/);
    expect(ohio.terms.notes).toMatch(/10 years/);
  });

  it('splits CoreWeave DDTL facilities with their own terms', () => {
    const ddtl4 = byId('coreweave-ddtl-4');
    expect(ddtl4.terms.recourse).toBe('non-recourse');
    expect(ddtl4.values.hardMinimumUsd).toBe(8_500_000_000);
    expect(byId('coreweave-ddtl-1').terms.recourse).toBe('recourse');
    expect(byId('coreweave-ddtl-5').values.hardMinimumUsd).toBe(3_100_000_000);
    expect(byId('coreweave-ddtl-5-5').values.hardMinimumUsd).toBe(2_600_000_000);
  });

  it('maps value types: conditional, ceiling, estimate and hard minimum stay separate', () => {
    expect(byId('amazon-openai-equity-2026').values).toEqual({ hardMinimumUsd: 15e9, conditionalUsd: 35e9 });
    expect(byId('meta-nebius-2026').values).toEqual({ hardMinimumUsd: 12e9, conditionalUsd: 15e9, ceilingUsd: 27e9 });
    expect(byId('microsoft-nebius-vineland').values).toEqual({ hardMinimumUsd: 17.4e9, ceilingUsd: 19.4e9 });
    expect(byId('openai-cerebras').values).toEqual({ estimateUsd: 10e9 });
    expect(byId('microsoft-coreweave').values).toEqual({ estimateUsd: 10e9 });
    // A monthly rate with no total in the capture stays out of the value fields.
    expect(byId('anthropic-spacex-colossus').values).toEqual({});
    expect(byId('anthropic-spacex-colossus').terms.notes).toMatch(/\$1\.25B per month/);
  });

  it('splits bundled rows into separate instruments', () => {
    for (const id of ['softbank-openai-equity-2026', 'softbank-bridge-loan-2026', 'softbank-openai-margin-loan',
      'nvidia-intel-equity', 'nvidia-openai-equity-2026', 'nvidia-groq-payment'])
      expect(deals.some(d => d.id === id)).toBe(true);
  });

  it('keeps every source dated and labelled, and primary-filing only for SEC URLs', () => {
    for (const d of deals) for (const s of d.sources) {
      expect(s.retrieved).toBe('2026-11-25');
      if (s.status === 'primary-filing') expect(s.url).toMatch(/sec\.gov/);
    }
  });

  it('throws naming the unknown entity', () => {
    expect(() => loadDeals('tests/fixtures/deal-unknown-party.json')).toThrow(/unknown entity.*not-a-company/i);
    expect(() => loadDeals('tests/fixtures/deal-unknown-vehicle.json'))
      .toThrow(/fixture-unknown-vehicle.*unknown entity.*no-such-spv/i);
  });

  it('throws on duplicate ids and on schema errors, naming the deal', () => {
    expect(() => loadDeals('tests/fixtures/deal-duplicate-id.json')).toThrow(/duplicate deal id.*fixture-dup/i);
    expect(() => loadDeals('tests/fixtures/deal-bad-schema.json')).toThrow(/fixture-bad-schema/);
  });

  it('accepts an explicit entity list', () => {
    const entities = loadEntities().filter(e => e.id !== 'openai');
    expect(() => loadDeals('tests/fixtures/deal-duplicate-id.json', entities)).toThrow(/unknown entity.*openai/i);
  });
});

describe('sumValues', () => {
  it('sums exactly one field and skips deals without it', () => {
    expect(sumValues([dealWith({ hardMinimumUsd: 10, ceilingUsd: 30 })], 'hardMinimumUsd')).toBe(10);
    expect(sumValues([dealWith({ hardMinimumUsd: 10 }), dealWith({ ceilingUsd: 30 }), dealWith({ hardMinimumUsd: 5 })],
      'hardMinimumUsd')).toBe(15);
    expect(sumValues([dealWith({ ceilingUsd: 30 })], 'estimateUsd')).toBe(0);
  });
});

describe('dealsTouching', () => {
  it('finds deals where the entity is payer, payee, guarantor or vehicle', () => {
    const deals = [
      dealWith({}, { id: 'a', payers: ['nvidia'], payees: ['openai'] }),
      dealWith({}, { id: 'b', payers: ['openai'], payees: ['sb-energy'], guarantors: ['nvidia'] }),
      dealWith({}, { id: 'c', payers: ['spacex'], payees: ['spv-saturn-funding-trust'], vehicle: 'spv-saturn-funding-trust' }),
      dealWith({}, { id: 'd', payers: ['meta'], payees: ['nebius'] }),
    ];
    expect(dealsTouching(deals, 'nvidia').map(d => d.id)).toEqual(['a', 'b']);
    expect(dealsTouching(deals, 'spv-saturn-funding-trust').map(d => d.id)).toEqual(['c']);
    expect(dealsTouching(deals, 'amd')).toEqual([]);
  });
  it('finds the NVIDIA exposure deals in the real database', () => {
    const ids = dealsTouching(loadDeals(), 'nvidia').map(d => d.id);
    for (const id of ['nvidia-openai-ohio-backstop', 'nvidia-coreweave-capacity-backstop', 'nvidia-openai-loi-10gw'])
      expect(ids).toContain(id);
  });
});
