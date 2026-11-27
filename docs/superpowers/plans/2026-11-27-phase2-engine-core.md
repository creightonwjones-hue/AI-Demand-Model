# Phase 2 — Engine Core (Simple Rules) and Backtest Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working simulation engine: a quarterly, double-entry money-flow model of the AI chain that
runs One path from 2022Q1 to 2030Q4 with simple rule-based company behaviour, plus a backtest harness that scores it
against 2023–2026 actuals, shown on the explorer page as the phase checkpoint.

**Architecture:** Pure TypeScript engine in `src/engine/`, independent of the DOM. Each quarter runs fixed layers in
order (conditions → demand → compute → cloud capex → chip orders and supply → chip maker and supplier P&L → contracts
and ledger → default test → outputs), mutating one `EngineState` and appending to a `RunResult`. Data comes only from
`data/build/*.json` through an as-of loader, so a run started at a past date sees only what was public then. Rules are
deliberately simple and parameterised in `config/engine-params.json`; phase 4 replaces rules with strategic decisions
and phase 5 adds credit contagion without changing these interfaces.

**Tech Stack:** Node 22, TypeScript ^5.6, zod ^3.23, vitest ^2.1, tsx ^4.19, vite ^5.4 (all already installed). No new
runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-11-26-ai-demand-model-design.md` — §8 (engine; this phase implements §8.1–8.3,
the rule-based version of §8.4, the simple default test and Minsky labels from §8.5, and One path from §8.6), §9
(conditions), §10 (outputs), §13 (calibration and validation), §15 (phase 2). Phase 1 follow-ups this plan picks up are
listed in `docs/superpowers/plans/2026-11-26-phase1-followups.md` and named in each task.

This is plan 2 of 7. Phase 3 (canvas UI) consumes `RunResult` as defined here.

## Global Constraints

- TypeScript only. Public data only. Never estimate a number in data files; model outputs are labelled as modelled.
- **No look-ahead.** A run with `asOf = D` may use only facts with `asKnownAt <= D`, series points with
  `asKnownAt <= D`, deal records with `announced <= D`, and deal status entries with `asKnownAt <= D`. All engine data
  access goes through the as-of loader (Task 3); no engine module reads `data/build` directly.
- **Ledger invariant:** every flow has a payer and a payee; after every quarter, the sum of all entities' net financial
  assets is unchanged by flows (to within $1). A violation is recorded in `RunResult.invariantErrors` and fails tests.
- Deal value fields stay separate (`hardMinimumUsd`, `ceilingUsd`, `conditionalUsd`, `estimateUsd`); the engine never
  adds them together. Only `hardMinimumUsd` creates scheduled obligations in this phase.
- Time grid: quarters `2022Q1` … `2030Q4` (36 quarters). Money in USD per quarter unless a name says otherwise.
- Build delays from spec §8.3: GPU orders become installed capacity after 2–4 quarters (default 3); buildings and power
  after 8–16 quarters (default 10).
- One path is deterministic: the same inputs give byte-identical `RunResult` JSON. No randomness in this phase.
- Every tunable number lives in `config/engine-params.json` with `value`, `unit`, `description` (plain language) and
  `source` (a data source id, "calibrated", or "assumption"). No magic numbers in engine code.
- Performance: one full run (36 quarters, all entities) under 50 ms in Node on the CI machine.
- Backtest pass standard (spec §13, decided by the owner): conditional backtest; real past conditions and deals are
  inputs; each company starts when its public data exists. Point metrics in this phase; the 80%-range coverage part is
  scored in phase 6 when ranges exist.

## Review Focus

1. **Look-ahead through deals.** A deal announced in 2026 must not create obligations in a run with `asOf` in 2024, and
   a status change (e.g. "cancelled") must not apply before its `asKnownAt`. (Tests in Tasks 1, 3 and 10.)
2. **Money appearing or vanishing.** Rounding, defaults or a missing counterparty silently breaking the ledger
   invariant. (Tests in Tasks 5 and 10.)
3. **Companies with no data at the start date.** CoreWeave before 2024, Anthropic before 2023, SK Hynix with no
   filings. Expect them to enter when data exists (or as an aggregate placeholder flagged as modelled), never as zeros
   that look like real figures. (Test in Task 6.)
4. **Supply limits that bind.** When demand exceeds CoWoS/HBM/power capacity, shipments are capped, the shortfall is
   recorded, and prices or backlog respond — not silently dropped demand. (Test in Task 8.)
5. **Fiscal-calendar mismatches in comparisons.** NVIDIA's fiscal years end in late January; consensus figures are
   fiscal-year totals. Backtest and consensus comparisons must aggregate model quarters to the right fiscal periods.
   (Test in Task 11.)

---

## File structure

```
config/engine-params.json        every tunable number with unit, description, source
config/conditions.json           condition catalogue: id, name, unit, kind, history source, default method, range source
src/data/quarters.ts             (modify) shared addDays + instantQuarter moved here (follow-up)
src/data/schema.ts               (modify) status-entry asKnownAt; Oracle RPO metric
src/engine/types.ts              all engine types (single source of truth for phases 2–7)
src/engine/params.ts             load + validate engine params
src/engine/grid.ts               time grid helpers
src/engine/asof.ts               as-of view of data/build: facts, series, deals
src/engine/conditions.ts         condition paths: history + default forward path + forecast range
src/engine/ledger.ts             double-entry ledger, balance sheets, invariant check
src/engine/contracts.ts          deals -> scheduled obligations
src/engine/init.ts               initial EngineState at a start quarter
src/engine/layers/demand.ts      end-customer spend, elasticity, lab shares, compute need
src/engine/layers/clouds.ts      cloud capex rules, renting, capacity pipelines
src/engine/layers/chips.ts       chip orders (bullwhip), supply cap, shipments, chip maker + supplier P&L
src/engine/layers/finance.ts     contracts settlement, interest, depreciation, default test, Minsky labels
src/engine/run.ts                runOnePath: quarter loop over the layers
src/engine/backtest.ts           conditional backtest, benchmarks, metrics
scripts/engine/run-baseline.ts   writes data/build/engine-baseline.json and data/build/backtest.json
scripts/engine/calibrate.ts      grid search on a few params, 2023–2025 fit, 2026 held out
src/explorer/engine-section.ts   explorer "Engine check" section
tests/engine/*.test.ts           one file per module
```

---

### Task 1: Data follow-ups the engine depends on

**Files:**
- Modify: `src/data/schema.ts`, `src/data/quarters.ts`, `src/data/xbrl.ts`, `src/data/manual-financials.ts`,
  `data/deals/deals.json`, `data/manual/financials.csv`, `data/manual/series.csv`, `config/sec-metrics.json`,
  `docs/data/adding-a-deal.md`
- Test: `tests/schema.test.ts`, `tests/deals.test.ts`, `tests/quarters.test.ts`, `tests/build-data.test.ts`

**Interfaces:**
- Produces:
  - Deal `statusHistory` entries gain required `asKnownAt: isoDate` (date the entry became public; `>= date`). Deal
    `terms` gains optional `asKnownAt: isoDate` (date the terms as written became public; defaults to `announced` when
    absent).
  - `addDays(iso: string, n: number): string` and `instantQuarter(instant: string): QuarterKey` exported from
    `src/data/quarters.ts`; `xbrl.ts` and `manual-financials.ts` import them (follow-up "duplicate addDays").
  - Metric `'dilutedShares'` (XBRL `WeightedAverageNumberOfDilutedSharesOutstanding`, unit shares) and
    `'remainingPerformanceObligations'` (XBRL `RevenueRemainingPerformanceObligation`) added to `Metric` and
    `config/sec-metrics.json`.
- Rules: backfill `asKnownAt` for every existing status entry = the filing/announcement date that first reported it
  (equal to `date` when the source reported it the same day; the 8-K filing date for SEC-confirmed events such as the
  Anthropic placement closing → 2026-11-25). `terms.asKnownAt` = date of the source the terms came from (e.g. DDTL 1.0
  recourse from the 2026 10-K).
- Data additions (from phase 1 follow-ups; primary SEC sources only, status `primary-filing`):
  1. NVIDIA `segmentRevenue` for Data Center (and Hyperscale / AI Clouds, Industrial & Enterprise where reported) for
     every quarter 2022Q1–2026Q3, from NVIDIA's 8-K exhibit 99.2 (CFO commentary) or 10-Q/10-K text on sec.gov.
     `as_known_at` = 8-K filing date.
  2. CoreWeave DDTL 2.1 deal record ($3.0B, recourse, matures Mar 2031) from the CoreWeave 10-Q Q3 2026.
  3. `anthropic-google-csp-hosting-2026` statusHistory entry dated 2026-10-26 for the $114.5B S-1 figure.
  4. Anthropic quarterly revenue history from the S-1/424B4 (manual `financials.csv`, metric `revenue`, entity
     `anthropic`), every quarter the prospectus reports.
  5. An `nvda` custom-taxonomy capex tag (if the 2023 NVIDIA 10-Qs use one) added to `config/sec-metrics.json` so
     NVIDIA capex 2022Q4–2023Q2 is known at its original filing date.

- [ ] **Step 1: Write failing tests**

```ts
// tests/schema.test.ts
expect(DealSchema.safeParse({ ...validDeal, statusHistory: [{ date: '2026-01-02', status: 'active' }] }).success).toBe(false)
expect(DealSchema.safeParse({ ...validDeal, statusHistory: [{ date: '2026-01-02', asKnownAt: '2026-01-01', status: 'active' }] }).success).toBe(false) // known before it happened
// tests/quarters.test.ts
expect(addDays('2026-02-27', 3)).toBe('2026-03-02')
expect(instantQuarter('2026-07-26')).toBe('2026Q2')
// tests/deals.test.ts
const placement = loadDeals().find(d => d.id === 'nvidia-anthropic-ipo-placement')!
expect(placement.statusHistory.find(s => s.status === 'completed')).toMatchObject({ date: '2026-11-20', asKnownAt: '2026-11-25' })
expect(loadDeals().find(d => d.id === 'coreweave-ddtl-2-1')).toMatchObject({ terms: { recourse: 'recourse' } })
// tests/build-data.test.ts (over data/build)
const dc = facts.filter(f => f.entityId === 'nvidia' && f.metric === 'segmentRevenue' && f.segment === 'Data Center')
expect(new Set(dc.map(f => f.quarter))).toEqual(new Set(quarterRange('2022Q1', '2026Q3')))
expect(facts.some(f => f.entityId === 'anthropic' && f.metric === 'revenue')).toBe(true)
expect(facts.filter(f => f.metric === 'dilutedShares' && f.entityId === 'nvidia').length).toBeGreaterThan(0)
```

- [ ] **Step 2: Run** `npx vitest run tests/schema.test.ts tests/quarters.test.ts tests/deals.test.ts tests/build-data.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** the schema and helper changes; backfill status `asKnownAt` in `deals.json`; add the data
  rows and the deal; update `docs/data/adding-a-deal.md` with the status `asKnownAt` rule.
- [ ] **Step 4: Run** `npm test && npm run data:build && npm run data:check-fresh` after committing data/build —
  expect PASS.
- [ ] **Step 5: Commit** `data: status as-known dates, NVIDIA segment history, Anthropic revenue, share counts`.

---

### Task 2: Engine types, grid and parameters

**Files:**
- Create: `src/engine/types.ts`, `src/engine/grid.ts`, `src/engine/params.ts`, `config/engine-params.json`
- Test: `tests/engine/grid.test.ts`, `tests/engine/params.test.ts`

**Interfaces:**
- Produces (`src/engine/types.ts`, exported types only):
  - `Grid { quarters: QuarterKey[]; idx(q: QuarterKey): number }`
  - `ConditionId = 'aiSpend' | 'tokenPrice' | 'priceElasticity' | 'creditSpread' | 'riskFree' | 'gpuResale' |
    'gpuRental' | 'powerGw' | 'exportRegime' | 'equitySentiment' | 'physicalAiGrowth' | 'labourSubstitution'`
  - `ConditionPath { id: ConditionId; unit: string; values: number[] /* one per grid quarter */;
    origin: ('history' | 'default' | 'user')[]; low: number[]; high: number[]; rangeSource: string }`
  - `Conditions = Record<ConditionId, ConditionPath>`
  - `ParamValue { value: number; unit: string; description: string; source: string; min?: number; max?: number }`
  - `EngineParams = Record<string, ParamValue>`
  - `FlowKind = 'customer-spend' | 'compute-rent' | 'chip-purchase' | 'memory-purchase' | 'foundry' | 'lithography' |
    'buildings-capex' | 'equity' | 'loan-draw' | 'interest' | 'principal' | 'guarantee-payment' | 'operating-cost'`
  - `Flow { quarter: QuarterKey; from: string; to: string; amountUsd: number; kind: FlowKind; dealId?: string;
    label: string /* short line title for the canvas, e.g. "Buys GPUs" */ }`
  - `Minsky = 'hedge' | 'speculative' | 'ponzi'`
  - `EntityQuarter { quarter: QuarterKey; revenue: number; operatingCost: number; capex: number;
    operatingCashFlow: number; netIncome: number; cash: number; debt: number; equityRaised: number;
    minsky: Minsky; defaulted: boolean; modelled: boolean /* false when the value is the actual (history) */ }`
  - `NvidiaQuarter { quarter: QuarterKey; revenue: number; dataCenter: number; hyperscale: number;
    aiCloudsEnterprise: number; edge: number; physicalAi: number; grossMargin: number; netIncome: number;
    eps: number; unitsShipped: number; supplyShortfallUnits: number; customerFinancedShare: number }`
  - `EngineEvent { quarter: QuarterKey; entityId: string; kind: 'default' | 'minsky-change' | 'supply-bound' |
    'contract-missed' | 'equity-raise' | 'loan-draw'; reason: string /* one plain-language line */ }`
  - `RunResult { grid: Grid; flows: Flow[]; entities: Record<string, EntityQuarter[]>; nvidia: NvidiaQuarter[];
    events: EngineEvent[]; invariantErrors: string[]; asOf: string; start: QuarterKey }`
- Produces: `makeGrid(from = '2022Q1', to = '2030Q4'): Grid` (`grid.ts`); `loadParams(path?): EngineParams` and
  `param(p: EngineParams, key: string): number` (throws on unknown key) in `params.ts`.
- `config/engine-params.json` starting keys (values are starting guesses marked `source: "assumption"` unless a data
  source is named; Task 12 calibrates the ones marked calibrate): `gpuLeadQuarters` 3 (min 2, max 4),
  `buildingLeadQuarters` 10 (min 8, max 16), `computeCostShare` (share of lab revenue spent on compute; source
  Anthropic S-1 commitments vs revenue; calibrate), `overExtrapolation` 1.0 (calibrate), `expectationGain` 0.3
  (calibrate), `hyperscalerAiCapexShare` (calibrate), `chipShareOfAiCapex` (calibrate), `nvidiaShareOfAccelerators`
  (calibrate), `nvidiaAspUsd` (per-unit average selling price; calibrate), `nvidiaGrossMargin` (source NVIDIA 8-Ks),
  `bullwhipInventoryWeeks` 8, `bullwhipCorrectionRate` 0.5, `gpuEconomicLifeQuarters` 20, `gpuAccountingLifeQuarters`
  24, `labShareDrift` 0.1, `defaultRunwayQuarters` 0, `defaultContractQuarters` 20, `aiAddressableWageBillUsd`
  (annual wage bill of AI-exposed work; source cited from BLS/OECD or marked assumption), `cowosUnitsPerQuarter` and
  `hbmUnitsPerQuarter` (accelerator-equivalent supply ceilings from the research notes' CoWoS/HBM estimates, source
  secondary), `kwPerAccelerator` and `powerLoadFactor` (converting `powerGw` to an accelerator ceiling),
  `tsmcShareOfChipCost`, `skHynixShareOfChipCost`, `asmlShareOfTsmcCapex`, `cloudOperatingCostRatio`,
  `labOperatingCostRatio`. Each with plain-language `description`.

- [ ] **Step 1: Write failing tests**

```ts
const g = makeGrid()
expect(g.quarters.length).toBe(36)
expect(g.quarters[0]).toBe('2022Q1'); expect(g.quarters[35]).toBe('2030Q4')
expect(g.idx('2026Q3')).toBe(18)
expect(() => g.idx('2031Q1')).toThrow()
const p = loadParams()
expect(param(p, 'gpuLeadQuarters')).toBe(3)
expect(() => param(p, 'nope')).toThrow(/unknown param/i)
for (const [k, v] of Object.entries(p)) expect(v.description.length, k).toBeGreaterThan(20)
expect(() => loadParams('tests/fixtures/params-out-of-range.json')).toThrow(/gpuLeadQuarters/)
```

- [ ] **Step 2: Run** `npx vitest run tests/engine/grid.test.ts tests/engine/params.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** the three modules and the params file (zod schema; `value` within `min`/`max` when given).
- [ ] **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat(engine): core types, time grid and parameter file`.

---

### Task 3: As-of data view

**Files:**
- Create: `src/engine/asof.ts`
- Test: `tests/engine/asof.test.ts`

**Interfaces:**
- Consumes: `data/build/*.json` (via `loadBuild(dir = 'data/build'): BuildData` — plain JSON parse + zod validation of
  the existing schemas); `valueAsOf` from `src/data/xbrl.ts`.
- Produces:
  - `BuildData { entities: Entity[]; facts: FinancialFact[]; series: Series[]; deals: Deal[] }`
  - `AsOfData { asOf: string; entities: Entity[]; fact(entityId: string, metric: Metric, quarter: QuarterKey,
    segment?: string): FinancialFact | undefined; series(id: string): SeriesPoint[] /* points known by asOf */;
    deals: DealView[] }`
  - `DealView = Deal & { statusAsOf: DealStatus /* latest status entry with asKnownAt <= asOf */ }` — only deals with
    `announced <= asOf`; `statusHistory` filtered to entries with `asKnownAt <= asOf`.
  - `asOfView(build: BuildData, asOf: string): AsOfData`

- [ ] **Step 1: Write failing tests**

```ts
const v24 = asOfView(build, '2024-12-31')
expect(v24.deals.some(d => d.id === 'nvidia-openai-ohio-backstop')).toBe(false)          // announced 2026
expect(v24.fact('oracle', 'revenue', '2022Q2')!.value).toBeCloseTo(11.84e9, -7)
expect(v24.series('cds5y-coreweave-spgmi').every(p => p.asKnownAt! <= '2024-12-31')).toBe(true)
const vPre = asOfView(build, '2026-11-21')
expect(vPre.deals.find(d => d.id === 'nvidia-anthropic-ipo-placement')!.statusAsOf).not.toBe('completed') // 8-K known 11-25
const vPost = asOfView(build, '2026-11-26')
expect(vPost.deals.find(d => d.id === 'nvidia-anthropic-ipo-placement')!.statusAsOf).toBe('completed')
expect(asOfView(build, '2022-06-30').fact('coreweave', 'revenue', '2022Q1')).toBeUndefined()
```

- [ ] **Step 2: Run** `npx vitest run tests/engine/asof.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** `asof.ts`.
- [ ] **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat(engine): as-of data view with no look-ahead`.

---

### Task 4: Condition catalogue, defaults and forecast ranges

**Files:**
- Create: `config/conditions.json`, `src/engine/conditions.ts`
- Test: `tests/engine/conditions.test.ts`

**Interfaces:**
- Consumes: `ConditionId`, `ConditionPath`, `Conditions`, `Grid` (Task 2); series from `data/build/series.json`.
- Produces: `buildConditions(data: AsOfData, grid: Grid, asOf: string): Conditions` (history up to the last quarter
  with data known at `asOf`, then default path, plus low/high range); `withUserPath(c: Conditions, id: ConditionId,
  values: Partial<Record<QuarterKey, number>>): Conditions` (marks overridden quarters `origin: 'user'`).
  (`AsOfData` comes from Task 3.)
- `config/conditions.json`: one entry per `ConditionId` with `name`, `unit`, `historySeries` (series ids, quarterly
  aggregation = mean of points known by quarter end), `defaultMethod`, `rangeMethod`, `rangeSourceLabel`
  (plain language, shown on hover in phase 3). Default and range methods allowed in this phase:
  - `hold-last` (flat at last history value; range = ±k × historical quarterly volatility, k in params),
  - `consensus` (path through consensus/guidance points; range = consensus low/high where present),
  - `trend-decay` (last observed growth rate decaying to a long-run rate given in params; range from Farmer–Lafond-style
    widening: ±(a + b·h) in log terms, a, b in params),
  - `published` (a list of dated published forecast points in `config/conditions.json` with their source URLs;
    linear interpolation; low/high from the published range).
- Condition mapping for this phase: `riskFree` ← FRED DGS10 (hold-last); `creditSpread` ← FRED BAA10Y history,
  BAMLH0A0HYM2 where available (hold-last); `gpuRental` ← `gpu-rent-h100-reserved-semianalysis` (hold-last);
  `gpuResale` ← used-GPU series (trend-decay); `equitySentiment` ← FRED VIXCLS (hold-last); `aiSpend` ← sum of lab
  revenue facts (Anthropic primary) and OpenAI secondary series where known (trend-decay; history marked partial when
  a component is missing); `powerGw` ← `published` points from the research notes (LBNL 2024 and IEA 2025 data-centre
  demand figures, cited, status secondary) converted to GW at a stated load factor param; `tokenPrice`,
  `labourSubstitution`, `physicalAiGrowth`, `exportRegime`, `priceElasticity` ← `published`/`hold-last` with clearly
  labelled assumption sources until better data exists. Every assumption-sourced condition has `rangeSourceLabel`
  beginning "Assumption:".

- [ ] **Step 1: Write failing tests**

```ts
const c = buildConditions(asOfData('2026-11-26'), makeGrid(), '2026-11-26')
for (const id of CONDITION_IDS) {
  expect(c[id].values.length, id).toBe(36)
  expect(c[id].values.every(Number.isFinite), id).toBe(true)
  for (let i = 0; i < 36; i++) expect(c[id].low[i] <= c[id].values[i] && c[id].values[i] <= c[id].high[i], `${id}@${i}`).toBe(true)
}
expect(c.riskFree.origin[makeGrid().idx('2025Q4')]).toBe('history')
expect(c.riskFree.origin[makeGrid().idx('2027Q1')]).toBe('default')
// as-of: a 2024 view must not contain 2025 history
const c24 = buildConditions(asOfData('2024-06-30'), makeGrid(), '2024-06-30')
expect(c24.riskFree.origin[makeGrid().idx('2024Q3')]).toBe('default')
const u = withUserPath(c, 'creditSpread', { '2027Q1': 9.0 })
expect(u.creditSpread.values[makeGrid().idx('2027Q1')]).toBe(9.0)
expect(u.creditSpread.origin[makeGrid().idx('2027Q1')]).toBe('user')
expect(c.tokenPrice.rangeSource.startsWith('Assumption:') || c.tokenPrice.rangeSource.length > 0).toBe(true)
```

- [ ] **Step 2: Run** `npx vitest run tests/engine/conditions.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** `conditions.json` and `conditions.ts`.
- [ ] **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat(engine): condition catalogue with defaults and forecast ranges`.

---

### Task 5: Ledger and contracts

**Files:**
- Create: `src/engine/ledger.ts`, `src/engine/contracts.ts`
- Test: `tests/engine/ledger.test.ts`, `tests/engine/contracts.test.ts`

**Interfaces:**
- Consumes: `Flow`, `FlowKind` (Task 2); `DealView` (Task 3).
- Produces (`ledger.ts`):
  - `BalanceSheet { cash: number; receivables: number; debt: DebtInstrument[]; chipVintages: Vintage[];
    buildings: number; equityRaised: number; retainedEarnings: number }`
  - `DebtInstrument { id: string; lenderId: string; principal: number; ratePerQuarter: number; maturity: QuarterKey;
    recourse: 'recourse' | 'non-recourse' | 'unknown'; dealId?: string }`
  - `Vintage { quarter: QuarterKey; units: number; costUsd: number }`
  - `Ledger { sheets: Record<string, BalanceSheet>; flows: Flow[] }`
  - `post(l: Ledger, f: Flow): void` — moves cash from `from` to `to`; both ids must exist (throws otherwise).
  - `netFinancialAssets(l: Ledger): number` — sum over entities of cash + receivables − debt principal (+ the lender's
    matching loan asset), which must stay constant under `post`.
  - `checkInvariant(l: Ledger, before: number): string | null` (message if |after − before| > 1).
- Produces (`contracts.ts`):
  - `Obligation { dealId: string; payer: string; payee: string; quarter: QuarterKey; amountUsd: number; kind: FlowKind;
    label: string }`
  - `scheduleObligations(deals: DealView[], grid: Grid): Obligation[]` — only `hardMinimumUsd`; spread straight-line
    over quarters from `start` (or `announced` if no start) to `end` (or `start` + the term in `terms.maturity` if
    parseable, else 20 quarters, stated in `config/engine-params.json` as `defaultContractQuarters`); split equally
    across multiple payers/payees; `kind` from deal type (compute-lease → `compute-rent`, chip-purchase →
    `chip-purchase`, loan → `loan-draw` at start then `interest`/`principal`, equity → `equity` at start);
    cancelled/replaced deals (per `statusAsOf`) produce nothing after the status date. `label` = short canvas title
    ("Rents compute", "Buys GPUs", "GPU-backed loan", "Equity").

- [ ] **Step 1: Write failing tests**

```ts
const l = newLedger(['a', 'b']); l.sheets.a.cash = 100
const before = netFinancialAssets(l)
post(l, flow('a', 'b', 40)); expect(l.sheets.a.cash).toBe(60); expect(l.sheets.b.cash).toBe(40)
expect(checkInvariant(l, before)).toBeNull()
expect(() => post(l, flow('a', 'ghost', 1))).toThrow(/ghost/)
const obs = scheduleObligations([leaseDeal({ hardMinimumUsd: 8e9, start: '2027-01-01', end: '2028-12-31', ceilingUsd: 20e9 })], makeGrid())
expect(obs.length).toBe(8)
expect(obs.reduce((s, o) => s + o.amountUsd, 0)).toBeCloseTo(8e9, 0)                    // ceiling never scheduled
expect(obs[0]).toMatchObject({ quarter: '2027Q1', kind: 'compute-rent', label: 'Rents compute' })
expect(scheduleObligations([cancelled('2027-06-30', leaseDeal({ hardMinimumUsd: 8e9, start: '2027-01-01', end: '2028-12-31' }))], makeGrid())
  .every(o => o.quarter <= '2027Q2')).toBe(true)
