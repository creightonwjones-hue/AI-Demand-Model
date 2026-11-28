// The whole user setup lives in the page link (spec §9): `#s=` + base64url(JSON). No database.
import type { QuarterKey } from '../data/schema';
import { CONDITION_IDS } from '../engine/conditions';
import { makeGrid } from '../engine/grid';
import type { ConditionId } from '../engine/types';

export type Overrides = Partial<Record<ConditionId, Partial<Record<QuarterKey, number>>>>;
export interface AppState {
  name?: string;
  overrides: Overrides;
  quarter: QuarterKey;
  focus?: { dealId: string };
}

const VERSION = 1;
const BROKEN = 'This link could not be read, so the baseline is shown.';
const PARTIAL = 'Part of this link refers to settings this version does not have; those parts were left out.';

function toBase64Url(text: string): string {
  let bin = '';
  for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromBase64Url(s: string): string {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}

export function encodeState(s: AppState): string {
  return `#s=${toBase64Url(JSON.stringify({ v: VERSION, ...s }))}`;
}

export function decodeState(hash: string, bundle: { start: QuarterKey }): { state: AppState; note?: string } {
  const base: AppState = { overrides: {}, quarter: bundle.start };
  const m = /^#?s=(.*)$/.exec(hash);
  if (!m) return { state: base };
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(fromBase64Url(m[1]));
    if (!raw || typeof raw !== 'object' || raw.v !== VERSION) throw new Error('version');
  } catch { return { state: base, note: BROKEN }; }

  const quarters = new Set(makeGrid().quarters);
  const ids = new Set<string>(CONDITION_IDS);
  let dropped = false;
  const overrides: Overrides = {};
  for (const [id, path] of Object.entries((raw.overrides ?? {}) as Record<string, unknown>)) {
    if (!ids.has(id) || !path || typeof path !== 'object') { dropped = true; continue; }
    const kept: Partial<Record<QuarterKey, number>> = {};
    for (const [q, v] of Object.entries(path as Record<string, unknown>)) {
      if (quarters.has(q as QuarterKey) && typeof v === 'number' && Number.isFinite(v)) kept[q as QuarterKey] = v;
      else dropped = true;
    }
    if (Object.keys(kept).length) overrides[id as ConditionId] = kept;
  }
  const state: AppState = { ...base, overrides };
  if (typeof raw.name === 'string' && raw.name.trim()) state.name = raw.name.slice(0, 80);
  if (typeof raw.quarter === 'string' && quarters.has(raw.quarter as QuarterKey)) state.quarter = raw.quarter as QuarterKey;
  else if (raw.quarter !== undefined) dropped = true;
  const focus = raw.focus as { dealId?: unknown } | undefined;
  if (focus && typeof focus.dealId === 'string') state.focus = { dealId: focus.dealId };
  return dropped ? { state, note: PARTIAL } : { state };
}
