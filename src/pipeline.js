'use strict';

require('dotenv').config();
const pino = require('pino');
const { readCsv } = require('./csvReader');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const resolveInput = () => {
  const fileFlag = process.argv.indexOf('--file');
  if (fileFlag !== -1 && process.argv[fileFlag + 1]) {
    return { type: 'file', path: process.argv[fileFlag + 1] };
  }
  if (!process.stdin.isTTY) {
    return { type: 'stdin' };
  }
  logger.error('No input provided. Use --file <path> or pipe CSV via stdin.');
  process.exit(1);
};

const run = async () => {
  const input = resolveInput();
  logger.info({ input }, 'Pipeline starting');

  // Step 1: Read and parse CSV
  const accounts = await readCsv(input);
  logger.info({ count: accounts.length }, 'Step 1 complete: CSV loaded');

  const source = input.type === 'file' ? input.path : 'stdin';
  console.log(`\nLoaded ${accounts.length} accounts from ${source}.`);
  console.log('Next: scorer → llm → slack.');

  // Step 2: Score accounts (scorer.js — next)
  // Step 3: Generate LLM assessments (llm.js — next)
  // Step 4: Post to Slack (slack.js — next)
};

run().catch((err) => {
  logger.error({ err }, 'Pipeline failed');
  process.exit(1);
});
