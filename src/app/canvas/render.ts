// Draws a Scene as one SVG world (docs/mockups/canvas-v6.html look): row labels, group containers, grey money lines
// with flow dots in the payer's colour, white label chips, solid company cards, problem outlines and event callouts.
import type { Layer } from '../../data/schema';
import { escapeHtml as esc } from '../../explorer/format';
import type { Scene, SceneBlock, SceneEdge, SceneEvent, Status } from '../scene';

export const LAYER_COLOUR: Record<Layer, string> = {
  money: '#c9683a', labs: '#6b5bb8', financing: '#2f8590', cloud: '#b2557d', chips: '#3d8a57', supply: '#4a72ad',
};
const BAD = '#d23b3b', WARN = '#d4900f';
const PILL_H = 42;

export function formatAmount(usd: number): string {
  if (usd >= 1e12) return `$${(usd / 1e12).toFixed(2)}T`;
  if (usd >= 10e9) return `$${Math.round(usd / 1e9)}B`;
  return `$${(usd / 1e9).toFixed(1)}B`;
}

interface Geo { d: string; x1: number; y1: number; x2: number; y2: number; side: boolean; dip?: number }

/** Line geometry: lines leave and enter at spread-out ports so they never share one point. */
function geometry(scene: Scene): Map<string, Geo> {
  const block = new Map(scene.blocks.map(b => [b.id, b]));
  const row = new Map(scene.rows.map((r, i) => [r.layer, i]));
  const cx = (b: SceneBlock) => b.x + b.w / 2;
  type Port = { edge: SceneEdge; end: 'from' | 'to'; other: number };
  const ports = new Map<string, Port[]>(); // key: blockId|side
  const add = (k: string, p: Port) => { const l = ports.get(k) ?? []; l.push(p); ports.set(k, l); };
  const dir = new Map<string, 'down' | 'up' | 'side'>();
  for (const e of scene.edges) {
    const a = block.get(e.from)!, b = block.get(e.to)!;
    const ra = row.get(a.layer)!, rb = row.get(b.layer)!;
    const d = rb > ra ? 'down' : rb < ra ? 'up' : 'side';
    dir.set(e.id, d);
    if (d === 'side') continue;
    add(`${a.id}|${d === 'down' ? 'bottom' : 'top'}`, { edge: e, end: 'from', other: cx(b) });
    add(`${b.id}|${d === 'down' ? 'top' : 'bottom'}`, { edge: e, end: 'to', other: cx(a) });
  }
  const at = new Map<string, { from?: [number, number]; to?: [number, number] }>();
  for (const [k, list] of ports) {
    const [id, side] = k.split('|');
    const b = block.get(id)!;
    list.sort((p, q) => p.other - q.other);
    const y = side === 'bottom' ? b.y + b.h + 2 : b.y - 2;
    list.forEach((p, i) => {
      const x = b.x + b.w * (0.15 + 0.7 * ((i + 0.5) / list.length));
      const cur = at.get(p.edge.id) ?? {};
      cur[p.end] = [x, y];
      at.set(p.edge.id, cur);
    });
  }
  const out = new Map<string, Geo>();
  for (const e of scene.edges) {
    const a = block.get(e.from)!, b = block.get(e.to)!;
    if (dir.get(e.id) === 'side') {
      // Neighbours: a short straight join. Otherwise an arc dipping under the row, clear of the blocks between.
      const leftToRight = a.x < b.x;
      const between = scene.blocks.some(c => c.layer === a.layer && c !== a && c !== b && c.x > Math.min(a.x, b.x) && c.x < Math.max(a.x, b.x));
      if (!between) {
        const x1 = leftToRight ? a.x + a.w + 2 : a.x - 2, x2 = leftToRight ? b.x - 2 : b.x + b.w + 2;
        const y1 = a.y + a.h / 2, y2 = b.y + b.h / 2, mx = (x1 + x2) / 2;
        out.set(e.id, { d: `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`, x1, y1, x2, y2, side: true });
      } else {
        const x1 = a.x + a.w * (leftToRight ? 0.85 : 0.15), x2 = b.x + b.w * (leftToRight ? 0.15 : 0.85);
        const y1 = a.y + a.h + 2, y2 = b.y + b.h + 2, dip = Math.max(y1, y2) + 46;
        out.set(e.id, { d: `M${x1},${y1} C${x1},${dip} ${x2},${dip} ${x2},${y2}`, x1, y1, x2, y2, side: false, dip });
      }
      continue;
    }
    const p = at.get(e.id)!;
    const [x1, y1] = p.from!, [x2, y2] = p.to!;
    const my = (y1 + y2) / 2;
    out.set(e.id, { d: `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`, x1, y1, x2, y2, side: false });
  }
  return out;
}

