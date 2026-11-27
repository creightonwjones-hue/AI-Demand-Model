import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { BacktestReport } from '../src/engine/backtest'
import type { EngineBaseline } from '../src/engine/types'
import { engineSummary } from '../src/explorer/engine-section'

const baselineFixture = JSON.parse(readFileSync('data/build/engine-baseline.json', 'utf8')) as EngineBaseline
const backtestFixture = JSON.parse(readFileSync('data/build/backtest.json', 'utf8')) as BacktestReport

describe('engineSummary', () => {
  const s = engineSummary(baselineFixture, backtestFixture)

  it('sums NVIDIA revenue by fiscal year next to consensus', () => {
    expect(s.nvidiaFy.map(x => x.fy)).toEqual([2027, 2028, 2029])
    expect(s.nvidiaFy[1].consensus).toBeCloseTo(726.23e9, -7) // Yahoo FY2028 average from series.csv
    expect(s.nvidiaFy[2].consensus).toBeUndefined()
    const fy27 = baselineFixture.nvidia.filter(q => q.quarter.startsWith('2026')).reduce((t, q) => t + q.revenue, 0)
    expect(s.nvidiaFy[0].model).toBeCloseTo(fy27, -3)
  })

  it('grosses modelled AI capex up to total capex and keeps reported quarters as reported', () => {
    const y26 = s.capex.find(c => c.year === 2026)!
    expect(y26.guidance).toBeCloseTo(730e9, -7)
    const share = baselineFixture.comparisons.aiCapexShare
    const expected = ['microsoft', 'alphabet', 'amazon', 'meta'].reduce((t, id) => t + baselineFixture.entities[id]
      .filter(r => r.quarter.startsWith('2026')).reduce((u, r) => u + (r.modelled ? r.capex / share : r.capex), 0), 0)
    expect(y26.model).toBeCloseTo(expected, -3)
  })

  it('reports the backtest per scored target with its best benchmark', () => {
    expect(s.backtest.every(b => typeof b.beatsAllBenchmarks === 'boolean')).toBe(true)
    expect(s.backtest.map(b => b.target)).not.toContain('anthropicRevenue') // no rows yet
    const nv = s.backtest.find(b => b.target === 'nvidiaRevenue')!
    expect(['naive', 'drift', 'ETS']).toContain(nv.bestBenchmark)
    expect(s.nvidiaBacktest.length).toBeGreaterThan(0)
    expect(new Set(s.nvidiaBacktest.map(r => r.quarter)).size).toBe(s.nvidiaBacktest.length)
  })

  it('lists simulated-quarter events and the supply-bound quarters', () => {
    expect(s.events.every(e => e.quarter >= baselineFixture.start && ['supply-bound', 'minsky-change', 'default'].includes(e.kind))).toBe(true)
    expect(s.supplyBoundQuarters).toEqual([...new Set(s.events.filter(e => e.kind === 'supply-bound').map(e => e.quarter))])
    expect(s.overfitWarning).toBe(false)
  })
})
