import { describe, expect, it } from 'vitest'
import { asOfView, loadBuild, type BuildData } from '../../src/engine/asof'
import { asOfFor, ets, fiscalYearSum, rollingBacktest } from '../../src/engine/backtest'
import { loadParams } from '../../src/engine/params'
import type { QuarterKey } from '../../src/data/schema'
import { addQuarters } from '../../src/data/quarters'

const build = loadBuild()
const actualAt = (b: BuildData, id: string, metric: 'revenue', q: QuarterKey, asOf: string) =>
  asOfView(b, asOf).fact(id, metric, q)!.value

describe('rollingBacktest', () => {
  const rep = rollingBacktest(build, loadParams(), ['2024Q1', '2024Q2'])

  it('scores horizons after each origin with finite model and benchmark values', () => {
    expect(rep.rows.length).toBeGreaterThan(0)
    expect(rep.rows.every(r => r.quarter > r.origin)).toBe(true)
    expect(rep.rows.every(r => r.horizon >= 1 && r.horizon <= 8)).toBe(true)
    expect(rep.rows.every(r => Number.isFinite(r.model) && Number.isFinite(r.naive) && Number.isFinite(r.drift) && Number.isFinite(r.ets))).toBe(true)
    expect(rep.standard).toBe('point-only (ranges scored in phase 6)')
  })

  it('builds the naive benchmark only from data known at the origin', () => {
    const naiveRow = rep.rows.find(r => r.target === 'nvidiaRevenue' && r.horizon === 1)!
    const view = asOfView(build, asOfFor(naiveRow.origin))
    // the last NVIDIA quarter public by asOf (NVIDIA files ~60 days after quarter end, so possibly the one before)
    const lastKnown = [naiveRow.origin, addQuarters(naiveRow.origin, -1)].find(q => view.fact('nvidia', 'revenue', q))!
    expect(naiveRow.naive).toBeCloseTo(actualAt(build, 'nvidia', 'revenue', lastKnown, asOfFor(naiveRow.origin)), -3)
    expect(view.fact('nvidia', 'revenue', addQuarters(naiveRow.origin, 1))).toBeUndefined()
  })

  it('summarises error per target', () => {
    const s = rep.summary.nvidiaRevenue
    expect(s.n).toBeGreaterThan(0)
    expect(Number.isFinite(s.modelMape) && Number.isFinite(s.naiveMape)).toBe(true)
    expect(s.beatsAllBenchmarks).toBe(s.modelMape < Math.min(s.naiveMape, s.driftMape, s.etsMape))
  })
})

describe('benchmarks and fiscal years', () => {
  it('asOf is 45 days after the origin quarter ends', () => {
    expect(asOfFor('2024Q1')).toBe('2024-05-15')
    expect(asOfFor('2024Q4')).toBe('2025-02-14')
  })

  it('ETS extrapolates a linear trend', () => {
    const f = ets([1, 2, 3, 4, 5], 2)
    expect(f).toHaveLength(2)
    expect(f[0]).toBeCloseTo(6, 0)
    expect(f[1]).toBeCloseTo(7, 0)
  })

  it('sums the four calendar quarters inside an NVIDIA fiscal year (Feb–Jan)', () => {
    const qs = ['2025Q4', '2026Q1', '2026Q2', '2026Q3', '2026Q4', '2027Q1'].map((quarter, i) => ({ quarter, revenue: 10 ** i }))
    expect(fiscalYearSum(qs, 2027)).toBe(10 + 100 + 1000 + 10000)
  })
})
