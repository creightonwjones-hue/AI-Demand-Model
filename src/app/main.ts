import './style.css';
import meta from 'virtual:engine-meta';
import layoutJson from '../../config/canvas-layout.json';
import { mountCanvas } from './canvas/canvas';
import { buildScene, type CanvasLayout } from './scene';
import { nvidiaCard, nvidiaCardHtml } from './nvidia-card';
import { mountTimeline, timelineTicks } from './timeline';
import { formatAmount } from './canvas/render';
import { fit } from './canvas/viewport';
import { dealPanelHtml, dealStructure, relatedDeals } from './deal-view';
import { asOfView, type DealView } from '../engine/asof';
import type { Scene, SceneEdge } from './scene';
import { escapeHtml as esc } from '../explorer/format';
import boundsJson from '../../config/condition-bounds.json';
import { conditionCounts, mountConditions } from './conditions/panel';
import type { ConditionBounds } from './conditions/chart';
import type { ConditionId } from '../engine/types';
import type { RunReply } from './run-client';
import { createRunClient } from './run-client';
import { decodeState, encodeState, type AppState } from './url-state';

const app = document.querySelector<HTMLElement>('#app')!;
const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
const client = createRunClient(req => worker.postMessage(req));
worker.onmessage = (e: MessageEvent<RunReply>) => client.onReply(e.data);

const decoded = decodeState(location.hash, meta);
export let state: AppState = decoded.state;
let latest: RunReply | undefined;

function showNote(text: string): void {
  const bar = document.createElement('div');
  bar.className = 'note-bar';
  bar.setAttribute('role', 'status');
  bar.innerHTML = `<span></span><button type="button" aria-label="Dismiss">×</button>`;
  bar.querySelector('span')!.textContent = text;
  bar.querySelector('button')!.onclick = () => bar.remove();
  app.append(bar);
}

let hashTimer: number | undefined;
export function setState(next: Partial<AppState>): void {
  state = { ...state, ...next };
  clearTimeout(hashTimer);
  hashTimer = window.setTimeout(() => history.replaceState(null, '', encodeState(state)), 300);
}

export async function rerun(): Promise<RunReply> {
  latest = await client.request(state.overrides);
  render();
  return latest;
}

const layout = layoutJson as unknown as CanvasLayout;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

app.insertAdjacentHTML('beforeend', `
  <div class="fl tl"><span class="logo" aria-hidden="true"></span><div><b>AI capital flows</b> <span class="sep">·</span>
    <span class="setup-name"></span></div><a href="./data.html">Data</a></div>
  <div class="foot-note">Early version: simple rules, not yet validated</div>
  <button class="fl cond" type="button" aria-expanded="false"><span class="dot2"></span>Conditions <b class="n">0</b><i class="outside" hidden></i><span class="car">▾</span></button>
  <div class="fl seg" role="group" aria-label="View"><button class="on" type="button" aria-pressed="true">One path</button>
    <button type="button" disabled title="Range of outcomes arrives in phase 6">Range of outcomes</button></div>
  <div class="fl zoom"><button type="button" class="zin" aria-label="Zoom in">+</button><span class="pct">100%</span>
    <button type="button" class="zout" aria-label="Zoom out">−</button><button type="button" class="fit">Fit</button></div>
  <aside class="fl nv" aria-live="polite"></aside>
  <div class="loading">Running the model…</div>`);
