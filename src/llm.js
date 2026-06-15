'use strict';

const axios = require('axios');
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

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
        temperature: 0.2,
    }, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
    }).catch(error => {
        logger.error({ err: error.message }, 'LLM call failed');
        process.exit(1);
    });

    const result = response.data.choices[0].message.content.trim();
    logger.info({ briefing: result }, 'SUCCESS: analyseBriefing');
    return result;
}

module.exports = { analyseBriefing };
