import { describe, expect, it } from 'vitest'
import { checkInvariant, drawLoan, netFinancialAssets, newLedger, post, repayLoan } from '../../src/engine/ledger'
import type { Flow, FlowKind } from '../../src/engine/types'

const flow = (from: string, to: string, amountUsd: number, kind: FlowKind = 'compute-rent'): Flow =>
  ({ quarter: '2027Q1', from, to, amountUsd, kind, label: 'Rents compute' })

const loanTerms = { id: 'loan-1', ratePerQuarter: 0.02, maturity: '2030Q4', recourse: 'recourse' as const }

describe('ledger (brief)', () => {
  it('moves cash, keeps the invariant and rejects unknown ids', () => {
    const l = newLedger(['a', 'b']); l.sheets.a.cash = 100
    const before = netFinancialAssets(l)
    post(l, flow('a', 'b', 40)); expect(l.sheets.a.cash).toBe(60); expect(l.sheets.b.cash).toBe(40)
    expect(checkInvariant(l, before)).toBeNull()
    expect(() => post(l, flow('a', 'ghost', 1))).toThrow(/ghost/)
  })
})

describe('ledger (detail)', () => {
  it('starts every sheet empty, with an empty loan book', () => {
    const l = newLedger(['a'])
    expect(l.sheets.a).toEqual({ cash: 0, receivables: 0, debt: [], loansReceivable: [], chipVintages: [], buildings: 0,
      equityRaised: 0, retainedEarnings: 0 })
    expect(l.flows).toEqual([])
    expect(() => newLedger(['a', 'a'])).toThrow(/duplicate/)
  })

  it('records every posted flow and names the missing payer too', () => {
    const l = newLedger(['a', 'b'])
    post(l, flow('a', 'b', 5))
    expect(l.flows).toHaveLength(1)
    expect(() => post(l, flow('nobody', 'b', 1))).toThrow(/nobody/)
    expect(l.flows).toHaveLength(1) // a rejected flow leaves no trace
  })

  it('rejects negative and non-finite amounts', () => {
    const l = newLedger(['a', 'b'])
    expect(() => post(l, flow('a', 'b', -1))).toThrow(/amount/)
    expect(() => post(l, flow('a', 'b', Number.NaN))).toThrow(/amount/)
    expect(() => post(l, flow('a', 'b', Number.POSITIVE_INFINITY))).toThrow(/amount/)
  })

  it('refuses loan draws and repayments through post (they must move debt too)', () => {
    const l = newLedger(['bank', 'cloud'])
    expect(() => post(l, flow('bank', 'cloud', 10, 'loan-draw'))).toThrow(/drawLoan/)
    expect(() => post(l, flow('cloud', 'bank', 10, 'principal'))).toThrow(/repayLoan/)
  })

  it('a loan draw adds equal debt and loan asset, leaving net financial assets unchanged', () => {
    const l = newLedger(['bank', 'cloud']); l.sheets.bank.cash = 1_000
    const before = netFinancialAssets(l)
    drawLoan(l, flow('bank', 'cloud', 400, 'loan-draw'), loanTerms)
    expect(l.sheets.bank.cash).toBe(600)
    expect(l.sheets.cloud.cash).toBe(400)
    expect(l.sheets.cloud.debt).toEqual([{ ...loanTerms, lenderId: 'bank', principal: 400 }])
    expect(l.sheets.bank.loansReceivable).toEqual([{ debtId: 'loan-1', borrowerId: 'cloud', principal: 400 }])
    expect(netFinancialAssets(l)).toBe(before)
    expect(checkInvariant(l, before)).toBeNull()
    expect(() => drawLoan(l, flow('bank', 'cloud', 1, 'loan-draw'), loanTerms)).toThrow(/loan-1/) // id already used
    expect(() => drawLoan(l, flow('bank', 'cloud', 1, 'interest'), { ...loanTerms, id: 'x' })).toThrow(/loan-draw/)
  })

  it('repayments shrink both sides of the loan and keep the invariant', () => {
    const l = newLedger(['bank', 'cloud']); l.sheets.bank.cash = 1_000
    drawLoan(l, flow('bank', 'cloud', 400, 'loan-draw'), loanTerms)
    const before = netFinancialAssets(l)
    repayLoan(l, flow('cloud', 'bank', 150, 'principal'), 'loan-1')
    expect(l.sheets.cloud.debt[0].principal).toBe(250)
    expect(l.sheets.bank.loansReceivable[0].principal).toBe(250)
    expect(l.sheets.cloud.cash).toBe(250)
    expect(checkInvariant(l, before)).toBeNull()
    repayLoan(l, flow('cloud', 'bank', 250, 'principal'), 'loan-1')
    expect(l.sheets.cloud.debt).toEqual([])
    expect(l.sheets.bank.loansReceivable).toEqual([])
    expect(checkInvariant(l, before)).toBeNull()
    expect(l.flows.map(f => f.kind)).toEqual(['loan-draw', 'principal', 'principal'])
  })

  it('refuses repayments of unknown loans, to the wrong lender, or above the principal', () => {
    const l = newLedger(['bank', 'other', 'cloud']); l.sheets.bank.cash = 1_000
    drawLoan(l, flow('bank', 'cloud', 400, 'loan-draw'), loanTerms)
    expect(() => repayLoan(l, flow('cloud', 'bank', 1, 'principal'), 'nope')).toThrow(/nope/)
    expect(() => repayLoan(l, flow('cloud', 'other', 1, 'principal'), 'loan-1')).toThrow(/other/)
    expect(() => repayLoan(l, flow('cloud', 'bank', 401, 'principal'), 'loan-1')).toThrow(/exceeds/)
    expect(() => repayLoan(l, flow('cloud', 'bank', 1, 'interest'), 'loan-1')).toThrow(/principal/)
    expect(l.sheets.cloud.debt[0].principal).toBe(400)
  })

  it('interest is an ordinary cash flow: posted, it changes no principal and keeps the invariant', () => {
    const l = newLedger(['bank', 'cloud']); l.sheets.bank.cash = 1_000
    drawLoan(l, flow('bank', 'cloud', 400, 'loan-draw'), loanTerms)
    const before = netFinancialAssets(l)
    post(l, flow('cloud', 'bank', 8, 'interest'))
    expect(l.sheets.cloud.debt[0].principal).toBe(400)
    expect(checkInvariant(l, before)).toBeNull()
  })

  it('counts cash, receivables and loan assets less debt; flags money created outside a flow', () => {
    const l = newLedger(['a', 'b'])
    l.sheets.a.cash = 10; l.sheets.b.receivables = 5
    expect(netFinancialAssets(l)).toBe(15)
    const before = netFinancialAssets(l)
    l.sheets.a.cash += 2 // money from nowhere
    expect(checkInvariant(l, before)).toMatch(/2/)
    l.sheets.a.cash -= 1.5 // within the $1 tolerance of the start
    expect(checkInvariant(l, before)).toBeNull()
  })
})
