// Deal zoom: the structure of one deal (parties, vehicle, money links, term cards) and the deals behind a line.
import type { DealType, Entity } from '../data/schema';
import type { DealView } from '../engine/asof';
import { escapeHtml as esc } from '../explorer/format';
import { formatAmount } from './canvas/render';

export interface DealStructure {
  name: string;
  parties: { id: string; name: string; role: 'Pays' | 'Receives' | 'Guarantees' }[];
  vehicles: { id: string; name: string; kind: 'spv' | 'loan' | 'lease' | 'guarantee' | 'contract' }[];
  links: { from: string; to: string; label: string }[];
  terms: { label: string; value: string; source?: string }[];
}

/** What the money does in each deal type, as a short line label. */
const TYPE_LABEL: Record<DealType, string> = {
  'compute-lease': 'Rents compute', 'chip-purchase': 'Buys chips', equity: 'Invests', loan: 'Lends',
  'spv-financing': 'Funds vehicle', 'capacity-guarantee': 'Guarantees capacity', warrants: 'Warrants',
  jv: 'Joint venture', 'buyer-of-last-resort': 'Buyer of last resort', other: 'Agreement',
};
const VALUE_LABEL = { hardMinimumUsd: 'Hard minimum', ceilingUsd: 'Ceiling (up to)', conditionalUsd: 'Conditional', estimateUsd: 'Estimate' } as const;
const TRI = { yes: 'Yes', no: 'No', unknown: 'Not stated' } as const;
const HIDDEN = 'Not yet public';

export function dealStructure(d: DealView, entities: readonly Pick<Entity, 'id' | 'name'>[]): DealStructure {
  const name = (id: string) => entities.find(e => e.id === id)?.name ?? id;
  const parties: DealStructure['parties'] = [
    ...d.payers.map(id => ({ id, name: name(id), role: 'Pays' as const })),
    ...d.payees.map(id => ({ id, name: name(id), role: 'Receives' as const })),
    ...d.guarantors.map(id => ({ id, name: name(id), role: 'Guarantees' as const })),
  ];
  const label = d.types.map(t => TYPE_LABEL[t]).join(' · ') || 'Agreement';
  const vehicles: DealStructure['vehicles'] = d.vehicle ? [{ id: d.vehicle, name: name(d.vehicle), kind: 'spv' }] : [];
  const kind = d.types.includes('loan') ? 'loan' : d.types.includes('compute-lease') ? 'lease' : d.types.includes('capacity-guarantee') ? 'guarantee' : 'contract';
  vehicles.push({ id: `${d.id}:${kind}`, name: kind === 'loan' ? 'Loan' : kind === 'lease' ? 'Lease' : kind === 'guarantee' ? 'Guarantee' : 'Contract', kind });
  const via = d.vehicle ?? `${d.id}:${kind}`;
  const links: DealStructure['links'] = [
    ...d.payers.map(p => ({ from: p, to: via, label })),
    ...d.payees.map(p => ({ from: via, to: p, label: d.vehicle ? 'Passes through' : label })),
    ...d.guarantors.map(g => ({ from: g, to: via, label: 'Backstops' })),
  ];

  const terms: DealStructure['terms'] = [];
  for (const [k, l] of Object.entries(VALUE_LABEL)) {
    const v = d.values[k as keyof typeof VALUE_LABEL];
    if (v !== undefined) terms.push({ label: l, value: formatAmount(v) });
  }
  if (!Object.values(d.values).some(v => v !== undefined)) terms.push({ label: 'Value', value: 'Not disclosed' });
  const t = d.terms;
  if (d.termsHidden) terms.push({ label: 'Terms', value: HIDDEN });
  else {
    if (t.rate) terms.push({ label: 'Rate', value: t.rate });
    if (t.maturity) terms.push({ label: 'Maturity', value: t.maturity });
    terms.push({ label: 'Recourse', value: t.recourse === 'unknown' ? 'Not stated' : t.recourse === 'recourse' ? 'Recourse' : 'Non-recourse' });
    if (t.collateral) terms.push({ label: 'Collateral', value: t.collateral });
    terms.push({ label: 'Take-or-pay', value: TRI[t.takeOrPay] }, { label: 'Hell-or-high-water', value: TRI[t.hellOrHighWater] });
    if (t.terminationRights) terms.push({ label: 'Termination', value: t.terminationRights });
  }
  terms.push({ label: 'Status', value: d.statusAsOf[0].toUpperCase() + d.statusAsOf.slice(1) }, { label: 'Announced', value: d.announced });
  const src = d.sources[0];
  if (src) terms.push({ label: 'Source', value: src.title ?? src.url, source: src.url });
  return { name: d.name, parties, vehicles, links, terms };
}

/** Deals between the companies at the two ends of a line, in either direction (lenders pay, borrowers repay). */
export function relatedDeals(pairs: readonly (readonly [string, string])[], deals: readonly DealView[]): DealView[] {
  const hit = (d: DealView, a: string, b: string) => {
    const side = (id: string) => [...d.payers, ...d.guarantors].includes(id) ? 'pay' : d.payees.includes(id) || d.vehicle === id ? 'recv' : undefined;
    const sa = side(a), sb = side(b);
    return !!sa && !!sb && sa !== sb;
  };
  return deals.filter(d => pairs.some(([a, b]) => hit(d, a, b)));
}

/** The panel shown beside a zoomed line: a deal picker, a small structure diagram and the term cards. */
export function dealPanelHtml(lineLabel: string, deals: readonly DealView[], selected: string | undefined, entities: readonly Pick<Entity, 'id' | 'name'>[]): string {
  if (!deals.length) {
    return `<div class="dp-head"><b>${esc(lineLabel)}</b><button type="button" class="dp-close" aria-label="Close">×</button></div>
      <p class="dp-empty">No public deal sits behind this line: it is ordinary spending in the model, not a signed contract.</p>`;
  }
  const d = deals.find(x => x.id === selected) ?? deals[0];
  const s = dealStructure(d, entities);
  const pick = deals.length > 1
    ? `<div class="dp-pick" role="tablist">${deals.map(x => `<button type="button" role="tab" data-deal="${esc(x.id)}" aria-selected="${x.id === d.id}">${esc(x.name)}</button>`).join('')}</div>` : '';
  const col = (role: string) => s.parties.filter(p => p.role === role).map(p => `<span class="dp-party r-${role.toLowerCase()}">${esc(p.name)}</span>`).join('');
  return `<div class="dp-head"><b>${esc(s.name)}</b><button type="button" class="dp-close" aria-label="Close">×</button></div>${pick}
    <div class="dp-flow">
      <div class="dp-col"><span class="dp-k">Pays</span>${col('Pays')}${s.parties.some(p => p.role === 'Guarantees') ? `<span class="dp-k">Guarantees</span>${col('Guarantees')}` : ''}</div>
      <div class="dp-mid">${s.vehicles.map(v => `<span class="dp-veh k-${v.kind}">${esc(v.name)}</span>`).join('<span class="dp-arrow">↓</span>')}
        <span class="dp-lab">${esc(s.links[0]?.label ?? '')}</span></div>
      <div class="dp-col"><span class="dp-k">Receives</span>${col('Receives')}</div>
    </div>
    <div class="dp-terms">${s.terms.map(t => `<div class="term"><span class="tk">${esc(t.label.toUpperCase())}</span><span class="ta">${t.source
      ? `<a href="${esc(t.source)}" target="_blank" rel="noopener">${esc(t.value)}</a>` : esc(t.value)}</span></div>`).join('')}</div>`;
}
