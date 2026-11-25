# Source capture: verification of recent claims, guidance and consensus

- Collected: 2026-11-25, by the user via Claude in Chrome (prompt 1 of 3)
- Status: raw capture. Rows marked "Primary" cite company press releases, SEC filings or official transcripts.
  Rows marked "Secondary" still need confirming before they feed the model.
- Cross-check done in this repo: NVIDIA Q2 FY27 revenue in SEC XBRL data = $96,221M (10-Q filed 2026-08-26);
  the reported Q3 FY27 figure of $115,844M is consistent with the stated +20% q/q. The Q3 FY27 10-Q was not yet in
  the SEC XBRL feed on 2026-11-25.

## 1. NVIDIA — Q3 FY2027 (quarter ended Oct 25, 2026) and leadership

| Item | Value | Date | Source URL | Primary/secondary | Notes |
|---|---|---|---|---|---|
| Total revenue | $115,844M (+20% q/q, +103% y/y) | 2026-11-17 | https://investor.nvidia.com/news/press-release-details/2026/NVIDIA-Announces-Financial-Results-for-Third-Quarter-Fiscal-2027/default.aspx | Primary | From the income statement in the release |
| Data Center revenue | $107,610M = Hyperscale $60,136M + AI Clouds, Industrial & Enterprise $47,474M | 2026-11-17 | https://s201.q4cdn.com/141608511/files/doc_financials/2027/Q327/Rev-by-Mkt-Qtrly-Trend-Q327.pdf | Primary | +21% q/q, +110% y/y |
| Automotive/robotics revenue | Not reported as a line. Edge Computing (PCs, gaming, auto, robotics) $8.2B, +42% y/y, +14% q/q | 2026-11-17 | https://s201.q4cdn.com/141608511/files/doc_financials/2027/Q327/Q3FY27-CFO-Commentary.pdf | Primary | NVIDIA now reports only Data Center and Edge Computing |
| Physical AI | "now on track to exceed $25 billion for the full year" (Kress) | 2026-11-17 | https://s201.q4cdn.com/141608511/files/content_files/NVDA-3Q27-Earnings-Transcript.pdf | Primary | No quarterly figure; segment not stated |
| Gross margin | GAAP 74.8%, non-GAAP 74.9% (Q2: 75.0% both) | 2026-11-17 | Press release | Primary | Non-GAAP includes SBC since Q1 FY27 (restated) |
| Diluted EPS | GAAP $2.70; non-GAAP $2.68 | 2026-11-17 | Press release | Primary | Net income $65.3B GAAP / $64.9B non-GAAP |
| Q4 FY27 guidance | Revenue $130.0B ±3%; no China data-centre compute assumed; GM 71.0–72.0% | 2026-11-17 | Press release | Primary | Q4 has an extra week |
| FY2028 outlook | "We expect revenue to grow approximately 75% year-over-year, up from 70%" (Kress) | 2026-11-17 | Transcript | Primary | |
| Leadership, Nov 12 | Huang resigned as President, CEO and director; Kress interim CEO (and CFO); Harvey C. Jones first Board Chair | 2026-11-12 | https://www.sec.gov/Archives/edgar/data/0001045810/000104581026000082/nvidiaannouncesceotransiti.htm | Primary (8-K) | |
| Leadership, Nov 17 | Jones: board "does not intend to reinstate Jensen as CEO" | 2026-11-17 | Transcript | Primary | Reversed six days later |
| Leadership, Nov 23 (current) | Huang reinstated as President, CEO and director; Kress stays CFO; Jones stays Chair; new national-security/export-control board committee; hiring a Chief Compliance Officer | 2026-11-23 | https://www.sec.gov/Archives/edgar/data/0001045810/000104581026000090/nov23pressrelease.htm | Primary (8-K) | Current CEO: Jensen Huang |

## 2. Anthropic

