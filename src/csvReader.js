'use strict';

const fs = require('fs');
const csv = require('csv-parser');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Collect all rows from a readable stream into an array.
// Stream is paused while the consumer processes each batch (backpressure-safe).
const streamToRows = (source) => {
  return new Promise((resolve, reject) => {
    const rows = [];

    source
      .pipe(csv())
      .on('data', (row) => {
        rows.push(normalise(row));
      })
      .on('end', () => {
        logger.debug({ rowCount: rows.length }, 'CSV stream ended');
        resolve(rows);
      })
      .on('error', reject);
  });
};

// Coerce CSV string values to the expected types.
const normalise = (row) => ({
  account_id:                     row.account_id,
  account_name:                   row.account_name,
  mrr:                            parseFloat(row.mrr) || 0,
  plan_name:                      row.plan_name,
  subscription_status:            row.subscription_status,
  failed_payment_count_last_30d:  parseInt(row.failed_payment_count_last_30d, 10) || 0,
  days_since_last_login:          parseInt(row.days_since_last_login, 10) || 0,
  open_support_tickets:           parseInt(row.open_support_tickets, 10) || 0,
  contract_end_date:              row.contract_end_date,
});

// Process an array of rows with a capped concurrency (throttle).
// fn(row) → Promise. Errors per row are caught and logged; processing continues.
const processWithThrottle = async (rows, fn, concurrency = 3) => {
  const results = [];
  let index = 0;

  const worker = async () => {
    while (index < rows.length) {
      const row = rows[index++];
      try {
        const result = await fn(row);
        results.push(result);
      } catch (err) {
        logger.error({ account_id: row.account_id, err: err.message }, 'Row processing failed — skipping');
        results.push({ ...row, error: err.message });
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
};

// Public entry point. Accepts { type: 'file', path } or { type: 'stdin' }.
const readCsv = async (input) => {
  let source;

  if (input.type === 'file') {
    if (!fs.existsSync(input.path)) {
      throw new Error(`CSV file not found: ${input.path}`);
    }
    source = fs.createReadStream(input.path);
    logger.info({ path: input.path }, 'Reading CSV from file');
  } else {
    source = process.stdin;
    logger.info('Reading CSV from stdin');
  }

  return streamToRows(source);
};

module.exports = { readCsv, processWithThrottle };
