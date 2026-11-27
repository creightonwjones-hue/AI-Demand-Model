import { describe, expect, it } from 'vitest'
import { makeGrid } from '../../src/engine/grid'

describe('makeGrid', () => {
  it('spans 2022Q1..2030Q4 by default', () => {
    const g = makeGrid()
    expect(g.quarters.length).toBe(36)
    expect(g.quarters[0]).toBe('2022Q1')
    expect(g.quarters[35]).toBe('2030Q4')
    expect(g.idx('2026Q3')).toBe(18)
  })
  it('throws for quarters outside the grid', () => {
    const g = makeGrid()
    expect(() => g.idx('2031Q1')).toThrow()
    expect(() => g.idx('2021Q4')).toThrow()
  })
  it('accepts custom bounds', () => {
    const g = makeGrid('2025Q1', '2025Q4')
    expect(g.quarters).toEqual(['2025Q1', '2025Q2', '2025Q3', '2025Q4'])
  })
})
