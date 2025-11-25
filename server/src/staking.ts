import { db } from "./db";

export type StakingProduct = {
  id: number;
  asset: string;
  name: string;
  apr: number;         // annual percentage rate, e.g. 8.5
  lockDays: number;    // lock period in days
  minAmount: number;
  maxAmount: number | null;
  isActive: number;    // 1/0
  createdAt: string;
};

export type StakingPosition = {
  id: number;
  userId: number;
  productId: number;
  asset: string;
  amount: number;
  apr: number;
  lockDays: number;
  startedAt: string;
  closedAt: string | null;
  status: string;      // "active" | "closed"
};

function ensureStakingSchema() {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS stakingProducts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset TEXT NOT NULL,
      name TEXT NOT NULL,
      apr REAL NOT NULL,
      lockDays INTEGER NOT NULL,
      minAmount REAL NOT NULL,
      maxAmount REAL,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL
    )`
  ).run();

  db.prepare(
    `CREATE TABLE IF NOT EXISTS stakingPositions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      asset TEXT NOT NULL,
      amount REAL NOT NULL,
      apr REAL NOT NULL,
      lockDays INTEGER NOT NULL,
      startedAt TEXT NOT NULL,
      closedAt TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(productId) REFERENCES stakingProducts(id)
    )`
  ).run();
}

ensureStakingSchema();

// Optionally seed some demo products if table is empty
(function seedDemoProducts() {
  const row = db
    .prepare("SELECT COUNT(*) as c FROM stakingProducts")
    .get() as { c: number };

  if (row.c > 0) return;

  const now = new Date().toISOString();

  const stmt = db.prepare(
    `INSERT INTO stakingProducts
      (asset, name, apr, lockDays, minAmount, maxAmount, isActive, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
  );

  stmt.run("USDT", "Flexible USDT 5% APR", 5.0, 0, 10, null, now);
  stmt.run("USDT", "USDT 30 days – 8% APR", 8.0, 30, 50, null, now);
  stmt.run("BTC", "BTC 60 days – 4% APR", 4.0, 60, 0.001, null, now);
  stmt.run("ETH", "ETH 30 days – 5% APR", 5.0, 30, 0.05, null, now);
})();

export function listActiveStakingProducts(): StakingProduct[] {
  const rows = db
    .prepare(
      `SELECT id, asset, name, apr, lockDays, minAmount, maxAmount, isActive, createdAt
       FROM stakingProducts
       WHERE isActive = 1
       ORDER BY apr DESC`
    )
    .all() as StakingProduct[];
  return rows;
}

export function listUserPositions(userId: number): StakingPosition[] {
  const rows = db
    .prepare(
      `SELECT id, userId, productId, asset, amount, apr, lockDays,
              startedAt, closedAt, status
       FROM stakingPositions
       WHERE userId = ?
       ORDER BY startedAt DESC`
    )
    .all(userId) as StakingPosition[];
  return rows;
}

export function calculateAccruedReward(
  position: Pick<
    StakingPosition,
    "amount" | "apr" | "startedAt" | "closedAt" | "status"
  >
): number {
  const start = new Date(position.startedAt).getTime();
  const end =
    position.status === "closed" && position.closedAt
      ? new Date(position.closedAt).getTime()
      : Date.now();
  if (!start || !end || end <= start) return 0;

  const diffDays = (end - start) / (1000 * 60 * 60 * 24);

  // ✅ Interessi composti giornalieri
  const yearlyRate = position.apr / 100;
  const dailyRate = yearlyRate / 365;

  const fullDays = Math.floor(diffDays);
  if (!Number.isFinite(fullDays) || fullDays <= 0 || dailyRate <= 0) {
    return 0;
  }

  // Formula interesse composto: A = P * (1 + r)^n  → reward = A - P
  const principal = position.amount;
  const factor = Math.pow(1 + dailyRate, fullDays);
  const reward = principal * (factor - 1);

  return Number.isFinite(reward) ? reward : 0;
}
