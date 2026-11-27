import { describe, expect, it } from 'vitest'
import { asOfView, loadBuild } from '../../src/engine/asof'

describe('asOfView', () => {
  const build = loadBuild()
  it('hides deals announced after asOf', () => {
    const v24 = asOfView(build, '2024-12-31')
    expect(v24.deals.some(d => d.id === 'nvidia-openai-ohio-backstop')).toBe(false)
    expect(v24.deals.every(d => d.announced <= '2024-12-31')).toBe(true)
  })
  it('returns facts known by asOf', () => {
    const v24 = asOfView(build, '2024-12-31')
    expect(v24.fact('oracle', 'revenue', '2022Q2')!.value).toBeCloseTo(11.84e9, -7)
    expect(asOfView(build, '2022-06-30').fact('coreweave', 'revenue', '2022Q1')).toBeUndefined()
  })
  it('filters series points by asKnownAt', () => {
    const v24 = asOfView(build, '2024-12-31')
    expect(v24.series('cds5y-coreweave-spgmi').every(p => p.asKnownAt! <= '2024-12-31')).toBe(true)
    expect(v24.series('no-such-series')).toEqual([])
  })
  it('applies deal status only from asKnownAt', () => {
    const id = 'nvidia-anthropic-ipo-placement'
    const pre = asOfView(build, '2026-11-21').deals.find(d => d.id === id)!
    expect(pre.statusAsOf).not.toBe('completed')
    expect(pre.statusHistory.every(s => s.asKnownAt <= '2026-11-21')).toBe(true)
    expect(asOfView(build, '2026-11-26').deals.find(d => d.id === id)!.statusAsOf).toBe('completed')
  })
  it('falls back to announced when no status entry is known', () => {
    const d = build.deals.find(x => x.statusHistory.length > 0)!
    const first = d.statusHistory.map(s => s.asKnownAt).sort()[0]
    const v = asOfView({ ...build, deals: [{ ...d, announced: '1990-01-01' }] }, '1991-01-01')
    expect(first > '1991-01-01').toBe(true)
    expect(v.deals[0].statusAsOf).toBe('announced')
  })
  it('throws naming the file on invalid data', () => {
    expect(() => loadBuild('tests/fixtures')).toThrow()
  })
})
