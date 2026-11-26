# Phase 1 — Data Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the raw SEC data, the three Chrome source captures and public market series into clean, validated,
versioned JSON that later phases load, verify the flagged 2026 figures, and publish a simple data explorer page on
GitHub Pages as the phase checkpoint.

**Architecture:** A TypeScript project with pure, tested data functions in `src/data/` and thin scripts in
`scripts/data/` that fetch and build. Every data point carries its source, verification status and the date it became
public (`asKnownAt`), so the phase 7 backtest can use only information available at each date. Build outputs go to
`data/build/*.json`; a small Vite page renders them.

**Tech Stack:** Node 22, TypeScript ^5.6, zod ^3.23 (schemas), vitest ^2.1 (tests), tsx ^4.19 (run scripts),
vite ^5.4 (explorer page), GitHub Actions + GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-26-ai-demand-model-design.md` (§4 constraints, §7 players, §11 deal
database, §12 data pipeline, §15 phase 1, §16 data gaps). Read it first.

This is plan 1 of 7. Phases 2–7 (§15) each get their own plan once the previous phase is done.

## Global Constraints

- Public data only. Never estimate a number in data files; write it as missing.
- TypeScript only. No Python anywhere in the build, scripts or app (the `docs/mockups/*.py` generators are reference
  only and are not part of the build).
- Every data point carries: `source` (URL, retrieved date) and `status` in `primary-filing | primary-company |
  secondary | unverified`, plus `asKnownAt` (ISO date it became public).
- Deal value fields stay separate: `hardMinimumUsd`, `ceilingUsd`, `conditionalUsd`, `estimateUsd`. There is no total
  field, and no code sums across these fields.
- Never mix data providers within one series (CDS: ICE vs S&P Global MI vs LSEG are separate series; GPU rental:
  SemiAnalysis reserved vs Silicon Data spot vs Ornn are separate series).
- All money values stored in USD; non-USD values keep `originalCurrency`, `originalValue` and `fxRate`.
- SEC requests send `User-Agent: AI-Demand-Model research contact@example.com` and stay under 10 requests/second.
- The cloud environment's network allows: data.sec.gov, www.sec.gov, efts.sec.gov, fred.stlouisfed.org,
  api.stlouisfed.org, api.eia.gov, epoch.ai, investor.nvidia.com, www.nber.org, www.imf.org, www.bis.org, arxiv.org,
  www.federalreserve.gov, www.bankofengland.co.uk, www.census.gov, plus package registries. Do not depend on other
  hosts in automated scripts.
- Explorer page: light theme, Geist / Geist Mono, layer colours from the spec §6 (money `#c9683a`, labs `#6b5bb8`,
  clouds `#b2557d`, chips `#3d8a57`, supply `#4a72ad`).

## Review Focus

1. **Restated figures.** A later filing revises an earlier quarter. Expect both versions kept, and an as-of lookup to
   return the version public at the asked date. (Test in Task 3.)
2. **Odd fiscal calendars.** NVIDIA (late-January year end, 14-week Q4 in FY27), Oracle (May year end), Broadcom,
   Marvell, Micron. Expect each quarter to land in exactly one calendar quarter and 14-week quarters to be flagged.
   (Tests in Tasks 1 and 3.)
3. **Missing quarters.** A company that IPO'd mid-history (CoreWeave, March 2025) or skipped a period. Expect a listed
   gap, never a zero. (Test in Task 6.)
4. **Foreign currency.** TSMC reports in TWD, SK Hynix in KRW, ASML in EUR. Expect USD conversion with the original kept,
   and a rejected record if currency is missing. (Test in Task 4.)
5. **Mixed providers or value types.** A CDS series that mixes ICE and S&P quotes, or code that adds a deal's ceiling
   to its hard minimum. Expect the loader to throw. (Tests in Tasks 4 and 5.)

---

## File structure

```
package.json, tsconfig.json, vitest.config.ts, vite.config.ts, .gitignore
config/entities.json          every player: id, name, layer, group, kind, ticker/cik
config/sec-metrics.json       metric -> ordered XBRL tags per taxonomy
config/fred-series.json       FRED series ids and descriptions
src/data/schema.ts            zod schemas + TS types (single source of truth)
src/data/quarters.ts          calendar-quarter assignment, quarter arithmetic
src/data/xbrl.ts              XBRL company-facts -> quarterly facts (pure)
src/data/csv.ts               CSV parsing for manual files and FRED (pure)
src/data/series.ts            series assembly + provider checks (pure)
src/data/deals.ts             deal loading, cross-checks, safe sums (pure)
src/data/coverage.ts          gap / coverage report (pure)
scripts/data/http.ts          rate-limited fetch with SEC user agent and retries
scripts/data/fetch-sec.ts     download company facts for entities with a CIK
scripts/data/fetch-fred.ts    download FRED CSVs
scripts/data/build-all.ts     validate everything, write data/build/*.json
data/manual/financials.csv    quarterly figures for non-XBRL filers and NVIDIA segments
data/manual/series.csv        CDS, GPU rental, resale, consensus, guidance points
data/deals/deals.json         structured deal database
data/verification/2026-11-verification.md  verification log
data/build/                   generated: entities, financials, series, deals, coverage (committed)
src/explorer/main.ts, index.html, src/explorer/style.css   data explorer page
.github/workflows/pages.yml   build + deploy explorer
tests/                        mirrors src/data/*, fixtures in tests/fixtures/
```

---

### Task 1: Project scaffold and shared schema

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `src/data/schema.ts`,
  `src/data/quarters.ts`
- Test: `tests/schema.test.ts`, `tests/quarters.test.ts`

**Interfaces:**
- Produces (all exported from `src/data/schema.ts`, each as a zod schema `XSchema` plus type `X`):
  - `VerificationStatus = 'primary-filing' | 'primary-company' | 'secondary' | 'unverified'`
  - `SourceRef { url: string; title?: string; retrieved: string /* YYYY-MM-DD */; status: VerificationStatus }`
  - `Layer = 'money' | 'labs' | 'financing' | 'cloud' | 'chips' | 'supply'`
  - `EntityKind = 'public-company' | 'private-company' | 'spv' | 'lender' | 'aggregate' | 'government'`
  - `Entity { id: string /* kebab-case */; name: string; layer: Layer; group?: string; kind: EntityKind;
    ticker?: string; cik?: string /* 10 digits */; xbrl: boolean; currency: 'USD'|'TWD'|'KRW'|'EUR' }`
  - `QuarterKey` = string matching `/^\d{4}Q[1-4]$/`
  - `Metric = 'revenue' | 'capex' | 'operatingCashFlow' | 'cash' | 'longTermDebt' | 'netIncome' | 'epsDiluted' |
    'accountsReceivable' | 'grossProfit' | 'segmentRevenue'`
  - `FinancialFact { entityId; metric: Metric; segment?: string; quarter: QuarterKey; periodStart: string;
    periodEnd: string; weeks: number; value: number /* USD, or USD/share for eps */; originalCurrency?: string;
    originalValue?: number; fxRate?: number; derived: boolean; asKnownAt: string; form?: string; source: SourceRef }`
  - `SeriesPoint { date: string; value: number; asKnownAt?: string }`
  - `Series { id: string; name: string; unit: string; provider: string;
    kind: 'condition'|'indicator'|'consensus'|'guidance'; source: SourceRef; points: SeriesPoint[] }`
  - `DealType = 'compute-lease'|'chip-purchase'|'equity'|'loan'|'spv-financing'|'capacity-guarantee'|'warrants'|
    'jv'|'buyer-of-last-resort'|'other'`
  - `DealStatus = 'announced'|'active'|'expanded'|'delayed'|'renegotiated'|'cancelled'|'replaced'|'completed'`
  - `Deal { id; name; payers: string[]; payees: string[]; guarantors: string[]; vehicle?: string; types: DealType[];
    announced: string; signed?: string; start?: string; end?: string;
    values: { hardMinimumUsd?: number; ceilingUsd?: number; conditionalUsd?: number; estimateUsd?: number };
    terms: { rate?: string; maturity?: string; recourse: 'recourse'|'non-recourse'|'unknown'; collateral?: string;
      takeOrPay: 'yes'|'no'|'unknown'; hellOrHighWater: 'yes'|'no'|'unknown'; terminationRights?: string;
      exclusivity?: string; notes?: string };
    statusHistory: { date: string; status: DealStatus; note?: string }[]; sources: SourceRef[] }`
    — `.strict()` so unknown keys (e.g. `totalUsd`) are rejected.
- Produces (`src/data/quarters.ts`):
  - `calendarQuarterFor(periodStart: string, periodEnd: string): QuarterKey` — the calendar quarter containing the
    period's midpoint.
  - `weeksBetween(periodStart: string, periodEnd: string): number` — rounded to whole weeks.
  - `addQuarters(q: QuarterKey, n: number): QuarterKey`, `quarterRange(from: QuarterKey, to: QuarterKey): QuarterKey[]`

- [ ] **Step 1: Scaffold.** `npm init`, add dev dependencies at the versions in the header, scripts
  `"test": "vitest run"`, `"data:build": "tsx scripts/data/build-all.ts"`, `"dev": "vite"`, `"build": "vite build"`.
  `tsconfig` strict, `module` and `moduleResolution` `bundler`, `target` ES2022. `.gitignore`: `node_modules`, `dist`.
- [ ] **Step 2: Write failing tests**

```ts
// tests/quarters.test.ts
expect(calendarQuarterFor('2026-07-27', '2026-10-25')).toBe('2026Q3') // NVIDIA Q3 FY27
expect(calendarQuarterFor('2026-06-01', '2026-08-31')).toBe('2026Q3') // Oracle Q1 FY27
expect(calendarQuarterFor('2026-10-26', '2027-01-31')).toBe('2026Q4') // NVIDIA 14-week Q4 FY27
expect(weeksBetween('2026-10-26', '2027-01-31')).toBe(14)
expect(addQuarters('2026Q4', 1)).toBe('2027Q1')
expect(quarterRange('2026Q3', '2027Q1')).toEqual(['2026Q3', '2026Q4', '2027Q1'])
// tests/schema.test.ts
expect(DealSchema.safeParse({ ...validDeal, totalUsd: 5 }).success).toBe(false)
expect(SourceRefSchema.safeParse({ url: 'https://x', retrieved: '2026-11-25', status: 'rumour' }).success).toBe(false)
expect(FinancialFactSchema.safeParse({ ...validFact, quarter: '2026Q5' }).success).toBe(false)
```

- [ ] **Step 3: Run** `npm test` — expect FAIL (modules missing).
- [ ] **Step 4: Implement** `src/data/schema.ts` and `src/data/quarters.ts` per the interfaces above.
- [ ] **Step 5: Run** `npm test` — expect PASS.
- [ ] **Step 6: Commit** `feat: scaffold TypeScript project and shared data schema`.

---

### Task 2: Entity registry and SEC fetch

**Files:**
- Create: `config/entities.json`, `scripts/data/http.ts`, `scripts/data/fetch-sec.ts`
- Test: `tests/entities.test.ts`

**Interfaces:**
- Consumes: `EntitySchema` (Task 1).
- Produces: `config/entities.json` (array of `Entity`); `loadEntities(path?: string): Entity[]` in
  `src/data/schema.ts` (validates, throws on duplicate ids); `fetchWithPolicy(url: string): Promise<Response>` in
  `scripts/data/http.ts` (SEC user agent, ≤10 req/s, 3 retries with backoff); `fetch-sec.ts` writes
  `data/raw/sec/<TICKER>_companyfacts.json` for every entity with `xbrl: true`.

Entity ids later tasks rely on (add others the deal file needs, following the same kebab-case rule):
`nvidia, microsoft, alphabet, amazon, meta, oracle, coreweave, nebius, lambda, openai, anthropic, spacex` (includes
xAI), `softbank, amd, broadcom, marvell, micron, intel, tsmc, sk-hynix, samsung, asml, cerebras, sb-energy, vantage,
related-digital, crusoe, blue-owl, blackstone, apollo, pimco, magnetar, valor, goldman-sachs, morgan-stanley, mufg,
jpmorgan, mgx, humain, g42, spv-coreweave-ddtl, spv-saturn-funding-trust, spv-xai-colossus2, spv-hyperion-beignet,
spv-meta-el-paso, ai-customers-consumer, ai-customers-enterprise, sovereign-international, china-market, ai-startups,
venture-capital, private-credit-other, banks, bond-market, insurers-annuities, physical-ai-buyers`.
`xbrl: true` only for: nvidia, microsoft, alphabet, amazon, meta, oracle, coreweave, amd, broadcom, marvell, micron,
intel. (TSMC, Nebius, ASML, SK Hynix, Samsung are `xbrl: false`: TSMC files annual 20-F in TWD, Nebius files 6-K,
ASML's XBRL is annual only, SK Hynix and Samsung are not SEC filers.) Layers and groups follow spec §7; cash-funded
group = microsoft, alphabet, amazon, meta; debt-funded group = oracle, coreweave, nebius, lambda.

- [ ] **Step 1: Write failing test**

```ts
const e = loadEntities()
expect(new Set(e.map(x => x.id)).size).toBe(e.length)
expect(e.find(x => x.id === 'nvidia')).toMatchObject({ layer: 'chips', ticker: 'NVDA', cik: '0001045810', xbrl: true })
expect(e.find(x => x.id === 'tsmc')).toMatchObject({ xbrl: false, currency: 'TWD' })
expect(e.filter(x => x.group === 'debt-funded').map(x => x.id).sort())
  .toEqual(['coreweave', 'lambda', 'nebius', 'oracle'])
