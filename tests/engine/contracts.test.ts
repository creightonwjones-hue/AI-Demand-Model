import { describe, expect, it } from 'vitest'
import { asOfView, type DealView } from '../../src/engine/asof'
import { loadBuild } from '../../src/engine/node-io'
import { loanPositions as loanPositionsP, parseFixedAnnualRate, parseTermQuarters, scheduleObligations as scheduleP, type Obligation } from '../../src/engine/contracts'
import type { EngineParams, Grid } from '../../src/engine/types'
import { makeGrid } from '../../src/engine/grid'
import { param } from '../../src/engine/params'
import { loadParams } from '../../src/engine/node-io'
import type { Deal, DealStatus } from '../../src/data/schema'

type Over = Partial<Deal['values']> & Partial<Pick<Deal, 'start' | 'end' | 'announced' | 'payers' | 'payees' | 'types'>>
  & { maturity?: string; rate?: string; collateral?: string; recourse?: Deal['terms']['recourse'] }

function deal(types: Deal['types'], o: Over = {}): DealView {
  const { hardMinimumUsd, ceilingUsd, conditionalUsd, estimateUsd, maturity, rate, collateral, recourse, ...rest } = o
  const values: Deal['values'] = {}
  if (hardMinimumUsd !== undefined) values.hardMinimumUsd = hardMinimumUsd
  if (ceilingUsd !== undefined) values.ceilingUsd = ceilingUsd
  if (conditionalUsd !== undefined) values.conditionalUsd = conditionalUsd
  if (estimateUsd !== undefined) values.estimateUsd = estimateUsd
  const terms: Deal['terms'] = { recourse: recourse ?? 'unknown', takeOrPay: 'unknown', hellOrHighWater: 'unknown' }
  if (collateral !== undefined) terms.collateral = collateral
  if (maturity !== undefined) terms.maturity = maturity
  if (rate !== undefined) terms.rate = rate
  return {
    id: 'test-deal', name: 'Test deal', payers: ['lab'], payees: ['cloud'], guarantors: [], types,
    announced: '2026-12-15', values, terms, sources: [],
    statusHistory: [{ date: '2026-12-15', asKnownAt: '2026-12-15', status: 'announced' }], statusAsOf: 'announced',
    ...rest,
  }
}
const leaseDeal = (o: Over) => deal(['compute-lease'], o)
function withStatus(status: DealStatus, date: string, d: DealView): DealView {
  return { ...d, statusAsOf: status, statusHistory: [...d.statusHistory, { date, asKnownAt: date, status }] }
}
const cancelled = (date: string, d: DealView) => withStatus('cancelled', date, d)
const total = (obs: Obligation[]) => obs.reduce((s, o) => s + o.amountUsd, 0)

describe('scheduleObligations (brief)', () => {
  it('spreads only the hard minimum straight-line and stops after a cancellation', () => {
    const obs = scheduleObligations([leaseDeal({ hardMinimumUsd: 8e9, start: '2027-01-01', end: '2028-12-31', ceilingUsd: 20e9 })], makeGrid())
    expect(obs.length).toBe(8)
    expect(obs.reduce((s, o) => s + o.amountUsd, 0)).toBeCloseTo(8e9, 0) // ceiling never scheduled
    expect(obs[0]).toMatchObject({ quarter: '2027Q1', kind: 'compute-rent', label: 'Rents compute' })
    expect(scheduleObligations([cancelled('2027-06-30', leaseDeal({ hardMinimumUsd: 8e9, start: '2027-01-01', end: '2028-12-31' }))], makeGrid())
      .every(o => o.quarter <= '2027Q2')).toBe(true)
  })
})

