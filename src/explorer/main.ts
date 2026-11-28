import './style.css';
import rawData from 'virtual:explorer-data';
import type { Deal, Layer, VerificationStatus } from '../data/schema';
import type { ExplorerData, FactCell, SeriesCard, SourceInfo, TableMetric } from './prepare';
import { TABLE_METRICS } from './prepare';
import { engineSection } from './engine-section';
import { STATUS_RANK, escapeHtml as esc, formatSeriesValue, formatUsd, statusBadge } from './format';

// ---------- lookups ----------

const data = rawData as ExplorerData;

const LAYERS: Array<{ id: Layer; label: string }> = [
  { id: 'money', label: 'Money' },
  { id: 'labs', label: 'Labs' },
  { id: 'financing', label: 'Financing' },
  { id: 'cloud', label: 'Clouds' },
  { id: 'chips', label: 'Chips' },
  { id: 'supply', label: 'Supply' },
];
const LAYER_ORDER = new Map(LAYERS.map((l, i) => [l.id, i]));
const entityById = new Map(data.entities.map(e => [e.id, e]));
const nameOf = (id: string) => entityById.get(id)?.name ?? id;
const layerOf = (id: string): Layer | undefined => entityById.get(id)?.layer;
const source = (i: number): SourceInfo => data.sources[i];

const METRIC_LABEL: Record<TableMetric, string> = {
  revenue: 'Revenue', capex: 'Capex', operatingCashFlow: 'Operating cash flow', cash: 'Cash', longTermDebt: 'Long-term debt',
};
const COVERAGE_METRIC_LABEL: Record<string, string> = {
  revenue: 'revenue', capex: 'capex', operatingCashFlow: 'operating cash flow', cash: 'cash', longTermDebt: 'long-term debt',
  netIncome: 'net income', epsDiluted: 'diluted EPS', accountsReceivable: 'receivables', grossProfit: 'gross profit',
  segmentRevenue: 'segment revenue', dilutedShares: 'diluted shares',
  remainingPerformanceObligations: 'remaining performance obligations',
};

const nf = new Intl.NumberFormat('en-US');
const humanize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!m) return y;
  return d ? `${+d} ${MONTHS[+m - 1]} ${y}` : `${MONTHS[+m - 1]} ${y}`;
}
const monthYear = (iso: string) => { const [y, m] = iso.split('-'); return m ? `${MONTHS[+m - 1]} ${y}` : y; };

// ---------- small building blocks ----------

const dot = (layer: Layer | undefined) => `<span class="ldot" data-layer="${layer ?? 'none'}" aria-hidden="true"></span>`;

function badge(status: VerificationStatus, opts: { href?: string; title?: string; count?: number } = {}): string {
  const b = statusBadge(status);
  const text = `${esc(b.label)}${opts.count && opts.count > 1 ? ` <span class="bc">${opts.count}</span>` : ''}`;
  const title = opts.title ? ` title="${esc(opts.title)}"` : '';
  return opts.href
    ? `<a class="badge" data-tone="${b.tone}" href="${esc(opts.href)}" target="_blank" rel="noopener"${title}>${text}</a>`
    : `<span class="badge" data-tone="${b.tone}"${title}>${text}</span>`;
}

const sourceBadge = (s: SourceInfo, extra = '') =>
  badge(s.status, { href: s.url, title: [s.title ?? s.url, extra].filter(Boolean).join(' · ') });

