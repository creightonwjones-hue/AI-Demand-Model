import { describe, expect, it } from 'vitest'
import { aspAt } from '../../src/engine/supply-path'
import { asOfView, type BuildData } from '../../src/engine/asof'
import { loadBuild } from '../../src/engine/node-io'
import { initState } from '../../src/engine/init'
import { makeGrid } from '../../src/engine/grid'
import { netFinancialAssets } from '../../src/engine/ledger'
import { param } from '../../src/engine/params'
import { loadParams } from '../../src/engine/node-io'
import type { Deal, Entity, FinancialFact, Metric } from '../../src/data/schema'
import { addQuarters } from '../../src/data/quarters'

const build = loadBuild()
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

describe('initState (brief)', () => {
  it('opens from as-of facts, enters companies when their data exists, and normalises lab shares', () => {
    const v = asOfView(build, '2026-11-26')
    const s = initState(v, loadParams(), makeGrid(), '2026Q4')
    // NVIDIA's Q3 FY27 10-Q (2026Q3 balance sheet) was not filed by 2026-11-26: its latest known cash is 2026Q2.
    expect(v.fact('nvidia', 'cash', '2026Q3')).toBeUndefined()
    expect(s.ledger.sheets.nvidia.cash).toBeCloseTo(v.fact('nvidia', 'cash', '2026Q2')!.value, -6)
    expect(s.ledger.sheets.microsoft.cash).toBeCloseTo(v.fact('microsoft', 'cash', '2026Q3')!.value, -6)
    expect(s.active.coreweave).toBe(true)
    const s23 = initState(asOfView(build, '2023-03-31'), loadParams(), makeGrid(), '2023Q1')
    expect(s23.active.coreweave).toBe(false) // no CoreWeave facts were public in early 2023
    expect(Object.values(s.market.labShares).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6)
    expect(s.obligations.every(o => o.quarter >= '2026Q4')).toBe(true)
  })
})

