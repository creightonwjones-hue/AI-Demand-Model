# Simulation modelling frameworks (ABM, system dynamics, SFC, Monte Carlo) for an AI-infrastructure money-flow model, 2026–2030

Scope: which frameworks fit a quarterly 2026–2030 model of the chain end-customer AI revenue → AI labs → hyperscalers and debt-funded neoclouds → Nvidia/custom silicon → TSMC/SK Hynix/ASML, with private-credit financing, defaults and contract renegotiation; how each has been used; how they are calibrated; whether they can be combined; and whether ~2,000 Monte Carlo runs × ~20 quarters × ~40 agents can run in a browser in a few seconds.

Method note: research was done on 25 Nov 2026 with web search. Full-text fetches of bankofengland.co.uk and arxiv.org were blocked in this session (the hosts were not on the network allowlist), so claims about those papers come from search-result abstracts and summaries, not full texts. The browser-cost figures in section 5 come from a benchmark I ran myself in Node.js v22 (V8, the engine behind Chrome). They are not from a published source.

## 1. What each framework is good at, and its documented failure modes

### Takeaway
No single framework covers the whole problem.
- **Agent-based modelling (ABM)** is the only one of the four that represents firm-level heterogeneity, bilateral contracts, defaults and renegotiation. Its documented weaknesses are over-parameterisation and calibration difficulty.
- **System dynamics (SD)** captures the boom-bust capacity cycle driven by delays (lead times, forecast errors). It assumes homogeneous, well-mixed aggregates.
- **Stock-flow consistent (SFC) accounting** supplies the discipline that every flow has a source and a destination and every asset has a matching liability. That is exactly what is needed to track who is left holding the debt.
- **Monte Carlo** is a wrapper for propagating input uncertainty through any of the above, not a structural model. Its output is only as good as the input distributions.

