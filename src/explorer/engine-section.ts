// "Engine check" section: a summary of the baseline engine run and its backtest. `engineSummary` is pure and runs at
// build time (prepare.ts); `engineSection` renders it in the page. Type-only imports keep Node code out of the bundle.
import type { QuarterKey } from '../data/schema';
import type { BacktestReport, BacktestTarget } from '../engine/backtest';
import type { EngineBaseline, EngineEvent } from '../engine/types';
import { escapeHtml as esc, formatUsd } from './format';

export interface EngineSummary {
  asOf: string;
  start: QuarterKey;
  nvidiaFy: { fy: number; model: number; consensus?: number }[];
  capex: { year: number; model: number; guidance?: number }[];
  backtest: { target: BacktestTarget; modelMape: number; naiveMape: number; driftMape: number; etsMape: number;
    bestBenchmark: string; beatsAllBenchmarks: boolean; n: number }[];
  /** One-quarter-ahead NVIDIA revenue from each backtest origin, against what was reported. */
  nvidiaBacktest: { quarter: QuarterKey; actual: number; model: number }[];
  supplyBoundQuarters: QuarterKey[];
  events: EngineEvent[];
  overfitWarning: boolean;
  fitMape?: number;
  holdoutMape?: number;
}

const FISCAL_YEARS = [2027, 2028, 2029];
const CAPEX_YEARS = [2026, 2027, 2028, 2029];
const HYPERSCALERS = ['microsoft', 'alphabet', 'amazon', 'meta'];
const EVENT_KINDS = new Set<EngineEvent['kind']>(['supply-bound', 'minsky-change', 'default']);

export function engineSummary(baseline: EngineBaseline, backtest: BacktestReport & { calibration?: { fitMape: number; holdoutMape: number } }): EngineSummary {
  const cmp = baseline.comparisons;
  // NVIDIA fiscal year fy runs Feb fy−1 to Jan fy: the calendar quarters of fy−1 (their midpoints fall inside it).
  const nvidiaFy = FISCAL_YEARS.map(fy => ({
    fy,
    model: baseline.nvidia.filter(q => q.quarter.startsWith(String(fy - 1))).reduce((t, q) => t + q.revenue, 0),
    consensus: cmp.nvidiaRevenueConsensus.find(c => c.fy === fy)?.usd,
  }));
  // Reported quarters hold total capex; simulated quarters hold AI capex, grossed up by the AI share.
  const capex = CAPEX_YEARS.map(year => ({
    year,
    model: HYPERSCALERS.reduce((t, id) => t + (baseline.entities[id] ?? [])
      .filter(r => r.quarter.startsWith(String(year)))
      .reduce((u, r) => u + (r.modelled ? r.capex / cmp.aiCapexShare : r.capex), 0), 0),
    guidance: cmp.capexGuidance.find(g => g.year === year)?.usd,
  }));
  const rows = Object.entries(backtest.summary)
    .filter(([, v]) => v.n > 0)
    .map(([target, v]) => {
      const bench: [string, number][] = [['naive', v.naiveMape], ['drift', v.driftMape], ['ETS', v.etsMape]];
      const best = bench.reduce((a, b) => (b[1] < a[1] ? b : a));
      return { target: target as BacktestTarget, modelMape: v.modelMape, naiveMape: v.naiveMape, driftMape: v.driftMape,
        etsMape: v.etsMape, bestBenchmark: best[0], beatsAllBenchmarks: v.beatsAllBenchmarks, n: v.n };
    });
  const nvidiaBacktest = backtest.rows
    .filter(r => r.target === 'nvidiaRevenue' && r.horizon === 1)
    .map(r => ({ quarter: r.quarter, actual: r.actual, model: r.model }))
    .sort((a, b) => a.quarter.localeCompare(b.quarter));
  const events = baseline.events.filter(e => e.quarter >= baseline.start && EVENT_KINDS.has(e.kind));
  return {
    asOf: baseline.asOf, start: baseline.start, nvidiaFy, capex, backtest: rows, nvidiaBacktest,
    supplyBoundQuarters: [...new Set(events.filter(e => e.kind === 'supply-bound').map(e => e.quarter))],
    events, overfitWarning: baseline.overfitWarning,
    fitMape: backtest.calibration?.fitMape, holdoutMape: backtest.calibration?.holdoutMape,
  };
}

// ---------- rendering ----------

