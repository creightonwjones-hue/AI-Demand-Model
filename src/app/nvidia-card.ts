// NVIDIA results card (top right): the selected quarter and its fiscal year against analyst consensus.
import type { QuarterKey } from '../data/schema';
import { escapeHtml as esc } from '../explorer/format';
import type { BaselineComparisons, RunResult } from '../engine/types';
import { formatAmount } from './canvas/render';

export interface NvidiaCardData {
  quarter: QuarterKey;
  quarterRevenue: number;
  /** NVIDIA fiscal year containing the quarter (Feb–Jan): calendar year + 1. */
  fy: number;
  fyModel: number;
  fyConsensus?: number;
  dataCenter: number;
  eps: number;
  supplyBound: boolean;
  supplyReason?: string;
  /** false for quarters NVIDIA has already reported. */
  modelled: boolean;
}

export function nvidiaCard(run: RunResult, cmp: BaselineComparisons, quarter: QuarterKey): NvidiaCardData {
  const q = run.nvidia[run.grid.idx(quarter)];
  const year = quarter.slice(0, 4);
  const fy = Number(year) + 1;
  const bound = run.events.find(e => e.kind === 'supply-bound' && e.quarter === quarter);
  return {
    quarter, quarterRevenue: q.revenue, fy,
    fyModel: run.nvidia.filter(n => n.quarter.startsWith(year)).reduce((t, n) => t + n.revenue, 0),
    fyConsensus: cmp.nvidiaRevenueConsensus.find(c => c.fy === fy)?.usd,
    dataCenter: q.dataCenter, eps: q.eps, supplyBound: !!bound, supplyReason: bound?.reason,
    modelled: quarter >= run.start,
  };
}

export function nvidiaCardHtml(c: NvidiaCardData): string {
  const gap = c.fyConsensus ? (c.fyModel - c.fyConsensus) / c.fyConsensus : undefined;
  const gapHtml = gap === undefined ? '' : `<em class="${gap < 0 ? 'neg' : 'pos'}">${gap >= 0 ? '+' : '−'}${Math.abs(gap * 100).toFixed(0)}%</em>`;
  const q = c.quarter.replace(/(\d{4})Q(\d)/, 'Q$2 $1');
  return `<div class="k">NVIDIA · FY${c.fy} revenue</div>
    <div class="v">${formatAmount(c.fyModel)} ${gapHtml}</div>
    <div class="s">${c.fyConsensus ? `vs. analyst consensus ${formatAmount(c.fyConsensus)} (Yahoo Finance mean)` : 'No analyst consensus published for this year'}</div>
    <div class="rows">
      <div><span>${esc(q)} revenue</span><b>${formatAmount(c.quarterRevenue)}</b></div>
      <div><span>Data Center</span><b>${formatAmount(c.dataCenter)}</b></div>
      <div><span>Earnings per share</span><b>${c.eps ? `$${c.eps.toFixed(2)}` : '—'}</b></div>
      <div><span>Supply</span><b class="${c.supplyBound ? 'a' : 'g'}"${c.supplyReason ? ` title="${esc(c.supplyReason)}"` : ''}>${c.supplyBound ? 'Limited' : 'Not limiting'}</b></div>
    </div>
    <div class="src">${c.modelled ? 'Modelled' : 'Reported by NVIDIA'} · fiscal years run Feb–Jan</div>`;
}