const pct = app.querySelector<HTMLElement>('.zoom .pct')!;
const canvas = mountCanvas(app, k => { pct.textContent = `${Math.round(k * 100)}%`; });
app.querySelector<HTMLButtonElement>('.zin')!.onclick = () => canvas.zoomBy(1.25);
app.querySelector<HTMLButtonElement>('.zout')!.onclick = () => canvas.zoomBy(0.8);
app.querySelector<HTMLButtonElement>('.fit')!.onclick = () => canvas.fitAll();
const timeline = mountTimeline(app, q => { setState({ quarter: q }); render(); });
const bounds = (boundsJson as { conditions: ConditionBounds }).conditions;
const condBtn = app.querySelector<HTMLButtonElement>('.cond')!;
const panel = mountConditions(app, {
  onChange(o) { setState({ overrides: o }); void rerun(); },
  onName(name) { setState({ name: name.trim() || undefined }); app.querySelector<HTMLElement>('.setup-name')!.textContent = state.name ?? 'Baseline'; },
  onClose() { panel.toggle(false); condBtn.setAttribute('aria-expanded', 'false'); },
});
condBtn.onclick = () => { panel.toggle(); condBtn.setAttribute('aria-expanded', String(!panel.el.hidden)); render(); };

// Deals as known at the build date (statusAsOf, hidden terms), for the deal zoom.
const dealViews: readonly DealView[] = asOfView({ entities: meta.entities, facts: [], series: [], deals: meta.deals }, meta.asOf).deals;
let scene: Scene | undefined;
let zoom: { edge: SceneEdge; deals: DealView[]; back: ReturnType<typeof canvas.view> } | undefined;

function exposureHtml(d: DealView): string {
  const s = dealStructure(d, meta.entities);
  const role = s.parties.find(p => p.id === 'nvidia')?.role;
  const roleText = role === 'Pays' ? 'NVIDIA pays into this deal' : role === 'Receives' ? 'NVIDIA is paid by this deal'
    : role === 'Guarantees' ? 'NVIDIA guarantees this deal' : 'NVIDIA is not a party to this deal';
  const values = s.terms.filter(t => /minimum|ceiling|conditional|estimate|value/i.test(t.label));
  return `<div class="k">Exposure in this deal</div><div class="v sm">${esc(d.name)}</div><div class="s">${roleText}</div>
    <div class="rows">${values.map(t => `<div><span>${esc(t.label)}</span><b>${esc(t.value)}</b></div>`).join('')}
    <div><span>Status</span><b>${esc(d.statusAsOf[0].toUpperCase() + d.statusAsOf.slice(1))}</b></div></div>
    <div class="src">Press Esc to zoom back out</div>`;
}

function openZoom(edge: SceneEdge, dealId?: string): void {
  if (!scene) return;
  const deals = relatedDeals(edge.pairs, dealViews);
  zoom = { edge, deals, back: zoom?.back ?? canvas.view() };
  const a = scene.blocks.find(b => b.id === edge.from)!, b = scene.blocks.find(b => b.id === edge.to)!;
  const x0 = Math.min(a.x, b.x), y0 = Math.min(a.y, b.y);
  const box = { x: x0 - 30, y: y0 - 40, w: Math.max(a.x + a.w, b.x + b.w) - x0 + 60, h: Math.max(a.y + a.h, b.y + b.h) - y0 + 80 };
  const r = canvas.svg.getBoundingClientRect();
  const target = fit(box, r.width - 440 - 300, r.height - 180, 30);
  canvas.animateTo({ ...target, x: target.x + 20, y: target.y + 70 });
  const selected = dealId ?? deals[0]?.id;
  setState({ focus: selected ? { dealId: selected } : undefined });
  showZoom(selected);
}

function showZoom(selected?: string): void {
  if (!zoom) return;
  const { edge, deals } = zoom;
  canvas.world.classList.add('focus');
  canvas.world.querySelectorAll('.on').forEach(n => n.classList.remove('on'));
  canvas.world.querySelectorAll(`[data-block="${CSS.escape(edge.from)}"], [data-block="${CSS.escape(edge.to)}"], [data-edge="${CSS.escape(edge.id)}"]`)
    .forEach(n => n.classList.add('on'));
  let panel = app.querySelector<HTMLElement>('.dp');
  if (!panel) { panel = document.createElement('aside'); panel.className = 'fl dp'; panel.setAttribute('aria-label', 'Deal details'); app.append(panel); }
  panel.style.left = `${Math.max(18, app.clientWidth - 300 - 440)}px`;
  panel.style.top = '140px';
  panel.innerHTML = dealPanelHtml(`${edge.label} ${formatAmount(edge.usdPerYear)} a year`, deals, selected, meta.entities);
  panel.querySelector<HTMLButtonElement>('.dp-close')!.onclick = closeZoom;
  panel.querySelectorAll<HTMLButtonElement>('[data-deal]').forEach(btn => { btn.onclick = () => { setState({ focus: { dealId: btn.dataset.deal! } }); showZoom(btn.dataset.deal); }; });
  const d = deals.find(x => x.id === selected) ?? deals[0];
  if (d) app.querySelector<HTMLElement>('.nv')!.innerHTML = exposureHtml(d);
}

