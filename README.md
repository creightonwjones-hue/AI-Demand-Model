# AI-Demand-Model
Modelling AI Demand from the liquidity providers to the chip makers.

## The data, in plain language

This section is for readers who do not write code.

### What the `data/` folder holds

| Folder | What is in it |
| --- | --- |
| `data/raw/` | Files downloaded as-is: company filings data from the SEC (`raw/sec/`) and market series from FRED, the St. Louis Fed's data service (`raw/fred/`). Never edit these by hand. |
| `data/manual/` | Figures typed in by hand from a named source: `financials.csv` (companies that do not file with the SEC, and NVIDIA's revenue by segment) and `series.csv` (credit-default-swap prices, GPU rental prices, forecasts and company guidance). Each row has its source link and status. |
| `data/deals/deals.json` | The deal database: who pays whom, how much, and on what terms. See [Adding a deal](docs/data/adding-a-deal.md). |
| `data/sources/` | Notes captured while researching, kept as the record of where a figure came from. |
| `data/verification/` | The log of figures checked against original filings, and the result of each check. |
| `data/build/` | The cleaned, checked output the model and the explorer page read. It is produced by the build; never edit it by hand. |

Every number carries the date it became public (`asKnownAt`). The model is tested on past dates using only numbers
that were public on that date, so a figure published later never leaks into an earlier test. When a company later
corrects a figure, both versions are kept, each with its own date.

Some things are kept apart on purpose and must never be added together:

- **Deal values.** A deal can have a hard minimum, a ceiling ("up to"), a conditional amount and an estimate. These
  are different kinds of number. There is no total.
- **Data providers.** Prices from different providers (for example ICE and S&P Global for credit-default swaps, or
  different GPU rental indexes) are separate series, even when they measure the same thing.
- **Overlapping segments.** NVIDIA's "Data Center" revenue already includes its two sub-segments ("Data Center -
  Hyperscale" and "Data Center - AI Clouds, Industrial & Enterprise"). Use either the total or the two parts, never
  both.

Nothing is estimated in the data files. A number we do not have is left out and shows up as a gap in the coverage
report (`data/build/coverage.json`); it is never filled with a zero or a guess.

### Verification statuses

Every figure has one of four statuses, from strongest to weakest:

| Status | Meaning |
| --- | --- |
| `primary-filing` | Taken from a regulatory filing (SEC 10-K, 10-Q, 8-K, S-1, 6-K). |
| `primary-company` | Taken from the company's own release or investor document. |
| `secondary` | Reported by a news article, blog or analyst. |
| `unverified` | Could not be traced to a source we can open, or the sources disagree. |

A figure moves to a stronger status only after someone checks it against the stronger source and records the check
in `data/verification/`. The build counts unverified figures in `data/build/manifest.json`.

### Refreshing the data

In the cloud sandbox, from the project folder:

```
NODE_USE_ENV_PROXY=1 npx tsx scripts/data/fetch-sec.ts     # company filings data from the SEC
NODE_USE_ENV_PROXY=1 npx tsx scripts/data/fetch-fred.ts    # market series from FRED
npm run data:build                                         # check everything and rewrite data/build/
npm test
```

Then commit `data/raw/` and `data/build/` together. Manual files (`data/manual/`, `data/deals/`) are edited by hand,
followed by `npm run data:build` and `npm test`. The website build on GitHub re-runs the data build and fails if the
committed `data/build/` is out of date.

To look at the data, run `npm run dev` and open the address it prints.
