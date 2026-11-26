# AI Capital Flows — design

- Date: 2026-11-26
- Status: approved by the owner on 2026-11-26
- Owner: the fund's investing manager (the user). Builders: Claude sessions.
- Related: visual mockup `docs/mockups/canvas-v6.html`, research report `reports/AI demand forecasting methods.md`,
  research notes `research_notes/AI demand forecasting methods/`, source captures `data/sources/`, SEC data `data/raw/sec/`.

## 1. Intent

The fund owns NVIDIA, SK Hynix, TSMC and Alphabet. Inside the fund there is a running debate about whether AI is a
bubble. This tool should settle the debate with evidence instead of opinion. It models how money flows through the AI economy, from
investors and end customers through AI labs and clouds to chip makers and their suppliers, and simulates how that
system plays out over time.

The first version centres on **NVIDIA**. Every other company is modelled because it affects NVIDIA. The tool answers,
for NVIDIA and the companies around it:

- revenue and earnings;
- debt;
- whether each company can pay its commitments, whether it defaults, or whether it finds a way around them
  (delays, renegotiates, walks away);
- bankruptcy risk.

The research changed one framing that the design relies on. In every historical boom (railways, telecom fibre, shale,
shipping) the physical capacity was eventually used, and the financiers were the ones wiped out. So "is AI a bubble?"
splits into two questions the tool answers separately:

1. **Is the demand real?** (Will the capacity be used and paid for at prices that make sense?)
2. **Can everyone pay?** (When does financing turn, how big is the overshoot then, and who absorbs the losses?)

## 2. Users and use

- Users: the investing manager and colleagues at the fund. Nobody on the team reads code.
- Use: run live on a laptop and on a big screen during discussions. Someone changes assumptions, presses Run, and
  explains what happens. It must be clear enough to talk through in a meeting.
- Theme: light.

## 3. Goals, non-goals, anti-goals

**Goals**

- Quarterly simulation from the backtest start (2022 Q1) through 2030 Q4, with the forecast starting from the latest
  completed quarter.
- NVIDIA outputs: total revenue, Data Center revenue (split Hyperscale vs AI Clouds/Industrial/Enterprise as NVIDIA
  now reports it), physical AI revenue (cars and robotics), gross margin, EPS, debt and cash, supplier commitments
  covered, customer money at risk, default probability, and the share of NVIDIA demand that NVIDIA itself finances or
  guarantees.
- Per-company health for every modelled company: Minsky label (hedge / speculative / Ponzi), default probability, and
  events with reasons ("Defaulting beats a 13% rescue loan").
- Two modes: **One path** (a single run with your conditions) and **Range of outcomes** (thousands of runs giving
  probabilities and ranges).
- Every result is compared with Wall Street consensus where consensus exists.
- An early-warning dashboard of indicators that historically turned before busts.
- A sensitivity view: which inputs drive a given result.
- Zoom into any money flow to see the real deal behind it.

**Non-goals (version 1)**

- Stock price or valuation outputs.
- NVIDIA's gaming and other non-AI segments as model drivers. They are carried as a simple trend only, so totals and
  EPS still match NVIDIA's reported figures.
- Outputs centred on SK Hynix, TSMC or Alphabet. They are in the model as players. Making them headline outputs is
  a later version.
- Leadership and governance drama (e.g., the November 2026 CEO episode) as model drivers.
- User accounts, saved shared scenarios, or a database. Can be added later (e.g., Supabase).

**Anti-goals (failure even if it "works")**

- The user decides what companies do. The user only sets outside conditions; company behaviour comes from the model.
- Inputs pulled from thin air. Every condition starts from real data and shows its forecast range and that range's source.
- False precision. Uncertain settings are shown as ranges or visible settings, not hidden constants. Unverified
  figures are labelled.
- A cluttered or "AI-template" look (see §6; the look is locked).
- A model that cannot reproduce the past. If it fails the 2022–2026 backtest, its forecasts are not shown as credible.

## 4. Constraints

- **Public data only.** SEC filings, company releases and transcripts, government data (FRED, EIA, BLS, Census),
  rating-agency public releases, reputable reporting. No paid terminals.
- **Hosting:** GitHub Pages; a public link is acceptable.
- **No server.** Everything runs in the browser. No Python is needed to use or update the tool. The team cannot read
  code, so nothing they must touch is code.
