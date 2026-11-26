# Verification of flagged 2026 figures (November 2026)

- Checked: 2026-11-26, against SEC EDGAR only (www.sec.gov archives, data.sec.gov submissions, efts.sec.gov
  full-text search). News sites, company blogs and q4cdn.com were not reachable and were not used.
- Each section gives the claim, where it was checked, the result (`confirmed` / `corrected` / `not found` /
  `not checked — time`), the primary figure with its exact location, and the records updated, each written in
  backticks as id: followed by the record id. Manual financial rows use the id <entity>.<metric>.<period_end>.<segment-slug>.
- Statuses: a figure confirmed by an SEC filing gets a source with status `primary-filing` and the sec.gov URL
  (retrieved 2026-11-26). Existing secondary sources stay `secondary`. Figures not found keep their status.

## Item 1: NVIDIA Q3 FY27 revenue, Data Center revenue, Q4 guide

- **Claim**: Q3 FY27 revenue $115,844M; Data Center $107,610M (Hyperscale $60,136M + AI Clouds, Industrial &
  Enterprise $47,474M); Q4 FY27 revenue guide $130.0B ±3%; gross margin guide 71.0–72.0%.
- **Where checked**: NVIDIA 8-K filed 2026-11-17 (accession 0001045810-26-000088):
  Ex 99.1 https://www.sec.gov/Archives/edgar/data/1045810/000104581026000088/q3fy27pr.htm,
  Ex 99.2 (CFO commentary) https://www.sec.gov/Archives/edgar/data/1045810/000104581026000088/q3fy27cfocommentary.htm,
  Ex 99.3 https://www.sec.gov/Archives/edgar/data/1045810/000104581026000088/supplementalfinancialinfor.htm.
  The Q3 FY27 10-Q is not yet filed (latest NVIDIA 10-Q on EDGAR on 2026-11-26 is Q2 FY27, filed 2026-08-26).
- **Result**: confirmed
- **Primary figure and location**:
  - Revenue: Ex 99.1 condensed consolidated statement of income, "Revenue | $ | 115,844" (three months ended
    October 25, 2026, $ in millions); same in Ex 99.3 "Total revenue | $ | 115,844".
  - Data Center: Ex 99.1 bullet "Third-quarter revenue was $107.6 billion, up 21% from the previous quarter and up
    110% from a year ago"; Ex 99.2 "Revenue by Market Platform ($ in billions)": Data Center $107.6, Hyperscale
    60.1, AI Clouds, Industrial, & Enterprise 47.5. The SEC exhibits give billions only, so the exact million
    figures ($107,610M / $60,136M / $47,474M, from the q4cdn quarterly-trend PDF) are consistent to rounding but not
    stated in a filing; those rows stay `primary-company`.
  - Q4 guide: Ex 99.1 Outlook: "Revenue is expected to be $130.0 billion, plus or minus 3%. NVIDIA is not assuming
    any Data Center compute revenue from China in its outlook." and "GAAP and non-GAAP gross margins are expected to
    be between 71.0% and 72.0%." This also settles the basis the capture left open: both GAAP and non-GAAP.
- **Records updated**: `id:guidance-nvda-rev-q4fy2027`, `id:guidance-nvda-gm-q4fy2027-low`,
  `id:guidance-nvda-gm-q4fy2027-high` (source moved to the SEC Ex 99.1 URL, status `primary-company` →
  `primary-filing`; gross-margin series names now say "GAAP and non-GAAP"). Checked, unchanged:
  `id:nvidia.segmentRevenue.2026-10-25.data-center`, `id:nvidia.segmentRevenue.2026-10-25.data-center-hyperscale`,
  `id:nvidia.segmentRevenue.2026-10-25.data-center-ai-clouds-industrial-enterprise`.

## Item 2: NVIDIA CEO changes (8-Ks of 2026-11-12 and 2026-11-23)

- **Claim**: Nov 12: Huang resigned as President, CEO and director; Kress interim CEO (and CFO); Harvey C. Jones
  Board Chair. Nov 23: Huang reinstated; Kress stays CFO; Jones stays Chair; new national-security/export-control
  board committee; Chief Compliance Officer search.
