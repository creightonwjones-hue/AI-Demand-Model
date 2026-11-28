import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { nvidiaCard } from '../../src/app/nvidia-card'
import { timelineTicks } from '../../src/app/timeline'
import { latestBuildDate } from '../../src/engine/backtest'
import { makeGrid } from '../../src/engine/grid'
import { loadBuild, loadParams } from '../../src/engine/node-io'
import { runOnePath } from '../../src/engine/run'

const build = loadBuild()
const g = makeGrid()
const run = runOnePath({ build, params: loadParams(), asOf: latestBuildDate(build), start: '2026Q3' })
const comparisons = JSON.parse(readFileSync('data/build/engine-baseline.json', 'utf8')).comparisons

describe('nvidiaCard', () => {
  it('uses the fiscal year containing the quarter', () => {
    const c = nvidiaCard(run, comparisons, '2027Q3')
    expect(c.fy).toBe(2028)
    expect(c.fyConsensus).toBeCloseTo(726.23e9, -7)
    expect(c.fyModel).toBeCloseTo(['2027Q1', '2027Q2', '2027Q3', '2027Q4'].reduce((t, q) => t + run.nvidia[g.idx(q)].revenue, 0), -3)
    expect(c.quarterRevenue).toBe(run.nvidia[g.idx('2027Q3')].revenue)
  })
  it('marks history quarters as reported, not modelled', () => {
    expect(nvidiaCard(run, comparisons, '2026Q1').modelled).toBe(false)
    expect(nvidiaCard(run, comparisons, '2027Q1').modelled).toBe(true)
  })
  it('flags supply-bound quarters', () => {
    const bound = run.events.find(e => e.kind === 'supply-bound')!
    expect(nvidiaCard(run, comparisons, bound.quarter).supplyBound).toBe(true)
  })
  it('has no consensus where none is published', () => {
    expect(nvidiaCard(run, comparisons, '2028Q2').fyConsensus).toBeUndefined()
  })
})

describe('timelineTicks', () => {
  const ticks = timelineTicks(g, '2026Q3', run.events)
  it('covers the grid and marks history', () => {
    expect(ticks).toHaveLength(36)
    expect(ticks.find(t => t.quarter === '2026Q2')!.history).toBe(true)
    expect(ticks.find(t => t.quarter === '2026Q3')!.history).toBe(false)
  })
  it('puts a marker on quarters with a default or financing-stance change', () => {
    for (const t of ticks) expect(t.markers).toBe(run.events.filter(e => e.quarter === t.quarter && (e.kind === 'default' || e.kind === 'minsky-change')).length)
  })
})
