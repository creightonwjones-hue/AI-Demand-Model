# Adding a deal record

Deals live in `data/deals/deals.json`, a list of records. Each record describes one announcement: one set of
parties and one set of numbers, published on one date. The build checks every record (`npm test` and
`npm run data:build`) and stops with the deal's id if anything is wrong.

The data feeds a backtest that may only use what was public on each date. Every rule below follows from that.

## Template

Copy this, fill it in, and delete the optional lines you have no source for. Never fill a field with a guess.

```json
{
  "id": "payer-payee-what-yyyy",
  "name": "Payer / Payee short description (yyyy, headline amount)",
  "payers": ["entity-id"],
  "payees": ["entity-id"],
  "guarantors": [],
  "vehicle": "entity-id (optional: the SPV or JV the money goes through)",
  "types": ["compute-lease"],
  "announced": "YYYY-MM-DD",
  "signed": "YYYY-MM-DD (optional)",
  "start": "YYYY-MM-DD (optional)",
  "end": "YYYY-MM-DD (optional)",
  "values": {
    "hardMinimumUsd": 0,
    "ceilingUsd": 0,
    "conditionalUsd": 0,
    "estimateUsd": 0
  },
  "terms": {
    "rate": "optional text",
    "maturity": "optional text, e.g. 5 years",
    "recourse": "unknown",
    "collateral": "optional text",
    "takeOrPay": "unknown",
    "hellOrHighWater": "unknown",
    "terminationRights": "optional text",
    "exclusivity": "optional text",
    "notes": "What the source says, in plain words. Say which figure fills which value field."
  },
  "statusHistory": [
    { "date": "YYYY-MM-DD", "status": "announced" }
  ],
  "sources": [
    { "url": "https://...", "title": "Publisher: headline", "retrieved": "YYYY-MM-DD", "status": "secondary" }
  ]
}
```

## Fields

| Field | Meaning |
| --- | --- |
| `id` | Unique, lower-case, words joined by `-`. Add the year when the same parties have several deals. |
| `payers`, `payees`, `guarantors`, `vehicle` | Entity ids from `config/entities.json`. Add the entity there first if it is missing; the build rejects unknown ids. |
| `types` | One or more of `compute-lease`, `chip-purchase`, `equity`, `loan`, `spv-financing`, `capacity-guarantee`, `warrants`, `jv`, `buyer-of-last-resort`, `other`. |
| `terms.recourse` | `recourse`, `non-recourse` or `unknown`. |
| `terms.takeOrPay`, `terms.hellOrHighWater` | `yes`, `no` or `unknown`. Use `unknown` unless the source says so. |
| `statusHistory` | Dated steps: `announced`, `active`, `expanded`, `delayed`, `renegotiated`, `cancelled`, `replaced`, `completed`. Start with `announced` on the `announced` date. |

## Value fields

There is no total field and the code never adds these fields together. A record may have any of them, or none.

| Field | Use for | Example |
| --- | --- | --- |
| `hardMinimumUsd` | A signed, fixed amount the payer must pay. | "a $12B five-year contract" |
| `ceilingUsd` | An "up to" figure or the value if all options are used, exactly as stated. | "up to $27B" |
| `conditionalUsd` | An amount that is paid only if an event happens. | "$15B that Meta buys only if Nebius cannot sell it first" |
| `estimateUsd` | A figure from anonymous sources, "reported", or an analyst's number. | "people familiar said about $10B" |

Rules:

- Write each number as the source states it, in US dollars. Do not work out a figure (for example a ceiling as
  hard minimum plus conditional) unless the source states that figure.
- Do not move a number into a stronger field than its source supports: an "up to" figure is never a hard minimum,
  and a reported figure is always an estimate.
- No figure in the source: leave the field out. Never write 0 for "unknown".
- Non-USD amounts: use the US-dollar figure the source states and keep the original in `terms.notes`
  (for example "$1.0B (EUR 0.86B)"). If the source gives no US-dollar figure, leave the value field out and put the
  original amount and currency in `terms.notes`: the deal record has no field for an exchange rate.

## Dates

- `announced` is the **first public disclosure of this record's values**. A backtest uses the record from that day.
  A later expansion or new amount is a new record (and an `expanded` entry, with "see <new id>", in the old record's
  `statusHistory`). Changes to the terms of the same contract go in `statusHistory` notes with their own dates.
- **Month only** (for example "March 2026"): use the last day of the month (`2026-03-31`), and write
  "month only in capture; last day of month used" in the status note.
- **Range** (for example "2023-24" or "Q1-Q2"): use the latest date the range allows (`2024-12-31`), and say so in
  the note.
- `signed`, `start` and `end` follow the same rules. Leave them out when the source does not give them.

## Source status

Every source carries a status. Use the weakest one that applies to the numbers you entered.

| Status | Meaning |
| --- | --- |
| `primary-filing` | A regulatory filing (SEC 10-K, 10-Q, 8-K, S-1, 6-K). The URL must be on sec.gov. |
| `primary-company` | The company's own press release, investor page or results document. |
| `secondary` | A news article, blog or analyst note reporting the figure. |
| `unverified` | The figure could not be traced to a source we can open, or the sources disagree. |

`retrieved` is the date you read the source. If you check a figure against a filing later, add the filing as another
source and record the check in the verification log (`data/verification/`).

## Check

```
npm test
npm run data:build
```

Both must pass. Commit `data/deals/deals.json` together with the rebuilt `data/build/`.
