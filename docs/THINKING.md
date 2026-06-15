# How churn risk scoring works

## The problem

Customer success runs a Monday briefing: which accounts are at risk of churning this week? Right now that means manually scanning a spreadsheet. This pipeline automates that read.

## Risk signals

A signal fires when a threshold is crossed on a single account field.

| Signal | Condition |
|---|---|
| `failed_payments` | 2 or more failed payments in the last 30 days |
| `login_gap` | No login in 30 or more days |
| `support_tickets` | 3 or more open support tickets |
| `bad_status` | Subscription is `past_due`, `paused`, or `canceled` |
| `contract_ending` | Contract ends within 45 days and MRR ≥ $500 |

## Risk tier

| Tier | Condition |
|---|---|
| `HIGH` | 2 or more signals, or `bad_status` alone on a paying account (MRR ≥ $500) |
| `MEDIUM` | 1 signal, and not the HIGH shortcut above |
| healthy | 0 signals — account is excluded from the briefing |

## Why these thresholds

- **2 failed payments**: one missed payment can be a card expiry. Two in 30 days is a pattern.
- **30 day login gap**: a month of silence is a strong disengagement signal, regardless of plan size.
- **3 support tickets**: noise below that threshold; above it suggests unresolved friction.
- **45 day contract window**: enough lead time for CS to have a meaningful renewal conversation.
- **$500 MRR floor on contract_ending**: low-MRR accounts on short contracts are expected to churn — not worth escalating.

## What gets skipped

Accounts with a missing `account_id` are logged as errors and excluded — we cannot report on an account we cannot identify.

Accounts with a missing `contract_end_date` skip the `contract_ending` check but are still scored on all other signals.
## LLM briefing step

### What it does

After scoring, at-risk accounts are passed to `analyseBriefing()` in `src/llm.js`. A single prompt is built listing all at-risk accounts with their tier, MRR, and signals. One LLM call returns a plain-English paragraph per account — CS-readable output for the Monday briefing.

### Provider journey

**OpenAI via OpenRouter (attempted, blocked)**

We tried routing through OpenRouter pointing at `gpt-4o-mini`. The call was structurally correct — same axios pattern used in the `interaction-analyzer` project (`https://github.com/ejaramillom/interaction-analyzer`) which worked against a paid OpenAI account.

Blocked by quota exhaustion (OpenRouter account not funded):

```json
{"level":50,"timestamp":"2026-06-15T16:45:20.202Z","pid":281487,"hostname":"emmanuel",
 "err":"Request failed with status code 429","status":429,
 "detail":{"error":{"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.",
 "type":"insufficient_quota","param":null,"code":"insufficient_quota"}},"msg":"LLM call failed"}
```

**Claude CLI (current)**

Since we pay for Claude, the simplest path is calling the `claude` CLI subprocess (`claude -p "<prompt>"`). No API key wiring, no new deps — `child_process.spawnSync` from stdlib. This is a local dev example; a production path would use the Anthropic SDK directly.