describe('initState (real data at 2026Q4, asOf 2026-11-26)', () => {
  const params = loadParams()
  const grid = makeGrid()
  const v = asOfView(build, '2026-11-26')
  const s = initState(v, params, grid, '2026Q4')
  const debtTotal = (id: string) => sum(s.ledger.sheets[id].debt.map(d => d.principal))

  it('sets the clock, nobody defaulted, every entity has a sheet', () => {
    expect(s.q).toBe(grid.idx('2026Q4'))
    expect(s.grid).toBe(grid)
    expect(Object.keys(s.ledger.sheets).sort()).toEqual(build.entities.map(e => e.id).sort())
    expect(Object.values(s.defaulted).every(d => d === false)).toBe(true)
    expect(s.pipeline).toEqual([])
    expect(s.market.backlogUnits).toBe(0)
  })

  it('aggregates and non-filers start active with zero balances, flagged as modelled', () => {
    for (const id of ['sk-hynix', 'banks', 'bond-market', 'ai-customers-consumer', 'sovereign-international', 'china-market',
      'ai-startups', 'private-credit-other', 'openai']) {
      expect(s.active[id], id).toBe(true)
      expect(s.modelled[id], id).toBe(true)
      expect(s.ledger.sheets[id].cash, id).toBe(0)
    }
    for (const id of ['microsoft', 'oracle', 'coreweave', 'nvidia']) expect(s.modelled[id], id).toBe(false)
  })

  it("reported debt equals the sum of the borrower's instruments, with a residual bond-market instrument", () => {
    const oracleDebt = v.fact('oracle', 'longTermDebt', '2026Q3')!.value
    expect(debtTotal('oracle')).toBeCloseTo(oracleDebt, -3)
    const bonds = s.ledger.sheets.oracle.debt.find(d => d.dealId === 'oracle-bonds-2026')!
    expect(bonds).toMatchObject({ id: 'oracle-bonds-2026:bond-market', lenderId: 'bond-market', principal: 25e9, recourse: 'recourse' })
    const residual = s.ledger.sheets.oracle.debt.find(d => d.dealId === undefined)!
    expect(residual).toMatchObject({ lenderId: 'bond-market' })
    expect(residual.principal).toBeCloseTo(oracleDebt - 25e9, -3)
    // CoreWeave's latest known debt fact is 2026Q1 (within the staleness window); its DDTLs are ceilings, not deals
    expect(debtTotal('coreweave')).toBeCloseTo(v.fact('coreweave', 'longTermDebt', '2026Q1')!.value, -3)
    expect(debtTotal('microsoft')).toBeCloseTo(v.fact('microsoft', 'longTermDebt', '2026Q3')!.value, -3)
  })

  it('turns loans drawn before the start into instruments with the same debt id as their later obligations', () => {
    const bridge = s.ledger.sheets.softbank.debt.filter(d => d.dealId === 'softbank-bridge-loan-2026')
    expect(bridge.map(d => d.lenderId).sort()).toEqual(['goldman-sachs', 'jpmorgan', 'mufg'])
    expect(sum(bridge.map(d => d.principal))).toBeCloseTo(40e9, 0)
    expect(s.ledger.sheets.jpmorgan.loansReceivable).toContainEqual({ debtId: 'softbank-bridge-loan-2026:jpmorgan', borrowerId: 'softbank',
      principal: 40e9 / 3 })
    // a maturity beyond the grid (2049) still opens as debt
    const hyperion = s.ledger.sheets['spv-hyperion-beignet'].debt
    expect(hyperion.map(d => d.id).sort()).toEqual(['hyperion-beignet-bonds:bond-market', 'hyperion-beignet-bonds:pimco'])
    expect(hyperion[0].maturity).toBe('2049Q2')
    expect(hyperion[0].ratePerQuarter).toBeCloseTo(0.06581 / 4, 12)
    // every later loan obligation of a deal drawn before S refers to an opening instrument
    const ids = new Set(Object.values(s.ledger.sheets).flatMap(sh => sh.debt.map(d => d.id)))
    const loanObs = s.obligations.filter(o => o.kind === 'interest' || o.kind === 'principal')
    expect(loanObs.length).toBeGreaterThan(0)
    const drawnLater = new Set(s.obligations.filter(o => o.kind === 'loan-draw').map(o => o.debtId))
    for (const o of loanObs) if (!drawnLater.has(o.debtId)) expect(ids.has(o.debtId!), o.debtId).toBe(true)
    // no loan draws before S are left in the obligations
    expect(s.obligations.some(o => o.kind === 'loan-draw' && o.quarter < '2026Q4')).toBe(false)
  })

  it('opens a balanced ledger: debt equals loan assets, so net financial assets are the cash held', () => {
    const sheets = Object.values(s.ledger.sheets)
    const debt = sum(sheets.flatMap(sh => sh.debt.map(d => d.principal)))
    const assets = sum(sheets.flatMap(sh => sh.loansReceivable.map(a => a.principal)))
    expect(debt).toBeGreaterThan(0)
    expect(Math.abs(debt - assets)).toBeLessThanOrEqual(1)
    expect(netFinancialAssets(s.ledger)).toBeCloseTo(sum(sheets.map(sh => sh.cash)), -1)
    for (const [id, sh] of Object.entries(s.ledger.sheets)) {
      for (const d of sh.debt) {
        const a = s.ledger.sheets[d.lenderId].loansReceivable.find(x => x.debtId === d.id && x.borrowerId === id)
        expect(a?.principal, d.id).toBe(d.principal)
      }
    }
  })

  it('estimates the installed GPU base from NVIDIA Data Center revenue over the economic life, as modelled vintages', () => {
    const life = param(params, 'gpuEconomicLifeQuarters')
    const asp = param(params, 'nvidiaAspUsd')
    let revenue = 0
    for (let k = 1; k <= life; k++) revenue += v.fact('nvidia', 'segmentRevenue', addQuarters('2026Q4', -k), 'Data Center')?.value ?? 0
    expect(revenue).toBeGreaterThan(0)
    const g = s.market.installedGpus
    expect(g.length).toBeGreaterThan(0)
    expect(g.every(x => x.modelled === true && x.quarter < '2026Q4' && x.quarter >= addQuarters('2026Q4', -life))).toBe(true)
    expect(sum(g.map(x => x.costUsd))).toBeCloseTo(revenue, -3)
    expect(sum(g.map(x => x.units))).toBeCloseTo(sum(g.map(x => x.costUsd / aspAt(params, x.quarter))), 3)
    expect(asp).toBeGreaterThan(0)
    expect(s.notes.some(n => /installed GPU base/i.test(n))).toBe(true)
  })

  it('splits lab shares by revenue among labs with data (Anthropic facts, OpenAI company-stated series)', () => {
    const anthropic = v.fact('anthropic', 'revenue', '2026Q3')!.value
    const openai = 3 * v.series('openai-revenue-monthly-company').at(-1)!.value
    expect(s.market.labShares.anthropic).toBeCloseTo(anthropic / (anthropic + openai), 6)
    expect(s.market.labShares.openai).toBeCloseTo(openai / (anthropic + openai), 6)
    expect(s.market.labShareBasis).toMatchObject({ anthropic: 'revenue', openai: 'revenue', 'ai-startups': 'no-data', mistral: 'no-data' })
    expect(s.market.labShares['ai-startups']).toBe(0)
  })

  it('starts expectations at the long-run AI spend growth for every cloud', () => {
    const clouds = build.entities.filter(e => e.layer === 'cloud').map(e => e.id)
    expect(Object.keys(s.expectations).sort()).toEqual(clouds.sort())
    expect(Object.values(s.expectations).every(x => x === param(params, 'aiSpendLongRunQuarterlyGrowth'))).toBe(true)
  })
})

