import { db } from "./db";

export type PromoCodeRow = {
  id: number;
  code: string;
  description: string | null;
  rewardAsset: string;
  rewardAmount: number;
  maxUses: number | null;
  perUserLimit: number;
  usedCount: number;
  validFrom: string | null;
  validTo: string | null;
  isActive: number;
};

export type PromoRedemptionRow = {
  id: number;
  promoId: number;
  userId: number;
  usedAt: string;
  rewardAmount: number;
};

function ensurePromoSchema() {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS promoCodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      description TEXT,
      rewardAsset TEXT NOT NULL,
      rewardAmount REAL NOT NULL,
      maxUses INTEGER,
      perUserLimit INTEGER NOT NULL DEFAULT 1,
      usedCount INTEGER NOT NULL DEFAULT 0,
      validFrom TEXT,
      validTo TEXT,
      isActive INTEGER NOT NULL DEFAULT 1
    )`
  ).run();

  db.prepare(
    `CREATE TABLE IF NOT EXISTS promoRedemptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      promoId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      usedAt TEXT NOT NULL,
      rewardAmount REAL NOT NULL,
      FOREIGN KEY(promoId) REFERENCES promoCodes(id),
      FOREIGN KEY(userId) REFERENCES users(id)
    )`
  ).run();
}

ensurePromoSchema();

export function findPromoByCode(code: string): PromoCodeRow | undefined {
  const row = db
    .prepare(
      `SELECT id, code, description, rewardAsset, rewardAmount,
              maxUses, perUserLimit, usedCount, validFrom, validTo, isActive
       FROM promoCodes
       WHERE code = ?`
    )
    .get(code.toUpperCase()) as PromoCodeRow | undefined;
  return row;
}

export function countUserRedemptions(promoId: number, userId: number): number {
  const row = db
    .prepare(
      "SELECT COUNT(*) as c FROM promoRedemptions WHERE promoId = ? AND userId = ?"
    )
    .get(promoId, userId) as { c: number };
  return row?.c ?? 0;
}

export function listPromosAdmin(limit = 200): PromoCodeRow[] {
  const rows = db
    .prepare(
      `SELECT id, code, description, rewardAsset, rewardAmount,
              maxUses, perUserLimit, usedCount, validFrom, validTo, isActive
       FROM promoCodes
       ORDER BY id DESC
       LIMIT ?`
    )
    .all(limit) as PromoCodeRow[];
  return rows;
}

export function listUserRedemptions(userId: number): (PromoRedemptionRow & { code: string })[] {
  const rows = db
    .prepare(
      `SELECT r.id, r.promoId, r.userId, r.usedAt, r.rewardAmount,
              p.code AS code
       FROM promoRedemptions r
       JOIN promoCodes p ON p.id = r.promoId
       WHERE r.userId = ?
       ORDER BY r.usedAt DESC
       LIMIT 200`
    )
    .all(userId) as any[];
  return rows;
}
