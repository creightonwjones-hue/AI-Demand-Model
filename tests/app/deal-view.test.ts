import { describe, expect, it } from 'vitest'
import { dealStructure, relatedDeals } from '../../src/app/deal-view'
import { asOfView } from '../../src/engine/asof'
import { latestBuildDate } from '../../src/engine/backtest'
import { loadBuild } from '../../src/engine/node-io'

const build = loadBuild()
const view = asOfView(build, latestBuildDate(build))
const deal = (id: string) => view.deals.find(d => d.id === id)!
const entities = build.entities

describe('dealStructure', () => {
  it('shows each value field by its own name and never a total', () => {
    const s = dealStructure(deal('coreweave-ddtl-3'), entities)
    expect(s.terms.some(t => /ceiling/i.test(t.label) && t.value === '$2.6B')).toBe(true)
    expect(s.terms.some(t => /total|sum/i.test(t.label))).toBe(false)
  })
  it('says "Not yet public" for hidden terms', () => {
    const hidden = asOfView(build, '2025-08-01').deals.find(d => d.termsHidden)!
    expect(hidden).toBeDefined()
    expect(dealStructure(hidden, entities).terms.some(t => t.value === 'Not yet public')).toBe(true)
  })
  it('lists every party with a role and the vehicle in between', () => {
    const s = dealStructure(deal('coreweave-ddtl-3'), entities)
    expect(s.parties.every(p => p.role.length > 0)).toBe(true)
    expect(s.parties.find(p => p.id === 'coreweave')!.role).toBe('Receives')
    expect(s.vehicles.map(v => v.id)).toContain('spv-coreweave-ddtl')
    expect(s.links.every(l => l.label.length > 0)).toBe(true)
  })
  it('names guarantors', () => {
    const g = view.deals.find(d => d.guarantors.length > 0)!
    expect(dealStructure(g, entities).parties.some(p => p.role === 'Guarantees')).toBe(true)
  })
})

describe('relatedDeals', () => {
  it('finds deals between the companies on either end of a line', () => {
    const ds = relatedDeals([['openai', 'coreweave']], view.deals)
    expect(ds.map(d => d.id)).toEqual(expect.arrayContaining(['openai-coreweave-2025-03']))
  })
  it('includes lending in either direction (lender pays, borrower repays)', () => {
    const ds = relatedDeals([['coreweave', 'morgan-stanley']], view.deals)
    expect(ds.map(d => d.id)).toContain('coreweave-ddtl-3')
  })
  it('returns nothing for companies without a deal', () => {
    expect(relatedDeals([['ai-customers-consumer', 'openai']], view.deals)).toEqual([])
  })
})
