import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

export const db = new Database(process.env.DB_FILE || "exchange.db");
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  kycStatus TEXT NOT NULL DEFAULT 'unverified',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  asset TEXT NOT NULL,
  -- saldo totale
  balance REAL NOT NULL DEFAULT 0,
  -- parte del saldo bloccata (ordini, staking, ecc.)
  locked REAL NOT NULL DEFAULT 0,
  -- parte del saldo disponibile all'uso immediato
  available REAL NOT NULL DEFAULT 0,
  UNIQUE(userId, asset)
);
CREATE TABLE IF NOT EXISTS prices (
  asset TEXT PRIMARY KEY,
  price REAL NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS deposits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  asset TEXT NOT NULL,
  amount REAL NOT NULL,
  gateway TEXT NOT NULL,
  status TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  asset TEXT NOT NULL,
  amount REAL NOT NULL,
  address TEXT NOT NULL,
  status TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  reviewedBy INTEGER,
  reviewedAt TEXT
);
CREATE TABLE IF NOT EXISTS trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  pair TEXT NOT NULL,
  side TEXT NOT NULL,
  price REAL NOT NULL,
  qty REAL NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS promoCodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  rewardType TEXT NOT NULL,
  rewardValue REAL NOT NULL,
  maxRedemptions INTEGER NOT NULL DEFAULT 1,
  expiresAt TEXT,
  createdBy INTEGER,
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS promoRedemptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  promoCodeId INTEGER NOT NULL,
  redeemedAt TEXT NOT NULL,
  bonusAmount REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS stakingPlans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset TEXT NOT NULL,
  apr REAL NOT NULL,
  lockDays INTEGER NOT NULL,
  minAmount REAL NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS userStakes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  planId INTEGER NOT NULL,
  amount REAL NOT NULL,
  startedAt TEXT NOT NULL,
  endsAt TEXT NOT NULL,
  closedAt TEXT,
  reward REAL
);
CREATE TABLE IF NOT EXISTS internalTransfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fromUserId INTEGER NOT NULL,
  toUserId INTEGER NOT NULL,
  asset TEXT NOT NULL,
  amount REAL NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  meta TEXT,
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS coins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  minWithdraw REAL NOT NULL DEFAULT 0,
  withdrawFee REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS emailOutbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  toEmail TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  sentAt TEXT
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  userId INTEGER NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
`);

export function seedIfEmpty() {
  const row = db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };
  if (row.c > 0) return;

  const now = new Date().toISOString();

  const demoHash = bcrypt.hashSync("demo123", 10);
  const adminPassword = process.env.ADMIN_PASSWORD || "CHANGE_ME_ADMIN_PASSWORD";
  if (!process.env.ADMIN_PASSWORD) {
    console.warn(
      "[seed] Using default admin password. Set ADMIN_PASSWORD in environment for better security."
    );
  }
  const adminHash = bcrypt.hashSync(adminPassword, 10);

  const insertUser = db.prepare(
    "INSERT INTO users (email,password,role,kycStatus,createdAt,updatedAt) VALUES (?,?,?,?,?,?)"
  );

  insertUser.run("demo@bitchange.money", demoHash, "user", "verified", now, now);
  insertUser.run("admin@bitchange.money", adminHash, "admin", "verified", now, now);

  const coins = [
    ["BTC","Bitcoin"],
    ["ETH","Ethereum"],
    ["USDT","Tether"],
    ["BNB","BNB"],
    ["SOL","Solana"],
    ["XRP","XRP"],
    ["DOGE","Dogecoin"],
    ["ADA","Cardano"],
    ["DOT","Polkadot"],
    ["MATIC","Polygon"],
    ["AVAX","Avalanche"],
    ["LTC","Litecoin"],
    ["TRX","TRON"],
    ["TON","Toncoin"],
    ["LINK","Chainlink"],
  ];

  const insertCoin = db.prepare(
    "INSERT OR IGNORE INTO coins (asset,name,enabled,minWithdraw,withdrawFee) VALUES (?,?,?,?,?)"
  );
  const upsertPrice = db.prepare(
    "INSERT OR REPLACE INTO prices (asset,price,updatedAt) VALUES (?,?,?)"
  );
  const upsertWallet = db.prepare(
    `
    INSERT OR IGNORE INTO wallets (userId, asset, balance, locked, available)
    VALUES (?, ?, ?, ?, ?)
    `
  );
  const demoId = db
    .prepare("SELECT id FROM users WHERE email=?")
    .get("demo@bitchange.money")!.id as number;

  for (const [asset, name] of coins) {
    insertCoin.run(asset, name, 1, 5, 0.1);

    const price = Math.random() * 50000 + 10;
    upsertPrice.run(asset, price, now);

    const initialBalance = asset === "USDT" ? 2000 : 0.5;
    const locked = 0;
    const available = initialBalance;

    upsertWallet.run(demoId, asset, initialBalance, locked, available);
  }
}