# Statistical, Time-Series and Judgmental Forecasting Methods for AI Infrastructure Demand (2026–2030)

Research notes, compiled 2026-11-25. Method note: direct page fetches to arxiv.org and epoch.ai were blocked by this session's network policy, so findings from those sources come from search-engine summaries of the pages, not full-text reads. Treat exact figures from them as needing verification against the primary page. Where a summary flagged its own uncertainty, I note it.

## 1. Econometric / time-series methods (VAR/BVAR, BSTS/CausalImpact, state-space/Kalman, regime-switching): accuracy for capex and semiconductor revenue, and failure at turning points

### Takeaway
Standard time-series and macro-econometric forecasts track trends well but have a near-unbroken record of missing turning points. The strongest evidence is in GDP and recession forecasting: consensus forecasts caught only 5 of 153 recessions a year ahead. Regime-switching (Markov-switching) models are the best-documented tool for *detecting* a turn quickly once it has started, but not for predicting one far in advance. BSTS is useful for nowcasting and for building in many candidate leading indicators. Its strength is the structural decomposition plus sparse regression; it is not a turning-point oracle.

### Cited Findings
- **Turning-point failure (macro).** An, Jalles & Loungani (IMF WP/18/39) studied GDP forecasts for 63 countries, 1992–2014. Forecasts are revised slowly in non-recession years. In recession years revisions speed up, but not enough to avoid large errors. Private-sector and IMF forecasts were nearly identical, so neither did better. Strong booms were also missed. — [IMF WP 18/39](https://www.imf.org/en/publications/wp/issues/2018/03/05/how-well-do-economists-forecast-recessions-45672)
- Across 153 recessions, only 5 were predicted by the private-sector consensus in April of the preceding year. Forecasters underestimated the size of the slump until the year was almost over. — [BNN Bloomberg](https://www.bnnbloomberg.ca/why-are-economists-so-bad-at-forecasting-recessions-1.1250945)
- Loungani's earlier work (1989–1998) called the record of failing to predict recessions "virtually unblemished". He links part of this to weak incentives: forecasters have no money riding on calling downturns. — [BNN Bloomberg](https://www.bnnbloomberg.ca/why-are-economists-so-bad-at-forecasting-recessions-1.1250945); see also [Bloomberg Opinion via BloombergQuint](https://www.bloombergquint.com/opinion/recession-forecast-for-2020-economists-are-so-bad-they-re-good)
- **Regime-switching models.**
  - In a real-time evaluation, a Markov-switching model on real GDP and employment produced peak/trough dates close to the NBER chronology. It identified turns faster than the NBER, with few false positives. — [Identifying business cycle turning points in real time (CORE)](https://core.ac.uk/works/2884539)
  - A dynamic-factor Markov-switching benchmark has an average lead over NBER dating of about 5 months for peaks and 2 months for troughs. A Bayesian sequential "quickest detection" method dates peaks about 4 months and troughs about 10 months faster than NBER, with no false alarms. Both figures are leads over the official *dating announcement*, not over the turn itself. — [MPRA paper 60250](https://mpra.ub.uni-muenchen.de/60250/8/MPRA_paper_60250.pdf) / [MPRA 59361](https://mpra.ub.uni-muenchen.de/59361/1/MPRA_paper_59361.pdf) (search summary; exact attribution between the two MPRA papers not verified)
  - Adding Markov-switching volatility to dynamic factor models improves turning-point detection after the mid-1980s. Other authors stress that real-time turning-point detection "proves to be very challenging". — [HAL-SHS wp2020_03](https://halshs.archives-ouvertes.fr/halshs-02443364v1/file/wp2020_03_.pdf); [WIFO WP 2017/542](https://www.wifo.ac.at/wp-content/uploads/upload-7806/wp_2017_542.pdf)
  - The nowcasting literature acknowledges that regime-switching improves performance, and model averaging across Markov-switching models has been studied for recession nowcasting. — [IMF WP 2024/190](https://www.imf.org/-/media/files/publications/wp/2024/english/wpiea2024190-print-pdf.pdf)
- **BSTS (Scott & Varian).**
  - The model pairs a structural time-series model (level, local trend, seasonal, error) estimated with the Kalman filter with a regression on contemporaneous predictors. A spike-and-slab prior induces sparsity when there are more candidate predictors than observations, and forecasts are Bayesian-model-averaged. Applications: initial unemployment claims and retail sales nowcasting. — [Scott & Varian, "Predicting the Present with BSTS" (Berkeley PDF)](https://people.ischool.berkeley.edu/%7Ehal/Papers/2013/pred-present-with-bsts.pdf); [Google Research](https://research.google/pubs/pub41335/); [NBER chapter c12995](https://www.nber.org/chapters/c12995.pdf)
  - The NBER chapter notes that Harvey (1991), Durbin & Koopman (2001), Petris et al. (2009) and others advocate Kalman-filter state-space methods for time-series forecasting. — [NBER chapter c12995](https://www.nber.org/chapters/c12995.pdf)
- **Semiconductor-industry forecasts at turns (WSTS).**
  - **2023:** the May 2023 forecast was −10.3% for 2023. The Fall 2023 revision was −9.4%, "less pronounced than initially forecasted". — [WSTS Fall 2023](https://www.wsts.org/76/103/WSTS-Semiconductor-Market-Forecast-Fall-2023); [WSTS May 2023 release](https://www.wsts.org/esraCMS/extension/media/f/WST/6032/WSTS_nr-2023_05.pdf)
  - **2019:** the Spring 2019 forecast was −12.1%; a later forecast deepened it to −13.3%. — [Electronic Specifier](https://www.electronicspecifier.com/news/analysis/the-semiconductor-market-decline-in-2019/)
  - **2004–06:** WSTS revised 2005 growth down to 1.2% from 8.5% in May, and revised 2006 up from a May forecast of −0.7%. — [WSTS Autumn 2004](https://www.wsts.org/76/103/WSTS-Semiconductor-Market-Forecast-Autumn-2004)
  - **2018:** most forecasts were 6–8% against an actual of 13.7%. The closest, at 12%, came from Semiconductor Intelligence (Feb 2018). — [Design-Reuse / Semiconductor Intelligence](https://us.design-reuse.com/industryexpertblogs/31489/semiconductor-forecast.html)
  - An arXiv paper (2404.09334) tests whether WSTS expert forecasts beat data-driven models; its results were not visible in search. — [arXiv 2404.09334](https://www.arxiv.org/pdf/2404.09334)

### Inferences
- In every documented case, revisions run in the direction of the realised outcome but late: 2019 deepened, 2018 under-called the boom, 2005 cut sharply. Industry forecasts behave like the IMF GDP forecasts, with smoothed, autocorrelated revisions. For an AI-demand model, consensus revision *momentum* is probably more informative than the consensus level.
- **VAR/BVAR:** plausible for linking hyperscaler capex, cloud revenue and Nvidia DC revenue. But the post-2023 AI regime gives only about 12–14 quarterly observations, so any VAR would rely heavily on Bayesian shrinkage priors (Minnesota-type) and on pre-AI data whose dynamics differ. Expect poor out-of-sample performance at a turn.
- **Recommended role for regime-switching:** a two-state growth/contraction Markov-switching model on quarterly hyperscaler capex growth or on semiconductor billings. Its output is a real-time "probability we are in a downturn regime". That is a detection and early-warning signal, not a multi-year point forecast.
- **Recommended role for BSTS:** nowcasting the current quarter. Plausible regressors include TSMC monthly revenue, Taiwan export orders, SEMI billings, and hyperscaler guidance. The spike-and-slab prior handles a large set of candidate indicators.

### Gaps
- No public study found that specifically measures VAR/BVAR or BSTS accuracy on hyperscaler capex or Nvidia revenue.
- WSTS's 2001 and 2009 forecast-vs-actual errors were not found. A systematic WSTS track-record audit was not found beyond scattered years.
- The result of arXiv 2404.09334 (WSTS vs. data-driven models) is unverified because arxiv.org fetch was blocked.

## 2. Technology diffusion and experience curves (Bass, Gompertz/logistic, Wright's law): forecast accuracy and use for token-price deflation

### Takeaway
Experience-curve and Moore-type trend models have a well-documented, calibrated error distribution across about 50 technologies (Farmer & Lafond 2016; Lafond et al. 2018). This makes them the best-founded tool for *distributional* forecasts of token-price deflation. Bass and logistic S-curves are notoriously unreliable before the inflection point: key parameters, especially market potential, are not identifiable until roughly two-thirds of the way to the adoption peak. AI end-demand in 2026 is plausibly still before that point, so Bass-model forecasts are unreliable for this case.

### Cited Findings
- **Farmer & Lafond (2016), Research Policy 45(3):647–665.**
  - They model Moore's law as a correlated geometric random walk with drift, fitted to 53 technologies. They derive a closed-form approximation of forecast-error distribution as a function of horizon.
  - Hindcasting collapses forecast errors across technologies and horizons onto one universal distribution.
  - They demonstrate distributional forecasts for solar PV, and the probability that one technology overtakes another.
  - — [arXiv 1502.05274](https://arxiv.org/abs/1502.05274); [RePEc](https://econpapers.repec.org/RePEc:eee:respol:v:45:y:2016:i:3:p:647-665); [Oxford Martin](https://www.oxfordmartin.ox.ac.uk/publications/how-predictable-is-technological-progress)
- **Wright's law vs. Moore's law (Lafond, Bailey, Bakker, Rebois, Zadourian, McSharry & Farmer, "How well do experience curves predict technological progress?").**
  - In most cases Wright's and Moore's law forecast errors have the same sign and similar magnitude.
  - Wright's model is slightly better at the longest horizons, but few forecasts exist at those horizons. It only slightly outperforms Moore's model.
  - — [arXiv 1703.05979](https://arxiv.org/pdf/1703.05979); [ar5iv](https://ar5iv.arxiv.org/html/1703.05979)
- **Bass-model fragility.**
  - In common parameter regimes, the data needed to learn key Bass parameters reliably only arrives *after about two-thirds of the way to the peak*. Earlier forecasts "can be wildly inaccurate". — [The Limits to Learning a Diffusion Model (arXiv 2006.06373)](https://arxiv.org/pdf/2006.06373)
  - Van den Bulte & Lilien (1997, Marketing Science): NLS estimates of Bass coefficients are biased and drift systematically as observations are added, even without misspecification, because of ill-conditioning. The estimated market potential tends to sit close to the latest cumulative adoption count. — [INFORMS](https://pubsonline.informs.org/doi/fpi/10.1287/mksc.16.4.338); [IDEAS](https://ideas.repec.org/a/inm/ormksc/v16y1997i4p338-353.html)
  - Bemmaor & Lee (2002): more complex diffusion models can worsen systematic parameter drift. G/SG beats Bass one step ahead but deteriorates faster at 2–3 steps. — [INFORMS](https://pubsonline.informs.org/doi/fpi/10.1287/mksc.21.2.209.151); [IDEAS](https://ideas.repec.org/a/inm/ormksc/v21y2002i2p209-220.html)
  - Boswijk & Franses (2005, JBES): standard Bass estimators seriously overestimate parameter precision, and some parameters are substantially biased. — via [repub.eur.nl](https://repub.eur.nl/pub/13344) (search summary)
  - Bayesian Bass methods are motivated by unreliability early in diffusion. — [arXiv 2610.20098](https://arxiv.org/pdf/2610.20098)
  - In a residential-solar study, Bass was weak out of sample because diffusion had not yet reached its S-shape. — [arXiv 2608.23796](https://arxiv.org/pdf/2608.23796)
- **Token-price deflation evidence (Epoch AI).**
  - The price for a fixed performance level falls roughly 9× to 900× per year depending on the milestone. GPT-4-level performance on PhD-level science questions fell about 40× per year. — [Epoch AI, LLM inference price trends](https://epoch.ai/blog/llm-inference-price-trends)
  - A later Epoch analysis found the fastest declines were recent. It reports about 66% per quarter (about 75× per year) early on, then about 32% per quarter (about 4.7× per year), and a cross-benchmark estimate of about 47% per quarter (about 13× per year). — [Epoch data insight](https://epoch.ai/data-insights/ai-inference-price-trends) (search summary; exact figures unverified)
  - The price of running *frontier* models is reportedly *rising* 3×–18× per year because of larger models and reasoning tokens. — [arXiv 2511.23455, "The Price of Progress"](https://arxiv.org/abs/2511.23455) / [MIT FutureTech](https://futuretech.mit.edu/publication/the-price-of-progress-algorithmic-efficiency-and-the-falling-cost-of-ai-inference) (search summary; attribution between these and Epoch not verified)
  - Open-model price decline is about 7–28× per year. — [arXiv 2511.23455](https://arxiv.org/abs/2511.23455) (search summary)
  - a16z "LLMflation": about 10× per year for equivalent performance. — [a16z](https://a16z.com/llmflation-llm-inference-cost/)

### Inferences
- **Token prices:** model the log price per unit capability as a random walk with drift, following Farmer–Lafond. Take the drift from Epoch's range and widen the error bands with horizon per their closed form. This gives defensible 2030 bands.
  - The 9×–900× range shows that the choice of benchmark or quality level dominates the uncertainty. The model should specify "price at constant capability" separately from "average price paid per token", which mix-shift toward reasoning and frontier models can push up.
  - Wright's law needs a cumulative-production variable (cumulative tokens served, or cumulative GPU-hours). These are not reliably public, so the time-based Moore form is more practical, at almost no loss of accuracy per Lafond et al.
- **Revenue and adoption:** Bass or logistic fits to AI revenue or user counts in 2026 will largely reflect the most recent data point (Van den Bulte & Lilien). Use them only with an *externally imposed* ceiling, such as a share of IT spend, of labour costs or of GDP, taken from reference classes, plus Bayesian priors. Present them as scenarios, not forecasts.

### Gaps
- Specific Bass-model forecast-accuracy studies for mobile phone or internet adoption, comparing ex ante forecasts with outcomes, were not found in this pass.
- The headline error-variance numbers from Farmer & Lafond 2016 (e.g., the PV forecast intervals) could not be extracted because the full text was blocked.

## 3. Semiconductor and capex cycle models: inventory and capex cycles, book-to-bill, lead indicators, and how sell-side analysts forecast Nvidia revenue

### Takeaway
Sell-side Nvidia models are mostly bottom-up and supply-constrained: TSMC CoWoS capacity, then GPU units, then ASP, cross-checked against the share of hyperscaler capex going to Nvidia. Management disclosures (backlog/"pipeline", capex projections for hyperscalers) anchor consensus heavily. Book-to-bill is the classic semiconductor lead indicator, but no quantitative backtest of its turning-point accuracy was found. Practitioners say it is noisy, increasingly under-reported, and can roll over while revenue is still rising.

### Cited Findings
- **Book-to-bill and cycle indicators.**
  - Book-to-bill is orders divided by billings. The semiconductor-equipment (SME) book-to-bill is considered an important leading demand indicator. — [Wikipedia: Book-to-bill ratio](https://en.wikipedia.org/wiki/Book-to-bill_ratio)
  - Decreased reporting of book-to-bill over time "precludes it from being used effectively on a systematic basis" in quant factor models. — [IHS Markit, "Book It – A Semiconductor Specific Factor Suite"](https://cdn.ihsmarkit.com/www/pdf/Book_It_-_A_Semiconductor_Specific_Factor_Suite.pdf)
  - SEMI and SEAJ equipment reports use three-month moving averages because monthly data are noisy. — [Wikipedia: Book-to-bill ratio](https://en.wikipedia.org/wiki/Book-to-bill_ratio)
  - The meaning of a book-to-bill reading depends on where sales started (1990s analysis). — [Photonics.com](https://photonics.com/Articles/Semiconductor_Sales_Up_but_for_How_Long/a4109)
  - TechInsights publishes cycle-mapping and upturn-timing analysis. No single indicator dates the cycle reliably, according to practitioner commentary. — [TechInsights, Cycle Mapping and Upturn Timing](https://www.techinsights.com/blog/cycle-mapping-and-upturn-timing)
- **Sell-side CoWoS-based build (Morgan Stanley, as reported).**
  - CoWoS-L capacity of about 910k units in 2027, up about 40% year on year.
  - Vera CPU shipments roughly doubling.
  - Implies about 52% higher Nvidia 2027 revenue.
  - TSMC wafer capacity (CoWoS) of about 200k wafers per month in 2027.
  - — [Wccftech (June 2026)](https://wccftech.com/amd-epyc-venice-to-outpace-nvidia-vera-cpus-2027/)
- **Consensus drift (Visible Alpha via S&P Global).** FY2027 Data Center revenue consensus was $306.5B in January 2026. A May 2026 note put the FY2027 total at $343.4B. The two figures may not be like-for-like (Data Center vs. total). — [S&P Global, Nvidia at CES 2026](https://www.spglobal.com/market-intelligence/en/news-insights/research/2026/01/nvidia-at-ces-2026); [S&P Global, Q1 FY2027 earnings preview](https://www.spglobal.com/market-intelligence/en/news-insights/research/2026/05/nvidia-earnings-preview-q1-2027)
- **Management-disclosed anchors.**
  - Nvidia disclosed a Blackwell+Rubin pipeline of more than $1 trillion, about $840B of it expected to be delivered through 2027. — [Yahoo Finance / Wells Fargo note](https://finance.yahoo.com/markets/stocks/articles/nvidia-targets-1-trillion-data-163538827.html)
  - CFO Kress: cloud backlog is above $2T. Top-5 hyperscaler capex is expected near $800B in 2026 and $1.3T in 2027. — [Webull / Motley Fool](https://www.webull.com/news/15516459400225793)
  - Nvidia guided about 70% revenue growth for the next fiscal year (Aug 2026). Implied FY2028 revenue is about $673B ([KuCoin News](https://www.kucoin.com/news/flash/nvidia-forecasts-70-revenue-growth-in-2028-amid-ai-demand-surge)) or $690–700B ([Fortune](https://www.fortune.com/2026/08/26/nvidia-q2-growth-results-jensen-huang/)). The two differ on the base year used. See also [The National](https://www.thenationalnews.com/business/markets/2026/08/27/nvidia-forecasts-70-sales-growth-next-year-as-it-remains-bullish-on-ai-spending-boom/).
- **Capex-share method (Barclays "napkin math").** Nvidia's chart implies a 44% share of hyperscaler spending in 2027, which gives about $401B of Nvidia hyperscaler revenue in 2027 versus Barclays' prior $370B. — [Stocktwits](https://stocktwits.com/news-articles/markets/equity/nvidia-hyperscaler-revenue-could-reach-401-b-in-2027-spacex-could-push-it-higher/cZD0ItVRB0G)
- **Unit × ASP example.** $20B of Vera CPU revenue requires about 4M units, which implies roughly $5k per unit. — [Tom's Hardware](https://www.tomshardware.com/pc-components/cpus/analyst-says-nvidia-poised-to-capture-two-thirds-of-the-x86-server-cpu-market-from-intel-and-amd-with-expected-usd20-billion-in-revenue-nvidia-is-already-on-track-to-deliver-4-million-vera-cpus-in-fy2027)
- **Base rate for capex booms (telecom 1995–2000).**
  - About $2T was spent laying 80–90M miles of fiber. Forbes forecast bandwidth would "triple every year for the next 25 years". Many fiber firms went bankrupt, but the glut was used later; Zayo said the industry "has been living off that glut". — [Martin Alderson](https://martinalderson.com/posts/are-we-really-repeating-the-telecoms-crash-with-ai-datacenters/); [IEEE ComSoc Techblog](https://techblog.comsoc.org/2025/09/27/big-tech-spending-on-ai-data-centers-and-infrastructure-vs-the-fiber-optic-buildout-during-the-dot-com-boom-bust/)
  - Counter-view: Ciena's CEO argues AI network demand is "grossly underestimated". — [Fierce Network](https://www.fierce-network.com/cloud/cienas-gary-smith-telecom-underestimating-ais-network-demands); [The Next Web](https://thenextweb.com/news/ciena-ceo-gary-smith-ai-boom-telecom-bust)

### Inferences
- A browser model can reproduce the sell-side approach with public inputs, using three cross-checks that bracket each other:
  1. **Supply ceiling:** CoWoS wafers × dies per wafer × yield × ASP.
  2. **Demand from capex:** hyperscaler capex × compute share × Nvidia share.
  3. **Management anchors:** backlog/pipeline disclosures.
  When the supply ceiling binds, revenue forecasts are capacity forecasts. Turning-point risk shows up first as the demand-side estimate falling below the supply ceiling. Watch for lead-time compression, pricing, and gross-margin rollover.
- The jump from $306.5B to $343.4B in four months is evidence that consensus has repeatedly been revised *upward* in this upcycle. This mirrors the 2018 semiconductor pattern, where forecasts under-called the boom. It is the mirror image of how such forecasts behave in downturns.
- The telecom episode is the most-cited reference class for an overbuild. It suggests that boom-era demand-growth extrapolations ("triple every year for 25 years") can be off by orders of magnitude on timing even when long-run usage eventually catches up.

### Gaps
- No public backtest was found of book-to-bill, SEMI billings, or Taiwan export orders as lead indicators of semiconductor revenue turning points (lead time, hit rate).
- No public full write-up of a sell-side Nvidia unit × ASP bridge was found. Dies per CoWoS wafer, yield and ASP assumptions are not public in these sources.
- The "7% utilization" of dark fiber claim appears only in secondary sources and is unverified.

## 4. Judgmental forecasting: superforecasting, reference-class forecasting, megaproject and boom base rates, and ensemble/combination evidence (M4/M5)

### Takeaway
There are three robust results. Structured, aggregated human judgment beats unaided experts (Good Judgment Project). Taking the "outside view" from a reference class corrects systematic optimism (Flyvbjerg's "iron law"). Combining forecasts is among the most reliable accuracy gains in the M-competitions. For AI demand, combine a model ensemble with reference-class bands drawn from past tech/capex booms.

### Cited Findings
- **Good Judgment Project (Tetlock, Mellers et al.).**
  - The GJP won IARPA's 2011–2015 tournament, scored with the Brier score (0 is perfect). Random guessing on those questions scored about 0.53. — [AI Impacts](https://aiimpacts.org/evidence-on-good-forecasting-practices-from-the-good-judgment-project/)
  - GJP forecasters beat an intelligence-community prediction market of analysts with classified access by about 25–30%. Another summary says superforecaster teams beat prediction markets by 15–30%. A third reports that prediction markets beat ordinary teams by about 20%. These figures depend on the baseline used and are inconsistent across secondary sources. — [AI Impacts](https://aiimpacts.org/evidence-on-good-forecasting-practices-from-the-good-judgment-project/); [EA Forum](https://forum.effectivealtruism.org/posts/W94KjunX3hXAtZvXJ/evidence-on-good-forecasting-practices-from-the-good); [Mellers et al. chapter (Harvard)](https://scholar.harvard.edu/sites/scholar.harvard.edu/files/rzeckhauser/files/improving_the_accuracy_of_geopolitical_risk_assessments.pdf)
  - About 70% of superforecasters stayed in the top group the next year. Belief updating was the strongest behavioural predictor of accuracy. Domain knowledge, intelligence, active open-mindedness and teaming each contributed. — [AI Impacts](https://aiimpacts.org/evidence-on-good-forecasting-practices-from-the-good-judgment-project/)
  - Tournaments are useful for transparency and improving debate. — [Tetlock, Mellers & Scoblic 2014 (Wharton)](https://faculty.wharton.upenn.edu/wp-content/uploads/2015/07/2014---forecasting-tournaments-tools-for-increasing-transparency-and-improving-debate.pdf)
- **Reference-class forecasting (Kahneman/Flyvbjerg).**
  - The "iron law of megaprojects": over time, over budget, under benefits, over and over again. It is statistical, not deterministic. — [Oxford ORA (Flyvbjerg)](https://ora.ox.ac.uk/objects/uuid:3aa12b48-3281-412b-904a-cb5bbd9dca8e/files/m8e39305c81700d2664df157f53050c4c)
  - Transport base rates: 9 of 10 projects overrun. Average overruns are 44.7% for rail, 33.8% for bridges/tunnels and 20.4% for roads, with no improvement over the 70 years studied. — [Flyvbjerg et al. (USP mirror)](https://edisciplinas.usp.br/pluginfile.php/4419156/mod_resource/content/1/volume%202.pdf); [California Management Review 2009](https://cmr.berkeley.edu/2009/02/51-2-delusion-and-deception-in-large-infrastructure-projects-two-models-for-explaining-and-preventing-executive-disaster/)
  - The method: (1) pick a reference class, (2) establish its probability distribution, (3) place the project in that distribution. Kahneman called it "the single most important piece of advice regarding how to increase accuracy in forecasting". — [Oxford ORA](https://ora.ox.ac.uk/objects/uuid:1995349e-a5c7-4d85-98f4-d0c00cce2d75/files/mc585fe9f557b210e51b0014842bbea6b); [REF 2021 impact case](https://results2021.ref.ac.uk/impact/81d555af-df9f-4275-84ff-864dcf917aa6/pdf)
  - Flyvbjerg attributes the bias to "delusion and deception": optimism bias plus strategic misrepresentation by competing sponsors. — [CMR 2009](https://cmr.berkeley.edu/2009/02/51-2-delusion-and-deception-in-large-infrastructure-projects-two-models-for-explaining-and-preventing-executive-disaster/)
- **M-competitions.**
  - M4 used 100,000 series and both ML and statistical methods; results are in IJF 36(1), 2020. — [MOFC M4 page](https://mofc.unic.ac.cy/m4/)
  - M4 again showed the value of combinations: 5 of the top 6 submissions were forecast combinations. — [Forecasting: theory and practice (arXiv 2012.03854)](https://arxiv.org/pdf/2012.03854)
  - M5 predicted 42,840 hierarchical Walmart sales series. About 5,507 teams took part in Accuracy and 892 in Uncertainty. — [Makridakis, Spiliotis & Assimakopoulos, IJF 38(4) 2022](https://ideas.repec.org/a/eee/intfor/v38y2022i4p1346-1364.html); [M5 accuracy paper PDF](https://statmodeling.stat.columbia.edu/wp-content/uploads/2021/10/M5_accuracy_competition.pdf); [Wikipedia: Makridakis Competitions](https://en.wikipedia.org/wiki/Makridakis_Competitions)
  - Top M5 entries used parallel ensembles and gradient boosting (LightGBM), confirming meta-model fusion on homogeneous data. — [arXiv 2203.03279](https://arxiv.org/pdf/2203.03279)

### Inferences
- M5's ML/boosting wins came from tens of thousands of related, homogeneous series. AI-demand forecasting has a handful of short, non-stationary aggregate series, which is closer to M3/M4 yearly and quarterly data, where simple methods and their combinations do well. The lesson is to combine simple, diverse models, not to fit heavy ML.
- **Reference classes for AI capex 2026–2030:**
  - telecom/fiber 1995–2002
  - railway manias
  - the semiconductor up-cycles in the WSTS record
  - the dot-com server/PC capex cycle
  - Flyvbjerg-style overrun distributions for very large data-centre/power projects (cost and schedule)

  Assembling these needs a dedicated data pass; only telecom figures were sourced here.
- Superforecasting techniques that can be built into a tool:
  - outside view first, then inside-view adjustment
  - frequent small updates
  - explicit probabilities scored by Brier
  - aggregation with extremising
  These are judgment overlays on top of statistical bands.

### Gaps
- The M4 headline figures could not be retrieved from primary text: the Smyl ES-RNN hybrid winner, the percentage improvement of combinations over the benchmark, and prediction-interval coverage results. (From background knowledge, M4's winner was Smyl's ES-RNN hybrid and pure ML underperformed; unverified here.)
- Flyvbjerg & Budzier's IT-project fat-tail statistics were not verified in this pass.
- No compiled base-rate dataset of "tech capex booms → peak-to-trough drawdown in capex/revenue" was found.

## 5. Prediction markets (Kalshi, Polymarket, Metaculus) on AI, Nvidia and capex: usable as calibration inputs?

### Takeaway
Liquid public markets exist only for short-horizon, near-binary Nvidia events: earnings beat/miss, words mentioned on earnings calls, and monthly stock-price direction. These are near-certain or low-information, so they are of limited value for calibrating 2027–2030 demand. No Kalshi or Polymarket contract on hyperscaler capex or AI revenue levels was found, and no Metaculus pages surfaced in search. At best they serve as a weak sanity check, not a calibration input.

### Cited Findings
- Polymarket's implied probability that Nvidia beats earnings was about 90% before the fiscal Q1 2027 report. The Motley Fool argues these odds reflect macro sentiment more than bookings. — [Motley Fool (May 2026)](https://www.fool.com/investing/2026/05/14/will-nvidia-beat-q1-earnings-on-may-20-heres-what/); similar about 95% figure: [AOL/Motley Fool](https://www.aol.com/articles/prediction-markets-95-sure-nvidia-193618490.html); [Proactive Investors](https://www.proactiveinvestors.co.uk/companies/news/1097631/prediction-market-traders-all-but-rule-out-an-nvidia-earnings-miss-1097631.html)
- A later preview cites about 97% beat odds. Kalshi "mention" markets priced "Gaming" at 63% and "H20" at 11%. — [Webull/Benzinga](https://www.webull.com/news/15469458290525184); Kalshi pages: [NVDA earnings](https://kalshi.com/company-reports/nvda), [mention market Jun-26](https://kalshi.com/markets/kxearningsmentionnvda/nvda-earnings-mention/kxearningsmentionnvda-26jun30), [Aug-26](https://kalshi.com/markets/kxearningsmentionnvda/nvda-earnings-mention/kxearningsmentionnvda-26aug26)
- Polymarket direction calls on Nvidia were reportedly right about 79% of the time across hundreds of markets, but missed October 2026's drop. Management guidance cited was $108.0B ± 2% for the following quarter. — [24/7 Wall St (Nov 2026)](https://247wallst.com/investing/2026/11/02/polymarket-traders-missed-nvidias-october-drop-heres-what-they-predict-for-november/)
- A deadline-related contract on Nvidia CEO change shows resolution-criteria risk in these markets. — [HackerNoon](https://hackernoon.com/nvidias-ceo-shake-up-exposes-a-costly-prediction-market-deadline)
- Context from Section 4: in the GJP, aggregated forecasters beat an intelligence-community prediction market. — [AI Impacts](https://aiimpacts.org/evidence-on-good-forecasting-practices-from-the-good-judgment-project/)

### Inferences
- A beat probability near 90–97% mostly encodes Nvidia's guidance-setting conservatism (guide low, beat). It carries little information about the *level* of demand. Stock-price direction markets are effectively options markets with lower liquidity.
- For calibration, the most useful market-implied input is probably *equity options implied volatility* on NVDA and the hyperscalers around earnings. That would be a separate data source (not researched here). Prediction markets can still be logged and Brier-scored against the model's own probabilities as an ongoing benchmark.
- Metaculus long-horizon AI questions (compute, capabilities) may exist and could supply priors for AI-adoption scenarios. They need direct verification.

### Gaps
- No Metaculus question pages on Nvidia revenue, hyperscaler capex or AI revenue surfaced. Their existence, community forecasts and track record are unverified.
- No Kalshi or Polymarket market on capex levels or token prices was found.
- The "79% right" Polymarket figure is from a secondary article with unclear methodology.

## 6. How to backtest and validate a forecasting model (out-of-sample, rolling origin, CRPS/Brier, calibration of probability bands)

### Takeaway
Use rolling-origin (time-series cross-validation) evaluation that mirrors real use: fixed horizons of 1–8 quarters, refitting at each origin with only the data available at that date. Score with proper scoring rules: CRPS or pinball (quantile) loss for revenue/capex distributions, Brier or log score for binary events such as "capex down YoY". Check interval coverage empirically. Naive CV intervals may not provide valid coverage, and short series make all of this noisy.

### Cited Findings
- Hyndman & Athanasopoulos (*Forecasting: Principles and Practice*): split data into training and test sets. When history is too short, use time-series cross-validation, a series of training/test sets with the origin rolled forward, which can be adapted for multi-step errors. — [SAS blog: Hyndman on time-series cross-validation](https://blogs.sas.com/content/forecasting/2016/06/09/rob-hyndman-on-time-series-cross-validation); [SAS blog: Hyndman on measuring forecast accuracy](https://blogs.sas.com/content/forecasting/2016/03/18/rob-hyndman-measuring-forecast-accuracy)
- The CV scheme should mirror how the model is used in practice. Horizon affects error dynamics and interval calibration. — [Lyubchich, Time Series Analysis lecture notes](https://vlyubchich.github.io/tsar/l12_forecast.html)
- Common pitfalls and best practices for forecast evaluation (leakage, inappropriate metrics, non-representative test periods). — [Hewamalage, Ackermann & Bergmeir, "Forecast Evaluation for Data Scientists" (arXiv 2203.10716)](https://ar5iv.labs.arxiv.org/html/2203.10716)
- It is unclear whether naive forward-CV intervals give statistically meaningful coverage; quantile-based alternatives are proposed. — [arXiv 2309.07435](https://pdf.arxiv.org/pdf/2309.07435)
- Sequential conformal prediction for time series (R package conformalForecast) gives coverage-calibrated intervals. — [arXiv 2610.21648](https://arxiv.org/pdf/2610.21648)
- The Brier score is the standard scoring rule for binary forecasts (lower is better, 0 is perfect; uniform guessing scored about 0.53 on GJP questions). — [AI Impacts](https://aiimpacts.org/evidence-on-good-forecasting-practices-from-the-good-judgment-project/)
- Farmer–Lafond hindcasting is a template for validating trend models: run historical pseudo-forecasts across many technologies and horizons, then compare the realised error distribution with the predicted one. — [arXiv 1502.05274](https://arxiv.org/abs/1502.05274)

### Inferences
Suggested validation protocol for the AI-demand model:
1. **Pseudo-real-time backtest.** Use vintage data, so revisions are not peeked at. Use quarterly origins from about 2015 for semiconductor revenue (WSTS/SIA) and hyperscaler capex (10-Q/10-K), and from 2023 for AI-specific series. Use horizons h = 1, 4 and 8 quarters.
2. **Benchmarks.** At minimum, a random walk (naive), a random walk with drift, and ETS. Report MASE relative to naive, following Hyndman.
3. **Probabilistic scoring.**
   - CRPS, or pinball loss averaged over quantiles 0.05–0.95, for continuous targets.
   - Brier score for binary events, such as "Nvidia DC revenue QoQ < 0" or "hyperscaler capex YoY < 0".
   - Coverage tables: the share of outcomes inside the 50% and 90% bands should be close to nominal.
   - A PIT histogram for calibration.
4. **Turning-point-specific scoring.** Evaluate separately on the 2001, 2008–09, 2019 and 2022–23 semiconductor downturns, because average-error metrics hide turning-point failure.
5. **Reference-class check.** Compare the model's 2030 band widths with Farmer–Lafond universal-error-scaled widths for comparable horizons.
6. **Live scoring.** Publish forecasts with timestamps and score them as quarters resolve (Tetlock-style accountability).

### Gaps
- Hyndman's specific treatment of CRPS and Winkler interval scores was not retrieved, though FPP3 is known to cover them. The online text (otexts.com/fpp3) was not fetched.
- With only about 12 quarters of AI-era data, backtests of AI-specific series have very low statistical power. No source was found on minimum sample sizes for meaningful coverage tests.

## 7. Which methods can run in a browser in JavaScript, and what public data they need

### Takeaway
Every method recommended here can be implemented in client-side JavaScript at the data sizes involved (hundreds of quarterly points): Kalman-filter local-level/trend models, two-state Markov-switching, random walk with drift plus Farmer–Lafond error bands, Bass/logistic curve fits, forecast combination, and CRPS/Brier scoring. Full MCMC BSTS with spike-and-slab is heavier but feasible with a small Gibbs sampler. Most of the work is data assembly from public sources, not computation.

### Cited Findings
- BSTS's components (level, local trend, seasonal, error) are Kalman-filter state-space models plus spike-and-slab regression with Bayesian model averaging. Each is a well-specified algorithm that can be implemented in any language. — [Scott & Varian](https://people.ischool.berkeley.edu/%7Ehal/Papers/2013/pred-present-with-bsts.pdf)
- The Farmer–Lafond error-distribution formula is closed form, so it needs no simulation. — [arXiv 1502.05274](https://arxiv.org/abs/1502.05274)
- **Public data sources identified in this research:**
  - WSTS semiconductor forecasts/history: [WSTS](https://www.wsts.org/76/103/WSTS-Semiconductor-Market-Forecast)
  - SEMI/SEAJ equipment billings (3-month moving average): [Wikipedia: Book-to-bill](https://en.wikipedia.org/wiki/Book-to-bill_ratio)
  - Nvidia and hyperscaler guidance and filings: [Fortune](https://www.fortune.com/2026/08/26/nvidia-q2-growth-results-jensen-huang/), [Webull/Motley Fool](https://www.webull.com/news/15516459400225793)
  - Epoch AI inference-price data: [Epoch](https://epoch.ai/data-insights/ai-inference-price-trends)
  - Kalshi and Polymarket market prices: [Kalshi NVDA](https://kalshi.com/company-reports/nvda)

### Inferences
| Method | Browser feasibility | Data needed (public) |
|---|---|---|
| Random walk with drift + Farmer–Lafond error bands (token price, cost/perf) | Trivial (closed form) | Epoch price-per-capability series; GPU $/FLOP history |
| Local-level/local-trend Kalman filter (capex, revenue) | Easy (about 100 lines; small matrices) | Quarterly hyperscaler capex (10-Q), Nvidia DC revenue (10-Q), WSTS monthly billings |
| BSTS with spike-and-slab (nowcast) | Moderate (Gibbs sampler; seconds for under 500 obs) | Above plus candidate regressors: TSMC monthly revenue, Taiwan export orders, SEMI billings |
| Two-state Markov-switching (Hamilton filter + EM) | Easy–moderate | Quarterly growth rates of capex / semiconductor revenue |
| Small BVAR (Minnesota prior) | Moderate (closed-form posterior under conjugate prior) | 3–5 aligned quarterly series |
| Bass / logistic / Gompertz with fixed or prior-constrained ceiling | Easy (nonlinear least squares or grid search) | AI revenue/users; ceiling from a reference class |
| Bottom-up supply model (CoWoS × dies × yield × ASP) | Trivial (arithmetic with sliders) | TSMC CoWoS capacity disclosures and analyst estimates, Nvidia product specs |
| Forecast combination (equal weights or inverse-MSE) | Trivial | Outputs of the above |
| Scoring (CRPS via sample formula, pinball, Brier, coverage, PIT) | Trivial | Backtest outputs plus realised values |

- The table above is my engineering assessment, not a sourced claim. Libraries exist for parts of this (e.g., numeric/linear-algebra packages on npm or jsDelivr), but specific JS forecasting libraries and their maintenance status were not researched in this pass.
- Equal-weight combination of (a) the bottom-up supply model, (b) the Kalman trend model, and (c) the capex-share model, with judgmental reference-class bands, fits the M-competition evidence best given the very short history.

### Gaps
- Specific JS libraries were not surveyed: statistical state-space, MCMC, or ports of bsts/CausalImpact.
- Programmatic access (APIs, CORS) to WSTS, SEMI, Epoch, Kalshi and Polymarket data from a browser was not verified. Some may need a pre-built static JSON snapshot.
- No source was found on the computational limits of in-browser MCMC for BSTS.
