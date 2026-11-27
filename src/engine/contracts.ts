// Scheduled obligations from known deals. Only `hardMinimumUsd` creates obligations: ceilings, conditional amounts and
// estimates are never scheduled, and value fields are never added together.
//
// Rules (Phase 2):
// - The deal's kind is its FIRST listed type. compute-lease and chip-purchase are spread straight-line; equity is one
//   payment; loan and spv-financing (an SPV's bonds or loans; an SPV equity tranche is typed `equity` first) are a draw,
//   fixed-rate interest and a bullet principal repayment. Guarantees, buyer-of-last-resort and other types are
//   contingent or unmodelled here and produce nothing (contingent claims arrive in phase 5).
// - Quarters are calendar quarters, from the quarter of `start` (or `announced` when there is no start), inclusive.
//   The last quarter is that of `end`; without an end, the start quarter plus the length stated in `terms.maturity`
//   (only when the terms are public at asOf); otherwise `defaultContractQuarters` (leases, chips) or
//   `defaultLoanTermQuarters` (loans) from config/engine-params.json.
// - Multiple payers and payees: every payer owes every payee an equal share, amount / (payers × payees).
// - A deal whose status as of the view is cancelled or replaced owes nothing after the quarter of that status entry
//   (that quarter itself is kept).
// - Quarters outside the grid are dropped; the per-quarter amount is not rescaled.
import type { DealType, QuarterKey } from '../data/schema';
import type { DealView } from './asof';
import { loadParams, param } from './params';
import type { EngineParams, FlowKind, Grid } from './types';
import { addQuarters, quarterRange } from '../data/quarters';

export interface Obligation {
  dealId: string;
  payer: string;
  payee: string;
  quarter: QuarterKey;
  amountUsd: number;
  kind: FlowKind;
  label: string;
}

type Rule =
  | { schedule: 'straight-line'; kind: FlowKind; label: string; termParam: string }
  | { schedule: 'once'; kind: FlowKind; label: string }
  | { schedule: 'loan'; termParam: string };

const RULES: Partial<Record<DealType, Rule>> = {
  'compute-lease': { schedule: 'straight-line', kind: 'compute-rent', label: 'Rents compute', termParam: 'defaultContractQuarters' },
  'chip-purchase': { schedule: 'straight-line', kind: 'chip-purchase', label: 'Buys GPUs', termParam: 'defaultContractQuarters' },
  equity: { schedule: 'once', kind: 'equity', label: 'Equity' },
  loan: { schedule: 'loan', termParam: 'defaultLoanTermQuarters' },
  'spv-financing': { schedule: 'loan', termParam: 'defaultLoanTermQuarters' },
};

const LOAN_LABELS = { draw: 'GPU-backed loan', interest: 'Interest', principal: 'Repays loan' } as const;

const QUARTERS_PER_YEAR = 4;
const MONTHS_PER_QUARTER = 3;

/** Calendar quarter of an ISO date. */
function dateQuarter(iso: string): QuarterKey {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(iso);
  if (!m) throw new Error(`Invalid date (expected YYYY-MM-DD): ${iso}`);
  return `${m[1]}Q${Math.floor((+m[2] - 1) / MONTHS_PER_QUARTER) + 1}`;
}

/**
 * Length in quarters stated in a maturity text, from its first "N years", "N-year" or "N months" phrase
 * ("~6 years plus 1-year option" → 24). Undefined for dates ("Mar 2027", "2045") or no length.
 */
export function parseTermQuarters(maturity: string | undefined): number | undefined {
  if (!maturity) return undefined;
  const m = /(\d+(?:\.\d+)?)[\s-]*(years?|months?)\b/i.exec(maturity);
  if (!m) return undefined;
  const n = Number(m[1]);
  const quarters = m[2].toLowerCase().startsWith('year') ? n * QUARTERS_PER_YEAR : n / MONTHS_PER_QUARTER;
  return Math.max(1, Math.round(quarters));
}