- **Where checked**: https://www.sec.gov/Archives/edgar/data/1045810/000104581026000082/nvda-20261111.htm (8-K,
  Item 5.02) and Ex 99.1
  https://www.sec.gov/Archives/edgar/data/1045810/000104581026000082/nvidiaannouncesceotransiti.htm;
  https://www.sec.gov/Archives/edgar/data/1045810/000104581026000090/nvda-20261122.htm (8-K, Item 5.02) and Ex 99.1
  https://www.sec.gov/Archives/edgar/data/1045810/000104581026000090/nov23pressrelease.htm.
- **Result**: confirmed (with a date precision note)
- **Primary figure and location**: 8-K filed 2026-11-12, Item 5.02: "On November 11, 2026, the Board of Directors
  ... accepted the resignation of Jen-Hsun Huang, as NVIDIA's President, Chief Executive Officer and member of the
  Board, effective immediately", Kress appointed interim CEO and continues as CFO, and "On November 11, 2026, the
  Board appointed Harvey C. Jones, age 73, as Chair of the Board." 8-K filed 2026-11-23, Item 5.02: "On November 22,
  2026, the Board ... reinstated Jen-Hsun Huang as NVIDIA's President, Chief Executive Officer and member of the
  Board of Directors, effective immediately"; Kress continues as CFO. Ex 99.1 (Nov 23): Jones "will continue to serve
  as Board chair"; "the Board also recently formed a National Security and Export Control Committee comprised solely
  of independent directors"; "NVIDIA is commencing a search to fill a new position, Chief Compliance Officer". Date
  note: the board actions are dated Nov 11 and Nov 22; Nov 12 and Nov 23 are the filing / press-release dates (the
  dates the market knew).
- **Records updated**: none (no deal, series or financial record holds the leadership events).

## Item 3: NVIDIA guarantee exposure, Ohio guarantee cap and lease length

- **Claim**: NVIDIA guarantees OpenAI's obligations to SB Energy for the Ohio (PORTS-Pike) campus, capped at $105B
  for the initial commitment; lease length 20 years (Constellation, Futurum) vs 10 years (Axios); total guarantee
  exposure not captured.
- **Where checked**: NVIDIA 8-K filed 2026-08-17, Item 1.01
  https://www.sec.gov/Archives/edgar/data/1045810/000104581026000069/nvda-20260817.htm and its Ex 99.1
  https://www.sec.gov/Archives/edgar/data/1045810/000104581026000069/sbeoainvidia-portsrelease.htm; NVIDIA 10-Q Q2
  FY27 (filed 2026-08-26) Note 10 Commitments and Contingencies
  https://www.sec.gov/Archives/edgar/data/1045810/000104581026000075/nvda-20260726.htm.
- **Result**: confirmed ($105B cap) and corrected (lease length: 20 years; the 10-year report is wrong)
- **Primary figure and location**:
  - 8-K Item 1.01, "Residual Value Guaranties": "NVIDIA's aggregate payment obligation is cumulatively capped at
    $105 billion for its initial commitment under the Agreements", for leases for "approximately 4.25 gigawatts of IT
    load"; triggers are OpenAI insolvency causing a lease default or OpenAI failing to pay; NVIDIA pays "any
    shortfall between the guaranteed minimum value of a lease ... and amounts recovered through a replacement lease or
    sale"; obligations end at the earliest of "the 20th anniversary of the commencement of the applicable lease", OpenAI
    terminating the lease, "OpenAI achieving a satisfactory credit rating", and other customary events.
  - Ex 99.1: "SB Energy will build, own and operate the data center under a 20-year lease to OpenAI."
  - 10-Q Note 10, Guarantees: "SB Energy Corp. guarantees – In August 2026, we entered into guarantees, capped at a
    total of $105 billion ..."; "each phase's 20-year lease term"; table of maximum gross exposure: land, power and
    shell guarantees for AI clouds $3.5B, SB Energy Corp. guarantees $105.0B, **Total $108.5B** (as of July 26,
    2026). Also: option on "approximately 3.8 additional gigawatts" (the press release says 3.75 IT-GW); first of nine
    phases expected in fiscal 2029 (the 8-K says ready-for-service expected beginning in 2028).