| Item | Value | Date | Source URL | Primary/secondary | Notes |
|---|---|---|---|---|---|
| IPO | Priced at $83.00, ticker ANT, Nasdaq Global Select; trading expected from 2026-11-19 | 2026-11-18/19 | https://www.anthropic.com/news/anthropic-prices-initial-public-offering | Primary | IPO closed Nov 20 with full over-allotment |
| IPO size | Total $81.34B; proceeds before expenses to Anthropic $78.84B; 980M shares (956.35M primary, 23.65M secondary) | 2026-11-19 | https://www.sec.gov/Archives/edgar/data/2130357/000162828026074944/anthropicpbc-424b4.htm | Primary (424B4) | |
| Valuation | ~$1.5T fully diluted; plus a separate ~$26B private placement | 2026-11-18 | https://techcrunch.com/2026/11/18/anthropic-reportedly-prices-ipo-at-83-a-share-above-projected-range/ | Secondary | |
| Run-rate revenue | ~$81B as of 2026-10-31 (+$10B vs Sep 30) | filed 2026-11-10 | https://247wallst.com/investing/2026/11/11/anthropic-says-its-revenue-run-rate-jumped-to-an-81-billion-run-rate/ | Secondary (citing S-1/A No. 2) | Not found in the SEC text read — UNVERIFIED. Definition: trailing-28-day usage ×13 + monthly subscriptions ×12. Earlier: >$47B (May 2026) |
| Compute commitments | ~$900.9B aggregate committed spend; ~$451.6B before 2030-12-31; ~$70.7B due in 12 months after 2026-09-30 | 2026-11-19 | 424B4 (above); S-1/A No. 2 https://www.sec.gov/Archives/edgar/data/2130357/000162828026072484/anthropicpbc-sx1ax2.htm | Primary | Prospectus Summary, "Our Approach to Compute" (~p.7); see MD&A Contractual Obligations |
| Original S-1 | Commitment figure left blank | 2026-10-26 | https://www.sec.gov/Archives/edgar/data/0002130357/000162828026067168/anthropicpbc-sx1.htm | Primary | Press estimates varied: Fortune $542–567B, NYT up to $807B, S-1/A No. 1 ~ $895.4B ($69.8B due in 12 months) |
| Unpriced commitments | Estimated additional $150–175B | 2026-11-10 | https://mlq.ai/news/anthropics-compute-bill-901-billion-of-cloud-chip-and-data-center-commitments-against-an-81-billion-run-rate/ | Secondary | Not found in prospectus text — UNVERIFIED |

## 3. OpenAI

| Item | Value | Date | Source URL | Primary/secondary | Notes |
|---|---|---|---|---|---|
| Revenue (company-stated) | ~$2B/month (~$24B/yr) | 2026-03-31 | https://openai.com/index/accelerating-the-next-phase-ai/ | Primary | 2025 revenue reported at $13.1B |
| Run-rate, source A | ~$50B (late Sept 2026) | 2026-10-08 | https://cryptobriefing.com/openai-revenue-run-rate-nears-50-billion/ | Secondary | Reported projection $70B+ by end 2026 |
| Run-rate, source B | ~$70B | 2026-09-29 | https://axios.com/2026/09/29/scoop-openais-annual-recurring-revenue-nears-70b | Secondary | Likely restated on Anthropic's method; gap is cloud-partner sales |
| Compute commitments | ~$1.4T over 8 years (~30 GW) | 2025-11-06 | https://techcrunch.com/2025/11/06/sam-altman-says-openai-has-20b-arr-and-about-1-4-trillion-in-data-center-commitments/ | Secondary (quotes Altman) | No updated company figure |
| Compute spend target | ~$600B through 2030 (told to investors) | 2026-02-20 | https://www.pymnts.com/artificial-intelligence-2/2026/openai-compute-spend-could-hit-600-billion-by-2030/ | Secondary | Different measure from the $1.4T |
| Confirmed round | $122B committed at $852B post-money | 2026-03-31 | https://openai.com/index/accelerating-the-next-phase-ai/ | Primary | |
| Reported round | ~$11B first close at ~$1.25T valuation (could reach ~$20B) | 2026-11-06 | https://finance.yahoo.com/news/openai-secures-11bn-funding-round-095750139.html | Secondary | Not confirmed by OpenAI |

