# How we decide an account is at risk

## The signals

An account gets flagged if it hits any of these:

| Signal | Threshold | Why |
|---|---|---|
| Failed payments in the last 30 days | 2 or more | One failure can be an expired card. Two means the billing issue is still unresolved. |
| Days since last login | 30 or more | If nobody has opened the product in a month, it's probably not in their workflow anymore. |
| Open support tickets | 3 or more | Repeated unresolved problems tend to lead to cancellations. |
| Subscription status | `past_due`, `paused`, or `canceled` | The billing system is already telling us something is wrong. |
| Contract ending soon | Within 45 days, and MRR $500+ | High-value accounts approaching renewal need a heads-up. |

## High vs Medium

- **HIGH** — 2 or more signals, or a bad billing status on a paying account.
- **MEDIUM** — exactly 1 signal.

Very low-MRR accounts with only one weak signal are skipped — the cost of a CS outreach isn't worth it.

## What the LLM is for

The rules above decide *whether* an account is at risk. The LLM decides *how to say it* — it turns the raw signals into 2–3 sentences that read like a real analyst wrote them, not a list of database fields.

## Known gaps

- Login gap is a lagging signal — an account can be quietly disengaged for months before it crosses the 30-day mark.
- Ticket count doesn't tell us severity — 3 minor UI questions is not the same as 1 billing blocker.
- The 45-day contract window and $500 MRR floor are guesses. In production these should be tuned against historical churn data.

## What we'd improve in production

1. Score signals differently — a failed payment should weigh more than a login gap.
2. Use trends, not snapshots — MRR declining over 3 months is a much stronger signal than a single low number.
3. Pull ticket category, not just count.