describe('initState (early start, asOf 2023-03-31)', () => {
  const s = initState(asOfView(build, '2023-03-31'), loadParams(), makeGrid(), '2023Q1')
  it('uses no later deal or fact', () => {
    expect(Object.values(s.ledger.sheets).every(sh => sh.debt.every(d => d.dealId === undefined))).toBe(true)
    expect(s.obligations).toEqual([])
    expect(s.ledger.sheets.coreweave.cash).toBe(0)
    expect(s.ledger.sheets.anthropic.cash).toBe(0)
  })
  it('gives labs equal shares, flagged, when no lab revenue was public', () => {
    const labs = build.entities.filter(e => e.layer === 'labs').map(e => e.id)
    for (const id of labs) {
      expect(s.market.labShares[id], id).toBeCloseTo(1 / labs.length, 10)
      expect(s.market.labShareBasis[id], id).toBe('equal')
    }
    expect(s.notes.some(n => /equal shares/i.test(n))).toBe(true)
  })
})

// ---- synthetic fixtures for the edge rules ----
const ent = (id: string, o: Partial<Entity> = {}): Entity =>
  ({ id, name: id, layer: 'cloud', kind: 'public-company', xbrl: true, currency: 'USD', ...o })
const src = { url: 'https://example.com', retrieved: '2026-01-01', status: 'primary-filing' as const }
const fact = (entityId: string, metric: Metric, quarter: string, value: number, asKnownAt: string): FinancialFact =>
  ({ entityId, metric, quarter, periodStart: '2026-01-01', periodEnd: '2026-03-31', weeks: 13, value, derived: false, asKnownAt, source: src })
function loan(id: string, o: Partial<Deal>): Deal {
  return { id, name: id, payers: ['lender'], payees: ['borrower'], guarantors: [], types: ['loan'], announced: '2025-01-15',
    values: { hardMinimumUsd: 5e9 }, terms: { recourse: 'recourse', takeOrPay: 'unknown', hellOrHighWater: 'unknown' }, sources: [],
    statusHistory: [{ date: '2025-01-15', asKnownAt: '2025-01-15', status: 'active' }], ...o }
}
function fixture(extra: Partial<BuildData> = {}): BuildData {
  return {
    entities: [ent('borrower'), ent('lender', { layer: 'money', kind: 'lender', xbrl: false }), ent('bond-market', { layer: 'money', kind: 'aggregate', xbrl: false }),
      ent('lab-a', { layer: 'labs', kind: 'private-company', xbrl: false }), ent('lab-b', { layer: 'labs', kind: 'private-company', xbrl: false })],
    facts: [fact('borrower', 'cash', '2026Q3', 7e9, '2026-11-01'), fact('borrower', 'longTermDebt', '2026Q3', 3e9, '2026-11-01'),
      fact('lab-a', 'revenue', '2026Q3', 1e9, '2026-11-01')],
    series: [], deals: [], ...extra,
  }
}