- **Records updated**: `id:nvidia-openai-ohio-backstop` (maturity now "20-year leases ..."; notes rewritten from the
  8-K and 10-Q, 10-year report marked superseded; three SEC sources added as `primary-filing`). Old → new: lease
  length "conflict: 20 vs 10 years" → "20 years".

## Item 4: NVIDIA $6.3B CoreWeave backstop

- **Claim**: $6.3B initial order dated 2025-09-09 under an MSA of 2023-04-10, disclosed 2025-09-15; NVIDIA buys
  only capacity CoreWeave cannot sell, through 2032-04-13.
- **Where checked**: CoreWeave 8-K filed 2025-09-15, Item 1.01
  https://www.sec.gov/Archives/edgar/data/1769628/000176962825000047/crwv-20250909.htm.
- **Result**: confirmed
- **Primary figure and location**: Item 1.01: "On September 9, 2025, CoreWeave, Inc. ... and NVIDIA Corporation
  ... entered into a new order form ... under the existing Master Services Agreement ... dated as of April 10, 2023,
  which has an initial value of $6.3 billion ... NVIDIA is obligated to purchase the residual unsold capacity through
  April 13, 2032, subject to any termination described below and satisfaction of delivery and availability of service
  requirements." Termination: either party on 30 days' written notice of a breach, or the other party's insolvency
  proceedings not dismissed within 90 days.
- **Records updated**: `id:nvidia-coreweave-capacity-backstop` (SEC source added as `primary-filing`; termination
  rights added from the 8-K).

## Item 5: Anthropic compute commitments $900.9B / $451.6B / $70.7B

- **Claim**: ~$900.9B aggregate committed spend; ~$451.6B before 2030-12-31; ~$70.7B due in the 12 months after
  2026-09-30 (424B4, "Our Approach to Compute"). Also flagged UNVERIFIED in the capture: additional unpriced
  commitments of $150–175B.
- **Where checked**: Anthropic 424B4 filed 2026-11-19
  https://www.sec.gov/Archives/edgar/data/2130357/000162828026074944/anthropicpbc-424b4.htm; S-1/A No. 2 filed
  2026-11-10 https://www.sec.gov/Archives/edgar/data/2130357/000162828026072484/anthropicpbc-sx1ax2.htm; S-1/A No. 1
  filed 2026-11-02 https://www.sec.gov/Archives/edgar/data/2130357/000162828026068676/anthropicpbc-sx1ax1.htm.
- **Result**: confirmed (including the $150–175B, which the capture had marked unverified)
- **Primary figure and location**: 424B4, Prospectus Summary, "Our Approach to Compute": "As of and subsequent to
  September 30, 2026, we have entered into purchase commitments and lease agreements ... with an aggregate committed
  spend of approximately $900.9 billion, substantially all of which is related to compute and infrastructure. These
  commitments include approximately $451.6 billion expected to be incurred before December 31, 2030 ... Approximately
  $70.7 billion of these commitments are due in the 12 months following September 30, 2026." Same figures in S-1/A
  No. 2. MD&A, Liquidity and Capital Resources, Contractual Obligations (424B4 p. ~178): "this amount excludes payments
  under certain other compute and infrastructure arrangements that do not specify a fixed dollar commitment. We
  estimate these payments to be in the range of $150 billion to $175 billion." Same section: ~$186.2B of the total is
  subject to exercisable termination rights or contingent conditions. S-1/A No. 1 gave $895.4B / $447.5B.
- **Records updated**: none (no record holds the aggregate; it is not a single deal). The per-counterparty figures
  from the same section are in Item 7b below.

## Item 6: Anthropic ~$81B run-rate revenue

- **Claim**: run-rate revenue ~$81B as of 2026-10-31, up $10B from 2026-09-30, per S-1/A No. 2 (capture: secondary,
  "not found in the SEC text read — UNVERIFIED").
- **Where checked**: S-1/A No. 2 filed 2026-11-10
  https://www.sec.gov/Archives/edgar/data/2130357/000162828026072484/anthropicpbc-sx1ax2.htm; 424B4 (above).
- **Result**: confirmed
- **Primary figure and location**: S-1/A No. 2, Business, "Significant Revenue Growth — Rapid Customer Adoption and
  Revenue Growth" (p. 203): "our Run-Rate Revenue was approximately $81 billion as of October 31, 2026, up $10 billion
  from September 30, 2026." with footnote 16 defining Run-Rate Revenue as an operating metric, "not a substitute for
  revenue prepared in accordance with GAAP, and ... not a forecast". The same sentence is in the 424B4.
