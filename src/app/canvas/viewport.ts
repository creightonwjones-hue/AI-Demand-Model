// Pan/zoom maths for the canvas: screen = world × k + (x, y).
export interface Viewport { x: number; y: number; k: number }
export interface Bounds { x: number; y: number; w: number; h: number }

export const K_MIN = 0.3;
export const K_MAX = 6;

/** Zoom by `factor` keeping the world point under screen (px, py) fixed. */
export function zoomAt(v: Viewport, px: number, py: number, factor: number, kMin = K_MIN, kMax = K_MAX): Viewport {
  const k = Math.min(kMax, Math.max(kMin, v.k * factor));
  const wx = (px - v.x) / v.k, wy = (py - v.y) / v.k;
  return { k, x: px - wx * k, y: py - wy * k };
}

/** Viewport that shows `b` centred on a screen of w × h with `pad` pixels around it. */
export function fit(b: Bounds, w: number, h: number, pad = 40): Viewport {
  const k = Math.min(K_MAX, Math.max(K_MIN, Math.min((w - 2 * pad) / b.w, (h - 2 * pad) / b.h)));
  return { k, x: w / 2 - (b.x + b.w / 2) * k, y: h / 2 - (b.y + b.h / 2) * k };
}
