/**
 * Simple DB backup script for exchange.db
 *
 * Usage:
 *   node scripts/backup_db.js
 *
 * It will copy exchange.db to backups/exchange-YYYYMMDD-HHMMSS.db
 */

import fs from "fs";
import path from "path";

const ROOT = new URL("..", import.meta.url).pathname;
const DB_PATH = path.join(ROOT, "exchange.db");
const BACKUP_DIR = path.join(ROOT, "backups");

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error("[backup_db] exchange.db not found at", DB_PATH);
    process.exit(1);
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const now = new Date();
  const ts = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\..+/, "")
    .replace("T", "-"); // 20250101-120000

  const target = path.join(BACKUP_DIR, `exchange-${ts}.db`);

  fs.copyFileSync(DB_PATH, target);
  console.log(`[backup_db] Backup created: ${target}`);
}

main().catch((err) => {
  console.error("[backup_db] Error:", err);
  process.exit(1);
});
