// Timeline (bottom centre): play/pause, a track with reported quarters shaded, markers for defaults and financing
// stance changes, and the selected quarter. Scrubbing only redraws; it never re-runs the engine.
import type { QuarterKey } from '../data/schema';
import type { EngineEvent, Grid } from '../engine/types';

export interface Tick { quarter: QuarterKey; history: boolean; markers: number }
const MARKED = new Set<EngineEvent['kind']>(['default', 'minsky-change']);
export const PLAY_MS = 900;

export function timelineTicks(grid: Grid, start: QuarterKey, events: readonly EngineEvent[]): Tick[] {
  return grid.quarters.map(quarter => ({
    quarter, history: quarter < start, markers: events.filter(e => e.quarter === quarter && MARKED.has(e.kind)).length,
  }));
}

const label = (q: QuarterKey) => q.replace(/(\d{4})Q(\d)/, 'Q$2 $1');

export interface TimelineHandle { update(ticks: Tick[], quarter: QuarterKey): void; stop(): void }

export function mountTimeline(host: HTMLElement, onQuarter: (q: QuarterKey) => void): TimelineHandle {
  host.insertAdjacentHTML('beforeend', `<div class="fl time">
    <button type="button" class="play" aria-label="Play">▶</button>
    <span class="yrs y0"></span>
    <div class="trk" role="slider" tabindex="0" aria-label="Quarter"><div class="hist"></div><div class="fill"></div><div class="marks"></div><span class="kn"></span></div>
    <span class="yrs y1"></span><b class="cur"></b></div>`);
  const el = host.querySelector<HTMLElement>('.time')!;
  const trk = el.querySelector<HTMLElement>('.trk')!;
  const play = el.querySelector<HTMLButtonElement>('.play')!;
  let ticks: Tick[] = [];
  let i = 0;
  let timer: number | undefined;
  const pos = (k: number) => `${(k / Math.max(1, ticks.length - 1)) * 100}%`;
  const go = (k: number) => { if (!ticks.length) return; i = Math.max(0, Math.min(ticks.length - 1, k)); onQuarter(ticks[i].quarter); };
  const stop = () => { clearInterval(timer); timer = undefined; play.textContent = '▶'; play.setAttribute('aria-label', 'Play'); };
  play.onclick = () => {
    if (timer) return stop();
    if (!ticks.length) return;
    if (i >= ticks.length - 1) go(ticks.findIndex(t => !t.history));
    play.textContent = '❚❚';
    play.setAttribute('aria-label', 'Pause');
    timer = window.setInterval(() => { if (i >= ticks.length - 1) stop(); else go(i + 1); }, PLAY_MS);
  };
  const fromX = (x: number) => { const r = trk.getBoundingClientRect(); go(Math.round(((x - r.left) / r.width) * (ticks.length - 1))); };
  trk.addEventListener('pointerdown', e => { stop(); trk.setPointerCapture(e.pointerId); fromX(e.clientX); });
  trk.addEventListener('pointermove', e => { if (trk.hasPointerCapture(e.pointerId)) fromX(e.clientX); });
  trk.addEventListener('keydown', e => {
    const d = ({ ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, Home: -99, End: 99 } as Record<string, number>)[e.key];
    if (d !== undefined) { stop(); go(i + d); e.preventDefault(); }
  });
  window.addEventListener('keydown', e => {
    if (e.key === ' ' && !e.defaultPrevented && !(e.target as Element).closest('input, button, [role=slider], textarea, .card')) { play.click(); e.preventDefault(); }
  });

  return {
    stop,
    update(t, quarter) {
      ticks = t;
      i = Math.max(0, ticks.findIndex(x => x.quarter === quarter));
      const hist = ticks.filter(x => x.history).length;
      el.querySelector<HTMLElement>('.hist')!.style.width = pos(Math.max(0, hist - 0.5));
      el.querySelector<HTMLElement>('.fill')!.style.width = pos(i);
      el.querySelector<HTMLElement>('.kn')!.style.left = pos(i);
      el.querySelector<HTMLElement>('.marks')!.innerHTML = ticks.map((x, k) => (x.markers
        ? `<span class="mk" style="left:${pos(k)}" title="${x.markers} event${x.markers > 1 ? 's' : ''} in ${label(x.quarter)}"></span>` : '')).join('');
      el.querySelector('.y0')!.textContent = ticks[0]?.quarter.slice(0, 4) ?? '';
      el.querySelector('.y1')!.textContent = ticks.at(-1)?.quarter.slice(0, 4) ?? '';
      el.querySelector('.cur')!.textContent = `${label(quarter)}${ticks[i]?.history ? ' · reported' : ''}`;
      trk.setAttribute('aria-valuetext', label(quarter));
      trk.setAttribute('aria-valuenow', String(i));
      trk.setAttribute('aria-valuemin', '0');
      trk.setAttribute('aria-valuemax', String(ticks.length - 1));
    },
  };
}
