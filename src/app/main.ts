import './style.css';
import meta from 'virtual:engine-meta';
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

function render(): void {
  if (!latest) { app.innerHTML = '<div class="loading">Running the model…</div>'; return; }
  const nv = latest.run.nvidia.find(n => n.quarter === state.quarter);
  app.querySelector('.loading')?.remove();
  app.dataset.ready = 'true';
  app.dataset.nvidiaRevenue = String(nv?.revenue ?? 0);
}

render();
if (decoded.note) showNote(decoded.note);
void rerun();
