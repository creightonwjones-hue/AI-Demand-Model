import { describe, expect, it } from 'vitest'
import { fit, zoomAt } from '../../src/app/canvas/viewport'

describe('viewport', () => {
  it('zooms about the cursor', () => {
    const v = zoomAt({ x: 0, y: 0, k: 1 }, 200, 100, 2)
    expect((200 - v.x) / v.k).toBeCloseTo(200)
    expect((100 - v.y) / v.k).toBeCloseTo(100)
    expect(v.k).toBe(2)
  })
  it('clamps zoom', () => {
    expect(zoomAt({ x: 0, y: 0, k: 5 }, 0, 0, 10).k).toBe(6)
    expect(zoomAt({ x: 0, y: 0, k: 0.4 }, 0, 0, 0.1).k).toBe(0.3)
  })
  it('fit centres the bounds inside the padding', () => {
    const v = fit({ x: 0, y: 0, w: 1000, h: 500 }, 1440, 900)
    expect(v.k).toBeCloseTo(Math.min((1440 - 80) / 1000, (900 - 80) / 500))
    expect(v.x + 500 * v.k).toBeCloseTo(720)
    expect(v.y + 250 * v.k).toBeCloseTo(450)
  })
})
