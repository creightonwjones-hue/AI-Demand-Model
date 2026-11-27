import { describe, expect, it } from 'vitest'
import { asOfView, loadBuild } from '../../src/engine/asof'
import { buildConditions } from '../../src/engine/conditions'
import { makeGrid } from '../../src/engine/grid'
import { initState } from '../../src/engine/init'
import { supplyCapacity } from '../../src/engine/layers/chips'
import { aspAt, capacityFactorAt, SUPPLY_ANCHOR } from '../../src/engine/supply-path'
import { loadParams, param } from '../../src/engine/params'
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
    expect(rev('2028Q4')).toBeGreaterThan(rev('2026Q4') * 1.2)
  })
})
