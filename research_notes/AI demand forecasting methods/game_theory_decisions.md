# Game-Theoretic and Decision-Theoretic Methods for Modelling Strategic Corporate Decisions in the AI Infrastructure Boom (2026–2030)

Research method note: 17 web searches were run. Full-text fetches of nber.org and ideas.repec.org were blocked by this session's network settings, so most academic findings below come from abstracts and search-result summaries, not full papers. Items marked **[background, not verified this session]** come from standard textbook knowledge. They have no verified source URL from this session, and the report writer should treat them as lower confidence.

---

## 1. Expected utility vs. prospect theory vs. robust/ambiguity-averse decision models: when does each fit corporate behaviour?

### Takeaway
No single decision theory fits every player. Use expected utility (risk-neutral or mildly risk-averse value maximisation) as the default for diversified, cash-rich firms such as hyperscalers and Nvidia. Use a prospect-theory-style reference-point switch for players below target or near distress, such as cash-burning AI labs and levered neoclouds. Reference-dependent risk-seeking among firms below target has consistent empirical support. Use ambiguity-aversion or worst-case (max-min) rules for lenders and for anyone facing "unknown-unknown" demand. Ambiguity lowers firms' reservation prices and investment, and firms act as if the worst case will happen. Hyperscaler executives' public statements show an asymmetric loss function: underinvestment is feared more than overinvestment. A competitive-loss or regret term captures that better than plain risk aversion.

