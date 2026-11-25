# Credit-Risk, Default and Financial Contagion Models for the AI Infrastructure Buildout (2026–2030)

> Research note, written 2026-11-25. **How the evidence was gathered:** the session's network blocked direct page fetches for cnbc.com, kbra.com and imf.org. Market and agency facts below therefore come from search-engine result summaries of the cited pages, not from reading the full pages. Treat exact basis-point and dollar figures as "reported, unverified" unless the cite is a primary filing (SEC, Meta newsroom, Fed). Classic academic references (Merton, Black-Cox, Leland, Jarrow-Turnbull, Duffie-Singleton, Eisenberg-Noe, DebtRank, Furfine, fire-sale papers, BoE SWES) are cited by DOI or official URL from background knowledge and were not re-fetched in this session. They are long-established and stable.

---

## 1. Structural vs. reduced-form vs. credit-scoring models: strengths, failure modes, data needs, and which work on public data for mostly private firms

### Takeaway
No single model family fits the whole AI-economy universe.
- **Public, equity-traded names** (Oracle, CoreWeave, Nebius, Nvidia, Meta, Microsoft): a Merton/KMV-style distance-to-default (DD), cross-checked against CDS-implied hazard rates. Oracle and CoreWeave CDS are now liquid and widening.
- **Private labs** (OpenAI, xAI, Anthropic): a cash-flow-based structural "liquidity runway" model. Firm value is replaced by revenue minus fixed obligations, and default happens when cash plus committed funding falls below contractual payments. Funding-round valuations serve only as a weak proxy for asset value.
- **SPVs**: modelled as project-finance cash-flow waterfalls (see section 2), not as firms.

The simulation should convert every approach into a quarterly hazard rate so the network layer (section 3) can use a common currency.

