# Phase 4 — Strategic Decisions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the phase 2 fixed rules with players who choose from real options each quarter by small solved games — hyperscalers, debt-funded clouds, labs, VCs, NVIDIA, suppliers and the US government — create new deals by bargaining, discount announced deals by their track record, and show every decision's game on the canvas.

**Architecture:** A pure game library (`src/engine/games/`: quantal choice, damped best response, backward induction, Nash bargaining, prospect value, Kalman filter) is used by one module per player type in `src/engine/players/`. A new `decide` step runs each quarter before the layers and writes choices into `EngineState.plan`, which the existing layers read instead of their fixed rules. Every choice is a `DecisionRecord` in `RunResult.decisions`. Each finance/economics theory is a switchable term listed in `config/theories.json`, kept on only if it improves the held-out backtest.

**Tech Stack:** TypeScript, vitest, existing engine and canvas (phase 2–3). No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-11-26-ai-demand-model-design.md` §8.4 (decisions), §9 (conditions), §13 (calibration), §6 (decision view). Owner decisions made 2026-11-28 (recorded into the spec in Task 1):
- One path takes each player's most likely choice; the probabilities are recorded; randomness belongs to phase 6.
- In-house chip share is a hyperscaler decision. TSMC and SK Hynix capacity is a supplier decision. VCs decide on lab rounds.
- Lenders, the money behind them (insurers, pensions, endowments, family offices, sovereign funds) and government rescues are phase 5.
- Export policy and power are not user-draggable: export policy is a US–China game driven by five political theories (public interest, regulatory capture, public choice, Baptists and bootleggers, path dependence); power stays on the published forecast, locked, until the power step after this phase.
- New deals are created by game theory: Nash bargaining with outside options, competing offers, NVIDIA as a Stackelberg leader for customer investments, hold-up in renegotiation, signalling plus reference-class discounts for announcements. Simple version: three deal types.
- Finance/economics theories replace hand-set assumptions and each is kept only if it improves the held-out backtest.

## Global Constraints

- No look-ahead: a decision in quarter q reads only the state at q, condition values at q and earlier, and the player's own expectations — never later condition values, even on a user-dragged path.
- Deterministic: same input → byte-identical `RunResult` (one path uses argmax; ties break by option order).
- Ledger stays balanced (±$1) every quarter, including renegotiated, walked-away and model-created deals.
- Every decision writes a `DecisionRecord` with options, utilities, utility parts, probabilities, the choice and a one-line reason. Trivial decisions (one option ≥ 0.99 probability and no shortfall) record only a summary line, not a tree or table.
- Every new param in `config/engine-params.json` has unit, description, source; literature values cite the paper (e.g. "Tversky & Kahneman 1992: α = β = 0.88, λ = 2.25"); fitted values say "calibrated <date>".
- Public data only. New data files follow `docs/data/` conventions: every value has a source URL, `asKnownAt` and verification status.
- Warm single-path run time stays under 200 ms (`tests/engine/run.test.ts` perf test raised from 50 to 200 ms with this justification).
- The backtest gate: after Task 13 the model must still beat naive, drift and ETS on NVIDIA revenue, NVIDIA Data Center and hyperscaler capex. If it does not, `config/theories.json` `decisionsMode` is set to `"rules"` (phase 2 behaviour), the UI says so, and the plan's final report states it.
- UI wording: "forecast range", never "Wall Street"; font Mona Sans only; locked canvas style.
- Commits end with the session's Co-Authored-By / Claude-Session trailer lines.

## Review Focus

1. **Look-ahead through dragged paths.** A user-dragged condition in 2029 must not change any decision in 2027 (Task 2 test).
2. **Degenerate utilities.** Equal, infinite or NaN utilities must give finite, uniform probabilities and a recorded reason — never NaN in the ledger (Task 1 test).
3. **Contracts with missing or hidden terms.** A commitment with no `hardMinimumUsd`, hidden terms or unknown take-or-pay must produce a valid game tree with stated assumptions, not NaN payoffs (Task 6 test).
4. **Money conservation through renegotiation, walk-away and new deals.** Written-down or rescheduled obligations and model-created deals keep net financial assets unchanged (Tasks 6 and 10 tests).
5. **Decision-log size.** A 2026–2030 run must stay under 2 MB of decisions and 200 ms (Task 2 and Task 13 tests).

---

### Task 1: Game library and spec record

**Files:**
- Create: `src/engine/games/quantal.ts`, `src/engine/games/tree.ts`, `src/engine/games/bargain.ts`, `src/engine/games/prospect.ts`, `src/engine/games/kalman.ts`, `src/engine/games/index.ts`
- Modify: `docs/superpowers/specs/2026-11-26-ai-demand-model-design.md` (§8.4 table: add in-house chip share, VC row, supplier capacity, government row; move lenders to §8.5; §9: export policy and power become model outputs, not draggable; §15: add "4b power model" and "4c demand refit" after phase 4; §17: the owner decisions listed above, dated 2026-11-28)
- Test: `tests/engine/games.test.ts`

**Interfaces:**
- Produces:
  - `quantal(utilities: number[], lambda: number): number[]` — softmax of `lambda * u / scale`, `scale = max(|u|) || 1`; non-finite utilities count as `-Infinity` relative to finite ones; if all are non-finite or equal → uniform.
  - `argmaxIndex(p: number[]): number` — first index of the maximum.
  - `dampedBestResponse<S>(players: string[], respond: (id: string, others: Record<string, S>) => S, init: Record<string, S>, opts: { damping: number; maxIter: number; distance: (a: S, b: S) => number; tol: number }): { profile: Record<string, S>; iterations: number; converged: boolean }`
  - `GameNode = { id: string; mover?: string; label: string; payoffs?: Record<string, number>; children?: GameNode[]; prob?: number; chosen?: boolean }`; `solveTree(root: GameNode, lambda: number): GameNode` — backward induction with quantal choice at each mover node (expected payoffs propagate up; `prob` set on children; `chosen` marks the argmax path).
  - `nashBargain(surplus: number, outsideA: number, outsideB: number, powerA: number): { a: number; b: number; agree: boolean }` — agree iff `surplus > outsideA + outsideB`; then `a = outsideA + powerA * (surplus − outsideA − outsideB)`, `b = surplus − a`.
  - `prospectValue(x: number, p = { alpha: 0.88, beta: 0.88, lossAversion: 2.25 }): number` (Tversky & Kahneman 1992).
  - `kalmanStep(state: { mean: number; variance: number }, observation: number, q: number, r: number): { mean: number; variance: number }` (local-level model).

- [ ] **Step 1: Write failing tests**

```ts
expect(quantal([1, 1, 1], 5)).toEqual([1 / 3, 1 / 3, 1 / 3])
expect(quantal([0, 10], 50)[1]).toBeGreaterThan(0.99)
expect(quantal([NaN, Infinity, 2], 3).every(Number.isFinite)).toBe(true)
expect(quantal([5, 5], 0)).toEqual([0.5, 0.5])
// 2-level tree: debtor pays (−10, +10) or walks; creditor then accepts (−2, +2) or enforces (−6, +5)
const t = solveTree(tree, 50); expect(t.children!.find(c => c.chosen)!.label).toBe('Walk away')
expect(nashBargain(100, 30, 20, 0.5)).toEqual({ a: 55, b: 45, agree: true })
expect(nashBargain(40, 30, 20, 0.5).agree).toBe(false)
expect(prospectValue(-100)).toBeCloseTo(-2.25 * 100 ** 0.88, 6)
const k = kalmanStep({ mean: 0, variance: 1 }, 1, 0.1, 1); expect(k.mean).toBeCloseTo(1.1 / 2.1, 6)
const br = dampedBestResponse(['a', 'b'], (id, o) => 0.5 * (o[id === 'a' ? 'b' : 'a'] ?? 0) + 1, { a: 0, b: 0 },
  { damping: 0.5, maxIter: 200, distance: (x, y) => Math.abs(x - y), tol: 1e-9 })