/** Polyline path with breaks at nulls. xs and ys are already in pixel space. */
function pathFor(points: Array<[number, number] | null>): string {
  let d = '';
  let pen = false;
  for (const p of points) {
    if (!p) { pen = false; continue; }
    d += `${pen ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    pen = true;
  }
  return d;
}

function scale(values: number[], lo: number, hi: number): (v: number) => number {
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) { min -= 1; max += 1; }
  return v => hi - ((v - min) / (max - min)) * (hi - lo);
}

// ---------- header ----------

function header(): string {
  const m = data.manifest;
  const u = m.unverifiedCounts;
  const unverifiedTotal = (u.facts ?? 0) + (u.deals ?? 0) + (u.seriesPoints ?? 0);
  const stats: Array<[string, string]> = [
    ['Entities', nf.format(m.counts.entities)],
    ['Quarterly facts', nf.format(m.counts.facts)],
    ['Market series', nf.format(m.counts.series)],
    ['Deals', nf.format(m.counts.deals)],
  ];
  return `
  <header class="top">
    <div class="brand">
      <span class="logo" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
      <span class="early">Early version: data only</span>
    </div>
    <h1>AI capital flows — data check</h1>
    <p class="lede">Every figure the model will run on, with where it came from and how well it is verified.
      Quarters are calendar quarters (fiscal periods are placed by their midpoint); window ${esc(m.window.from)}–${esc(m.window.to)}.</p>
    <div class="stats">
      ${stats.map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('')}
      <div class="stat" data-tone="${unverifiedTotal ? 'warn' : 'good'}"><div class="k">Unverified</div>
        <div class="v">${unverifiedTotal}</div>
        <div class="s">${u.facts ?? 0} facts · ${u.deals ?? 0} deal sources · ${u.seriesPoints ?? 0} series points</div></div>
    </div>
    <div class="legends">
      <div class="legend" aria-label="Layers">${LAYERS.map(l => `<span>${dot(l.id)}${l.label}</span>`).join('')}</div>
      <div class="legend" aria-label="Verification">
        <span>${badge('primary-filing')} regulatory filing</span>
        <span>${badge('primary-company')} company release</span>
        <span>${badge('secondary')} press or data vendor</span>
        <span>${badge('unverified')} not yet confirmed</span>
      </div>
    </div>
    <nav class="toc"><a href="./">Canvas</a><a href="#companies">Companies</a><a href="#deals">Deals</a><a href="#series">Series</a><a href="#coverage">Coverage</a>${data.engine ? '<a href="#engine">Engine check</a>' : ''}</nav>
  </header>`;
}

// ---------- 1. companies ----------

interface CompanyRow { id: string; latestQuarter: string; byMetric: Map<TableMetric, FactCell[]> }

function companyRows(): CompanyRow[] {
  const by = new Map<string, Map<TableMetric, FactCell[]>>();
  for (const f of data.facts) {
    let m = by.get(f.entityId);
    if (!m) by.set(f.entityId, (m = new Map()));
    let list = m.get(f.metric);
    if (!list) m.set(f.metric, (list = []));
    list.push(f);
  }
  const rows: CompanyRow[] = [...by.entries()].map(([id, byMetric]) => {
    const rev = byMetric.get('revenue') ?? [];
    const all = [...byMetric.values()].flat();
    const latestQuarter = (rev.length ? rev : all).reduce((q, f) => (f.quarter > q ? f.quarter : q), '');
    return { id, latestQuarter, byMetric };
  });
  const lastRevenue = (r: CompanyRow) => r.byMetric.get('revenue')?.find(f => f.quarter === r.latestQuarter)?.value ?? 0;
  return rows.sort((a, b) =>
    (LAYER_ORDER.get(layerOf(a.id)!) ?? 9) - (LAYER_ORDER.get(layerOf(b.id)!) ?? 9) || lastRevenue(b) - lastRevenue(a));
}

function quarterKeys(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, q] = [+from.slice(0, 4), +from.slice(5)];
  const end = +to.slice(0, 4) * 4 + +to.slice(5);
  while (y * 4 + q <= end) { out.push(`${y}Q${q}`); if (++q > 4) { q = 1; y++; } }
  return out;
}

function sparkline(cells: FactCell[], layer: Layer | undefined): string {
  const qs = quarterKeys(data.manifest.window.from, data.manifest.window.to);
  const byQ = new Map(cells.map(c => [c.quarter, c.value]));
  const vals = qs.map(q => byQ.get(q) ?? null);
  const present = vals.filter((v): v is number => v !== null);
  if (present.length < 2) return '<span class="muted">—</span>';
  const W = 132, H = 30;
  const y = scale(present, 3, H - 3);
  const x = (i: number) => 2 + (i / (qs.length - 1)) * (W - 6);
  const pts = vals.map((v, i) => (v === null ? null : [x(i), y(v)] as [number, number]));
  const last = [...pts].reverse().find(Boolean)!;
  const first = cells.find(c => byQ.has(c.quarter))!;
  const lastCell = cells[cells.length - 1];
  const label = `Quarterly revenue ${first.quarter}–${lastCell.quarter}: ${formatUsd(first.value)} to ${formatUsd(lastCell.value)}`;
  return `<svg class="spark" data-layer="${layer}" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(label)}">
    <title>${esc(label)}</title><path d="${pathFor(pts)}"/><circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.2"/></svg>`;
}

