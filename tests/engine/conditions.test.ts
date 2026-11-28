import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { asOfView } from '../../src/engine/asof'
import { loadBuild } from '../../src/engine/node-io'
import { CONDITION_IDS, buildConditions, withUserPath } from '../../src/engine/conditions'
import { loadConditionSpecs } from '../../src/engine/node-io'
import { makeGrid } from '../../src/engine/grid'
import { param } from '../../src/engine/params'
import { loadParams } from '../../src/engine/node-io'
import type { ConditionId } from '../../src/engine/types'

const build = loadBuild()
const asOfData = (d: string) => asOfView(build, d)
const grid = makeGrid()
const params = loadParams()
const AS_OF = '2026-11-26'

describe('buildConditions (brief)', () => {
  it('builds every condition with history, defaults and a containing range', () => {
    const c = buildConditions(asOfData(AS_OF), makeGrid(), AS_OF)
    for (const id of CONDITION_IDS) {
      expect(c[id].values.length, id).toBe(36)
      expect(c[id].values.every(Number.isFinite), id).toBe(true)
      for (let i = 0; i < 36; i++) expect(c[id].low[i] <= c[id].values[i] && c[id].values[i] <= c[id].high[i], `${id}@${i}`).toBe(true)
    }
    expect(c.riskFree.origin[makeGrid().idx('2025Q4')]).toBe('history')
    expect(c.riskFree.origin[makeGrid().idx('2027Q1')]).toBe('default')
    // as-of: a 2024 view must not contain 2025 history
    const c24 = buildConditions(asOfData('2024-06-30'), makeGrid(), '2024-06-30')
    expect(c24.riskFree.origin[makeGrid().idx('2024Q3')]).toBe('default')
    const u = withUserPath(c, 'creditSpread', { '2027Q1': 9.0 })
    expect(u.creditSpread.values[makeGrid().idx('2027Q1')]).toBe(9.0)
    expect(u.creditSpread.origin[makeGrid().idx('2027Q1')]).toBe('user')
    expect(c.tokenPrice.rangeSource.startsWith('Assumption:') || c.tokenPrice.rangeSource.length > 0).toBe(true)
  })
})

