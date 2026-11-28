import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { formatAmount, LABEL_MIN_USD, renderScene } from '../../src/app/canvas/render'
import { buildScene, type CanvasLayout } from '../../src/app/scene'
import { latestBuildDate } from '../../src/engine/backtest'
import { loadBuild, loadParams } from '../../src/engine/node-io'
import { runOnePath } from '../../src/engine/run'
import type { RunResult } from '../../src/engine/types'

const build = loadBuild()
const layout = JSON.parse(readFileSync('config/canvas-layout.json', 'utf8')) as CanvasLayout
const run = runOnePath({ build, params: loadParams(), asOf: latestBuildDate(build), start: '2026Q3' })
const sc = buildScene(run, build.entities, '2027Q4', layout)
const withDefault = (r: RunResult, id: string, from: string): RunResult =>
  ({ ...r, entities: { ...r.entities, [id]: r.entities[id].map(q => (q.quarter >= from ? { ...q, defaulted: true } : q)) } })

describe('renderScene', () => {
  const html = renderScene(sc, { motion: true })

  it('renders a label chip for every line of $10B a year or more, and a hover label on every line', () => {
    expect((html.match(/<g class="chip[ "]/g) ?? []).length).toBe(sc.edges.filter(e => e.usdPerYear >= LABEL_MIN_USD).length)
    expect((html.match(/<path class="edge[^>]*><title>/g) ?? []).length).toBe(sc.edges.length)
    expect(html).toMatch(/Buys GPUs<\/text><text[^>]*>\$\d+B</)
  })
  it('draws a path per edge and flow dots in motion mode only', () => {
    expect((html.match(/<path class="edge/g) ?? []).length).toBe(sc.edges.length)
    expect(html).toMatch(/<animateMotion/)
    expect(renderScene(sc, { motion: false })).not.toMatch(/<animateMotion/)
  })
  it('draws broken edges dashed red and tags a default', () => {
    const s = buildScene(withDefault(run, 'coreweave', '2027Q1'), build.entities, '2027Q4', layout)
    const out = renderScene(s, { motion: true })
    expect(out).toMatch(/class="edge broken"|class="edge stressed"/)
    expect(out).toMatch(/● Default/)
  })
  it('makes every company focusable with a label', () => {
    const cards = [...html.matchAll(/<g class="card[ "][^>]*>/g)].map(m => m[0])
    expect(cards.length).toBe(sc.blocks.reduce((n, b) => n + (b.group ? b.members.length : 1), 0))
    for (const c of cards) { expect(c).toMatch(/tabindex="0"/); expect(c).toMatch(/aria-label="[^"]+"/) }
  })
  it('escapes names', () => expect(html).toMatch(/Physical AI &amp; edge|Data-centre/))
  it('formats amounts', () => {
    expect(formatAmount(448e9)).toBe('$448B')
    expect(formatAmount(3.24e9)).toBe('$3.2B')
    expect(formatAmount(1.25e12)).toBe('$1.25T')
  })
  it('keeps label chips from overlapping each other', () => {
    const boxes = [...html.matchAll(/<g class="chip[^"]*" data-box="([\d.-]+),([\d.-]+),([\d.-]+),([\d.-]+)"/g)].map(m => m.slice(1).map(Number))
    let overlaps = 0
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const [a, b] = [boxes[i], boxes[j]]
      if (a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3]) overlaps++
    }
    expect(overlaps).toBeLessThanOrEqual(2)
  })
})
