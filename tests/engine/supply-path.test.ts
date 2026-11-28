import { describe, expect, it } from 'vitest'
import { asOfView } from '../../src/engine/asof'
import { loadBuild } from '../../src/engine/node-io'
import { buildConditions } from '../../src/engine/conditions'
import { makeGrid } from '../../src/engine/grid'
import { initState } from '../../src/engine/init'
import { supplyCapacity } from '../../src/engine/layers/chips'
import { aspAt, capacityFactorAt, SUPPLY_ANCHOR } from '../../src/engine/supply-path'
import { param } from '../../src/engine/params'
import { loadParams } from '../../src/engine/node-io'
import { runOnePath } from '../../src/engine/run'

const params = loadParams()
const grid = makeGrid()
const view = asOfView(loadBuild(), '2026-11-26')
const g = param(params, 'nvidiaAspQuarterlyGrowth')
const cg = param(params, 'supplyCapacityQuarterlyGrowth')

describe('ASP and supply capacity over time', () => {
  it('anchors the ASP at 2026Q4 and moves it by its quarterly growth, before and after', () => {
    expect(SUPPLY_ANCHOR).toBe('2026Q4')
    expect(g).toBeGreaterThan(0)
    expect(aspAt(params, '2026Q4')).toBe(param(params, 'nvidiaAspUsd'))
    expect(aspAt(params, '2027Q4')).toBeCloseTo(param(params, 'nvidiaAspUsd') * (1 + g) ** 4, 3)
    expect(aspAt(params, '2023Q4')).toBeCloseTo(param(params, 'nvidiaAspUsd') / (1 + g) ** 12, 3)
    expect(aspAt(params, '2018Q1')).toBeGreaterThan(0) // vintages before the grid
  })

  it('grows CoWoS and HBM capacity from the end-2026 anchor', () => {
    expect(cg).toBeGreaterThan(0)
    expect(capacityFactorAt(params, '2028Q4')).toBeCloseTo((1 + cg) ** 8, 6)
    const s = initState(view, params, grid, '2026Q4')
    const c = buildConditions(view, grid, '2026-11-26')
    const now = supplyCapacity(s, { ...c, powerGw: { ...c.powerGw, values: c.powerGw.values.map(() => 1e6) } }, params)
    expect(now.units).toBeCloseTo(Math.min(param(params, 'cowosUnitsPerQuarter'), param(params, 'hbmUnitsPerQuarter')), 0)
    s.q = grid.idx('2028Q4')
    const later = supplyCapacity(s, { ...c, powerGw: { ...c.powerGw, values: c.powerGw.values.map(() => 1e6) } }, params)
    expect(later.units).toBeCloseTo(now.units * (1 + cg) ** 8, 0)
  })

  it('values the installed base at each vintage\'s ASP', () => {
    const s = initState(view, params, grid, '2026Q4')
    for (const v of s.market.installedGpus) expect(v.units).toBeCloseTo(v.costUsd / aspAt(params, v.quarter), 3)
  })

  it('lets the baseline grow past the 2026 ceiling instead of flat-lining', () => {
    const r = runOnePath({ build: loadBuild(), params, asOf: '2026-11-27', start: '2026Q3' })
    expect(r.invariantErrors).toEqual([])
    const rev = (q: string) => r.nvidia[grid.idx(q)].revenue
    expect(rev('2028Q4')).toBeGreaterThan(rev('2026Q4')) // grows; from 2028 data-centre power, not packaging, limits it
    expect(rev('2030Q3')).toBeGreaterThan(rev('2028Q4'))
  })
})

describe('next-quarter guidance as a starting fact', () => {
  it('lets the baseline reach NVIDIA\'s own 2026Q4 revenue guidance (within 10%)', () => {
    const b = loadBuild()
    const guide = asOfView(b, '2026-11-27').series('guidance-nvda-rev-q4fy2027').at(-1)!.value
    const r = runOnePath({ build: b, params, asOf: '2026-11-27', start: '2026Q3' })
    expect(r.nvidia[grid.idx('2026Q4')].revenue / guide).toBeGreaterThan(0.9)
    expect(r.nvidia[grid.idx('2026Q4')].revenue / guide).toBeLessThan(1.1)
  })
})

describe('capex guidance as a starting fact', () => {
  it('seeds a cloud\'s capex momentum from its guidance for the start year (range midpoint), else reported capex', () => {
    const s = initState(view, params, grid, '2026Q4')
    expect(s.memory['capex:microsoft']).toBeCloseTo(170e9 / 4, -6)
    expect(s.memory['capex:alphabet']).toBeCloseTo(200e9 / 4, -6)
    const old = initState(asOfView(loadBuild(), '2025-06-30'), params, grid, '2025Q3')
    expect(old.memory['capex:microsoft']).toBeLessThan(40e9) // no 2025 guidance in the data: reported quarter
  })
})
