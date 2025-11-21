import { db } from "./db";

export type StakingPlan = {
  id: number;
  name: string;
  asset: string;
  apr: number; // annual percentage rate, e.g. 0.12 = 12%
  lockDays: number;
  minAmount: number;
  maxAmount: number | null;
  isActive: number;
};

export type UserStake = {
  id: number;
  userId: number;
  planId: number;
  asset: string;
  amount: number;
  apr: number;
  lockDays: number;
  startAt: string;
  unlockAt: string;
  claimedRewards: number;
  status: string; // "active" | "claimed" | "cancelled" | "expired"
};

function ensureStakingSchema() {
  // Plans
  db.prepare(
    `CREATE TABLE IF NOT EXISTS stakingPlans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      asset TEXT NOT NULL,
      apr REAL NOT NULL,
      lockDays INTEGER NOT NULL,
      minAmount REAL NOT NULL,
      maxAmount REAL,
      isActive INTEGER NOT NULL DEFAULT 1
    )`
  ).run();

  // User stakes
  db.prepare(
    `CREATE TABLE IF NOT EXISTS userStakes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      planId INTEGER NOT NULL,
      asset TEXT NOT NULL,
      amount REAL NOT NULL,
      apr REAL NOT NULL,
      lockDays INTEGER NOT NULL,
      startAt TEXT NOT NULL,
      unlockAt TEXT NOT NULL,
      claimedRewards REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(planId) REFERENCES stakingPlans(id)
    )`
  ).run();

  // Seed a couple of demo plans if table is empty
  const countRow = db
    .prepare("SELECT COUNT(*) as c FROM stakingPlans")
    .get() as { c: number };
  if (!countRow || countRow.c === 0) {
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO stakingPlans (name, asset, apr, lockDays, minAmount, maxAmount, isActive)
       VALUES (?, ?, ?, ?, ?, ?, 1)`
    ).run("USDT Flexible 8%", "USDT", 0.08, 7, 10, null);
    db.prepare(
      `INSERT INTO stakingPlans (name, asset, apr, lockDays, minAmount, maxAmount, isActive)
       VALUES (?, ?, ?, ?, ?, ?, 1)`
    ).run("USDT Locked 12%", "USDT", 0.12, 30, 50, null);
    console.log("[staking] Seeded default staking plans at", now);
  }
}

ensureStakingSchema();

export function listActivePlans(): StakingPlan[] {
  const rows = db
    .prepare(
      `SELECT id, name, asset, apr, lockDays, minAmount, maxAmount, isActive
       FROM stakingPlans
       WHERE isActive = 1
       ORDER BY apr DESC`
    )
    .all() as StakingPlan[];
  return rows;
}

export function listUserStakes(userId: number): UserStake[] {
  const rows = db
    .prepare(
      `SELECT id, userId, planId, asset, amount, apr, lockDays, startAt, unlockAt, claimedRewards, status
       FROM userStakes
       WHERE userId = ?
       ORDER BY startAt DESC`
    )
    .all(userId) as UserStake[];
  return rows;
}

/**
 * Calculate total reward for a stake from startAt to "now".
 * Simple linear APR: reward = amount * apr * (days / 365).
 */
export function calcRewards(
  stake: Pick<UserStake, "amount" | "apr" | "startAt" | "unlockAt">,
  now: Date
): number {
  const start = new Date(stake.startAt).getTime();
  const end = new Date(stake.unlockAt).getTime();
  const nowTs = now.getTime();

  const effectiveEnd = Math.min(nowTs, end);
  if (effectiveEnd <= start) return 0;

  const days = (effectiveEnd - start) / (1000 * 60 * 60 * 24);
  const yearly = stake.amount * stake.apr;
  const reward = (yearly * days) / 365;
  return reward;
}