/** Point at t on the cubic used by geometry(). */
function pointAt(g: Geo, t: number): [number, number] {
  const u = 1 - t;
  if (g.side) {
    const mx = (g.x1 + g.x2) / 2;
    return [u ** 3 * g.x1 + 3 * u * u * t * mx + 3 * u * t * t * mx + t ** 3 * g.x2,
      u ** 3 * g.y1 + 3 * u * u * t * g.y1 + 3 * u * t * t * g.y2 + t ** 3 * g.y2];
  }
  const my = g.dip ?? (g.y1 + g.y2) / 2;
  return [u ** 3 * g.x1 + 3 * u * u * t * g.x1 + 3 * u * t * t * g.x2 + t ** 3 * g.x2,
    u ** 3 * g.y1 + 3 * u * u * t * my + 3 * u * t * t * my + t ** 3 * g.y2];
}

function edgeSvg(e: SceneEdge, g: Geo, payer: SceneBlock, i: number, motion: boolean): string {
  const id = `e${i}`;
  const broken = e.status === 'broken';
  const out = [`<path class="edge ${e.status}" id="${id}" d="${g.d}" stroke-width="${e.width.toFixed(2)}"><title>${esc(`${e.label} ${formatAmount(e.usdPerYear)} a year`)}</title></path>`];
  if (motion) {
    const usdB = e.usdPerYear / 1e9;
    const n = broken ? 1 : Math.max(1, Math.min(7, Math.round(Math.sqrt(usdB) / 2)));
    const dur = broken ? 7 : e.status === 'stressed' ? 5.2 : 3.4;
    const fill = broken ? BAD : LAYER_COLOUR[payer.layer];
    for (let j = 0; j < n; j++) {
      out.push(`<circle class="dot" r="${usdB < 100 ? 2.4 : 3}" fill="${fill}"><animateMotion dur="${dur}s" repeatCount="indefinite" begin="${(-j * dur / n).toFixed(2)}s"><mpath href="#${id}"/></animateMotion></circle>`);
    }
  }
  return out.join('');
}

type Box = [number, number, number, number];
const overlaps = (a: Box, b: Box) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];

/** Label chips at the curve, moved along it to avoid other chips and cards. */
function chips(scene: Scene, geo: Map<string, Geo>, taken: Box[]): string {
  const out: string[] = [];
  const order = scene.edges.filter(e => e.usdPerYear >= LABEL_MIN_USD).sort((a, b) => b.usdPerYear - a.usdPerYear);
  for (const e of order) {
    const g = geo.get(e.id)!;
    const amt = formatAmount(e.usdPerYear);
    const w = e.label.length * 6.2 + amt.length * 6.6 + 30, h = 22;
    let best: Box | undefined;
    for (const t of [0.5, 0.38, 0.62, 0.28, 0.72, 0.2, 0.8]) {
      const [px, py] = pointAt(g, t);
      const box: Box = [px - w / 2, py - h / 2, w, h];
      if (!taken.some(b => overlaps(b, box))) { best = box; break; }
      best ??= box;
    }
    taken.push(best!);
    const [x, y] = best!;
    const bad = e.status === 'broken';
    out.push(`<g class="chip${bad ? ' bad' : ''}" data-edge="${esc(e.id)}" data-box="${x.toFixed(1)},${y.toFixed(1)},${w.toFixed(1)},${h}" tabindex="-1">`
      + `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h}" rx="6"/>`
      + `<text x="${(x + 10).toFixed(1)}" y="${(y + 15).toFixed(1)}" class="ct">${esc(e.label)}</text>`
      + `<text x="${(x + w - 10).toFixed(1)}" y="${(y + 15).toFixed(1)}" class="ca" text-anchor="end">${amt}</text></g>`);
  }
  return out.join('');
}

function flag(x: number, y: number, w: number, h: number, status: Status): string {
  if (status === 'ok') return '';
  const c = status === 'default' ? BAD : WARN;
  return `<rect class="ring" x="${x - 3.5}" y="${y - 3.5}" width="${w + 7}" height="${h + 7}" rx="11" stroke="${c}"/>`
    + `<text x="${x + w}" y="${y - 10}" text-anchor="end" class="flag" fill="${c}">● ${status === 'default' ? 'Default' : 'Stressed'}</text>`;
}

const STATUS_WORD: Record<Status, string> = { ok: '', stressed: ', stressed', default: ', in default' };