- **Records updated**: none (no record holds Anthropic run-rate revenue).

## Item 7: Anthropic–Microsoft–NVIDIA equity amounts (up to $10B / $5B)

- **Claim**: NVIDIA equity up to $10B and Microsoft equity up to $5B in Anthropic (2025-11-18; capture: VERIFY,
  truncated in retrieval).
- **Where checked**: Anthropic 424B4 (above), searched "NVIDIA", "Microsoft", "Series G", "November 2025",
  "$10.0 billion", "$5.0 billion"; NVIDIA 10-Q Q3 FY26 filed 2025-11-19
  https://www.sec.gov/Archives/edgar/data/1045810/000104581025000230/nvda-20251026.htm; EDGAR full-text search
  "Anthropic" in Microsoft (CIK 0000789019) filings 2025-11-01 to 2026-11-26, and "Anthropic" "up to $5 billion"
  across all filers; Microsoft 8-K 2026-07-29 Ex 99.1
  https://www.sec.gov/Archives/edgar/data/789019/000119312526323632/msft-ex99_1.htm.
- **Result**: confirmed (NVIDIA up to $10B); not found (Microsoft up to $5B)
- **Primary figure and location**: NVIDIA 10-Q Q3 FY26, Notes (investment commitments) and Liquidity: "In November
  2025, we entered into an agreement, subject to certain closing conditions, to invest up to $10 billion in
  Anthropic." Microsoft: no SEC filing states the $5B; Microsoft's 8-K Ex 99.1 of 2026-07-29 only says "a $3.2 billion
  gain from our investment in Anthropic". The Anthropic prospectus does not name either investor's 2025 amount (they
  are not related persons in the Series G table). Separately, the 424B4 cover/summary states a $26.0B concurrent
  private placement at the $83.00 IPO price in which "NVIDIA Corporation ... will purchase 120,481,927 shares of our
  Class N common stock for approximately $10.0 billion" and Microsoft also participates; this is a different
  instrument and is not entered as a record (follow-up).
- **Records updated**: `id:nvidia-anthropic-equity` (NVIDIA 10-Q source added as `primary-filing`; the two blog
  sources relabelled `unverified` → `primary-company` because the amount they were flagged for is now confirmed).
  `id:microsoft-anthropic-equity` unchanged (stays `unverified`; note records what was searched).

## Item 7b: Anthropic $121.3B Google commitment (carried) and other prospectus commitments

- **Claim**: "Prospectus: Google commitment ~$121.3B" (secondary, undated; attached to the 2026-04-06 TPU record).
- **Where checked**: S-1 filed 2026-10-26
  https://www.sec.gov/Archives/edgar/data/0002130357/000162828026067168/anthropicpbc-sx1.htm; S-1/A No. 1, S-1/A No.
  2 and 424B4 (URLs above), MD&A, Contractual Obligations, "Infrastructure Service Arrangements".
- **Result**: corrected (value type and date)
- **Primary figure and location**: 424B4 p. 178–179 (same text in S-1/A No. 1): "In March 2026, we entered into a CSP
  hosting agreement with Google, which was subsequently amended between May and October 2026, pursuant to which we
  committed to spend at least approximately $121.3 billion between April 2026 and July 2033, regardless of actual
  usage. If our actual spend falls short, we must pay Google the difference as a true-up ... non-cancelable except in
  the event of Google's uncured material breach." Additional TPU compute without a fixed commitment is estimated at
  "approximately $125.0 billion to $150.0 billion, which are not included". First public: S-1/A No. 1, filed
  2026-11-02. The original S-1 (2026-10-26) gave "at least approximately $114.5 billion" (amended May–August 2026).
  Old → new: estimate $121.3B dated 2026-04-06 → hard minimum $121.3B dated 2026-11-02.
  Same section: Microsoft "at least $44.9 billion" (S-1, 2026-10-26) → "at least $47.2 billion and up to $49.2
  billion between November 2026 and June 2033" (S-1/A No. 2, 2026-11-10; amended February–November 2026); Amazon "at
  least $110.0 billion between May 2026 and April 2036" (S-1, 2026-10-26).