describe('scheduleObligations (detail)', () => {
  const grid = makeGrid()
  const params = loadParams()

  it('keeps the cancellation quarter and the payer/payee/deal on every obligation', () => {
    const obs = scheduleObligations([cancelled('2027-06-30', leaseDeal({ hardMinimumUsd: 8e9, start: '2027-01-01', end: '2028-12-31' }))], grid)
    expect(obs.map(o => o.quarter)).toEqual(['2027Q1', '2027Q2'])
    expect(obs.every(o => o.amountUsd === 1e9 && o.payer === 'lab' && o.payee === 'cloud' && o.dealId === 'test-deal')).toBe(true)
    const replaced = withStatus('replaced', '2027-08-01', leaseDeal({ hardMinimumUsd: 8e9, start: '2027-01-01', end: '2028-12-31' }))
    expect(scheduleObligations([replaced], grid).map(o => o.quarter)).toEqual(['2027Q1', '2027Q2', '2027Q3'])
    const delayed = withStatus('delayed', '2027-08-01', leaseDeal({ hardMinimumUsd: 8e9, start: '2027-01-01', end: '2028-12-31' }))
    expect(scheduleObligations([delayed], grid)).toHaveLength(8)
  })

  it('never schedules ceiling, conditional or estimate values', () => {
    const d = leaseDeal({ ceilingUsd: 9e9, conditionalUsd: 8e9, estimateUsd: 7e9, start: '2027-01-01', end: '2028-12-31' })
    expect(scheduleObligations([d], grid)).toEqual([])
  })

  it('splits equally across multiple payers and payees (n x m pairs)', () => {
    const d = leaseDeal({ hardMinimumUsd: 12e9, start: '2027-01-01', end: '2027-12-31', payers: ['a', 'b'], payees: ['c', 'd', 'e'] })
    const obs = scheduleObligations([d], grid)
    expect(obs).toHaveLength(4 * 6)
    expect(obs.every(o => o.amountUsd === 0.5e9)).toBe(true)
    expect(total(obs)).toBeCloseTo(12e9, 0)
    expect(new Set(obs.filter(o => o.quarter === '2027Q3').map(o => `${o.payer}>${o.payee}`)).size).toBe(6)
    expect(scheduleObligations([leaseDeal({ hardMinimumUsd: 1e9, payees: [] })], grid)).toEqual([])
  })

  it('uses announced when there is no start, and the parsed term or the default when there is no end', () => {
    const noStart = scheduleObligations([leaseDeal({ hardMinimumUsd: 12e9, announced: '2027-05-10', maturity: '3 years' })], grid)
    expect(noStart).toHaveLength(12)
    expect(noStart[0].quarter).toBe('2027Q2')
    expect(noStart.at(-1)!.quarter).toBe('2030Q1')
    const dflt = param(params, 'defaultContractQuarters')
    const noTerm = scheduleObligations([leaseDeal({ hardMinimumUsd: 20e9, start: '2026-01-01' })], grid)
    expect(noTerm).toHaveLength(dflt)
    expect(noTerm[0].amountUsd).toBeCloseTo(20e9 / dflt, 0)
    // terms not yet public at asOf: the maturity is not used even if the record carries one
    const hidden: DealView = { ...leaseDeal({ hardMinimumUsd: 20e9, start: '2026-01-01', maturity: '3 years' }), termsHidden: true }
    expect(scheduleObligations([hidden], grid)).toHaveLength(dflt)
    // the default comes from the params passed in
    const short = { ...params, defaultContractQuarters: { ...params.defaultContractQuarters, value: 4 } }
    expect(scheduleObligations([leaseDeal({ hardMinimumUsd: 4e9, start: '2026-01-01' })], grid, short)).toHaveLength(4)
  })

  it('drops quarters outside the grid without rescaling the per-quarter amount', () => {
    const obs = scheduleObligations([leaseDeal({ hardMinimumUsd: 16e9, start: '2029-01-01', end: '2032-12-31' })], grid)
    expect(obs).toHaveLength(8)
    expect(obs.every(o => o.amountUsd === 1e9)).toBe(true)
    expect(obs.at(-1)!.quarter).toBe('2030Q4')
  })

  it('rejects an end before the start, naming the deal', () => {
    expect(() => scheduleObligations([leaseDeal({ hardMinimumUsd: 1e9, start: '2027-06-01', end: '2027-01-01' })], grid))
      .toThrow(/test-deal/)
  })

  it('schedules chip purchases straight-line and equity once in the start quarter', () => {
    const chips = scheduleObligations([deal(['chip-purchase'], { hardMinimumUsd: 4e9, start: '2027-01-01', end: '2027-12-31' })], grid)
    expect(chips).toHaveLength(4)
    expect(chips.every(o => o.kind === 'chip-purchase' && o.label === 'Buys GPUs' && o.amountUsd === 1e9)).toBe(true)
    const eq = scheduleObligations([deal(['equity'], { hardMinimumUsd: 5e9, announced: '2026-04-20', payers: ['inv'], payees: ['lab'] })], grid)
    expect(eq).toEqual([{ dealId: 'test-deal', payer: 'inv', payee: 'lab', quarter: '2026Q2', amountUsd: 5e9, kind: 'equity', label: 'Equity' }])
    expect(scheduleObligations([deal(['equity'], { hardMinimumUsd: 5e9, announced: '2026-04-20', start: '2026-08-01' })], grid)[0].quarter)
      .toBe('2026Q3')
  })

  it('schedules a loan as a draw, fixed-rate interest each later quarter, and the principal at maturity', () => {
    const d = deal(['loan'], { hardMinimumUsd: 1e9, start: '2027-01-01', end: '2028-12-31', rate: '8%', payers: ['bank'], payees: ['cloud'],
      recourse: 'recourse' })
    const obs = scheduleObligations([d], grid)
    const draws = obs.filter(o => o.kind === 'loan-draw')
    const interest = obs.filter(o => o.kind === 'interest')
    const principal = obs.filter(o => o.kind === 'principal')
    const loan = { debtId: 'test-deal:bank', ratePerQuarter: 0.02, maturity: '2028Q4', recourse: 'recourse' }
    expect(draws).toEqual([{ dealId: 'test-deal', payer: 'bank', payee: 'cloud', quarter: '2027Q1', amountUsd: 1e9, kind: 'loan-draw',
      label: 'Borrows', ...loan }])
    expect(interest.map(o => o.quarter)).toEqual(['2027Q2', '2027Q3', '2027Q4', '2028Q1', '2028Q2', '2028Q3', '2028Q4'])
    expect(interest.every(o => o.payer === 'cloud' && o.payee === 'bank' && o.label === 'Interest' && o.debtId === loan.debtId)).toBe(true)
    expect(interest[0].amountUsd).toBeCloseTo(1e9 * 0.08 / 4, 0)
    expect(principal).toEqual([{ dealId: 'test-deal', payer: 'cloud', payee: 'bank', quarter: '2028Q4', amountUsd: 1e9, kind: 'principal',
      label: 'Repays loan', ...loan }])
  })

  it('labels a draw "GPU-backed loan" only when the visible collateral mentions GPUs', () => {
    const draw = (o: Over, hidden = false) => {
      const d = deal(['loan'], { hardMinimumUsd: 1e9, start: '2027-01-01', end: '2027-12-31', ...o })
      return scheduleObligations([hidden ? { ...d, termsHidden: true } : d], grid).find(x => x.kind === 'loan-draw')!.label
    }
    expect(draw({ collateral: 'GPUs (secured)' })).toBe('GPU-backed loan')
    expect(draw({ collateral: 'Vera Rubin gpu equipment' })).toBe('GPU-backed loan')
    expect(draw({ collateral: 'None (unsecured)' })).toBe('Borrows')
    expect(draw({})).toBe('Borrows')
    expect(draw({ collateral: 'GPUs' }, true)).toBe('Borrows') // terms not public at asOf
  })

  it('gives each lender of a loan its own debt id, and floating rates no ratePerQuarter', () => {
    const d = deal(['loan'], { hardMinimumUsd: 2e9, start: '2027-01-01', end: '2027-12-31', rate: 'SOFR + 4.00%', payers: ['a', 'b'] })
    const draws = scheduleObligations([d], grid).filter(o => o.kind === 'loan-draw')
    expect(draws.map(o => o.debtId)).toEqual(['test-deal:a', 'test-deal:b'])
    expect(draws.every(o => o.ratePerQuarter === undefined && o.maturity === '2027Q4' && o.recourse === 'unknown')).toBe(true)
  })

  it('repays the remaining principal of a cancelled loan in the cutoff quarter', () => {
    const d = cancelled('2027-08-15', deal(['loan'], { hardMinimumUsd: 1e9, start: '2027-01-01', end: '2028-12-31', rate: '8%' }))
    const obs = scheduleObligations([d], grid)
    expect(obs.map(o => `${o.quarter} ${o.kind}`)).toEqual(['2027Q1 loan-draw', '2027Q2 interest', '2027Q3 interest', '2027Q3 principal'])
    expect(obs.find(o => o.kind === 'principal')!.amountUsd).toBe(1e9)
    expect(obs.every(o => o.maturity === '2027Q3')).toBe(true)
    // cancelled before it was drawn: nothing at all
    expect(scheduleObligations([cancelled('2026-12-01', deal(['loan'], { hardMinimumUsd: 1e9, start: '2027-01-01', end: '2028-12-31' }))], grid))
      .toEqual([])
  })

  it('lists loan positions independently of the grid (draws before it, maturities after it)', () => {
    const d = deal(['spv-financing'], { hardMinimumUsd: 3e9, start: '2021-06-01', end: '2049-05-31', rate: '6%', payers: ['p'], payees: ['spv'] })
    expect(loanPositions([d], params)).toEqual([{ dealId: 'test-deal', debtId: 'test-deal:p', lender: 'p', borrower: 'spv', principal: 3e9,
      drawQuarter: '2021Q2', repayQuarter: '2049Q2', ratePerQuarter: 0.015, recourse: 'unknown', label: 'Borrows' }])
    expect(loanPositions([leaseDeal({ hardMinimumUsd: 1e9 })], params)).toEqual([])
  })

  it('leaves floating or unstated loan interest to the finance layer', () => {
    const floating = scheduleObligations([deal(['loan'], { hardMinimumUsd: 1e9, start: '2027-01-01', end: '2027-12-31', rate: 'SOFR + 4.00%' })], grid)
    expect(floating.map(o => o.kind)).toEqual(['loan-draw', 'principal'])
    // no end and no stated term: the loan runs defaultLoanTermQuarters from the draw quarter
    const n = param(params, 'defaultLoanTermQuarters')
    const noRate = scheduleObligations([deal(['loan'], { hardMinimumUsd: 1e9, start: '2025-01-01' })], grid)
    expect(noRate.map(o => o.kind)).toEqual(['loan-draw', 'principal'])
    expect(grid.idx(noRate[1].quarter) - grid.idx(noRate[0].quarter)).toBe(n - 1)
  })

  it('treats SPV bonds as loans', () => {
    const spv = scheduleObligations([deal(['spv-financing'], { hardMinimumUsd: 2e9, start: '2027-01-01', end: '2027-12-31', rate: '6.5%' })], grid)
    expect(spv.map(o => o.kind)).toEqual(['loan-draw', 'interest', 'interest', 'interest', 'principal'])
  })

  it('schedules nothing for contingent or unmodelled types, and uses only the first listed type', () => {
    for (const t of ['capacity-guarantee', 'buyer-of-last-resort', 'warrants', 'jv', 'other'] as const) {
      expect(scheduleObligations([deal([t], { hardMinimumUsd: 1e9, start: '2027-01-01', end: '2027-12-31' })], grid), t).toEqual([])
    }
    expect(scheduleObligations([deal(['compute-lease', 'buyer-of-last-resort'], { hardMinimumUsd: 1e9, start: '2027-01-01', end: '2027-12-31' })], grid)
      .every(o => o.kind === 'compute-rent')).toBe(true)
    expect(scheduleObligations([deal(['buyer-of-last-resort', 'compute-lease'], { hardMinimumUsd: 1e9, start: '2027-01-01', end: '2027-12-31' })], grid))
      .toEqual([])
    expect(scheduleObligations([deal([], { hardMinimumUsd: 1e9 })], grid)).toEqual([])
  })

  it('on the real deals known at 2026-11-26: positive, within each hard minimum, none without one', () => {
    const deals = asOfView(loadBuild(), '2026-11-26').deals
    const obs = scheduleObligations([...deals], grid)
    expect(obs.length).toBeGreaterThan(0)
    expect(obs.every(o => Number.isFinite(o.amountUsd) && o.amountUsd > 0 && o.label.length > 0)).toBe(true)
    const byId = new Map(deals.map(d => [d.id, d]))
    for (const o of obs) expect(byId.get(o.dealId)!.values.hardMinimumUsd, o.dealId).toBeDefined()
    expect(obs.some(o => o.dealId.startsWith('coreweave-ddtl'))).toBe(false) // facilities are ceilings only
    for (const d of deals) {
      const mine = obs.filter(o => o.dealId === d.id && o.kind !== 'interest' && o.kind !== 'principal')
      expect(total(mine), d.id).toBeLessThanOrEqual((d.values.hardMinimumUsd ?? 0) + 1)
    }
  })
})

