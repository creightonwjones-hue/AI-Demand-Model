import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { chartModel, clampValue, dragPath, outsideForecasts, type ConditionBounds } from '../../src/app/conditions/chart'
import { asOfView } from '../../src/engine/asof'
import { latestBuildDate } from '../../src/engine/backtest'
import { buildConditions, withUserPath } from '../../src/engine/conditions'
import { makeGrid } from '../../src/engine/grid'
import { loadBuild, loadParams } from '../../src/engine/node-io'
import { runOnePath } from '../../src/engine/run'

const build = loadBuild(), params = loadParams(), g = makeGrid()
const asOf = latestBuildDate(build)
const conditions = buildConditions(asOfView(build, asOf), g, asOf)
const bounds = JSON.parse(readFileSync('config/condition-bounds.json', 'utf8')).conditions as ConditionBounds

describe('condition chart', () => {
  it('clamps extreme drags and snaps the export regime', () => {
    expect(clampValue('creditSpread', -5, bounds)).toBe(0)
    expect(clampValue('creditSpread', 99, bounds)).toBe(30)
    expect(clampValue('exportRegime', 0.4, bounds)).toBe(0.5)
    expect(clampValue('exportRegime', 0.1, bounds)).toBe(0)
    expect(clampValue('riskFree', Number.NaN, bounds)).toBe(0)
  })
  it('flags values outside the forecast range', () => {
    const p = conditions.creditSpread, q = '2028Q1', i = g.idx(q)
    expect(outsideForecasts(p, q, p.high[i] + 1, g)).toBe(true)
    expect(outsideForecasts(p, q, (p.low[i] + p.high[i]) / 2, g)).toBe(false)
  })
  it('has handles only from the as-of quarter on, and maps y back to values', () => {
    const m = chartModel(conditions.riskFree, g, asOf, 240, 90)
    expect(m.handles.length).toBeGreaterThan(10)
    expect(m.handles.every(h => h.quarter >= '2026Q4')).toBe(true)
    const h = m.handles[3]
    expect(m.yToValue(h.y)).toBeCloseTo(conditions.riskFree.values[g.idx(h.quarter)], 6)
    expect(m.band.startsWith('M')).toBe(true)
  })
  it('a drag moves the quarter and eases two neighbours each side', () => {
    const p = conditions.riskFree, i = g.idx('2028Q1')
    const o = dragPath(p.values, g, i, p.values[i] + 2, '2026Q4')
    expect(o['2028Q1']).toBeCloseTo(p.values[i] + 2)
    expect(o['2027Q4']).toBeCloseTo(p.values[i - 1] + 1)
    expect(o['2028Q3']).toBeCloseTo(p.values[i + 2] + 0.5)
    expect(Object.keys(o)).toHaveLength(5)
    const edge = dragPath(p.values, g, g.idx('2026Q4'), 9, '2026Q4')
    expect(Object.keys(edge).every(q => q >= '2026Q4')).toBe(true)
  })
  it('an extreme dragged path still runs cleanly', () => {
    const c = withUserPath(conditions, 'creditSpread', { '2027Q1': clampValue('creditSpread', 1e9, bounds) })
    const r = runOnePath({ build, params, asOf, start: '2026Q3', conditions: c })
    expect(r.invariantErrors).toEqual([])
    expect(r.nvidia.every(n => Number.isFinite(n.revenue))).toBe(true)
    const z = withUserPath(conditions, 'powerGw', Object.fromEntries(g.quarters.filter(q => q >= '2026Q4').map(q => [q, clampValue('powerGw', -10, bounds)])))
    const r0 = runOnePath({ build, params, asOf, start: '2026Q3', conditions: z })
    expect(r0.invariantErrors).toEqual([])
    expect(r0.nvidia.every(n => Number.isFinite(n.revenue) && n.revenue >= 0)).toBe(true)
  })
})

describe('final review: drag neighbours stay in bounds', () => {
  it('clamps every quarter a drag moves, not only the dragged one', () => {
    const vals = g.quarters.map(() => 0.9)
    const o = dragPath(vals, g, g.idx('2028Q1'), 1, '2026Q4', v => clampValue('gpuResale', v, bounds))
    expect(Object.values(o).every(v => v! <= 1 && v! >= 0)).toBe(true)
    const up = dragPath(g.quarters.map((_, i) => (i === g.idx('2028Q2') ? 1 : 0.2)), g, g.idx('2028Q1'), 1, '2026Q4', v => clampValue('gpuResale', v, bounds))
    expect(up['2028Q2']).toBeLessThanOrEqual(1)
  })
})