- **Records updated**: `id:anthropic-google-tpu-2026` (values `estimateUsd 121.3B` → none; note points to the new
  record); new record `id:anthropic-google-csp-hosting-2026` (hardMinimumUsd 121.3B, announced 2026-11-02,
  take-or-pay yes, S-1/A No. 1 and 424B4 sources). `id:anthropic-microsoft-azure` and `id:anthropic-aws-compute-2026`:
  values unchanged (the announced $30B / >$100B were what was public at announcement); the prospectus figures are
  added as dated statusHistory entries (2026-10-26, 2026-11-10) with SEC sources.

## Item 8: CoreWeave DDTL 1.0–5.5 terms

- **Claim**: DDTL 1.0 $2.3B Jul 2023, SOFR + 9.62%, Mar 2028, recourse; 2.0 $7.6B May 2024, SOFR + 6.00–13.00%, Aug
  2030; 3.0 $2.6B Jul 2025, SOFR + 4.00%, 2030-08-21; 4.0 $8.5B Mar 2026, SOFR + 2.25% / fixed ~5.9%, non-recourse,
  Mar 2032; 5.0 $3.1B 2026-05-18, SOFR + 4.50%; 5.5 $2.6B Aug 2026, SOFR + 5.50%, MS/MUFG.
- **Where checked**: CoreWeave 10-Q Q3 2026 filed 2026-11-12, Note 10 Debt
  https://www.sec.gov/Archives/edgar/data/1769628/000176962826000465/crwv-20260930.htm; 10-K 2025 filed 2026-03-02
  https://www.sec.gov/Archives/edgar/data/1769628/000176962826000104/crwv-20251231.htm; 8-Ks
  https://www.sec.gov/Archives/edgar/data/1769628/000176962826000129/crwv-20260330.htm (DDTL 4.0),
  https://www.sec.gov/Archives/edgar/data/1769628/000176962826000236/crwv-20260515.htm (DDTL 5.0),
  https://www.sec.gov/Archives/edgar/data/1769628/000176962826000357/crwv-20260807.htm (DDTL 5.5).
- **Result**: corrected (sizes and rates confirmed; recourse, dates, maturities and one lender corrected)
- **Primary figure and location**:
  - 10-Q debt table: "Recourse debt": DDTL 1.0 (Mar 2028, 15%), 2.0 (Aug 2030, 11%), 2.1 (Mar 2031), 3.0 (Aug 2030,
    9%), 5.0 (Nov 2031, 9%), 5.5 (Sep 2031, 11%); "Non-recourse debt": DDTL 4.0 (Mar 2032, 7%). Issuance table:
    DDTL 4.0 March 2026 "SOFR + 2.25%; Treasury + 2.00%" $8,500M; 5.0 May 2026 "SOFR + 4.50%" $3,100M; 5.5 August
    2026 "Term SOFR + 5.50%" $2,600M.
  - 10-K: DDTL 1.0 "up to $2.3 billion", "final payment due on March 28, 2028"; DDTL 2.0 "up to $7.6 billion", final
    payment five years after each loan is funded; DDTL 3.0 "up to $2.6 billion", SOFR + 4.00%, final payment August
    2030. SOFR + 9.62% (1.0) and SOFR + 6.00–13.00% (2.0) are not stated in either filing (not found; stay secondary).
  - 8-K DDTL 4.0: credit agreement dated March 30, 2026; matures March 31, 2032; floating SOFR + 2.25%, fixed 2.00%
    plus a blended Treasury rate; guaranteed by the parent "on a limited recourse basis for specified 'bad acts'".
    The ~5.9% fixed rate, Blackstone anchor, $7.5B initial size and A3 / A(low) ratings are not in the filings.
  - 8-K DDTL 5.0: dated May 15, 2026 (filed 2026-05-18); "The maturity date of the DDTL 5.0 Facility is November
    15, 2031"; SOFR + 4.50%; "unconditionally guaranteed by the Parent".
  - 8-K DDTL 5.5: dated August 7, 2026 (filed 2026-08-10); "JPMorgan Chase Bank, N.A., as administrative agent ...
    JPMorgan Chase Bank, N.A. and MUFG Bank, Ltd. as joint lead arrangers"; "The maturity date of the DDTL 5.5
    Facility is September 1, 2031"; Term SOFR + 5.50%; "unconditionally guaranteed by the Parent".
  - Old → new: DDTL 1.0 end 2028-03-31 → 2028-03-28; DDTL 2.0, 3.0, 5.0, 5.5 recourse unknown → recourse; DDTL 4.0
    fixed rate "~5.9%" → "US Treasury + 2.00%", signed 2026-03-30 added; DDTL 5.0 signed 2026-05-15, end 2031-11-15
    added; DDTL 5.5 announced 2026-08-31 (month placeholder) → 2026-08-10, signed 2026-08-07, end 2031-09-01,
    payers morgan-stanley → jpmorgan. The 10-Q narrative gives "expected final payment" May 2031 (5.0) and July 2031
    (5.5), earlier than the 8-K maturity dates; both are recorded.