## 4. Capex guidance (most recent calls)

| Item | Value | Date | Source URL | Primary/secondary | Notes |
|---|---|---|---|---|---|
| Microsoft CY2026 | ~$170B ("for the calendar year, spend approximately $170 billion") | 2026-10-28 | https://www.webull.com/news/15828153888932864 | Secondary (transcript) | Q2 FY27 guided >$50B; one outlet called it fiscal-2027 |
| Microsoft CY2027 | Not found; capex to accelerate in H2 FY27 | 2026-10-28 | Same | Secondary | |
| Alphabet CY2026 | $195–205B (held) | 2026-10-28/29 | https://www.zacks.com/stock/news/3023048/ | Secondary | |
| Alphabet CY2027 | No figure; "increase significantly" (paraphrase) | 2026-10 | https://www.canberratimes.com.au/story/9382036/google-misses-revenue-expectations-cash-burn-worsens/ | Secondary | |
| Amazon CY2026 | ~$220B cash capex | 2026-10-29 | https://rbnenergy.com/daily-posts/analyst-insight/2026-earnings-calls-amazon-track-spend-220-billion-capex-year | Secondary | |
| Amazon CY2027 | No figure; "spend meaningfully more in 2027" (Jassy) | 2026-10-29 | Same | Secondary | |
| Meta CY2026 | $135–145B (narrowed from $130–145B), incl. finance-lease principal | 2026-10-21 | https://www.sec.gov/Archives/edgar/data/0001326801/000162828026066700/meta-09302026xexhibit991.htm | Primary (8-K) | |
| Meta CY2027 | No figure; "continue investing aggressively" | 2026-10-21 | Same | Primary | |
| Oracle FY2027 (Jun 26–May 27) | $90–95B gross; ≤$70B net cash capex | 2026-09-10 | https://diginomica.com/node/31102 | Secondary | FQ2 report due ~December |
| Oracle FY2028 | No figure; new RPO won't affect capex/revenue until FY28+ | 2026-09-10 | https://www.roic.ai/quote/ORCL/transcripts | Secondary | |

## 5. NVIDIA consensus (fiscal years end late January)

| Item | Value | Date | Source URL | Notes |
|---|---|---|---|---|
| FY2027 revenue | Avg $423.8B; low $412.45B; high $431.68B; 52 analysts | 2026-11-25 | https://finance.yahoo.com/quote/NVDA/analysis/ | Matches 9-month actual $293.7B + $130B Q4 guide |
| FY2028 revenue | Avg $726.23B; low $546B; high $778.47B; 58 analysts | 2026-11-25 | Yahoo | +71.4%, near the ~75% company outlook |
| FY2029 revenue | Not found | 2026-11-25 | https://stockanalysis.com/stocks/nvda/forecast/ | Paywalled |
| FY2027 EPS (non-GAAP) | Yahoo avg $9.67 (9.39–10.52, 53); MarketWatch avg $9.63 (9.24–9.98) | 2026-11-25 | Yahoo; https://www.marketwatch.com/investing/stock/nvda/analystestimates | |
| FY2028 EPS | Yahoo avg $16.61 (12.27–18.78, 55); MarketWatch avg $16.60 | 2026-11-25 | Same | Up from ~$15.9 a month ago |
| FY2029 EPS | MarketWatch avg $21.75 (11.02–27.15) | 2026-11-25 | MarketWatch | Analyst count not shown |

## Notes for the model

- FY2026 actual EPS differs by aggregator ($4.77 Yahoo vs $4.69 MarketWatch), likely the SBC change; use one source consistently.
- Anthropic (~$81B) and OpenAI (~$50B / ~$70B) run-rates are on different bases; do not compare directly.
