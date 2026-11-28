import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildScene, type CanvasLayout } from '../../src/app/scene'
import { latestBuildDate } from '../../src/engine/backtest'
import { loadBuild, loadParams } from '../../src/engine/node-io'
import { runOnePath } from '../../src/engine/run'
import type { RunResult } from '../../src/engine/types'

const build = loadBuild()
const layout = JSON.parse(readFileSync('config/canvas-layout.json', 'utf8')) as CanvasLayout
const run = runOnePath({ build, params: loadParams(), asOf: latestBuildDate(build), start: '2026Q3' })
const entities = build.entities
const sc = buildScene(run, entities, '2027Q4', layout)
const ROWS = ['money', 'labs', 'financing', 'cloud', 'chips', 'supply']

/** Copy of the run with `id` marked defaulted from quarter `from` onward. */
function withDefault(r: RunResult, id: string, from: string): RunResult {
  return { ...r, entities: { ...r.entities, [id]: r.entities[id].map(q => (q.quarter >= from ? { ...q, defaulted: true } : q)) } }
}

describe('buildScene', () => {
  it('lays out rows top to bottom in spec order', () => {
    const ys = ROWS.map(l => sc.blocks.filter(b => b.layer === l).map(b => b.y)).filter(a => a.length).map(a => Math.min(...a))
    expect([...ys].sort((a, b) => a - b)).toEqual(ys)
    expect(sc.rows.map(r => r.label)).toEqual(['Money in', 'AI labs', 'Developers & financing', 'Clouds', 'Chip makers', 'Supply chain'])
  })

  it('labels every edge with a title and a positive finite yearly amount above the threshold', () => {
    expect(sc.edges.length).toBeGreaterThan(5)
    expect(sc.edges.every(e => e.label && Number.isFinite(e.usdPerYear) && e.usdPerYear >= 3e9 && e.width >= 1 && e.width <= 4)).toBe(true)
    expect(sc.edges.some(e => e.from === 'cash-clouds' && e.to === 'nvidia' && e.label === 'Buys GPUs')).toBe(true)
  })

  it('shows core business cash as Big Tech profits and hides operating costs', () => {
    expect(sc.edges.some(e => e.from === 'big-tech-profits' && e.to === 'cash-clouds')).toBe(true)
    expect(sc.edges.some(e => e.kind === 'operating-cost')).toBe(false)
    expect(sc.edges.find(e => e.from === 'big-tech-profits')!.label).toBe('Reinvested profits')
    expect(sc.edges.some(e => e.label === 'Interest' || e.label === 'Repays loan')).toBe(false)
    expect(sc.edges.length).toBeLessThanOrEqual(24)
    expect(sc.edges.some(e => e.from === e.to)).toBe(false)
  })

  it('always shows the fund holdings', () => {
    const ids = sc.blocks.flatMap(b => b.members.map(m => m.id))
    expect(['nvidia', 'tsmc', 'sk-hynix', 'alphabet'].every(id => ids.includes(id))).toBe(true)
  })

  it('puts the four cash-funded clouds in one group and the debt-funded in another', () => {
    expect(sc.blocks.find(b => b.id === 'cash-clouds')!.members.map(m => m.id).sort()).toEqual(['alphabet', 'amazon', 'meta', 'microsoft'])
    expect(sc.blocks.find(b => b.id === 'debt-clouds')!.group).toBe(true)
  })

  it('marks a defaulted payer and its lines', () => {
    const s = buildScene(withDefault(run, 'coreweave', '2027Q2'), entities, '2027Q4', layout)
    const debt = s.blocks.find(b => b.id === 'debt-clouds')!
    expect(debt.members.find(m => m.id === 'coreweave')!.status).toBe('default')
    expect(debt.status).toBe('default')
    expect(s.edges.filter(e => e.from === 'debt-clouds').every(e => e.status !== 'ok')).toBe(true)
  })

  it('caps the overview: each block keeps its largest line, big lines always show', () => {
    const froms = new Set(sc.edges.map(e => e.from))
    for (const f of froms) expect(sc.edges.some(e => e.from === f)).toBe(true)
    expect(sc.edges.some(e => e.from === 'cash-clouds' && e.to === 'nvidia')).toBe(true)
  })

  it('draws a group with one company as a plain card', () => {
    for (const b of sc.blocks) if (b.group) expect(b.members.length).toBeGreaterThan(1)
  })

  it('never overlaps blocks in a row', () => {
    for (const l of ROWS) {
      const bs = sc.blocks.filter(b => b.layer === l).sort((a, b) => a.x - b.x)
      for (let i = 1; i < bs.length; i++) expect(bs[i].x).toBeGreaterThanOrEqual(bs[i - 1].x + bs[i - 1].w)
    }
  })

  it('collects events in the four-quarter window, lettered', () => {
    expect(sc.events.every(e => e.quarter <= '2027Q4' && e.quarter > '2026Q4')).toBe(true)
    expect(sc.events.every(e => /^[A-Z]$/.test(e.letter) && e.blockId)).toBe(true)
  })

  it('annualises the first simulated quarters', () => {
    const s = buildScene(run, entities, '2026Q3', layout)
    const e = s.edges.find(x => x.from === 'cash-clouds' && x.to === 'nvidia')!
    const q = run.flows.filter(f => f.quarter === '2026Q3' && f.to === 'nvidia' && ['microsoft', 'alphabet', 'amazon', 'meta'].includes(f.from) && f.label === 'Buys GPUs')
    expect(e.usdPerYear).toBeCloseTo(q.reduce((t, f) => t + f.amountUsd, 0) * 4, -3)
  })
})
