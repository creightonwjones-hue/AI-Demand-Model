# Phase 1 follow-ups for later phases

Carried from the phase 1 build reviews (2026-11-26). Items marked "before phase 7" must land before the backtest.

## Deferred findings

- Task 3: minor (deferred): later 3-month fact suppresses earlier-known derived value (mostly pre-2017, outside backtest window)
- Task 3: minor (deferred): duplicate-value vintages from repeated comparatives inflate data
- Task 3: minor (deferred): arbitrary YTD component choice among one-day period variants
- Task 3: minor (deferred): loadMetricMap default path cwd-relative
- Task 3: minor (deferred → carry to Task 6): add fallback tags to config/sec-metrics.json for gaps (Intel revenue, Broadcom netIncome, Oracle longTermDebt)
- Task 4: minor (deferred): manual-financials data test only loads nvidia rows (Task 6 build loads all)
- Task 4: minor (deferred): duplicate addDays/instant-quarter rule in manual-financials.ts vs xbrl.ts → move to quarters.ts
- Task 4: minor (deferred): FX period average accepts partial coverage silently
- Task 4: minor (deferred → Task 6): fredToSeries retrieved defaults to today; pass manifest retrieved
- Task 4: minor (deferred → Task 7): Ornn series include CloudZero/Tunguz quotes — confirm OCPI or split; resolve bare-domain source URLs
- Task 4: minor (deferred): FredConfigSchema lives in a script module
- Task 4: minor (deferred): capex definitions differ (ASML PP&E only; Nebius incl. intangibles) — handle in phase 2
- Task 4: minor (deferred): FRED lag in calendar days leaves ≤2 days weekend look-ahead (quarterly model, negligible)
- Task 5: minor (deferred): unverified status on official blog URLs (conservative, Task 7 resolves)
- Task 5: minor (deferred): copy-pasted fixture names
- Task 5: minor (deferred): schema-error test doesn't assert field name
- Task 5: minor (deferred): `end` used as closing date in softbank-openai-equity-2025
- Task 5: minor (deferred → Task 7): check URL-to-instrument attribution for split records (e.g. nvidia-intel-equity source)
- Task 5: minor (deferred): blanket no-1st-of-month test would reject a future genuinely exact 1st date — relax when such a record arrives (Task 7 may add exact dates)
- Task 6: minor (deferred): facts don't record source XBRL tag (auditability)
- Task 6: minor (deferred): ProfitLoss / NetIncomeLossAvailableToCommonStockholdersBasic fallbacks global — NCI/preferred risk
- Task 6: minor (deferred): build-all.ts has no automated test
- Task 6: minor (deferred): manifest.builtAt noise; quote style
- Task 7: minor (deferred → phase 2 data): add CoreWeave DDTL 2.1 ($3.0B, recourse, Mar 2031) as a deal record
- Task 7: minor (deferred → phase 2 schema): Oracle RPO $664B has no metric
- Task 7: minor (deferred): "Date is exact" note exemption too broad — use explicit allowlist
- Task 7: minor (deferred): anthropic-google-csp-hosting-2026 lacks 2026-10-26 $114.5B statusHistory entry
- Task 7: minor (deferred → phase 2 schema, before phase 7 backtest): statusHistory dates are event dates with no as-known field (e.g. placement 'completed' 2026-11-20, confirmed by 8-K 2026-11-25); add asKnownAt to status entries before the backtest reads them
- Task 8: minor (deferred): monthEnd sampling could drop an unverified per-point source (not possible with today's data)
- Task 8: minor (deferred): copy "month-end values" → "last observation of each month"
- Task 8: minor (deferred): deal value cells lack per-value verification marker
- Task 8: minor (deferred): prepare() itself untested

## Parked at final review

- FX weekly H.10 lag of 7 days can be 1 day short in holiday weeks (revisit in phase 7).
- Backtest must split-adjust as-of EPS (Alphabet, Amazon, Broadcom, NVIDIA splits).
- Broadcom 2022Q1 and Intel 2022Q4 netIncome switch tags between filings.
- Manual non-USD facts use period-average FX without checking the FX data was public by asKnownAt.
- NVIDIA Data Center segment history covers one quarter; backfill 2022–2026 from NVIDIA revenue-trend files (needed for the backtest pass criterion).
- NVIDIA capex 2022Q4–2023Q2 first appears a year late (2023 filings use a tag outside the map; try the nvda taxonomy).
- Coverage report: add a first-known-lag column so late-known values are visible.
