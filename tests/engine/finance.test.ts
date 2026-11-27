import { describe, expect, it } from 'vitest'
import { asOfView, loadBuild } from '../../src/engine/asof'
import { makeGrid } from '../../src/engine/grid'
import { initState, type EngineState } from '../../src/engine/init'
import { stepFinance, type FinanceOut } from '../../src/engine/layers/finance'
import { netFinancialAssets } from '../../src/engine/ledger'
import { loadParams, param } from '../../src/engine/params'
import type { EngineParams, Flow } from '../../src/engine/types'

const grid = makeGrid()
const view = asOfView(loadBuild(), '2026-11-26')
const params = loadParams()
const paramsNoCredit: EngineParams = { ...params, maxLendingCreditSpread: { ...params.maxLendingCreditSpread, value: -1 } }
const Q = '2026Q4'

interface Setup { cash: number; ocf: number; due: { interest: number; principal: number } }

/** Real opening state with its obligations replaced by the given entities' interest and principal due this quarter. */
function stateWith(setup: Record<string, Setup>): { s: EngineState; flows: Flow[]; before: number } {
  const s = initState(view, params, grid, Q)
  s.obligations = []
  const flows: Flow[] = []
  for (const [id, x] of Object.entries(setup)) {
    const sheet = s.ledger.sheets[id]
    sheet.debt = []
    sheet.cash = x.cash
    const debtId = `test:${id}`
    sheet.debt.push({ id: debtId, lenderId: 'bond-market', principal: x.due.principal + 10e9, ratePerQuarter: 0, maturity: '2030Q4', recourse: 'recourse' })
    s.ledger.sheets['bond-market'].loansReceivable.push({ debtId, borrowerId: id, principal: x.due.principal + 10e9 })
    if (x.due.interest > 0) s.obligations.push({ dealId: 'test', payer: id, payee: 'bond-market', quarter: Q, amountUsd: x.due.interest, kind: 'interest', label: 'Interest', debtId })
    if (x.due.principal > 0) s.obligations.push({ dealId: 'test', payer: id, payee: 'bond-market', quarter: Q, amountUsd: x.due.principal, kind: 'principal', label: 'Repays loan', debtId })
    // revenue sized so that revenue minus the cloud operating-cost ratio equals the wanted operating cash flow
    const revenue = x.ocf / (1 - param(params, 'cloudOperatingCostRatio'))
    if (revenue > 0) flows.push({ quarter: Q, from: 'ai-customers-enterprise', to: id, amountUsd: revenue, kind: 'compute-rent', label: 'Rents compute' })
  }
  return { s, flows, before: netFinancialAssets(s.ledger) }
}
const invariantErrorsAfter = (out: FinanceOut, s: EngineState, before: number) =>
  Math.abs(netFinancialAssets(s.ledger) - before) > 1 ? ['net financial assets changed'] : out.invariantErrors

describe('stepFinance', () => {
  it('labels a firm Ponzi when operating cash flow does not cover interest', () => {
    const { s, flows } = stateWith({ coreweave: { cash: 1e9, ocf: 0.2e9, due: { interest: 0.3e9, principal: 0 } } })
    expect(stepFinance(s, flows, params, { creditSpread: 1.5 }).entityQuarters.coreweave.minsky).toBe('ponzi')
  })

  it('labels a firm speculative when operating cash flow covers interest but not principal', () => {
    const { s, flows } = stateWith({ coreweave: { cash: 5e9, ocf: 1e9, due: { interest: 0.3e9, principal: 2e9 } } })
    expect(stepFinance(s, flows, params, { creditSpread: 1.5 }).entityQuarters.coreweave.minsky).toBe('speculative')
  })

  it('defaults a firm with no cash and no credit, writing down rather than creating money', () => {
    const { s, flows, before } = stateWith({ coreweave: { cash: 0, ocf: 0, due: { interest: 0.5e9, principal: 2e9 } } })
    const g = stepFinance(s, flows, paramsNoCredit)
    expect(g.entityQuarters.coreweave.defaulted).toBe(true)
    expect(s.defaulted.coreweave).toBe(true)
    expect(g.events.find(e => e.kind === 'default')!.reason).toMatch(/cash ran out/i)
    expect(g.flows.filter(f => f.from === 'coreweave' && (f.kind === 'interest' || f.kind === 'principal'))).toEqual([]) // nothing paid
    expect(invariantErrorsAfter(g, s, before)).toEqual([])
  })

  it('borrows to cover a shortfall when credit is open instead of defaulting', () => {
    const { s, flows } = stateWith({ coreweave: { cash: 0, ocf: 0, due: { interest: 0.5e9, principal: 0 } } })
    const out = stepFinance(s, flows, params, { creditSpread: 1.5 })
    expect(out.entityQuarters.coreweave.defaulted).toBe(false)
    expect(out.events.some(e => e.entityId === 'coreweave' && e.kind === 'loan-draw')).toBe(true)
  })

  it('labels a cash-rich hyperscaler hedge and keeps the ledger balanced', () => {
    const { s, flows, before } = stateWith({ microsoft: { cash: 50e9, ocf: 40e9, due: { interest: 1e9, principal: 2e9 } } })
    const h = stepFinance(s, flows, params, { creditSpread: 1.5 })
    expect(h.entityQuarters.microsoft.minsky).toBe('hedge')
    expect(h.entityQuarters.microsoft.modelled).toBe(true)
    expect(invariantErrorsAfter(h, s, before)).toEqual([])
  })

  it('never defaults aggregates even when their cash goes negative', () => {
    const { s, flows } = stateWith({ coreweave: { cash: 1e9, ocf: 1e9, due: { interest: 0, principal: 0 } } })
    const out = stepFinance(s, flows, params, { creditSpread: 1.5 })
    expect(s.ledger.sheets['ai-customers-enterprise'].cash).toBeLessThan(0)
    expect(out.entityQuarters['ai-customers-enterprise']?.defaulted ?? false).toBe(false)
  })
})