### Cited Findings
- In COMPUSTAT data, firms with returns above their reference level take less risk than firms below it (Kliger & Tsur, 2011). This is the core prospect-theory prediction applied to firms. — [Prospect theory and risk-seeking behavior by troubled firms](https://cris.iucc.ac.il/en/publications/prospect-theory-and-risk-seeking-behavior-by-troubled-firms/); [PDF](https://typeset.io/pdf/prospect-theory-and-risk-seeking-behavior-by-troubled-firms-1n4xbb9iew.pdf)
- A 2017 study of international listed firms (2001–2013) found that firms become risk-seeking when expected performance is below target, in order to avoid an anticipated loss. — [Research in International Business and Finance, v42 (2017) pp. 900–911](https://ideas.repec.org:443/a/eee/riibaf/v42y2017icp900-911.html)
- A known weakness is that results depend on how the reference point is defined. Studies use industry centre values, medians or past performance. — [SciTePress 2019 paper](https://www.scitepress.org/PublishedPapers/2019/91993/91993.pdf)
- A prospect-theory model of resource allocation has been formalised in the decision-analysis literature (Decision Analysis, INFORMS). — [A Prospect Theory Model of Resource Allocation](https://pubsonline.informs.org/doi/fpi/10.1287/deca.1090.0142)
- In theory and evidence on ambiguity, ambiguity *reduces* the value of investment opportunities, while risk *raises* the value of the option to invest. Ambiguity-averse managers set lower reservation prices on projects than a rational-expectations model predicts. — [Impact of Ambiguity on Managerial Investment and Cash Holdings](https://law-journals-books.vlex.com/vid/the-impact-of-ambiguity-855619326); [Izhakian paper (Mannheim seminar)](https://www.bwl.uni-mannheim.de/media/Lehrstuehle/bwl/Area_Finance/Finance_Area_Seminar/HWS_2019/Izhakian_Paper.pdf); [Real Investment Under Ambiguity: Evidence from M&A](https://pages.stern.nyu.edu/~yizhakia/abstracts/ma_abs.htm)
- A survey of German firms found that higher beliefs about macro tail risk strongly reduce investment, consistent with firms acting as if the worst-case exposure will be realised. This is evidence for max-min / robust behaviour. — [VoxEU: "Devil in the tail"](https://cepr.org/index%2Ephp/voxeu/columns/devil-tail-how-firms-beliefs-about-rare-macroeconomic-disasters-shape-investment)
- Counter-evidence: entrepreneurs sometimes show ambiguity-*loving* behaviour in investment decisions. — [Kingston eprint (Spanjers)](https://eprints.kingston.ac.uk/35292/1/Spanjers-W-35292-AAM.pdf)
- Ambiguity can also *raise* leverage choices. — [NBER w22870](https://nber.org/system/files/working_papers/w22870/w22870.pdf)
- Asymmetric loss in AI capex: at Q2 2024 earnings, Sundar Pichai said "the risk of underinvesting is dramatically greater than the risk of overinvesting". Mark Zuckerberg said "If we end up misspending a couple of hundred billion dollars, I think that that is going to be very unfortunate obviously" and argued the risk was higher on the other side. Both quotes are secondhand via aggregators, so verify them against transcripts. — [Invezz, Dec 2025](https://invezz.com/news/2025/12/26/looking-ahead-to-2026-why-hyperscalers-cant-slow-spending-without-losing-the-ai-war/); [Yahoo Finance](https://finance.yahoo.com/sectors/technology/articles/mark-zuckerberg-145-billion-ai-142110842.html); [philippdubach.com "Who blinks first?"](https://philippdubach.com/posts/ai-capex-arms-race-who-blinks-first/)

### Inferences
- **Hyperscalers (MSFT, GOOGL, AMZN, META, ORCL):** use expected utility with an explicit *relative-position* term, i.e. payoff = own profit minus λ × capacity/market-share shortfall versus rivals. Executives describe the loss from falling behind as larger than the loss from overspending, which a "keeping up" payoff encodes directly. Oracle is the exception because it is heavily debt-financed. Treat it like a levered firm, with risk-seeking below target that turns into distress-driven cuts near covenant limits.
- **AI labs (OpenAI, Anthropic, xAI, etc.):** model them as prospect-theory agents whose reference point is the funding runway or the revenue path promised to investors. Below the reference point they gamble for resurrection, doubling down on compute to reach the next capability tier. Close to insolvency, strategic renegotiation takes over (Section 3).
- **Lenders and private credit:** use ambiguity-averse or max-min expected utility (Gilboa–Schmeidler-style), or a simple "haircut by worst plausible GPU residual value" rule. Sudden spread widening on a news shock is the behavioural signature of ambiguity, not of risk.
- **Implementation:** each of these can be a parameterised utility function in JavaScript, e.g. `u(x) = x>=ref ? (x-ref)^α : -λ(ref-x)^β`, or a worst-of-K-scenarios evaluator. All are O(1) per evaluation, so the choice of decision theory adds almost no compute cost. It only changes calibration.

### Gaps
- No study found that tests EU, prospect theory and ambiguity aversion head-to-head in corporate capex.
- No direct evidence found on the risk preferences of AI labs or GPU lenders specifically.
- The standard parameters (Tversky–Kahneman λ≈2.25, α≈0.88) were not verified this session **[background, not verified this session]**.

---

## 2. Capacity and investment games, overinvestment and herding in booms, and empirical evidence (telecom, semiconductors, shale, shipping)

### Takeaway
The best-supported mechanisms for boom overinvestment are:
1. **Preemption / option-exercise games.** Competition erodes the option value of waiting, so firms invest near zero NPV (Grenadier 2002). Building can continue even as demand falls (Grenadier 1996).
2. **Competition neglect / extrapolation.** Firms underweight rivals' supply response (Greenwood & Hanson 2015, shipping).
3. **Wars of attrition / chicken games in downturns.** In DRAM, no one cut first, and the shakeout killed Qimonda and Elpida.
4. **Reputational herding** (Scharfstein & Stein 1990) and "keeping-up" incentives (Rajan 2005). These are well-known theory, but only the bibliographic records were retrieved this session.

Together these map neatly onto the "nobody wants to cut first" hyperscaler dynamic.

### Cited Findings
**Real options games**
- Grenadier (2002, *Review of Financial Studies* 15(3):691–721), "Option Exercise Games": a continuous-time Cournot–Nash model of investment timing. Competition largely erodes the value of the option to wait, so firms invest close to the zero-NPV threshold rather than at the high monopoly trigger. — [EconPapers](https://econpapers.repec.org/RePEc:oup:rfinst:v:15:y:2002:i:3:p:691-721); [IDEAS](https://ideas.repec.org/a/oup/rfinst/v15y2002i3p691-721.html)
- Grenadier (1996, *Journal of Finance* 51(5):1653–79), "The Strategic Exercise of Options: Development Cascades and Overbuilding in Real Estate Markets": gives a *rational* equilibrium explanation for building booms that continue while demand and values fall. — [IDEAS](https://ideas.repec.org/a/bla/jfinan/v51y1996i5p1653-79.html); [Stanford GSB](https://www.gsb.stanford.edu/faculty-research/publications/strategic-exercise-options-development-cascades-overbuilding-real)
- The option-exercise-game framework has also been applied to local real estate markets (NBER w9475). — [NBER w9475](https://www.nber.org/papers/w9475)
- Huisman & Kort (2015, *RAND Journal of Economics* 46(2):376–408), "Strategic capacity investment under uncertainty": a duopoly that chooses investment *timing and capacity size* together, extending entry deterrence and accommodation with a delay option. — [EconPapers](https://econpapers.repec.org/RePEc:bla:randje:v:46:y:2015:i:2:p:376-408); [Tilburg](https://research.tilburguniversity.edu/en/publications/strategic-capacity-investment-under-uncertainty-2/fingerprints/)
- A synthesis survey of strategic investment under uncertainty (real options plus game theory) is available. — [realoptions.org synthesis](https://realoptions.org/papers2010/98.pdf)

**Overinvestment and competition neglect (shipping)**
- Greenwood & Hanson (QJE 2015, 130(1):55–109), "Waves in Ship Prices and Investment": in dry-bulk shipping (1976–2011), high earnings coincide with high secondhand prices and fleet investment but predict *low* future returns. The authors explain this with firms over-extrapolating demand shocks and underweighting rivals' supply response ("competition neglect"). A modest expectational error produces large excess volatility in prices and investment. — [NBER w19246](https://www.nber.org/papers/w19246); [HBS Working Knowledge](https://hbswk.hbs.edu/item/waves-in-ship-prices-and-investment); [EconPapers](https://econpapers.repec.org/RePEc:oup:qjecon:v:130:y:2015:i:1:p:55-109)

**Semiconductors (DRAM chicken game)**
- In DRAM from 2006 to 2014, a "mad race to expand capacity" produced overcapacity. Producers kept output high as prices fell, cuts came too late, and a major shakeout followed in which Qimonda and Elpida exited. — [The Chicken Game and the Amplified Semiconductor Cycle (CORE)](https://core.ac.uk/works/128086389); [PDF](https://core.ac.uk/download/300140745.pdf)
- Exit dates conflict. One Korean report says Qimonda failed in 2007 and Elpida in 2012, while other sources place Qimonda's bankruptcy in 2009. 2009 is the commonly cited date **[background, not verified this session]**. — [Herald Corp](https://biz.heraldcorp.com/article/10892105)
- Elpida raised capex 67% to US$1bn during the downturn to catch the next upswing, which is war-of-attrition behaviour. — [Network World](https://www.networkworld.com/article/769189/computers-elpida-sees-dram-prices-rising-next-year-lifts-spending.html)
- In 2022 Samsung said it would not make "artificial production cuts". Industry commentators read this as a chicken game to secure dominance. Others argued no chicken game was needed in an already consolidated oligopoly. Motive is unproven. — [Asia Economy 2022](https://www.asiae.co.kr/en/article/2022103110044339945)
- A 2026 report cited by CSIS warns of a replay of the 2008 memory chicken game if AI demand slows while producers expand at once. — [Herald Corp](https://biz.heraldcorp.com/article/10892105); [MT.co.kr Aug 2026](https://www.mt.co.kr/en/opinion/2026/08/20/2026081820521093593)
- Government bailouts of memory makers shaped exit timing (Elpida, Qimonda). — [IEEE Spectrum](https://spectrum.ieee.org/bailouts-for-memory-makers)

**Telecom fiber (1998–2002)**
- The famous "3% of capacity in use" figure comes from a March 2001 Merrill Lynch study, and the researchers objected to how it was used. Networks are engineered for *peak* load, and planners add capacity at about 70% peak utilisation. — [Lightwave](https://www.lightwaveonline.com/business/earnings-statements/article/16648148/is-too-much-fiber-not-enough)
- TeleChoice (2001) argued that 63% of intercity fiber routes were "at or near capacity", which contradicts the glut narrative. — [eWeek](https://www.eweek.com/de/enterprise-apps/study-fiber-glut-running-out-fast/)
- Overbuild was forecast at 2.6 million fiber-km, more than a quarter of planned 2000 deployment. Telecom equipment spending fell 24% in 2001. — [Lightreading](https://www.lightreading.com/business-management/report-clec-fiber-still-growing); [Seattle Times 2002](https://archive.seattletimes.com/archive/20020113/darkfiber130/fiber-optic-lines-languish-under-scarred-city-streets)
- Richmond Fed overview of the telecom boom and bust. — [Richmond Fed Econ Focus, Winter 2003](https://www.richmondfed.org/publications/research/econ_focus/2003/winter/cover)

**Herding and "keeping up"**
- Scharfstein & Stein, "Herd Behavior and Investment", *AER* 80(3):465–479, June 1990. Only the bibliographic record was retrieved. — [IDEAS](https://ideas.repec.org/p/mit/sloanp/2213.html). The content is **[background, not verified this session]**: managers concerned with their reputation for ability mimic others' investments and ignore private information ("sharing the blame").
- Rajan (2005), "Has Financial Development Made the World Riskier?" (Jackson Hole / NBER w11728). Fetching it failed. The content is **[background, not verified this session]**: compensation tied to relative performance pushes managers to herd and take hidden tail risk. Chuck Prince's July 2007 line "as long as the music is playing, you've got to get up and dance" is the usual illustration. No source retrieved.

**AI capex arms race (context, 2026)**
- Meta's 2026 capex guidance is reported at $125–145bn; sources differ. Combined hyperscaler 2026 capex estimates range from about $600bn (+36% YoY) to about $725bn (May 2026 newsletter; up from the $650bn in mid-April models). — [Bloomberg, Oct 2025](https://www.bloomberg.com/news/articles/2025-10-29/meta-projects-increasing-expenses-takes-one-time-tax-charge); [LPL Research](https://www.lpl.com/research/blog/hyperscalers-plan-to-live-up-to-their-name.html); [Buttondown "Same Capex, Different Denominators" Q1 2026](https://buttondown.com/dodatathings/archive/same-capex-different-denominators-what-q1-2026/)
- The arms-race logic as analysts describe it: a hyperscaler that steps back may not be able to reacquire capacity quickly if demand proves real. This is a preemption game with capacity scarcity. — [Invezz](https://invezz.com/news/2025/12/26/looking-ahead-to-2026-why-hyperscalers-cant-slow-spending-without-losing-the-ai-war/)
- Skeptic estimate (blog): direct AI revenue of about $40–60bn in 2025 against about $300bn of AI-specific capex. Part of the demand in hyperscaler models comes from hyperscaler-funded customers. — [philippdubach.com](https://philippdubach.com/posts/ai-capex-arms-race-who-blinks-first/)

### Inferences
- **Hyperscaler capex should be a two-regime game.** In the boom regime, use a preemption / option-exercise game in the style of Grenadier (2002) and Huisman–Kort: the investment trigger falls toward zero NPV as the number of serious rivals rises, and the model gives closed-form trigger thresholds. In the bust regime, use a war of attrition (DRAM-style): whoever cuts first loses share, so all firms delay cuts until a cash-flow or credit constraint binds. The switch condition is when the revenue/capex gap or the stock market's reaction crosses a threshold.
- **Greenwood–Hanson "competition neglect" is easy to simulate.** Give each agent a parameter θ ∈ [0,1] for the share of rivals' announced capacity that it internalises. θ < 1 produces overbuild waves endogenously, and θ can be calibrated against the 2025–26 gap between capex and revenue.
- **Reputational herding (Scharfstein–Stein) implies capex announcements are strategic complements.** In a quarterly sim, include a term in which each firm's capex responds positively to the average peer capex surprise, not only to its own demand signal.
- **Nvidia counter-cyclical behaviour:** the DRAM analogy suggests the dominant supplier may keep investing, or financing customers, through a slowdown to protect share. Circular financing works as Nvidia's version of "not cutting first".
- **Shift to in-house chips (TPU/Trainium/MTIA/Maia)** fits an *irreversible switching real option*. Switching is triggered when the Nvidia price premium times volume exceeds the amortised fixed cost of the in-house programme. Nvidia's price cut is the strategic deterrent, a limit-pricing game. No direct evidence was retrieved this session (see Gaps).

### Gaps
- **Shale:** no source retrieved this session on shale overinvestment or game-theoretic models (e.g., the OPEC vs. shale price war of 2014–16). Further search is needed.
- **Huisman & Kort (2015):** full results not retrieved. In particular, the claim that the preemption leader invests earlier in *smaller* capacity than a monopolist, and overinvests to deter entry when uncertainty is high, is **[background, not verified this session]**.
- **Smets (1991)** and **Fudenberg & Tirole (1985) "Preemption and rent equalization"**: not retrieved.
- **In-house chip switching:** no empirical or game-theoretic paper on hyperscaler custom silicon adoption was found.
- **Scharfstein–Stein and Rajan:** only bibliographic records; content unverified.

---

## 3. Renegotiation and default: bargaining models, incomplete contracts, strategic default, and take-or-pay evidence

### Takeaway
Hart–Moore (1994) gives the right core logic. An agent who can withdraw an essential input (human capital, or in the AI case the ability to keep operating the cluster) caps what it can credibly owe, and debt gets renegotiated down to the creditor's outside option. The 1980s US natural-gas take-or-pay crisis is the closest historical analogue to AI compute commitments. Long-term, above-market purchase obligations signed in a boom were mostly resolved by negotiated buyouts and settlements, with regulators spreading the losses, not by literal performance or total default. 2025–26 AI events show the same pattern. Lessees walk away before leases are signed, sites are cancelled when terms cannot be agreed, and contract terms such as force majeure and hell-or-high-water clauses decide who bears the loss.

### Cited Findings
**Theory**
- Hart & Moore (1994, *QJE* 109(4):841–879), "A Theory of Debt Based on the Inalienability of Human Capital": an entrepreneur cannot commit not to withdraw his human capital, so the threat to quit or default caps the debt he can owe at each date. The optimal repayment path depends on the maturity of project returns and the durability and specificity of the assets. — [Harvard (Hart)](https://hart.scholars.harvard.edu/publications/theory-debt-based-inalienability-human-capital); [EconPapers](https://econpapers.repec.org/RePEc:oup:qjecon:v:109:y:1994:i:4:p:841-879.)
- In merger analysis, Nash bargaining models predict substantially lower consumer harm than Bertrand models, so the choice of bargaining vs. price-setting model materially changes results. — [FTC Working Paper 348](https://www.ftc.gov/system/files/ftc_gov/pdf/working_paper_348.pdf)
- Rubinstein (1982) alternating-offer bargaining has a unique subgame-perfect split. Player 1's share is (1−δ₂)/(1−δ₁δ₂), so the more patient side gets more. Generalised Nash bargaining splits the surplus over disagreement payoffs according to bargaining-power weights. **[background, not verified this session]**

**Take-or-pay evidence (US natural gas, 1980s)**
- Pipelines signed long-term take-or-pay contracts at high prices from 1977 to 1982. When market prices fell, they built up large liabilities for gas they could not use. FERC Order No. 500 (1987) let pipelines pass some of these liabilities to producers, customers and downstream pipelines. — [Justia (F.3d case)](https://law.justia.com/cases/federal/appellate-courts/F3/26/1129/619030/); [DOJ brief 1989](https://www.justice.gov/d9/osg/briefs/1989/01/01/sg890010.txt)
- Scale: per INGAA (1986), about $3.5bn of settlements had been reached, buyer exposure remained at about $6.5bn at end-1985, and about $1.4bn was in litigation or arbitration. These are industry-association figures. — [OSTI](https://www.osti.gov/biblio/6840048); [vLex: Settlements of Gas Contract Disputes](https://law-journals-books.vlex.com/vid/chapter-8-settlements-gas-contract-950462913)
- A DOE/OSTI analysis of FERC data from 1980–1984 argues that voluntary renegotiation and buyouts resolved much of the problem and that the net burden was well below the nominal figure. — [OSTI 6891237](https://www.osti.gov/biblio/6891237)
- Practitioner retrospective: "The Take-or-Pay Wars: A Cautionary Analysis for the Future". One source claims the contracts "essentially bankrupted" pipelines; treat that as opinion. — [vLex chapter 10](https://law-journals-books.vlex.com/vid/chapter-10-the-take-971590664)

**AI compute and lease renegotiation (2025–26)**
- In February 2025, TD Cowen channel checks indicated Microsoft had voided about 200 MW of US data-centre leases and pulled back on converting Statements of Qualification into leases. In March 2025 TD Cowen reported about 2 GW of abandoned US and European projects, linked to Microsoft forgoing some OpenAI business. — [Bloomberg Feb 2025](https://www.bloomberg.com/news/articles/2025-02-24/microsoft-cancels-leases-for-ai-data-centers-analyst-says); [Bloomberg Mar 2025](https://www.bloomberg.com/news/articles/2025-03-26/microsoft-abandons-more-data-center-projects-td-cowen-says); [The Register](https://www.theregister.com/2025/02/24/does_microsoft_pull_back_on/)
- In March 2026, Oracle and OpenAI reportedly abandoned the planned expansion of the Abilene, TX campus from 1.2 GW toward 2 GW. Financing terms and shifting demand forecasts were cited, along with OpenAI wanting newer Nvidia generations, which is a technology-obsolescence motive. The roughly 4.5 GW / $300bn main Oracle–OpenAI contract reportedly stays on track. — [The Register, Mar 2026](https://www.theregister.com/on-prem/2026/03/07/openai-and-oracle-reportedly-abandon-tx-stargate-expansion/4159805); [Yahoo Finance](https://finance.yahoo.com/news/openais-massive-stargate-data-center-154932400.html); [Invezz](https://invezz.com/news/2026/03/09/who-wins-as-oracle-openais-500b-stargate-project-stalls/)
- In September 2026, Oracle reportedly claimed force majeure on delays at the New Mexico "Project Jupiter" site in a letter to Blue Owl Capital, its private-credit funder. Per WSJ reporting cited there, the lease has hell-or-high-water terms, so Oracle must keep paying rent regardless of power availability. This comes from a secondary, opinionated source, so verify it. — [Pivot to AI, Sep 2026](https://pivot-to-ai.com/2026/09/25/oracle-invokes-force-majeure-on-openai-data-centre-contract/)
- In late 2025, completion of OpenAI data centres was reported slipping from 2027 to 2028 because of labour and materials shortages, which Oracle disputed. The Stargate partners clashed over site control, and the venture moved to bilateral deals. — [CNBC Dec 2025](https://www.cnbc.com/2025/12/12/oracle-says-there-have-been-no-delays-in-openai-arrangement.html); [Tom's Hardware](https://www.tomshardware.com/tech-industry/artificial-intelligence/stargate-ai-data-centers-for-openai-reportedly-delayed-by-squabbles-between-partners-sources-say-openai-oracle-and-softbank-disagreed-on-who-would-have-ultimate-control-of-the-planned-data-centers)
- OpenAI's CFO said at Davos that it now prioritises cloud partnerships over owning data centres in order to protect its balance sheet. This shifts commitment risk to cloud providers and their lenders. — [Yahoo Finance](https://finance.yahoo.com/news/openais-massive-stargate-data-center-154932400.html)
- CNBC argues that "Oracle is building yesterday's data centers with tomorrow's debt", which points to an asset-specificity and obsolescence mismatch. — [CNBC Mar 2026](https://www.cnbc.com/2026/03/09/oracle-is-building-yesterdays-data-centers-with-tomorrows-debt.html)

### Inferences
- **AI labs' "pay / delay / renegotiate" decision maps onto Hart–Moore plus Nash bargaining.** The lab's credible repayment is capped by min(contract amount, counterparty's value from continuing with the lab minus its outside option). The outside option is re-leasing the capacity to another tenant; Meta was reportedly interested in surplus Stargate capacity. When the outside option is strong, the provider holds firm. When it is weak (bespoke, soon-to-be-obsolete GPUs), the lab can extract concessions. In practice, compute a generalised Nash bargaining split each quarter. It is closed-form and O(1) per contract.
- **Contract terms decide who absorbs losses.** Take-or-pay or hell-or-high-water clauses push loss onto the payer, which then defaults or settles. Force majeure and termination-for-convenience shift it to the provider and its lenders. The sim should carry contract attributes (take-or-pay %, termination fee, force-majeure flag) and resolve them through a bargaining step rather than assume full performance.
- **Gas-era base rate:** most exposure was settled through buyouts at a fraction of face value, with regulators spreading losses. A reasonable prior for AI is renegotiated cuts or deferrals rather than outright default, unless the counterparty is a single-asset SPV.
- **Nvidia's capacity guarantees and backstops** are a commitment game. Honouring a guarantee preserves reputation (repeated-game value) and the customer pipeline. Walking away saves cash today. The repeated-game folk-theorem logic says Nvidia honours guarantees while its discount factor and franchise value are high, and stops near a severe downturn.

### Gaps
- **LNG price-review arbitration and oil-indexation renegotiation:** not retrieved (search returned nothing relevant).
- **Telecom IRU / capacity-contract renegotiations in 2001–03** (e.g., Global Crossing, WorldCom): not retrieved.
- **Debt renegotiation models** (e.g., Bolton–Scharfstein 1996; Mella-Barral–Perraudin 1997 strategic debt service; Anderson–Sundaresan 1996): not retrieved this session.
- **Size of OpenAI's total commitments** (e.g., the widely reported ~$1.4tn figure) and any formal 2026 renegotiation: no reliable source found.

---

## 4. Bayesian games, signalling and global games for lender runs and coordination failures in credit markets

### Takeaway
Global games (Carlsson–van Damme 1993; Morris–Shin 1998) are the standard tool for runs and rollover crises. Adding small private noise about fundamentals turns a multiple-equilibrium coordination game into a *unique* threshold equilibrium. Each lender rolls over if its private signal is above a cutoff. This is attractive for simulation because it replaces equilibrium selection with a computable threshold. It fits GPU-backed SPV lenders and neocloud refinancing directly, given that the IMF and BIS have publicly flagged AI circular financing as a systemic risk.

### Cited Findings
- Morris & Shin (1998, *AER*), "Unique Equilibrium in a Model of Self-Fulfilling Currency Attacks": dropping common knowledge of fundamentals yields a unique equilibrium. — [Wikipedia: Global game](https://EN.wikipedia.com/wiki/Global_game); [MIT 14.126 lecture notes](https://www.ocw.mit.edu/courses/14.126-game-theory-spring-2024/mit14_126_s24_lecture_global-games.pdf)
- Global games are coordination games of incomplete information in which the status quo collapses once a large enough fraction attacks it. They have been applied to currency attacks, bank runs, debt crises and political change. — [Angeletos, Hellwig & Pavan, Econometrica 2007](https://economics.mit.edu/sites/default/files/publications/Angeletos%20Hellwig%20Pavan%20%28Ecma%202007%29.pdf)
- Applications to bank runs cite Goldstein & Pauzner (working paper 2000; published *Journal of Finance* 2005, "Demand-deposit contracts and the probability of bank runs") and Rochet & Vives (2004). Debt-crisis applications cite Morris & Shin (2004) and Corsetti, Guimaraes & Roubini (2004). The Goldstein–Pauzner year differs across sources because of the WP vs. journal versions. — [Goldstein review of financial crises (Wharton)](https://finance.wharton.upenn.edu/~itayg/Files/financialcrisesreview-published.pdf); [BIS Working Paper 135](https://www.bis.org/publ/work135.pdf); [NBER w11191](https://www.nber.org/papers/w11191.pdf)
- Angeletos–Hellwig–Pavan (2007) show that in *dynamic* global games, learning over time can bring back multiple equilibria and produce sudden attacks after long calm periods. This matters for a 20-quarter sim. — [Econometrica 2007 PDF](https://economics.mit.edu/sites/default/files/publications/Angeletos%20Hellwig%20Pavan%20%28Ecma%202007%29.pdf)
- Central banks use the framework, e.g. Bank of Canada staff work on rollover and coordination risk. — [Bank of Canada WP 2015-14](https://www.bankofcanada.ca/wp-content/uploads/2015/04/wp2015-14.pdf); [NY Fed Staff Report 249](https://www.newyorkfed.org/medialibrary/media/research/staff_reports/sr249.html)
- AI credit context:
  - xAI reportedly raised about $20bn for GPUs, about $12bn of it as debt through an SPV that buys Nvidia chips and leases them to xAI, with Nvidia contributing about $2bn of equity. — [Tom's Hardware](https://www.tomshardware.com/pc-components/gpus/nvidia-is-turning-gpus-into-capital-questions-exist-around-circularity)
  - CoreWeave raised $2.3bn of H100-backed debt. — [Tom's Hardware](https://www.tomshardware.com/pc-components/gpus/nvidia-is-turning-gpus-into-capital-questions-exist-around-circularity)
  - The IMF and BIS have flagged AI circular financing as a systemic downside risk. — [Tom's Hardware](https://www.tomshardware.com/pc-components/gpus/nvidia-is-turning-gpus-into-capital-questions-exist-around-circularity)
  - Nvidia's own credit market "flinched" after its ~$750bn of announced AI deals. — [The Next Web](https://thenextweb.com/news/nvidia-announced-750bn-of-ai-deals-its-own-credit-market-flinched)

### Inferences
- **Lender module.** Each lender i observes x_i = θ + σε_i, where θ is SPV collateral health (GPU rental rate × utilisation versus debt service). It rolls over iff x_i > x*. In the canonical uniform-prior / normal-noise limit, x* solves a one-dimensional equation and can be solved by bisection each quarter, which costs microseconds. The run probability then becomes a smooth function of fundamentals, avoiding knife-edge multiple-equilibrium jumps. This is a major practical advantage for Monte Carlo.
- **Signalling.** Nvidia's equity stakes and backstops in customers (OpenAI, xAI SPV, CoreWeave) work as costly signals of collateral quality to lenders. In a Bayesian-game reading, lenders raise their posterior on θ when Nvidia co-invests. A credible Nvidia withdrawal would then cause a discrete shift in lender beliefs and possibly a rollover cascade. A simple Bayesian update of the lenders' prior mean whenever Nvidia changes its stake is enough to capture this.
- **Dynamic caution.** Per Angeletos–Hellwig–Pavan, model the public signal (e.g., AI-lab revenue disclosures, GPU spot rental prices) as accumulating each quarter. Calm can give way to sudden runs, which is realistic for 2027–28 refinancing walls.

### Gaps
- No empirical paper was found that applies global games to asset-backed or equipment-lease (GPU-like) credit specifically.
- The terms and loan-to-value ratios of GPU-backed loans are not verified beyond the press figures above.

---

## 5. Computational solution methods and tractability for ~40 players × 20 quarters × thousands of browser runs; pitfalls

### Takeaway
Exact Markov-perfect equilibrium (Ericson–Pakes / Pakes–McGuire) cannot be computed for 40 players because of the curse of dimensionality. The practical design is:
1. **Closed-form or one-dimensional rules** (real-option triggers, global-game cutoffs, Nash-bargaining splits) for the structural sub-games.
2. **Myopic or damped iterated best response, or level-k (k ≤ 2) with logit (quantal) noise**, for each quarter's simultaneous moves. Quantal level-k is the best predictor of human initial play in a 10-dataset meta-analysis.
3. **Oblivious or partially oblivious equilibrium**, precomputed offline and shipped as lookup tables, if forward-looking equilibrium policies are needed. OE approximates MPE well with tens to hundreds of firms, and "partially oblivious" handles a few dominant firms such as hyperscalers and Nvidia.

MCTS and full QRE fixed points per run are too expensive for thousands of runs in-browser, unless restricted to one focal player or precomputed.

### Cited Findings
- Pakes–McGuire (1994, 2001) algorithms compute pure-strategy MPE of Ericson–Pakes industry dynamics. Computing expectations over all future industry states suffers a curse of dimensionality. Pakes–McGuire (2001) use stochastic approximation to ease it. — [NBER Technical WP t0304](https://www.nber.org/papers/t0304.pdf); [Doraszelski & Pakes framework (Kellogg)](https://www.kellogg.northwestern.edu/research/math/papers/1383.pdf)
- Doraszelski & Judd (2012): continuous-time stochastic games with more than a few state variables are orders of magnitude faster to solve than discrete-time ones. — [Quantitative Economics 2012, "Avoiding the curse of dimensionality in dynamic stochastic games"](https://mail.econometricsociety.org/publications/quantitative-economics/2012/03/01/Avoiding-the-curse-of-dimensionality-in-dynamic-stochastic-games/file/33-216-1-CE.pdf)
- Doraszelski & Satterthwaite: existence of MPE in Ericson–Pakes is not straightforward because algorithms cannot handle mixed strategies. They fix this by drawing private random entry costs (Harsanyi purification). — [Computable Markov-perfect Industry Dynamics](https://www.kellogg.northwestern.edu/faculty/satterthwaite/research/Computable%20Markov-perfect%20Industry%20Dynamics.pdf)
- Survey: "Computing Equilibria of Dynamic Games" (Operations Research). — [INFORMS](https://pubsonline.informs.org/doi/fpi/10.1287/opre.2016.1572)
- Weintraub, Benkard & Van Roy (Econometrica 2008), "Markov Perfect Industry Dynamics with Many Firms": in **oblivious equilibrium (OE)** each firm conditions only on its own state and the long-run average industry state. OE approximates MPE closely with many firms. — [Econometrica](https://econometricsociety.org/publications/econometrica/2008/11/01/markov-perfect-industry-dynamics-many-firms); [NBER w11900](https://www.nber.org/papers/w11900); [PDF](https://web.stanford.edu/~lanierb/research/Markov_Perfect_Industry_EMA.pdf)
- The computational companion (Operations Research 2010) found the OE approximation is often good for industries with hundreds of firms and sometimes for tens of firms. — [Computational Methods OR](https://web.stanford.edu/~lanierb/research/Computational_Methods_OR.pdf)
- Benkard, Jeziorski & Weintraub (RAND 2015), **partially oblivious equilibrium (POE)**: every firm tracks a set of dominant firms' states exactly and the fringe only on average. This suits concentrated industries. — [Columbia PDF](https://business.columbia.edu/sites/default/files-efs/pubfiles/3867/markov_perfect.pdf); [NBER w19307](https://www.nber.org/papers/w19307.pdf)
- Wright & Leyton-Brown (GEB 2017) compared QRE, level-k, cognitive hierarchy (Camerer–Ho–Chong 2004), quantal level-k (QLk) and noisy introspection on 10 datasets of human play in two-player games. **QLk predicted initial play significantly better** than the others, out of sample. A simpler two-parameter model did about as well. Poisson-CH was not competitive in their initial comparisons. Nash equilibrium was a baseline. — [GEB 2017 PDF](https://www.cs.ubc.ca/~kevinlb/papers/2017-GEB-PredictingHumanBehavior.pdf); [arXiv 1306.0918](https://arxiv.org/pdf/1306.0918.pdf); [AAAI talk "Beyond Equilibrium"](https://www.cs.ubc.ca/~kevinlb/talks/2010-AAAI-BeyondEquilibrium.pdf)
- The specification of level-0 behaviour materially affects level-k and CH predictions (Wright & Leyton-Brown, EC 2014). — [EC 2014 Level-0](https://www.cs.ubc.ca/~kevinlb/papers/2014-EC-Level0.pdf)
- Recent arXiv work on computing equilibria in dynamic games. — [arXiv 2407.14914](https://arxiv.org/pdf/2407.14914v3)

**Pitfalls [background, not verified this session]**
- Fictitious play need not converge. Shapley (1964) gave a 3×3 game in which beliefs cycle forever. It does converge in zero-sum, potential and 2×2 games.
- Simultaneous best-response dynamics in linear Cournot oligopoly are unstable for ≥3–4 firms (Theocharis 1960). Damping (partial adjustment) restores convergence.
- Preemption games have multiple equilibria (preemption vs. tacit-collusion "joint late investment"), and mixed-strategy equilibria raise coordination-failure risk where both firms invest at once (Fudenberg–Tirole 1985; Huisman–Kort).
- In general-sum games QRE has multiple branches. The homotopy (tracing from λ=0) picks the principal branch. Without it, results depend on starting values.

### Inferences (computational budget estimates; my own back-of-envelope, not sourced)
Assumptions: 40 players × 20 quarters × 5,000 runs = 4 M player-quarter decisions. Modern browser JavaScript does roughly 10⁸–10⁹ simple flops/sec per core. Web Workers give 4–8 cores.

| Method | Per player-quarter cost | Total for 5,000 runs | Browser feasible? | Fit |
|---|---|---|---|---|
| Closed-form real-option trigger / global-game cutoff / Nash bargaining | O(1)–O(50) (bisection) | ~10⁸ ops | Yes, under 1 s | Structural sub-decisions (invest timing, lender rollover, contract settlement) |
| Myopic best response over a 10–20-action grid with 1-quarter lookahead | ~20 payoff evals | ~10⁸ | Yes, about 1 s | Baseline capex, pricing |
| Damped iterated best response to a within-quarter fixed point (≤20 iterations) | ~400 evals | ~2×10⁹ | Yes, seconds with workers | "Equilibrium" quarterly moves; add damping 0.3–0.5 |
| Logit QRE / quantal level-k (k ≤ 2) | ~2–3× best response | ~5×10⁹ | Yes, seconds to tens of seconds | Recommended default: noise gives smooth outcome distributions |
| Fictitious play over the 20-quarter horizon | Like iterated BR, plus belief storage | ~10⁹–10¹⁰ | Marginal | Use only for learning stories; may cycle |
| Exact MPE (Pakes–McGuire) | State space ~Kⁿ, e.g. 10⁴⁰ | Infeasible | No | Not usable |
| Oblivious / partially oblivious equilibrium | Offline solve (minutes to hours in Python/Julia); online is a table lookup | ~10⁷ online | Yes, if precomputed | Forward-looking capex policies for ~5 dominant + ~35 fringe players |
| MCTS per decision (10³–10⁴ rollouts × 20-quarter depth) | 10⁵–10⁶ | 10¹¹–10¹² | No (only for 1 focal player in an interactive "advisor" mode) | User-as-player "what should I do" mode |

- **Recommended hybrid.** POE (5–8 dominant players: MSFT, GOOGL, AMZN, META, ORCL, Nvidia, OpenAI, plus Anthropic or xAI), with fringe neoclouds and lenders reacting to aggregates. Within each quarter, compute a damped quantal-best-response step. Sub-games (contract renegotiation, lender rollover, in-house chip switching) use closed-form rules. This avoids the multiple-equilibrium problem by construction: QRE noise plus global-game private noise give unique, smooth responses. The Monte Carlo distribution then reflects fundamental uncertainty rather than arbitrary equilibrium selection.
- **Treat equilibrium selection as a scenario parameter.** Examples: "preemption" vs. "tacit restraint" regime; λ for rationality; level-k depth. Do not hide it.

### Gaps
- No published benchmark found of game-solver performance in browser JS/WebAssembly. The figures above are my own estimates.
- No source found applying MCTS to corporate capacity games.

---

## 6. Real-world applications: industry forecasting, antitrust/merger simulation, energy markets, central bank and consultancy work

### Takeaway
Game-theoretic simulation is mainstream in two applied areas:
- **Antitrust merger simulation**, using Bertrand-logit, auction and Nash-bargaining models.
- **Electricity market-power analysis**, using Cournot models with forward contracts. Observed PJM and New England prices were close to Cournot predictions once vertical arrangements were included.

The key lessons for an AI demand model are that model choice (Bertrand vs. bargaining vs. Cournot) changes results materially, and that contract positions (forward contracts in power; take-or-pay / prepaid compute in AI) must be modelled or Cournot will overstate market power. Central banks use global-games and coordination-risk models for financial-stability work.

### Cited Findings
- Merger simulation in practice: Bertrand-logit differentiated-products models (Werden & Froeb) are standard at DOJ. — [DOJ EAG paper](https://www.justice.gov/atr/page/file/1011676/dl); [DOJ](https://www.justice.gov/media/922126/dl); [Wikipedia: Merger simulation](https://en.wikipedia.org/wiki/Merger_simulation)
- The FTC (Working Paper 348) compared Bertrand, second-score auction and Nash-bargaining merger models. Predicted outcomes differ markedly, with predicted consumer harm substantially lower under bargaining and auction models. — [FTC WP 348](https://www.ftc.gov/system/files/ftc_gov/pdf/working_paper_348.pdf)
- Electricity: Cournot simulation is frequently used to assess mergers and market-structure changes because concentration indices perform poorly. — [U. Alberta WP 2016-08](https://sites.ualberta.ca/~econwps/2016/wp2016-08.pdf)
- Bushnell, Mansur & Saravia (PJM, New England, California) bounded outcomes between perfect competition and Cournot. Cournot simulations that ignore vertical arrangements and contracts "vastly exceed observed prices". After accounting for them, performance is similar to Cournot in each market. — [NBER w13507](https://www.nber.org/papers/w13507.pdf); [UCI PDF](https://www.economics.uci.edu/files/docs/colloqpapers/s05/Bushnell.pdf)
- Firms have an incentive to reduce forward-contract cover after a concentration-increasing merger. Market screens for electricity mergers consider existing forward commitments. — [Haas CSEM WP 126R](https://haas.berkeley.edu/wp-content/uploads/csemwp126R.pdf); [J. Regulatory Economics](https://dx.doi.org/10.1007/s11149-017-9323-0)
- DOJ: market power depends on ownership of units along the supply curve, not overall share. — [DOJ EAG "Mergers in Regulated Industries: Electricity"](https://www.usdoj.gov/atr/public/eag/228709.htm)
- Central banks: global-game and rollover-risk models appear in Bank of Canada, NY Fed and BIS working papers. — [Bank of Canada WP 2015-14](https://www.bankofcanada.ca/wp-content/uploads/2015/04/wp2015-14.pdf); [NY Fed SR 249](https://www.newyorkfed.org/medialibrary/media/research/staff_reports/sr249.html); [BIS WP 135](https://www.bis.org/publ/work135.pdf)
- Practitioner telecom capacity planning: TeleChoice launched a "strategic network capital planning model" for carriers and vendors in the fiber-boom era. — [Lightwave](https://www.lightwaveonline.com/business/earnings-statements/article/16659923/telechoice-launches-strategic-network-capital-planning-model-for-telecom-carriers-vendors)

### Inferences
- **AI analogy to the electricity lesson.** Hyperscaler–lab compute contracts (Oracle–OpenAI ~$300bn; Nvidia-backed SPVs) play the role of forward contracts. A Cournot capacity model of GPU supply that ignores them will misstate pricing and utilisation. Carry contracted volume as a state variable that is netted out of "strategic" output.
- **Model-choice risk.** As in FTC WP 348, results will differ by whether the GPU and cloud markets are modelled as Cournot (capacity-constrained, fits 2024–26 scarcity), Bertrand (fits a glut), or bargaining (fits bilateral mega-contracts). A credible sim should let the regime switch with utilisation, e.g. Cournot when utilisation is above about 85% and Bertrand-like below. This threshold is my own suggestion, not sourced.

### Gaps
- No consultancy or central-bank publication found that applies game theory specifically to AI capex.
- Energy-system equilibrium models (e.g., complementarity/MCP models of gas markets) and OPEC game models were not retrieved this session.
- No ERCOT-specific Cournot study retrieved.

---

## 7. Synthesis: which model fits each AI-buildout decision (my mapping, built from the findings above)

### Takeaway
A browser-tractable architecture assigns one well-understood sub-game to each decision type. Each sub-game is solved in closed form or by a few damped iterations, and the sub-games are coupled through a quarterly quantal-best-response loop over a partially oblivious state, with dominant firms tracked exactly and the fringe as aggregates.

### Cited Findings
- Circular financing context: Nvidia's 2026 AI equity investments exceeded $40bn, anchored by a reported $30bn OpenAI investment. — [The Next Web](https://thenextweb.com/news/nvidia-40bn-ai-equity-investments-2026)
- Nvidia reportedly explored backstopping financing for a SoftBank-developed Ohio data centre for OpenAI. Reported sizes conflict: a backstop cut from $250bn to $120bn in one outlet; up to $100bn of credit support and up to $350bn of GPU financing in another. — [Axios, Jul 2026](https://axios.com/2026/07/27/nvidia-openai-financing-ai-jensen-huang-ssi); [247 Wall St, Aug 2026](https://247wallst.com/investing/2026/08/17/nvidias-circular-financing-web-gets-even-wider/); [The Star](https://www.thestar.com.my/business/business-news/2026/07/28/nvidia-corp-explores--support-for-openai)
- The loop critics describe: Nvidia funds SB Energy → SB Energy builds and leases to OpenAI → OpenAI fills it with Nvidia GPUs → Nvidia revenue appears twice. Jensen Huang called the "circular" framing "ridiculous". — [247 Wall St](https://247wallst.com/investing/2026/08/17/nvidias-circular-financing-web-gets-even-wider/); [Tom's Hardware](https://www.tomshardware.com/pc-components/gpus/nvidia-is-turning-gpus-into-capital-questions-exist-around-circularity); [Fortune, Sep 2025](https://fortune.com/2025/09/28/nvidia-openai-circular-financing-ai-bubble/)

### Inferences
| Player / decision | Recommended model | Decision theory | Solve method (browser) |
|---|---|---|---|
| Hyperscaler capex ("nobody cuts first") | Boom: preemption / option-exercise game (Grenadier 2002; Huisman–Kort). Bust: war of attrition (DRAM chicken). Plus a Greenwood–Hanson competition-neglect parameter θ and a Scharfstein–Stein peer-capex term | EU plus relative-position ("keeping up") loss term | Closed-form triggers; damped quantal BR across the 5 hyperscalers each quarter |
| AI lab: pay / delay / renegotiate commitments | Hart–Moore limited-commitment debt plus generalised Nash bargaining against the provider's re-lease outside option; contract terms (take-or-pay, force majeure, termination fee) as state | Prospect theory with runway/target reference point | O(1) bargaining split per contract per quarter |
| Lenders to GPU-backed SPVs / neoclouds | Global game (Morris–Shin) rollover with private signals of collateral; Nvidia co-investment as a signal | Ambiguity-averse (worst-case haircut) | Bisection for the cutoff x* each quarter |
| Nvidia: honour guarantees / keep investing in customers / cut prices | Repeated game with reputation (honour while franchise value is high); dominant-firm Stackelberg leader setting price against hyperscaler in-house switching thresholds; strategic "not cutting first" via customer financing | EU (risk-neutral, long horizon) | Leader best response to the followers' closed-form switching rules |
| Hyperscaler in-house chip switching speed | Irreversible switching real option; Nvidia price cut as limit pricing | EU | Threshold rule: switch share rises when Nvidia margin × volume > amortised in-house cost |
| Fringe neoclouds / smaller labs | Oblivious-equilibrium policy against the aggregate state | Prospect theory (high leverage) | Precomputed lookup table |

- **Calibration anchors available from findings:** 2026 capex levels (~$600–725bn combined); lease walk-away episodes (Microsoft ~200 MW then ~2 GW in 2025); site cancellations (Abilene expansion, March 2026); force-majeure disputes (Oracle/Blue Owl, September 2026); take-or-pay settlement ratios from 1980s gas (~$3.5bn settled vs. ~$6.5bn remaining exposure at end-1985).

### Gaps
- No calibrated estimates of the bargaining power of labs vs. cloud providers, of lender signal-noise σ, or of the competition-neglect θ for AI. These must be set by scenario or fitted to future data.
- The take-or-pay settlement *recovery rate* (cents on the dollar) in 1980s gas was not found as a single authoritative number.