expect(() => loadEntities('tests/fixtures/entities-duplicate.json')).toThrow(/duplicate/i)
```

- [ ] **Step 2: Run** `npx vitest run tests/entities.test.ts` — expect FAIL.
- [ ] **Step 3: Write** `config/entities.json` and `loadEntities`; write `http.ts` and `fetch-sec.ts` (CIKs from
  `data/raw/sec/company_tickers.json`, already in the repo).
- [ ] **Step 4: Run** the test — expect PASS. Then run `npx tsx scripts/data/fetch-sec.ts` — expect one
  `_companyfacts.json` per `xbrl: true` entity and a summary line per file with byte size; INTC is new.
- [ ] **Step 5: Commit** `feat: entity registry and SEC company-facts fetch`.

---

### Task 3: XBRL to quarterly financials (with vintages)

**Files:**
- Create: `config/sec-metrics.json`, `src/data/xbrl.ts`, `tests/fixtures/xbrl-mini.json`
- Test: `tests/xbrl.test.ts`

**Interfaces:**
- Consumes: `FinancialFact`, `calendarQuarterFor`, `weeksBetween` (Task 1); `Entity` (Task 2).
- Produces:
  - `config/sec-metrics.json`: `{ [metric in Metric]: { [taxonomy: string]: string[] /* tags, in priority order */ } }`.
    Starting tags (from a survey of the downloaded files): revenue `Revenues`,
    `RevenueFromContractWithCustomerExcludingAssessedTax`; capex `PaymentsToAcquirePropertyPlantAndEquipment`,
    `PaymentsToAcquireProductiveAssets`; operatingCashFlow `NetCashProvidedByUsedInOperatingActivities`; cash
    `CashAndCashEquivalentsAtCarryingValue`; longTermDebt `LongTermDebt`, `LongTermDebtNoncurrent`; netIncome
    `NetIncomeLoss`; epsDiluted `EarningsPerShareDiluted`; accountsReceivable `AccountsReceivableNetCurrent`;
    grossProfit `GrossProfit`. Taxonomy key `us-gaap`.
  - `extractQuarterly(companyFacts: unknown, entity: Entity, metricMap: MetricMap): FinancialFact[]`
  - `valueAsOf(facts: FinancialFact[], entityId: string, metric: Metric, quarter: QuarterKey, asOf: string):
    FinancialFact | undefined` — the latest-filed version with `asKnownAt <= asOf`.

Rules the implementer cannot infer:
- Only facts from forms `10-Q`, `10-K`, `10-Q/A`, `10-K/A`.
- Flow metrics (revenue, capex, operatingCashFlow, netIncome, grossProfit): use a ~3-month duration fact when present;
  otherwise de-cumulate year-to-date facts within the same fiscal year (Q2 = 6-month − 3-month, Q3 = 9-month − 6-month,
  Q4 = annual − 9-month), set `derived: true`, and set `asKnownAt` to the later filing date of the two facts used.
  epsDiluted is never de-cumulated (skip if no 3-month fact).
- Stock metrics (cash, longTermDebt, accountsReceivable): instant facts; quarter from the instant date's calendar
  quarter; `periodStart = periodEnd = instant`, `weeks = 0`.
- For each metric, pick the highest-priority tag that has a value for that period.
- Keep every filing version of a period (restatements produce extra facts with later `asKnownAt`); de-duplicate exact
  repeats (same period, value and filing date).
- `source.url` = `https://www.sec.gov/Archives/edgar/data/<cik>/<accn without dashes>/`, `status: 'primary-filing'`.

