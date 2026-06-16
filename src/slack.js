'use strict';

require('dotenv').config();
const axios = require('axios');
const pino = require('pino');
const logger = pino({ level: 'info', timestamp: () => `",timestamp":"${new Date().toISOString()}"` });

async function postBriefing(briefing) {
    await axios.post(process.env.SLACK_WEBHOOK_URL, { text: briefing })
        .catch(error => {
            logger.error({ err: error.response?.data || error.message }, 'Slack post failed');
            process.exit(1);
        });
    // logging only the last 10 chars so the webhook secret never lands in logs
    logger.info({ channel: process.env.SLACK_WEBHOOK_URL?.slice(-10) }, 'SUCCESS: postBriefing');
}

module.exports = { postBriefing };