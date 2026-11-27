import { describe, expect, it } from 'vitest'
import { loadParams, param } from '../../src/engine/params'

describe('engine params', () => {
  const p = loadParams()
  it('reads values and ranges', () => {
    expect(param(p, 'gpuLeadQuarters')).toBe(3)
    expect(p.gpuLeadQuarters.min).toBe(2)
    expect(p.buildingLeadQuarters.max).toBe(16)
  })
  it('throws on unknown key', () => {
    expect(() => param(p, 'nope')).toThrow(/unknown param/i)
  })
  it('documents every param', () => {
    for (const [k, v] of Object.entries(p)) {
      expect(v.description.length, k).toBeGreaterThan(20)
      expect(v.unit.length, k).toBeGreaterThan(0)
      expect(v.source.length, k).toBeGreaterThan(0)
      expect(Number.isFinite(v.value), k).toBe(true)
      if (v.min !== undefined) expect(v.value, k).toBeGreaterThanOrEqual(v.min)
      if (v.max !== undefined) expect(v.value, k).toBeLessThanOrEqual(v.max)
    }
  })
  it('contains every brief key', () => {
    const keys = ['gpuLeadQuarters','buildingLeadQuarters','computeCostShare','overExtrapolation','expectationGain',
      'hyperscalerAiCapexShare','chipShareOfAiCapex','nvidiaShareOfAccelerators','nvidiaAspUsd','nvidiaGrossMargin',
      'bullwhipInventoryWeeks','bullwhipCorrectionRate','gpuEconomicLifeQuarters','gpuAccountingLifeQuarters',
      'labShareDrift','defaultRunwayQuarters','defaultContractQuarters','aiAddressableWageBillUsd',
      'cowosUnitsPerQuarter','hbmUnitsPerQuarter','kwPerAccelerator','powerLoadFactor','tsmcShareOfChipCost',
      'skHynixShareOfChipCost','asmlShareOfTsmcCapex','cloudOperatingCostRatio','labOperatingCostRatio']
    for (const k of keys) expect(p[k], k).toBeDefined()
  })
  it('rejects out-of-range values naming the key', () => {
    expect(() => loadParams('tests/fixtures/params-out-of-range.json')).toThrow(/gpuLeadQuarters/)
  })
})
