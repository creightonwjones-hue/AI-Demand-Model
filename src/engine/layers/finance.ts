// Finance layer (spec §8.1 and the simple version of §8.5): posts the quarter's flows, books new loans, pays
// scheduled obligations and interest on unscheduled debt, borrows to cover shortfalls while credit is open, defaults
// firms that cannot pay (unpaid amounts are written down, never created as cash), depreciates chips and labels each
// firm hedge / speculative / Ponzi. Mutates s.ledger, s.defaulted and s.memory.
import type { EngineState } from '../init';
import { checkInvariant, drawLoan, netFinancialAssets, post, repayLoan } from '../ledger';
import { param } from '../params';
import type { EngineEvent, EngineParams, EntityQuarter, Flow, FlowKind, Minsky } from '../types';
import type { NewLoan } from './clouds';
import { CLOUDS } from './clouds';

export interface FinanceOut {
  entityQuarters: Record<string, EntityQuarter>;
  events: EngineEvent[];
  flows: Flow[];
  invariantErrors: string[];
}

export interface FinanceContext {
  newLoans?: readonly NewLoan[];
  /** This quarter's credit spread (percentage points); undefined means credit is open. */
  creditSpread?: number;
  /** This quarter's risk-free rate (percent); prices emergency loans. */
  riskFree?: number;
}

const NEVER_DEFAULT = new Set(['aggregate', 'lender', 'government']);
const REVENUE_KINDS = new Set<FlowKind>(['customer-spend', 'compute-rent', 'chip-purchase', 'foundry', 'memory-purchase', 'lithography']);
const PURCHASED_COST_KINDS = new Set<FlowKind>(['compute-rent', 'foundry', 'memory-purchase', 'lithography']);
const CAPEX_KINDS = new Set<FlowKind>(['chip-purchase', 'buildings-capex']);
const CHIP_MAKERS = new Set(['nvidia', 'amd', 'broadcom', 'marvell', 'intel']);
const SUPPLIERS = new Set(['tsmc', 'sk-hynix', 'samsung', 'micron', 'asml']);
const LABS = new Set(['openai', 'anthropic', 'spacex', 'ai-startups', 'cerebras', 'mistral']);
const COST_SINK = 'rest-of-economy';
const EMERGENCY_LENDER = 'private-credit-other';
const PCT = 100;
const QUARTERS_PER_YEAR = 4;
const fmt = (usd: number) => `$${(usd / 1e9).toFixed(1)}B`;