describe('term and rate parsing', () => {
  it('parses a stated length into quarters', () => {
    expect(parseTermQuarters('3 years')).toBe(12)
    expect(parseTermQuarters('~6 years plus 1-year option')).toBe(24)
    expect(parseTermQuarters('20-year leases')).toBe(80)
    expect(parseTermQuarters('2.5 years')).toBe(10)
    expect(parseTermQuarters('18 months')).toBe(6)
    expect(parseTermQuarters('Mar 2027')).toBeUndefined()
    expect(parseTermQuarters('2045')).toBeUndefined()
    expect(parseTermQuarters('Through Apr 2029')).toBeUndefined()
    expect(parseTermQuarters(undefined)).toBeUndefined()
  })
  it('parses only a plain fixed annual rate', () => {
    expect(parseFixedAnnualRate('6.581%')).toBeCloseTo(0.06581, 10)
    expect(parseFixedAnnualRate('7.5% (priced 98.75)')).toBeCloseTo(0.075, 10)
    expect(parseFixedAnnualRate('SOFR + 4.00%')).toBeUndefined()
    expect(parseFixedAnnualRate('Largest tranche ~8.259% yield')).toBeUndefined()
    expect(parseFixedAnnualRate(undefined)).toBeUndefined()
  })
})

// params became required in contracts.ts (browser-safe engine); these keep the tests' default of the committed file.
function scheduleObligations(d: readonly DealView[], g: Grid, p: EngineParams = loadParams()) { return scheduleP(d, g, p) }
function loanPositions(d: readonly DealView[], p: EngineParams = loadParams()) { return loanPositionsP(d, p) }