function valueCell(cells: FactCell[] | undefined, quarter: string, label: string): string {
  if (!cells?.length) return `<td class="num" data-label="${esc(label)}"><span class="muted">—</span></td>`;
  const at = cells.find(c => c.quarter === quarter) ?? cells[cells.length - 1];
  const s = source(at.src);
  const notes = [`known ${at.asKnownAt}`, at.derived ? 'quarter derived from year-to-date filings' : ''].filter(Boolean).join(' · ');
  const other = at.quarter !== quarter ? `<span class="qtag" title="Latest available quarter for this metric">${esc(at.quarter)}</span>` : '';
  return `<td class="num" data-label="${esc(label)}"><div class="val" title="${esc(`${at.quarter} · ${notes}`)}">${other}${formatUsd(at.value)}${at.derived ? '<sup title="Derived from year-to-date filings">d</sup>' : ''}</div>
    <div class="vb">${sourceBadge(s, notes)}</div></td>`;
}

function companies(): string {
  const rows = companyRows();
  return `
  <section id="companies">
    <div class="sh"><h2>Companies</h2><p>${rows.length} companies with quarterly filings or company-reported figures. Latest-known
      value for each quarter (restated figures replace earlier ones). Badge links open the filing.</p></div>
    <div class="scroll"><table class="t stack companies">
      <thead><tr><th>Company</th><th>Quarter</th>${TABLE_METRICS.map(m => `<th class="num">${METRIC_LABEL[m]}</th>`).join('')}
        <th>Revenue since ${esc(data.manifest.window.from)}</th></tr></thead>
      <tbody>${rows.map(r => {
        const e = entityById.get(r.id);
        return `<tr><td class="co">${dot(e?.layer)}<span>${esc(e?.name ?? r.id)}</span>${e?.ticker ? `<span class="tick">${esc(e.ticker)}</span>` : ''}</td>
          <td class="mono q" data-label="Latest quarter">${esc(r.latestQuarter)}</td>
          ${TABLE_METRICS.map(m => valueCell(r.byMetric.get(m), r.latestQuarter, METRIC_LABEL[m])).join('')}
          <td data-label="Revenue since ${esc(data.manifest.window.from)}">${sparkline(r.byMetric.get('revenue') ?? [], e?.layer)}</td></tr>`;
      }).join('')}</tbody>
    </table></div>
    <p class="foot"><sup>d</sup> quarter computed from year-to-date figures in the filings. A quarter shown beside a value means that
      metric's latest filing is for a different quarter.</p>
  </section>`;
}

// ---------- 2. deals ----------

const VALUE_FIELDS = [
  ['hardMinimumUsd', 'Hard minimum', 'Contractually committed floor'],
  ['ceilingUsd', 'Ceiling', 'Up-to amount; may never be reached'],
  ['conditionalUsd', 'Conditional', 'Depends on milestones or options'],
  ['estimateUsd', 'Estimate', 'Reported or derived estimate, not a contract term'],
] as const;

const TYPE_LABEL: Partial<Record<Deal['types'][number], string>> = {
  'spv-financing': 'SPV financing', jv: 'JV', 'buyer-of-last-resort': 'Buyer of last resort',
};

const latestStatus = (d: Deal) => [...d.statusHistory].sort((a, b) => a.date.localeCompare(b.date)).at(-1)!;
const dealParties = (d: Deal) => new Set([...d.payers, ...d.payees, ...d.guarantors, ...(d.vehicle ? [d.vehicle] : [])]);

