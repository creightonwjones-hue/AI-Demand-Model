import { describe, expect, it } from 'vitest'
import { loadBuild } from '../../src/engine/asof'
import { calibrate } from '../../src/engine/calibrate'
import { loadParams, param } from '../../src/engine/params'

describe('calibrate', () => {
  const build = loadBuild()

  it('picks a value from the grid and reports fit and holdout error', () => {
    const res = calibrate(build, loadParams(), ['overExtrapolation'], { overExtrapolation: [0.8, 1.0, 1.2] })
    expect([0.8, 1.0, 1.2]).toContain(param(res.best, 'overExtrapolation'))
    expect(Number.isFinite(res.fitMape) && Number.isFinite(res.holdoutMape)).toBe(true)
  }, 30_000)

  it('never leaves a param outside its min/max and rejects unknown keys', () => {
    const p = loadParams()
    const max = p.overExtrapolation.max!
    const res = calibrate(build, p, ['overExtrapolation'], { overExtrapolation: [max + 10] })
    expect(param(res.best, 'overExtrapolation')).toBe(p.overExtrapolation.value)
    expect(() => calibrate(build, p, ['notAParam'], { notAParam: [1] })).toThrow(/unknown param/)
  }, 30_000)
})
