import { describe, expect, it } from 'vitest'
import { loadBuild } from '../../src/engine/node-io'
import { makeGrid } from '../../src/engine/grid'
import { loadParams } from '../../src/engine/node-io'
import { runOnePath, type EngineInput } from '../../src/engine/run'

const build = loadBuild()
const g = makeGrid()
const sameInput: EngineInput = { build, params: loadParams(), asOf: '2026-11-26', start: '2026Q4' }

describe('runOnePath', () => {
  const r = runOnePath(sameInput)

  it('runs the whole grid with the ledger balanced', () => {
    expect(r.invariantErrors).toEqual([])
    expect(r.nvidia.length).toBe(36)
    expect(Object.values(r.entities).every(rows => rows.length === 36)).toBe(true)
  })

  it('fills history quarters with actuals and simulates from the start quarter', () => {
    expect(r.nvidia[g.idx('2026Q2')].revenue).toBeCloseTo(96.221e9, -6)
    expect(r.entities.nvidia[g.idx('2026Q2')].modelled).toBe(false)
    expect(r.entities.nvidia[g.idx('2027Q1')].modelled).toBe(true)
    expect(r.nvidia[g.idx('2027Q1')].revenue).toBeGreaterThan(0)
  })

  it('labels every flow and never moves negative money', () => {
    expect(r.flows.length).toBeGreaterThan(0)
    expect(r.flows.every(f => f.label.length > 0 && f.amountUsd >= 0)).toBe(true)
    expect(r.flows.every(f => f.quarter >= '2026Q4')).toBe(true)
  })

  it('is deterministic and fast', () => {
    expect(JSON.stringify(runOnePath(sameInput))).toBe(JSON.stringify(runOnePath(sameInput)))
    runOnePath(sameInput) // warm-up
    const times = Array.from({ length: 5 }, () => { const t0 = performance.now(); runOnePath(sameInput); return performance.now() - t0 })
    expect(times.sort((a, b) => a - b)[2]).toBeLessThan(50)
  })

  it('never schedules a deal before it was announced', () => {
    const r24 = runOnePath({ build, params: loadParams(), asOf: '2024-12-31', start: '2025Q1' })
    expect(r24.flows.some(f => f.dealId === 'nvidia-openai-ohio-backstop')).toBe(false)
    expect(r24.flows.some(f => f.dealId === 'meta-coreweave-2025')).toBe(false) // announced 2025-09-30
    const rRoll = runOnePath({ build, params: loadParams(), asOf: '2024-12-31', start: '2025Q1', dealsKnownUntil: '2026-11-26' })
    expect(rRoll.invariantErrors).toEqual([])
    const late = rRoll.flows.filter(f => f.dealId === 'openai-aws-compute-2026')
    expect(late.length).toBeGreaterThan(0)
    expect(late.every(f => f.quarter >= '2026Q1')).toBe(true) // announced 2026-02-27
  })
})

describe('entities without data at the start', () => {
  it('keeps a not-yet-reporting cloud out of the run until a deal names it', () => {
    const r = runOnePath({ build, params: loadParams(), asOf: '2023-05-15', start: '2023Q2' })
    expect(r.invariantErrors).toEqual([])
    const uncontracted = r.flows.filter(f => (f.to === 'coreweave' || f.from === 'coreweave') && !f.dealId && f.kind !== 'interest' && f.kind !== 'operating-cost')
    const named = new Set(r.flows.filter(f => f.dealId && (f.to === 'coreweave' || f.from === 'coreweave')).map(f => f.quarter))
    expect(uncontracted.every(f => [...named].some(q => q <= f.quarter))).toBe(true)
  })
})