- **Speed:** One path updates almost instantly after Run; Range of outcomes may take a few seconds.
- **Data freshness:** refreshed after each earnings season (scheduled) plus on demand.
- **Unverified data:** several 2026 figures came only from secondary sources (see §16). They must carry a verification
  status and must be confirmed against filings before being treated as fact.

## 5. Approaches considered

### Engine

1. **Money flows plus game theory, layered (chosen).** A full ledger of every company, strategic decisions by each
   company from decision and game theory, build delays, a quarterly credit-and-contagion step, and Monte Carlo
   around it. It is the only option that answers "does it pay its commitments or get around them?" and every decision
   has an explainable reason. Most work and needs care to stay fast. The research found the hybrid has precedent
   (agent-based stock-flow consistent models, e.g., Caiani et al. 2016) and that ~40 agents × 20 quarters × 2,000 runs
   runs in ~0.24–1.5 s in V8 (team benchmark).
2. **Money flows plus fixed rules (system dynamics).** Faster to build, transparent, instant. Rejected as the end
   state because companies don't anticipate each other. It is kept as the first build step: the engine works with
   simple rules first, then gains strategic decisions player by player.
3. **Pure statistical forecasting.** Good short-term fit, but cannot model contracts, defaults or strategy and fails
   at turning points (consensus caught 5 of 153 recessions a year ahead). Rejected as the engine; used for nowcasting,
   turn detection and calibration support.

The user approved option 1 with the additions in §8 (recommended theory additions and pieces from the user's own
research).

### Visual direction

