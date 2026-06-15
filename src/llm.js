'use strict';

const axios = require('axios');
const pino = require('pino');
const logger = pino({
    level: 'info',
    timestamp: () => `",timestamp":"${new Date().toISOString()}"`
});

async function analyseAccount(account) {
    const { account_id, account_name, mrr, signals, tier } = account;
    const prompt = `You are a customer success analyst. Write 2-3 sentences of plain-English insight about why this account is at risk. Sound like a real analyst, not a field dump.\n\nAccount: ${account_name} (${tier} tier), MRR $${mrr}. Risk signals: ${signals}.`;

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150,
            temperature: 0.2,
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            }
        });

        const result = response.data.choices[0].message.content.trim();
        logger.info({ account_id, analysis: result }, 'SUCCESS: analyseAccount');
        return result;
    } catch (error) {
        logger.error({ account_id, err: error.message }, 'LLM call failed');
        process.exit(1);
    }
}

module.exports = { analyseAccount };
