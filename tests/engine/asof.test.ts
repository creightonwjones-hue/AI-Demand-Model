import { mkdtempSync, writeFileSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
  it('throws naming the file on schema failure', () => {
    const dir = mkdtempSync(join(tmpdir(), 'asof-'))
    copyFileSync('data/build/entities.json', join(dir, 'entities.json'))
    writeFileSync(join(dir, 'financials.json'), JSON.stringify([{ entityId: 1 }]))
    expect(() => loadBuild(dir)).toThrow(/financials\.json: schema validation failed/)
  })
  it('throws naming the file when missing or unparseable', () => {
    const dir = mkdtempSync(join(tmpdir(), 'asof-'))
    expect(() => loadBuild(dir)).toThrow(/entities\.json: cannot read\/parse/)
    writeFileSync(join(dir, 'entities.json'), '{not json')
    expect(() => loadBuild(dir)).toThrow(/entities\.json: cannot read\/parse/)
  })
  it('hides terms not yet public at asOf', () => {
    const id = 'coreweave-ddtl-2-1'
    const early = asOfView(build, '2026-01-01').deals.find(d => d.id === id)!
    expect(early.termsHidden).toBe(true)
    expect(early.terms).toEqual({ recourse: 'unknown', takeOrPay: 'unknown', hellOrHighWater: 'unknown' })
    const late = asOfView(build, '2026-11-13').deals.find(d => d.id === id)!
    expect(late.termsHidden).toBeUndefined()
    expect(late.terms).toEqual(build.deals.find(d => d.id === id)!.terms)
  })
  it('picks status by latest event date, ties by later asKnownAt', () => {
    const base = build.deals[0]
    const mk = (statusHistory: any[]) => ({ ...base, announced: '2020-01-01', statusHistory })
    // known order differs from event-date order: 'completed' (date 03-01) learned before 'signed' (date 02-01)
    const d1 = mk([
      { date: '2020-03-01', asKnownAt: '2020-03-02', status: 'completed' },
      { date: '2020-02-01', asKnownAt: '2020-04-01', status: 'signed' },
    ])
    expect(asOfView({ ...build, deals: [d1] }, '2020-12-31').deals[0].statusAsOf).toBe('completed')
    const d2 = mk([
      { date: '2020-03-01', asKnownAt: '2020-03-05', status: 'signed' },
      { date: '2020-03-01', asKnownAt: '2020-03-09', status: 'completed' },
    ])
    expect(asOfView({ ...build, deals: [d2] }, '2020-12-31').deals[0].statusAsOf).toBe('completed')
    expect(asOfView({ ...build, deals: [d2] }, '2020-03-06').deals[0].statusAsOf).toBe('signed')
  })
})