### Cited Findings
**Agent-based modelling (ABM)**
- Axtell & Farmer's survey credits ABMs with insights in finance into clustered volatility, market impact, systemic risk and housing markets. In economics, it credits them with insights into industrial organisation, labour, macro and policy. The survey also reviews "hurdles that must be overcome." It was published as INET Oxford WP 2022-10, then in *Journal of Economic Literature* 63(1): 197–287 (2025). — [INET Oxford](https://www.inet.ox.ac.uk/publications/no-2022-10-agent-based-modeling-in-economics-and-finance-past-present-and-future); [AEA/JEL](https://www.aeaweb.org/doi/10.1257/jel.20221319); [RePEc](https://econpapers.repec.org/RePEc:aea:jeclit:v:63:y:2025:i:1:p:197-287)
- Windrum, Fagiolo & Moneta (2007, JASSS 10(2)) is the foundational critical survey of ABM empirical validation. It names the open problems as over-parameterisation, counterfactuals and the "non-neutrality of data." It compares three approaches: indirect calibration, the Werker-Brenner approach and the "history-friendly" approach. — [LEM WP 2006/14](https://www.lem.sssup.it/WPLem/files/2006-14.pdf); [EconPapers](https://econpapers.repec.org/RePEc:ssa:lemwps:2006/14)
- Rahmandad & Sterman (2008, *Management Science* 54(5)) compared agent-based models with differential-equation (SD-style) models.
  - They frame the main ABM limitation as "computational and cognitive costs that may limit sensitivity analysis and model scope."
  - In many conditions the differences between the two approaches were not statistically significant for key metrics. Those differences were often small relative to the variability caused by stochastic events, parameter uncertainty and the choice of model boundary.
  - However, the two models' responses to policy can differ even when their base-case behaviour is similar.
  - [MIT page](https://www.mit.edu/~jsterman/Heterogeneity.html); [PDF](https://www.mit.edu/~jsterman/Rahmandad-Sterman070906.pdf); [RePEc](https://econpapers.repec.org/RePEc:inm:ormnsc:v:54:y:2008:i:5:p:998-1014)

**System dynamics (SD)**
- SD differential-equation models assume homogeneity and perfect mixing within each stock. ABMs can represent individual differences and network structure. — [Rahmandad & Sterman, MIT](https://www.mit.edu/~jsterman/Heterogeneity.html); [AGSM commentary](https://www.agsm.edu.au/bobm/teaching/SimSS/ABversusSD.html)
- Sterman et al., "Getting Big Too Fast" (*Management Science*, 2007), found that when market dynamics are rapid relative to capacity-adjustment delays, forecasting errors lead to excess capacity that overwhelms the advantage of increasing returns. When the industry moves slowly relative to those delays, boundedly rational firms converge to the equilibria that conventional models predict. — [MIT Sloan](https://mitmgmtfaculty.mit.edu/jsterman/gettingbigtoofast/); [MIT WP PDF](https://dspace.mit.edu/bitstream/handle/1721.1/2419/swp-3441-26847843.pdf?sequence=1)
- Sterman's "Booms, Busts, and Beer" models decision makers as boundedly rational actors who use heuristics for ordering, production, capacity acquisition and pricing. Separate experimental work found that delays in supplier capacity acquisition increase order amplification. — [MIT PDF](https://web.mit.edu/jsterman/www/StermanHendersonetalR2-061015.pdf); [ISDC 2013](https://proceedings.systemdynamics.org/2013/proceed/papers/P1355.pdf)
- Paich & Sterman (1993) argue that "misperceptions of feedback" cause systematically dysfunctional behaviour in dynamically complex settings. They cite boom, bust, price war and shakeout as a generic feature of industrial dynamics. — [ISDC 1998 / Sterman refs](https://proceedings.systemdynamics.org/1998/PROCEED/00026.PDF)

**Stock-flow consistent (SFC) accounting**
- Caiani et al. (2016, JEDC 69: 375–408) pair agent-based modelling with SFC accounting "so every financial asset has a matching liability and every flow has a source and a destination." — [Columbia PDF](https://business.columbia.edu/sites/default/files-efs/imce-uploads/Joseph_Stiglitz/Agent%20based-stock%20flow.pdf); [Kingston AAM](https://eprints.kingston.ac.uk/35296/1/Godin-A-35296-AAM.pdf)

**Monte Carlo**
- Damodaran's valuation text presents Monte Carlo as the most complete probabilistic approach, ahead of scenario analysis and decision trees. He argues that best-case/worst-case analysis is not very informative. — [Damodaran, NYU Stern ch.3](https://pages.stern.nyu.edu/~adamodar/pdfiles/DSV2/Ch3.pdf)
- A practitioner consultancy cautions that Monte Carlo output is only as good as its input distributions. — [Decimal Point Analytics](https://decimalpointanalytics.com/insights/articles/monte-carlo-machine-learning-equity-research)
- One practitioner limits inputs to normal, lognormal and uniform distributions, because every extra distribution parameter adds fitting uncertainty. — [Summit Stocks](https://summitstocks.substack.com/p/monte-carlo-valuation-the-damodaran)

### Inferences
- **Fit to the AI-infrastructure problem:**
  - The core risk is a capacity overbuild driven by multi-year lead times: fabs, high-bandwidth memory (HBM), lithography tools, data-centre power. This is the textbook "Getting Big Too Fast" setting. Demand (AI revenue) may move fast relative to 2–4-year capacity delays, which per Sterman et al. produces overshoot rather than equilibrium. So an SD-style capacity-and-delay structure should sit inside the model whatever framework is chosen.
  - The questions about defaults, private credit and contract renegotiation are firm-specific and bilateral. Examples: one neocloud's take-or-pay contract with one lab, or a GPU-backed loan. SD's homogeneous stocks cannot represent these, so an agent layer is needed for the ~40 named entities.
  - At ~40 agents the model is a "named-entity ABM," much closer to an SD model with disaggregated stocks than to a large macro ABM with millions of agents. This sharply reduces the over-parameterisation and computational-cost failure modes highlighted by Windrum et al. and Rahmandad & Sterman.
- **What SD lacks:** it has no game-theoretic or strategic behaviour. Agents follow fixed heuristic decision rules. This is a feature for this purpose: Sterman's work shows that heuristics reproduce real boom-bust cycles. But the model will not endogenously produce, for example, a hyperscaler cancelling orders strategically to squeeze a supplier unless that is coded as a rule.
- **Implication of the Rahmandad & Sterman result:** if a disaggregated ABM and an aggregate SD model give similar base cases, the extra structure matters mainly for policy and stress counterfactuals (e.g., "what if CoreWeave-type lenders tighten covenants"). That is the use case here.

### Gaps
- I could not retrieve full texts of Axtell & Farmer's list of "hurdles" (the arXiv/AEA full text was blocked or paywalled). The specifics of their critique are not captured here.
- I found no single authoritative source that explicitly states "SD cannot represent strategic behaviour." The claim follows from SD's aggregate, rule-based design (Rahmandad & Sterman; the AGSM commentary) but is not cited as a direct quote.

## 2. Evidence of use: central banks, housing, Godley-Lavoie SFC, industry capacity cycles, Monte Carlo in finance

### Takeaway
ABMs are now established complementary tools at central banks. A 2025 Bank of England–led survey covers this, and the expanded 2026 version counts 24 central banks plus 7 related institutions. Notable uses are the BoE's UK housing ABM line (2016–2024) and the Bank of Italy/IIASA forecasting ABM, which matches or beats VAR/DSGE out of sample. SFC modelling has a long policy track record at the Levy Institute. SD has a substantial semiconductor-cycle literature. Monte Carlo is standard in corporate-finance valuation teaching, but I found little documentation of how sell-side desks use it in practice.

### Cited Findings
**Central banks**
- **BoE Staff WP 1,122** (28 Feb 2025), "Agent-based modeling at central banks: recent developments and new challenges," by Borsos, Carro, Glielmo, Hinterschweiger, Kaszowska-Mojsa and Uluc.
  - It concludes that ABMs have become useful complementary tools, particularly since central-bank mandates widened after 2007–09, and can help with financial innovation and climate change.
  - It was also issued as Banca d'Italia Occasional Paper 956, Banco de España Occasional Paper 2503 and INET Oxford WP 2025-05.
  - An expanded version in *The Economy as an Evolving Complex System IV* (SFI Press, 2026) reportedly covers 24 central banks and 7 related institutions.
  - [BoE](https://www.bankofengland.co.uk/working-paper/2025/agent-based-modeling-at-central-banks-recent-developments-and-new-challenges); [IDEAS](https://ideas.repec.org/p/boe/boeewp/1122.html); [Banco de España](https://www.bde.es/wbe/en/publicaciones/analisis-economico-investigacion/documentos-ocasionales/agent-based-modeling-at-central-banks-recent-developments-and-new-challenges.html); [INET](https://www.inet.ox.ac.uk/publications/no-2025-05-agent-based-modeling-at-central-banks-recent-developments-and-new-challenges)

**BoE housing ABM line**
- **SWP 619 (2016)**, Baptista, Farmer, Hinterschweiger, Low, Tang & Uluc. Agents are first-time buyers, owner-occupiers, buy-to-let investors and renters. A loan-to-income limit dampens the house-price cycle. — [BoE PDF](https://www.bankofengland.co.uk/-/media/boe/files/working-paper/2016/macroprudential-policy-in-an-agent-based-model-of-the-uk-housing-market.pdf); [Central Banking](https://www.centralbanking.com/central-banking/research/2473547/boe-paper-tests-agentbased-model-of-macroprudential-policy)
- **SWP 976 (2022)**, Carro, Hinterschweiger, Uluc & Farmer. Tests loan-to-value and loan-to-income limits and finds spillovers to the rental sector. — [BoE](https://www.bankofengland.co.uk/working-paper/2022/heterogeneous-effects-and-spillovers-of-macroprudential-policy-in-model-of-uk-housing-market)
- **SWP 1,066 (2024)**, Bardoscia, Carro, Hinterschweiger, Napoletano, Popoyan, Roventini & Uluc. A macro extension in which tighter capital requirements sharply reduce commercial and mortgage lending and housing transactions. — [BoE](https://www.bankofengland.co.uk/working-paper/2024/the-impact-of-prudential-regulations-on-the-uk-housing-market-and-economy)

**Forecasting ABMs (IIASA / Bank of Italy)**
- **Poledna, Miess, Hommes & Rabitsch**, "Economic forecasting with an agent-based model," *European Economic Review* (2023). The Austrian small-open-economy ABM "can compete with" VAR and DSGE benchmarks in out-of-sample forecasting. An earlier 2018 seminar abstract made the stronger claim that it "clearly outperforms" VAR/ARMA up to 12 quarters ahead; the published wording is more cautious. — [IIASA PDF](https://pure.iiasa.ac.at/18339/1/1-s2.0-S0014292122001891-main%20%281%29.pdf); [Tinbergen seminar](https://utilities.tinbergen.nl/?p=63186)
- **Hommes & Poledna**, "Analyzing and forecasting economic crises with an agent-based model of the euro area" (Tinbergen DP 23-013, 2023; reportedly published in *Economic Modelling*, 2026). It reports that the ABM outperforms DSGE and VAR out of sample. — [Tinbergen PDF](https://papers.tinbergen.nl/23013.pdf); [WIFO](https://www.wifo.ac.at/?p=443183)
- **BeforeIT.jl** (Bank of Italy IT research unit and IIASA, 2025) is an open-source Julia implementation of the Poledna et al. model. It is about 20× faster per step than the MATLAB version, benchmarked at ~8,000 agents (1:1000 scale of Austria) and ~8 million agents (full scale). — [arXiv 2502.13267](https://arxiv.org/abs/2502.13267v1); [GitHub](https://github.com/bancaditalia/BeforeIT.jl); [Julia Discourse](https://discourse.julialang.org/t/beforeit-jl-high-performance-agent-based-macroeconomics-in-julia/126984)
  - Conflict: a third-party summary claims "several orders of magnitude" faster. The paper's ~20× figure is the more reliable number.

**Financial-stability ABMs (US)**
- **Bookstaber, Paddrik & Tivnan, OFR WP 14-05** (US Treasury Office of Financial Research, not the Fed). The ABM maps funding and collateral flows to study fire sales and runs. It finds "it is the reaction to initial losses rather than the losses themselves that determine the extent of a crisis." — [OFR](https://www.financialresearch.gov/working-papers/2014/07/29/an-agent-based-model-for-financial-vulnerability/); [RePEc](https://econpapers.repec.org/RePEc:ofr:wpaper:14-05)
- **Winter Simulation Conference 2024 paper** modelling the Fed as a "dealer of last resort" in an ABM. It has 3 buy-side agents (a mutual fund, an insurer, a hedge fund) and 3 broker-dealers, a small named-agent design comparable in scale to the proposed ~40-agent model. — [WSC 2024](https://informs-sim.org/wsc24papers/pos143.pdf)

**Godley-Lavoie SFC**
- The Levy Economics Institute's "State of the US and World Economies" program centres on SFC macro models created by Wynne Godley and uses them for strategic analyses of policy options. Recent examples include a July 2026 strategic analysis and a July 2026 working paper, "The Evolution and Diversification of Stock-Flow Consistent Modeling." Levy WP 891 notes that adoption accelerated after Godley & Lavoie's *Monetary Economics* (2007). — [Levy program](https://www.levyinstitute.org/research/research-programs/the-state-of-the-us-and-world-economies/); [Levy topics](https://www.levyinstitute.org/topics/topics.php?topic=1537)

**Semiconductor capacity-cycle SD models**
- **Wu (MIT thesis, 2008, advisor Charles Fine).** Covers electronics demand, fab capacity allocation, cost structure, technology roadmaps and equipment R&D. Links long lead times and fast "clockspeed" to amplified volatility, and was validated against industry data. — [MIT DSpace](https://dspace.mit.edu/handle/1721.1/45280)
- **Bezemer & Akkermans (ISDC 2003).** A generic IC supply-chain SD model calibrated to one European manufacturer, testing more aggressive capacity build-up and lower utilisation targets. Context: semiconductor sales rose more than 35% and then fell almost as much in 2000–2002. — [ISDC 2003 PDF](https://proceedings.systemdynamics.org/2003/proceed/PAPERS/414.pdf)
- **NTU capacity-planning SD model (2021-era).** Extended with stockpiling and order amplification to mimic the chip shortage. Capacity planned purely from demand trends causes either low order fulfilment or overcapacity; "a significant amount of capacity overage is observed after desired capacity is achieved." — [NTU record](https://libmast.utm.my/Record/ntu-10356%2F158531)
- **Gonca et al. (ISDC 2004).** Demand reacts to product availability, a positive feedback loop that deepens downturns. — [Albany archive](https://archives.albany.edu/description/catalog/ua435aspace_5366e29a3b1e4a4d3e754a7c500cb3e7)
- **Chen & Jan (JORS 2005).** SD model of Taiwan's semiconductor industry: capital, technology and capacity accumulation. — [IDEAS](https://ideas.repec.org/a/pal/jorsoc/v56y2005i10d10.1057_palgrave.jors.2601958.html)
- **Other industries.** A boom-bust review lists paper, agricultural commodities, natural resources, toys, semiconductors and others as industries where aggressive capacity expansion in a boom produced a bust. — [LEM WP 2007-13](https://www.lem.sssup.it/WPLem/files/2007-13.pdf)

**Monte Carlo in corporate finance**
- The standard workflow is to assign distributions to the inputs of a deterministic DCF, generate many scenarios, then report the mean, percentiles and probability of loss. — [Lecture notes, equity valuation & simulation](https://lsmacoris.github.io/lectures/valuation/coursework/Lecture%206%20-%20Equity%20Valuation%20and%20Simulation/index.html); [Damodaran, ch.33](https://pages.stern.nyu.edu/~adamodar/pdfiles/val3ed/c33.pdf)

### Inferences
- The BoE housing line is the closest structural analogue to the AI chain. It has a few agent *types* with heterogeneous balance sheets, lender constraints (LTV/LTI ≈ loan covenants and loan-to-cost limits on GPU-backed lending) and spillovers across segments (owner-occupier → rental ≈ hyperscaler → neocloud).
- The OFR fire-sale ABM's finding (the reaction to losses matters more than the losses) argues for modelling private-credit lender behaviour endogenously. Examples: covenant tightening, refusal to roll over, haircut increases on GPU collateral.
- The semiconductor SD literature validates the key mechanism this model needs: long capacity lead times plus extrapolative demand forecasts produce overshoot and capacity overage. The stockpiling and order-amplification extension mirrors double-ordering of GPUs/HBM in 2024–2026.

### Gaps
- I did not find a Fed FEDS Note or ECB working paper that uses an ABM or SFC model in this context. One search found only the OFR and WSC work. The ECB's ABM/SFC work is likely covered in the BoE WP 1,122 survey, but I could not read it.
- I did not find concrete documented SD or ABM models of the telecom/fibre overbuild of 1998–2002 or of shipping cycles. Both are well-known capacity-cycle analogues but remain uncited here.
- I found no documentation of how sell-side research desks actually use Monte Carlo (frequency, disclosure, whether price targets use the median or mean). Only teaching and practitioner-blog sources were found.
- I found no published ABM/SFC model of AI infrastructure or data-centre financing specifically.

## 3. How ABMs and SFC models are calibrated and validated, and what data they need

### Takeaway
Validation is organised around three activities: comparing simulated and real data, calibrating or estimating parameters, and exploring the parameter space (Fagiolo et al. 2017/2019). Estimation options run from indirect calibration to reproducing stylised facts, simulated minimum distance and method of moments, Bayesian likelihood methods, and machine-learning surrogates for expensive models. A head-to-head comparison found a simple likelihood-based Bayesian estimator beat several simulated-minimum-distance methods (Platt 2020). Pattern-oriented modelling (Grimm et al. 2005) uses multiple patterns at different scales to constrain structure and parameters. That suits a model with only 20 quarters of forward horizon and short history.

### Cited Findings
**Validation frameworks**
- Fagiolo, Guerini, Lamperti, Moneta & Roventini (LEM WP 2017/23; Springer chapter 2019) organise ABM validation into (i) comparing artificial and real-world data, (ii) calibrating and estimating model parameters, and (iii) exploring the parameter space. — [LEM WP 2017/23](https://www.lem.sssup.it/WPLem/files/2017-23.pdf); [IDEAS](https://ideas.repec.org/p/hal/spmain/halshs-02375423.html)
- Windrum, Fagiolo & Moneta (2007) compare three validation approaches: indirect calibration, Werker-Brenner (a Bayesian-flavoured approach) and "history-friendly" modelling (calibrating to reproduce a specific industry history). — [LEM WP 2006/14](https://www.lem.sssup.it/WPLem/files/2006-14.pdf)

**Estimation methods**
- Platt (2020, JEDC 113): "a simple, likelihood-based approach to Bayesian estimation consistently outperforms several members of the more popular class of simulated minimum distance methods." The paper also notes that calibration for large-scale models still needs development. — [IDEAS (JEDC)](https://ideas.repec.org/a/eee/dyncon/v113y2020ics0165188920300294.html); [arXiv 1902.05938](https://arxiv.org/abs/1902.05938); [INET](https://www.inet.ox.ac.uk/publications/a-comparison-of-economic-agent-based-model-calibration-methods)
- Lamperti, Roventini & Sani (JEDC 90, 2018: 366–389) use machine-learning surrogates to calibrate ABMs. A 2024/25 review of data-driven economic ABMs cites surrogate and meta-model approaches as the way to make calibration feasible when each run is expensive. — [Data-Driven Economic ABMs, arXiv 2412.16591](https://arxiv.org/pdf/2412.16591)

**Validation examples**
- Caiani et al. (2016) validated their AB-SFC benchmark by checking that it reproduces many empirical regularities and that these properties are robust across parameter configurations. The paper also proposes rules and tools for building, calibrating, validating and displaying AB-SFC models. — [Kingston AAM](https://eprints.kingston.ac.uk/35296/1/Godin-A-35296-AAM.pdf); [RePEc](https://econpapers.repec.org/RePEc:eee:dyncon:v:69:y:2016:i:c:p:375-408)
- Grimm et al. (*Science* 310: 987–991, 2005, doi 10.1126/science.1116681): a single pattern at one scale does not sufficiently constrain an ABM's structure and parameters, so multiple patterns at different scales should be used for model selection and parameterisation. The approach is said to extend to financial markets. The companion ODD protocol (2006) standardises how ABMs are documented. — [USGS](https://pubs.usgs.gov/publication/70161783); [UFZ press release](https://www.ufz.de/index.php?en=35770)

**Data used by these models**
- The forecasting ABMs (Poledna et al.; BeforeIT) are calibrated on national accounts and sectoral data at a defined agent scale, e.g., 1:1000 of Austria. — [BeforeIT, arXiv](https://arxiv.org/abs/2502.13267v1); [IIASA](https://pure.iiasa.ac.at/18339/1/1-s2.0-S0014292122001891-main%20%281%29.pdf)
- The semiconductor SD models were calibrated or validated against industry data (Wu 2008) and one firm's data (Bezemer & Akkermans 2003). — [MIT DSpace](https://dspace.mit.edu/handle/1721.1/45280); [ISDC 2003](https://proceedings.systemdynamics.org/2003/proceed/PAPERS/414.pdf)

### Inferences
**Calibration**
- A 2026–2030 forward model has no out-of-sample history to backtest against. Formal estimation by simulated method of moments or Bayesian likelihood on 20 future quarters is therefore impossible. Practical calibration would combine:
  - (a) **Direct calibration** of agent balance sheets and contracts from public filings: 10-Ks/10-Qs of hyperscalers, Nvidia, TSMC, SK Hynix and ASML; neocloud S-1s and debt prospectuses; disclosed backlog and remaining performance obligations; private-credit deal terms.
  - (b) A **"history-friendly" backtest** on 2022–2026 quarters (the capex ramp to date). Check that the model reproduces observed capex, revenue and inventory trajectories.
  - (c) **Pattern-oriented checks** against stylised facts from prior capacity cycles. Examples: the semiconductor 2000–02 swing of +35% then a fall of similar size; the 2022–23 memory downturn; telecom 1998–2002. Each check is a separate "pattern."
- **Over-parameterisation** is the main risk at 40 agents. Each agent should share rule templates by type (lab, hyperscaler, neocloud, chip vendor, foundry/memory/tools, lender) with a few type-level parameters. Heterogeneity should come from data-driven initial balance sheets, not from free behavioural parameters.
- **Global sensitivity analysis** across the ~2,000 Monte Carlo runs (e.g., variance-based or regression on the inputs) doubles as Fagiolo's "parameter space exploration" step. At this model size it is cheap enough that surrogates are probably unnecessary.

**Data the model needs**
- Quarterly AI revenue and usage proxies; lab compute commitments; hyperscaler capex and depreciation lives; neocloud debt schedules and covenants; GPU prices and rental rates; wafer, CoWoS (advanced packaging) and HBM capacity and lead times; ASML tool shipments; private-credit spreads and default/recovery assumptions.

### Gaps
- I did not retrieve the specific SFC calibration practice (e.g., how Levy or Godley-Lavoie models fit flow-of-funds data), though it is widely described as calibration to sectoral financial accounts. Not verified in this session.
- I found no source on indirect-inference applications specific to industry ABMs. The method appears in the surveys but no concrete industry example was found.

## 4. Can these be combined? Hybrid examples

### Takeaway
Yes, and the hybrid is well established in macro. Agent-based stock-flow consistent (AB-SFC) models put agent decision rules on top of an SFC balance-sheet and transactions-flow backbone; Caiani et al. (2016, JEDC) is the reference benchmark. For this project the natural design has four layers:
- an SFC accounting core (every payment is a double entry between named agents),
- ~40 agents with heuristic decision rules (from the ABM literature),
- SD-style capacity pipelines with lead-time delays inside each supplier agent,
- a Monte Carlo outer loop over exogenous drivers and behavioural parameters.

### Cited Findings
- Caiani, Godin, Caverzasi, Gallegati, Kinsella & Stiglitz, "Agent based-stock flow consistent macroeconomics: Towards a benchmark model," JEDC 69 (2016): 375–408 (earlier Columbia Business School WP 15-87).
  - It builds a fully decentralised AB-SFC model in which bottom-up agent interaction is paired with SFC accounting.
  - Its properties match many empirical regularities and are robust across parameter configurations.
  - It offers rules and tools for building, calibrating, validating and displaying AB-SFC models.
  - [Columbia PDF](https://business.columbia.edu/sites/default/files-efs/imce-uploads/Joseph_Stiglitz/Agent%20based-stock%20flow.pdf); [Kingston research portal](https://researchinnovation.kingston.ac.uk/en/publications/agent-based-stock-flow-consistent-macroeconomics-towards-a-benchm-4/); [RePEc](https://econpapers.repec.org/RePEc:eee:dyncon:v:69:y:2016:i:c:p:375-408)
- The BoE's 2024 housing-plus-macro ABM (SWP 1,066) links a housing ABM with a macroeconomic model including bank lending. It is an example of coupling sub-models with credit flows between them. — [BoE](https://www.bankofengland.co.uk/working-paper/2024/the-impact-of-prudential-regulations-on-the-uk-housing-market-and-economy)
- Rahmandad & Sterman (2008) compare ABM and SD directly. Disaggregating an SD model into agents chiefly matters for policy responses and heterogeneity. That supports a hybrid where SD structure is kept but stocks are owned by named agents. — [MIT](https://www.mit.edu/~jsterman/Heterogeneity.html)
- Monte Carlo layered on a deterministic base model is standard practice in valuation. — [Lecture notes](https://lsmacoris.github.io/lectures/valuation/coursework/Lecture%206%20-%20Equity%20Valuation%20and%20Simulation/index.html)

### Inferences
**Proposed hybrid for this project**
1. **SFC core.** A transactions-flow matrix keyed by agent, plus a balance-sheet matrix (cash, receivables, PP&E/GPUs, debt, equity). Assert each quarter that the sum of net financial assets equals zero, as a built-in bug check. This is the "accounting discipline" that makes defaults and renegotiations traceable: when a neocloud defaults, the loss must appear on a named lender's balance sheet.
2. **Agent rules** (heuristic, Sterman-style bounded rationality):
   - labs set compute commitments from revenue growth and funding;
   - hyperscalers and neoclouds set capex from backlog, utilisation and cost of capital;
   - lenders set advance rates and spreads from collateral values and observed defaults;
   - suppliers set capacity from order books with lead-time delays.
3. **Contract objects.** Take-or-pay and multi-year compute contracts, GPU-backed loans. Each has renegotiation and default triggers (e.g., debt-service coverage below a threshold leads to a haircut, extension or default).
4. **Monte Carlo outer loop** over AI revenue growth paths, GPU price decay, depreciation lives, interest rates and behavioural parameters. Report fan charts and tail statistics, e.g., P(≥1 neocloud default by 2028) and the distribution of TSMC/SK Hynix revenue.
- **Where pure SFC falls short:** classic Godley-Lavoie models are sector-aggregate (households, firms, banks, government). They provide the accounting template but not firm-level default and renegotiation. That is why the AB layer is needed.

### Gaps
- I found no published AB-SFC model of a single industry value chain (as opposed to a whole economy). The proposed design is an adaptation, not a replication of an existing model.

## 5. Browser feasibility: JS/TS performance, Web Workers, WebAssembly, libraries, cost estimates

### Takeaway
Browser execution is very feasible at this scale. In a toy AB-SFC benchmark in Node 22 (V8), 2,000 runs × 20 quarters × 40 agents completed in about 0.24 s with one pass over all 1,600 agent pairs per quarter. It took ~1.5 s with 10 passes and ~12 s with 100 passes, all single-threaded.
- With typed arrays and 4 Web Workers, a realistic model (a few passes over contracts per quarter) should finish 2,000 runs in well under a few seconds.
- WebAssembly is not needed. Published benchmarks show only ~1.3× average gains over JS on SPEC CPU, and the bottleneck at this size is model logic, not raw arithmetic.
- JS libraries exist for ABM (AgentScript, NetLogo-like) and SD (sd.js, Insight Maker's `simulation`, SDEverywhere → JS/Wasm). For a ~40-agent custom financial model, plain TypeScript is likely simpler than adopting a framework.

### Cited Findings
**WebAssembly versus JavaScript**
- Jangda, Powers, Berger & Guha, "Not So Fast" (USENIX ATC 2019) ran SPEC CPU in the browser. WebAssembly ran on average 45% (Firefox) to 55% (Chrome) slower than native code, but 1.3× faster than JavaScript on average. Good results on small scientific kernels (PolyBench) did not generalise to larger applications. — [USENIX ATC'19](https://www.usenix.org/conference/atc19/presentation/jangda); [arXiv 1901.09056](https://arxiv.org/abs/1901.09056v3)
  - Note: the 55% Chrome figure is from my recollection of the paper's abstract. The search snippet confirmed only the 45% Firefox figure, so treat 55% as unverified.

**ABM libraries in JavaScript**
- AgentScript is an ES6-module ABM library based on NetLogo semantics, with an MVC split and 2D canvas, Three.js and map views. Its docs mention an experimental distributed mode that runs a model in one page and gets results in another. An older docs build noted Web Worker module-import compatibility issues, with Safari as the holdout at the time. — [AgentScript README (unpkg)](https://unpkg.com/agentscript@0.10.26/README.md); [GitHub](https://github.com/backspaces/agentscript)
- A practitioner who built a traffic ABM in pure JS with AgentScript found browsers "great for visualization" but limited for advanced uses, and ran parameter sweeps outside the browser. — [carrknight blog, 2023](https://carrknight.github.io/abm/2023/02/18/traffic.html)

**System dynamics in the browser**
- **sd.js** is an open-source SD engine that runs in all major browsers and on Node. It generates JavaScript and evaluates it with the browser's JIT compiler. — [npm sd.js](https://npmjs.com/package/sd.js)
- **Simlin** is an open-source SD model editor with a hosted version (its engine runtime was not confirmed). — [GitHub simlin](https://github.com/bpowers/simlin)
- **Insight Maker** is a free, open-source web-based modelling tool; its engine is published as the `simulation` npm library for Node and browser. — [GitHub scottfr/simulation](https://github.com/scottfr/simulation); [npm](https://www.npmjs.com/package/simulation)
- **SDEverywhere** transforms Vensim models into C, JavaScript and WebAssembly. It is used by Climate Interactive for in-browser SD models such as En-ROADS (the En-ROADS use is my knowledge; the search confirmed only the toolchain). — [SDEverywhere GitHub](https://github-redirect.dependabot.com/climateinteractive/SDEverywhere)
- **LunaSim** (ISDC 2024 paper) is a lightweight browser-based open-source SD tool needing no installation. — [ISDC 2024 abstract](https://proceedings.systemdynamics.org/2024/abstracts/1049.html)
- A Socket.dev listing for sd.js flagged npm supply-chain risk (an Axios-related malicious dependency notice appeared on the page). Pin and audit dependencies if you use third-party engines. — [socket.dev sd.js](https://socket.dev/npm/package/sd.js)

**Reference point from native-language macro ABMs**
- BeforeIT.jl (Julia) is ~20× faster per step than MATLAB for a macro ABM of ~8,000 agents. Multithreading across sectors gives sublinear speedups. — [arXiv 2502.13267](https://arxiv.org/abs/2502.13267v1)

**Own benchmark** (not a published source; script at `/tmp/claude-0/-home-user-AI-Demand-Model/2506c477-4286-546d-9269-9a268ca6e40e/scratchpad/bench.js`, Node v22, V8, single thread, 4-core container)
- Toy AB-SFC model with 40 agents, a 40×40 contract matrix (~15% density), double-entry cash transfers, investment, borrowing, interest, default with 60% loss, and stochastic renegotiation. Results:

| Inner passes over all 1,600 agent pairs per quarter | Total for 2,000 runs | Per run |
|---|---|---|
| 1 | 237 ms | 0.12 ms |
| 10 | 1,500 ms | 0.75 ms |
| 100 | 12.4 s | 6.2 ms |

- Cost scales linearly with inner-loop work. A realistic model with maybe 5–20 sub-steps per quarter (market clearing, contract settlement, lender review, capacity pipeline updates) lands at about 1–3 s single-threaded. Dividing runs across 4 Web Workers gives about 0.3–1 s. (Estimate; it assumes near-linear Worker scaling, which is plausible because Monte Carlo runs are independent.)

### Inferences
**Performance and architecture**
- Monte Carlo runs are embarrassingly parallel. Use a pool of `navigator.hardwareConcurrency` Web Workers, each running a share of the seeds, and post back only summary statistics or per-quarter percentiles, not full traces, to avoid copy and serialisation overhead. Use a seeded PRNG (e.g., mulberry32) so runs are reproducible.
- Performance pitfalls that matter more than JS versus Wasm: allocating objects inside the quarter loop (garbage-collection pauses), using `Map`/objects instead of `Float64Array` for balance sheets, and sending large arrays back to the main thread. A struct-of-arrays layout (one typed array per balance-sheet line × agent) keeps the hot loop JIT-friendly.
- WebAssembly (Rust/AssemblyScript) would at most give ~1.3× by the Jangda et al. average. It adds build complexity and makes the model harder for non-engineers to read. Not worth it at this scale unless the model grows by more than 10×, e.g., per-GPU-cluster agents or intra-quarter monthly steps.
- **Library choice:**
  - AgentScript is oriented to spatial, NetLogo-style models and visualisation, not balance-sheet finance.
  - SD engines (sd.js, `simulation`, SDEverywhere) suit an aggregate SD prototype or a Vensim-authored capacity module, but do not handle per-agent contracts and defaults.
  - A bespoke TypeScript engine (~1–2k lines) with an SFC ledger, agent rule modules and a Worker-based Monte Carlo runner is the pragmatic choice.
  - Charts can use any JS plotting library (fan charts, default-probability bars).
- **Validation in the browser:** with 2,000 runs taking about 1 s, interactive sensitivity analysis (sliders that re-run the full ensemble) is feasible, and so is in-browser global sensitivity analysis (e.g., a few tens of thousands of runs in about 10–20 s).

### Gaps
- I found no published benchmark of an economic ABM or SFC model running in a browser JS engine. The cost estimate rests on my own toy benchmark in Node/V8, which approximates Chrome but not Safari's JavaScriptCore or Firefox's SpiderMonkey.
- Web Worker scaling was not measured, only inferred.
- I could not confirm the current status of AgentScript's Worker support or Simlin's engine runtime.