function sourcePills(sources: SourceInfo[]): string {
  const counts = new Map<VerificationStatus, number>();
  for (const s of sources) counts.set(s.status, (counts.get(s.status) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => STATUS_RANK[b[0]] - STATUS_RANK[a[0]])
    .map(([st, n]) => {
      const titles = sources.filter(s => s.status === st).map(s => s.title ?? s.url).join('\n');
      return badge(st, { count: n, title: titles });
    }).join('');
}

function partyList(ids: string[]): string {
  if (!ids.length) return '<span class="muted">—</span>';
  return ids.map(id => `<span class="party">${dot(layerOf(id))}${esc(nameOf(id))}</span>`).join('');
}

function dealDetail(d: Deal): string {
  const t = d.terms;
  const terms: Array<[string, string | undefined]> = [
    ['Rate', t.rate], ['Maturity', t.maturity], ['Recourse', t.recourse !== 'unknown' ? t.recourse : undefined],
    ['Collateral', t.collateral], ['Take-or-pay', t.takeOrPay !== 'unknown' ? t.takeOrPay : undefined],
    ['Hell-or-high-water', t.hellOrHighWater !== 'unknown' ? t.hellOrHighWater : undefined],
    ['Termination rights', t.terminationRights], ['Exclusivity', t.exclusivity],
    ['Signed', d.signed], ['Start', d.start], ['End', d.end],
  ];
  const shown = terms.filter(([, v]) => v);
  return `<div class="detail">
    <div><h4>Terms</h4>${shown.length ? `<dl>${shown.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v!)}</dd>`).join('')}</dl>` : '<p class="muted">No terms recorded.</p>'}
      ${t.notes ? `<p class="notes">${esc(t.notes)}</p>` : ''}</div>
    <div><h4>Status history</h4><ol class="hist">${[...d.statusHistory].sort((a, b) => a.date.localeCompare(b.date)).map(h =>
      `<li><span class="mono">${esc(h.date)}</span> <b>${esc(humanize(h.status))}</b>${h.note ? ` — ${esc(h.note)}` : ''}</li>`).join('')}</ol></div>
    <div><h4>Sources</h4><ul class="srcs">${d.sources.map(s =>
      `<li>${sourceBadge(s)} <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title ?? s.url)}</a> <span class="muted mono">${esc(s.retrieved)}</span></li>`).join('')}</ul></div>
  </div>`;
}

function dealRow(d: Deal): string {
  const st = latestStatus(d);
  const valueCells = VALUE_FIELDS.map(([k, label]) => {
    const v = d.values[k];
    return v === undefined
      ? `<td class="num mono nv" data-label="${label}"><span class="muted">—</span></td>`
      : `<td class="num mono" data-label="${label}">${formatUsd(v)}</td>`;
  }).join('');
  return `<tr class="deal" data-id="${esc(d.id)}">
    <td><div class="dn"><button class="exp" aria-expanded="false" aria-controls="dd-${esc(d.id)}" title="Show terms and sources"><span aria-hidden="true">›</span></button>
      <div><div class="name">${esc(d.name)}</div><div class="sub mono">${esc(d.announced)}</div></div></div></td>
    <td class="flow"><div class="parties">${partyList(d.payers)}<span class="arrow" aria-label="pays">→</span>${partyList(d.payees)}</div>
      ${d.vehicle ? `<div class="sub">via ${esc(nameOf(d.vehicle))}</div>` : ''}
      ${d.guarantors.length ? `<div class="sub">guaranteed by ${esc(d.guarantors.map(nameOf).join(', '))}</div>` : ''}</td>
    <td data-label="Type"><div>${d.types.map(t => `<span class="type">${esc(TYPE_LABEL[t] ?? humanize(t))}</span>`).join('')}</div></td>
    ${valueCells}
    <td data-label="Status"><div><span class="st" data-status="${st.status}">${esc(humanize(st.status))}</span><div class="sub mono">${esc(st.date)}</div></div></td>
    <td data-label="Sources"><div class="pills">${sourcePills(d.sources)}</div></td>
  </tr>
  <tr class="drow" id="dd-${esc(d.id)}" hidden><td colspan="9">${dealDetail(d)}</td></tr>`;
}

function deals(): string {
  const involved = new Set(data.deals.flatMap(d => [...dealParties(d)]));
  const ents = [...involved].sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  const statuses = [...new Set(data.deals.map(d => latestStatus(d).status))].sort();
  return `
  <section id="deals">
    <div class="sh"><h2>Deals</h2><p>${data.deals.length} agreements between the layers. The four value columns are different kinds of
      commitment and are never added together. Open a row for terms, status history and sources.</p></div>
    <div class="filters">
      <label>Entity <select id="f-entity"><option value="">All entities</option>${ents.map(id =>
        `<option value="${esc(id)}">${esc(nameOf(id))}</option>`).join('')}</select></label>
      <label>Status <select id="f-status"><option value="">All statuses</option>${statuses.map(s =>
        `<option value="${s}">${esc(humanize(s))}</option>`).join('')}</select></label>
      <span class="count" id="f-count" aria-live="polite"></span>
    </div>
    <div class="scroll"><table class="t stack deals">
      <thead><tr><th>Deal</th><th>Payer → payee</th><th>Type</th>
        ${VALUE_FIELDS.map(([, label, help]) => `<th class="num" title="${esc(help)}">${label}</th>`).join('')}
        <th>Status</th><th>Sources</th></tr></thead>
      <tbody id="deal-body"></tbody>
    </table><p class="empty" id="deal-empty" hidden>No deals match these filters.</p></div>
  </section>`;
}

function wireDeals(root: HTMLElement): void {
  const body = root.querySelector<HTMLTableSectionElement>('#deal-body')!;
  const fe = root.querySelector<HTMLSelectElement>('#f-entity')!;
  const fs = root.querySelector<HTMLSelectElement>('#f-status')!;
  const count = root.querySelector<HTMLElement>('#f-count')!;
  const empty = root.querySelector<HTMLElement>('#deal-empty')!;
  const sorted = [...data.deals].sort((a, b) => b.announced.localeCompare(a.announced));
  const render = () => {
    const list = sorted.filter(d => (!fe.value || dealParties(d).has(fe.value)) && (!fs.value || latestStatus(d).status === fs.value));
    body.innerHTML = list.map(dealRow).join('');
    count.textContent = `Showing ${list.length} of ${data.deals.length}`;
    empty.hidden = list.length > 0;
  };
  fe.addEventListener('change', render);
  fs.addEventListener('change', render);
  body.addEventListener('click', ev => {
    const target = ev.target as HTMLElement;
    if (target.closest('a')) return;
    const row = target.closest<HTMLTableRowElement>('tr.deal');
    if (!row) return;
    const detail = row.nextElementSibling as HTMLTableRowElement;
    const btn = row.querySelector<HTMLButtonElement>('button.exp')!;
    const open = detail.hidden;
    detail.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    row.classList.toggle('open', open);
  });
  render();
}

// ---------- 3. series ----------

const KINDS: Array<{ id: SeriesCard['kind']; label: string; blurb: string }> = [
  { id: 'condition', label: 'Conditions', blurb: 'Rates, credit spreads, CDS and GPU prices: the outside world the model reacts to.' },
  { id: 'indicator', label: 'Indicators', blurb: 'Markets, currencies, adoption and disclosed exposures.' },
  { id: 'consensus', label: 'Wall Street consensus', blurb: 'Analyst estimates the model is compared against.' },
  { id: 'guidance', label: 'Company guidance', blurb: 'What companies say they will spend or earn.' },
];

function seriesStatus(s: SeriesCard): { worst: VerificationStatus; unverified: number; latest: SourceInfo } {
  const pointSrcs = s.points.filter(p => p.src !== undefined).map(p => source(p.src!));
  const all = [source(s.src), ...pointSrcs];
  const worst = all.reduce((w, x) => (STATUS_RANK[x.status] < STATUS_RANK[w] ? x.status : w), all[0].status);
  const last = s.points.at(-1);
  const latest = last?.src !== undefined ? source(last.src) : source(s.src);
  return { worst, unverified: pointSrcs.filter(x => x.status === 'unverified').length, latest };
}

function seriesChart(s: SeriesCard): string {
  const W = 240, H = 52;
  const ts = s.points.map(p => Date.parse(p.date));
  const t0 = Math.min(...ts), t1 = Math.max(...ts);
  const x = (t: number) => 3 + ((t - t0) / (t1 - t0 || 1)) * (W - 6);
  const y = scale(s.points.map(p => p.value), 4, H - 4);
  const pts = s.points.map((p, i) => [x(ts[i]), y(p.value)] as [number, number]);
  const sparse = s.points.length <= 12;
  const dots = s.points.map((p, i) => {
    const unv = p.src !== undefined && source(p.src).status === 'unverified';
    return sparse || unv || i === s.points.length - 1
      ? `<circle class="${unv ? 'unv' : ''}" cx="${pts[i][0].toFixed(1)}" cy="${pts[i][1].toFixed(1)}" r="${unv ? 3 : 2.2}"><title>${esc(`${p.date}: ${formatSeriesValue(p.value, s.unit)}${unv ? ' (unverified)' : ''}`)}</title></circle>`
      : '';
  }).join('');
  const values = s.points.map(p => p.value);
  const label = `${s.name}: ${s.points.length} points from ${s.points[0].date} to ${s.points.at(-1)!.date}, range ${formatSeriesValue(Math.min(...values), s.unit)} to ${formatSeriesValue(Math.max(...values), s.unit)}`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}"><path d="${pathFor(pts)}"/>${dots}</svg>`;
}