```

- [ ] **Step 2: Run** `npx vitest run tests/engine/ledger.test.ts tests/engine/contracts.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** both modules.
- [ ] **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat(engine): double-entry ledger and deal obligation schedules`.

---

### Task 6: Initial state

**Files:**
- Create: `src/engine/init.ts`
- Test: `tests/engine/init.test.ts`

**Interfaces:**
- Consumes: `AsOfData` (Task 3), `Ledger`, `newLedger` (Task 5), `EngineParams` (Task 2).
- Produces:
  - `EngineState { grid: Grid; q: number /* current grid index */; ledger: Ledger; obligations: Obligation[];
    market: MarketState; expectations: Record<string, number> /* expected next-quarter AI demand growth per buyer */;
    pipeline: PipelineItem[]; active: Record<string, boolean> /* entity has entered the model */;
    defaulted: Record<string, boolean> }`
  - `MarketState { labShares: Record<string, number>; installedGpus: Vintage[]; backlogUnits: number;
    effectiveTokenPrice: number; gpuRental: number; gpuResale: number }`
  - `PipelineItem { owner: string; kind: 'gpus' | 'buildings'; units: number; costUsd: number; arrives: QuarterKey }`
  - `initState(data: AsOfData, params: EngineParams, grid: Grid, start: QuarterKey): EngineState`
- Rules: an entity is `active` from the first quarter with a known revenue or cash fact; non-filers modelled as
  aggregates (`ai-customers-*`, `sovereign-international`, `china-market`, `ai-startups`, `private-credit-other`,
  `banks`, `bond-market`) start active with zero balances and `modelled: true` outputs. Opening cash and debt = the
  as-of facts at the quarter before `start`; lab shares = revenue shares among active labs with revenue facts or
  series (equal shares among labs with no revenue data, flagged). Installed GPU base at start = cumulative NVIDIA Data
  Center revenue over the previous `gpuEconomicLifeQuarters` divided by `nvidiaAspUsd` (stated as a modelled estimate
  in the vintage's metadata).

- [ ] **Step 1: Write failing tests**

```ts
const s = initState(asOfView(build, '2026-11-26'), loadParams(), makeGrid(), '2026Q4')
expect(s.ledger.sheets.nvidia.cash).toBeCloseTo(asOfView(build, '2026-11-26').fact('nvidia', 'cash', '2026Q3')!.value, -6)
expect(s.active.coreweave).toBe(true)
const s23 = initState(asOfView(build, '2023-03-31'), loadParams(), makeGrid(), '2023Q1')
expect(s23.active.coreweave).toBe(false)                     // no CoreWeave facts were public in early 2023
expect(Object.values(s.market.labShares).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6)
expect(s.obligations.every(o => o.quarter >= '2026Q4')).toBe(true)
```

- [ ] **Step 2: Run** `npx vitest run tests/engine/init.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** `init.ts`.
- [ ] **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat(engine): initial state from as-of data`.

---

### Task 7: Demand layer

**Files:**
- Create: `src/engine/layers/demand.ts`
- Test: `tests/engine/demand.test.ts`

**Interfaces:**
- Consumes: `EngineState`, `Conditions`, `EngineParams`.
- Produces: `stepDemand(s: EngineState, c: Conditions, p: EngineParams): DemandOut` where
  `DemandOut { spendBySegment: Record<'consumer' | 'enterprise' | 'sovereign' | 'china' | 'physicalAi', number>;
  labRevenue: Record<string, number>; computeNeedUsd: Record<string, number> /* per lab */;
  physicalAiSpend: number; ceilingBound: boolean; flows: Flow[] }`.
- Rules (spec §8.2): quarterly spend = `aiSpend` condition / 4, adjusted by price elasticity
  (`spend = base × (price / basePrice)^(1 − ε)`, ε = `priceElasticity`); China share zeroed when
  `exportRegime` = closed (0) and scaled by the regime value otherwise; lab shares drift toward revenue-share leader at
  `labShareDrift` (deterministic in this phase; random leapfrogging arrives in phase 6); lab compute need = lab revenue
  × `computeCostShare`. Long-run ceiling: quarterly spend is capped at `labourSubstitution` × `aiAddressableWageBillUsd`
  / 4 (param with its source), and the cap binding emits no event but sets `ceilingBound: true` on `DemandOut`. Flows: customers → labs (`customer-spend`, label "Subscriptions & API").

- [ ] **Step 1: Write failing tests**

```ts
const out = stepDemand(state, conds({ aiSpend: 400e9, tokenPrice: 1, priceElasticity: 1 }), params)
expect(Object.values(out.spendBySegment).reduce((a, b) => a + b, 0)).toBeCloseTo(100e9, -6)   // per quarter
const cheaper = stepDemand(state, conds({ aiSpend: 400e9, tokenPrice: 0.5, priceElasticity: 1.5 }), params)
expect(total(cheaper)).toBeGreaterThan(total(out))                                         // ε > 1: cheaper → more spend
const inelastic = stepDemand(state, conds({ aiSpend: 400e9, tokenPrice: 0.5, priceElasticity: 0.5 }), params)
expect(total(inelastic)).toBeLessThan(total(out))
expect(stepDemand(state, conds({ exportRegime: 0 }), params).spendBySegment.china).toBe(0)
const capped = stepDemand(state, conds({ aiSpend: 1e15, labourSubstitution: 0.01 }), params)
expect(capped.ceilingBound).toBe(true)
expect(total(capped)).toBeLessThanOrEqual(0.01 * param(params, 'aiAddressableWageBillUsd') / 4 + 1)
expect(Object.values(out.labRevenue).reduce((a, b) => a + b, 0)).toBeCloseTo(total(out) - out.physicalAiSpend, -3)
```

- [ ] **Step 2–4:** run (FAIL), implement, run (PASS): `npx vitest run tests/engine/demand.test.ts`.
- [ ] **Step 5: Commit** `feat(engine): demand layer with price elasticity and lab shares`.

---

### Task 8: Clouds, chips and supply

**Files:**
- Create: `src/engine/layers/clouds.ts`, `src/engine/layers/chips.ts`
- Test: `tests/engine/clouds.test.ts`, `tests/engine/chips.test.ts`

**Interfaces:**
- Consumes: `EngineState`, `DemandOut` (Task 7), `Conditions`, `EngineParams`, obligations (Task 5).
- Produces:
  - `stepClouds(s, d: DemandOut, c, p): CloudsOut` with `CloudsOut { rentByCloud: Record<string, number>;
    aiCapexByCloud: Record<string, number>; chipBudgetByCloud: Record<string, number>; buildingsCapexByCloud:
    Record<string, number>; flows: Flow[] }`
  - `stepChips(s, cl: CloudsOut, c, p): ChipsOut` with `ChipsOut { ordersUnits: number; shippedUnits: number; replacementUnits: number;
    shortfallUnits: number; bindingConstraint: 'none' | 'cowos' | 'hbm' | 'power'; revenueByMaker: Record<string,
    number>; supplierRevenue: Record<'tsmc' | 'sk-hynix' | 'asml', number>; nvidia: Omit<NvidiaQuarter, 'quarter' |
    'netIncome' | 'eps'>; flows: Flow[] }`
- Rules:
  - Lab compute need is rented first from clouds holding that lab's contracts (scheduled obligations), remainder split
    by cloud capacity share. Flows labs → clouds (`compute-rent`, "Rents compute").
  - Cloud AI capex (spec §8.3, Sterman overshoot): `capex = max(contracted capacity need, expected demand ×
    overExtrapolation)` where expected demand growth updates by `expectationGain` toward observed growth each quarter;
    cash-funded clouds bounded by operating cash flow + cash; debt-funded clouds bounded by cash + available credit at
    `creditSpread` (loan draws as flows from `private-credit-other` or named lenders in their deals). Split into chip
    budget (`chipShareOfAiCapex`) and buildings (`buildings-capex`, arrives after `buildingLeadQuarters`).
  - Replacement demand (spec §8.2): each quarter, installed GPUs older than `gpuEconomicLifeQuarters` retire; clouds'
    chip budgets first replace retired units (counted in `replacementUnits` on `ChipsOut`), then add capacity.
  - Chip orders with bullwhip: `orders = expected shipments + bullwhipCorrectionRate × (target backlog − backlog)`,
    target backlog = `bullwhipInventoryWeeks` of expected shipments. Split NVIDIA vs custom (TPU, Trainium) vs AMD by
    `nvidiaShareOfAccelerators` and the custom-chip owners' own budgets.
  - Supply cap: `shipped = min(orders + backlog, cowosCap, hbmCap, powerCap)` where capacities come from supply
    params/series (CoWoS and HBM unit capacity per quarter as params with their source; power from `powerGw` ÷ per-unit
    power param). Unfilled orders go to backlog; `shortfallUnits` and `bindingConstraint` recorded; when binding,
    an event `supply-bound` with a reason line ("HBM memory limits shipments to N units").
  - NVIDIA revenue = shipped NVIDIA units × `nvidiaAspUsd` + Edge segment (simple trend from history, non-AI part) +
    physical AI spend share; Data Center split into Hyperscale vs AI Clouds/Industrial/Enterprise by buyer group.
    Supplier revenue: TSMC and SK Hynix receive cost-of-goods shares of chip revenue (params with sources), ASML a share
    of TSMC capex. Shipped units enter `pipeline` arriving after `gpuLeadQuarters`.
  - `customerFinancedShare` = share of NVIDIA revenue from buyers in which NVIDIA holds equity or has guarantees per
    `DealView`s known as of the run.

- [ ] **Step 1: Write failing tests**

```ts
// clouds
const cl = stepClouds(state, demandOut({ computeNeedUsd: { openai: 10e9 } }), conds({}), params)
expect(sum(cl.rentByCloud)).toBeCloseTo(10e9, -3)
expect(cl.rentByCloud.oracle).toBeGreaterThan(0)                         // OpenAI's Oracle contract is filled first
const capped = stepClouds(stateWithCash('coreweave', 0), demandOut({}), conds({ creditSpread: 30 }), params)
expect(capped.aiCapexByCloud.coreweave).toBe(0)                           // no cash, prohibitive credit
// chips
const tight = stepChips(state, cloudsOut({ chipBudget: 1e12 }), conds({}), params)
expect(tight.shippedUnits).toBeLessThanOrEqual(capacity(params))
expect(tight.shortfallUnits).toBeGreaterThan(0)
expect(tight.bindingConstraint).not.toBe('none')
expect(tight.ordersUnits).toBeCloseTo(tight.shippedUnits + tight.shortfallUnits - backlogChange(tight), 0)
const loose = stepChips(state, cloudsOut({ chipBudget: 1e9 }), conds({}), params)
expect(loose.shortfallUnits).toBe(0)
expect(loose.nvidia.dataCenter).toBeCloseTo(loose.nvidia.hyperscale + loose.nvidia.aiCloudsEnterprise, -3)
```

- [ ] **Step 2–4:** run (FAIL), implement, run (PASS):
  `npx vitest run tests/engine/clouds.test.ts tests/engine/chips.test.ts`.
- [ ] **Step 5: Commit** `feat(engine): cloud capex, bullwhip chip orders and supply limits`.

---

### Task 9: Finance layer — settlement, depreciation, simple defaults, Minsky labels

**Files:**
- Create: `src/engine/layers/finance.ts`
- Test: `tests/engine/finance.test.ts`

**Interfaces:**
- Consumes: `EngineState`, all layer outputs of the quarter, `Obligation[]`.
- Produces: `stepFinance(s: EngineState, flows: Flow[], p: EngineParams): FinanceOut` with
  `FinanceOut { entityQuarters: Record<string, EntityQuarter>; events: EngineEvent[]; flows: Flow[] }`.
- Rules (spec §8.1, §8.5 simple version): post all quarter flows to the ledger; pay scheduled obligations due this
  quarter; interest = principal × `ratePerQuarter` (rate parsed from `terms.rate` where possible, else risk-free +
  `creditSpread`); depreciation by vintage over `gpuAccountingLifeQuarters` (economic life tracked separately for the
  installed base); operating cost = revenue − gross profit for chip makers and a cost-ratio param for others.
  **Default test (simple):** an entity defaults when cash after obligations < 0 and it cannot draw new credit (credit
  available is a function of `creditSpread` and its Minsky label); on default, unpaid obligations are recorded as
  losses to payees (written down, not created as cash), the entity stops paying, an event `default` is emitted with a
  reason ("Cash ran out with $X due; credit at Y% was unavailable"). **Minsky label:** hedge if operating cash flow ≥
  interest + principal due; speculative if ≥ interest only; Ponzi otherwise; label changes emit `minsky-change` events.
  Ledger invariant checked after the quarter.

- [ ] **Step 1: Write failing tests**

```ts
const f = stepFinance(stateWith({ coreweave: { cash: 1e9, ocf: 0.2e9, due: { interest: 0.3e9, principal: 0 } } }), [], params)
expect(f.entityQuarters.coreweave.minsky).toBe('ponzi')
const g = stepFinance(stateWith({ coreweave: { cash: 0, ocf: 0, due: { interest: 0.5e9, principal: 2e9 } } }), [], paramsNoCredit)
expect(g.entityQuarters.coreweave.defaulted).toBe(true)
expect(g.events.find(e => e.kind === 'default')!.reason).toMatch(/cash ran out/i)
expect(invariantErrorsAfter(g)).toEqual([])                    // a default writes down; it does not create money
const h = stepFinance(stateWith({ microsoft: { cash: 50e9, ocf: 40e9, due: { interest: 1e9, principal: 2e9 } } }), [], params)
expect(h.entityQuarters.microsoft.minsky).toBe('hedge')
```

- [ ] **Step 2–4:** run (FAIL), implement, run (PASS): `npx vitest run tests/engine/finance.test.ts`.
- [ ] **Step 5: Commit** `feat(engine): settlement, depreciation, simple default test and Minsky labels`.

---

### Task 10: One-path runner

**Files:**
- Create: `src/engine/run.ts`
- Test: `tests/engine/run.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces: `EngineInput { build: BuildData; params: EngineParams; conditions?: Conditions /* default:
  buildConditions(asOfView(build, asOf), grid, asOf) */; asOf: string; start: QuarterKey; end?: QuarterKey;
  dealsKnownUntil?: string /* default asOf */ }` and
  `runOnePath(input: EngineInput): RunResult`. Quarters before `start` are filled from actuals (`modelled: false`) so
  the result spans the whole grid; quarters from `start` are simulated. New deals are not created in this phase (phase
  4); obligations come only from known deals. Deal knowledge rolls forward: at simulated quarter q the engine schedules
  deals with `announced <= min(last day of q, dealsKnownUntil)` (and status entries likewise), so a forecast
  (`dealsKnownUntil = asOf`) never sees an unannounced deal, while a conditional backtest can feed real later deals in
  as they became public.

