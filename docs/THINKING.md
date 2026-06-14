# At-Risk Threshold Logic

## Why these signals

The goal is to flag accounts that are **likely to churn in the next 30 days** with enough lead time for Customer Success to intervene. Each signal was chosen because it maps to a real RevOps mental model — the kind of pattern an analyst would circle in red before writing their Monday summary.

## Signals and thresholds

| Signal | Threshold | Rationale |
|---|---|---|
| `failed_payment_count_last_30d` | `>= 2` | One failure can be a card expiry. Two or more signals an unresolved billing issue — a hard stop before next renewal. |
| `days_since_last_login` | `>= 30` | No login in a month means the product is not in their workflow. Silent churn precedes explicit cancel. |
| `open_support_tickets` | `>= 3` | Multiple open tickets means the account is experiencing repeated friction. Unresolved frustration correlates strongly with non-renewal. |
| `subscription_status` | `past_due`, `paused`, `canceled` | These are explicit signals from the billing system — the account is already in a failure state. |
| `contract_end_date` | within 45 days AND `mrr >= 500` | Renewal window for accounts that matter economically. Low-MRR accounts near end of term are included only when stacked with other signals. |

## Severity tiering

| Tier | Condition |
|---|---|
| **High** | 2 or more signals triggered, OR `subscription_status` is `canceled`/`past_due` + any second signal |
| **Medium** | Exactly 1 signal triggered |

Low-MRR accounts (`mrr < 100`) that trigger only one weak signal (e.g. login gap) are **excluded** — the cost of a CS outreach exceeds the recovery value.

## What the LLM adds

The threshold logic is binary and auditable. The LLM's job is not to re-decide — it is to **narrate**: turn the raw signal set into a 2–3 sentence summary that sounds like a thoughtful analyst wrote it, not a rule engine. The risk tier is decided before the LLM is called.

## Known limitations

- `days_since_last_login` is a lagging indicator — an account can be disengaged for months before the login gap becomes visible.
- `open_support_tickets` is a count, not a severity — 3 cosmetic tickets is not the same as 1 billing blocker.
- `contract_end_date` logic assumes today is 2026-06-14; in production this must be dynamic.
- MRR floor (`>= 500`) for contract-end signal is arbitrary — should be calibrated against historical churn data.

## Production improvements

1. **Weight signals differently** — failed payments and status transitions should outrank login gaps.
2. **Historical trend** — a single data point per account is weak; MRR decline over 3 months is a much stronger predictor.
3. **Calibrate thresholds** — run against 6 months of labelled churn data and tune each threshold to maximise F1.
4. **Ticket severity** — pull support ticket priority/category, not just count.
