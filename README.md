# churn-risk

Automates the RevOps Monday churn briefing. You give it a CSV of accounts, it tells you which ones are at risk and why.

## What it does right now

Reads a CSV, scores each account against risk rules, and prints which ones are at risk and why.

```
Scoring 20 accounts
At-risk account scored — account_id: ACC-003, tier: HIGH, signals: [bad_status, login_gap]
...
6 at-risk accounts identified
```

Coming next: generate a plain-English summary via Claude → post to Slack.

## Install

You need Node.js 18 or higher.

```bash
npm install
```

## Run

```bash
node src/pipeline.js --file data/sample_accounts.csv
```

Or pipe a CSV directly:

```bash
cat data/sample_accounts.csv | node src/pipeline.js
```

### Run scorer standalone

To score accounts without running the full pipeline:

```bash
node src/scorer.js --file data/sample_accounts.csv
```

## Sample data

| File | What it tests |
|---|---|
| `data/sample_accounts.csv` | 20 mixed accounts — healthy and at-risk |
| `data/missing_account_id.csv` | Row with blank account_id — should log error and skip |
| `data/missing_fields.csv` | Rows with missing MRR, date, and all fields empty |

Each row has these fields:

```
account_id, account_name, mrr, plan_name, subscription_status,
failed_payment_count_last_30d, days_since_last_login,
open_support_tickets, contract_end_date
```

## Environment variables

Not needed yet. Once the LLM and Slack steps are added, copy `.env.example` and fill in your keys:

```bash
cp .env.example .env
```

| Variable | Used in | What it is |
|---|---|---|
| `ANTHROPIC_API_KEY` | Step 3 | Claude API key |
| `OPENAI_API_KEY` | Step 3 | OpenAI API key |
| `SLACK_WEBHOOK_URL` | Step 4 | Incoming webhook for the CS Slack channel |

## How the at-risk logic works

See `docs/THINKING.md`.