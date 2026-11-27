// Double-entry (stock-flow consistent) ledger. Every flow has a payer and a payee: money moves between entities and is
// never created or destroyed by a flow. Amounts keep full floating precision; checkInvariant allows a $1 tolerance.
import type { QuarterKey } from '../data/schema';
import type { Flow } from './types';

/** A loan owed by the sheet's entity to `lenderId`. */
export interface DebtInstrument {
  id: string;
  lenderId: string;
  principal: number;
  /** Undefined for a floating or unstated rate: the finance layer prices it from conditions each quarter. */
  ratePerQuarter?: number;
  maturity: QuarterKey;
  recourse: 'recourse' | 'non-recourse' | 'unknown';
  dealId?: string;
}

/**
 * The lender's side of a DebtInstrument (an extension to the plan's BalanceSheet shape): an asset equal to the
 * borrower's outstanding principal, so a loan nets to zero across the system.
 */
export interface LoanAsset { debtId: string; borrowerId: string; principal: number }

/** GPUs bought in one quarter. `modelled`: an engine estimate (e.g. the opening installed base), not a reported count. */
export interface Vintage { quarter: QuarterKey; units: number; costUsd: number; modelled?: true }

export interface BalanceSheet {
  cash: number;
  receivables: number;
  debt: DebtInstrument[];
  loansReceivable: LoanAsset[];
  chipVintages: Vintage[];
  buildings: number;
  equityRaised: number;
  retainedEarnings: number;
}

export interface Ledger { sheets: Record<string, BalanceSheet>; flows: Flow[] }

/** Largest drift in net financial assets (USD) that checkInvariant accepts as floating-point noise. */
const INVARIANT_TOLERANCE_USD = 1;

export function emptySheet(): BalanceSheet {
  return { cash: 0, receivables: 0, debt: [], loansReceivable: [], chipVintages: [], buildings: 0, equityRaised: 0,
    retainedEarnings: 0 };
}

/** A ledger with an empty balance sheet for each id. */
export function newLedger(ids: readonly string[]): Ledger {
  const sheets: Record<string, BalanceSheet> = {};
  for (const id of ids) {
    if (Object.hasOwn(sheets, id)) throw new Error(`duplicate ledger entity: ${id}`);
    sheets[id] = emptySheet();
  }
  return { sheets, flows: [] };
}

function sheet(l: Ledger, id: string, role: string, f: Flow): BalanceSheet {
  if (!Object.hasOwn(l.sheets, id)) {
    throw new Error(`unknown ${role} "${id}" in ${f.kind} flow ${f.from} -> ${f.to} (${f.quarter})`);
  }
  return l.sheets[id];
}

/** Validate a flow and move its cash; records the flow. Both ids must exist before anything changes. */
function moveCash(l: Ledger, f: Flow): { payer: BalanceSheet; payee: BalanceSheet } {
  const payer = sheet(l, f.from, 'payer', f);
  const payee = sheet(l, f.to, 'payee', f);
  if (!Number.isFinite(f.amountUsd) || f.amountUsd < 0) {
    throw new Error(`invalid amount ${f.amountUsd} in ${f.kind} flow ${f.from} -> ${f.to} (${f.quarter})`);
  }
  payer.cash -= f.amountUsd;
  payee.cash += f.amountUsd;
  l.flows.push(f);
  return { payer, payee };
}

/**
 * Move cash from `f.from` to `f.to` and record the flow. Loan draws and principal repayments also change debt, so
 * they must go through drawLoan / repayLoan; posting them here throws. Interest is an ordinary cash flow.
 */
export function post(l: Ledger, f: Flow): void {
  if (f.kind === 'loan-draw') throw new Error(`loan-draw flows must be posted with drawLoan (${f.from} -> ${f.to})`);
  if (f.kind === 'principal') throw new Error(`principal flows must be posted with repayLoan (${f.from} -> ${f.to})`);
  moveCash(l, f);
}

/**
 * Lender `f.from` lends `f.amountUsd` to borrower `f.to`: cash moves, the borrower gains a DebtInstrument and the lender
 * an equal LoanAsset, so net financial assets are unchanged. The instrument id must be new for this borrower.
 */
export function drawLoan(l: Ledger, f: Flow, terms: Omit<DebtInstrument, 'lenderId' | 'principal'>): void {
  if (f.kind !== 'loan-draw') throw new Error(`drawLoan needs a loan-draw flow, got ${f.kind}`);
  const borrower = sheet(l, f.to, 'payee', f);
  sheet(l, f.from, 'payer', f);
  if (borrower.debt.some(d => d.id === terms.id)) throw new Error(`${f.to} already has a loan with id ${terms.id}`);
  const { payer: lender } = moveCash(l, f);
  borrower.debt.push({ ...terms, lenderId: f.from, principal: f.amountUsd });
  lender.loansReceivable.push({ debtId: terms.id, borrowerId: f.to, principal: f.amountUsd });
}

/**
 * Borrower `f.from` repays `f.amountUsd` of loan `debtId` to its lender `f.to`: cash moves and both the debt and the
 * lender's loan asset shrink by the same amount (each is removed once fully repaid).
 */
export function repayLoan(l: Ledger, f: Flow, debtId: string): void {
  if (f.kind !== 'principal') throw new Error(`repayLoan needs a principal flow, got ${f.kind}`);
  const borrower = sheet(l, f.from, 'payer', f);
  const lender = sheet(l, f.to, 'payee', f);
  const debt = borrower.debt.find(d => d.id === debtId);
  if (!debt) throw new Error(`${f.from} has no loan with id ${debtId}`);
  if (debt.lenderId !== f.to) throw new Error(`loan ${debtId} is owed to ${debt.lenderId}, not ${f.to}`);
  const asset = lender.loansReceivable.find(a => a.debtId === debtId && a.borrowerId === f.from);
  if (!asset) throw new Error(`${f.to} holds no loan asset for ${debtId} of ${f.from}`);
  if (f.amountUsd > debt.principal) {
    throw new Error(`repayment ${f.amountUsd} exceeds outstanding principal ${debt.principal} of loan ${debtId}`);
  }
  moveCash(l, f);
  debt.principal -= f.amountUsd;
  asset.principal -= f.amountUsd;
  if (debt.principal === 0) borrower.debt = borrower.debt.filter(d => d !== debt);
  if (asset.principal === 0) lender.loansReceivable = lender.loansReceivable.filter(a => a !== asset);
}

/** Sum over entities of cash + receivables + loans receivable − debt principal. Constant under every flow. */
export function netFinancialAssets(l: Ledger): number {
  let total = 0;
  for (const s of Object.values(l.sheets)) {
    total += s.cash + s.receivables;
    for (const a of s.loansReceivable) total += a.principal;
    for (const d of s.debt) total -= d.principal;
  }
  return total;
}

/** A message when net financial assets moved by more than $1 from `before`, else null. */
export function checkInvariant(l: Ledger, before: number): string | null {
  const after = netFinancialAssets(l);
  const drift = after - before;
  if (Math.abs(drift) <= INVARIANT_TOLERANCE_USD) return null;
  return `ledger invariant broken: net financial assets moved by ${drift} USD (from ${before} to ${after})`;
}
