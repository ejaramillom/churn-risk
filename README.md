# churn-risk

Automates the RevOps Monday churn briefing. You give it a CSV of accounts, it tells you which ones are at risk and why.

## What it does right now

Reads a CSV file, parses each account row, and prints how many accounts were loaded.

```
Loaded 20 accounts from data/sample_accounts.csv.
Next: scorer → llm → slack.
```

Coming next: score each account against risk rules → generate a plain-English summary via Claude → post to Slack.

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

## Sample data

`data/sample_accounts.csv` has 20 fictional accounts. Each row has these fields:

```
account_id, account_name, mrr, plan_name, subscription_status,
failed_payment_count_last_30d, days_since_last_login,
open_support_tickets, contract_end_date
```

The accounts are a mix of healthy and at-risk so you can see the scorer work when that step is added.

## Environment variables

Not needed yet. Once the LLM and Slack steps are added, copy `.env.example` and fill in your keys:

```bash
cp .env.example .env
```

| Variable | Used in | What it is |
|---|---|---|
| `ANTHROPIC_API_KEY` | Step 3 | Claude API key |
| `SLACK_WEBHOOK_URL` | Step 4 | Incoming webhook for the CS Slack channel |

## How the at-risk logic works

See `docs/THINKING.md`.