- [ ] **Step 1: Write the fixture** `tests/fixtures/xbrl-mini.json` in SEC company-facts shape for one company with
  fiscal year 2026-01-01..2026-12-31: revenue 3-month Q1 = 100 (10-Q filed 2026-04-30); 6-month = 250 (10-Q filed
  2026-07-30); 9-month = 420 (10-Q filed 2026-10-30); annual = 600 (10-K filed 2027-02-15); plus a restated Q1
  3-month = 110 in the 10-K; cash instants 50 at 2026-03-31 and 60 at 2026-06-30; one fact from form `8-K` (must be
  ignored).
- [ ] **Step 2: Write failing tests**

```ts
const facts = extractQuarterly(fixture, entity, metricMap)
const rev = (q: string) => facts.filter(f => f.metric === 'revenue' && f.quarter === q)
expect(rev('2026Q2')[0]).toMatchObject({ value: 150, derived: true, asKnownAt: '2026-07-30' })
expect(rev('2026Q3')[0]).toMatchObject({ value: 170, derived: true })
expect(rev('2026Q4')[0]).toMatchObject({ value: 180, derived: true, asKnownAt: '2027-02-15' })
expect(rev('2026Q1').map(f => f.value).sort()).toEqual([100, 110])             // both vintages kept
expect(valueAsOf(facts, entity.id, 'revenue', '2026Q1', '2026-12-31')!.value).toBe(100)
expect(valueAsOf(facts, entity.id, 'revenue', '2026Q1', '2027-03-01')!.value).toBe(110)
expect(facts.find(f => f.metric === 'cash' && f.quarter === '2026Q2')).toMatchObject({ value: 60, weeks: 0 })
expect(facts.some(f => f.form === '8-K')).toBe(false)
// real-data spot check (file in repo):
const nv = extractQuarterly(readJson('data/raw/sec/NVDA_companyfacts.json'), nvidia, metricMap)
expect(valueAsOf(nv, 'nvidia', 'revenue', '2026Q2', '2026-11-26')!.value).toBe(96_221_000_000)
```