const TARGET_LABEL: Record<BacktestTarget, string> = {
  nvidiaRevenue: 'NVIDIA revenue', nvidiaDataCenter: 'NVIDIA Data Center revenue',
  hyperscalerCapex: 'Hyperscaler capex (4 cash-funded)', anthropicRevenue: 'Anthropic revenue',
};
const EVENT_LABEL: Record<string, string> = { 'supply-bound': 'Supply limit', 'minsky-change': 'Financing stance', default: 'Default' };
const pct = (v: number) => `${v.toFixed(1)}%`;
const gap = (model: number, ref?: number) => (ref ? `${model >= ref ? '+' : ''}${(((model - ref) / ref) * 100).toFixed(0)}%` : '—');

/** Two-line chart (model dashed, reference solid) with labelled x ticks; values in USD. */
function lineChart(points: { x: string; a?: number; b: number }[], labels: { a: string; b: string }, aria: string): string {
  const W = 560, H = 170, L = 52, R = 30, T = 12, B = 26;
  const vals = points.flatMap(p => (p.a === undefined ? [p.b] : [p.a, p.b]));
  const max = Math.max(...vals) * 1.08, min = 0;
  const x = (i: number) => L + (points.length === 1 ? 0 : (i / (points.length - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - (v - min) / (max - min || 1)) * (H - T - B);
  const path = (k: 'a' | 'b') => points.map((p, i) => (p[k] === undefined ? null : [x(i), y(p[k]!)] as const))
    .reduce((d, pt, i, arr) => (pt ? `${d}${arr[i - 1] ? 'L' : 'M'}${pt[0].toFixed(1)} ${pt[1].toFixed(1)}` : d), '');
  const ticks = [0, 0.5, 1].map(f => min + f * (max - min));
  const every = Math.max(1, Math.ceil(points.length / 8));
  return `<figure class="echart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}">
    ${ticks.map(t => `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/><text class="yt" x="${L - 6}" y="${(y(t) + 3.5).toFixed(1)}">${esc(formatUsd(t))}</text>`).join('')}
    ${points.map((p, i) => (i % every === 0 || i === points.length - 1 ? `<text class="xt${i === points.length - 1 ? ' end' : ''}" x="${x(i).toFixed(1)}" y="${H - 8}">${esc(p.x)}</text>` : '')).join('')}
    <path class="ref" d="${path('a')}"/><path class="mod" d="${path('b')}"/>
    ${points.map((p, i) => `<circle class="mod" cx="${x(i).toFixed(1)}" cy="${y(p.b).toFixed(1)}" r="2.4"><title>${esc(`${p.x}: model ${formatUsd(p.b)}${p.a !== undefined ? `, ${labels.a.toLowerCase()} ${formatUsd(p.a)}` : ''}`)}</title></circle>`).join('')}
  </svg><figcaption><span class="k ref"></span>${esc(labels.a)}<span class="k mod"></span>${esc(labels.b)}</figcaption></figure>`;
}

/** Runs of consecutive quarters with the same firm and reason become one line (quarter–until). */
function collapse(events: EngineEvent[]): (EngineEvent & { until: QuarterKey })[] {
  const out: (EngineEvent & { until: QuarterKey })[] = [];
  const next = (q: QuarterKey): QuarterKey => (q[5] === '4' ? `${Number(q.slice(0, 4)) + 1}Q1` : `${q.slice(0, 5)}${Number(q[5]) + 1}`) as QuarterKey;
  for (const e of events) {
    const run = out.find(r => r.entityId === e.entityId && r.reason === e.reason && next(r.until) === e.quarter);
    if (run) run.until = e.quarter; else out.push({ ...e, until: e.quarter });
  }
  return out;
}

export function engineSection(s: EngineSummary): string {
  const fyRows = s.nvidiaFy.map(r => `<tr><td>FY${r.fy}</td><td class="num" data-label="Model">${formatUsd(r.model)}</td>
    <td class="num" data-label="Consensus">${r.consensus ? formatUsd(r.consensus) : '<span class="muted">none published</span>'}</td>
    <td class="num" data-label="Model vs consensus">${gap(r.model, r.consensus)}</td></tr>`).join('');
  const capexRows = s.capex.map(r => `<tr><td>${r.year}</td><td class="num" data-label="Model">${formatUsd(r.model)}</td>
    <td class="num" data-label="Guidance">${r.guidance ? formatUsd(r.guidance) : '<span class="muted">none given</span>'}</td>
    <td class="num" data-label="Model vs guidance">${gap(r.model, r.guidance)}</td></tr>`).join('');
  const btRows = s.backtest.map(b => `<tr><td>${esc(TARGET_LABEL[b.target])}</td>
    <td class="num" data-label="Model">${pct(b.modelMape)}</td><td class="num" data-label="Naive">${pct(b.naiveMape)}</td>
    <td class="num" data-label="Drift">${pct(b.driftMape)}</td><td class="num" data-label="ETS">${pct(b.etsMape)}</td>
    <td class="num" data-label="Scored">${b.n}</td>
    <td data-label="Result">${b.beatsAllBenchmarks ? `<span class="badge" data-tone="good">Beats all three</span>` : `<span class="badge" data-tone="warn">Loses to ${esc(b.bestBenchmark)}</span>`}</td></tr>`).join('');
  const byKind = (k: string) => collapse(s.events.filter(e => e.kind === k));
  const eventGroups = ['default', 'minsky-change', 'supply-bound'].map(k => {
    const list = byKind(k);
    if (!list.length) return `<div class="note"><h4>${EVENT_LABEL[k]}s</h4><p class="muted">None in the baseline run.</p></div>`;
    const shown = list.slice(0, 12);
    return `<div class="note"><h4>${EVENT_LABEL[k]}s</h4><ul class="events">${shown.map(e =>
      `<li><span class="mono q">${esc(e.quarter === e.until ? e.quarter : `${e.quarter}–${e.until}`)}</span> <b>${esc(e.entityId)}</b> ${esc(e.reason)}</li>`).join('')}</ul>
      ${list.length > shown.length ? `<p class="foot">and ${list.length - shown.length} more.</p>` : ''}</div>`;
  }).join('');
  const fit = s.fitMape !== undefined && s.holdoutMape !== undefined
    ? `Calibration error ${pct(s.fitMape)} on the fit years (2023–2025) and ${pct(s.holdoutMape)} on held-out 2026.` : '';

  return `
  <section id="engine">
    <div class="sh"><h2>Engine check</h2><span class="early">Early version: simple rules, not yet validated</span>
      <p>One baseline run of the engine from ${esc(s.start)}, using what was public on ${esc(s.asOf)}, set against analyst
      consensus, company guidance and a backtest. ${fit}${s.overfitWarning ? ' <b class="warn">Held-out error is more than twice the fit error: the calibration may be overfitted.</b>' : ''}</p></div>

    <div class="egrid">
      <div><h3>NVIDIA revenue by fiscal year</h3>
        ${lineChart(s.nvidiaFy.map(r => ({ x: `FY${r.fy}`, a: r.consensus, b: r.model })), { a: 'Consensus', b: 'Model' }, 'NVIDIA revenue by fiscal year, model against consensus')}
        <div class="scroll"><table class="t stack"><thead><tr><th>Fiscal year</th><th class="num">Model</th><th class="num">Consensus</th><th class="num">Model vs consensus</th></tr></thead><tbody>${fyRows}</tbody></table></div>
        <p class="foot">Fiscal years run February to January. Consensus is the Yahoo analyst mean.</p></div>
      <div><h3>Hyperscaler capex by calendar year</h3>
        <div class="scroll"><table class="t stack"><thead><tr><th>Year</th><th class="num">Model</th><th class="num">Guidance</th><th class="num">Model vs guidance</th></tr></thead><tbody>${capexRows}</tbody></table></div>
        <p class="foot">Microsoft, Alphabet, Amazon and Meta together; guidance ranges use the midpoint. Modelled AI capex is grossed up to
        total capex at the model's AI share.</p></div>
    </div>

    <h3>Backtest</h3>
    <p class="foot lead">Average error (MAPE) one to eight quarters ahead, from each quarter 2023Q1–2026Q2, starting from what was public
      45 days after the quarter ended. Later conditions and deals follow what actually happened. Benchmarks: naive (last value),
      drift (recent average change), ETS (smoothed trend).</p>
    <div class="scroll"><table class="t stack"><thead><tr><th>Target</th><th class="num">Model</th><th class="num">Naive</th><th class="num">Drift</th><th class="num">ETS</th><th class="num">Scored</th><th>Result</th></tr></thead><tbody>${btRows}</tbody></table></div>
    <div class="echart-wide">${lineChart(s.nvidiaBacktest.map(r => ({ x: r.quarter, a: r.actual, b: r.model })), { a: 'Reported', b: 'Model, one quarter ahead' }, 'NVIDIA revenue one quarter ahead, model against reported')}</div>

    <h3>What happened in the baseline run</h3>
    <div class="covnotes ev">${eventGroups}</div>
    <div class="note"><p>Company behaviour here is simple rules: clouds extend their recent spending, labs buy the compute their
      revenue needs, and firms borrow or default mechanically. Strategic choices (game theory) arrive in phase 4, and credit
      contagion between firms in phase 5.</p></div>
  </section>`;
}
