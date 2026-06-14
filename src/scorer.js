'use strict';

const RISK_STATUSES = new Set(['past_due', 'paused', 'canceled']);
const CONTRACT_WINDOW_DAYS = 45;
const CONTRACT_MRR_FLOOR = 500;

const daysUntil = (dateStr) => {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
};

// Returns array of triggered signal names for a single account.
const signals = (account) => {
  const triggered = [];

  if (account.failed_payment_count_last_30d >= 2)
    triggered.push('failed_payments');

  if (account.days_since_last_login >= 30)
    triggered.push('login_gap');

  if (account.open_support_tickets >= 3)
    triggered.push('support_tickets');

  if (RISK_STATUSES.has(account.subscription_status))
    triggered.push('bad_status');

  const daysLeft = daysUntil(account.contract_end_date);
  if (daysLeft >= 0 && daysLeft <= CONTRACT_WINDOW_DAYS && account.mrr >= CONTRACT_MRR_FLOOR)
    triggered.push('contract_ending');

  return triggered;
};

const tier = (triggered, account) => {
  if (triggered.length === 0) return null;
  if (triggered.length >= 2) return 'HIGH';
  // single bad_status signal on a paying account is already high
  if (triggered.includes('bad_status') && account.mrr >= CONTRACT_MRR_FLOOR) return 'HIGH';
  return 'MEDIUM';
};

// Score a single account. Returns the account enriched with { signals, tier } or null if healthy.
const score = (account) => {
  const triggered = signals(account);
  const riskTier = tier(triggered, account);
  if (!riskTier) return null;
  return { ...account, signals: triggered, tier: riskTier };
};

// Score all accounts. Returns only at-risk ones.
const scoreAll = (accounts) => accounts.map(score).filter(Boolean);

module.exports = { scoreAll };