- [ ] **Step 3: Run** `npx vitest run tests/xbrl.test.ts` — expect FAIL.
- [ ] **Step 4: Implement** `extractQuarterly` and `valueAsOf` in `src/data/xbrl.ts`.
- [ ] **Step 5: Run** — expect PASS.
- [ ] **Step 6: Commit** `feat: quarterly financials from XBRL with restatement vintages`.

---

### Task 4: Manual files and market series (FRED, CDS, GPU prices, consensus, guidance)

**Files:**
- Create: `src/data/csv.ts`, `src/data/series.ts`, `config/fred-series.json`, `scripts/data/fetch-fred.ts`,
  `data/manual/financials.csv`, `data/manual/series.csv`, `data/raw/fred/` (CSV per series)
- Test: `tests/series.test.ts`, `tests/manual-financials.test.ts`

**Interfaces:**
- Consumes: `Series`, `FinancialFact`, `SourceRef` (Task 1); `Entity` (Task 2).
- Produces:
  - `parseCsv(text: string): Record<string, string>[]`
  - `loadManualFinancials(csvText: string, entities: Entity[], fx: FxTable): FinancialFact[]`.
    CSV columns: `entity_id, metric, segment, period_start, period_end, value, currency, as_known_at, source_url,
    source_title, retrieved, status`. Non-USD rows are converted with `fx`; missing `currency` throws.
  - `FxTable = Record<'TWD'|'KRW'|'EUR', SeriesPoint[]>` built from FRED `DEXTAUS` (TWD per USD), `DEXKOUS` (KRW per
    USD), `DEXUSEU` (USD per EUR); conversion uses the average of daily rates within the period (point date for
    instants).
  - `buildSeries(rows: Record<string,string>[]): Series[]` from `data/manual/series.csv` with columns
    `series_id, name, unit, provider, kind, date, value, as_known_at, source_url, source_title, retrieved, status`;
    throws if one `series_id` has more than one `provider`.
  - `fredToSeries(id: string, csvText: string, meta: { name: string; unit: string; kind: Series['kind'] }): Series`
    (`provider: 'FRED'`, skips `.` missing values).