/** Series value without trailing unit words, for the tight low–high range under each chart. */
const bare = (v: number, unit: string) => formatSeriesValue(v, unit).replace(/(\/GPU-h| y\/y| of launch| analysts| bp)$/, '');

function seriesCard(s: SeriesCard): string {
  const st = seriesStatus(s);
  const last = s.points.at(-1);
  const values = s.points.map(p => p.value);
  const plotted = s.points.length >= 2;
  const range = plotted
    ? `<span>${esc(monthYear(s.points[0].date))}</span><span title="Low – high">${esc(bare(Math.min(...values), s.unit))} – ${esc(bare(Math.max(...values), s.unit))}</span><span>${esc(monthYear(last!.date))}</span>`
    : '';
  const title = s.sampled ? `${s.name}. Showing month-end values since 2019 (${nf.format(s.totalPoints)} daily points from ${s.firstDate}).` : s.name;
  return `<article class="card${st.worst === 'unverified' ? ' warn' : ''}">
    <header><span class="prov">${esc(s.provider)}</span>${badge(st.latest.status, { href: st.latest.url, title: st.latest.title ?? st.latest.url })}
      ${st.unverified && st.latest.status !== 'unverified' ? `<span class="badge" data-tone="warn">${st.unverified} unverified</span>` : ''}</header>
    <h3 title="${esc(title)}">${esc(s.name)}</h3>
    <div class="last"><b>${last ? esc(formatSeriesValue(last.value, s.unit)) : '—'}</b>${last ? `<span>${esc(shortDate(last.date))}${plotted ? '' : ' · single reading'}</span>` : ''}</div>
    ${plotted ? `<div class="plot">${seriesChart(s)}</div><div class="range mono">${range}</div>` : ''}
  </article>`;
}