function card(id: string, label: string, x: number, y: number, w: number, h: number, layer: Layer, status: Status, big: boolean, sub?: string): string {
  const text = big
    ? `<text x="${x + 16}" y="${y + 27}" class="nl big">${esc(label)}</text>${sub ? `<text x="${x + 16}" y="${y + 45}" class="nsub">${esc(sub)}</text>` : ''}`
    : `<text x="${x + w / 2}" y="${y + h / 2 + 4.5}" text-anchor="middle" class="nl">${esc(label)}</text>`;
  return `<g class="card${big ? ' big' : ''}" data-id="${esc(id)}" tabindex="0" role="button" aria-label="${esc(label + STATUS_WORD[status])}">`
    + flag(x, y, w, h, status) + `<rect class="body" x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${LAYER_COLOUR[layer]}"/>${text}</g>`;
}

/** A group's container and title (drawn under the lines). */
function groupFrame(b: SceneBlock): string {
  return `<g class="grp-wrap" data-block="${esc(b.id)}"><rect class="grp" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="14"/>`
    + `<text x="${b.x + b.w - 14}" y="${b.y - 9}" text-anchor="end" class="gl">${esc(b.label.toUpperCase())}</text></g>`;
}

/** A block's company cards (drawn over the lines): one card, or the group's pills. */
function blockCards(b: SceneBlock, sub?: string): string {
  if (!b.group) return card(b.members[0]?.id ?? b.id, b.label, b.x, b.y, b.w, b.h, b.layer, b.status, b.big, sub);
  return b.members.map(m => card(m.id, m.name, b.x + m.x, b.y + 18, m.w, PILL_H, b.layer, m.status, false)).join('');
}

/** Up to one callout per company and kind (the latest), beside its block. */
function callouts(scene: Scene, used: Box[]): string {
  const latest = new Map<string, SceneEvent>();
  for (const e of scene.events) latest.set(`${e.entityId}|${e.kind}`, e);
  const block = new Map(scene.blocks.map(b => [b.id, b]));
  const out: string[] = [];
  for (const e of latest.values()) {
    const b = block.get(e.blockId);
    if (!b) continue;
    const w = 210, h = 62;
    const right: Box = [b.x + b.w + 14, b.y + b.h / 2 - h / 2, w, h];
    const left: Box = [b.x - 14 - w, right[1], w, h];
    let box = [right, left].find(c => !used.some(u => overlaps(u, c))) ?? right;
    while (used.some(u => overlaps(u, box))) box = [box[0], box[1] + h + 8, w, h];
    used.push(box);
    const [x, y] = box;
    const words = e.text.split(' ');
    let l1 = '';
    while (words.length && (l1 + ' ' + words[0]).trim().length <= 30) l1 = (l1 + ' ' + words.shift()).trim();
    let l2 = words.join(' ');
    if (l2.length > 32) l2 = l2.slice(0, 31) + '…';
    out.push(`<g class="co"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9"/>`
      + `<circle cx="${x + 18}" cy="${y + 18}" r="9" class="cokc"/><text x="${x + 18}" y="${y + 21.5}" class="cok">${e.letter}</text>`
      + `<text x="${x + 34}" y="${y + 22}" class="coq">${esc(e.quarter.replace(/(\d{4})Q(\d)/, 'Q$2 $1'))}</text>`
      + `<text x="${x + 12}" y="${y + 40}" class="coa">${esc(l1)}</text><text x="${x + 12}" y="${y + 55}" class="cob">${esc(l2)}</text></g>`);
  }
  return out.join('');
}

/** Lines at or above this get a label chip on the overview; smaller lines show their label on hover. */
export const LABEL_MIN_USD = 10e9;

export interface RenderOptions { motion: boolean; nvidiaSub?: string }

/** The whole world group (drawn inside the canvas SVG under the viewport transform). */
export function renderScene(scene: Scene, opts: RenderOptions): string {
  const geo = geometry(scene);
  const block = new Map(scene.blocks.map(b => [b.id, b]));
  const rows = scene.rows.filter(r => scene.blocks.some(b => b.layer === r.layer))
    .map(r => `<circle cx="34" cy="${r.y - 4}" r="4" fill="${LAYER_COLOUR[r.layer]}"/><text x="46" y="${r.y}" class="ll">${esc(r.label)}</text>`).join('');
  const groups = scene.blocks.filter(b => b.group).map(groupFrame).join('');
  const edges = scene.edges.map((e, i) => edgeSvg(e, geo.get(e.id)!, block.get(e.from)!, i, opts.motion)).join('');
  const cards = scene.blocks.map(b => blockCards(b, b.id === 'nvidia' ? opts.nvidiaSub : undefined)).join('');
  const taken: Box[] = scene.blocks.map(b => [b.x, b.y - (b.group ? 22 : 16), b.w, b.h + (b.group ? 22 : 16)]);
  const chipSvg = chips(scene, geo, taken);
  return `<g class="rows">${rows}</g><g class="groups">${groups}</g><g class="edges">${edges}</g>`
    + `<g class="chips">${chipSvg}</g><g class="cards">${cards}</g><g class="callouts">${callouts(scene, taken)}</g>`;
}
