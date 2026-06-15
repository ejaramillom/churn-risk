'use strict';

const fs = require('node:fs');
const csv = require('csv-parser');
const { finished } = require('node:stream/promises');
const pino = require('pino');
const logger = pino({
  level: 'info',
  timestamp: () => `",timestamp":"${new Date().toISOString()}"`
});

function normalise(row) {
  return {
    account_id:                    row.account_id,
    account_name:                  row.account_name,
    mrr:                           Number.parseFloat(row.mrr) || 0,
    plan_name:                     row.plan_name,
    subscription_status:           row.subscription_status,
    failed_payment_count_last_30d: Number.parseInt(row.failed_payment_count_last_30d, 10) || 0,
    days_since_last_login:         Number.parseInt(row.days_since_last_login, 10) || 0,
    open_support_tickets:          Number.parseInt(row.open_support_tickets, 10) || 0,
    contract_end_date:             row.contract_end_date,
  };
}

async function streamToRows(source) {
  const rows = [];
  // this is just a transformation to JS understandable elements: raw bytes to csv parser to JS object per row
  const stream = source.pipe(csv());
  stream.on('data', (row) => rows.push(normalise(row)));
  await finished(stream);

  logger.info('-------------------');
  logger.info({ stream: rows[0] }, `First processed row: example of data provided`);
  logger.info('-------------------');

  return rows;
}

async function processWithThrottle(rows, fn) {
  const results = [];
  for (const row of rows) {
    logger.info({ account_id: row.account_id }, `Processing row`);
    try {
      const result = await fn(row);
      results.push(result);
    } catch (error) {
      logger.error({ err: error.message }, `Row ${row.account_id} failed — skipping`);
      results.push({ ...row, error: error.message });
    }
  }
  return results;
}

async function readCsv(input) {
  if (input.type !== 'file') return streamToRows(process.stdin);
  if (!fs.existsSync(input.path)) {
    logger.error(`CSV file not found: ${input.path}`);
    process.exit(1);
  }
  return streamToRows(fs.createReadStream(input.path));
}

module.exports = { readCsv, processWithThrottle };