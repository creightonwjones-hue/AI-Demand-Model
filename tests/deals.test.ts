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
    // Lease length settled by the NVIDIA 8-K / 10-Q (Task 7): 20-year leases; the 10-year report is superseded.
    expect(ohio.terms.maturity).toMatch(/20-year leases/);
    expect(ohio.terms.notes).toMatch(/10 years \(Axios\) report is contradicted/);
    expect(ohio.sources.some(s => s.status === 'primary-filing' && /nvda-20260817/.test(s.url))).toBe(true);
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

  it('splits multi-tranche deals so no value is dated before it was public', () => {
    expect(deals.some(d => d.id === 'openai-coreweave' || d.id === 'anthropic-google-tpu')).toBe(false);
    expect(byId('openai-coreweave-2025-03')).toMatchObject({ announced: '2025-03-31', values: { hardMinimumUsd: 11.9e9 } });
    expect(byId('openai-coreweave-2025-05')).toMatchObject({ announced: '2025-05-31', values: { hardMinimumUsd: 4e9 } });
    expect(byId('openai-coreweave-2025-09')).toMatchObject({ announced: '2025-09-25', values: { ceilingUsd: 6.5e9 } });
    expect(byId('anthropic-google-tpu-2025')).toMatchObject({ announced: '2025-10-31', values: {} });
    expect(byId('anthropic-google-tpu-2026')).toMatchObject({ announced: '2026-04-06', values: {} });
    // The $121.3B prospectus minimum is dated when it was first public (S-1/A No. 1, Task 7).
    expect(byId('anthropic-google-csp-hosting-2026'))
      .toMatchObject({ announced: '2026-11-02', values: { hardMinimumUsd: 121.3e9 } });
  });

  it('dates month-only, year-only and range-only items at the latest day they allow (no look-ahead)', () => {
    const expected: Record<string, string> = {
      'nvidia-spacex-xai-equity': '2026-08-31', 'nvidia-mistral-equity': '2026-08-31',
      'vantage-oracle-tx-wi-loans': '2026-04-30', 'new-mexico-oracle-project-loan': '2026-04-30',
      'amazon-anthropic-equity-2023-24': '2024-12-31', 'openai-aws-compute-2025': '2025-11-30',
      'coreweave-ddtl-1': '2023-07-31', 'microsoft-coreweave': '2024-12-31',
      'xai-colossus2-spv-equity': '2025-10-31', 'xai-colossus2-spv-debt': '2025-10-31',
      'nvidia-xai-colossus2-spv-equity': '2025-10-31', 'xai-colossus2-gpu-lease': '2025-10-31',
      'anthropic-spacex-colossus': '2026-05-31', 'nvidia-openai-equity-2026': '2026-03-31',
      'oracle-bonds-2026': '2026-02-02', 'oracle-equity-2026': '2026-02-02',
    };
    for (const [id, date] of Object.entries(expected)) {
      expect(byId(id).announced, id).toBe(date);
      expect(byId(id).statusHistory[0].date, id).toBe(date);
    }
    // No point-in-time date (announced, signed, statusHistory) is a 1st-of-month placeholder, unless the record's
    // note says the date is exact (a filing pins it, e.g. Synopsys 2025-12-01).
    for (const d of deals) {
      if (/date is exact/i.test(d.terms.notes ?? '')) continue;
      for (const date of [d.announced, d.signed, ...d.statusHistory.map(h => h.date)])
        if (date) expect(date, d.id).not.toMatch(/-01$/);
    }
  });

  it('uses exact dates where a filing pins them (Task 7), replacing range placeholders', () => {
    const exact: Record<string, string> = {
      'nvidia-intel-equity': '2025-09-18', 'nvidia-nokia-equity': '2025-10-28', 'nvidia-synopsys-equity': '2025-12-01',
      'nvidia-lumentum-equity': '2026-03-02', 'nvidia-coherent-equity': '2026-03-02',
      'nvidia-nebius-equity': '2026-03-11', 'nvidia-coreweave-equity-2026': '2026-01-26',
      'coreweave-ddtl-5-5': '2026-08-10', 'nvidia-groq-payment': '2026-08-26',
    };
    for (const [id, date] of Object.entries(exact)) {
      expect(byId(id).announced, id).toBe(date);
      expect(byId(id).statusHistory[0].date, id).toBe(date);
      expect(byId(id).sources.some(s => s.status === 'primary-filing'), id).toBe(true);
    }
    expect(byId('nvidia-synopsys-equity').terms.notes).toMatch(/date is exact/i);
  });

  it('confirms the NVIDIA Anthropic equity amount from a filing and keeps Microsoft\'s unverified', () => {
    const nvda = byId('nvidia-anthropic-equity');
    expect(nvda.values.ceilingUsd).toBe(10e9);
    expect(nvda.sources.some(s => s.status === 'primary-filing' && /sec\.gov/.test(s.url))).toBe(true);
    expect(nvda.sources.some(s => s.status === 'unverified')).toBe(false);
    expect(byId('microsoft-anthropic-equity').sources.every(s => s.status === 'unverified')).toBe(true);
  });

  it('keeps every source dated and labelled, and primary-filing only for SEC URLs', () => {
    for (const d of deals) for (const s of d.sources) {
      // 2026-11-25: Chrome capture; 2026-11-26: SEC filings read in Task 7.
      expect(['2026-11-25', '2026-11-26']).toContain(s.retrieved);
      if (s.status === 'primary-filing') expect(s.url).toMatch(/^https:\/\/www\.sec\.gov\//);
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
