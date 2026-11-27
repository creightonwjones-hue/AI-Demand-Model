// Clouds layer (spec §8.3): labs rent compute (contracts first), clouds set AI capex by extrapolating rent growth
// (Sterman overshoot), bounded by funds; debt-funded clouds borrow while credit is open.
import type { EngineState } from '../init';
import { param } from '../params';
import type { Conditions, EngineParams, Flow } from '../types';
import type { DemandOut } from './demand';

export const CASH_FUNDED = ['microsoft', 'alphabet', 'amazon', 'meta'] as const;
export const DEBT_FUNDED = ['oracle', 'coreweave', 'nebius', 'lambda'] as const;
const CORE_CASH_PAYER = 'rest-of-economy';
export const CLOUDS: readonly string[] = [...CASH_FUNDED, ...DEBT_FUNDED];
const DEFAULT_LENDER = 'private-credit-other';
const BUILDINGS_PAYEE = 'construction-and-power';
const PCT = 100;
const QUARTERS_PER_YEAR = 4;

/** A new loan a cloud draws this quarter; the finance layer books it with drawLoan. */
export interface NewLoan { borrower: string; lender: string; amountUsd: number; ratePerQuarter: number }

export interface CloudsOut {
  rentByCloud: Record<string, number>;
  aiCapexByCloud: Record<string, number>;
  chipBudgetByCloud: Record<string, number>;
  buildingsCapexByCloud: Record<string, number>;
  newLoans: NewLoan[];
  flows: Flow[];
}

/** Each cloud's share of installed capacity (chip vintages at cost); equal shares when nobody has any yet. */
/** A cloud that has entered the model and has not defaulted. */
export const operating = (s: EngineState, c: string) => s.active[c] !== false && !s.defaulted[c];

function capacityShares(s: EngineState): Record<string, number> {
  // Only clouds in the model (active, not defaulted) take uncontracted rent.
  const open = CLOUDS.filter(c => operating(s, c));
  const w = Object.fromEntries(open.map(c => [c, (s.ledger.sheets[c]?.chipVintages ?? []).reduce((a, v) => a + v.costUsd, 0)]));
  const tot = Object.values(w).reduce((a, b) => a + b, 0);
  return Object.fromEntries(CLOUDS.map(c => [c, !open.includes(c) ? 0 : tot > 0 ? w[c] / tot : 1 / open.length]));
}