Seven rounds of mockups. Rejected: side-by-side style options, a Sankey "money river", a sideways layout, cream/serif
and dark-terminal looks (both read as AI-template defaults), "pipes and tanks", heavy side panels, a separate deal
screen. Chosen: style "A — Quiet product" with toned-down colours from style "D — Bold blocks", one zoomable canvas,
floating controls, and short labels on every money line (as on the user's original hand-drawn map).

### Hosting

GitHub Pages (chosen; public link acceptable) vs Cloudflare Pages with Access (login-gated). Moving later takes about
an hour. No database in v1.

## 6. Visual design (locked)

Reference: `docs/mockups/canvas-v6.html` (generated by `docs/mockups/gen6.py`). Match it closely.

- **One canvas** with a faint dot grid on white. Pan by dragging, zoom with scroll/pinch and +/−/Fit controls.
- **Layout top to bottom:** money in → AI labs → developers & financing vehicles → clouds (cash-funded vs
  debt-funded groups) → chip makers → supply chain. Layer names at the left edge.
- **Companies are solid cards** in muted layer colours with white text. Muted palette (from the mockup):
  money `#c9683a`, labs `#6b5bb8`, clouds `#b2557d`, chips `#3d8a57`, supply `#4a72ad`. The developers/financing
  layer needs one more muted colour consistent with these (builder's choice; validate contrast and colour-blind
  separation). Font: Geist (UI) and Geist Mono (numbers).
- **Groups** (e.g., Cash-funded clouds, Debt-funded clouds, AI labs) are light rounded containers with a small caps
  label.
- **Money lines:** thin grey curves; line weight grows with dollars per year; small dots in the payer's colour flow
  along each line, faster and denser for bigger flows. Stressed flows slow down; broken flows turn red and dashed.
- **Every line has a short label chip**: a plain title plus the yearly amount, e.g., "Buys GPUs $200B",
  "Rents compute $110B", "GPU-backed loans $35B".
- **Problems:** amber outline + "Stressed" tag, red outline + "Default" tag.
- **Events** from the model appear as small notes next to the company they hit (letter, quarter, one line, reason), and
  as markers on the timeline.
- **Zooming into a link** unfolds the real deal structure in place (parties, SPV, loan, lease, guarantee, contracts),
  with term cards. Neighbouring companies fade at the edges. No separate screen.
- **Floating controls:** title + scenario (top left); Conditions button (top left, opens the drag-the-line charts);
  One path / Range of outcomes switch (top right); NVIDIA results card (top right; switches to deal-specific exposure
  when zoomed into a deal); timeline with play (bottom centre); zoom controls (bottom right).
- **Conditions panel:** each condition is a small chart: real history solid, the **forecast range** shaded, the
  user's path as a draggable line with handles. Anything dragged outside the range is flagged "outside forecasts".
  Hovering the band shows where it comes from (e.g., "58 sell-side analysts via Yahoo Finance", "CME GPU futures",
  "Epoch AI and McKinsey forecasts"). The UI says "forecast range", not "Wall Street", because the band's source differs
  by condition (§9). Panel opens on demand; it is not a permanent side panel.
- **Range of outcomes** shows **two fan charts side by side** (decided by the user): "Your view" (runs varied around
  the user's dragged paths) and "Forecast range" (runs varied around the outside view, whatever the user dragged).
  Each shows median, 25–75% and 10–90% bands and probability statements ("18% chance a top-10 customer defaults by
  2029"), so the team can compare "our view vs the outside view" directly. The NVIDIA card shows both numbers.
- **Early-warning dashboard and sensitivity view** open from the NVIDIA card or a control; their exact layout is left
  to the builder within the same style.
- Quality floor: works at laptop and large-screen sizes, keyboard focus visible, reduced motion respected (flow dots
  stop).

## 7. Who is in the model

Roughly 40–50 named players plus a few aggregate buckets. Exact list is data-driven (deal database) and can grow.

| Layer | Players |
|---|---|
| Money in | AI end customers (consumers, enterprises, sovereign buyers), Big Tech operating profits, venture capital, public equity markets (IPOs, stock sales), banks and bond markets, private credit firms (named: Blackstone, Apollo, Blue Owl, PIMCO, Magnetar, Valor and others as the deals require), insurers/annuity money feeding private credit (e.g., Athene, F&G), SoftBank, sovereign funds (PIF/HUMAIN, MGX). |
| AI labs & apps | OpenAI, Anthropic, xAI (now part of SpaceX), Google DeepMind (inside Alphabet), Meta AI (inside Meta), AI startups (aggregate, VC-funded), Cerebras as a compute provider to OpenAI. |
| Developers & financing vehicles | GPU SPVs (CoreWeave DDTL vehicles, Saturn Funding Trust, xAI Colossus SPV), data-centre developers (Vantage, Related Digital, SB Energy, Crusoe as data allows), Meta's Hyperion (Beignet) and El Paso vehicles. |
| Clouds | Cash-funded: Microsoft, Alphabet/Google Cloud, Amazon/AWS, Meta. Debt-funded: Oracle, CoreWeave, Nebius, Lambda. Sovereign & international buyers (Saudi, UAE, EU, Japan, others) as a group. China as a separately controlled market. |
| Chip makers | NVIDIA, AMD, Broadcom (Google TPU, OpenAI custom chips), Marvell (Amazon Trainium), Google TPU and Amazon Trainium as in-house alternatives. |
| Supply chain | TSMC (wafers, CoWoS), SK Hynix (HBM), Samsung and Micron (HBM, as competitors for share), ASML. Power supply as a constraint (see §8.3). |

## 8. Engine

The engine steps forward one quarter at a time. Each quarter runs the layers below in order. All state lives in typed
arrays for speed. Runs are deterministic given a seed.

### 8.1 Ledger (stock-flow consistent core)

- Every company has a balance sheet (cash, receivables, PP&E by vintage, investments in other companies, debt by
  instrument, leases, equity) and an income statement.
- Every flow has a payer and a payee. A check each quarter asserts that financial assets and liabilities across all
  companies net to zero (nothing appears or disappears).
- Contracts (from the deal database, §11) generate scheduled payment obligations: leases, take-or-pay purchases, loan
  interest and principal, guarantees (contingent), equity tranches (conditional).
- Depreciation is tracked with both accounting life and economic life (GPUs 3–6 years economic; buildings and power
  much longer), because write-offs depend on the difference.

### 8.2 Demand

- **End-customer AI spending** by segment (consumer, enterprise, sovereign/international, China) starts from public
  data (lab run-rates, NVIDIA segment data, Census BTOS, Ramp AI Index) and grows along an adoption curve with an
  imposed ceiling (Bass/S-curve used only with an outside ceiling, because fitted ceilings are unreliable before the
  midpoint).
- **Labour substitution condition:** how much work AI actually automates, anchored to BLS employment data for
  AI-exposed occupations and business adoption surveys. It feeds the long-run ceiling on AI revenue (a task-automation
  ceiling in the spirit of Acemoglu–Restrepo and Epoch's GATE, used as a guardrail).
- **Price elasticity (Jevons):** usage = k × price^(−ε). Token prices fall along experience curves (Farmer–Lafond
  error bands). The model uses the *effective* price customers pay (which fell far less than constant-capability
  prices). ε is calibrated from public token volume and price data (e.g., OpenRouter) and exposed as a setting.
- **Lab market shares with leapfrogging:** shares shift toward whichever lab currently leads; leadership switches at
  random with a frequency estimated from the record of frontier releases; customer switching costs are low. This
  makes each lab's revenue, and so its ability to pay its commitments, uncertain.
- **Compute conversion:** revenue → tokens → compute → GPU-hours → GPUs needed, with algorithmic efficiency and chip
  performance improving along experience curves; utilisation is a state variable. Training compute for frontier labs
  is modelled separately from inference.
- **Physical AI (cars, robotics):** its own demand segment (carmakers, robotics and edge buyers as one aggregate
  buyer), driven by a growth condition anchored to NVIDIA's disclosures (Edge Computing $8.2B in Q3 FY27; physical AI
  "on track to exceed $25 billion" for the year). NVIDIA does not report it as a line and it likely spans both Data
  Center and Edge Computing, so the model ties out to NVIDIA's two *reported* segments, and shows physical AI as a
  labelled estimate across both. Gaming and other non-AI Edge revenue is a simple trend so Edge Computing and totals
  still match reported figures.
- **Replacement demand:** installed base ÷ economic life, with each new NVIDIA generation lowering the value of older
  chips according to relative performance per dollar (vintage model).

### 8.3 Supply and build delays

- **Capacity pipelines:** orders become installed capacity after realistic lead times (GPUs ~6–12 months; buildings and
  power ~24–48 months). Sterman-style "getting big too fast" overshoot comes from these delays plus forecast errors.
- **Weakest-link limit:** GPUs shipped = min(CoWoS capacity, HBM supply, wafers, power available). Capacity estimates
  start from public figures and carry their spread (CoWoS estimates differ by up to ~40%).
- **Power:** the model builds its own five-year forecast of power available to data centres from public sources (ISO
  interconnection queues with realistic completion rates, utility build plans, EIA data, announced power deals). That
  forecast is the default line for the power condition; the user can still drag it.
- **Bullwhip ordering:** orders = expected demand + correction toward target inventory/backlog, with order lead
  times, so upstream suppliers see amplified swings (as Cisco/Lucent did in 2001).
- **Export policy:** a condition with regimes (open, licensed with limits, closed) affecting China and some sovereign
  demand.

### 8.4 Decisions (decision and game theory)

Each quarter every strategic player chooses from a short menu of real options. Players are grouped by type, and rules
are shared within a type, to keep the number of free settings low.

| Player type | Decision menu | What it optimises (approved) |
|---|---|---|
| Hyperscalers (cash-funded) | Capex: raise / hold / cut; pace of in-house chip adoption | Market share subject to a floor on margins; penalty for falling behind rivals |
| Debt-funded clouds | Expand / hold / shrink; refinance / sell assets / default | Survival, then growth; take more risk when below target (prospect theory) |
| AI labs | Pay / delay / renegotiate / walk away from each commitment; raise equity or debt | Survival, then growth; more risk-taking when behind (prospect theory) |
| Lenders (private credit, banks, bond markets, insurers via private credit) | Lend more / less / reprice / roll over or not | Risk-adjusted return under worst-case thinking (ambiguity aversion) |
| NVIDIA | Honour or contest guarantees; keep investing in customers; cut prices; allocate scarce supply | Long-term revenue and protecting its customer base (repeated-game logic) |
| Suppliers (TSMC, SK Hynix, others) | Capacity expansion; allocation among chip makers | Long-term profit with lead-time risk |

Game formats (one giant game tree is infeasible, so each kind of decision is a small local game):

| Decision | Format | How it is solved |
|---|---|---|
| Capex race (hyperscalers, clouds) | Simultaneous-move game: payoff functions over continuous capex choices (a payoff matrix generalised to many players and dollar amounts). Payoff = expected profit − penalty for falling behind rivals − financing risk | Damped quantal best response to the industry average plus the dominant rivals |
| Pay / delay / renegotiate / walk away | Small sequential game tree (2–3 levels): debtor's move, creditor's response, final outcome; leaf payoffs set by the contract's actual terms | Backward induction (exact), with quantal choice at each node |
| Lending and rollover | Global game: each lender gets a noisy signal of risk and uses a cutoff rule, accounting for what other lenders will do | Closed-form or precomputed cutoffs per lender type |
| NVIDIA guarantees and customer investments | Repeated game: one-time cost of honouring vs discounted long-run value of customer trust and future orders | Compare discounted payoffs of each option |
| New deals | Bargaining: split the gains from a deal according to each side's walk-away value | Nash bargaining solution |

All choices are quantal (better options are chosen more often, not always) with limited look-ahead (1–2 steps).

Solution method:

- **Capex race:** preemption game in the boom, flipping to a war of attrition in a bust. Players track their own
  state plus the industry average ("oblivious equilibrium"); the few dominant players are tracked exactly. Policies
  that need heavy solving are computed offline and shipped as data.
- **Each quarter:** damped quantal best response (players choose better options more often, not perfectly), with
  quantal level-k as the behavioural model (best predictor across human-play datasets). Iterate until stable or a cap
  is reached; record the outcome either way.
- **Renegotiation and default:** a bargaining step (Nash/Rubinstein style) over each contract in distress, bounded by
  each side's walk-away value (Hart–Moore: a party that can walk away caps what it can credibly owe). Contract terms
  (hell-or-high-water, recourse, guarantees, buyer-of-last-resort clauses) set walk-away values.
- **New deals in forecast years (decided by the user: the model creates them):** when a company's expected needs
  (capacity, funding) exceed what its contracts cover, it seeks new deals. Counterparties are matched by availability
  and price; deal types and terms (rate, length, recourse, guarantees, NVIDIA investments and backstops) are sampled
  from the distribution of real deals in the database, adjusted for current conditions (credit spreads, GPU prices,
  counterparty health). Each side accepts only if the deal beats its walk-away value. New deals enter the ledger like
  real ones, so vendor financing and contagion can keep building up after today's deals expire.
- **Announced-deal realisation:** announced deals are discounted by a realisation rate learned from real cases (the
  $100B NVIDIA–OpenAI letter became $30B equity; the Ohio backstop went from ~$250B in talks to $105B; Abilene
  expansion dropped; Microsoft–OpenAI amended twice).
- **Expectations:** firms extrapolate recent growth too far (one over-extrapolation setting, calibrated on past booms)
  and update with a learning filter (Kalman), so they recognise a slowdown gradually.
- **Every decision records its reason** (the comparison of options) for display: a one-line reason on the map, full
  comparison one click away.
- **Decision view (decided by the user):** clicking a decision on the canvas (e.g., "OpenAI delayed its Oracle
  payment") opens the actual mini game the model solved that quarter, with that quarter's numbers: a game tree for
  sequential decisions (with the chosen branch highlighted and each leaf's payoffs), or a payoff table for the capex
  race (showing the company's options against what rivals did, with the chosen cell highlighted). The cutoff rule for
  lenders and the honour-vs-walk-away comparison for guarantees are shown in the same view. It must be readable in a
  meeting, in the locked visual style. The engine must therefore store, per decision: the options, the payoffs and
  their components, the probabilities from quantal choice, and the choice made.

### 8.5 Credit, defaults and contagion

- **Default tests by company type:** listed investment-grade firms use distance-to-default (Merton/KMV style) with
  leases and guarantees added to debt; high-yield names are anchored to market default-insurance (CDS) prices; private
  labs use a cash-runway test (cash + committed funding vs contractual payments); financing vehicles use debt-service
  coverage, with GPU resale value falling exactly when tenants fail (wrong-way risk).
- **Market prices are converted** from risk-neutral to real-world default odds with a visible setting.
- **Clearing:** each quarter, settle all payments owed across the network (Eisenberg–Noe), with bankruptcy costs so
  defaults destroy value (Rogers–Veraart). Guarantees turn into payment obligations when the guaranteed party defaults.
- **Losses short of default** spread to equity holders (DebtRank-style pass).
- **Fire sales:** forced GPU sales push down a GPU price index, which lowers collateral values everywhere. The index is
  anchored to public rental and resale data and GPU futures (CME/ICE from 2026).
- **Recoveries:** based on the customer contract first and GPU resale value second (Fitch gives GPU residuals zero
  credit). Haircut sizes are visible settings because agencies don't publish them.
- **Lender runs:** a global-games cutoff per lender type, so lenders can pull back together suddenly after long calm.
- **Equity feedback (reflexivity):** equity funding available depends on recent growth and market sentiment, so a
  slowdown can shut off funding when it's most needed.
- **Minsky labels:** each company each quarter is classed hedge (cash flow covers interest and principal),
  speculative (interest only) or Ponzi (neither).

### 8.6 Runs, ensemble and sensitivity

- **One path:** one run with the user's conditions; deterministic. A company defaults in One path when its default
  test (§8.5) is crossed, not by a random draw. The NVIDIA card in One path shows that path's values plus
  model-implied default odds (distance-to-default, runway). Probability statements across runs ("34% chance revenue
  falls in a year") appear only in Range of outcomes. (The mockup shows Range-style figures under One path; the
  mockup is wrong on this point.)
- **Range of outcomes:** two ensembles, default 2,000 runs each, in Web Workers:
  - **Your view:** each condition varies around the user's dragged path. The spread comes from historical forecast
    errors for that kind of input (or the forecast band's width where no error history exists); a path dragged
    outside the forecast range gets the same spread around the user's line.
  - **Forecast range:** each condition varies across its forecast range, ignoring the user's path.
  Both ensembles also vary the uncertain model settings and behaviour variants identically, so the only difference
  between the two fan charts is the conditions. Use common random numbers across the two so the comparison is not
  noise. Running both roughly doubles compute; it must still finish within a few seconds. Report Monte Carlo error; note that 2,000 runs give roughly ±0.5 percentage points on a 5% probability,
  which is weak for tail events (offer more runs as an option).
- **Ensemble:** several plausible versions of behaviour, weighted by backtest performance (Bayesian model averaging).
- **Sensitivity:** ranks which inputs drive a selected result (Sobol-style variance shares). Computed on demand; may use
  fewer runs or precomputation to stay within a few seconds.

### 8.7 Supporting models (not the 2027–2030 engine)

- Nowcast of the current quarter (Bayesian structural time series with leading indicators).
- Live probability that a downturn has started (regime-switching model).
- Experience curves for token prices and chip cost.
- Reference-class guardrails from past booms (e.g., supplier revenue declines: Cisco −15%, Lucent −60%).

## 9. Conditions (what the user sets)

Each condition shows history, a forecast range (with its source), and a draggable path. Defaults come from data.

| Condition | Default source |
|---|---|
| AI spending by end customers | Lab run-rates, NVIDIA segments, adoption surveys |
| Effective price per AI token | Public price trackers; experience-curve bands |
| Price elasticity of usage | Estimated from token volume vs price (shown as a setting, not a time path) |
| Labour substitution by AI | BLS employment in AI-exposed occupations; adoption surveys |
| Private-credit lending rate / spreads | FRED, deal pricing (DDTL history), CDS indices |
| Interest rates | FRED |
| Used-GPU resale value | Appraisal data, rental indexes, GPU futures |
| Power available to data centres | Model's own 5-year power forecast (§8.3) |
| Export policy | Regime setting with current status as default |
| Equity market sentiment | Market data (index levels/volatility from FRED or public sources) |
| Physical AI growth | NVIDIA disclosures (Edge Computing, physical AI remarks); carmaker and robotics announcements |

The user can add conditions later from a list of supported drivers.

**Starting setup and sharing.** There are no premade scenarios (the user ruled them out). The tool opens on the
data-based baseline: every condition at its data default. The user's own setup can be named (the mockup's "Credit
squeeze" is a user-given name) and is stored entirely in the page link, so a colleague can reopen exactly what was
shown in a meeting by opening the link. No database needed.

## 10. Outputs

- NVIDIA card and detail view (all items in §3 Goals), versus consensus.
- Per-company: health label, default probability, cash runway, key events with reasons.
- Event list (model-generated), on canvas and timeline.
- **Early-warning dashboard** (at least): capex vs operating cash flow per hyperscaler; Oracle/CoreWeave/SoftBank CDS
  (market and model-implied); NVIDIA receivables and days sales outstanding; NVIDIA guarantees + customer equity vs
  revenue (vendor-financing ratio); off-balance-sheet financing share; GPU rental and resale prices; capex/revenue gap
  (Sequoia-style); orderbook/backlog vs installed capacity; AI-related debt issuance; depreciation-life changes;
  startup valuation vs revenue (froth); regime-switching turn probability.
- Range of outcomes: fan charts and probability statements; sensitivity ranking.
- Every number shows its source or says it is modelled.

## 11. Deal database

One record per deal (and per tranche where terms differ). Fields:

- parties (payer, payee, guarantor, SPV), deal type (compute lease, chip purchase, equity, loan, SPV financing,
  capacity guarantee, warrants, JV, buyer-of-last-resort);
- value fields kept separate: hard minimum, ceiling, conditional amount, estimate (never summed together);
- dates (announced, signed, start, end), payment schedule where known;
- terms: rate, maturity, recourse vs non-recourse, collateral, take-or-pay, hell-or-high-water, termination and
  renegotiation rights, exclusivity;
- status history (active, expanded, delayed, renegotiated, cancelled) with dates;
- sources with URLs and **verification status** (primary filing / primary company / secondary / unverified).

The first pass is in `data/sources/2026-11-25-chrome-prompt2-deals.md`. New deals are added by asking a Claude
session (or by editing the data file following a documented template).

## 12. Data pipeline

- **Automated (scheduled GitHub Actions after earnings seasons, plus manual trigger):** SEC EDGAR XBRL company facts
  and filings, FRED, EIA, BLS, Census BTOS, ISO interconnection queues, and other machine-readable public sources the
  builder confirms. Output: versioned JSON committed to the repo.
- **Manual captures:** deal terms, consensus, guidance quotes, CDS levels, rating actions, GPU prices. Stored as dated
  source files with verification status (as in `data/sources/`).
- **As-known-at dates:** every data point records when it became public, so the backtest only uses information
  available at each date.
- Raw SEC company-facts JSON for 16 companies is already in `data/raw/sec/`.
- The network allowlist for this project's cloud environment covers SEC, FRED, EIA, Epoch, NVIDIA IR, NBER, IMF, BIS,
  arXiv, the Fed, Bank of England and Census. Other hosts need adding when required.

## 13. Calibration and validation

- **Starting state** set directly from filings (balance sheets, contracts), not fitted.
- **Calibration** of uncertain settings by approximate Bayesian computation offline: keep settings whose simulated
  2022–2026 resembles the real 2022–2026; ship the resulting distributions as data.
- **Backtest:** start the model in 2022/2023 using only information known then; check it roughly reproduces
  2023–2026 (hyperscaler capex, NVIDIA revenue and segment split, lab revenue, rental prices, credit spreads).
  Rolling-origin tests; score with CRPS / quantile loss, Brier scores for events, and interval coverage. Score
  turning-point episodes separately. Benchmarks: naive, drift and exponential-smoothing forecasts.
- **Pattern checks:** supplier revenue declines in a bust consistent with telecom-era ranges; switching contagion off
  cuts private losses by roughly the ~30% found in "Clouds of Credit" (NBER WP 36032, 2026).
- **Live scoring:** timestamped forecasts scored as each quarter is reported.
- **Standard (decided by the user: practical):** a conditional backtest. Real past conditions and real deals are fed
  in as inputs; each company starts when its public data exists (labs from 2023–2024); reconstructed starting values
  are labelled. It **passes** if, for NVIDIA revenue (total and Data Center), hyperscaler capex and lab revenue, the
  model beats the naive, drift and exponential-smoothing benchmarks on CRPS, and its 80% ranges contain roughly 80%
  of actual outcomes. Errors are always shown, pass or fail.
- **Gate:** until the backtest passes, forecasts are labelled "early version: not yet validated" in the UI.

## 14. Technical shape

- TypeScript throughout (engine, UI, data scripts), so there is one language and no Python dependency.
- Static site built and deployed to GitHub Pages by GitHub Actions.
- Engine in Web Workers; typed arrays; seeded random numbers. WebAssembly not needed (measured ~1.3× gain only).
- Rendering approach for the canvas (SVG vs Canvas/WebGL, pan/zoom library) is left to the builder, subject to the
  locked look and smooth flow animation at ~50 nodes and ~100+ lines.
- Model settings and data live in versioned JSON files with plain-language descriptions, so non-coders can review
  them and Claude sessions can edit them.

## 15. Build order

This is several connected sub-projects. Each phase ends with something the user can see. The team may use each
checkpoint in meetings (decided by the user), with a visible "early version: not yet validated" label until the
backtest passes.

1. **Data foundation:** cleaned company financials from SEC data, the deal database in structured form with
   verification status, condition histories and ranges. Verify the flagged 2026 figures.
2. **Engine core with simple rules:** ledger, demand, supply pipelines, rule-based decisions, simple default test,
   One path. Backtest harness.
3. **Canvas UI:** the locked design, One path playback, zoom into deals, conditions panel with drag-the-line.
4. **Strategic decisions:** decision menus, utilities, bargaining, expectations, reasons.
5. **Credit and contagion:** default tests, clearing, guarantees, fire sales, lender runs, reflexivity, Minsky labels.
6. **Range of outcomes:** Monte Carlo in workers, ensemble, sensitivity, fan charts.
7. **Calibration, backtest gate, early-warning dashboard, deployment, scheduled data refresh.**

## 16. Known data gaps and unverified figures

- Unverified or secondary: Anthropic ~$81B run-rate; OpenAI revenue (~$50B vs ~$70B, different bases) and ~$1.4T
  commitments; NVIDIA total guarantee exposure (figures conflict); Ohio lease length (10 vs 20 years); Anthropic–
  Microsoft–NVIDIA equity amounts; HUMAIN order size; many CDS and bond prices (aggregator sources); CoWoS/HBM
  capacity estimates.
- Not public: KBRA haircut tables; pairwise exposures between companies (rebuilt from deal terms); GPU utilisation;
  OpenAI and xAI audited financials.
- Parameters with no AI-specific calibration, shipped as visible settings: lender signal noise, bargaining power,
  over-extrapolation strength, fire-sale price impact, price elasticity (until estimated), risk-neutral to real-world
  conversion.

## 17. Who decided what

**Decided by the user:** NVIDIA-centred v1 with others as drivers; scenarios not a single verdict; outputs (revenue,
earnings, debt, commitments, bankruptcy, getting around commitments); user sets conditions only, never company
behaviour; drag-the-forecast-line inputs; range-of-outcomes mode (not called "dice"); public data only; light theme;
visual style A with toned-down D colours; one zoomable canvas; short labels on money lines; zoom into deals in place;
GitHub Pages with a public link; no database for now; Range of outcomes shows "your view" and "forecast range" side by side; the model creates new deals in forecast years; practical backtest standard; early versions usable in meetings with a not-yet-validated label; clicking a decision shows the game tree or payoff table the model solved; sovereign & international buyers with export policy; power as a
forecast condition; physical AI (cars, robotics) included; gaming excluded; quarterly to 2030; no valuation output for
now; backtest required; probabilities with uncertainty shown; few seconds after Run is fine; nobody on the team reads
code; layered engine with all recommended additions; lab leapfrogging, labour-substitution condition, insurers as a
funding source.

**Claude's calls (correct any):** two-question framing (demand real vs can everyone pay); layer order and the new
developers & financing vehicles layer; named lenders instead of one private-credit box; cash-funded vs debt-funded
cloud split; TypeScript-only stack; 2,000 default runs; deal value fields kept separate; announced-deal realisation
rate; risk-neutral conversion as a visible setting; One path defaults on thresholds (no random draws); physical AI as its own segment tied to reported segments; setups stored in the page link; "forecast range" naming with sources on hover; common random numbers across the two Range ensembles; recoveries contract-first; build order in §15; backtest start
2022.

**Left to the builder:** rendering technology and pan/zoom library; dashboard and sensitivity view layout within the
locked style; extra colour for the financing layer; exact data file formats; worker pool sizing; exact list of
automatable sources after testing access.
