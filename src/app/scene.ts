// Scene model (pure): one quarter of a run turned into blocks (single cards or groups of company pills), money
// lines between blocks with yearly amounts and labels, and lettered events. No DOM here; render.ts draws it.
import { addQuarters } from '../data/quarters';
import type { Entity, Layer, QuarterKey } from '../data/schema';
import type { EngineEvent, FlowKind, RunResult } from '../engine/types';

export type Status = 'ok' | 'stressed' | 'default';
export interface CanvasLayout {
  rows: Layer[];
  rowLabels: Record<string, string>;
  blocks: { id: string; label: string; layer: Layer; members: string[]; group?: boolean; big?: boolean }[];
  aliases: { entity: string; kind: FlowKind; block: string }[];
  hiddenKinds: FlowKind[];
  alwaysShown: string[];
  minUsdPerYear: number;
  /** Canvas label for a flow label (merges, e.g. Interest and Repays loan → Debt service). */
  labels?: Record<string, string>;
}
export interface SceneMember { id: string; name: string; status: Status; x: number; w: number }
export interface SceneBlock {
  id: string; label: string; layer: Layer; group: boolean; big: boolean;
  x: number; y: number; w: number; h: number; status: Status; members: SceneMember[];
}
export interface SceneEdge {
  id: string; from: string; to: string; label: string; usdPerYear: number; kind: FlowKind;
  dealIds: string[]; pairs: [string, string][]; status: 'ok' | 'stressed' | 'broken'; width: number;
}
export interface SceneEvent { blockId: string; entityId: string; quarter: QuarterKey; letter: string; kind: EngineEvent['kind']; text: string }
export interface Scene {
  quarter: QuarterKey;
  rows: { layer: Layer; label: string; y: number }[];
  blocks: SceneBlock[];
  edges: SceneEdge[];
  events: SceneEvent[];
  width: number;
  height: number;
}

export type EntityLite = Pick<Entity, 'id' | 'name' | 'layer'>;

const WIDTH = 1440;
const LEFT = 150; // row labels sit left of this
const ROW_GAP = 165;
const TOP = 70;
const CARD_H = 42, BIG_W = 230, BIG_H = 58, GROUP_H = 78, GAP = 28, PILL_GAP = 8, GROUP_PAD = 14;
const SHOWN_EVENTS = new Set<EngineEvent['kind']>(['default', 'minsky-change', 'supply-bound']);
const RANK: Record<Status, number> = { ok: 0, stressed: 1, default: 2 };

// Mona Sans 600 at 13px averages ~7.7px per character.
const cardWidth = (label: string) => Math.max(110, Math.round(30 + 7.7 * label.length));
const pillWidth = (name: string) => Math.max(70, Math.round(24 + 7.7 * name.length));

/** Health of one entity in a quarter: defaulted → default; Ponzi (operating cash below interest) → stressed. */
function memberStatus(run: RunResult, id: string, qi: number): Status {
  const row = run.entities[id]?.[qi];
  if (!row) return 'ok';
  if (row.defaulted) return 'default';
  return row.modelled && row.minsky === 'ponzi' ? 'stressed' : 'ok';
}