export function stepFinance(s: EngineState, flows: Flow[], p: EngineParams, ctx: FinanceContext = {}): FinanceOut {
  const quarter = s.grid.quarters[s.q];
  const l = s.ledger;
  const before = netFinancialAssets(l);
  const events: EngineEvent[] = [];
  const out: Flow[] = [];
  const canDefault = (id: string) => !NEVER_DEFAULT.has(s.kinds[id] ?? 'aggregate');
  const creditOpen = (ctx.creditSpread ?? 0) <= param(p, 'maxLendingCreditSpread');
  const emergencyRate = ((ctx.riskFree ?? 0) + (ctx.creditSpread ?? 0) + param(p, 'newLoanRateSpreadOverRiskFree')) / PCT / QUARTERS_PER_YEAR;

  const per: Record<string, { revenue: number; core: number; purchased: number; capex: number; interest: number; principal: number; equity: number }> = {};
  const acc = (id: string) => (per[id] ??= { revenue: 0, core: 0, purchased: 0, capex: 0, interest: 0, principal: 0, equity: 0 });
  const record = (f: Flow) => {
    out.push(f);
    if (REVENUE_KINDS.has(f.kind)) acc(f.to).revenue += f.amountUsd;
    if (PURCHASED_COST_KINDS.has(f.kind)) acc(f.from).purchased += f.amountUsd;
    if (CAPEX_KINDS.has(f.kind)) acc(f.from).capex += f.amountUsd;
    if (f.kind === 'interest') acc(f.from).interest += f.amountUsd;
    if (f.kind === 'principal') acc(f.from).principal += f.amountUsd;
    if (f.kind === 'equity') acc(f.to).equity += f.amountUsd;
    if (f.kind === 'core-business-cash') acc(f.to).core += f.amountUsd;
  };

  // 1. The layers' flows (already funded by their rules) and new loans.
  for (const f of flows) { if (!s.defaulted[f.from]) { post(l, f); record(f); } }
  for (const nl of ctx.newLoans ?? []) {
    if (s.defaulted[nl.borrower]) continue;
    const f: Flow = { quarter, from: nl.lender, to: nl.borrower, amountUsd: nl.amountUsd, kind: 'loan-draw', label: 'Borrows' };
    drawLoan(l, f, { id: `new:${nl.borrower}:${quarter}`, ratePerQuarter: nl.ratePerQuarter, maturity: s.grid.quarters[s.grid.quarters.length - 1], recourse: 'recourse' });
    record(f);
  }

  // 2. Operating costs leave the AI economy to the rest of the economy.
  for (const [id, a] of Object.entries(per)) {
    if (a.revenue <= 0 || s.defaulted[id]) continue;
    let cost = 0;
    if (CHIP_MAKERS.has(id)) cost = Math.max(0, a.revenue * (1 - param(p, 'nvidiaGrossMargin')) - a.purchased);
    else if (SUPPLIERS.has(id)) cost = a.revenue * param(p, 'supplierOperatingCostRatio');
    else if (LABS.has(id)) cost = a.revenue * param(p, 'labOperatingCostRatio');
    else if (CLOUDS.includes(id)) cost = a.revenue * param(p, 'cloudOperatingCostRatio');
    if (cost > 0) {
      const f: Flow = { quarter, from: id, to: COST_SINK, amountUsd: cost, kind: 'operating-cost', label: 'Operating costs' };
      post(l, f); out.push(f);
      (per[id] as typeof per[string] & { opex?: number }).opex = cost;
    }
  }

  // 3. What each firm owes this quarter: scheduled obligations plus interest on debt without scheduled interest.
  const due: { payer: string; flow: Flow; debtId?: string; terms?: { ratePerQuarter: number; maturity: string; recourse: 'recourse' | 'non-recourse' | 'unknown' } }[] = [];
  const scheduledInterest = new Set(s.obligations.filter(o => o.kind === 'interest' && o.debtId).map(o => o.debtId!));
  for (const o of s.obligations) {
    if (o.quarter !== quarter) continue;
    const flow: Flow = { quarter, from: o.payer, to: o.payee, amountUsd: o.amountUsd, kind: o.kind, dealId: o.dealId, label: o.label };
    due.push({ payer: o.payer, flow, debtId: o.debtId,
      terms: o.kind === 'loan-draw' ? { ratePerQuarter: o.ratePerQuarter ?? emergencyRate, maturity: o.maturity ?? quarter, recourse: o.recourse ?? 'unknown' } : undefined });
  }
  for (const [id, sheet] of Object.entries(l.sheets)) {
    for (const d of sheet.debt) {
      if (scheduledInterest.has(d.id)) continue;
      // An unstated (floating) rate is priced at risk-free + credit spread + the new-loan premium.
      const rate: number = Number.isFinite(d.ratePerQuarter) ? (d.ratePerQuarter as number) : emergencyRate;
      if (rate <= 0 || d.principal <= 0) continue;
      due.push({ payer: id, flow: { quarter, from: id, to: d.lenderId, amountUsd: d.principal * rate, kind: 'interest', label: 'Interest' } });
    }
  }
  const owed: Record<string, { interest: number; principal: number }> = {};
  for (const x of due) {
    const o = (owed[x.payer] ??= { interest: 0, principal: 0 });
    if (x.flow.kind === 'interest') o.interest += x.flow.amountUsd;
    if (x.flow.kind === 'principal') o.principal += x.flow.amountUsd;
  }

  // 4. Pay. Each firm's total due (excluding loan draws) is compared with its cash once: a shortfall is covered by ONE
  //    rescue loan for the quarter while credit is open, otherwise the firm defaults and its unpaid obligations are
  //    written down (nothing is posted). One loan per firm per quarter keeps the number of debt instruments linear.
  for (const x of due) if (x.flow.kind === 'loan-draw' && !s.defaulted[x.payer] && x.flow.amountUsd > 0) {
    drawLoan(l, x.flow, { id: x.debtId ?? `deal:${x.flow.dealId}:${x.flow.to}`, ...x.terms! });
    record(x.flow);
  }
  const totalDue: Record<string, number> = {};
  for (const x of due) if (x.flow.kind !== 'loan-draw' && x.flow.amountUsd > 0) totalDue[x.payer] = (totalDue[x.payer] ?? 0) + x.flow.amountUsd;
  for (const [payerId, amount] of Object.entries(totalDue)) {
    if (s.defaulted[payerId] || !canDefault(payerId)) continue;
    const short = amount - l.sheets[payerId].cash;
    if (short <= 0) continue;
    if (creditOpen) {
      const f: Flow = { quarter, from: EMERGENCY_LENDER, to: payerId, amountUsd: short, kind: 'loan-draw', label: 'Borrows' };
      drawLoan(l, f, { id: `rescue:${payerId}:${quarter}`, ratePerQuarter: emergencyRate, maturity: s.grid.quarters[s.grid.quarters.length - 1], recourse: 'recourse' });
      record(f);
      events.push({ quarter, entityId: payerId, kind: 'loan-draw', reason: `Borrowed ${fmt(short)} to meet payments due` });
    } else {
      s.defaulted[payerId] = true;
      const o = owed[payerId] ?? { interest: 0, principal: 0 };
      events.push({ quarter, entityId: payerId, kind: 'default',
        reason: `Cash ran out with ${fmt(o.interest + o.principal)} of debt service due; credit at ${(ctx.creditSpread ?? 0).toFixed(1)} points of spread was unavailable` });
    }
  }
  for (const x of due) {
    const { flow } = x;
    if (flow.kind === 'loan-draw' || s.defaulted[x.payer] || flow.amountUsd <= 0) continue;
    if (flow.kind === 'principal') repayLoan(l, flow, x.debtId!); else post(l, flow);
    record(flow);
  }

  // 5. Per-entity quarter results.
  const entityQuarters: Record<string, EntityQuarter> = {};
  for (const [id, sheet] of Object.entries(l.sheets)) {
    if (!s.active[id]) continue;
    const a = acc(id) as typeof per[string] & { opex?: number };
    const opex = a.opex ?? 0;
    const depreciation = sheet.chipVintages.reduce((t, v) => {
      const age = s.q - s.grid.quarters.indexOf(v.quarter);
      return t + (v.quarter <= quarter && age < param(p, 'gpuAccountingLifeQuarters') ? v.costUsd / param(p, 'gpuAccountingLifeQuarters') : 0);
    }, 0);
    const ocf = a.revenue + a.core - opex - a.purchased;
    const netIncome = ocf - a.interest - depreciation;
    sheet.retainedEarnings += netIncome;
    sheet.equityRaised += a.equity;
    const o = owed[id] ?? { interest: 0, principal: 0 };
    const minsky: Minsky = ocf >= o.interest + o.principal ? 'hedge' : ocf >= o.interest ? 'speculative' : 'ponzi';
    const prevKey = `minsky:${id}`;
    if (canDefault(id) && s.memory[prevKey] !== undefined && s.memory[prevKey] !== MINSKY_CODE[minsky])
      events.push({ quarter, entityId: id, kind: 'minsky-change', reason: `Now ${minsky}: operating cash ${fmt(ocf)} vs interest ${fmt(o.interest)} and principal ${fmt(o.principal)} due` });
    s.memory[prevKey] = MINSKY_CODE[minsky];
    entityQuarters[id] = {
      quarter, revenue: a.revenue, operatingCost: opex + a.purchased, capex: a.capex, operatingCashFlow: ocf, netIncome,
      cash: sheet.cash, debt: sheet.debt.reduce((t, d) => t + d.principal, 0), equityRaised: sheet.equityRaised,
      minsky, defaulted: !!s.defaulted[id], modelled: true,
    };
  }

  const err = checkInvariant(l, before);
  return { entityQuarters, events, flows: out, invariantErrors: err ? [`${quarter}: ${err}`] : [] };
}

const MINSKY_CODE: Record<Minsky, number> = { hedge: 0, speculative: 1, ponzi: 2 };
