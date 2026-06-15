# churn-risk

Automates the RevOps Monday churn briefing. You give it a CSV of accounts, it tells you which ones are at risk and why — and generates a plain-English CS briefing via Gemini.

## Current status

Pipeline is fully wired and working end to end:

| Step | Module | Status |
|---|---|---|
| 1. Parse CSV | `src/csvReader.js` | ✅ |
| 2. Score accounts | `src/scorer.js` | ✅ |
| 3. Generate LLM briefing | `src/llm.js` | ✅ via `agy` (Gemini) |
| 4. Post to Slack | `src/slack.js` | 🔜 next |

## Install

Node.js 18 or higher required.

```bash
npm install
```

## Run

### Full pipeline

```bash
node src/pipeline.js --file data/sample_accounts.csv
```

Pipe a CSV directly:

```bash
cat data/sample_accounts.csv | node src/pipeline.js
```

### Scorer only

Score accounts and print risk tier + signals without the LLM step:

```bash
node src/scorer.js --file data/sample_accounts.csv
```

### CSV reader only

Parse and normalise a CSV, print first row and row count:

```bash
node src/csvReader.js --file data/sample_accounts.csv
```

### LLM briefing only

Not a standalone executable — wired into the pipeline. Run the full pipeline to see the briefing output.

## Sample data

| File | What it tests |
|---|---|
| `data/sample_accounts.csv` | 20 mixed accounts — healthy and at-risk |
| `data/missing_account_id.csv` | Row with blank `account_id` — logged as error, skipped |
| `data/missing_fields.csv` | Rows with missing MRR, date, and all fields empty |

Each row has these fields:

```
account_id, account_name, mrr, plan_name, subscription_status,
failed_payment_count_last_30d, days_since_last_login,
open_support_tickets, contract_end_date
```

## Environment variables

Copy `.env.example` and fill in your keys:

```bash
cp .env.example .env
```

| Variable | Used in | What it is |
|---|---|---|
| `SLACK_WEBHOOK_URL` | Step 4 | Incoming webhook for the CS Slack channel |

> **LLM**: The briefing step calls `agy` (Gemini CLI) authenticated via `~/.gemini/settings.json` — no API key env var needed on a machine where `agy` is already set up.

## How the at-risk logic and LLM briefing work

See `docs/THINKING.md`.
