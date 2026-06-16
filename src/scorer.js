'use strict';

const pino = require('pino');
const logger = pino({
  level: 'info',
  timestamp: () => `",timestamp":"${new Date().toISOString()}"`
});

// in some other implementations i have used sentimental analysis libraries or even powerful ML models
// to declare deterministic results
// this is an example (arbitrary selections by Claude)
// but the big deal is the fact that some tasks could be either elaborated via a
// software, rather than delegating such responsibility to an expensive agent

// if thats not the case and we want to use generalist llms
// this scorer could be dumped and all analysis sent each row at the time to the llms


const RISK_STATUSES = new Set(['past_due', 'paused', 'canceled']);
const CONTRACT_WINDOW_DAYS = 45;
const CONTRACT_MRR_FLOOR = 500;

function daysUntil(dateStr) {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function signals(account) {
  const triggered = [];

  if (account.failed_payment_count_last_30d >= 2) triggered.push('failed_payments');
  if (account.days_since_last_login >= 30)         triggered.push('login_gap');
  if (account.open_support_tickets >= 3)           triggered.push('support_tickets');
  if (RISK_STATUSES.has(account.subscription_status)) triggered.push('bad_status');

  if (account.contract_end_date) {
    const daysLeft = daysUntil(account.contract_end_date);
    if (daysLeft >= 0 && daysLeft <= CONTRACT_WINDOW_DAYS && account.mrr >= CONTRACT_MRR_FLOOR)
      triggered.push('contract_ending');
  }

  return triggered;
}

function tier(triggered, account) {
  if (triggered.length === 0) return null;
  if (triggered.length >= 2)  return 'HIGH';
  if (triggered.includes('bad_status') && account.mrr >= CONTRACT_MRR_FLOOR) return 'HIGH';

  return 'MEDIUM';
}

function score(account) {
  if (!account.account_id) {
    logger.error('Skipping row — missing account_id');

    return null;
  }

  const triggered = signals(account);
  const riskTier  = tier(triggered, account);

  if (!riskTier) {
    logger.info({ account_id: account.account_id }, 'Healthy — no risk signals');
    return null;
  }

  logger.info({ account_id: account.account_id, tier: riskTier, signals: triggered }, 'At-risk account scored');

  return { ...account, signals: triggered, tier: riskTier };
}

function scoreAll(accounts) {
  logger.info(`-------------------`);
  logger.info(`Scoring ${accounts.length} accounts`);
  logger.info(`-------------------`);
  const results = accounts.map(score).filter(Boolean);
  logger.info(`-------------------`);
  logger.info(`${results.length} at-risk accounts identified`);
  logger.info(`-------------------`);

  return results;
}

if (require.main === module) {
  const { readCsv } = require('./csvReader');

  const resolveInput = () => {
    const fileFlagIndex = process.argv.indexOf('--file');
    const filePath = process.argv[fileFlagIndex + 1];
    if (fileFlagIndex !== -1 && filePath) return { type: 'file', path: filePath };
    if (!process.stdin.isTTY) return { type: 'stdin' };
    logger.error('No input. Use --file <path> or pipe CSV via stdin.');
    process.exit(1);
  };

  (async function handler() {
    try {
      const accounts = await readCsv(resolveInput());
      scoreAll(accounts);
    } catch (error) {
      logger.error({ err: error.message }, 'Scorer failed');
      process.exit(1);
    }
  })();
}

module.exports = { scoreAll };