/**
 * Annual rate (0.075 for "7.5%") when the rate text starts with a plain fixed percentage. Floating ("SOFR + 4%") or
 * described rates return undefined: the finance layer prices those from market conditions.
 */
export function parseFixedAnnualRate(rate: string | undefined): number | undefined {
  if (!rate) return undefined;
  const m = /^\s*(\d+(?:\.\d+)?)\s*%/.exec(rate);
  return m ? Number(m[1]) / 100 : undefined;
}

/** Quarter after which the deal owes nothing (cancelled or replaced as of the view), else undefined. */
function cutoffQuarter(d: DealView): QuarterKey | undefined {
  if (d.statusAsOf !== 'cancelled' && d.statusAsOf !== 'replaced') return undefined;
  let date: string | undefined;
  for (const s of d.statusHistory) if (s.status === d.statusAsOf && (date === undefined || s.date > date)) date = s.date;
  return date === undefined ? undefined : dateQuarter(date);
}

/** First and last quarter of the deal's term (inclusive). */
function term(d: DealView, defaultQuarters: number): { first: QuarterKey; last: QuarterKey } {
  const first = dateQuarter(d.start ?? d.announced);
  let last: QuarterKey;
  if (d.end !== undefined) {
    last = dateQuarter(d.end);
    if (last < first) throw new Error(`deal ${d.id}: end ${d.end} is before its start quarter ${first}`);
  } else {
    const stated = d.termsHidden ? undefined : parseTermQuarters(d.terms.maturity);
    last = addQuarters(first, (stated ?? defaultQuarters) - 1);
  }
  return { first, last };
}

/** Obligations from each deal's hard minimum over the grid; see the rules at the top of this file. */
export function scheduleObligations(deals: readonly DealView[], grid: Grid, params: EngineParams = loadParams()): Obligation[] {
  const inGrid = new Set(grid.quarters);
  const out: Obligation[] = [];
  for (const d of deals) {
    const total = d.values.hardMinimumUsd;
    const rule = d.types.length > 0 ? RULES[d.types[0]] : undefined;
    if (total === undefined || !rule || d.payers.length === 0 || d.payees.length === 0) continue;
    const cutoff = cutoffQuarter(d);
    const share = total / (d.payers.length * d.payees.length);
    const emit = (payer: string, payee: string, quarter: QuarterKey, amountUsd: number, kind: FlowKind, label: string) => {
      if (!inGrid.has(quarter) || (cutoff !== undefined && quarter > cutoff)) return;
      out.push({ dealId: d.id, payer, payee, quarter, amountUsd, kind, label });
    };
    const pairs = d.payers.flatMap(payer => d.payees.map(payee => ({ payer, payee })));

    if (rule.schedule === 'once') {
      const q = dateQuarter(d.start ?? d.announced);
      for (const { payer, payee } of pairs) emit(payer, payee, q, share, rule.kind, rule.label);
    } else if (rule.schedule === 'straight-line') {
      const { first, last } = term(d, param(params, rule.termParam));
      const quarters = quarterRange(first, last);
      const perQuarter = share / quarters.length;
      for (const q of quarters) for (const { payer, payee } of pairs) emit(payer, payee, q, perQuarter, rule.kind, rule.label);
    } else {
      // Payers are the lenders, payees the borrowers. Interest is scheduled only for a stated fixed rate.
      const { first, last } = term(d, param(params, rule.termParam));
      const annual = d.termsHidden ? undefined : parseFixedAnnualRate(d.terms.rate);
      for (const { payer: lender, payee: borrower } of pairs) {
        emit(lender, borrower, first, share, 'loan-draw', LOAN_LABELS.draw);
        if (annual !== undefined) {
          for (const q of quarterRange(addQuarters(first, 1), last)) {
            emit(borrower, lender, q, share * annual / QUARTERS_PER_YEAR, 'interest', LOAN_LABELS.interest);
          }
        }
        emit(borrower, lender, last, share, 'principal', LOAN_LABELS.principal);
      }
    }
  }
  return out;
}
