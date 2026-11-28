import { describe, expect, it } from 'vitest'
import { aspAt } from '../../src/engine/supply-path'
import { asOfView } from '../../src/engine/asof'
import { loadBuild } from '../../src/engine/node-io'
import { buildConditions, withUserPath } from '../../src/engine/conditions'
import { makeGrid } from '../../src/engine/grid'
import { initState, type EngineState } from '../../src/engine/init'
import { stepClouds, CLOUDS, CASH_FUNDED, type CloudsOut } from '../../src/engine/layers/clouds'
const CASH_FUNDED_IDS: readonly string[] = CASH_FUNDED
import { stepChips, supplyCapacity } from '../../src/engine/layers/chips'
import type { DemandOut } from '../../src/engine/layers/demand'
import { param } from '../../src/engine/params'
import { loadParams } from '../../src/engine/node-io'
import type { ConditionId, Conditions } from '../../src/engine/types'

const ASOF = '2026-11-26'
const grid = makeGrid()
const view = asOfView(loadBuild(), ASOF)
const params = loadParams()
const base = buildConditions(view, grid, ASOF)
const fresh = (): EngineState => initState(view, params, grid, '2026Q4')
const Q = grid.quarters[fresh().q]
const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0)

function conds(over: Partial<Record<ConditionId, number>>): Conditions {
  let c = base
  for (const [id, v] of Object.entries({ creditSpread: 1.5, riskFree: 4, powerGw: 1e4, ...over }))
    c = withUserPath(c, id as ConditionId, { [Q]: v as number })
  return c
}
function demandOut(computeNeedUsd: Record<string, number>): DemandOut {
  return {
    spendBySegment: { consumer: 0, enterprise: 0, sovereign: 0, china: 0, physicalAi: 0 },
    labRevenue: {}, computeNeedUsd, physicalAiSpend: 0, ceilingBound: false, flows: [],
  }
}
function cloudsOut(chipBudgetEach: number): CloudsOut {
  const chipBudgetByCloud = Object.fromEntries(CLOUDS.map(c => [c, chipBudgetEach]))
  return { rentByCloud: {}, aiCapexByCloud: chipBudgetByCloud, chipBudgetByCloud, buildingsCapexByCloud: {}, newLoans: [], flows: [] }
}

describe('stepClouds', () => {
  it('rents lab compute need, filling the lab\'s contracted clouds first', () => {
    const s = fresh()
    const contracted = s.obligations.filter(o => o.quarter === Q && o.payer === 'openai' && o.kind === 'compute-rent')
    expect(contracted.some(o => o.payee === 'coreweave')).toBe(true)
    const cl = stepClouds(s, demandOut({ openai: 10e9 }), conds({}), params)
    expect(sum(cl.rentByCloud)).toBeCloseTo(10e9, -3)
    // need (10B) < OpenAI's contracted rent this quarter, so it is filled entirely by contracts, in schedule order
    expect(cl.rentByCloud.microsoft).toBeCloseTo(10e9, -3)
    expect(cl.flows.filter(f => f.kind === 'compute-rent')).toEqual([])
  })

  it('emits rent flows only for need beyond contracts (contracts are paid as obligations)', () => {
    const s = fresh()
    const contracted = sum(Object.fromEntries(s.obligations
      .filter(o => o.quarter === Q && o.payer === 'openai' && o.kind === 'compute-rent').map((o, i) => [i, o.amountUsd])))
    const need = contracted + 5e9
    const cl = stepClouds(s, demandOut({ openai: need }), conds({}), params)
    const flowed = cl.flows.filter(f => f.kind === 'compute-rent').reduce((a, f) => a + f.amountUsd, 0)
    expect(flowed).toBeCloseTo(5e9, -3)
  })

  it('gives a debt-funded cloud no capex when it has no cash and credit is shut', () => {
    const s = fresh()
    s.ledger.sheets.coreweave.cash = 0
    const capped = stepClouds(s, demandOut({ openai: 50e9 }), conds({ creditSpread: 30 }), params)
    expect(capped.aiCapexByCloud.coreweave).toBe(0)
    expect(capped.newLoans.filter(l => l.borrower === 'coreweave')).toEqual([])
  })

  it('splits capex into chips and buildings, and keeps it within funds', () => {
    const s = fresh()
    const cl = stepClouds(s, demandOut({ openai: 40e9, anthropic: 30e9 }), conds({}), params)
    for (const c of CLOUDS) {
      expect(cl.chipBudgetByCloud[c] + cl.buildingsCapexByCloud[c]).toBeCloseTo(cl.aiCapexByCloud[c], -3)
      const funds = Math.max(0, s.ledger.sheets[c].cash) + (CASH_FUNDED_IDS.includes(c) ? cl.rentByCloud[c] + (s.memory[`corecash:${c}`] ?? 0) : 0) + sum(Object.fromEntries(cl.newLoans.filter(l => l.borrower === c).map((l, i) => [i, l.amountUsd])))
      expect(cl.aiCapexByCloud[c]).toBeLessThanOrEqual(funds + 1)
    }
  })
})

