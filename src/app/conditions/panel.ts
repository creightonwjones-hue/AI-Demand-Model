// Conditions panel: one small chart per condition (history solid, forecast range shaded, your path with handles).
// Dragging a handle moves that quarter and eases its neighbours; letting go re-runs the engine once.
import type { QuarterKey } from '../../data/schema';
import { escapeHtml as esc } from '../../explorer/format';
import { CONDITION_IDS } from '../../engine/conditions';
import type { ConditionId, Conditions, Grid } from '../../engine/types';
import type { Overrides } from '../url-state';
import { chartModel, clampValue, dragPath, outsideForecasts, quarterOf, type ConditionBounds } from './chart';

const W = 268, H = 84;

export interface PanelInput {
  conditions: Conditions; base?: Conditions; overrides: Overrides; name?: string; grid: Grid; asOf: string;
  /** One line on the result, e.g. "NVIDIA FY2028 revenue $507B (−30% vs consensus)". */
  result?: string;
  names: Partial<Record<ConditionId, string>>; bounds: ConditionBounds;
}
export interface PanelCallbacks { onChange(o: Overrides): void; onName(name: string): void; onClose(): void }

/** Conditions the user moved, and how many of those sit outside the forecast range somewhere. */
export function conditionCounts(c: Conditions, o: Overrides, grid: Grid): { changed: number; outside: number } {
  const ids = Object.keys(o) as ConditionId[];
  const outside = ids.filter(id => Object.entries(o[id] ?? {}).some(([q, v]) => outsideForecasts(c[id], q as QuarterKey, v as number, grid))).length;
  return { changed: ids.length, outside };
}

const fmt = (v: number, unit: string) => {
  if (/USD per year/.test(unit)) return `$${(v / 1e9).toFixed(0)}B/yr`;
  if (/percent/.test(unit)) return `${v.toFixed(2)}%`;
  if (/GW/.test(unit)) return `${v.toFixed(0)} GW`;
  if (/GPU-hour/.test(unit)) return `$${v.toFixed(2)}/h`;
  return v.toFixed(2);
};

function chartCard(id: ConditionId, p: PanelInput): string {
  const path = p.conditions[id];
  const name = p.names[id] ?? id;
  const moved = !!p.overrides[id];
  const b = p.bounds[id];
  if (b?.setting) {
    const first = quarterOf(p.asOf);
    const v = path.values[p.grid.idx(first)];
    const out = outsideForecasts(path, first, v, p.grid);
    return `<div class="cc" data-id="${id}"><div class="cc-h"><b>${esc(name)}</b>${moved ? '<button type="button" class="cc-reset">Reset</button>' : ''}</div>
      <div class="cc-set"><button type="button" class="cc-step" data-step="-0.1" aria-label="Lower ${esc(name)}">−</button>
      <span class="cc-val${out ? ' out' : ''}">${v.toFixed(2)}</span><button type="button" class="cc-step" data-step="0.1" aria-label="Raise ${esc(name)}">+</button>
      <span class="cc-note">A setting for all quarters · forecast range ${path.low[p.grid.idx(first)].toFixed(2)}–${path.high[p.grid.idx(first)].toFixed(2)}</span></div>
      ${out ? '<div class="cc-out">Outside forecasts</div>' : ''}</div>`;
  }
  const m = chartModel(path, p.grid, p.asOf, W, H);
  const anyOut = m.handles.some(h => h.outside);
  const line = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  const last = path.values[path.values.length - 1];
  const base = p.base?.[id];
  const was = moved && base ? ` <span class="cc-was">(was ${fmt(base.values[base.values.length - 1], path.unit)})</span>` : '';
  const orig = moved && base ? `<path class="cc-orig" d="${line(m.handles.map(h => [h.x, m.valueToY(base.values[p.grid.idx(h.quarter)])] as [number, number]))}"/>` : '';
  return `<div class="cc${anyOut ? ' has-out' : ''}${moved ? ' moved' : ''}" data-id="${id}">
    <div class="cc-h"><b>${esc(name)}</b>${anyOut ? '<span class="cc-pill">Outside forecasts</span>' : `<span class="cc-v">${fmt(last, path.unit)} in 2030${was}</span>`}</div>
    <svg class="cc-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(name)}: drag the dots to change the path">
      <path class="cc-band" d="${m.band}"><title>Forecast range: ${esc(path.rangeSource)}</title></path>
      <path class="cc-hist" d="${line(m.history)}"/>${orig}<path class="cc-path" d="${line(m.path)}"/>
      ${m.handles.map((h, k) => `<circle class="cc-hd${h.outside ? ' out' : ''}" data-q="${h.quarter}" cx="${h.x.toFixed(1)}" cy="${h.y.toFixed(1)}" r="${k % 2 ? 2 : 3.6}" tabindex="${k % 4 ? -1 : 0}"><title>${h.quarter.replace(/(\d{4})Q(\d)/, 'Q$2 $1')}: ${fmt(path.values[p.grid.idx(h.quarter)], path.unit)}</title></circle>`).join('')}
    </svg>
    ${moved ? `<div class="cc-foot">${anyOut ? `<span>${fmt(last, path.unit)} in 2030${was}</span>` : '<span></span>'}<button type="button" class="cc-reset">Reset</button></div>` : ''}</div>`;
}