- `config/fred-series.json` ids: `DGS10`, `SOFR`, `DFF`, `BAMLH0A0HYM2` (US high-yield OAS), `BAMLC0A0CM` (US IG OAS),
  `VIXCLS`, `SP500`, `RAMPAIALL` (Ramp AI Index), `DEXTAUS`, `DEXKOUS`, `DEXUSEU`. Fetch from
  `https://fred.stlouisfed.org/graph/fredgraph.csv?id=<ID>` (no key needed).
- Transcribe into `data/manual/series.csv`, from `data/sources/2026-11-25-chrome-prompt3-credit-prices.md` and
  `...prompt1-verification.md`: CDS points (one `series_id` per company × provider, e.g. `cds5y-oracle-spgmi`,
  `cds5y-oracle-ice`, `cds5y-coreweave-spgmi`), GPU rental points (`gpu-rent-h100-reserved-semianalysis`,
  `gpu-rent-h100-spot-silicondata`, `gpu-rent-*-ornn`), used-GPU values, NVIDIA consensus (`consensus-nvda-rev-fy2027`
  etc., provider `Yahoo` or `MarketWatch` kept separate), capex guidance (`guidance-capex-microsoft-cy2026` etc.).
  Status column copies the capture's primary/secondary label; rows the capture marks as unverified stay `unverified`.