- **Records updated**: `id:coreweave-ddtl-1`, `id:coreweave-ddtl-2`, `id:coreweave-ddtl-3`, `id:coreweave-ddtl-4`,
  `id:coreweave-ddtl-5`, `id:coreweave-ddtl-5-5` (SEC sources added as `primary-filing`). DDTL 2.1 ($3.0B, Sep 2025,
  SOFR + 4.25%) exists in the filings but has no record (follow-up).

## Item 9: Meta Hyperion residual value guarantee terms

- **Claim**: Meta leases from Beignet: 4-year initial term plus renewals; residual value guarantee for 16 years
  (non-renewal, early termination, default); Blue Owl 80% / Meta 20%; Meta covers overruns above 105% of budget.
- **Where checked**: Meta 10-Q Q3 2026 filed 2026-10-22, Note 5 Non-Marketable Equity Investments, "Data Center
  Ventures" https://www.sec.gov/Archives/edgar/data/1326801/000162828026066773/meta-20260930.htm; EDGAR full-text
  search "Hyperion" in Meta filings (only proxy materials) and "Beignet" (fund holdings reports only).
- **Result**: confirmed in part; RVG length and overrun cover not found
- **Primary figure and location**: Note 5: ventures to co-develop data center campuses "in Louisiana, entered into in
  October 2025 (the 'Louisiana Venture')" and in Texas (July 2026), "in each of which we hold a 20% membership
  interest"; ~$27 billion estimated development cost for the Louisiana Venture; "The lease agreement with the
  Louisiana Venture will commence in 2029 ... Each lease has an initial four-year term and renewal options that
  provide for a total lease period of up to 20 years, including the initial term. In addition, we have provided
  residual value guarantees (RVG) ... If we decide to terminate or not renew a lease ... our maximum RVG payment would
  equal any shortfall between the fair value at that time and the RVG threshold". "Maximum residual value guarantees |
  41,493 | 28,091" ($M, 2026-09-30 for both ventures | 2025-12-31 for Louisiana only). The filing does not name
  Hyperion or Beignet (identified by location and date) and does not state a 16-year RVG or the 105% overrun cover.
