# Existing Models and Forecasts of AI Infrastructure Demand, Supply Bottlenecks and Data-Centre Power (and their methods / data)

Research date: 2026-11-25. Note on access: `epoch.ai` and `investor.nvidia.com` could not be fetched from this session (blocked by the session's network allowlist), so Epoch and Nvidia figures below come from search-result snippets and secondary coverage. Treat them as needing a primary check. Most supply-chain capacity figures are second-hand analyst estimates (JPM, UBS, TrendForce, Morgan Stanley) relayed by aggregators, not company disclosures.

## 1. Compute and spending models (Epoch, bottom-up accelerator models, sell-side capex to Nvidia, consultancies, revenue-gap analyses)

### Takeaway
The models fall into four families. (a) Epoch AI's trend extrapolation of training compute, cluster cost and power, plus GATE, a macro model of automation. (b) Bottom-up supply-chain/unit models of the SemiAnalysis or sell-side kind. (c) Top-down capex models: hyperscaler capex guidance, then accelerator revenue. (d) Consultancy GW-to-capex models such as McKinsey's $6.7T and Bain's $2T revenue requirement. Revenue-gap framings (Sequoia, Bain) have been overtaken on the upside so far: 2026 hyperscaler capex (about $700B+) and Nvidia data-centre revenue (about $108B a quarter) exceed almost all 2024–25 projections.

### Cited Findings
**Epoch AI**
- Epoch's "Can AI scaling continue through 2030?" checks training-compute trends (about 4–5x a year) against four constraints: power, chip manufacturing, data scarcity and the latency wall. It concludes that roughly 2e29 FLOP training runs are feasible by 2030 — [Epoch AI](https://epoch.ai/publications/can-ai-scaling-continue-through-2030); coverage in [Singularity Hub](https://singularityhub.com/2024/08/29/ai-models-scaled-up-10000x-are-possible-by-2030-report-says/)
- Epoch's "AI in 2030" report: on current trends, frontier training clusters would cost hundreds of billions of dollars by 2030 — [Epoch AI, AI_2030.pdf](https://epoch.ai/files/AI_2030.pdf)
- Secondary coverage of Epoch's supercomputer-trend work: the top 2030 system would cost about $200B, hold about 2 million accelerators and draw about 9 GW — [AI CERTs (secondary)](https://www.aicerts.ai/news/ai-supercomputer-economics-200b-build-cost-forecast-for-2030/)
- Epoch's scenario range for the largest single cluster in 2030: conservative about $30B (plateau), aggressive about $1T — [Epoch AI blog, model counts](https://epoch.ai/blog/model-counts-compute-thresholds) (per search snippet; verify)
- Epoch's frontier-model-count forecast to 2028 (models above compute thresholds) — [arXiv 2504.16138](https://arxiv.org/pdf/2504.16138)
- GATE is a macroeconomic model of AI-driven automation. It models effective compute (hardware × algorithmic efficiency), not physical chip supply. Its default allocation is reported as about 90% of compute to training in 2024, falling to about 70% by 2028 — [Epoch AI Brief Sept 2025](https://epochai.substack.com/p/the-epoch-ai-brief-september-2025) (snippet-level; verify on epoch.ai)
- Secondary claim: Epoch expects inference to dominate compute by 2030 — [Crypto Briefing (secondary, unverified)](https://cryptobriefing.com/epoch-ai-inference-surpass-training-2030/)
- Epoch's Huawei roadmap analysis names HBM as the key bottleneck for Huawei and finds that China's domestic ramp will not catch Nvidia by 2030 — [Epoch AI, Huawei's roadmap to 2031](https://epoch.ai/publications/huaweis-roadmap-to-2031)

**Hyperscaler capex to Nvidia revenue (top-down)**
- 2026 capex guidance after Q3-2026 earnings, per a tracker: Amazon about $220B (cash capex), Alphabet $195–205B (raised from $180B, then $190B, with "CapEx to increase significantly in 2027"), Microsoft about $170B, Meta $135–145B. That totals about $730B at the midpoint — [ValueAdd VC tracker](https://valueaddvc.com/blog/big-tech-ai-capex-in-2025-microsoft-google-meta-amazon-and-the-spending-race); [Datacentres.com](https://www.datacentres.com/guides/hyperscaler-capex-trends); [Introl ($690B)](https://introl.com/blog/hyperscaler-capex-690-billion-microsoft-azure-power-bottleneck-2026)
- Microsoft's figure varies ($170B vs about $175B). One source attributes the trim to more data-centre leases being classed as operating rather than finance leases, which puts them outside capex. This definitional issue matters for any capex-to-chips model — [ValueAdd VC](https://valueaddvc.com/blog/big-tech-ai-capex-in-2025-microsoft-google-meta-amazon-and-the-spending-race). One page with much lower numbers (MSFT $90–95B, AMZN $115–120B) conflicts with the guidance and should be discarded — [nextmsc](https://www.nextmsc.com/industry-deep-dive/hyperscaler-capex-comparison-2026)
- Nvidia Q3 FY2027 (quarter ended 25 Oct 2026, reported 17 Nov 2026): revenue $115.8B (+103% y/y, +20% q/q); Data Center $107.6B (+110% y/y, about 93% of revenue). Hyperscalers contributed $60.1B; "AI cloud, industrial and enterprise" $47.5B (+195% y/y). $2.4B of Hopper products shipped to China. Q4 guide $130B ±3% (includes an extra week), assuming no China data-centre compute revenue. Vera Rubin NVL72 has shipped — [Nvidia press release (title/URL from search; page blocked here)](https://investor.nvidia.com/news/press-release-details/2026/NVIDIA-Announces-Financial-Results-for-Third-Quarter-Fiscal-2027/); [Guru3D](https://www.guru3d.com/story/nvidia-q3-fy2027-usd-1158-billion-revenue-data-center-usd-1076-billion-usd-130-billion-q4/); [Fierce Network](https://www.fierce-network.com/newswire/nvidia-revenue-more-doubles-vera-rubin-ramps)
- Secondary outlets report this as the first quarter with Colette Kress as interim CEO after Jensen Huang's exit — [Credence Research](https://www.credenceresearch.com/news/nvidia-q3-fiscal-2027-revenue-115-8-billion-vera-rubin-interim-ceo-kress). UNVERIFIED: I could not open the primary release. Confirm before use.
- Analysts put Nvidia's share of the global AI accelerator market at 80–90% in 2026 — [ABI Research](https://abiresearch.com/blog/ai-data-center-demand-growth) (snippet)

**Consultancy capex/GW models**
- McKinsey ("The cost of compute: a $7 trillion race"): $6.7T of cumulative global data-centre capex through 2030, of which $5.2T is for AI-capable and $1.5T for traditional IT. Scenarios range from $3.7T (constrained, +78 GW incremental) to $7.9T (accelerated). Global capacity demand reaches about 219–220 GW by 2030 (about 156 GW AI, 64 GW non-AI), a roughly 22% CAGR. The method is a demand-in-GW scenario model times capex per MW, split across builders: energizers, technology developers and real-estate developers — [McKinsey](https://www.mckinsey.com/industries/technology-media-and-telecommunications/our-insights/the-cost-of-compute-a-7-trillion-dollar-race-to-scale-data-centers); [McKinsey chart](https://www.mckinsey.com/featured-insights/week-in-charts/data-center-demands)
- Bain (Sept 2025 Global Technology Report): about 200 GW of global compute demand by 2030 would need about $500B a year of capex. That in turn needs about $2T a year of new revenue to be profitable; even after AI-driven savings, about $800B a year is still short — [Bain press release](https://www.bain.com/about/media-center/press-releases/20252/$2-trillion-in-new-revenue-needed-to-fund-ais-scaling-trend---bain--companys-6th-annual-global-technology-report/); [Bloomberg](https://www.bloomberg.com/news/articles/2025-09-23/an-800-billion-revenue-shortfall-threatens-ai-future-bain-says). No 2026 Bain revision found.

**Revenue-gap analyses**
- Sequoia / David Cahn, "AI's $600B Question" (June 2024). Method: take Nvidia's data-centre run-rate revenue, ×2 for total data-centre cost (energy, buildings, etc.), then ×2 again for a 50% end-user gross margin. That gives the AI revenue needed to pay back the capex. It upgraded his 2023 "$200B question" — [Sequoia](https://www.sequoiacap.com/article/ais-600b-question/); [Tom's Hardware](https://tomshardware.com/tech-industry/artificial-intelligence/ai-industry-needs-to-earn-dollar600-billion-per-year-to-pay-for-massive-hardware-spend-fears-of-an-ai-bubble-intensify-in-wake-of-sequoia-report)
- A 2026 TechCrunch piece reframes this as the "$3 trillion question" — [TechCrunch, Jul 2026](https://techcrunch.com/2026/07/09/can-ai-answer-the-3-trillion-question/) (title only seen)

### Inferences
- **How earlier forecasts held up:** Applying Sequoia's ×4 heuristic to Nvidia's current about $430B annualised data-centre revenue ($107.6B × 4) implies an AI revenue requirement of about $1.7T a year. That is close to Bain's $2T. Frontier-lab revenue (Anthropic about $68–81B run-rate, OpenAI about $50–70B; see section 4) is growing fast but is still an order of magnitude below it. The gap framing therefore still "works" arithmetically, but demand-side spending has so far kept rising regardless.
- Capex forecasts from 2024 badly underestimated 2026. At the time, the 2026 consensus for the big four was well under $400B; actual 2026 is about $700B+. My own recollection, not sourced here, so verify with archived consensus.
- **Reusable method for the new model:** do not rely on a single chain. Triangulate top-down (capex guidance × AI share × accelerator share of capex, giving accelerator revenue, then dividing by ASP to get units), bottom-up (CoWoS wafers × packages per wafer × yield, giving units; HBM bits ÷ HBM per GPU, giving units), and power (GW energised ÷ kW per accelerator, all-in, giving installed units). Then take the minimum as the binding constraint.
- Capex definitions (cash capex versus finance leases versus operating leases, as with Microsoft) and neocloud/off-balance-sheet spending (the "AI cloud, industrial and enterprise" segment now about 44% of Nvidia DC revenue) mean hyperscaler capex alone increasingly understates accelerator demand.

### Gaps
- I could not access Epoch's data hub (epoch.ai is blocked in this session). That leaves unconfirmed: its "AI chip sales"/compute-stock datasets, GPU cluster and frontier data-centre datasets, CSV availability and current headline numbers (for example, the installed Nvidia compute stock and its growth rate). The coordinator should allow epoch.ai and recheck https://epoch.ai/data.
- SemiAnalysis accelerator and data-centre industry models are paywalled, so only their general method (site-by-site satellite and permit tracking, plus a supply-chain unit model) is known. I found no public numbers.
- IDC and Gartner data-centre and AI-spending forecasts were not retrieved.
- There is no systematic forecast-versus-actual scorecard for Epoch, McKinsey or sell-side forecasts; this would have to be built.

## 2. Supply bottleneck modelling (CoWoS, HBM, wafer starts, ASML) and 2025–2027 capacity figures

### Takeaway
Analysts model accelerator ceilings as a chain: CoWoS wafer capacity, times packages per wafer by product, times yield, gives GPU/ASIC units. They cross-check this against HBM bit supply and ABF substrates. Estimates of TSMC CoWoS capacity have been revised up repeatedly: about 105–140k wafers per month (wpm) at end-2026 and 141–200k at end-2027, with about 200–270k industry-wide including OSATs. By 2027 HBM (+45–50%) and substrates (+25–30%) are growing more slowly than CoWoS (about +70%), so the binding constraint is shifting toward memory. SK hynix says DRAM/HBM is effectively sold out through 2029.

### Cited Findings
- JPMorgan (13 Nov 2025): TSMC CoWoS capacity at about 105k wpm by end-2026 (up from 95k previously) and about 141k by 2027; "AI packaging to remain tight in 2026–27". This is older (Nov 2025) — [Jukan on X summarising JPM](https://x.com/jukan05/status/1989479922910597530)
- TrendForce (June 2026): the TSMC CoWoS supply-demand gap is narrowing from about 20% to about 10% by end-2026 as capacity expands. TSMC plans to expand CoWoS by more than 60% by 2027, and the severe 2.5D shortage begins to moderate in 2027 — [TrendForce](https://www.trendforce.com/news/2026/06/15/news-tsmc-cowos-supply-demand-gap-reportedly-seen-narrowing-from-20-to-10-by-end-2026-as-capacity-expands/)
- Industry estimates (Sept 2026): TSMC about 130k wpm at end-2026, about 185–190k at end-2027 and about 260k at end-2028. Total CoWoS capacity grows about 70.9% in 2027 versus ABF substrates +25–30% and HBM +45–50%, leaving a residual 2027 gap of 15–20% — [EffectStory](https://effectstory.com/en/articles/cowos-capacity-tsmc-roadmap-ase-expansion-2026) (aggregator)
- UBS: global CoWoS-class capacity about 270k wpm at end-2027, with ASE about 70k wpm; 2027 demand nearly doubles from 2026 — [BigGo Finance on UBS](https://finance.biggo.com/news/a29d8fdd-77c2-4094-88ce-22f871e86daf)
- TSMC 2026 range of 120–140k wpm, and about 200k industry-wide including 50–60k from OSATs. CoWoS prices are up as much as 20% — [VLSI.kr market bulletin](https://www.vlsi.kr/en/cowos-price-hike-mb-en/); a 200k "target, not installed" caveat appears in [VLSI.kr 2027 bottleneck](https://www.vlsi.kr/en/advanced-packaging-2027-bottleneck-en/)
- HBM4 has qualified at all three vendors (SK hynix, Samsung, Micron) as of June 2026 — [Silicon Analysts Weekly](https://siliconanalysts.com/newsletter/qual-watch/2026-06-22)
- SK hynix Q3-2026 call (28 Oct 2026): DRAM and HBM are "effectively sold out" through 2029, combining LTAs and volumes under negotiation. It has LTAs with 14 major customers (up from 10), and LTAs cover more than 50% of 2027 and 2028 capacity — [Korea JoongAng Daily](https://koreajoongangdaily.com/business/sk-hynix-says-dram-hbm-booked-through-2029-as-profit-soars-to-62b/12942008); [Kyunghyang](https://www.khan.co.kr/en/article/202610281734027)
- Earlier SK hynix Q3-2025 call: HBM tight through 2027, sold out since 2023 — [Asia Economy](https://www.asiae.co.kr/en/article/2025102910334843684); [Korea Times](https://www.koreatimes.co.kr/business/tech-science/20251029/sk-hynix-q3-operating-profit-reaches-793-bil)
- HBM market size of about $43B by 2027 (Counterpoint/Citi). This is STALE (2024–25 vintage) and almost certainly exceeded — [Notebookcheck](https://www.notebookcheck.net/SK-hynix-sells-out-its-DRAM-NAND-and-HBM-chip-supply-to-Nvidia-through-2026-as-AI-demand-outpaces-Samsung-and-Microns-capacity.1151402.0.html)
- TSMC is pursuing CoPoS (panel-level) as the CoWoS successor — [AtlasPCB](https://www.atlaspcb.com/news/news-tsmc-copos-cowos-advanced-packaging-capacity-2026/)
- A public HBM capacity-timeline model (illustrates a bit-supply-versus-demand method) — [ravikant.dev](https://ravikant.dev/research/investments/universe/hbm-capacity) (blog, low authority)

### Inferences
- **Conversion method (heuristic, NOT verified this session; confirm with SemiAnalysis or TrendForce):** units ≈ CoWoS wpm × 12 × packages per wafer × yield × product mix share. Large reticle-multiple packages (Blackwell/Rubin CoWoS-L) yield on the order of 10–16 packages per 300mm wafer; smaller ASICs yield more. HBM ceiling = HBM bit supply ÷ (stacks per GPU × GB per stack). Running both and taking the minimum gives the supply ceiling.
- Estimates differ by up to about 40% for the same date (for example, end-2026 TSMC at 105k, 130k or 120–140k), partly because of definitions: TSMC-only versus incl. OSAT, installed versus target, CoWoS-S/-L/-R. A model should parameterise capacity as a range with an explicit source vintage.
- With HBM LTAs covering more than half of 2027–28 output, LTA disclosures from SK hynix, Samsung and Micron are a good leading indicator for accelerator units.
- ASML: no figures retrieved. In such models, EUV tool shipments matter mainly for leading-edge logic wafer starts (N3/N2) and DRAM (1b/1c nodes for HBM). They act on a longer (2027+) horizon than CoWoS.

### Gaps
- No primary TSMC disclosure of CoWoS wpm was found; TSMC does not publish it, so all figures are analyst estimates.
- No current (2026) HBM bit-supply or market-size forecast from the three vendors or TrendForce was retrieved.
- ASML EUV/DUV shipment forecasts and the logic wafer-start (N3/N2) allocation to AI were not researched due to the tool-call budget.

## 3. Data-centre power demand and supply forecasts, and methods/data series

### Takeaway
The main public forecasts are IEA (global), LBNL/DOE (US, bottom-up from server shipments), Grid Strategies (an aggregation of utility forecasts) and McKinsey (GW). They converge on data-centre load roughly doubling by 2030. Globally that is about 945–1,000 TWh (IEA). In the US it is 325–580 TWh by 2028 (LBNL), or about 11.8% of US electricity by 2030 (LBNL 2025 update). Utility and queue-based figures are known to be inflated by duplicate requests.

### Cited Findings
- IEA "Energy and AI" (Apr 2025): global data-centre electricity rises to about 945 TWh in 2030 (base case) and about 1,200 TWh in 2035 — [IEA executive summary](https://www.iea.org/reports/energy-and-ai/executive-summary); [IEA news](https://www.iea.org/news/ai-is-set-to-drive-surging-electricity-demand-from-data-centres-while-offering-the-potential-to-transform-how-the-energy-sector-works); [S&P Global](https://www.spglobal.com/energy/en/news-research/latest-news/electric-power/041025-global-data-center-power-demand-to-double-by-2030-on-ai-surge-iea)
- IEA "Key Questions on Energy and AI" (Apr 2026): data-centre consumption doubles by 2030 and AI-focused data-centre use triples — [E&T](https://eandt.theiet.org/2026/04/22/iea-warns-ai-data-centre-electricity-use-will-triple-2030)
- IEA World Energy Outlook 2026 (19 Nov 2026): about 1,000 TWh by 2030 (STEPS), with AI about three-quarters of the increase. Grid investment is critical. Gas supplies about 60% of incremental US data-centre power; China's AI data centres run about half on coal — [CNBC](https://www.cnbc.com/2026/11/19/data-center-electricity-demand-iea.html); [StockAnalysis](https://stockanalysis.com/news/iea-world-energy-outlook-2026-data-centers/); [Tecshx](https://www.tecshx.com/news/iea-world-energy-outlook-2026-data-center-electricity-double-2030-gas-us). Different editions and scenarios are not strictly comparable.
- LBNL 2024 US Data Center Energy Usage Report (Dec 2024): 58 TWh (2014), 176 TWh (2023, about 4.4% of US electricity) and 325–580 TWh by 2028 (about 6.7–12%). The method is a bottom-up model from historical and projected server/GPU shipment data (incl. accelerator shipments), with power per unit, utilisation, PUE and cooling scenarios — [LBNL report PDF](https://eta-publications.lbl.gov/sites/default/files/2024-12/us_data_center_energy_usage_report_lbnl-2001637.pdf); [DOE release](https://www.energy.gov/articles/doe-releases-new-report-evaluating-increase-electricity-demand-data-centers). (The 6.7–12% share is from the report's executive summary, which I know from prior knowledge; the search snippet did not show it.)
- LBNL "2025 Update" (dated June 2026): data centres could reach 11.8% of total US electricity by 2030, using the same shipment-based bottom-up model — [DOE document](https://www.energy.gov/documents/united-states-data-center-energy-usage-report-2025-update); [LBNL record](https://eta-publications.lbl.gov/bibcite/reference/36976)
- Grid Strategies National Load Growth Report (2025): a 5-year US peak-load growth forecast of about 166 GW (versus 38 GW in the 2023 edition and 64 GW in 2024), of which about 90 GW (about 55%) is data centres. Energy grows about 5.7% a year and peak about 3.7% a year. The data-centre portion is likely overstated by about 25 GW due to developer double-counting across utilities. Six regions hold more than 80% of growth. The method aggregates FERC Form 714 and utility/ISO forecasts — [Grid Strategies report PDF](https://gridstrategiesllc.com/wp-content/uploads/Grid-Strategies-National-Load-Growth-Report-2025.pdf?stream=top); [project page](https://gridstrategiesllc.com/project/load-growth-forecast/); [Latitude Media](https://www.latitudemedia.com/news/one-us-load-growth-estimate-quadrupled-in-just-two-years/). An April 2026 update ("5-year demand growth forecast rises") exists, but its text was paywalled.
- Grid Strategies also published "Forecasting for Large Loads: Current Practices and Recommendations" (methods for discounting speculative large-load requests) — [Grid Strategies](https://gridstrategiesllc.com/?p=1846); see also [RMI on large-load forecast uncertainty](https://rmi.org/resources/planners-have-tools-to-manage-large-load-forecast-uncertainty-are-they-working/)
- Commentary that utility data-centre forecasts have climbed to "unreachable heights" — [Canary Media](https://www.canarymedia.com/articles/data-centers/data-center-power-forecasts-climb-to-unreachable-heights)
- McKinsey: about 219–220 GW of global data-centre capacity demand by 2030 (about 156 GW AI) — [McKinsey](https://www.mckinsey.com/featured-insights/week-in-charts/data-center-demands)
- Epoch-linked estimate: the largest 2030 training cluster at about 9 GW — [AI CERTs (secondary)](https://www.aicerts.ai/news/ai-supercomputer-economics-200b-build-cost-forecast-for-2030/)

### Inferences
- **Methods to forecast power available to data centres over five years:**
  - (i) Bottom-up from chips: units × TDP × overhead (about 1.3–1.5× for CPU, network and storage) × PUE, which is the LBNL approach.
  - (ii) Utility and ISO large-load forecasts, haircut for double-counting (the Grid Strategies approach; about 25 GW haircut on about 90 GW).
  - (iii) Supply side: queued generation with historical completion rates and lag, plus utility IRP and capex plans, plus behind-the-meter gas. A model should reconcile (i) with (ii) and (iii) to locate the binding constraint by region.
- IEA's 2030 number has barely moved (945 to about 1,000 TWh) across 2025–26, while US utility forecasts have quadrupled since 2023. That suggests either global bottom-up modellers expect supply constraints, or utility forecasts are speculative. Worth flagging as a key uncertainty.
- **Machine-readable power data likely usable (pointers from prior knowledge; NOT fetched this session):**
  - EIA Open Data API v2 (https://www.eia.gov/opendata/): retail sales by sector/state and Form 860M generator inventory incl. planned units.
  - LBNL "Queued Up" interconnection-queue dataset (https://emp.lbl.gov/queues): annual, Excel.
  - ISO queue files (PJM, ERCOT GIS report, MISO, CAISO, SPP), scrapeable via the open-source `gridstatus` Python library (https://github.com/gridstatus/gridstatus).
  - ERCOT large-load interconnection status reports.
  - FERC Form 714 (planning-area load forecasts).

### Gaps
- EPRI "Powering Intelligence" (2024) and any 2025–26 update, BloombergNEF data-centre outlooks, and ERCOT/PJM large-load queue totals (GW) were not retrieved due to the budget.
- No verified 2026 figures for ERCOT large-load requests or PJM load-forecast revisions.
- Utility capex plan aggregates (for example, EEI totals) were not retrieved.

## 4. Demand side: AI revenue, adoption surveys, token volumes and prices

### Takeaway
Demand is measurable with several public, partly machine-readable series. These include frontier-lab run-rates (Anthropic about $81B run-rate at 31 Oct 2026 per its IPO filing; OpenAI about $50–70B depending on definition), firm adoption (Ramp AI Index about 57% paid adoption, available on FRED; Census BTOS about 18–20%), and OpenRouter token volumes (about 25x Jan–Oct 2026). Token prices are falling fast but unevenly. Run-rate definitions differ materially between companies.

### Cited Findings
- Anthropic: about $81B run-rate revenue as of 31 Oct 2026 (amended IPO filing). Run-rate is defined from trailing-28-day consumption plus subscription fees. Revenue was $33.2B for 9M-2026, and Q3-2026 revenue about $17.0B (some outlets say $16.8B), which annualises to about $68B. The company reportedly listed on Nasdaq on 19 Nov 2026 — [24/7 Wall St](https://247wallst.com/investing/2026/11/11/anthropic-says-its-revenue-run-rate-jumped-to-an-81-billion-run-rate/); [ValueAdd VC](https://valueaddvc.com/blog/anthropic-revenue-run-rate-how-it-passed-openai). Secondary sources; verify against the S-1 on SEC EDGAR.
- OpenAI: quarterly revenue reportedly crossed $10B for the first time. Run-rate is about $50B (Bloomberg, excluding partner-booked revenue) versus about $70B (Axios, including it). Anthropic counts cloud-partner sales gross, whereas OpenAI reports only its share — [TechCrunch, 11 Nov 2026](https://techcrunch.com/2026/11/11/openais-quarterly-revenue-reportedly-crosses-10b-for-the-first-time/)
- Ramp AI Index (card/bill-pay data; share of businesses with a paid AI transaction in the month): 56.8% in Oct 2026 (55.8% Sept); Anthropic 44.8% versus OpenAI 40.6% of businesses — [Ramp AI Index](https://ramp.com/data/ai-index); [methodology](https://ramp.com/data/how-we-built-the-ramp-ai-index). It is published on FRED as series `RAMPAIALL` (overall) and `RAMPAISMB` (small business) — [FRED RAMPAIALL](https://fred.stlouisfed.org/data/RAMPAIALL); [FRED RAMPAISMB](https://fred.stlouisfed.org/data/RAMPAISMB)
- Census BTOS: AI use around 17–20% of firms from Dec 2025 to May 2026, with 19.8% nationally in May 2026. The question was revised in late 2025 to "any business function". Larger firms (20+ employees) use AI most — [Census, May 2026](https://census.gov/library/stories/2026/05/ai-use-businesses.html); [Census CES working paper 26-25](https://www.census.gov/library/working-papers/2026/adrm/CES-WP-26-25.html). The Fed puts adoption at about 18% of firms at end-2025 — [Fed FEDS Note, Apr 2026](https://www.federalreserve.gov/econres/notes/feds-notes/monitoring-ai-adoption-in-the-u-s-economy-20260403.html). Ramp argues Census undercounts — [Ramp](https://ramp.com/data/ai-index-january-2026)
- OpenRouter: the October 2026 recap shows token volume +37% m/m and about 25x since January 2026. Blended price per million tokens fell from $1.21 to $0.52 (closed-weight) and from $0.28 to $0.084 (open-weight); the period is unclear in the snippet — [OpenRouter Oct 2026 recap](https://openrouter.ai/data/october-2026). Weekly volume of about 25T tokens in May 2026 (secondary) — [Sesame Disk](https://sesamedisk.com/ai-inference-cost-trends-2026-3/). Chinese open models are gaining token share on OpenRouter — [Crypto Briefing](https://cryptobriefing.com/openrouter-us-models-token-share-collapse/)
- Token price declines: Epoch-based estimate of 9x to 900x a year at constant capability (median about 50x a year) — reported in [dev.to (secondary)](https://dev.to/yanoai/llm-inference-costs-halved-every-two-months-in-2026-what-the-stanford-ai-index-and-hierarchos-mean-1ge3). An arXiv paper (Mar 2026) using OpenRouter and Epoch data finds faster-than-Moore declines only in economy and mid-tier segments, with half-lives of 1.10 and 1.55 years — [arXiv 2603.28576](https://arxiv.org/html/2603.28576v1). YipitData finds only about 6% YTD 2026 decline in effective token prices, versus 39% in H2-2025 — [YipitData](https://www.yipitdata.com/resources/blog/cloud-llm-pricing-trends)

### Inferences
- Constant-quality price declines (Epoch-style, tens of times a year) and effective blended prices paid (YipitData, about 6% YTD) measure different things. Users shift to frontier and reasoning models with more tokens per task, so revenue = tokens × effective price, and effective price is falling slowly. The model should use effective price, not constant-capability price, to convert token demand into revenue and compute.
- Anthropic's Q3 actual revenue × 4 (about $68B) versus the $81B run-rate shows run-rates overstate trailing revenue by about 15–20% in a fast-growth regime. Normalise to reported GAAP revenue (now on EDGAR after the IPO) where possible.
- Ramp (paid adoption, a tech-skewed sample) and BTOS (self-reported use, representative) bracket adoption. Both are automatable: Ramp via the FRED API, BTOS via Census downloads (biweekly CSV at https://www.census.gov/hfp/btos/data, URL from prior knowledge).

### Gaps
- No verified token-volume data from first parties (Google's monthly tokens processed, Microsoft) was retrieved this session.
- No a16z "LLMflation" primary figure was retrieved.
- OpenAI GAAP financials are not public; only reported figures exist.

## 5. Export controls, China and sovereign AI demand

### Takeaway
Analysts estimate China demand as domestic accelerator supply (Huawei/Cambricon, constrained by SMIC capacity and HBM) plus whatever US chips are licensed. Estimates of Nvidia's China share range from 0% to 34%. Sovereign demand is mostly estimated project by project (announced GW or GPU orders), and market-research totals ($58B to $100B+) are weakly sourced.

### Cited Findings
- Nvidia shipped $2.4B of Hopper data-centre products to China in Q3 FY27, and its Q4 guidance assumes no China data-centre compute revenue — [Guru3D](https://www.guru3d.com/story/nvidia-q3-fy2027-usd-1158-billion-revenue-data-center-usd-1076-billion-usd-130-billion-q4/)
- H200 licences reportedly granted, but shipments "stalled in regulatory limbo" with no units shipped despite orders. This conflicts in part with the $2.4B Hopper figure above, which may be H20 or other Hopper parts — [Tom's Hardware](https://www.tomshardware.com/tech-industry/artificial-intelligence/huawei-could-seize-chinas-ai-chip-crown-in-2026-as-nvidias-h200-shipments-stall-in-regulatory-limbo-beijing-pushes-homegrown-ai-hardware-dominance-in-a-market-projected-to-hit-usd67-billion-by-2030)
- Nvidia's China AI-accelerator share: Jensen Huang said "zero" — [Tom's Hardware](https://www.tomshardware.com/tech-industry/huawei-expects-12-billion-in-ai-chip-revenue-this-year-as-nvidias-china-market-share-hits-zero). Bernstein puts it at about 8% (Huawei about 50%), while IDC puts it at 34% versus Huawei 28% as of June 2026 — [Yahoo Finance](https://finance.yahoo.com/markets/stocks/articles/market-nvidia-once-owned-slipping-211700421.html). The sources conflict.
- Huawei plans about 600k Ascend 910C units in 2026 (about double), and up to 1.6M dies across Ascend models — [Bloomberg](https://www.bloomberg.com/news/articles/2025-09-29/huawei-to-double-output-of-top-ai-chip-as-nvidia-wavers-in-china). CFR says Huawei's total 2026 AI compute is under 4% of Nvidia's, with no H200-class Huawei chip until late 2027 or 2028 — [CFR](https://cfr.org/articles/chinas-ai-chip-deficit-why-huawei-cant-catch-nvidia-and-us-export-controls-should-remain). HBM and fab capacity are the main Chinese bottlenecks — [Tom's Hardware](https://www.tomshardware.com/tech-industry/artificial-intelligence/chinas-chip-champions-ramp-up-production-of-ai-accelerators-at-domestic-fabs-but-hbm-and-fab-production-capacity-are-towering-bottlenecks); [Epoch AI](https://epoch.ai/publications/huaweis-roadmap-to-2031)
- TrendForce: China's high-end AI chip market grows more than 60% in 2026, with domestic suppliers taking about half. Morgan Stanley: the China AI chip market reaches about $67B by 2030 — [Tom's Hardware](https://www.tomshardware.com/tech-industry/artificial-intelligence/huawei-could-seize-chinas-ai-chip-crown-in-2026-as-nvidias-h200-shipments-stall-in-regulatory-limbo-beijing-pushes-homegrown-ai-hardware-dominance-in-a-market-projected-to-hit-usd67-billion-by-2030)
- Sovereign:
  - Stargate UAE (G42, OpenAI, Oracle, Nvidia, Cisco, SoftBank) brings its first 200 MW online in 2026 as part of a planned 5 GW campus — [SiliconANGLE](https://siliconangle.com/?p=787966) (snippet).
  - HUMAIN (Saudi PIF) reportedly ordered 600k Nvidia GPUs; UNVERIFIED — [Milk Road](https://milkroad.com/ideas/the-ai-arms-race-has-a-new-buyer/).
  - ABI Research: dedicated sovereign AI capacity grows from 1.3 GW (2026) to 3.1 GW (2031) — [ABI Research](https://abiresearch.com/blog/ai-data-center-demand-growth).
  - Analysys Mason: GCC accelerated AI data-centre investment of $5–7B in 2026 — [Analysys Mason](https://www.analysysmason.com/about-us/news/predictions-2026/prediction-ai-investment-gcc/).
  - Market-research totals of $58B (2025) for "sovereign AI infrastructure" are low quality — [GII/Meticulous](https://www.giiresearch.com/report/meti2165087-sovereign-ai-infrastructure-market-size-share.html).
  - PwC on GCC compute sovereignty and the risk of overcapacity or shortage — [PwC Strategy&](https://www.strategyand.pwc.com/m1/en/strategic-foresight/sector-strategies/technology/gcc-compute-sovereignty/gcc-compute-sovereignty.pdf); Deloitte TMT Predictions 2026 on tech sovereignty — [Deloitte](https://www.deloitte.com/us/en/insights/industry/technology/technology-media-and-telecom-predictions/2026/tech-sovereignty.html)

### Inferences
- **Recommended method:** model China as a separate supply-constrained block (SMIC 7/5nm wafer starts × dies per wafer × yield, capped by domestic and stockpiled HBM) plus a policy-scenario variable for US licensed exports (0 / H20-class / H200-class).
- Model sovereign demand from a project ledger (announced MW/GW, phase dates, chip orders), with a realisation haircut. ABI's 1.3 GW (2026) versus 5 GW-scale announced campuses shows a big gap between announcements and realised capacity.

### Gaps
- No current BIS rule text or 2026 export-control status (AI diffusion rule replacement, UAE/KSA licence volumes) was retrieved.
- I found no reliable aggregate for EU (AI gigafactories) or Japan sovereign compute in this session.

## 6. Public data sources that could feed a model automatically vs. manually

### Takeaway
Several key series are already API-accessible: FRED (incl. Ramp AI Index), SEC EDGAR XBRL (hyperscaler capex, Nvidia segment revenue), EIA API v2, Census BTOS and ISO queues (via gridstatus). Supply-chain capacity (CoWoS, HBM bits), private-lab revenue, sovereign project pipelines and analyst forecasts (IEA, LBNL, McKinsey, Epoch) require manual or semi-manual collection.

### Cited Findings
- Ramp AI Index on FRED (API-accessible): `RAMPAIALL`, `RAMPAISMB` — [FRED](https://fred.stlouisfed.org/data/RAMPAIALL)
- Census BTOS publishes AI-use results regularly — [Census](https://census.gov/library/stories/2026/05/ai-use-businesses.html)
- OpenRouter publishes monthly data recaps and public rankings — [OpenRouter](https://openrouter.ai/data/october-2026)
- LBNL/DOE data-centre reports (PDF; bottom-up tables) — [LBNL](https://eta-publications.lbl.gov/publications/2024-lbnl-data-center-energy-usage-report)
- Grid Strategies load-growth reports (PDF) — [Grid Strategies](https://gridstrategiesllc.com/project/load-growth-forecast/)

### Inferences
- **Automatable (endpoints from prior knowledge; not fetched this session, so verify):**
  - SEC EDGAR XBRL APIs (`https://data.sec.gov/api/xbrl/companyconcept/...` and `/frames/`) for `PaymentsToAcquirePropertyPlantAndEquipment` (MSFT, GOOGL, AMZN, META, ORCL) and Nvidia segment revenue. Segment detail may need parsing of the filing, since custom tags are not always standard.
  - FRED API (https://fred.stlouisfed.org/docs/api/fred/) for Ramp, interest rates and the PPI for semiconductors.
  - EIA API v2 (https://www.eia.gov/opendata/) for electricity sales and the Form 860M planned generators.
  - `gridstatus` for ISO queues and load.
  - LBNL Queued Up (annual Excel).
  - Census BTOS CSVs.
  - OpenRouter rankings and recaps (scrape).
  - Epoch AI datasets (CSV downloads, if epoch.ai is reachable).
  - Korea customs export data (monthly semiconductor/memory exports; a proxy for HBM shipments) and Taiwan monthly revenue disclosures (TSMC, ASE). These are useful high-frequency proxies.
- **Manual:** CoWoS/HBM capacity (analyst notes, earnings calls), private company revenue (press, S-1s), capex guidance ranges (earnings calls; XBRL only gives actuals), sovereign/neocloud project ledgers, export-control policy, and IEA/McKinsey/Bain scenario numbers.

### Gaps
- None of the API endpoints listed under Inferences was tested in this session, and epoch.ai is network-blocked here. A follow-up should confirm endpoint availability and the XBRL tags for capex and segment revenue.