- Transcribe into `data/manual/financials.csv`: NVIDIA Data Center segment revenue for Q3 FY27 (Hyperscale
  $60,136M; AI Clouds, Industrial & Enterprise $47,474M; source = NVIDIA revenue trend PDF, `primary-company`) and the
  latest available quarters for TSMC, Nebius and ASML from their 6-K / 20-F filings on sec.gov where the figure is
  stated (TSMC also files monthly revenue on 6-K). SK Hynix and anything not found stay as gaps, which the coverage
  report (Task 6) lists. Condition *forecast ranges* are built in phase 2 from these series; phase 1 stores history,
  consensus and guidance only.

- [ ] **Step 1: Write failing tests**

```ts
// tests/series.test.ts
expect(() => buildSeries([row({ series_id: 'cds5y-oracle', provider: 'ICE' }),
                          row({ series_id: 'cds5y-oracle', provider: 'S&P Global MI' })])).toThrow(/provider/i)
const s = fredToSeries('DGS10', 'observation_date,DGS10\n2026-11-20,4.1\n2026-11-21,.\n', meta)
expect(s.points).toEqual([{ date: '2026-11-20', value: 4.1 }])
// tests/manual-financials.test.ts
const fx = { TWD: [{ date: '2026-07-15', value: 32 }], KRW: [], EUR: [] }
const [f] = loadManualFinancials(csv('tsmc,revenue,,2026-07-01,2026-09-30,3200000000000,TWD,...'), entities, fx)
expect(f).toMatchObject({ value: 100_000_000_000, originalCurrency: 'TWD', originalValue: 3_200_000_000_000, fxRate: 32 })
expect(() => loadManualFinancials(csv('tsmc,revenue,,2026-07-01,2026-09-30,1,,...'), entities, fx)).toThrow(/currency/i)
expect(() => loadManualFinancials(csv('not-an-entity,revenue,...'), entities, fx)).toThrow(/entity/i)
```

- [ ] **Step 2: Run** `npx vitest run tests/series.test.ts tests/manual-financials.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** `csv.ts`, `series.ts`, `loadManualFinancials`, `fetch-fred.ts`.
- [ ] **Step 4: Run** tests — expect PASS. Run `npx tsx scripts/data/fetch-fred.ts` — expect 11 CSVs in
  `data/raw/fred/`, and `RAMPAIALL` ending at or after `2026-10-01`.
- [ ] **Step 5: Transcribe** the two manual CSVs; run `npm test` — still PASS.
- [ ] **Step 6: Commit** `feat: market series, FX conversion and manual data files`.

---

### Task 5: Structured deal database

**Files:**
- Create: `src/data/deals.ts`, `data/deals/deals.json`
- Test: `tests/deals.test.ts`

**Interfaces:**
- Consumes: `DealSchema` (Task 1), `loadEntities` (Task 2).
- Produces:
  - `loadDeals(path?: string, entities?: Entity[]): Deal[]` — validates each deal, checks every id in `payers`,
    `payees`, `guarantors`, `vehicle` exists in entities, checks ids are unique; throws naming the deal on failure.
  - `sumValues(deals: Deal[], field: keyof Deal['values']): number` — sums exactly one value field; skips deals
    without it.
  - `dealsTouching(deals: Deal[], entityId: string): Deal[]`.

Content: one deal record per row of `data/sources/2026-11-25-chrome-prompt2-deals.md`, split into separate records
where terms differ by tranche (e.g., each CoreWeave DDTL facility; OpenAI–CoreWeave's three tranches as one record with
`statusHistory` entries is acceptable). Value mapping: signed fixed amounts → `hardMinimumUsd`; "up to" / options →
`ceilingUsd`; amounts contingent on events (Amazon's $35B, Meta–Nebius's $15B) → `conditionalUsd`; anonymous-source or
"reported" figures → `estimateUsd`. Unknown terms are written `'unknown'` or omitted, never guessed. Sources keep their
URLs and status from the capture.

- [ ] **Step 1: Write failing tests**

```ts
const deals = loadDeals()
expect(deals.length).toBeGreaterThanOrEqual(35)
expect(deals.every(d => d.sources.length >= 1)).toBe(true)
const ohio = deals.find(d => d.id === 'nvidia-openai-ohio-backstop')!
expect(ohio).toMatchObject({ guarantors: ['nvidia'], types: ['capacity-guarantee', 'equity'] })
expect(ohio.values.ceilingUsd).toBe(105_000_000_000)
const ddtl4 = deals.find(d => d.id === 'coreweave-ddtl-4')!
expect(ddtl4.terms.recourse).toBe('non-recourse')
expect(sumValues([dealWith({ hardMinimumUsd: 10, ceilingUsd: 30 })], 'hardMinimumUsd')).toBe(10)
expect(() => loadDeals('tests/fixtures/deal-unknown-party.json')).toThrow(/unknown entity.*not-a-company/i)
```

- [ ] **Step 2: Run** `npx vitest run tests/deals.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** `deals.ts`; transcribe `data/deals/deals.json`, adding entities to
  `config/entities.json` where a deal needs one.