- **Records updated**: `id:meta-hyperion-lease` (maturity "initial 4-year term, renewals up to 20 years total;
  commences 2029"; notes from the 10-Q; SEC source added as `primary-filing`). `id:blue-owl-hyperion-equity` and
  `id:hyperion-beignet-bonds` unchanged (the $2.5B equity, $27.3B bonds and 6.581% coupon are not in Meta's filing).

## Item 10: Oracle S&P rating action and remaining performance obligations

- **Claim**: S&P downgrade of Oracle to BBB- in July 2026; Oracle RPO (no figure captured); Oracle February 2026
  bond "up to $25B, 8 parts".
- **Where checked**: Oracle 10-Q for the quarter ended 2026-08-31, filed 2026-09-11
  https://www.sec.gov/Archives/edgar/data/1341439/000119312526389274/orcl-20260831.htm (searched "S&P", "Standard &
  Poor", "credit rating", "downgrad", "remaining performance obligations"); Oracle FWP 2026-02-02
  https://www.sec.gov/Archives/edgar/data/1341439/000119312526034351/d24013dfwp.htm and 8-K filed 2026-02-04
  https://www.sec.gov/Archives/edgar/data/1341439/000119312526037840/d23732d8k.htm.
- **Result**: not found (S&P rating action); confirmed (RPO figure found); corrected (bond value type)
- **Primary figure and location**: 10-Q, Note 1 / MD&A "Remaining Performance Obligations": "Remaining performance
  obligations were $664 billion as of August 31, 2026, of which we expect to recognize approximately 13% as revenues
  over the next twelve months", vs $455 billion at August 31, 2025. The 10-Q contains no credit-rating disclosure, so
  the S&P BBB- action stays secondary (it is a capture note, not a record). Bond: 8-K Item 8.01
  "Issuance of $25 Billion Aggregate Principal Amount of Notes": on February 4, 2026 Oracle issued eight series
  (Floating Rate Notes due 2029 $500M; 4.550% 2029 $3,000M; 4.950% 2031 $3,500M; 5.350% 2033 $3,000M; 5.700% 2036
  $5,000M; 6.550% 2046 $2,250M; 6.700% 2056 $5,000M; 6.850% 2066 $2,750M); FWP dated 2026-02-02: "Oracle Corporation
  is also offering $25.0 billion aggregate principal amount of notes". Old → new: ceilingUsd $25B → hardMinimumUsd
  $25B (issued principal, not a ceiling); completed 2026-02-04 added.
- **Records updated**: `id:oracle-bonds-2026` (value type corrected; completed status 2026-02-04; FWP and 8-K
  sources added as `primary-filing`). No record holds Oracle RPO (logged here for a later series).

## Item 11: Exact dates for range-dated NVIDIA strategic investments (carried from Task 5 review)

- **Claim**: capture dates the NVIDIA strategic investments only "Sep 2025 – Aug 2026", so Task 5 dated them at
  2026-08-31 (or month-end); Intel $5B at $23.28, Nokia $1B, Synopsys $2B at $414.79, Lumentum $2B, Coherent $2B,
  Nebius $2B, CoreWeave +$2B at $87.20, SB Energy $1.5B, Groq $2.94B.
- **Where checked**: Intel 8-Ks https://www.sec.gov/Archives/edgar/data/50863/000005086325000155/intc-20250915.htm
  and https://www.sec.gov/Archives/edgar/data/50863/000005086325000204/intc-20251226.htm; Nokia 6-K
  https://www.sec.gov/Archives/edgar/data/924613/000110465925103038/tm2529638d1_6k.htm; Synopsys 8-K
  https://www.sec.gov/Archives/edgar/data/883241/000119312525303209/d36680d8k.htm; Lumentum 8-K
  https://www.sec.gov/Archives/edgar/data/1633978/000119312526085412/d41019d8k.htm; Coherent 8-K
  https://www.sec.gov/Archives/edgar/data/820318/000119312526084366/d42735d8k.htm; Nebius 6-K Ex 99.1
  https://www.sec.gov/Archives/edgar/data/1513845/000110465926026163/tm268532d1_ex99-1.htm; CoreWeave 8-K
  https://www.sec.gov/Archives/edgar/data/1769628/000176962826000044/crwv-20260123.htm; NVIDIA 8-K 2026-08-17 Ex 99.1
  (Item 3); NVIDIA 10-Q Q2 FY27 cash-flow statement and 10-K FY26 Note 2
  https://www.sec.gov/Archives/edgar/data/1045810/000104581026000021/nvda-20260125.htm.
- **Result**: corrected (dates); amounts confirmed
- **Primary figure and location** (old → new announced date):
  - Intel: 8-K filed 2025-09-18, Item 3.02: purchase agreement of September 15, 2025, "214,776,632 shares ... at
    $23.28 per share, representing an aggregate purchase price in cash of $5.0 billion"; closed December 26, 2025
    (8-K filed 2025-12-29). 2026-08-31 → 2025-09-18 (signed 2025-09-15; completed 2025-12-26 added).
  - Nokia: 6-K, stock exchange release "28 October 2025 at 17:30 EET": "NVIDIA to invest USD 1.0 billion (EUR 0.86
    billion) in new Nokia shares at a purchase price of USD 6.01", 166,389,351 shares, 2.90%. 2026-08-31 → 2025-10-28.
  - Synopsys: 8-K Item 3.02: "On December 1, 2025 ... NVIDIA purchased 4,821,717 shares ... at a price per share of
    $414.79, for an aggregate purchase price of $2 billion in cash." 2026-08-31 → 2025-12-01. This is an exact
    1st-of-month date; the note says "Date is exact" and the Task 5 no-1st-of-month test now exempts such records.
  - Lumentum: 8-K Item 3.02: on March 2, 2026, 2,876,415 shares of Series A Convertible Preferred Stock at $695.31,
    "aggregate purchase price of $2,000,000,000". 2026-08-31 → 2026-03-02.
  - Coherent: 8-K Item 3.02: on March 2, 2026, 7,788,161 shares at $256.80, "$2 billion in cash". 2026-08-31 →
    2026-03-02.
  - Nebius: 6-K Ex 99.1, release dated "March 11, 2026": "NVIDIA will invest $2 billion in Nebius" (the 8.3% stake is
    not in the release). 2026-03-31 → 2026-03-11.
  - CoreWeave: 8-K Item 3.02: on January 23, 2026, 22,935,780 Class A shares at $87.20, "$2 billion in cash"; joint
    release dated January 26, 2026. 2026-01-31 → 2026-01-26 (signed 2026-01-23).
  - SB Energy: NVIDIA 8-K 2026-08-17 Ex 99.1: "NVIDIA will invest $1.5 billion in SB Energy". Date unchanged
    (2026-08-17); confirmed.
  - Groq: NVIDIA 10-Q Q2 FY27 cash-flow statement (six months to July 26, 2026): "Groq, Inc. | (2,944)" under
    financing activities, footnoted "Related to the Groq, Inc. non-exclusive license agreement"; 10-K FY26 Note 2: "In
    December 2025, we entered into a non-exclusive license agreement with Groq ... Total consideration consists of
    $13.0 billion paid at closing and $4 billion ... payable within one year". 2026-11-17 → 2026-08-26 (first filing
    showing the payment); value $2.94B → $2,944M.
