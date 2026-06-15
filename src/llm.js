'use strict';

const { spawnSync } = require('child_process');
const pino = require('pino');
const logger = pino({
    level: 'info',
    timestamp: () => `",timestamp":"${new Date().toISOString()}"`
});

async function analyseBriefing(atRisk) {
    const accountLines = atRisk
        .map(({ account_name, tier, mrr, signals }) => `- ${account_name} (${tier} tier, MRR $${mrr}): ${signals}`)
        .join('\n');

    const prompt = `You are a CS analyst writing the Monday churn briefing. For each account below, write 1-2 sentences of plain-English insight. Label each entry with the account name.\n\n${accountLines}`;

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

    // Using claude CLI (subprocess) — paid account available locally, no API key needed
    const proc = spawnSync('claude', ['-p', prompt], { encoding: 'utf8' });

    if (proc.status !== 0) {
        logger.error({ stderr: proc.stderr, status: proc.status }, 'LLM call failed');
        process.exit(1);
    }

    const result = proc.stdout.trim();
    logger.info({ briefing: result }, 'SUCCESS: analyseBriefing');
    return result;
}

module.exports = { analyseBriefing };