- [ ] **Step 1: Write failing tests**

```ts
const r = runOnePath({ build, params: loadParams(), asOf: '2026-11-26', start: '2026Q4' })
expect(r.invariantErrors).toEqual([])
expect(r.nvidia.length).toBe(36)
expect(r.nvidia[makeGrid().idx('2026Q2')].revenue).toBeCloseTo(96.221e9, -6)        // history quarter = actual
expect(r.entities.nvidia[makeGrid().idx('2026Q2')].modelled).toBe(false)
expect(r.entities.nvidia[makeGrid().idx('2027Q1')].modelled).toBe(true)
expect(r.flows.every(f => f.label.length > 0 && f.amountUsd >= 0)).toBe(true)
expect(JSON.stringify(runOnePath(sameInput))).toBe(JSON.stringify(runOnePath(sameInput)))  // deterministic
const t0 = performance.now(); runOnePath(sameInput); expect(performance.now() - t0).toBeLessThan(50)
// no look-ahead: a 2024 run never schedules a 2026-announced deal
const r24 = runOnePath({ build, params: loadParams(), asOf: '2024-12-31', start: '2025Q1' })
expect(r24.flows.some(f => f.dealId === 'nvidia-openai-ohio-backstop')).toBe(false)
// rolling deal knowledge: with later deals allowed, the 2026 deal appears only from its announcement quarter
const rRoll = runOnePath({ build, params: loadParams(), asOf: '2024-12-31', start: '2025Q1', dealsKnownUntil: '2026-11-26' })
expect(rRoll.flows.filter(f => f.dealId === 'nvidia-openai-ohio-backstop').every(f => f.quarter >= '2026Q3')).toBe(true)
```

