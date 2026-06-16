## The exact prompt

```
You are a CS analyst writing the Monday churn briefing. For each account below, write 1-2 sentences of plain-English insight. Label each entry with the account name in bold.

Accounts:
- Bright Solutions (MEDIUM tier, MRR $800): failed_payments
- CloudNine Ltd (HIGH tier, MRR $3200): login_gap,bad_status
...

Respond with ONLY the briefing text between these exact markers — no other text, no summary, no explanation outside them:

===BRIEFING===
<your briefing here>
===END===
```

The account block is built dynamically in `analyseBriefing()` from the scored output of `scoreAll()`.

## Why it was written this way

the role line sets a professional voice without overloading the model with instructions
writing "CS analyst" and "Monday churn briefing" anchors the output to a real audience and a real use case
without that framing the model writes for a generic reader and the tone is wrong

the 1 to 2 sentences constraint keeps the briefing scannable
CS reads this in Slack on a Monday morning so brevity matters more than depth

account name in bold was added so the output is usable directly in Slack without reformatting

each account line passes tier MRR and signals only
that is enough for the model to reason about severity and likely cause
the raw field values like subscription_status or contract_end_date add noise without adding meaning because the signals already encode what matters

## What we tried first and what changed

first attempt used agy (Gemini CLI) with no output constraints
the model returned a full report with preamble bullet summaries and closing remarks
none of that was wanted and it was inconsistent across runs

we added the `===BRIEFING===` and `===END===` markers to give the model a strict output zone
`extractBriefing()` clips to that section and discards everything outside it

agy kept timing out at the infra level so we moved to Ollama running qwen3 8b locally
qwen3 has a `thinking` field in its response that shows reasoning steps
we only read `.response` and ignore thinking entirely since we just need the briefing text

## How we thought about the context window

what goes in:
- account name so the output is human readable
- tier so the model knows how urgent to sound
- MRR so it can calibrate business impact
- signals so it knows what risk factors are in play

what stays out:
- account_id (internal id with no meaning to the model)
- plan_name (not relevant to the risk reasoning)
- raw field values like `subscription_status: past_due` (the signal name already says this)
- contract_end_date as a date (the signal `contract_ending` is enough context)

keeping the input compact matters for two reasons
first it keeps inference fast on a local 8b model
second it avoids giving the model irrelevant fields to fixate on

## One thing this prompt will get wrong

the model has no account history or relationship context
it sees signals but not what happened before them
a login gap on an account that just signed a two year renewal is noise
a login gap on an account that opened 5 support tickets last week is urgent

the briefing treats both the same way because signals are all we pass

in production the fix is to enrich each account line with recent CS notes last renewal date and open ticket summaries
that turns the prompt into a true decision support tool instead of a signal echo
a retrieval step before the LLM call would pull the last 30 days of account activity from the CRM and append it per row