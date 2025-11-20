import { db } from "./db";

function ensureDepositColumns() {
  try {
    const cols = db
      .prepare("PRAGMA table_info(deposits)")
      .all() as { name: string }[];

    if (!cols || cols.length === 0) {
      console.warn("[depositsSchema] deposits table not found, skipping column checks.");
      return;
    }

    const names = cols.map((c) => c.name);

    const addIfMissing = (name: string, ddl: string) => {
      if (!names.includes(name)) {
        try {
          db.prepare(`ALTER TABLE deposits ADD COLUMN ${name} ${ddl}`).run();
          console.log(`[depositsSchema] Added column deposits.${name}`);
        } catch (err) {
          console.warn(
            `[depositsSchema] Failed to add column ${name} on deposits:`,
            String(err)
          );
        }
      }
    };

    addIfMissing("provider", "TEXT");
    addIfMissing("providerOrderId", "TEXT");
    addIfMissing("providerTxHash", "TEXT");
    addIfMissing("providerRaw", "TEXT");
  } catch (err) {
    console.warn("[depositsSchema] Error while ensuring columns:", String(err));
  }
}

// Run once on module import
ensureDepositColumns();
