import { describe, expect, it } from 'vitest'
import { decodeState, encodeState, type AppState } from '../../src/app/url-state'

describe('link state', () => {
  it('round-trips a named setup', () => {
    const s: AppState = { name: 'Credit squeeze', overrides: { creditSpread: { '2027Q2': 6.5 } }, quarter: '2027Q4' }
    expect(decodeState(encodeState(s), { start: '2026Q3' }).state).toEqual(s)
  })
  it('round-trips a deal focus', () => {
    const s: AppState = { overrides: {}, quarter: '2027Q1', focus: { dealId: 'coreweave-ddtl-3' } }
    expect(decodeState(encodeState(s), { start: '2026Q3' }).state).toEqual(s)
  })
  it('opens the baseline with no note for an empty hash', () => {
    expect(decodeState('', { start: '2026Q3' })).toEqual({ state: { overrides: {}, quarter: '2026Q3' } })
  })
  it('opens the baseline with a note for a broken link', () => {
    const r = decodeState('#s=%%%not-base64', { start: '2026Q3' })
    expect(r.state).toEqual({ overrides: {}, quarter: '2026Q3' })
    expect(r.note).toMatch(/could not be read/)
  })
  it('drops unknown conditions and off-grid quarters with a note', () => {
    const r = decodeState(encodeState({ overrides: { nope: { '2027Q1': 1 }, riskFree: { '2040Q1': 3 } } as never, quarter: '2027Q1' }), { start: '2026Q3' })
    expect(r.state.overrides).toEqual({})
    expect(r.note).toBeDefined()
  })
  it('rejects non-finite values', () => {
    const r = decodeState(encodeState({ overrides: { riskFree: { '2027Q1': Number.NaN } }, quarter: '2027Q1' }), { start: '2026Q3' })
    expect(r.state.overrides).toEqual({})
  })
})