function closeZoom(): void {
  if (!zoom) return;
  canvas.animateTo(zoom.back);
  zoom = undefined;
  canvas.world.classList.remove('focus');
  app.querySelector('.dp')?.remove();
  setState({ focus: undefined });
  render();
}

canvas.svg.addEventListener('click', e => {
  const hit = (e.target as Element).closest<SVGElement>('[data-edge]');
  if (hit && scene) { const edge = scene.edges.find(x => x.id === hit.dataset.edge); if (edge) openZoom(edge); return; }
  if (zoom && !(e.target as Element).closest('.card')) closeZoom();
});
window.addEventListener('keydown', e => { if (e.key === 'Escape') closeZoom(); });

function render(): void {
  app.querySelector<HTMLElement>('.setup-name')!.textContent = state.name ?? 'Baseline';
  if (!latest) return;
  const nv = latest.run.nvidia.find(n => n.quarter === state.quarter);
  scene = buildScene(latest.run, meta.entities, state.quarter, layout);
  const card = nvidiaCard(latest.run, meta.comparisons, state.quarter);
  const gap = card.fyConsensus ? ` · ${card.fyModel >= card.fyConsensus ? '+' : '−'}${Math.abs((card.fyModel / card.fyConsensus - 1) * 100).toFixed(0)}%` : '';
  canvas.draw(scene, { motion: !reducedMotion.matches, nvidiaSub: `FY${card.fy} revenue ${formatAmount(card.fyModel)}${gap}` });
  app.querySelector<HTMLElement>('.nv')!.innerHTML = nvidiaCardHtml(card);
  if (zoom) {
    const still = scene.edges.find(x => x.id === zoom!.edge.id);
    if (still) { zoom.edge = still; showZoom(state.focus?.dealId); } else closeZoom();
  } else if (state.focus?.dealId) {
    // A link that opens on a deal: zoom to the first line whose deals include it.
    const edge = scene.edges.find(x => relatedDeals(x.pairs, dealViews).some(d => d.id === state.focus!.dealId));
    if (edge) openZoom(edge, state.focus.dealId);
  }
  timeline.update(timelineTicks(latest.run.grid, latest.run.start, latest.run.events), state.quarter);
  const counts = conditionCounts(latest.conditions, state.overrides, latest.run.grid);
  condBtn.querySelector('.n')!.textContent = String(counts.changed);
  const out = condBtn.querySelector<HTMLElement>('.outside')!;
  out.hidden = !counts.outside;
  out.textContent = `${counts.outside} outside forecasts`;
  condBtn.classList.toggle('has-outside', counts.outside > 0);
  const result = `NVIDIA FY${card.fy} revenue ${formatAmount(card.fyModel)}${gap ? ` (${gap.replace(' · ', '')} vs consensus)` : ''}`;
  panel.render({ conditions: latest.conditions, base: latest.base, result, overrides: state.overrides, name: state.name, grid: latest.run.grid, asOf: meta.asOf,
    names: meta.conditionNames as Partial<Record<ConditionId, string>>, bounds });
  app.querySelector('.loading')?.remove();
  app.dataset.ready = 'true';
  app.dataset.nvidiaRevenue = String(nv?.revenue ?? 0);
}

render();
if (decoded.note) showNote(decoded.note);
void rerun();
