// The canvas element: an SVG with a dot grid and one transformed world group; pan by dragging, zoom with the wheel,
// pinch, +/−/Fit buttons and the keyboard (arrows pan, + and − zoom, 0 fits).
import './canvas.css';
import { renderScene, type RenderOptions } from './render';
import { fit, zoomAt, type Viewport } from './viewport';
import type { Scene } from '../scene';

export interface CanvasHandle {
  draw(scene: Scene, opts: RenderOptions): void;
  fitAll(): void;
  zoomBy(f: number): void;
  setView(v: Viewport): void;
  view(): Viewport;
  svg: SVGSVGElement;
}

export function mountCanvas(host: HTMLElement, onZoom: (k: number) => void): CanvasHandle {
  host.insertAdjacentHTML('beforeend', `<svg class="cv" role="application" aria-label="Money flows between AI companies" tabindex="0">
    <defs><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1.1" fill="#dfe3e8"/></pattern></defs>
    <rect class="grid" width="100%" height="100%" fill="url(#dots)"/><g class="world"></g></svg>`);
  const svg = host.querySelector<SVGSVGElement>('svg.cv')!;
  const world = svg.querySelector<SVGGElement>('g.world')!;
  let v: Viewport = { x: 0, y: 0, k: 1 };
  let scene: Scene | undefined;
  const apply = () => { world.setAttribute('transform', `translate(${v.x.toFixed(1)},${v.y.toFixed(1)}) scale(${v.k.toFixed(4)})`); onZoom(v.k); };
  const size = () => svg.getBoundingClientRect();

  const handle: CanvasHandle = {
    svg,
    draw(s, opts) { const first = !scene; scene = s; world.innerHTML = renderScene(s, opts); if (first) handle.fitAll(); },
    fitAll() {
      if (!scene) return;
      const r = size();
      // Leave room for the floating controls: top bar, right card, bottom timeline.
      // Fit in the area left of the results card, never above 110% (cards stay readable, not oversized).
      v = fit({ x: 0, y: 10, w: scene.width, h: scene.height }, r.width - 300, r.height - 120, 20);
      if (v.k > 1.1) v = fit({ x: 0, y: 10, w: scene.width, h: scene.height }, (r.width - 300) * (1.1 / v.k) + 40, (r.height - 120) * (1.1 / v.k) + 40, 20) && { k: 1.1, x: (r.width - 300) / 2 - (scene.width / 2) * 1.1, y: (r.height - 120) / 2 + 60 - (10 + scene.height / 2) * 1.1 };
      else v = { ...v, x: v.x + 10, y: v.y + 60 };
      apply();
    },
    zoomBy(f) { const r = size(); v = zoomAt(v, r.width / 2, r.height / 2, f); apply(); },
    setView(nv) { v = nv; apply(); },
    view: () => v,
  };

  let drag: { x: number; y: number; vx: number; vy: number } | undefined;
  const pointers = new Map<number, { x: number; y: number }>();
  let pinch: number | undefined;
  svg.addEventListener('pointerdown', e => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if ((e.target as Element).closest('.card, .chip')) return;
    svg.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY, vx: v.x, vy: v.y };
    svg.classList.add('dragging');
  });
  svg.addEventListener('pointermove', e => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) { const r = size(); v = zoomAt(v, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, d / pinch); apply(); }
      pinch = d;
      return;
    }
    if (!drag) return;
    v = { ...v, x: drag.vx + e.clientX - drag.x, y: drag.vy + e.clientY - drag.y };
    apply();
  });
  const end = (e: PointerEvent) => { pointers.delete(e.pointerId); pinch = undefined; drag = undefined; svg.classList.remove('dragging'); };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const r = size();
    v = zoomAt(v, e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
    apply();
  }, { passive: false });
  svg.addEventListener('keydown', e => {
    const step = 60;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key] && (e.target === svg)) { v = { ...v, x: v.x + moves[e.key][0], y: v.y + moves[e.key][1] }; apply(); e.preventDefault(); }
    else if (e.key === '+' || e.key === '=') handle.zoomBy(1.25);
    else if (e.key === '-') handle.zoomBy(0.8);
    else if (e.key === '0') handle.fitAll();
  });
  window.addEventListener('resize', () => handle.fitAll());
  return handle;
}