export function buildScene(run: RunResult, entities: readonly EntityLite[], quarter: QuarterKey, layout: CanvasLayout): Scene {
  const qi = run.grid.idx(quarter);
  const byId = new Map(entities.map(e => [e.id, e]));
  const blockOf = new Map<string, string>();
  for (const b of layout.blocks) for (const m of b.members) blockOf.set(m, b.id);
  const alias = (id: string, kind: FlowKind) => layout.aliases.find(a => a.entity === id && a.kind === kind)?.block;
  const blockFor = (id: string, kind: FlowKind) => alias(id, kind) ?? blockOf.get(id) ?? id;

  // Four-quarter window ending at `quarter`, only simulated quarters (flows exist from run.start); annualised.
  const window = [0, 1, 2, 3].map(k => addQuarters(quarter, -k)).filter(q => q >= run.start && q <= quarter);
  const scale = window.length ? 4 / window.length : 0;
  const inWindow = new Set(window);

  interface Acc { from: string; to: string; label: string; kind: FlowKind; usd: number; deals: Set<string>; pairs: Map<string, [string, string]>; payers: Set<string> }
  const acc = new Map<string, Acc>();
  const active = new Set<string>();
  for (const f of run.flows) {
    if (!inWindow.has(f.quarter) || layout.hiddenKinds.includes(f.kind)) continue;
    const from = blockFor(f.from, f.kind), to = blockFor(f.to, f.kind);
    if (from === to) continue;
    const label = layout.labels?.[f.label] ?? f.label;
    const key = `${from}|${to}|${label}`;
    const a = acc.get(key) ?? { from, to, label, kind: f.kind, usd: 0, deals: new Set(), pairs: new Map(), payers: new Set() };
    a.usd += f.amountUsd;
    if (f.dealId) a.deals.add(f.dealId);
    a.pairs.set(`${f.from}|${f.to}`, [f.from, f.to]);
    a.payers.add(f.from);
    acc.set(key, a);
  }

  const kept = [...acc.values()].map(a => ({ ...a, usd: a.usd * scale })).filter(a => a.usd >= layout.minUsdPerYear);
  for (const a of kept) for (const [f, t] of a.pairs.values()) { active.add(f); active.add(t); }
  const maxUsd = Math.max(1, ...kept.map(a => a.usd));

  // Blocks: configured blocks with a line or always shown, then any other entity with a line gets its own card.
  const shownIds = new Set([...kept.flatMap(a => [a.from, a.to]), ...layout.alwaysShown.map(id => blockOf.get(id) ?? id)]);
  const defs = [
    ...layout.blocks.filter(b => shownIds.has(b.id)),
    ...[...shownIds].filter(id => !layout.blocks.some(b => b.id === id) && byId.has(id))
      .map(id => ({ id, label: byId.get(id)!.name, layer: byId.get(id)!.layer, members: [id], group: false, big: false })),
  ];
  const blocks: SceneBlock[] = defs.map(d => {
    const group = !!d.group;
    const memberIds = group ? d.members.filter(m => active.has(m) || layout.alwaysShown.includes(m)) : d.members;
    const members: SceneMember[] = memberIds.map(id => ({ id, name: byId.get(id)?.name ?? id, status: memberStatus(run, id, qi), x: 0, w: 0 }));
    const status = members.reduce<Status>((w, m) => (RANK[m.status] > RANK[w] ? m.status : w), 'ok');
    let w: number;
    if (group) {
      let x = GROUP_PAD;
      for (const m of members) { m.w = pillWidth(m.name); m.x = x; x += m.w + PILL_GAP; }
      w = Math.max(cardWidth(d.label) + 20, x - PILL_GAP + GROUP_PAD);
    } else w = d.big ? BIG_W : cardWidth(d.label);
    const h = group ? GROUP_H : d.big ? BIG_H : CARD_H;
    return { id: d.id, label: d.label, layer: d.layer, group, big: !!d.big, x: 0, y: 0, w, h, status, members };
  });
  // Groups whose members all dropped out stay only if always shown.
  const visible = blocks.filter(b => !b.group || b.members.length || layout.alwaysShown.includes(b.id));

  const rows = layout.rows.map((layer, i) => ({ layer, label: layout.rowLabels[layer] ?? layer, y: TOP + i * ROW_GAP }));
  const links = kept.filter(a => visible.some(b => b.id === a.from) && visible.some(b => b.id === a.to));
  const place = () => {
    let width = WIDTH;
    for (const r of rows) {
      const inRow = visible.filter(b => b.layer === r.layer);
      const total = inRow.reduce((t, b) => t + b.w, 0);
      // Spread across the full width; never closer than GAP.
      const gap = Math.max(GAP, Math.min(90, (WIDTH - LEFT - 40 - total) / Math.max(1, inRow.length - 1)));
      const span = total + gap * Math.max(0, inRow.length - 1);
      let x = LEFT + Math.max(0, (WIDTH - LEFT - 40 - span) / 2);
      for (const b of inRow) { b.x = x; b.y = r.y - b.h / 2; x += b.w + gap; }
      width = Math.max(width, x + 40);
    }
    return width;
  };
  // Order each row by the average position of the blocks it trades with (two sweeps), so lines cross less.
  place();
  for (let sweep = 0; sweep < 3; sweep++) {
    for (const r of rows) {
      const centre = (id: string) => { const b = visible.find(x => x.id === id)!; return b.x + b.w / 2; };
      const bary = new Map<string, number>();
      for (const b of visible.filter(x => x.layer === r.layer)) {
        const ws = links.filter(a => a.from === b.id || a.to === b.id).map(a => ({ c: centre(a.from === b.id ? a.to : a.from), w: Math.sqrt(a.usd) }));
        const tw = ws.reduce((t, x) => t + x.w, 0);
        bary.set(b.id, tw ? ws.reduce((t, x) => t + x.c * x.w, 0) / tw : b.x + b.w / 2);
      }
      const inRow = visible.filter(x => x.layer === r.layer).sort((a, b) => bary.get(a.id)! - bary.get(b.id)!);
      const others = visible.filter(x => x.layer !== r.layer);
      visible.splice(0, visible.length, ...others, ...inRow);
    }
    place();
  }
  const width = place();

  const status = (b: string) => visible.find(x => x.id === b);
  const edges: SceneEdge[] = kept.filter(a => status(a.from) && status(a.to)).map(a => {
    const payerStatus = [...a.payers].map(p => memberStatus(run, p, qi));
    const broken = payerStatus.length > 0 && payerStatus.every(s => s === 'default');
    const stressed = payerStatus.some(s => s !== 'ok');
    return {
      id: `${a.from}|${a.to}|${a.label}`, from: a.from, to: a.to, label: a.label, usdPerYear: a.usd, kind: a.kind,
      dealIds: [...a.deals].sort(), pairs: [...a.pairs.values()],
      status: broken ? 'broken' : stressed ? 'stressed' : 'ok', width: 1 + 7 * Math.sqrt(a.usd / maxUsd),
    };
  });

  const from = addQuarters(quarter, -4);
  const evs = run.events.filter(e => SHOWN_EVENTS.has(e.kind) && e.quarter > from && e.quarter <= quarter)
    .sort((a, b) => a.quarter.localeCompare(b.quarter));
  const events: SceneEvent[] = evs.slice(0, 26).map((e, i) => ({
    blockId: blockOf.get(e.entityId) ?? e.entityId, entityId: e.entityId, quarter: e.quarter,
    letter: String.fromCharCode(65 + i), kind: e.kind, text: e.reason,
  }));

  return { quarter, rows, blocks: visible, edges, events, width, height: TOP + layout.rows.length * ROW_GAP };
}