export function mountConditions(host: HTMLElement, cb: PanelCallbacks) {
  const el = document.createElement('section');
  el.className = 'fl cpanel';
  el.setAttribute('aria-label', 'Conditions');
  el.hidden = true;
  host.append(el);
  let input: PanelInput | undefined;

  const change = (id: ConditionId, add: Partial<Record<QuarterKey, number>> | undefined) => {
    if (!input) return;
    const o: Overrides = { ...input.overrides };
    if (add) o[id] = { ...(o[id] ?? {}), ...add }; else delete o[id];
    cb.onChange(o);
  };

  el.addEventListener('click', e => {
    const t = e.target as HTMLElement;
    const card = t.closest<HTMLElement>('.cc');
    if (t.closest('.cp-close')) cb.onClose();
    else if (t.closest('.cp-reset-all')) cb.onChange({});
    else if (card && t.closest('.cc-reset')) change(card.dataset.id as ConditionId, undefined);
    else if (card && input && t.closest('.cc-step')) {
      const id = card.dataset.id as ConditionId;
      const first = quarterOf(input.asOf);
      const cur = input.conditions[id].values[input.grid.idx(first)];
      const v = clampValue(id, Math.round((cur + Number(t.closest<HTMLElement>('.cc-step')!.dataset.step)) * 100) / 100, input.bounds);
      change(id, Object.fromEntries(input.grid.quarters.filter(q => q >= first).map(q => [q, v])));
    }
  });

  // Drag a handle: live preview while moving, one engine run on release.
  let drag: { id: ConditionId; q: QuarterKey; svg: SVGSVGElement; pending?: Partial<Record<QuarterKey, number>> } | undefined;
  el.addEventListener('pointerdown', e => {
    const hd = (e.target as Element).closest<SVGCircleElement>('.cc-hd');
    if (!hd || !input) return;
    const card = hd.closest<HTMLElement>('.cc')!;
    drag = { id: card.dataset.id as ConditionId, q: hd.dataset.q as QuarterKey, svg: hd.ownerSVGElement! };
    hd.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  el.addEventListener('pointermove', e => {
    if (!drag || !input) return;
    const r = drag.svg.getBoundingClientRect();
    const y = ((e.clientY - r.top) / r.height) * H;
    const path = input.conditions[drag.id];
    const m = chartModel(path, input.grid, input.asOf, W, H);
    const v = clampValue(drag.id, m.yToValue(y), input.bounds);
    drag.pending = dragPath(path.values, input.grid, input.grid.idx(drag.q), v, quarterOf(input.asOf));
    // Preview: move the affected handles and redraw the line.
    for (const [q, val] of Object.entries(drag.pending)) {
      const c = drag.svg.querySelector<SVGCircleElement>(`.cc-hd[data-q="${q}"]`);
      if (c) { c.setAttribute('cy', m.valueToY(val as number).toFixed(1)); c.classList.toggle('out', outsideForecasts(path, q as QuarterKey, val as number, input.grid)); }
    }
    const pts = Array.from(drag.svg.querySelectorAll<SVGCircleElement>('.cc-hd')).map(c => `${c.getAttribute('cx')},${c.getAttribute('cy')}`);
    drag.svg.querySelector('.cc-path')!.setAttribute('d', `M${pts.join(' L')}`);
  });
  const release = () => { if (drag?.pending) change(drag.id, drag.pending); drag = undefined; };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', () => { drag = undefined; });
  el.addEventListener('keydown', e => {
    const hd = (e.target as Element).closest<SVGCircleElement>('.cc-hd');
    if (!hd || !input || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    const id = hd.closest<HTMLElement>('.cc')!.dataset.id as ConditionId;
    const path = input.conditions[id];
    const i = input.grid.idx(hd.dataset.q as QuarterKey);
    const step = (Math.max(...path.high) - Math.min(...path.low)) / 40 || 0.1;
    change(id, dragPath(path.values, input.grid, i, clampValue(id, path.values[i] + (e.key === 'ArrowUp' ? step : -step), input.bounds), quarterOf(input.asOf)));
    e.preventDefault();
  });

  return {
    el,
    toggle(open?: boolean) { el.hidden = open === undefined ? !el.hidden : !open; },
    render(p: PanelInput) {
      input = p;
      if (el.hidden) return;
      const focused = (document.activeElement as HTMLElement | null)?.closest?.('.cpanel') ? document.activeElement : null;
      const keepName = focused?.classList.contains('cp-name');
      el.innerHTML = `<div class="cp-head"><b>Conditions</b><span class="cp-sub">Drag the dots on any line to change what happens. The model re-runs when you let go.</span>
        <button type="button" class="cp-close" aria-label="Close conditions">×</button></div>
        <div class="cp-bar"><label>Name this setup <input class="cp-name" maxlength="80" placeholder="e.g. Credit squeeze" value="${esc(p.name ?? '')}"></label>
        <button type="button" class="cp-reset-all"${Object.keys(p.overrides).length ? '' : ' disabled'}>Reset all</button></div>
        <div class="cp-grid">${CONDITION_IDS.map(id => chartCard(id, p)).join('')}</div>
        <div class="cp-foot">${Object.keys(p.overrides).length} edited${p.result ? ` · ${esc(p.result)}` : ''}</div>`;
      const nameInput = el.querySelector<HTMLInputElement>('.cp-name')!;
      nameInput.addEventListener('input', () => cb.onName(nameInput.value));
      if (keepName) { nameInput.focus(); nameInput.setSelectionRange(nameInput.value.length, nameInput.value.length); }
    },
  };
}