describe('buildConditions (detail)', () => {
  const c = buildConditions(asOfData(AS_OF), grid, AS_OF)
  const specs = loadConditionSpecs()

  it('covers exactly the ConditionId set, with units from conditions.json', () => {
    expect(Object.keys(c).sort()).toEqual([...CONDITION_IDS].sort())
    for (const id of CONDITION_IDS) {
      expect(c[id].id).toBe(id)
      expect(c[id].unit).toBe(specs[id].unit)
      expect(c[id].rangeSource.length, id).toBeGreaterThan(20)
    }
  })

  it('history quarters have low == high == value; default quarters have low < high', () => {
    for (const id of CONDITION_IDS) {
      const p = c[id]
      for (let i = 0; i < 36; i++) {
        if (p.origin[i] === 'history') {
          expect(p.low[i], `${id}@${i}`).toBe(p.values[i])
          expect(p.high[i], `${id}@${i}`).toBe(p.values[i])
        } else {
          expect(p.low[i] < p.high[i], `${id}@${i}`).toBe(true)
        }
      }
    }
  })

  it('every default path is continuous with the last history value', () => {
    for (const id of CONDITION_IDS) {
      const p = c[id]
      const last = p.origin.lastIndexOf('history')
      if (last < 0 || last === 35) continue
      const step = Math.log(p.values[last + 1] / p.values[last])
      const spec = specs[id]
      if (spec.defaultMethod === 'hold-last') {
        expect(p.values[last + 1], id).toBe(p.values[last])
      } else if (spec.defaultMethod === 'trend-decay') {
        // The first step grows at a rate between the last observed rate and the long-run rate: no jump.
        const prev = p.origin.lastIndexOf('history', last - 1)
        const g0 = prev >= 0
          ? Math.log(p.values[last] / p.values[prev]) / (last - prev)
          : Math.log(1 + build.series.find(s => s.id === spec.initialGrowthSeries!.id)!.points.at(-1)!.value / 100) / 4
        const gLR = Math.log(1 + param(params, spec.params.longRunGrowth!))
        expect(step, id).toBeLessThanOrEqual(Math.max(g0, gLR) + 1e-12)
        expect(step, id).toBeGreaterThanOrEqual(Math.min(g0, gLR) - 1e-12)
      }
    }
  })

  it('aggregates history as the mean of points dated in the quarter and known by asOf', () => {
    const pts = build.series.find(s => s.id === 'DGS10')!.points
      .filter(p => p.date >= '2025-10-01' && p.date <= '2025-12-31' && p.asKnownAt <= AS_OF)
    const mean = pts.reduce((a, p) => a + p.value, 0) / pts.length
    expect(c.riskFree.values[grid.idx('2025Q4')]).toBeCloseTo(mean, 12)
    expect(c.riskFree.unit).toBe('percent')
    // the as-of quarter itself is history (points known by asOf), the next quarter is not
    expect(c.riskFree.origin[grid.idx('2026Q4')]).toBe('history')
    expect(c.riskFree.values[grid.idx('2030Q4')]).toBe(c.riskFree.values[grid.idx('2026Q4')])
  })

  it('never uses data known after asOf', () => {
    const v = asOfData('2024-06-30')
    const c24 = buildConditions(v, grid, '2024-06-30')
    for (const id of CONDITION_IDS) {
      for (let i = grid.idx('2024Q3'); i < 36; i++) expect(c24[id].origin[i], `${id}@${i}`).not.toBe('history')
    }
    const pts = build.series.find(s => s.id === 'DGS10')!.points
      .filter(p => p.date >= '2024-04-01' && p.date <= '2024-06-30' && p.asKnownAt <= '2024-06-30')
    expect(c24.riskFree.values[grid.idx('2024Q2')]).toBeCloseTo(pts.reduce((a, p) => a + p.value, 0) / pts.length, 12)
    // Anthropic revenue was first public in its 2026 S-1: a 2024 view has no aiSpend history and says so
    expect(c24.aiSpend.origin.includes('history')).toBe(false)
    expect(c24.aiSpend.rangeSource.startsWith('Assumption:')).toBe(true)
    // IEA Energy and AI (Apr 2025) is not known in mid-2024
    expect(c24.powerGw.rangeSource.startsWith('Assumption:')).toBe(true)
  })

  it('aiSpend sums lab revenue, annualised, and flags the missing OpenAI component', () => {
    expect(c.aiSpend.unit).toBe('USD per year')
    expect(c.aiSpend.origin[grid.idx('2026Q3')]).toBe('history')
    expect(c.aiSpend.values[grid.idx('2026Q3')]).toBe(16_956_000_000 * 4)
    expect(c.aiSpend.origin[grid.idx('2026Q4')]).toBe('default')
    expect(c.aiSpend.notes).toMatch(/partial/i)
    expect(c.aiSpend.notes).toMatch(/OpenAI is missing in 6 of 7 history quarters/)
    // company-stated OpenAI revenue (about $2B a month, March 2026) enters 2026Q1 as x3 per quarter
    expect(c.aiSpend.values[grid.idx('2026Q1')]).toBe((4_731_000_000 + 2_000_000_000 * 3) * 4)
    // not before it was stated (2026-03-31)
    const cMar = buildConditions(asOfData('2026-03-30'), grid, '2026-03-30')
    expect(cMar.aiSpend.origin.includes('history')).toBe(false)
    // press run-rates on other bases are never summed in
    expect(specs.aiSpend.labs!.flatMap(l => (l.revenueSeries ? [l.revenueSeries.id] : []))).toEqual(['openai-revenue-monthly-company'])
  })

  it('aiSpend takes a per-year revenue series as run-rate / 4 per quarter', () => {
    const custom = structuredClone(specs)
    custom.aiSpend.labs![1].revenueSeries = { id: 'openai-arr-axios', unit: 'USD per year' }
    const cc = buildConditions(asOfData(AS_OF), grid, AS_OF, { specs: custom })
    expect(cc.aiSpend.values[grid.idx('2026Q3')]).toBe((16_956_000_000 + 70_000_000_000 / 4) * 4)
    expect(cc.aiSpend.notes).toMatch(/OpenAI is missing in 6 of 7/)
  })

  it('aiSpend trend growth is never measured across a change in the lab mix', () => {
    const custom = structuredClone(specs)
    custom.aiSpend.labs![1].revenueSeries = { id: 'openai-arr-axios', unit: 'USD per year' }
    const cc = buildConditions(asOfData(AS_OF), grid, AS_OF, { specs: custom })
    // 2026Q3 has OpenAI, 2026Q2 does not: the starting growth comes from Anthropic-only 2026Q1->Q2 instead
    expect(cc.aiSpend.notes).toMatch(/growth starts at 1\.4424 a quarter/)
  })

  it('quarters before the first data point are flagged, not passed off as history', () => {
    expect(c.gpuRental.firstHistory).toBe('2025Q4')
    expect(c.gpuRental.origin[grid.idx('2025Q3')]).toBe('default')
    expect(c.gpuRental.rangeSource.endsWith(' Assumption: quarters before 2025Q4 hold the first observed value.')).toBe(true)
    expect(c.aiSpend.firstHistory).toBe('2025Q1')
    expect(c.aiSpend.rangeSource.endsWith(' Assumption: quarters before 2025Q1 hold the first observed value.')).toBe(true)
    // history from the grid start: no suffix
    expect(c.riskFree.firstHistory).toBe('2022Q1')
    expect(c.riskFree.rangeSource).not.toMatch(/quarters before/)
    expect(c.tokenPrice.firstHistory).toBeUndefined()
  })

  it('every range built from assumed widths says Assumption first', () => {
    for (const id of CONDITION_IDS) {
      if (specs[id].rangeMethod !== 'volatility' || specs[id].historyKind === 'none') {
        expect(c[id].rangeSource.startsWith('Assumption:'), id).toBe(true)
      }
    }
    // a measured volatility that falls back to an assumed one is relabelled too
    const v = asOfData(AS_OF)
    const one = { ...v, series: (sid: string) => (sid === 'gpu-rent-h100-reserved-semianalysis' ? v.series(sid).slice(-1) : v.series(sid)) }
    const c1 = buildConditions(one, grid, AS_OF)
    expect(c1.gpuRental.rangeSource.startsWith('Assumption: too little history')).toBe(true)
    expect(c.gpuRental.rangeSource.startsWith('SemiAnalysis')).toBe(true)
  })

  it('creditSpread is one measure (BAA10Y) for the whole grid; HY OAS is only a cross-check', () => {
    expect(specs.creditSpread.historySeries).toEqual(['BAA10Y'])
    const baa = build.series.find(s => s.id === 'BAA10Y')!.points
    const qmean = (from: string, to: string) => {
      const pts = baa.filter(p => p.date >= from && p.date <= to && p.asKnownAt <= AS_OF)
      return pts.reduce((a, p) => a + p.value, 0) / pts.length
    }
    expect(c.creditSpread.values[grid.idx('2022Q1')]).toBeCloseTo(qmean('2022-01-01', '2022-03-31'), 12)
    expect(c.creditSpread.values[grid.idx('2023Q4')]).toBeCloseTo(qmean('2023-10-01', '2023-12-31'), 12)
    expect(c.creditSpread.values[grid.idx('2026Q3')]).toBeCloseTo(qmean('2026-07-01', '2026-09-30'), 12)
    expect(c.creditSpread.notes).not.toMatch(/Sources by quarter/)
    expect(c.creditSpread.notes).toMatch(/Cross-check only, not used: FRED BAMLH0A0HYM2/)
  })

  it('gpuResale is used price as a fraction of new price', () => {
    expect(c.gpuResale.origin[grid.idx('2026Q3')]).toBe('history')
    expect(c.gpuResale.values[grid.idx('2026Q3')]).toBeCloseTo((14000 + 25000) / 2 / ((25000 + 34000) / 2), 12)
  })

  it('powerGw interpolates IEA points converted from TWh/yr to GW of capacity', () => {
    const lf = param(params, 'powerLoadFactor')
    expect(c.powerGw.unit).toBe('GW')
    expect(c.powerGw.values[grid.idx('2030Q2')]).toBeCloseTo(1000 * 1000 / 8760 / lf, 9)
    expect(c.powerGw.values[grid.idx('2024Q2')]).toBeCloseTo(415 * 1000 / 8760 / lf, 9)
    expect(c.powerGw.rangeSource).toMatch(/IEA/)
    expect(c.powerGw.rangeSource).toMatch(/LBNL/)
    // before WEO 2026 (19 Nov 2026) only the 945 TWh base case is known
    const c25 = buildConditions(asOfData('2025-06-30'), grid, '2025-06-30')
    expect(c25.powerGw.values[grid.idx('2030Q2')]).toBeCloseTo(945 * 1000 / 8760 / lf, 9)
    expect(c25.powerGw.rangeSource).not.toMatch(/placeholder/)
    expect(c25.powerGw.notes).toMatch(/2030Q2 945 TWh/)
    expect(c25.powerGw.notes).not.toMatch(/1000 TWh/)
  })

  it('assumption-sourced conditions say so plainly', () => {
    for (const id of ['tokenPrice', 'priceElasticity', 'physicalAiGrowth', 'exportRegime', 'labourSubstitution'] as ConditionId[]) {
      expect(c[id].rangeSource.startsWith('Assumption:'), id).toBe(true)
    }
    expect(c.tokenPrice.values.every(v => v === 1)).toBe(true)
    expect(c.exportRegime.values.every(v => v === param(params, 'exportRegimeDefault'))).toBe(true)
    expect(c.exportRegime.low.every(v => v >= 0) && c.exportRegime.high.every(v => v <= 1)).toBe(true)
  })

  it('every series and param named in conditions.json exists', () => {
    const ids = new Set(build.series.map(s => s.id))
    for (const id of CONDITION_IDS) {
      const s = specs[id]
      for (const sid of s.historySeries) expect(ids.has(sid), `${id}:${sid}`).toBe(true)
      if (s.initialGrowthSeries) expect(ids.has(s.initialGrowthSeries.id), id).toBe(true)
      for (const key of Object.values(s.params)) expect(() => param(params, key as string), `${id}:${key}`).not.toThrow()
    }
    const raw = JSON.parse(readFileSync('config/conditions.json', 'utf8'))
    expect(Object.keys(raw).sort()).toEqual([...CONDITION_IDS].sort())
  })

  it('runs in under 20 ms for all conditions', () => {
    const v = asOfData(AS_OF)
    buildConditions(v, grid, AS_OF) // warm-up
    const times: number[] = []
    for (let r = 0; r < 5; r++) {
      const t0 = performance.now()
      buildConditions(v, grid, AS_OF)
      times.push(performance.now() - t0)
    }
    expect(times.sort((a, b) => a - b)[2]).toBeLessThan(20) // median of 5
  })
})

describe('withUserPath', () => {
  const c = buildConditions(asOfData(AS_OF), grid, AS_OF)
  it('does not mutate the input and leaves other quarters alone', () => {
    const before = c.creditSpread.values.slice()
    const u = withUserPath(c, 'creditSpread', { '2027Q1': 9.0, '2027Q2': 8.5 })
    expect(c.creditSpread.values).toEqual(before)
    expect(c.creditSpread.origin[grid.idx('2027Q1')]).toBe('default')
    expect(u.creditSpread.values[grid.idx('2027Q2')]).toBe(8.5)
    expect(u.creditSpread.origin[grid.idx('2027Q3')]).toBe('default')
    expect(u.riskFree).toBe(c.riskFree)
  })
  it('rejects quarters off the grid and non-finite values', () => {
    expect(() => withUserPath(c, 'creditSpread', { '2031Q1': 1 })).toThrow(/2031Q1/)
    expect(() => withUserPath(c, 'creditSpread', { '2027Q1': Number.NaN })).toThrow(/finite/)
  })
})

describe('param lookup', () => {
  it('does not resolve inherited object keys', () => {
    expect(() => param(params, 'constructor')).toThrow(/unknown param/)
  })
})
