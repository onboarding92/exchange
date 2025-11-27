import { db } from "./db";

export function seedDemoProducts() {
  const row = db.prepare("SELECT COUNT(*) as c FROM stakingProducts").get() as any;
  if (row.c > 0) return;

  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO stakingProducts
      (asset, name, apr, lockDays, minAmount, maxAmount, isActive, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `);

  stmt.run("USDT", "Flexible", 5, 0, 10, 100000, now);
  stmt.run("USDT", "30 Days", 8, 30, 10, 100000, now);
  stmt.run("USDT", "90 Days", 12, 90, 10, 100000, now);
}

export function getActiveStakingProducts() {
  return db.prepare("SELECT * FROM stakingProducts WHERE isActive=1").all();
}