describe('stepChips', () => {
  it('caps shipments at supply capacity and books the shortfall to backlog', () => {
    const s = fresh()
    const before = s.market.backlogUnits
    const tight = stepChips(s, cloudsOut(1e12), conds({}), params)
    expect(tight.shippedUnits).toBeLessThanOrEqual(supplyCapacity(s, conds({}), params).units + 1)
    expect(tight.shortfallUnits).toBeGreaterThan(0)
    expect(tight.bindingConstraint).not.toBe('none')
    expect(s.market.backlogUnits).toBeCloseTo(before + tight.ordersUnits - tight.shippedUnits, 0)
    expect(s.market.backlogUnits).toBeGreaterThanOrEqual(tight.shortfallUnits)
    expect(tight.events.some(e => e.kind === 'supply-bound')).toBe(true)
  })

  it('ships everything when demand is small, and NVIDIA Data Center splits by buyer group', () => {
    const loose = stepChips(fresh(), cloudsOut(1e9), conds({}), params)
    expect(loose.shortfallUnits).toBe(0)
    expect(loose.bindingConstraint).toBe('none')
    expect(loose.nvidia.dataCenter).toBeCloseTo(loose.nvidia.hyperscale + loose.nvidia.aiCloudsEnterprise, -3)
    expect(loose.nvidia.dataCenter).toBeGreaterThan(0)
    expect(loose.nvidia.revenue).toBeCloseTo(loose.nvidia.dataCenter + loose.nvidia.edge + loose.nvidia.physicalAi, -3)
  })

  it('pays suppliers their cost shares and schedules shipped units into the pipeline', () => {
    const s = fresh()
    const out = stepChips(s, cloudsOut(5e9), conds({}), params)
    const chipRevenue = sum(out.revenueByMaker)
    expect(out.supplierRevenue.tsmc).toBeCloseTo(chipRevenue * param(params, 'tsmcShareOfChipCost'), -3)
    expect(out.supplierRevenue['sk-hynix']).toBeCloseTo(chipRevenue * param(params, 'skHynixShareOfChipCost'), -3)
    const arrives = grid.quarters[s.q + param(params, 'gpuLeadQuarters')]
    expect(s.pipeline.filter(p => p.kind === 'gpus' && p.arrives === arrives).reduce((a, p) => a + p.units, 0)).toBeCloseTo(out.shippedUnits, 0)
  })

  it('retires GPUs past their economic life and counts replacement units', () => {
    const s = fresh()
    const life = param(params, 'gpuEconomicLifeQuarters')
    expect(life).toBeGreaterThan(0)
    s.market.installedGpus.push({ quarter: '2020Q1', units: 1000, costUsd: 1, modelled: true }) // older than the grid start, past any life
    const out = stepChips(s, cloudsOut(5e9), conds({}), params)
    expect(out.replacementUnits).toBeGreaterThanOrEqual(1000)
  })
})

describe('capex momentum', () => {
  it('anchors a hyperscaler\'s AI capex to its last reported capex and extrapolates it', () => {
    const s = fresh()
    const reported = s.memory['capex:microsoft']
    expect(reported).toBeGreaterThan(10e9)
    const cl = stepClouds(s, demandOut({}), conds({}), params)
    const expected = reported * param(params, 'hyperscalerAiCapexShare') * (1 + s.expectations.microsoft) * param(params, 'overExtrapolation')
    expect(cl.aiCapexByCloud.microsoft).toBeCloseTo(Math.min(expected, s.ledger.sheets.microsoft.cash + s.memory['corecash:microsoft']), -3)
  })
})

describe('core business cash', () => {
  it('funds a cash-funded hyperscaler\'s AI capex from its non-AI operating cash flow when its cash is gone', () => {
    const s = fresh()
    s.ledger.sheets.microsoft.cash = 0
    const core = s.memory['corecash:microsoft']
    expect(core).toBeGreaterThan(5e9) // reported operating cash flow net of non-AI capex
    const cl = stepClouds(s, demandOut({}), conds({}), params)
    const inflow = cl.flows.filter(f => f.to === 'microsoft' && f.kind === 'core-business-cash')
    expect(inflow).toHaveLength(1)
    expect(inflow[0].from).toBe('rest-of-economy')
    expect(inflow[0].amountUsd).toBeCloseTo(core, -3)
    expect(cl.aiCapexByCloud.microsoft).toBeGreaterThan(0)
    expect(cl.aiCapexByCloud.microsoft).toBeLessThanOrEqual(core + 1)
  })

  it('gives debt-funded clouds no core business cash', () => {
    const cl = stepClouds(fresh(), demandOut({}), conds({}), params)
    expect(cl.flows.some(f => f.kind === 'core-business-cash' && f.to === 'coreweave')).toBe(false)
  })
})

describe('final-review fixes', () => {
  it('ships only units someone pays for: backlog beyond this quarter\'s paid demand stays in backlog', () => {
    const s = fresh()
    s.market.backlogUnits = 2e6
    const out = stepChips(s, cloudsOut(1e9), conds({}), params) // small demand, ample capacity
    const paidUnits = sum(out.revenueByMaker) / aspAt(params, Q)
    const piped = s.pipeline.filter(p => p.kind === 'gpus').reduce((a, p) => a + p.units, 0)
    expect(piped).toBeCloseTo(paidUnits, 0)
    expect(s.market.backlogUnits).toBeGreaterThan(0)
  })

  it('a defaulted cloud buys no chips and gets no capex', () => {
    const s = fresh()
    s.defaulted.coreweave = true
    const cl = stepClouds(s, demandOut({ openai: 50e9 }), conds({}), params)
    expect(cl.aiCapexByCloud.coreweave).toBe(0)
    const out = stepChips(s, cloudsOut(5e9), conds({}), params)
    expect(out.flows.some(f => f.from === 'coreweave' && f.kind === 'chip-purchase')).toBe(false)
  })

  it('an inactive cloud takes no uncontracted rent and builds nothing', () => {
    const s = fresh()
    s.active.nebius = false
    const cl = stepClouds(s, demandOut({ anthropic: 100e9 }), conds({}), params)
    expect(cl.flows.some(f => f.to === 'nebius' || f.from === 'nebius')).toBe(false)
    expect(cl.aiCapexByCloud.nebius).toBe(0)
  })
})