describe('initState (edge rules)', () => {
  const params = loadParams()
  const grid = makeGrid()

  it('floors the residual at zero when deal loans exceed reported debt (no negative instrument)', () => {
    const s = initState(asOfView(fixture({ deals: [loan('big', { start: '2025-02-01' })] }), '2026-11-26'), params, grid, '2026Q4')
    expect(s.ledger.sheets.borrower.debt.map(d => [d.id, d.principal])).toEqual([['big:lender', 5e9]])
    expect(s.notes.some(n => /borrower/.test(n) && /exceed/i.test(n))).toBe(true)
  })

  it('a loan cancelled before the start is not opening debt; one maturing before the start is repaid', () => {
    const gone = loan('gone', { start: '2025-02-01', statusHistory: [{ date: '2025-01-15', asKnownAt: '2025-01-15', status: 'active' },
      { date: '2026-03-01', asKnownAt: '2026-03-02', status: 'cancelled' }] })
    const matured = loan('matured', { start: '2025-02-01', end: '2026-06-30' })
    const s = initState(asOfView(fixture({ deals: [gone, matured] }), '2026-11-26'), params, grid, '2026Q4')
    expect(s.ledger.sheets.borrower.debt.map(d => d.id)).toEqual(['reported-debt:borrower'])
    expect(s.ledger.sheets.borrower.debt[0]).toMatchObject({ lenderId: 'bond-market', principal: 3e9, recourse: 'recourse' })
    expect(s.ledger.sheets['bond-market'].loansReceivable).toEqual([{ debtId: 'reported-debt:borrower', borrowerId: 'borrower', principal: 3e9 }])
  })

  it('ignores facts older than the staleness window and marks the entity modelled', () => {
    const stale = fixture({ facts: [fact('borrower', 'cash', '2025Q1', 7e9, '2025-05-01'), fact('borrower', 'revenue', '2025Q1', 1e9, '2025-05-01')] })
    const s = initState(asOfView(stale, '2026-11-26'), params, grid, '2026Q4')
    expect(s.active.borrower).toBe(true)
    expect(s.ledger.sheets.borrower.cash).toBe(0)
    expect(s.modelled.borrower).toBe(true)
  })

  it('a filer with no fact known yet is inactive; a fact not yet public at asOf is not used', () => {
    const s = initState(asOfView(fixture(), '2026-10-15'), params, grid, '2026Q4')
    expect(s.active.borrower).toBe(false)
    expect(s.ledger.sheets.borrower.cash).toBe(0)
    expect(s.ledger.sheets.borrower.debt).toEqual([])
    expect(s.active.lender).toBe(true) // non-filers start active
  })

  it('labs without revenue data get no share when another lab has data, and say so', () => {
    const s = initState(asOfView(fixture(), '2026-11-26'), params, grid, '2026Q4')
    expect(s.market.labShares).toEqual({ 'lab-a': 1, 'lab-b': 0 })
    expect(s.market.labShareBasis).toEqual({ 'lab-a': 'revenue', 'lab-b': 'no-data' })
  })

  it('rejects a start outside the grid', () => {
    expect(() => initState(asOfView(fixture(), '2026-11-26'), params, grid, '2031Q1')).toThrow(/outside the grid/)
  })
})

describe('nvidiaLinked', () => {
  it('lists customers NVIDIA invested in or guarantees, from deals known at asOf', () => {
    const s = initState(asOfView(loadBuild(), '2026-11-26'), loadParams(), makeGrid(), '2026Q4')
    expect(s.nvidiaLinked).toEqual(expect.arrayContaining(['openai', 'coreweave', 'anthropic']))
    const s24 = initState(asOfView(loadBuild(), '2024-06-30'), loadParams(), makeGrid(), '2024Q3')
    expect(s24.nvidiaLinked).not.toContain('openai')
  })
})