function series(): string {
  return `
  <section id="series">
    <div class="sh"><h2>Series</h2><p>${data.series.length} market series. Long daily histories are shown as month-end values since 2019;
      hover a title for details. Amber dots are readings not yet confirmed.</p></div>
    ${KINDS.map(k => {
      const list = data.series.filter(s => s.kind === k.id);
      if (!list.length) return '';
      return `<details class="kind" data-kind="${k.id}" open><summary><span class="kl">${k.label}</span><span class="kc mono">${list.length}</span><span class="kb">${k.blurb}</span></summary>
        <div class="grid">${list.map(seriesCard).join('')}</div></details>`;
    }).join('')}
  </section>`;
}

// ---------- 4. coverage ----------

const KIND_PLURAL: Record<string, string> = {
  'public-company': 'public companies', 'private-company': 'private companies', spv: 'SPVs', lender: 'lenders',
  aggregate: 'aggregates', government: 'government bodies',
};

function coverage(): string {
  const byEntity = new Map<string, typeof data.coverage>();
  for (const r of data.coverage) {
    if (!byEntity.has(r.entityId)) byEntity.set(r.entityId, []);
    byEntity.get(r.entityId)!.push(r);
  }
  const ids = [...byEntity.keys()].sort((a, b) =>
    (LAYER_ORDER.get(layerOf(a)!) ?? 9) - (LAYER_ORDER.get(layerOf(b)!) ?? 9) || nameOf(a).localeCompare(nameOf(b)));
  const reporting = new Set(ids);
  const without = data.entities.filter(e => !reporting.has(e.id));
  const kindCounts = new Map<string, number>();
  for (const e of without) kindCounts.set(e.kind, (kindCounts.get(e.kind) ?? 0) + 1);

  const unverifiedDeals = data.deals.filter(d => d.sources.some(s => s.status === 'unverified'));
  const unverifiedPoints = data.series.flatMap(s => s.points.filter(p => p.src !== undefined && source(p.src).status === 'unverified')
    .map(p => ({ s, p })));

  return `
  <section id="coverage">
    <div class="sh"><h2>Coverage</h2><p>Which quarters are missing for each reporting company, and what is still unverified. Gaps are
      reported, never filled.</p></div>
    <div class="scroll"><table class="t stack cov">
      <thead><tr><th>Company</th><th class="num">Metrics with data</th><th>Range</th><th>Gaps</th><th class="num">Unverified</th></tr></thead>
      <tbody>${ids.map(id => {
        const rows = byEntity.get(id)!;
        const withData = rows.filter(r => r.firstQuarter);
        const first = withData.map(r => r.firstQuarter!).sort()[0];
        const last = withData.map(r => r.lastQuarter!).sort().at(-1);
        const gaps = rows.filter(r => r.gaps.length);
        const missing = rows.filter(r => !r.firstQuarter);
        const unv = rows.reduce((n, r) => n + r.unverifiedCount, 0);
        const gapText = [
          ...gaps.map(r => `<span class="gap"><b>${esc(COVERAGE_METRIC_LABEL[r.metric] ?? r.metric)}</b> ${r.gaps.map(esc).join(', ')}</span>`),
          ...(missing.length ? [`<span class="gap"><b>no data</b> ${missing.map(r => esc(COVERAGE_METRIC_LABEL[r.metric] ?? r.metric)).join(', ')}</span>`] : []),
        ];
        return `<tr><td class="co">${dot(layerOf(id))}<span>${esc(nameOf(id))}</span></td>
          <td class="num mono" data-label="Metrics with data">${withData.length} of ${rows.length}</td>
          <td class="mono nw" data-label="Range">${first ? `${esc(first)}–${esc(last!)}` : '—'}</td>
          <td><div class="gaps">${gapText.length ? gapText.join('') : '<span class="ok">None</span>'}</div></td>
          <td class="num mono" data-label="Unverified">${unv ? `<span class="badge" data-tone="warn">${unv}</span>` : '0'}</td></tr>`;
      }).join('')}</tbody>
    </table></div>
    <div class="covnotes">
      <div class="note"><h4>Entities without quarterly financials</h4>
        <p>${without.length} of ${data.entities.length} entities in the registry report no quarterly figures here
        (${[...kindCounts.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} ${esc(KIND_PLURAL[k] ?? k)}`).join(', ')}).
        They appear in the model through deals and series instead.</p></div>
      <div class="note warn"><h4>Still unverified</h4>
        <ul>${unverifiedDeals.map(d => `<li><b>Deal</b> ${esc(d.name)} — ${d.sources.filter(s => s.status === 'unverified').length} of ${d.sources.length} sources</li>`).join('')}
        ${unverifiedPoints.map(({ s, p }) => `<li><b>Series</b> ${esc(s.name)} — ${esc(formatSeriesValue(p.value, s.unit))}, ${esc(shortDate(p.date))}</li>`).join('')}</ul></div>
    </div>
  </section>`;
}

// ---------- page ----------

function footer(): string {
  const d = new Date(data.manifest.builtAt);
  const when = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
  return `<footer class="bottom"><span>Data built <b>${esc(when)}</b></span><span>Sources: SEC EDGAR (XBRL), FRED, company releases and press</span>
    <span class="muted">Early version — figures are for checking, not for decisions.</span></footer>`;
}

const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = `<div class="wrap">${header()}${companies()}${deals()}${series()}${coverage()}${data.engine ? engineSection(data.engine) : ''}${footer()}</div>`;
wireDeals(app);
// On phones, start the two long single-reading groups folded so the page stays scannable.
if (window.matchMedia('(max-width: 640px)').matches) {
  app.querySelectorAll<HTMLDetailsElement>('details.kind[data-kind="consensus"], details.kind[data-kind="guidance"]').forEach(d => { d.open = false; });
}