- **Records updated**: `id:nvidia-intel-equity`, `id:nvidia-nokia-equity`, `id:nvidia-synopsys-equity`,
  `id:nvidia-lumentum-equity`, `id:nvidia-coherent-equity`, `id:nvidia-nebius-equity`,
  `id:nvidia-coreweave-equity-2026`, `id:nvidia-sb-energy-equity`, `id:nvidia-groq-payment` (SEC sources added as
  `primary-filing`). Not checked — time: `id:nvidia-openai-equity-2026` ($30B; try NVIDIA 10-Q Q1 FY27
  https://www.sec.gov/Archives/edgar/data/1045810/000104581026000052/nvda-20260426.htm, which does not name OpenAI,
  and OpenAI has no SEC filings), `id:nvidia-spacex-xai-equity` (try the SpaceX S-1 on EDGAR),
  `id:nvidia-mistral-equity` (no SEC filer).

## Item 12: URL-to-instrument attribution for split NVIDIA investment records (carried)

- **Claim**: split records such as nvidia-intel-equity cite finance.yahoo.com/news/nvidia-buys-3-billion-...,
  247wallst.com/investing/2026/04/01/ and techspot.com/news/113498, which look unrelated to the instrument.
- **Where checked**: data/sources/2026-11-25-chrome-prompt2-deals.md, row "NVIDIA strategic investments": those three
  URLs are the row-level sources for the whole row, not per instrument.
- **Result**: corrected (attribution marked)
- **Primary figure and location**: n/a. Each affected record keeps the three URLs (they are what the capture cited)
  but their titles now say "row-level source for the capture's 'NVIDIA strategic investments' row; not specific to
  this instrument", and each record checked in Item 11 now also carries its own instrument-specific SEC source.
- **Records updated**: `id:nvidia-intel-equity`, `id:nvidia-nokia-equity`, `id:nvidia-synopsys-equity`,
  `id:nvidia-lumentum-equity`, `id:nvidia-coherent-equity`, `id:nvidia-nebius-equity`,
  `id:nvidia-coreweave-equity-2026`, `id:nvidia-sb-energy-equity`, `id:nvidia-openai-equity-2026`,
  `id:nvidia-spacex-xai-equity`, `id:nvidia-mistral-equity`, `id:nvidia-groq-payment`.