- [ ] **Step 2–4:** run (FAIL), implement, run (PASS): `npx vitest run tests/engine/run.test.ts`.
- [ ] **Step 5: Commit** `feat(engine): one-path runner`.

---

### Task 11: Backtest harness and benchmarks

**Files:**
- Create: `src/engine/backtest.ts`
- Test: `tests/engine/backtest.test.ts`

**Interfaces:**
- Consumes: `runOnePath`, `asOfView`, `BuildData`.
- Produces:
  - `BacktestTarget = 'nvidiaRevenue' | 'nvidiaDataCenter' | 'hyperscalerCapex' /* sum of the four cash-funded clouds */
    | 'anthropicRevenue'`
  - `BacktestRow { origin: QuarterKey; horizon: number /* quarters ahead, 1..8 */; target: BacktestTarget;
    quarter: QuarterKey; actual: number; model: number; naive: number; drift: number; ets: number }`
  - `BacktestReport { rows: BacktestRow[]; summary: Record<BacktestTarget, { modelMape: number; naiveMape: number;
    driftMape: number; etsMape: number; beatsAllBenchmarks: boolean; n: number }>; turningPoints: BacktestRow[];
    standard: 'point-only (ranges scored in phase 6)' }`
  - `rollingBacktest(build: BuildData, params: EngineParams, origins: QuarterKey[]): BacktestReport` — for each origin
    quarter O: `asOf` = the last day of O plus 45 days (when O's filings were public), run with `start` = O + 1,
    conditional backtest inputs: `conditions` = `buildConditions` at the latest build date (real later history for
    every condition) and `dealsKnownUntil` = the latest build date (real deals enter as they became public); facts
    for the initial state come from `asOf`. Compare horizons 1–8 against the latest-known actuals.
  - Benchmarks per target: naive (last value), drift (average change over the previous 4 quarters), ETS (simple
    exponential smoothing with trend, α and β fitted on data before the origin only).
  - Fiscal alignment: model quarters are calendar quarters; actuals come from facts already mapped to calendar
    quarters; consensus comparisons (fiscal years) use `fiscalYearSum(nvidiaQuarters, fy: number)` which sums the four
    calendar quarters whose midpoints fall in NVIDIA fiscal year `fy` (Feb–Jan).
- Default origins: every quarter 2023Q1–2026Q2.

- [ ] **Step 1: Write failing tests**

```ts
const rep = rollingBacktest(build, loadParams(), ['2024Q1', '2024Q2'])
expect(rep.rows.length).toBeGreaterThan(0)
expect(rep.rows.every(r => r.quarter > r.origin)).toBe(true)
expect(rep.rows.every(r => Number.isFinite(r.model) && Number.isFinite(r.naive))).toBe(true)
const naiveRow = rep.rows.find(r => r.target === 'nvidiaRevenue' && r.horizon === 1)!
expect(naiveRow.naive).toBeCloseTo(actualAt(build, 'nvidia', 'revenue', naiveRow.origin, asOfFor(naiveRow.origin)), -3) // naive uses only origin-known data
expect(ets([1, 2, 3, 4, 5], 2)).toEqual(expect.arrayContaining([expect.any(Number)]))
expect(fiscalYearSum(nvidiaQuarters2026(), 2027)).toBeCloseTo(sumOfCalendarQuarters(['2026Q1', '2026Q2', '2026Q3', '2026Q4']), -3)
```

- [ ] **Step 2–4:** run (FAIL), implement, run (PASS): `npx vitest run tests/engine/backtest.test.ts`.
- [ ] **Step 5: Commit** `feat(engine): rolling conditional backtest with naive, drift and ETS benchmarks`.

---

### Task 12: First calibration and baseline outputs

**Files:**
- Create: `scripts/engine/calibrate.ts`, `scripts/engine/run-baseline.ts`
- Modify: `config/engine-params.json` (calibrated values + `source: "calibrated 2026-11-27, fit 2023Q1–2025Q4"`),
  `package.json` (scripts `engine:calibrate`, `engine:baseline`), `scripts/data/check-build-fresh.ts` (include the new
  outputs), `.github/workflows/pages.yml` (run `engine:baseline` before the freshness check)
- Test: `tests/engine/calibrate.test.ts`

**Interfaces:**
- Produces: `calibrate(build, params, keys: string[], grid: Record<string, number[]>): { best: EngineParams;
  fitMape: number; holdoutMape: number }` — exhaustive grid search over the listed keys only (the ones marked
  calibrate in Task 2), fitting on origins 2023Q1–2025Q2 with targets in 2023–2025, scoring the held-out 2026
  quarters separately. `run-baseline.ts` writes `data/build/engine-baseline.json` (`RunResult` for `asOf` = latest
  build date, `start` = first quarter without NVIDIA actuals) and `data/build/backtest.json` (`BacktestReport` plus the
  calibration fit/holdout MAPE).
- The calibrated values must stay inside each param's `min`/`max`; the report must show both fit and holdout errors.
  If the holdout error is more than 2× the fit error, the baseline file carries `overfitWarning: true`.

- [ ] **Step 1: Write failing test**

```ts
const res = calibrate(build, loadParams(), ['overExtrapolation'], { overExtrapolation: [0.8, 1.0, 1.2] })
expect([0.8, 1.0, 1.2]).toContain(param(res.best, 'overExtrapolation'))
expect(Number.isFinite(res.fitMape) && Number.isFinite(res.holdoutMape)).toBe(true)
```

- [ ] **Step 2–4:** run (FAIL), implement, run (PASS): `npx vitest run tests/engine/calibrate.test.ts`.
- [ ] **Step 5: Run** `npm run engine:calibrate` (record the chosen values and fit/holdout MAPE in the commit message
  body), then `npm run engine:baseline && npm run data:check-fresh` — expect exit 0.
- [ ] **Step 6: Commit** `feat(engine): first calibration and baseline run outputs` (include `data/build/`).

---

### Task 13: Explorer "Engine check" section (phase checkpoint)

**Files:**
- Create: `src/explorer/engine-section.ts`
- Modify: `src/explorer/main.ts`, `src/explorer/prepare.ts` (include the two new outputs, trimmed), `src/explorer/style.css`
- Test: `tests/engine-section.test.ts`

**Interfaces:**
- Consumes: `data/build/engine-baseline.json`, `data/build/backtest.json`.
- Produces: `engineSummary(baseline: RunResult, backtest: BacktestReport): EngineSummary` (pure; tested) with
  `EngineSummary { nvidiaFy: { fy: number; model: number; consensus?: number }[]; capex: { year: number; model: number;
  guidance?: number }[]; backtest: { target: BacktestTarget; modelMape: number; bestBenchmark: string;
  beatsAllBenchmarks: boolean }[]; supplyBoundQuarters: QuarterKey[]; events: EngineEvent[]; overfitWarning: boolean }`.
- Page section (same locked style, below the data sections), labelled "Early version: simple rules, not yet
  validated": (1) NVIDIA revenue by fiscal year, model vs consensus (FY2027–FY2029) as a small line chart + table;
  (2) cash-funded hyperscaler capex by calendar year, model vs guidance; (3) backtest table: per target, model error vs
  naive/drift/ETS, a pass/fail mark, and a model-vs-actual chart for NVIDIA revenue; (4) events list from the baseline
  run (supply limits, Minsky changes, defaults) with their reason lines; (5) a note that company behaviour is simple
  rules until phase 4, and credit contagion arrives in phase 5.

- [ ] **Step 1: Write failing test**

```ts
const s = engineSummary(baselineFixture, backtestFixture)
expect(s.nvidiaFy.map(x => x.fy)).toEqual([2027, 2028, 2029])
expect(s.nvidiaFy[1].consensus).toBeCloseTo(726.23e9, -7)          // Yahoo FY2028 average from series.csv
expect(s.backtest.every(b => typeof b.beatsAllBenchmarks === 'boolean')).toBe(true)
```

- [ ] **Step 2–4:** run (FAIL), implement, run (PASS): `npx vitest run tests/engine-section.test.ts`.
- [ ] **Step 5: Verify visually:** `npm run build && npx vite preview --port 4173`; Playwright screenshots at 1440×900
  and 390 wide (scratchpad); no horizontal scroll at 390; describe them in the task report.
- [ ] **Step 6: Commit** `feat(explorer): engine check section with baseline and backtest`.

---

## Out of scope for this plan (later phases)

- Strategic decisions (game theory), new deals created by the model, renegotiation, decision view — phase 4.
- Credit contagion (clearing, guarantees as payments, fire sales, lender runs, reflexivity) — phase 5. The simple
  default test here writes down unpaid obligations but does not propagate them further.
- Range of outcomes, random lab leapfrogging, ensemble, sensitivity, CRPS and 80%-coverage scoring — phase 6.
- Canvas UI — phase 3 (consumes `RunResult`).
- Full power forecast from ISO queues and EIA (needs an EIA API key and allowlist work) — the power condition here uses
  published forecasts; the queue-based model is a phase 7 data task.
- Remaining phase 1 follow-ups not named in Task 1 stay in `docs/superpowers/plans/2026-11-26-phase1-followups.md`.
