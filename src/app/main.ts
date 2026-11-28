import './style.css';
import meta from 'virtual:engine-meta';
import layoutJson from '../../config/canvas-layout.json';
import { mountCanvas } from './canvas/canvas';
import { buildScene, type CanvasLayout } from './scene';
import { nvidiaCard, nvidiaCardHtml } from './nvidia-card';
import { mountTimeline, timelineTicks } from './timeline';
import { formatAmount } from './canvas/render';
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
  <button class="fl cond" type="button" disabled title="Drag-the-line conditions arrive with the conditions panel"><span class="dot2"></span>Conditions <b>0</b><span class="car">▾</span></button>
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

function render(): void {
  app.querySelector<HTMLElement>('.setup-name')!.textContent = state.name ?? 'Baseline';
  if (!latest) return;
  const nv = latest.run.nvidia.find(n => n.quarter === state.quarter);
  const scene = buildScene(latest.run, meta.entities, state.quarter, layout);
  const card = nvidiaCard(latest.run, meta.comparisons, state.quarter);
  const gap = card.fyConsensus ? ` · ${card.fyModel >= card.fyConsensus ? '+' : '−'}${Math.abs((card.fyModel / card.fyConsensus - 1) * 100).toFixed(0)}%` : '';
  canvas.draw(scene, { motion: !reducedMotion.matches, nvidiaSub: `FY${card.fy} revenue ${formatAmount(card.fyModel)}${gap}` });
  app.querySelector<HTMLElement>('.nv')!.innerHTML = nvidiaCardHtml(card);
  timeline.update(timelineTicks(latest.run.grid, latest.run.start, latest.run.events), state.quarter);
  app.querySelector('.loading')?.remove();
  app.dataset.ready = 'true';
  app.dataset.nvidiaRevenue = String(nv?.revenue ?? 0);
}

render();
if (decoded.note) showNote(decoded.note);
void rerun();