export function stepClouds(s: EngineState, d: DemandOut, c: Conditions, p: EngineParams): CloudsOut {
  const qi = s.q;
  const quarter = s.grid.quarters[qi];
  const rentByCloud: Record<string, number> = Object.fromEntries(CLOUDS.map(x => [x, 0]));
  const flows: Flow[] = [];
  const shares = capacityShares(s);

  // 1. Rent: contracted clouds first (paid as obligations by the finance layer), remainder by capacity share.
  for (const [lab, need] of Object.entries(d.computeNeedUsd)) {
    let left = need;
    for (const o of s.obligations) {
      if (left <= 0) break;
      if (o.quarter !== quarter || o.payer !== lab || o.kind !== 'compute-rent' || !(o.payee in rentByCloud)) continue;
      const take = Math.min(left, o.amountUsd);
      rentByCloud[o.payee] += take;
      left -= take;
    }
    if (left <= 0) continue;
    for (const cloud of CLOUDS) {
      const amount = left * shares[cloud];
      if (amount <= 0) continue;
      rentByCloud[cloud] += amount;
      flows.push({ quarter, from: lab, to: cloud, amountUsd: amount, kind: 'compute-rent', label: 'Rents compute' });
    }
  }

  // 2. Capex: expected rent growth updates toward observed growth; capacity is built for expected rent × overshoot.
  const gain = param(p, 'expectationGain');
  const creditOpen = c.creditSpread.values[qi] <= param(p, 'maxLendingCreditSpread');
  const loanRate = (c.riskFree.values[qi] + c.creditSpread.values[qi] + param(p, 'newLoanRateSpreadOverRiskFree')) / PCT / QUARTERS_PER_YEAR;
  const aiCapexByCloud: Record<string, number> = {};
  const chipBudgetByCloud: Record<string, number> = {};
  const buildingsCapexByCloud: Record<string, number> = {};
  const newLoans: NewLoan[] = [];
  for (const cloud of CLOUDS) {
    const rent = rentByCloud[cloud];
    const lastKey = `rent:${cloud}`;
    const last = s.memory[lastKey];
    if (last !== undefined && last > 0) s.expectations[cloud] += gain * (rent / last - 1 - s.expectations[cloud]);
    s.memory[lastKey] = rent;
    const expectedRent = rent * (1 + (s.expectations[cloud] ?? 0));
    // Capex momentum: last quarter's AI capex (opening: last reported capex × hyperscalerAiCapexShare) extrapolated with
    // expected growth and the over-extrapolation factor — firms project recent growth forward (spec §8.3) — and never
    // below what new rent needs.
    const capexKey = `capex:${cloud}`;
    if (!operating(s, cloud)) { aiCapexByCloud[cloud] = 0; chipBudgetByCloud[cloud] = 0; buildingsCapexByCloud[cloud] = 0; continue; }
    const lastCapex = s.memory[`aicapex:${cloud}`] ?? (s.memory[capexKey] ?? 0) * param(p, 'hyperscalerAiCapexShare');
    const momentum = lastCapex * (1 + (s.expectations[cloud] ?? 0)) * param(p, 'overExtrapolation');
    const rentDriven = Math.max(0, (expectedRent - rent) * param(p, 'capexPerQuarterlyRentUsd'));
    const wanted = Math.max(momentum, rentDriven);

    // Cash-funded clouds spend from cash plus this quarter's rent (operating cash); debt-funded clouds from cash
    // plus new credit only (spec §8.3).
    const isDebtFunded = (DEBT_FUNDED as readonly string[]).includes(cloud);
    const cash = Math.max(0, s.ledger.sheets[cloud]?.cash ?? 0);
    const core = isDebtFunded ? 0 : s.memory[`corecash:${cloud}`] ?? 0;
    if (core > 0) flows.push({ quarter, from: CORE_CASH_PAYER, to: cloud, amountUsd: core, kind: 'core-business-cash', label: 'Core business cash' });
    let funds = cash + core + (isDebtFunded ? 0 : rent);
    let loan = 0;
    if (isDebtFunded && creditOpen && wanted > funds) {
      loan = Math.min(wanted - funds, rent * param(p, 'creditCapacityMultipleOfRent'));
      if (loan > 0) newLoans.push({ borrower: cloud, lender: DEFAULT_LENDER, amountUsd: loan, ratePerQuarter: loanRate });
      funds += loan;
    }
    const capex = Math.min(wanted, funds);
    s.memory[`aicapex:${cloud}`] = capex;
    aiCapexByCloud[cloud] = capex;
    chipBudgetByCloud[cloud] = capex * param(p, 'chipShareOfAiCapex');
    buildingsCapexByCloud[cloud] = capex - chipBudgetByCloud[cloud];
    if (buildingsCapexByCloud[cloud] > 0) {
      flows.push({ quarter, from: cloud, to: BUILDINGS_PAYEE, amountUsd: buildingsCapexByCloud[cloud], kind: 'buildings-capex', label: 'Builds data centres' });
      s.pipeline.push({ owner: cloud, kind: 'buildings', units: 0, costUsd: buildingsCapexByCloud[cloud],
        arrives: s.grid.quarters[Math.min(s.grid.quarters.length - 1, qi + param(p, 'buildingLeadQuarters'))] });
    }
  }
  return { rentByCloud, aiCapexByCloud, chipBudgetByCloud, buildingsCapexByCloud, newLoans, flows };
}