expect(br.converged).toBe(true); expect(br.profile.a).toBeCloseTo(2, 6)
```

- [ ] **Step 2–4:** run (FAIL), implement, run (PASS): `npx vitest run tests/engine/games.test.ts`.
- [ ] **Step 5: Update the spec** sections listed above (plain language, owner decisions verbatim).
- [ ] **Step 6: Commit** `feat(engine): game library (quantal choice, trees, bargaining, prospect value, Kalman) and phase 4 spec record`.

---

### Task 2: Decision step, decision log and theory switches

**Files:**
- Create: `src/engine/decide.ts`, `src/engine/decisions.ts` (record helpers), `config/theories.json`
- Modify: `src/engine/types.ts` (`DecisionRecord`, `RunResult.decisions`, `Theories`), `src/engine/init.ts` (`EngineState.plan`), `src/engine/run.ts` (`EngineInput.theories?: Theories`, default `{ decisionsMode: 'rules' }` until Task 13 flips it; call `decide` before `stepDemand`), `src/engine/node-io.ts` (`loadTheories()`), `src/engine/browser-input.ts` + `vite.config.ts` (bundle carries `theories`), `src/app/worker.ts` (passes them), `tests/engine/run.test.ts` (perf 200 ms)
- Test: `tests/engine/decide.test.ts`

**Interfaces:**
- `DecisionRecord { quarter: QuarterKey; playerId: string; game: 'payoff-table' | 'game-tree' | 'bargaining' | 'repeated' | 'cutoff' | 'policy'; question: string; options: { label: string; utility: number; parts: Record<string, number>; prob: number }[]; chosen: number; reason: string; table?: { rowLabel: string; colLabels: string[]; rows: { label: string; cells: number[] }[]; chosen: [number, number] }; tree?: GameNode; theories?: Record<string, number> /* share of the decision each theory term carried */ }`
- `EngineState.plan: Plan` where `Plan { capexGrowth: Record<string, number>; customShare: Record<string, number>; cloudAction: Record<string, 'expand' | 'hold' | 'shrink'>; shortfall: Record<string, 'refinance' | 'sell-gpus' | 'default'>; commitment: Record<string /* obligation key */, 'pay' | 'delay' | 'renegotiate' | 'walk'>; equityRaised: Record<string, number>; nvidia: { priceIndex: number; allocation: Record<string, number>; guarantees: Record<string, 'honour' | 'contest'>; investments: { customer: string; usd: number }[] }; supplierCapacityAdds: Record<string, number>; exportRegime: number; newDeals: DealView[] }` — `initialPlan()` reproduces phase 2 behaviour exactly.
- `decide(s: EngineState, c: Conditions, p: EngineParams, th: Theories): DecisionRecord[]` — calls each player module (Tasks 3–11) in a fixed order: government, suppliers, NVIDIA pricing/allocation, hyperscalers, debt clouds, labs & VCs, deals.
- `conditionsAt(c: Conditions, qi: number): Conditions` — copy with every quarter after qi replaced by the value at qi (players see no future path).
- `config/theories.json`: `{ "decisionsMode": "games" | "rules", "theories": { "<name>": { "enabled": boolean, "where": string, "note": string } } }` with entries: peckingOrder, tradeOff, financialAccelerator, tobinsQ, empireBuilding, extrapolativeExpectations, kalmanLearning, transactionCosts, cournotPricing, referenceClass, signalling, herding, timeToBuild, prospectTheory, publicInterest, regulatoryCapture, publicChoice, baptistsBootleggers, pathDependence.

- [ ] **Step 1: Write failing tests**

```ts
it('rules mode reproduces the phase 2 run exactly', () => {
  expect(JSON.stringify(strip(runOnePath({ ...input, theories: rulesMode })))).toBe(JSON.stringify(strip(phase2Baseline)))
})
it('a dragged condition after q never changes decisions at or before q', () => {
  const a = runOnePath(input), b = runOnePath({ ...input, conditions: withUserPath(base, 'creditSpread', { '2029Q1': 25 }) })
  expect(a.decisions.filter(d => d.quarter < '2029Q1')).toEqual(b.decisions.filter(d => d.quarter < '2029Q1'))
})
it('records decisions compactly', () => {
  expect(JSON.stringify(runOnePath(input).decisions).length).toBeLessThan(2e6)
})
```
(`strip` removes the new `decisions` field; `phase2Baseline` is the committed `data/build/engine-baseline.json` run.)

- [ ] **Step 2–4:** run (FAIL), implement, run (PASS): `npx vitest run tests/engine`.
- [ ] **Step 5: Commit** `feat(engine): decision step, decision log and theory switches`.

---

### Task 3: Data for decisions

**Files:**
- Create: `data/manual/deal-realisation.csv` (announced vs realised value for each public case: deal id or name, announced USD, realised USD, date realised, source URL, status), `data/manual/export-policy-events.csv` (every US AI-chip export rule since 2022: date, direction tighten/loosen, regime code after, rule name, source), `data/manual/policy-drivers.csv` (quarterly: lobbying spend of NVIDIA, AMD, Intel, Microsoft, Alphabet, Amazon, Meta from Senate LDA filings; months to next US federal election; count of congressional letters/hearings on China AI chips; best China vs best US model gap on a public leaderboard; China domestic AI-chip output estimate), `data/manual/market-caps.csv` (quarter-end market cap and book equity for the four hyperscalers, Oracle, CoreWeave, NVIDIA), additions to `config/entities.json` and `data/deals/deals.json` for Meta's and Microsoft's custom-chip partners (only if public sources name them)
- Modify: `scripts/data/build-all.ts` (validate and include the four files as series/facts), `docs/data/` (one paragraph per file)
- Test: `tests/data/phase4-data.test.ts`

**Interfaces:**
- Produces series ids: `realisation-<dealType>` (ratio realised/announced per case, as points), `export-regime-history` (regime code by event date), `policy-lobbying-<entity>`, `policy-election-months`, `policy-congress-china-chips`, `policy-ai-gap`, `policy-china-chip-output`; facts metric `marketCap` and `bookEquity`.

- [ ] **Step 1: Write failing tests** — each file parses; every row has a source URL and `asKnownAt`; export events are date-ordered and regime codes are in {0, 0.25, 0.5, 0.75, 1}; at least 6 realisation cases including NVIDIA–OpenAI ($100B letter → $30B equity) and the Ohio backstop; no value dated after its `asKnownAt`.
- [ ] **Step 2: Collect** the data from public sources (Federal Register/BIS for rules, lda.senate.gov for lobbying, company filings and press for realisations, congress.gov for letters/hearings, a public model leaderboard for the gap). Mark anything not from a primary source `secondary` or `unverified`. If a driver has no public source, leave it out and record that in `docs/data/` — never invent values.
- [ ] **Step 3: Run** `npm run data:build && npx vitest run tests/data/phase4-data.test.ts` — Expected: PASS.
- [ ] **Step 4: Commit** `data: realisation cases, export-policy history and drivers, market caps, custom-chip partners`.

---

### Task 4: Hyperscalers — capex race and in-house chip share

**Files:**
- Create: `src/engine/players/hyperscalers.ts`
- Modify: `src/engine/layers/clouds.ts` (read `plan.capexGrowth` and funding order from the plan when `decisionsMode === 'games'`), `src/engine/layers/chips.ts` (read `plan.customShare`), `config/engine-params.json`
- Test: `tests/engine/players/hyperscalers.test.ts`

**Interfaces:**
- Consumes: `quantal`, `dampedBestResponse`, `DecisionRecord`, `Plan`.
- Produces: `decideHyperscalers(s, c, p, th): DecisionRecord[]` setting `plan.capexGrowth[id]` and `plan.customShare[id]` for microsoft, alphabet, amazon, meta.
- Capex options: growth of AI capex vs last quarter ∈ {−20%, −10%, 0, +10%, +20%, +30%}. Utility parts (each multiplied by its theory switch, 0 when disabled):
  - `profit` = expected rent over 8 quarters from the added capacity × (1 − cloudOperatingCostRatio) − depreciation − financing cost (rate from the pecking-order source used).
  - `behind` = −`behindPenalty` × max(0, rivals' average growth − own growth) — the race term.
  - `financingRisk` (trade-off theory) = −`leverageCost` × max(0, debt/EBITDA after the choice − target), target = the firm's average over its last 8 reported quarters.
  - `tobinsQ` = `qWeight` × (q − 1) × growth, q = market cap / book equity (latest known).
  - `empire` = `empireWeight` × free cash flow / revenue × growth (Jensen).
  - Pecking order sets the funding: cash, then debt, then equity, with the cost rising at each step.
- Solved by `dampedBestResponse` over the four firms (damping 0.5, max 20 iterations); the record is a `payoff-table`: rows = own options, columns = rivals' average growth bucket, chosen cell marked.
- In-house share options: −2, 0, +2 percentage points per quarter (lead time caps the change). Utility: `costSaving` = (NVIDIA price index − custom cost ratio) × volume (transaction-cost theory: saving scales with volume), `supplyRisk` = value of avoiding NVIDIA allocation shortfall, `switching` = −`switchingCost` × change (CUDA lock-in). Firms without a custom-chip partner keep share 0.
- New params: `lambdaHyperscaler`, `behindPenalty`, `leverageCost`, `qWeight`, `empireWeight`, `customChipCostRatio`, `switchingCost` (all "calibrated in Task 13" until then).

- [ ] **Step 1: Write failing tests** — with the opening state and baseline conditions: four records of game `payoff-table`, each probabilities summing to 1; a rival jump of +30% raises a firm's chosen growth (race term); setting `leverageCost` high and the firm's debt above target lowers its choice; disabling every theory except `profit` gives the same choice as the profit-only argmax; custom share for microsoft without a partner stays 0; custom share moves at most 2 points per quarter.
- [ ] **Step 2–4:** run (FAIL), implement, run (PASS).
- [ ] **Step 5: Commit** `feat(engine): hyperscaler capex race and in-house chip share`.

---

### Task 5: Debt-funded clouds — expand or shrink, and covering a shortfall

**Files:**
- Create: `src/engine/players/debt-clouds.ts`
- Modify: `src/engine/layers/clouds.ts` (credit capacity from the financial accelerator when enabled), `src/engine/layers/finance.ts` (shortfall action from the plan: refinance draws a loan, sell-gpus books a sale at `gpuResale` × book value to `private-credit-other`, default as today)
- Test: `tests/engine/players/debt-clouds.test.ts`

**Interfaces:**
- `decideDebtClouds(s, c, p, th): DecisionRecord[]` for oracle, coreweave, nebius, lambda.
- Expand/hold/shrink: capex growth +20% / 0 / −20%. Utility = `prospectValue(outcome − reference)`, outcome = projected revenue growth, reference = own growth over the last 4 quarters (prospect theory: below reference, riskier options gain weight).
- Credit capacity (financial accelerator): `collateralHaircut` × GPU collateral value (`gpuResale` condition × chip book value) + `ocfMultiple` × trailing operating cash flow; replaces `creditCapacityMultipleOfRent` when enabled.
- Shortfall menu (only when cash < dues): refinance (feasible if credit open and capacity remains; cost = new rate), sell GPUs (proceeds = resale × book, loses future rent), default (debts written down, loses the business). A `game-tree` record: firm's move then lender's response (roll over / refuse).
- New params: `lambdaDebtCloud`, `collateralHaircut`, `ocfMultiple`.

- [ ] **Step 1: Write failing tests** — a firm below its reference growth chooses expand more often than one above (prospect theory); with credit shut and collateral value 0, the shortfall choice is sell-gpus or default, never refinance; a GPU sale keeps the ledger balanced and lowers the firm's chip book; disabled `financialAccelerator` reproduces the phase 2 capacity.
- [ ] **Step 2–4:** run (FAIL), implement, run (PASS).
- [ ] **Step 5: Commit** `feat(engine): debt-funded cloud decisions and financial-accelerator credit`.

---

### Task 6: Labs — commitments and fundraising; VCs — fund or pass

**Files:**
- Create: `src/engine/players/labs.ts`, `src/engine/players/vcs.ts`
- Modify: `src/engine/layers/finance.ts` (apply commitment outcomes: pay as scheduled; delay moves the amount one quarter later plus `delayPenaltyRate`; renegotiate cuts the remaining schedule to the agreed share; walk writes down the remainder and the counterparty keeps any collateral), `src/engine/contracts.ts` (reschedule helpers)
- Test: `tests/engine/players/labs.test.ts`

**Interfaces:**
- `decideLabs(s, c, p, th): DecisionRecord[]` — for each lab with a cash shortfall against this quarter's commitments (otherwise pay, recorded as a summary), one `game-tree` per commitment: lab moves pay / delay / renegotiate (offer 60% of remaining) / walk; counterparty responds accept / enforce / counter (80%). Leaf payoffs:
  - Lab: −cash paid − `reputationCost` × amount (future funding gets dearer) − lost compute value if the capacity is lost.
  - Counterparty: cash received + recoveries − re-letting loss. Re-letting loss = remaining value × asset specificity (hold-up: the share of the counterparty's capacity built for this tenant).
  - Enforce recovers `min(hardMinimum remaining, lab assets) × recoveryRate` only when take-or-pay or hell-or-high-water is "yes"; with "unknown" it recovers half of that, and the tree states the assumption; without `hardMinimumUsd` enforcement recovers 0.
- `decideVCs(s, c, p, th): DecisionRecord[]` — a lab with runway under `runwayTargetQuarters` raises; VC fund/pass by quantal choice on utility = expected return proxy (lab revenue growth) + `herdingWeight` × share of recent rounds funded (information cascade) − `sentimentWeight` × equitySentiment (VIX). Funded amount flows `venture-capital → lab` as `equity`.
- New params: `lambdaLab`, `lambdaVC`, `reputationCost`, `delayPenaltyRate`, `recoveryRate`, `runwayTargetQuarters`, `herdingWeight`, `sentimentWeight`.

- [ ] **Step 1: Write failing tests** — a commitment without `hardMinimumUsd` and a short lab: walk is chosen and the counterparty's enforce branch recovers 0; the same commitment with take-or-pay "yes" and a hard minimum: pay or renegotiate is chosen; hidden terms produce a tree whose reason mentions the assumption and has finite payoffs; delay, renegotiate and walk each keep net financial assets unchanged; VCs fund more when recent rounds were funded (herding) and less when VIX is high.
- [ ] **Step 2–4:** run (FAIL), implement, run (PASS).
- [ ] **Step 5: Commit** `feat(engine): lab commitment games and VC funding decisions`.

---

### Task 7: NVIDIA — pricing, allocation, guarantees and customer investments

**Files:**
- Create: `src/engine/players/nvidia.ts`
- Modify: `src/engine/layers/chips.ts` (price index scales the ASP and gross margin; allocation splits shipments when supply-bound), `src/engine/layers/finance.ts` (guarantee honour pays the guaranteed party's lender; contest = no payment, `trustLoss` lowers NVIDIA's share in the following quarters)
- Test: `tests/engine/players/nvidia.test.ts`

**Interfaces:**
- Pricing (Cournot / Lerner): margin = share / `demandElasticity`, share = NVIDIA's share of accelerator spend; `demandElasticity` fitted so the 2023–2026 margins are reproduced; the price index moves the ASP by the margin change and rises by `scarcityPremium` when supply-bound. Record game `policy` with the Lerner comparison.
- Allocation when supply-bound: each buyer's share ∝ expected future orders × (1 + `relationshipWeight` if NVIDIA-linked), quantal.
- Guarantees (repeated game): honour iff cost < δ/(1 − δ) × annual orders at risk × margin × `trustLoss`, δ = 1/(1 + cost of capital per year). Record `repeated` with both sides of the comparison.
- Customer investments (Stackelberg leader): invest `I` in a customer's round or new deal iff `I` < present value of extra orders it induces (customer's chip budget increase × NVIDIA share × margin over 8 quarters); options $0 / $5B / $10B / $20B; record `payoff-table`.
- New params: `demandElasticity`, `scarcityPremium`, `relationshipWeight`, `trustLoss`, `lambdaNvidia`.

- [ ] **Step 1: Write failing tests** — when custom-chip share rises, NVIDIA's margin falls (Lerner); when supply-bound, NVIDIA-linked customers get a larger share; a guarantee whose cost exceeds the discounted orders at risk is contested; an investment smaller than the induced orders' value is made and flows `nvidia → customer` as `equity`; the 2026Q2 margin from the pricing rule is within 3 points of the reported margin.
- [ ] **Step 2–4:** run (FAIL), implement, run (PASS).
- [ ] **Step 5: Commit** `feat(engine): NVIDIA pricing, allocation, guarantees and customer investments`.

---

### Task 8: Suppliers — TSMC and SK Hynix capacity

**Files:**
- Create: `src/engine/players/suppliers.ts`
- Modify: `src/engine/supply-path.ts` (after the anchor quarter, capacity = anchor capacity + additions decided and arrived; before it, the existing path), `src/engine/layers/chips.ts`
- Test: `tests/engine/players/suppliers.test.ts`

**Interfaces:**
- `decideSuppliers(s, c, p, th): DecisionRecord[]` — options: add 0 / 5 / 10 / 15% of current capacity, arriving after `cowosLeadQuarters` (TSMC) or `hbmLeadQuarters` (SK Hynix). Utility = present value of expected utilisation × margin − capex cost − `overcapacityCost` × expected idle share; expected demand = Kalman-filtered order growth (time-to-build makes overshoot possible). Record `payoff-table`.
- New params: `cowosLeadQuarters` (4), `hbmLeadQuarters` (4), `capacityCostPerUnit`, `overcapacityCost`, `lambdaSupplier`.

- [ ] **Step 1: Write failing tests** — a growing backlog raises the chosen addition; an addition arrives exactly `leadQuarters` later and raises `supplyCapacity`; with flat demand and idle capacity the choice is 0; history quarters keep the existing path.
- [ ] **Step 2–4:** run (FAIL), implement, run (PASS).
- [ ] **Step 5: Commit** `feat(engine): supplier capacity decisions with lead times`.

---

### Task 9: Government — export-control game

**Files:**
- Create: `src/engine/players/government.ts`
- Modify: `src/engine/conditions.ts` (`exportRegime` in one path comes from `plan.exportRegime` after the as-of quarter), `config/condition-bounds.json` (`exportRegime` and `powerGw` marked `"locked": true`)
- Test: `tests/engine/players/government.test.ts`

**Interfaces:**
- Regime ladder {0, 0.25, 0.5, 0.75, 1} (0 closed, 1 open). US options: tighten one step / hold / loosen one step. China's response options: retaliate / accelerate domestic chips / negotiate (a 2-level `game-tree`, US moves first).
- US utility terms, each a theory switch:
  - `publicInterest` = `wSecurity` × change in the AI gap (from China's chip output and access) − `wEconomy` × change in US chip revenue from China.
  - `regulatoryCapture` = `wCapture` × lobbying intensity × industry revenue at stake.
  - `publicChoice` = timing: changes are scaled by `electionCycle(monthsToElection)`.
  - `baptistsBootleggers` = `wCoalition` × (hawk signal) × (beneficiary signal), counted only when both are present.
  - `pathDependence` = status-quo bonus `wStatusQuo` and a minimum of `minQuartersBetweenRules` between changes (process lag from the event history).
- `fitGovernment(events, drivers): Weights` fits the five weights by maximum likelihood on the event history, with priors centred on equal weights (shrinkage), and reports the log-likelihood and the hit rate.
- The record (`policy`) carries `theories`: each term's share of the chosen option's utility.

- [ ] **Step 1: Write failing tests** — the fitted model reproduces the direction of at least 70% of historical moves in-sample; with `pathDependence` on, no change happens within `minQuartersBetweenRules` of the last; turning all theories off except `publicInterest` changes the weights report; the conditions panel marks `exportRegime` and `powerGw` locked (no handles); `exportRegime` after the as-of quarter equals the plan's value.
- [ ] **Step 2–4:** run (FAIL), implement, run (PASS).
- [ ] **Step 5: Commit** `feat(engine): US–China export-control game from five political theories`.

---

### Task 10: New deals and announced-deal realisation

**Files:**
- Create: `src/engine/players/deals.ts`
- Modify: `src/engine/contracts.ts` (schedule obligations for model-created deals; apply realisation to `announced` deals), `src/engine/asof.ts` (`DealView.modelCreated?: true`)
- Test: `tests/engine/players/deals.test.ts`

**Interfaces:**
- Needs: a lab whose compute need over the next 4 quarters exceeds contracted capacity → compute lease; a cloud whose planned capex exceeds funds → GPU-backed loan; NVIDIA's Task 7 investments → equity.
- Offers: every eligible counterparty (clouds with spare capacity; lenders in the money layer; NVIDIA) makes an offer at its reservation terms. The borrower's outside option is the second-best offer (competition); terms come from `nashBargain` with `powerA` = the borrower's relative cash position. Rates and lengths are clamped to the range of real deals of the same type (parsed from `deals.json`).
- A created deal is a `DealView` with `modelCreated: true`, `announced` = the quarter, and obligations scheduled like a real deal. Record `bargaining`: each side's outside option, the surplus, the split and the terms.
- Realisation: an `announced` deal not yet signed or active is scaled by the reference-class rate for its type (median realised/announced over `realisation-<type>` cases known at asOf). With `signalling` on, an extra `signalDiscount` applies when the announcer raises capital within 2 quarters of the announcement. Types with fewer than 3 cases use the pooled rate.
- New params: `signalDiscount`, `lambdaDeal`.

- [ ] **Step 1: Write failing tests** — a lab short of compute gets a lease whose rate lies inside the real-deal range; a borrower with two offers gets better terms than with one; a created deal's obligations keep the ledger balanced; NVIDIA–OpenAI's announced value is scaled by the rate from cases known at asOf (no look-ahead: an asOf before the $30B outcome must not use it); a pooled rate is used for a type with fewer than 3 cases.
- [ ] **Step 2–4:** run (FAIL), implement, run (PASS).
- [ ] **Step 5: Commit** `feat(engine): new deals by bargaining and announced-deal realisation`.

---

### Task 11: Expectations — Kalman learning and measured over-extrapolation

**Files:**
- Modify: `src/engine/layers/clouds.ts` (expected rent growth via `kalmanStep` when `kalmanLearning` is enabled), `src/engine/players/hyperscalers.ts`, `src/engine/players/suppliers.ts`
- Test: `tests/engine/expectations.test.ts`

**Interfaces:**
- Expected growth state per buyer `{ mean, variance }` in `EngineState.memory` (`exp:<id>:m`, `exp:<id>:v`); `kalmanQ`, `kalmanR` params; over-extrapolation measured from company guidance vs actual capex where guidance exists (Greenwood–Shleifer extrapolation weight), else the calibrated `overExtrapolation`.

- [ ] **Step 1: Write failing tests** — after a sudden drop in rent, the Kalman mean falls part of the way in one quarter and most of the way within four; with `kalmanLearning` off, the phase 2 expectation update is used unchanged.
- [ ] **Step 2–4:** run (FAIL), implement, run (PASS).
- [ ] **Step 5: Commit** `feat(engine): Kalman learning expectations`.

---

### Task 12: Decision view on the canvas

**Files:**
- Create: `src/app/decision-view.ts`
- Modify: `src/app/scene.ts` (decision notes from `run.decisions`: one per player per quarter where the choice was non-trivial, lettered with events), `src/app/canvas/render.ts`, `src/app/main.ts` (clicking a note or a company opens its latest decision; replaces the phase-4 toast), `src/app/conditions/panel.ts` (locked conditions: chart without handles, label "Model output: <reason>")
- Test: `tests/app/decision-view.test.ts`

**Interfaces:**
- `decisionHtml(d: DecisionRecord, names): string` renders, in the locked style:
  - `payoff-table`: rows = own options, columns = rivals' choices, utilities in cells, chosen cell highlighted, probabilities beside each row;
  - `game-tree`: a small SVG tree (≤ 3 levels) with each leaf's payoffs per player, the chosen path in ink, others faded, probabilities on branches;
  - `bargaining`: two bars for each side's outside option, the surplus and the split;
  - `repeated`: the one-time cost vs the discounted long-run value;
  - `policy`: options with utilities and a bar showing each theory's share of the choice.
- Every view shows the one-line reason, the quarter, and "Most likely choice shown; the range of outcomes (phase 6) varies it".

- [ ] **Step 1: Write failing tests** — each `game` kind renders without throwing; the chosen option is marked; all names are escaped; a tree with hidden terms shows the assumption text.
- [ ] **Step 2–4:** run (FAIL), implement, run (PASS).
- [ ] **Step 5: Verify** with Playwright at 1440×900: click a hyperscaler decision note (payoff table), a lab commitment (tree), the government note (policy); screenshots to the scratchpad; no horizontal scroll; Esc closes.
- [ ] **Step 6: Commit** `feat(app): decision view — payoff tables, game trees, bargaining and policy`.

---

### Task 13: Calibration, theory ablation and backtest gate

**Files:**
- Create: `src/engine/ablation.ts`, `scripts/engine/ablate.ts`
- Modify: `src/engine/calibrate.ts` (coordinate search over the decision params: one at a time over a 5-point grid inside min/max, 2 sweeps), `scripts/engine/calibrate.ts`, `scripts/engine/run-baseline.ts` (writes `data/build/ablation.json`), `src/explorer/engine-section.ts` (ablation table), `config/theories.json`, `config/engine-params.json`, `package.json` (`engine:ablate`)
- Test: `tests/engine/ablation.test.ts`

**Interfaces:**
- `ablate(build, params, theories): { theory: string; heldOutWith: number; heldOutWithout: number; kept: boolean }[]` — for each theory, held-out (2026) MAPE with and without it; `kept` iff removing it makes held-out MAPE worse by at least 0.5 points. The run writes `theories.json` `enabled` from `kept`.
- Gate: after calibration and ablation, the model must beat naive, drift and ETS on the three scored targets. Otherwise set `decisionsMode: "rules"`, rebuild the baseline, and state it in the commit and final report.

- [ ] **Step 1: Write failing tests** — `ablate` returns one row per theory; a theory whose switch changes nothing is not kept; `decisionsMode: "rules"` reproduces the phase 3 baseline numbers.
- [ ] **Step 2–4:** run (FAIL), implement, run (PASS).
- [ ] **Step 5: Run** `npm run engine:calibrate && npm run engine:ablate && npm run engine:baseline && npm run data:check-fresh` — record the fitted values, the kept theories and fit/holdout MAPE in the commit body.
- [ ] **Step 6: Commit** `feat(engine): calibrate decisions, theory ablation and backtest gate` (include `data/build/`).

---

## Out of scope (later)

- Lenders' decisions, the money behind lenders, lender runs, clearing, fire sales, government rescues — phase 5.
- Random draws of choices and deal terms, fan charts — phase 6.
- Power supply model from interconnection queues and EIA plant data (permitting decisions included) — step 4b.
- Adoption S-curve and Wright's-law cost declines — step 4c.
- More new-deal types (beyond lease, GPU-backed loan, NVIDIA equity) — phase 6.
