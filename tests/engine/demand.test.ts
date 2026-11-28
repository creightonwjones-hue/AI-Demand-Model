import { describe, expect, it } from 'vitest'
import { asOfView } from '../../src/engine/asof'
import { loadBuild } from '../../src/engine/node-io'
import { buildConditions, withUserPath } from '../../src/engine/conditions'
import { makeGrid } from '../../src/engine/grid'
import { initState } from '../../src/engine/init'
import { stepDemand, type DemandOut } from '../../src/engine/layers/demand'
import { param } from '../../src/engine/params'
import { loadParams } from '../../src/engine/node-io'
import type { ConditionId, Conditions } from '../../src/engine/types'

const ASOF = '2026-11-26'
const grid = makeGrid()
const build = loadBuild()
const view = asOfView(build, ASOF)
const params = loadParams()
const base = buildConditions(view, grid, ASOF)
const freshState = () => initState(view, params, grid, '2026Q4')
const state = freshState()
const Q = grid.quarters[state.q]

const NEUTRAL: Partial<Record<ConditionId, number>> = {
  aiSpend: 400e9, tokenPrice: 1, priceElasticity: 1, exportRegime: 1, physicalAiGrowth: 1, labourSubstitution: 1,
}
function conds(over: Partial<Record<ConditionId, number>>): Conditions {
  let c = base
  for (const [id, v] of Object.entries({ ...NEUTRAL, ...over })) c = withUserPath(c, id as ConditionId, { [Q]: v as number })
  return c
}
const total = (o: DemandOut) => Object.values(o.spendBySegment).reduce((a, b) => a + b, 0)

describe('stepDemand', () => {
  const out = stepDemand(freshState(), conds({}), params)

  it('turns annual AI spend into quarterly segment spend', () => {
    expect(total(out)).toBeCloseTo(100e9, -6)
    expect(out.ceilingBound).toBe(false)
  })

  it('applies price elasticity: elastic demand grows when cheaper, inelastic shrinks', () => {
    expect(total(stepDemand(freshState(), conds({ tokenPrice: 0.5, priceElasticity: 1.5 }), params))).toBeGreaterThan(total(out))
    expect(total(stepDemand(freshState(), conds({ tokenPrice: 0.5, priceElasticity: 0.5 }), params))).toBeLessThan(total(out))
  })

  it('zeroes China when exports are closed and scales it otherwise', () => {
    expect(stepDemand(freshState(), conds({ exportRegime: 0 }), params).spendBySegment.china).toBe(0)
    const half = stepDemand(freshState(), conds({ exportRegime: 0.5 }), params).spendBySegment.china
    expect(half).toBeCloseTo(out.spendBySegment.china / 2, -3)
  })

  it('caps spend at the labour-substitution ceiling', () => {
    const capped = stepDemand(freshState(), conds({ aiSpend: 1e15, labourSubstitution: 0.01 }), params)
    expect(capped.ceilingBound).toBe(true)
    expect(total(capped)).toBeLessThanOrEqual(0.01 * param(params, 'aiAddressableWageBillUsd') / 4 + 1)
  })

  it('splits non-physical spend across labs and derives their compute need', () => {
    const labs = Object.values(out.labRevenue).reduce((a, b) => a + b, 0)
    expect(labs).toBeCloseTo(total(out) - out.physicalAiSpend, -3)
    for (const [lab, rev] of Object.entries(out.labRevenue))
      expect(out.computeNeedUsd[lab]).toBeCloseTo(rev * param(params, 'computeCostShare'), -3)
  })

  it('emits customer-spend flows that add up to the spend', () => {
    expect(out.flows.every(f => f.kind === 'customer-spend' && f.quarter === Q && f.amountUsd >= 0)).toBe(true)
    expect(out.flows.reduce((a, f) => a + f.amountUsd, 0)).toBeCloseTo(total(out), -3)
    expect(out.flows.filter(f => f.to !== 'nvidia').every(f => f.label === 'Subscriptions & API')).toBe(true)
  })

  it('keeps lab shares summing to one after drift', () => {
    const s = freshState()
    stepDemand(s, conds({}), params)
    expect(Object.values(s.market.labShares).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9)
  })
})
