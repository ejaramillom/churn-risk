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