- [ ] **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat: structured deal database with entity cross-checks`.

---

### Task 6: Build pipeline and coverage report

**Files:**
- Create: `src/data/coverage.ts`, `scripts/data/build-all.ts`, `data/build/` outputs
- Test: `tests/coverage.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–5.
- Produces:
  - `coverageReport(entities: Entity[], facts: FinancialFact[], from: QuarterKey, to: QuarterKey): CoverageReport`
    where `CoverageReport = { entityId: string; metric: Metric; firstQuarter?: QuarterKey; lastQuarter?: QuarterKey;
    gaps: QuarterKey[]; unverifiedCount: number }[]` — gaps are quarters between first and last with no fact; quarters
    before a company's first fact are not gaps.
  - `build-all.ts` writes `data/build/entities.json`, `financials.json` (facts for 2022Q1..latest), `series.json`
    (FRED + manual), `deals.json`, `coverage.json`, and `manifest.json` `{ builtAt, counts, unverifiedCounts }`;
    exits non-zero on any validation error.

- [ ] **Step 1: Write failing test**

```ts
const r = coverageReport([acme], [fact('acme', 'revenue', '2025Q1'), fact('acme', 'revenue', '2025Q3')],
                         '2024Q1', '2025Q4')
expect(r.find(x => x.metric === 'revenue')).toMatchObject({ firstQuarter: '2025Q1', lastQuarter: '2025Q3',
  gaps: ['2025Q2'] })
// no zero-filling: a gap is reported, not a value
expect(JSON.stringify(r)).not.toContain('"value":0')
```

- [ ] **Step 2: Run** `npx vitest run tests/coverage.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** `coverage.ts` and `build-all.ts`.
- [ ] **Step 4: Run** tests — PASS. Run `npm run data:build` — expect exit 0, the six files in `data/build/`, and a
  printed table of counts. Check by eye: CoreWeave first revenue quarter is no earlier than 2024Q4 (IPO Mar 2025
  filings include prior periods; whatever the data shows, it is not zero-filled).
- [ ] **Step 5: Commit** `feat: data build pipeline and coverage report` (include `data/build/`).

---

### Task 7: Verify the flagged 2026 figures

**Files:**
- Create: `data/verification/2026-11-verification.md`
- Modify: `data/deals/deals.json`, `data/manual/series.csv`, `data/manual/financials.csv` (status updates only, plus
  any primary figures found)
- Test: `tests/verification.test.ts`

**Interfaces:**
- Consumes: `loadDeals`, `buildSeries` (Tasks 4–5).
- Produces: the verification log, one section per item, each with: claim, where checked (URL), result
  (`confirmed` / `corrected` / `not found`), the primary figure and its exact location, and the ids of records
  updated.

Items (from spec §16 and the source captures), checked only against allowed hosts (SEC EDGAR, investor.nvidia.com):
1. NVIDIA Q3 FY27 revenue $115,844M, Data Center $107,610M, Q4 guide $130.0B — NVIDIA 8-K exhibit 99.1 / IR release;
   once filed, the Q3 FY27 10-Q.
2. NVIDIA CEO changes: 8-Ks dated 2026-11-12 and 2026-11-23 (URLs in prompt-1 capture).
3. NVIDIA guarantee exposure total and the Ohio guarantee cap ($105B) and lease length (10 vs 20 years) — NVIDIA
   10-Q commitments/guarantees note and the August 2026 8-K.
4. NVIDIA $6.3B CoreWeave backstop — CoreWeave 8-K (Sept 2025) or 10-Q.
5. Anthropic compute commitments $900.9B / $451.6B / $70.7B — 424B4 (URL in prompt-1 capture), "Our Approach to
   Compute".
6. Anthropic ~$81B run-rate — S-1/A No. 2 (URL in prompt-1 capture).
7. Anthropic–Microsoft–NVIDIA equity amounts (up to $10B / $5B) — Anthropic S-1/424B4 related-party or capitalization
   sections.
8. CoreWeave DDTL 1.0–5.5 terms — CoreWeave 10-K/10-Q debt notes and 8-Ks.
9. Meta Hyperion residual value guarantee terms — Meta 10-Q commitments note.
10. Oracle S&P rating action and remaining performance obligations — Oracle 10-Q.

- [ ] **Step 1: Write failing test**

```ts
const log = readFile('data/verification/2026-11-verification.md')
for (const id of extractRecordIds(log)) expect(allRecordIds()).toContain(id) // every referenced record exists
const deals = loadDeals()
for (const d of deals.filter(d => d.sources.some(s => s.status === 'primary-filing')))
  expect(d.sources.some(s => /sec\.gov/.test(s.url))).toBe(true)        // primary-filing means an SEC URL
