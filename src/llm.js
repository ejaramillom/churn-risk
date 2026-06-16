'use strict';

// we moved from agy (gemini cli) to ollama after agy kept timing out
// ollama runs qwen3 8b locally so no api key and no external network call needed
// fetch is built into node 18 and above so no extra dependencies
const pino = require('pino');

const logger = pino({
    level: 'info',
    timestamp: () => `",timestamp":"${new Date().toISOString()}"`
});

function extractBriefing(raw) {
    const match = raw.match(/===BRIEFING===([\s\S]*?)===END===/);
    if (!match) {
        logger.error({ raw: raw.slice(0, 300) }, 'LLM response missing briefing markers');
        process.exit(1);
    }

    return match[1].trim();
}

/*
   * DISABLED: OpenRouter implementation (gpt-4o-mini)
   *
   * We tried OpenRouter pointing at gpt-4o-mini:
   *   POST https://openrouter.ai/api/v1/chat/completions
   *   model: 'gpt-4o-mini'
   *
   * Got HTTP 429 / insufficient_credits — account not funded.
   *
   * Exact error log from the run:
   * {"level":50,"timestamp":"2026-06-15T16:45:20.202Z","pid":281487,"hostname":"emmanuel",
   *  "err":"Request failed with status code 429","status":429,
   *  "detail":{"error":{"message":"You exceeded your current quota, please check your plan and billing details.
   *  For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.",
   *  "type":"insufficient_quota","param":null,"code":"insufficient_quota"}},"msg":"LLM call failed"}
   *
   * Reference implementation that worked with a paid account:
   *   https://github.com/ejaramillom/interaction-analyzer
   *   (LLM call pattern: OpenAI directly via axios, same structure as below)
   *
   * const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
   *     model: 'gpt-4o-mini',
   *     messages: [{ role: 'user', content: prompt }],
   *     max_tokens: 800,
   *     temperature: 0.2,
   * }, {
   *     headers: {
   *         'Content-Type': 'application/json',
   *         'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
   *     }
   * }).catch(error => {
   *     logger.error({ err: error.message, status: error.response?.status, detail: error.response?.data }, 'LLM call failed');
   *     process.exit(1);
   * });
   *
   * const result = response.data.choices[0].message.content.trim();
   */

// the prompt has been refined based on experience and results
// this needs to be built on top of a harness for observability
// to be able to provide steering and hard gating to remove
// undesired behaviors or hallucinations
// although the scorer script helps a lot at the moment with that
// context is very simple and request is almost not for an llm
// anyways for the sake of the excercise thats what we have here

async function analyseBriefing(atRisk) {
    const accountLines = atRisk
        .map(({ account_name, tier, mrr, signals }) => `- ${account_name} (${tier} tier, MRR $${mrr}): ${signals}`)
        .join('\n');

    const prompt = `You are a CS analyst writing the Monday churn briefing. For each account below, write 1-2 sentences of plain-English insight. Label each entry with the account name in bold.

Accounts:
${accountLines}

Respond with ONLY the briefing text between these exact markers — no other text, no summary, no explanation outside them:

===BRIEFING===
<your briefing here>
===END===`;

    // stream false means we wait for the full response in one shot
    // easier to parse than chunked output and good enough for a briefing script
    const res = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'qwen3:8b', prompt, stream: false })
    });
    const { response } = await res.json();

    const briefing = extractBriefing(response);
    logger.info({ briefing }, 'SUCCESS: ollama analyse briefing');

    return briefing;
}

module.exports = { analyseBriefing };