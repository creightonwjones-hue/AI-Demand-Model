import { readFileSync } from 'node:fs'
import { globSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { asOfView, type BuildData } from '../../src/engine/asof'
import { latestBuildDate } from '../../src/engine/backtest'
import { trimBuild } from '../../src/engine/browser-input'
import { buildConditions } from '../../src/engine/conditions'
import { makeGrid } from '../../src/engine/grid'
import { loadBuild, loadConditionSpecs, loadParams } from '../../src/engine/node-io'
import { runOnePath } from '../../src/engine/run'

describe('browser engine input', () => {
  const full = loadBuild()

  it('trimmed browser build runs identically to the full build', () => {
    const params = loadParams(), specs = loadConditionSpecs()
    const asOf = latestBuildDate(full), grid = makeGrid()
    const run = (b: BuildData) => runOnePath({ build: b, params, asOf, start: '2026Q3',
      conditions: buildConditions(asOfView(b, asOf), grid, asOf, { specs, params }) })
    expect(JSON.stringify(run(trimBuild(full)))).toBe(JSON.stringify(run(full)))
  })

  it('no engine module (or data module it imports) except node-io uses node built-ins', () => {
    const files = [...globSync('src/engine/**/*.ts'), 'src/data/schema.ts', 'src/data/quarters.ts'].filter(f => !f.endsWith('node-io.ts'))
    for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(/from 'node:/)
  })

  it('trimmed series are smaller', () => {
    expect(JSON.stringify(trimBuild(full).series).length).toBeLessThan(2.5e6)
  })
})

describe('makeBundle', () => {
  it('carries asOf, the first simulated quarter and the comparisons', async () => {
    const { makeBundle } = await import('../../src/engine/browser-input')
    const b = makeBundle(loadBuild(), loadParams(), loadConditionSpecs(), JSON.parse(readFileSync('data/build/engine-baseline.json', 'utf8')).comparisons)
    expect(b.asOf).toBe(latestBuildDate(loadBuild()))
    expect(b.start).toBe('2026Q3')
    expect(b.comparisons.nvidiaRevenueConsensus.length).toBeGreaterThan(0)
  })
})