```

  (`extractRecordIds` reads ids written as `` `id:<record-id>` `` in the log; implement it in the test file.)
- [ ] **Step 2: Run** `npx vitest run tests/verification.test.ts` — expect FAIL (log missing).
- [ ] **Step 3: Check each item** against the primary source, write the log, update statuses and values. A figure
  that cannot be found stays `secondary`/`unverified` and the log says so.
- [ ] **Step 4: Run** `npm test && npm run data:build` — expect PASS and exit 0; `manifest.json` unverified counts
  are lower than before this task.
- [ ] **Step 5: Commit** `data: verify flagged 2026 figures against primary filings`.

---

### Task 8: Data explorer page and GitHub Pages deploy (phase checkpoint)

**Files:**
- Create: `index.html`, `vite.config.ts`, `src/explorer/main.ts`, `src/explorer/format.ts`,
  `src/explorer/style.css`, `.github/workflows/pages.yml`
- Test: `tests/format.test.ts`

**Interfaces:**
- Consumes: `data/build/*.json` (Task 6), imported at build time.
- Produces: `formatUsd(value: number): string` (`$115.8B`, `$950M`, `−$2.1B`), `statusBadge(s: VerificationStatus):
  { label: string; tone: 'good'|'neutral'|'warn' }` (`primary-filing`→"Filing"/good, `primary-company`→
  "Company"/good, `secondary`→"Secondary"/neutral, `unverified`→"Unverified"/warn).

Page content (one page, light theme, Geist, layer colours, header "AI capital flows — data check", label "Early
version: data only"):
1. Companies table: one row per entity with XBRL or manual data; latest quarter revenue, capex, operating cash flow,
   cash, debt, each with a status badge; a small sparkline of quarterly revenue since 2022Q1; coloured layer dot.
2. Deals table: name, payer → payee, types, the four value fields in separate columns, latest status, source badge;
   filter by entity and by status.
3. Series: one small line chart per series grouped by kind; provider shown in each chart title.
4. Coverage: gaps and unverified counts per entity.
5. Footer: build date from `manifest.json`.

- [ ] **Step 1: Write failing test**

```ts
expect(formatUsd(115_844_000_000)).toBe('$115.8B')
expect(formatUsd(950_000_000)).toBe('$950M')
expect(formatUsd(-2_100_000_000)).toBe('−$2.1B')
expect(statusBadge('unverified')).toEqual({ label: 'Unverified', tone: 'warn' })
```

- [ ] **Step 2: Run** `npx vitest run tests/format.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** `format.ts`, the page, and `pages.yml` (on push to `main` and manual dispatch:
  `npm ci`, `npm test`, `npm run build`, upload `dist` with `actions/upload-pages-artifact`, deploy with
  `actions/deploy-pages`; the workflow does not fetch data — it uses committed `data/build/`).
- [ ] **Step 4: Run** `npm test && npm run build` — expect PASS and `dist/index.html`. Run `npx vite preview` and
  take a Playwright screenshot at 1440×900; check by eye that the four sections render with no overflow and badges
  show.
- [ ] **Step 5: Commit** `feat: data explorer page and Pages deploy workflow`.
- [ ] **Step 6: Hand-off note for the owner** (in the final message, not code): GitHub Pages must be switched on once
  in the repository settings (Settings → Pages → Source: GitHub Actions), and the workflow deploys from `main`, so the
  branch needs merging (or the workflow's branch filter adjusting) before the public link appears.

---

## Out of scope for this plan (later phases)

- EIA power data (needs a free API key: request it with the credential tool when phase 2 needs it) and BLS employment
  data (host `api.bls.gov` must be added to the environment allowlist).
- Scheduled data refresh workflow (phase 7).
- Condition forecast ranges and the power forecast model (phase 2 builds them from these series).