### Cited Findings
**Market-implied credit signals (late 2026)**
- Oracle 5-year CDS reached a record ~356 bp around 24–25 Nov 2026 (S&P Global Market Intelligence data), up from below 80 bp a year earlier. Oracle shares fell ~8% to a 52-week low. Figures vary slightly by outlet (355.68 vs 356). — [BigGo Finance](https://finance.biggo.com/news/327572f9-1422-43d5-98bb-b93416d5648b); [CNBC 24 Nov 2026](https://cnbc.com/2026/11/24/nvidia-jensen-huang-ai-credit-markets.html) (summary only; fetch blocked); [Disruption Banking](https://www.disruptionbanking.com/2026/11/25/why-are-ai-credit-default-swaps-hitting-record-spreads/)
- An earlier report put Oracle's record at 288 bp, so the spread has been on a widening path through 2026. — [Securitas Global](https://www.securitasglobal.com/risk-perspectives/oracle-cds-record-288-basis-points-ai-debt/)
- CoreWeave 5-year CDS was reported at ~1,314 bp, "distressed territory", with an implied 5-year default probability of ~68%. CNBC earlier put it at ">1,200 bp". One account puts the CoreWeave 2031 bond yield near 18%. Oracle is investment grade and CoreWeave is high yield. — [Disruption Banking](https://www.disruptionbanking.com/2026/11/25/why-are-ai-credit-default-swaps-hitting-record-spreads/); [CNBC 18 Nov 2026](https://www.cnbc.com/2026/11/18/ai-credit-default-swaps-coreweave-debt.html) (summary only)
- Tuttle Capital and Defiance have filed for ETFs that would use CDS to profit from wider spreads on CoreWeave and Oracle. Saba Capital has reportedly been selling CDS protection on big-tech names including Oracle, so the market is split. — [CNBC 18 Nov 2026](https://www.cnbc.com/2026/11/18/ai-credit-default-swaps-coreweave-debt.html); [Lex Substack](https://lex.substack.com/p/ai-oracles-credit-default-swaps-and)

**Contract-concentration data for private-firm modelling**
- OpenAI has ~$1.4T of multi-year committed compute spending over roughly eight years, described as "nameplate" value. Named contracts: Oracle $300B, Microsoft $250B, Amazon $38B, CoreWeave $22.4B. — [Yahoo Finance](https://finance.yahoo.com/news/openai-is-the-2025-yahoo-finance-company-of-the-year-120054312.html)
- WSJ (April 2026) reported that OpenAI missed internal sales targets and was debating whether revenue could support its commitments. This is a secondary relay of WSJ and needs verification. — [tech-insider.org](https://tech-insider.org/openai-revenue-miss-friar-altman-stargate-2026/)
- HSBC reportedly estimates a ~$207B OpenAI funding gap by 2030. This is secondary and the HSBC original was not found. — [newmarketpitch](https://newmarketpitch.com/blogs/news/ai-infrastructure-openai-data-center-financing)
- More than $300B of Oracle's $553B remaining performance obligations (RPO) reportedly comes from OpenAI. — [Inc./Fast Company](https://inc.com/fast-company-2/oracle-ai-boom-hidden-debt-nvidia-jensen-huang/91357055)
- CoreWeave revenue backlog (primary SEC filings): $99.4B at 31 Mar 2026; ~$104B at 30 Jun 2026; ~$132.5B reported at 30 Sep 2026. In Q1 2026 CoreWeave said commitments from non-investment-grade AI-native companies and labs were "<30%" of backlog. — [CoreWeave Q2'26 8-K](https://www.sec.gov/Archives/edgar/data/0001769628/000176962826000362/coreweave2q26earningspress.htm); [CoreWeave 2026 convert presentation 8-K](https://www.sec.gov/Archives/edgar/data/0001769628/000176962826000429/crwv2026convertpresentat.htm); [CoreWeave Q1'26 call](https://s205.q4cdn.com/133937190/files/doc_financials/2026/q1/CoreWeave-Inc-CRWV-US-Q1-2026-Earnings-Call-7-May-2026-5_00-PM-ET.pdf)

**Model families (canonical literature, background knowledge, not re-fetched)**
- **Merton (1974).** Equity is a call option on firm assets, and default happens at debt maturity if assets fall below face value. Inputs are equity value, equity volatility and the debt face value, which makes it usable for listed firms with public balance sheets. Known failure mode: it underpredicts short-horizon spreads. — [Merton 1974, J. Finance](https://doi.org/10.1111/j.1540-6261.1974.tb03058.x)
- **Black-Cox (1976).** First-passage (barrier) default at any time, which captures covenant-style or safety-covenant triggers. — [Black & Cox 1976, J. Finance](https://doi.org/10.1111/j.1540-6261.1976.tb01997.x)
- **Leland (1994).** Endogenous default barrier chosen by equity holders, plus tax shields and bankruptcy costs. Useful for asking "when would shareholders stop funding". — [Leland 1994, J. Finance](https://doi.org/10.1111/j.1540-6261.1994.tb04776.x)
- **KMV / Moody's EDF.** Uses distance-to-default = (ln V − ln D*)/σ_V, where D* ≈ short-term debt + ½ long-term debt. DD is then mapped to an empirical default frequency from a proprietary default database. The mapping table is proprietary. Moody's RiskCalc covers private firms using financial-statement ratios, but those statements are not public for OpenAI or xAI. (Background knowledge; see Crosbie & Bohn, "Modeling Default Risk", Moody's KMV 2003.)
- **Reduced-form models.** Jarrow-Turnbull (1995) and Duffie-Singleton (1999) treat default as the first jump of a Poisson/Cox process with intensity λ(t). Calibrated directly from CDS or bond spreads: λ ≈ spread / (1 − recovery). They fit prices well but explain nothing about causes, and contagion has to be added via intensity jumps (Jarrow-Yu 2001). — [Jarrow & Turnbull 1995](https://doi.org/10.1111/j.1540-6261.1995.tb05167.x); [Duffie & Singleton 1999, RFS](https://doi.org/10.1093/rfs/12.4.687); [Jarrow & Yu 2001, J. Finance](https://doi.org/10.1111/0022-1082.00391). Textbooks: Lando, *Credit Risk Modeling* (Princeton UP, 2004); Duffie & Singleton, *Credit Risk* (Princeton UP, 2003).
- **Credit scoring (Altman Z, Ohlson O, logit hazard models such as Shumway 2001 and Campbell-Hilscher-Szilagyi 2008).** Needs audited financial ratios. Calibrated on mature-industry histories and badly suited to hyper-growth, loss-making firms with contracted backlogs. — [Shumway 2001, J. Business](https://doi.org/10.1086/209665); [Campbell, Hilscher & Szilagyi 2008, J. Finance](https://doi.org/10.1111/j.1540-6261.2008.01416.x)

### Inferences
**Recommended model by firm type**

| Firm type | Recommended approach | Data available (public) | Failure mode to watch |
|---|---|---|---|
| Listed IG (Oracle, Meta, MSFT, Nvidia) | Merton/KMV DD plus CDS-implied λ as cross-check | Equity price/vol, 10-Q debt, RPO, CDS quotes | DD understates risk when off-balance-sheet leases and SPV guarantees are excluded from D*. Add capitalised lease and guarantee obligations to D*. |
| Listed HY/neocloud (CoreWeave, Nebius) | Reduced-form λ from CDS/bonds, plus a structural cash-runway check | CDS (~1,300 bp CRWV), bond yields, backlog, DDTL schedules | Market λ already embeds contagion fears, so do not double-count network contagion on top of it. Use the structural model for scenario paths and the CDS level as the calibration anchor. |
| Private labs (OpenAI, xAI, Anthropic) | Cash-flow structural model: default when cash + committed equity + committed debt < contractual compute payments due in the quarter (Black-Cox barrier on liquidity, not asset value) | Reported revenue run-rates, funding rounds, disclosed contract sizes ($1.4T OpenAI) | Valuation-based "firm value" is circular because equity marks come from the same counterparties (Nvidia, MSFT). Model the funding-market-closure probability explicitly as a regime switch. |
| SPVs (Hyperion, Valor/xAI, GPU ABS) | Project-finance DSCR waterfall (section 2) | Offering summaries, rating press releases | Tenant concentration: the SPV defaults almost exactly when the tenant does, unless a guarantor pays. |

- **Calibrating hazards.** Implied annual hazard ≈ CDS / (1 − R). With R = 40%: CoreWeave at ~1,300 bp gives λ ≈ 22%/yr, so a 5-year cumulative PD ≈ 1 − e^(−1.08) ≈ 66%, consistent with the reported ~68%. Oracle at ~356 bp gives λ ≈ 5.9%/yr, a 5-year PD of ~26% risk-neutral. Risk-neutral PDs are typically 2–3x physical PDs for IG credits, so the browser model should expose a "risk premium haircut" slider rather than using CDS PDs as real-world probabilities. (Inference; the 2–3x ratio is a widely cited literature regularity, not verified this session.)
- **Firm value for private labs.** A practical public-data definition is V_t = PV(expected net revenue) + cash + undrawn committed funding. D_t = PV of non-cancellable compute commitments + debt. The volatility of V comes from the scenario engine's demand paths, not from equity prices. This makes the default model endogenous to the demand forecast, which is the point of the simulation.

### Gaps
- No public, audited financial statements exist for OpenAI or xAI. Revenue, cash and burn figures are press-reported, so any structural model is assumption-driven.
- No public EDF or RiskCalc outputs for these names were found. Moody's KMV mappings are proprietary.
- OpenAI's 2026 actual revenue was not found from a primary source.
- The exact termination and cancellation terms of the OpenAI–Oracle and OpenAI–Microsoft contracts (take-or-pay vs. cancellable) were not found. This matters enormously for the default barrier.

---

## 2. Project finance, SPV and asset-backed default modelling with depreciating collateral (GPUs; aircraft, shipping and equipment ABS analogies); rating-agency methodologies 2024–2026

### Takeaway
Agencies have not built a GPU-specific methodology. They are stretching existing frameworks:
- **Data-centre ABS** (KBRA Data Center ABS Global methodology; Moody's Feb-2025 methodology; Fitch final criteria Sep 2025) sizes debt off sustainable net cash flow, with stressed tenant default and re-leasing assumptions.
- **GPU-lease deals** (e.g. KBRA's A- preliminary rating on $29.6B of SpaceX/xAI GPU-lease notes, Nov 2026) lean on tenant or guarantor credit and recurring contracted revenue. Residual GPU value is treated as a stressed, haircut secondary source.

The core modelling challenge is a "dual-default / wrong-way" structure. The SPV fails when the tenant fails, and that is also when GPU resale values are lowest. This is the aircraft-ABS problem (airline failure coinciding with aircraft-value troughs) on a 3–6-year rather than 25-year asset life.

### Cited Findings
**Rating-agency methodologies**
- KBRA has published a Data Center ABS Global Rating Methodology, preceded by a proposed version with a comment period. It first estimates a KBRA sustainable net cash flow (KNCF) for the securing properties. KNCF is the base for asset-liability scenario analyses, with tenant-default and lease-renewal stresses scaled to rating category. — [KBRA methodology release](https://www.kbra.com/publications/DJRqYcWm/kbra-releases-data-center-abs-global-rating-methodology?format=web); [KBRA proposed methodology](https://www.kbra.com/publications/SFXMrrxW/kbra-releases-proposed-data-center-abs-global-rating-methodology?format=web)
- Moody's issued a data-centre securitisation methodology in February 2025. It evaluates net cash flows from tenant lease payments, covering lease renewals, tenant default risk and location. One source reports Moody's first Aaa on a data-centre securitisation, an $830M Compass deal. — [Asset Securitization Report](https://asreport.americanbanker.com/news/moodys-issues-ratings-methodology-for-data-center-abs); [Crane Frontier](https://cranefrontier.substack.com/p/data-center-abs-by-the-numbers)
- Fitch released an exposure draft for data-centre securitisation criteria in July 2025 and final criteria on 16 Sep 2025. No GPU-useful-life content was confirmed. A search-summary claim that Fitch opened a consultation on GPU depreciation could **not** be verified and should be treated as unconfirmed. — [Linklaters SSFH 2026](https://edge.sitecorecloud.io/linklaterslbf57-linklatersx7ccc-linklatersxf9f5-394d/media/digital-marketing-image-library/files/06_ckp/2025/october/ssfh-2026-linklaters.pdf)
- KBRA research, "AI Compute Infrastructure: Cross-Sector Credit Considerations for GPU-, TPU-, and Accelerator-Intensive Assets". Key considerations: cash-flow durability, contract structure, power costs, refresh requirements, residual value and re-leasing. Data-centre shells and compute equipment depreciate on different timelines. — [KBRA cross-sector research](https://www.kbra.com/publications/KPZcbgKd/ai-compute-infrastructure-cross-sector-credit-considerations-for-gpu-tpu-and-accelerator-intensive-assets?format=web)
- KBRA research, "AI Compute Financings: Evaluating Re-Leasing Risk for GPUs and TPUs" (22 Jun 2026). It frames four end-of-contract scenarios: contract maturity, extension, replacement customer, and refresh. A cluster's economic relevance can decline much faster than its physical life. KBRA's Giudici is quoted as saying custom TPUs carry more re-leasing risk than Nvidia GPUs, which implies deeper haircuts for TPUs. — [KBRA re-leasing research](https://www.kbra.com/publications/BhxpJMrf/ai-compute-financings-evaluating-re-leasing-risk-for-gpus-and-tpus?format=web); [Business Wire release](https://www.businesswire.com/news/home/20260622424890/en/); [Haircut Substack](https://nodiligence.substack.com/p/who-carries-the-gpu-depreciation)
- On 16 Nov 2026, KBRA assigned preliminary A- ratings to ~$29.6B of notes backed by a SpaceX lease of Nvidia GPUs. The stressed scenarios consider technological obsolescence and uncertain realisable GPU value. The expected end-of-lease chip value was not disclosed. — [FourWeekMBA](https://fourweekmba.com/ai-kbra-rates-29-6b-of-spacex-gpu-notes-a-flags-obsolescence/) (secondary)
- Commentary claims agencies priced recurring hyperscaler revenue, not secondary-market GPU liquidation value, as primary credit support. Single commentary source, plausible but unverified. — [Julien Simon blog](https://www.julien.org/blog/industry-perspectives/2026-02-20_two-markets-one-asset-the-gpu-debt-market-is-building-the-architecture-of-its-own-crisis/)
- Charles River Associates (Dec 2025) published a data-centre ABS risks, yields and ratings note. — [CRA Insights PDF](https://media.crai.com/wp-content/uploads/2025/12/03163400/Insights-Data-center-ABS-%E2%80%93-Risks-yields-and-ratings-December2025.pdf)
- SEC staff (29 Jul, reported) agreed that data-centre securitisation sits outside Dodd-Frank risk retention, on the view that data centres are not self-liquidating assets. The letter has no legal force. — [The Next Web](https://thenextweb.com/news/sec-data-centre-securitisation-nvidia-500bn-dodd-frank)
- GPU securitisation structures are "nascent" and have not converged on a standard model. — [Pillsbury](https://www.pillsburylaw.com/en/news-and-insights/financing-compute-legal-risks-opportunities-gpu-asset-class.html)
- CRE Finance Council data-centre e-primer (Feb 2026) is a background reference for CMBS/ABS data-centre structures. — [CREFC primer](https://www.crefc.org/common/Uploaded%20files/Learn/DataCenters-eprimer-2026.02.25.pdf)

**Hyperion SPV (Meta / Blue Owl)**
- Meta's JV with Blue Owl funds (80% Blue Owl / 20% Meta) develops the Hyperion campus. Meta provides a residual value guarantee for the first 16 years: a capped cash payment based on campus value if conditions are met after lease non-renewal or termination. — [Meta newsroom, Oct 2025](https://about.fb.com/news/2025/10/meta-blue-owl-capital-develop-hyperion-data-center/)
- The ~$27.3B Hyperion bond is rated A+ by S&P (single agency), resting on Meta's backing rather than Blue Owl's BBB- rating. It was priced at ~6.58% yield (reported coupon 6.581%), ~225 bp over Treasuries, one notch below Meta's AA-. S&P reportedly said Meta's AA- would be unchanged even if Hyperion were consolidated. These are secondary reports; the S&P action itself was not read. — [Fortune](https://fortune.com/2025/10/31/metas-27-billion-bet-turns-ai-compute-into-wall-streets-hottest-new-investment/); [IFR](https://www.ifre.com/ifr-awards/2340435/the-metablue-owl-deal-broken-down-off-balance-sheet-gymnastics-24-years-after-enron); [FourWeekMBA](https://fourweekmba.com/ai-hyperions-27-3b-bond-pays-6-581-above-every-meta-note/)

**xAI GPU SPV (Valor)**
- The October 2025 proposal was a ~$20B package. A Valor SPV would buy Nvidia chips and lease them to xAI with a purchase option, funded by ~$7.5B equity (up to $2B from Nvidia) and ~$12.5B debt (Apollo, Diameter). The SPV pays for chips only, not power or shell. — [Yahoo Finance](https://finance.yahoo.com/news/elon-musk-xai-raise-20-124933356.html); [Invezz](https://invezz.com/news/2025/10/08/elon-musks-xai-secures-20b-boost-as-nvidia-apollo-and-valor-back-data-centre-expansion/)
- Apollo said its funds led $3.5B of a ~$5.4B compute deal arranged by Valor to lease hardware to xAI. The final total structure does not reconcile with the $20B headline. — [Yahoo Finance (Apollo/xAI)](https://finance.yahoo.com/news/apollo-xai-near-3-4-141209518.html)

**GPU residual value and depreciation evidence**
- H100 1-year rental contracts rose ~40%, from a low of $1.70/hr/GPU (Oct 2025) to $2.35/hr (Mar 2026), per SemiAnalysis's H100 rental index. — [SemiAnalysis](https://newsletter.semianalysis.com/p/the-great-gpu-shortage-rental-capacity?open=false)
- The Ornn H100 index spiked in early May 2026 (~$2.94 on 25 May), slid, then was reported near ~$3.17 on 7 Sep 2026. Dates in the secondary sources are inconsistent. — [Crypto Briefing](https://cryptobriefing.com/h100-rental-prices-slide-ornn-ai/); [KuCoin flash](https://www.kucoin.com/news/flash/nvidia-h100-gpu-rental-prices-drop-after-may-surge); [Xenospectrum](https://xenospectrum.com/en/a16z-gpu-rental-premium-ornn-index/)
- Reported residual-value rates: H100 ~40%, A100 ~16%, V100 <10% (secondary). Reported LTVs for current-gen GPU loans backed by multi-year creditworthy contracts are 50–70%. — [Haircut Substack](https://nodiligence.substack.com/p/who-carries-the-gpu-depreciation); [AltStreet explainer](https://altstreet.investments/reference/mechanics/gpu-securitization)
- An Nvidia lease structure reportedly guarantees leased chips retain at least 25% of value through the lease term. Single secondary source; treat as unverified. — [Haircut Substack](https://nodiligence.substack.com/p/who-carries-the-gpu-depreciation)
- Amazon shortened server/GPU useful life from 6 to 5 years (Q1 2025, ~$700M hit). Meta moved most servers and network assets to 5.5 years from Jan 2025. Michael Burry argued (Nov 2025) that real economic life is 2–3 years. — [Spheron](https://www.spheron.network/blog/gpu-depreciation-in-2026-how-fast-h100s-and-h200s-lose-value/); [FourWeekMBA](https://fourweekmba.com/ai-nvidia-gpu-depreciation-durability-debate-huang-2026/); [Hashrate Index](https://hashrateindex.com/blog/used-gpu-market-pricing-deprecation-secondary-ai/)

### Inferences
**SPV default engine (per SPV, per quarter, per Monte Carlo path)**
1. **Cash in:** contracted lease payment × P(tenant pays). Tenant default state comes from the firm-level model in section 1.
2. **Cash out:** senior interest + amortisation (+ opex if the SPV bears power, which the Valor SPV reportedly does not).
3. **Coverage:** DSCR_t = CashIn / DebtService. A breach of a covenant (typically ~1.1–1.3x in project finance; actual covenants not disclosed) triggers cash sweep or default.
4. **On tenant default:** the lender recovers min(Debt, Guarantee payout + λ_re-lease × Collateral value_t − remarketing cost), where:
   - Collateral value_t = Cost × RV(age, gen_gap, rental_index_t). RV is a depreciation curve whose decay rate is linked to the simulated rental price index. This makes it wrong-way: low demand gives low rental prices, which gives low RV, which gives low recovery.
   - The guarantee (e.g. Meta RVG capped; Nvidia backstop) pays only if the guarantor itself is solvent in that path. This is the double-default (Basel "double default" framework) link.
5. **Aircraft-ABS analogy.** Aircraft ABS rating approaches (base value × age-based depreciation, then a market-value decline stress at downturn timing, plus re-lease lag months and repossession cost) map directly onto GPUs, with three changes: asset life compressed roughly 5x, a "generation gap" factor (H100→B200→Rubin) replacing vintage, and power or site availability as a second collateral layer. This is a background-knowledge analogy; Moody's, S&P and KBRA aircraft ABS methodologies were not fetched this session.
6. **Two-layer collateral.** Model the data-centre shell (15–25 year life, KBRA KNCF-style) separately from compute (3–6 year life, steep RV curve). Hyperion-type deals are mostly shell plus a hyperscaler lease plus RVG. Valor/xAI-type deals are mostly compute.
7. **Calibration anchors:**
   - Initial LTV 50–70%.
   - Residual values ~40% at about 2–3 years for H100-class and ~16% for A100-class. Rough implied annual decay of ~25–35%/yr in normal markets; stress cases should allow 50%+ drops if rental prices collapse.
   - Hyperion spread ~225 bp at A+ implies the market priced little standalone SPV risk. Model it as Meta-risk plus a small structural spread.

### Gaps
- KBRA's actual haircut tables, re-leasing lag assumptions and rating-stress RV curves for GPUs were not accessible (kbra.com blocked; summaries lack numbers).
- No Moody's, S&P or Fitch GPU-specific (as opposed to data-centre property) methodology was confirmed.
- The Meta RVG cap amount and the Hyperion lease term details (renewal options, 4-year initial term vs. 16-year RVG) are not quantified in the sources retrieved.
- The final structure, size and Nvidia equity in the Valor/xAI SPV are not confirmed by a filing.
- No public loan-level performance or default data exists yet for GPU-backed loans. The asset class has no default history, which is a key calibration gap.

---

## 3. Network contagion models (Eisenberg-Noe, DebtRank, Furfine, fire sales; Fed/ECB/BoE system-wide methods) and clearing a ~40-firm counterparty network each quarter

### Takeaway
A quarterly Eisenberg-Noe (EN) clearing step on a ~40-node liability matrix of contractual payments due that quarter is the right core. Use Rogers-Veraart bankruptcy costs so that defaults destroy value; without them EN understates contagion. Augment it with:
- a DebtRank-style equity-valuation channel for non-default distress (Nvidia's equity stakes, mark-to-market losses);
- a simple fire-sale channel for GPU collateral prices (Cifuentes-Ferrucci-Shin / Greenwood-Landier-Thesmar style price impact), which feeds back into SPV recoveries.

The new academic benchmark is Van Nieuwerburgh & Su, "Clouds of Credit" (NBER WP 36032, 2026). They find that suppressing contractual payment spillovers among key AI firms cuts private losses by ~30%, i.e. material network amplification. The BIS (Drehmann & Eren) finds spillovers limited so far.

### Cited Findings
**AI-network-specific studies and official sector work**
- Van Nieuwerburgh & Su, NBER WP 36032 (2026), "Clouds of Credit: Mapping the Financial Web Behind AI Compute". Findings: large equity cushions protect creditors against mid-2026 obligations, but concentrated exposures and interconnected claims create weak links. Removing contractual payment spillovers reduces private losses by ~30%. Their calibrated model "supports a large compute expansion". The full methodology (whether EN-style) was not confirmed; only the abstract was seen. — [NBER w36032](https://www.nber.org/papers/w36032)
- BIS Bulletin No. 140, "Building AI: credit structures and spillovers" (Drehmann & Eren): spillovers so far limited, but sustained issuance at the current pace could change this. — [BIS Bulletin 140](https://www.bis.org/publications/bulletin-140-building-ai-credit-structures-and-spillovers.pdf)
- Related 2026 work: Chicago Booth Fama-Miller working paper "The AI Infrastructure Debt Complex"; VoxEU "AI and a wave of debt"; Columbia Business School commentary. Contents not reviewed. — [Chicago Booth WP](https://www.chicagobooth.edu/research/fama-miller/finance-research/working-papers/2026/the-ai-infrastructure-debt-complex); [VoxEU/CEPR](https://cepr.org/voxeu/columns/financing-ai-buildout-risks-go-balance-sheet); [Chicago Booth Review](https://www.chicagobooth.edu/review/2026/august/how-worried-should-we-be-about-ai-debt); [Columbia](https://business.columbia.edu/insights/financial-risk-hiding-inside-ai-boom)
- A 2026 preprint on AI compute credit derivatives builds on Eisenberg-Noe and calibrates to the 2025–26 Nvidia–OpenAI–Oracle "Stargate" loop. — [Preprints.org 202607.0884](https://www.preprints.org/manuscript/202607.0884)
- Bloomberg (Jan 2026) mapped AI "contagion channels" to banks, pension funds and consumers. Paywalled; headline only. — [Bloomberg](https://www.bloomberg.com/news/articles/2026-01-21/ai-contagion-channels-show-huge-economic-risk-if-bubble-bursts)

**Fed Financial Stability Report (13 Nov 2026)**
- AI was the most-cited risk, by 87% of survey respondents (up from 50% in May). Largest US BHCs have close to $1T of exposure to large tech firms, data-centre developers, advanced-computing SPEs and private-credit vehicles, and utilities. The Fed flags "complex interlinkages among firms engaged in the data center buildout, public credit markets, private lenders, and special purpose financing vehicles". Private deals make total debt "more difficult to measure". Reported figures: AI-linked borrowing ~5x the $130B issued in 2023; >$680B issued in the first ten months of 2026; >$1.1T outstanding public debt tied to advanced computing. These measure different things and should not be summed. Figures come from secondary coverage; the PDF was not read in full. — [Fed FSR Nov 2026 PDF](https://www.federalreserve.gov/publications/files/financial-stability-report-20261113.pdf); [American Banker](https://www.americanbanker.com/news/fed-warns-of-financial-risks-from-ai-driven-market-optimism); [FourWeekMBA](https://fourweekmba.com/ai-fed-cites-super-intelligence-enthusiasm-1t-bank-exposure/); [Coinpaper](https://coinpaper.com/38834/fed-warns-ai-debt-surges-to-680-b-as-data-center-boom-raises-financial-crisis-risks)

**IMF Global Financial Stability Reports (2026)**
- October 2026 GFSR (released 13 Oct): an AI market correction is one of three salient risks. Hyperscalers' share of global IG bond issuance rose from <1% to ~10% since 2024. The IMF recommends capital and concentration requirements on bank exposures to AI and private credit. — [IMF blog Oct 2026](https://www.imf.org/en/blogs/articles/2026/10/12/global-financial-markets-face-rising-risks-from-ai-bond-yields-and-cyberattacks) (summary only; fetch blocked)
- April 2026 GFSR: a sharp AI capex retrenchment plus procyclical credit tightening could expose data-centre lenders to refinancing risk. Average private-credit fund exposure to AI is modest but growing rapidly. $2.9T of data-centre capex through 2028 assumes ~$800B of private bilateral credit (illustrative, not a forecast). — [IMF GFSR Apr 2026 ch.1](https://www.imf.org/-/media/files/publications/gfsr/2026/april/english/ch1.pdf); [IMF GFSR Apr 2026 full text](https://www.imf.org/-/media/files/publications/gfsr/2026/april/english/text.pdf)
- The IMF reportedly flagged $950B of equity and debt tied to $1.4T of revenue promises (circular financing). Secondary source. — [Wall Street Times](https://wallstreettimes.com/imf-flags-ai-circular-financing-as-a-market-correction-risk-with-950-billion-in-equity-and-debt-tied-to-1-4-trillion-in-revenue-promises/)

**Canonical contagion literature (background knowledge, DOIs)**
- Eisenberg & Noe (2001). Clearing vector p* = min(p̄, e + Πᵀp*) via a fixed point. Unique under mild conditions. "Fictitious default" algorithm converges in ≤ n rounds. — [Management Science 47(2)](https://doi.org/10.1287/mnsc.47.2.236.9835)
- Rogers & Veraart (2013). Adds default costs (fractions α on outside assets and β on interbank claims recovered), which can create large contagion amplification. — [Management Science 59(4)](https://doi.org/10.1287/mnsc.1120.1569)
- Glasserman & Young (2015). Network amplification in EN without bankruptcy costs is often small relative to direct shocks, so contagion matters mainly with default costs, fire sales or concentration. — [J. Banking & Finance 50](https://doi.org/10.1016/j.jbankfin.2014.02.006)
- Battiston et al. (2012), DebtRank. Distress propagates in proportion to equity losses before default. The original paper ran on the Fed emergency-loan network. — [Scientific Reports 2:541](https://doi.org/10.1038/srep00541)
- Furfine (2003). Sequential default simulation on exposure matrices (fed funds). The simplest "domino" algorithm. — [J. Money, Credit & Banking 35(1)](https://doi.org/10.1353/mcb.2003.0004)
- Fire sales: Cifuentes, Ferrucci & Shin (2005) on mark-to-market plus asset-price feedback; Greenwood, Landier & Thesmar (2015) on linear price impact and the "vulnerable banks" metric. — [JEEA 3(2-3)](https://doi.org/10.1162/jeea.2005.3.2-3.556); [J. Financial Economics 115(3)](https://doi.org/10.1016/j.jfineco.2014.02.008)
- Bank of England System-Wide Exploratory Scenario (SWES), final report Nov 2024. Banks and non-banks (insurers, funds, LDI, hedge funds, CCPs) simulated jointly under a market shock to capture second-round liquidity and fire-sale dynamics. It is a participant-submitted, multi-round exercise, not a closed-form model. — [BoE SWES final report](https://www.bankofengland.co.uk/financial-stability/boe-system-wide-exploratory-scenario-exercise/boe-swes-exercise-final-report)

### Inferences
**Quarterly clearing algorithm for ~40 nodes**

*Node set (≈40).*
- Labs: OpenAI, Anthropic, xAI, Meta-AI, Google DeepMind.
- Clouds and neoclouds: Oracle, Microsoft, AWS, Google Cloud, CoreWeave, Nebius, Crusoe, Lambda.
- SPVs: Hyperion JV, Valor/xAI SPV, Stargate/Abilene project cos, Ohio SB Energy campus, CoreWeave DDTL SPVs.
- Suppliers: Nvidia, AMD, Broadcom, TSMC, SK Hynix/Micron, power/utilities.
- Financiers: Blue Owl, Apollo, Blackstone/other private-credit pools, a bank-syndicate aggregate, bond-market aggregate, SoftBank.

*Liability matrix L_ij(t).* Contractual cash due from i to j in quarter t:
- compute or lease payments (lab → cloud);
- lease payments (cloud → SPV);
- debt service (SPV/firm → lender);
- chip purchase installments (cloud → Nvidia).

Build it from disclosed contract sizes spread over contract tenors, e.g. OpenAI→Oracle $300B over ~5 years.

*Per-quarter, per-path steps.*
1. **External cash e_i(t):** end-user revenue (from the demand model), plus new equity or debt raised (subject to a funding-market regime state), plus starting cash.
2. **Clear with EN/Rogers-Veraart:** p* = min(p̄, α·e + β·Πᵀp*). Solve by fixed-point iteration or the fictitious-default algorithm, which needs ≤40 rounds and in practice 2–6.
3. **Mark defaults:** any node with p*_i < p̄_i defaults. Apply guarantees (e.g. Nvidia's OpenAI Ohio backstop, CoreWeave capacity backstop) as contingent liabilities that activate on the guaranteed party's default and are added to the guarantor's p̄ in the same clearing round. Iterate to a joint fixed point.
4. **DebtRank pass on equity:** reduce equity of holders (Nvidia's stakes in OpenAI, xAI, CoreWeave; Microsoft in OpenAI; SoftBank) by h_i × exposure. Feed equity losses into next quarter's funding-access probability (Leland-style endogenous default) and into CDS-implied λ.
5. **Fire-sale channel:** GPU collateral liquidated by defaulted SPVs lowers the rental and resale index by k × (units dumped / market depth). That index enters every SPV's RV and every neocloud's revenue next quarter.
6. **Carry forward:** unpaid amounts carry forward or are written down. Contracts with defaulted counterparties are terminated (lost backlog for clouds). Quarter t+1 then begins.

*Why bankruptcy costs and fire sales matter.* Glasserman-Young implies plain EN will show small amplification. The NBER paper's ~30% loss amplification suggests the AI network has the features that create amplification: concentrated exposures (OpenAI in Oracle's RPO), guarantees and endogenous funding.

*Calibration and validation.* Validate the network module by switching contagion off. Losses should fall by an amount in the ballpark of the NBER paper's ~30% for comparable shocks; this is a sanity check, not a target.

### Gaps
- The NBER paper's full model, node list and calibration were not reviewed (abstract only). The writer should flag this as the most important follow-up source.
- The BoE SWES report and the Fed and IMF PDFs were not read in full in this session (imf.org fetch blocked).
- ECB system-wide stress methodologies (e.g. its macroprudential stress-test framework) were not researched due to the tool budget.
- No public bilateral exposure data exists. The L_ij matrix must be reconstructed from press-reported contract sizes with tenor assumptions, introducing large uncertainty.

---

## 4. Vendor financing and circularity risk: Lucent/Nortel 2000 vs. Nvidia's investments and backstops today

### Takeaway
The 2000 telecom episode is the closest precedent:
- Lucent's vendor-financing commitments peaked at ~$8.1–8.4B, with Nortel ~$3.1B and Cisco ~$2.4B.
- Losses crystallised when CLEC customers such as Winstar failed (Winstar missed a $75M payment in April 2001 after a Lucent facility of up to $2B).
- Analysts measured exposure as commitments vs. drawn amounts, reserves against drawn balances, and share of revenue from financed customers.

Nvidia's exposure is structurally different but larger in absolute terms:
- equity stakes (CoreWeave, xAI, OpenAI pledges);
- a conditional $6.3B CoreWeave unsold-capacity purchase obligation through April 2032;
- a reported ≤$118B maximum guarantee exposure at end of fiscal Q3, including a residual-value-type backstop on OpenAI's Ohio campus that was cut from ~$250B in talks to ~$105–120B.

These should be modelled as contingent liabilities on Nvidia's balance sheet that trigger on counterparty default, plus revenue dependence on the same counterparties.

### Cited Findings
**Telecom 2000 precedent**
- Lucent reduced vendor-financing commitments from ~$8.4B (Feb 2000) to ~$2.2B (2001), per SEC filings. The practice cost Lucent "hundreds of millions" as startup carriers failed. — [Computerworld](https://www.computerworld.com/article/1366438/lucent-misses-q2-mark-at-t-sees-higher-earnings.html)
- Lucent agreed to lend Winstar up to $2B. Winstar's missed $75M loan payment (mid-April 2001) triggered a missed Lucent facility payment and Lucent cutting off the credit line. Winstar sued Lucent for $10B. Winstar losses plus other write-offs cost Lucent 15 cents/share in that quarter. — [Computerworld (Winstar)](https://www.computerworld.com/article/1433361/winstar-misses-75m-payment-may-file-chapter-11.html); [The Register](https://www.theregister.com/2001/04/25/lucent_severely_impacted_by_winstar/); [RCR Wireless](https://www.rcrwireless.com/20010423/carriers/winstar-bankruptcy-lawsuit-detail-ugly-side-of-vendor-financing); [Light Reading](https://www.lightreading.com/ethernet-ip/winstar-judgment-hits-lucent-for-$244m/d/d-id/621423); [eWeek](https://www.eweek.com/news/vendor-financing-backfires/)
- Comparative figures (secondary): Lucent $8.1B, Nortel $3.1B, Cisco $2.4B in vendor financing. Within a year, reserves were ~66–70% of drawn amounts. — [io-fund](https://io-fund.com/ai-stocks/nvidia-coreweave-nebius-circular-financing-gpu-boom); [Assayer Substack](https://assayer.substack.com/p/the-real-picture-behind-nvidias-circular)

**Nvidia today**
- Nvidia's November 2025 memo said "unlike Lucent, NVIDIA does not rely on vendor financing arrangements to grow revenue" and cited ~53-day customer payment terms. — [Assayer Substack](https://assayer.substack.com/p/the-real-picture-behind-nvidias-circular) (quoting the memo)
- CoreWeave order form (Sep 2025, initially $6.3B): Nvidia must buy CoreWeave's residual unsold cloud capacity through April 2032. This is a conditional purchase commitment, not a debt guarantee. Nvidia's $2B CoreWeave equity investment at $87.20/share is documented in CoreWeave disclosures. — [io-fund](https://io-fund.com/ai-stocks/nvidia-coreweave-nebius-circular-financing-gpu-boom); [Marko Capital](https://markocapital.substack.com/p/nvidia-is-its-own-best-customer); [shattered.io fact-check](https://shattered.io/nvidia-circular-financing-claim-250-billion-zero-confirmed/)
- Nvidia–OpenAI: Nvidia pledged up to $100B investment, which creates a circular loop (OpenAI buys chips, Nvidia reinvests). — [NBC News](https://www.nbcnews.com/business/economy/openai-nvidia-amd-deals-risks-rcna234806); [Irish Times](https://www.irishtimes.com/your-money/2025/10/11/openais-network-of-deals-is-propping-up-the-ai-boom)

**Nvidia's Ohio backstop**
- July 2026: WSJ reported talks on a ~$250B Nvidia guarantee for a 10 GW SB Energy campus in southern Ohio, covering the lease and construction debt, with up to $350B discussed for chips.
- August 2026: reportedly cut to <$120B, initially for half the 10 GW.
- The guarantee triggers only on OpenAI lease default or insolvency. OpenAI indemnifies Nvidia for any payout. The binding lease was not yet signed per reports.
- Benzinga reports it is part of Nvidia's maximum $118B guarantee exposure at end of fiscal Q3. The Motley Fool cites $105B.
- Figures conflict across sources.
- Sources: [TNW Jul 2026](https://thenextweb.com/news/nvidia-openai-250bn-data-centre-financing-guarantee); [TNW halved](https://thenextweb.com/news/nvidia-openai-backstop-halved-13f-spacex-intel); [TNW residual value guarantee](https://thenextweb.com/news/nvidia-openai-ports-pike-105bn-residual-value-guarantee); [Motley Fool](https://www.fool.com/investing/2026/08/17/nvidia-lines-up-105-billion-for-openai-heres-what-it-means-for-investors/); [Nasdaq](https://www.nasdaq.com/articles/nvidias-openai-backstop-puts-ai-financing-risk-focus); [VKTR](https://www.vktr.com/ai-market/nvidia-weighs-250b-backstop-for-openais-ohio-data-center/)

**Aggregate estimates and fact-checks**
- One analysis puts Nvidia's direct investments plus guarantees at ~$110B+. A fact-check notes that a widely cited "$250B OpenAI" figure was unconfirmed at the time. — [useluminix](https://www.useluminix.com/reports/industry-analysis/ai-circular-deals); [shattered.io](https://shattered.io/nvidia-circular-financing-claim-250-billion-zero-confirmed/)
- Axios (Sep 2026): "AI is becoming too interconnected to fail". — [Axios](https://axios.com/2026/09/21/ai-finance-credit-circular)

### Inferences
**Circularity metrics to compute each quarter (the analogues of 2000-era analyst metrics)**
1. **Financed-revenue share:** Nvidia revenue from customers in which Nvidia holds equity or has guarantees, divided by total revenue. This is the Lucent "revenue from financed customers" analogue.
2. **Contingent exposure / equity:** (max guarantees + backstops + equity stakes at mark) divided by Nvidia equity. Also expressed against free cash flow.
3. **Round-trip ratio:** for each counterparty, Nvidia cash invested ÷ Nvidia revenue received from that counterparty. A ratio above roughly 0.3 suggests revenue is partly self-funded. This is an inference; there is no established threshold.
4. **Reserve-implied loss:** apply telecom-era loss-given-stress (reserves of ~66–70% of drawn vendor credit within a year) as an upper-bound stress LGD on drawn contingent exposures.

**Modelling the guarantees.** Represent each guarantee as a contingent edge in the clearing network that activates on the guaranteed party's default. The Ohio backstop is reported to cover lease and construction debt, so it transfers OpenAI-default losses from SPV lenders to Nvidia. This is the key mechanism that makes Nvidia a contagion conduit rather than just a revenue loser. The OpenAI indemnity is worthless in the states where it would be triggered (OpenAI insolvent), so model its recovery at near zero.

**Key difference from 2000.** Lucent's customers were many small CLECs, giving diversifiable idiosyncratic defaults. Nvidia's exposures are concentrated in a few large, mutually dependent counterparties, giving correlated defaults. Default correlation is therefore the dominant parameter. Use a one-factor Gaussian or t-copula (Vasicek/Li) on the AI-demand factor for the firm-level defaults, with the network layer adding contagion on top.

### Gaps
- Lucent's vendor-financing write-offs as a % of revenue were not found. Lucent 10-K FY2000/FY2001 would be needed.
- Nortel's actual loss history on vendor financing was not found.
- Nvidia's 10-Q/10-K guarantee footnote (the "$118B max exposure") was not read directly. The figure comes from Benzinga via search summary.
- The status of the Ohio lease (signed or not) after August 2026 is unknown.

---

## 5. Practicality of running these models in a browser simulation each quarter across ~2,000 Monte Carlo runs

### Takeaway
It is entirely practical. A 40-node Eisenberg-Noe/Rogers-Veraart clearing with guarantees, a DebtRank pass and an SPV DSCR waterfall (perhaps 20–50 SPVs) costs on the order of 10⁴–10⁵ floating-point operations per quarter. Over 2,000 paths × 20 quarters (2026–2030) the total is roughly 10⁸–10⁹ simple operations. Plain JavaScript typed arrays handle that in about 1–10 seconds on a laptop, and well under that inside a Web Worker pool. Heavier choices (full Leland optimal-barrier solves, copula sampling with many factors, or the full SWES-style multi-agent behaviour) should be replaced by closed-form or lookup-table approximations.

### Cited Findings
- EN clearing vectors exist and are unique under regularity conditions. The fictitious-default algorithm terminates in at most n iterations for n nodes, i.e. ≤40 here. — [Eisenberg & Noe 2001](https://doi.org/10.1287/mnsc.47.2.236.9835)
- DebtRank is a linear-time propagation over network edges with each node "distressed" at most once. — [Battiston et al. 2012](https://doi.org/10.1038/srep00541)
- The BoE SWES was a months-long, multi-institution, participant-submitted exercise, not a computational model one can replicate. Only its stylised channels (margin calls, fire sales, redemptions) can be borrowed. — [BoE SWES final report](https://www.bankofengland.co.uk/financial-stability/boe-system-wide-exploratory-scenario-exercise/boe-swes-exercise-final-report)

### Inferences
**Compute budget per path-quarter**
- EN fixed point: 40×40 matrix-vector product = 1,600 multiply-adds per iteration. With ≤40 iterations (typically <6) that is ≤64k ops, typically ~10k.
- Guarantee activation adds one or two extra outer loops.
- SPV waterfalls: ~50 × ~20 ops.
- DebtRank: ~40 nodes × ~5 edges average.
- Total: ~10–80k ops per path-quarter. Over 2,000 × 20 = 40,000 path-quarters, that is 0.4–3.2 × 10⁹ ops worst case, ~10⁸–10⁹ typical. JavaScript manages ~10⁸–10⁹ simple ops/sec, so expect 1–10 seconds single-threaded, or ~0.3–2 s across 4–8 Web Workers.

**Implementation tips**
- Use `Float64Array` for the L matrix and a sparse adjacency list, since most of the 1,600 pairs are zero. Real edges are likely ~150–300, cutting cost roughly 5–10x.
- Warm-start each quarter's EN iteration from the previous quarter's p*.
- Seedable PRNG (e.g. xoshiro128**) for reproducibility. Antithetic or Sobol draws for the common AI-demand factor to cut variance.
- Precompute GPU RV curves as lookup tables indexed by (age, generation-gap, rental-index bucket).
- Replace the Leland endogenous barrier with a closed-form approximation or a simple rule: equity holders stop funding when PV(future equity) < required injection.
- Run quarters in sequence and paths in parallel, which is embarrassingly parallel. Stream percentile aggregates (P5/P50/P95 default counts and losses by node) instead of storing all paths. With 40 nodes × 20 quarters × 2,000 paths × ~10 metrics ≈ 16M numbers ≈ 128 MB as Float64, storing everything is borderline. Aggregate on the fly or store Float32.

**Monte Carlo precision.** 2,000 paths gives a standard error on a 5% default probability of √(0.05×0.95/2000) ≈ 0.5 pp, which is adequate. For tail events (<1%) the relative error is large (~22% at 1%), so importance-sample the demand-collapse regime if tail joint-default probabilities are key outputs.

**What not to do in-browser.** Calibrating structural parameters by maximum likelihood on equity time series (the KMV iterative solve) should be done offline. Ship calibrated parameters (asset vol, D*, λ priors) as JSON and update them quarterly from public CDS and equity data.

### Gaps
- No benchmarked browser implementation of EN or DebtRank was found to cite. The timing estimates above are engineering inferences, not measurements.
- The parameters (bankruptcy-cost α/β, fire-sale price impact k, guarantee recovery) have no AI-sector empirical calibration. They must be scenario sliders with ranges justified by the general literature (Rogers-Veraart; Greenwood-Landier-Thesmar) and stressed.
