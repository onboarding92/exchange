import { db } from "../db";
import type { StakingPosition } from "../staking";
import { calculateAccruedReward } from "../staking";

/**
 * Assicura l'esistenza della tabella di snapshot delle reward di staking.
 *
 * Questa tabella contiene uno snapshot giornaliero della reward teorica totale
 * per ogni posizione di staking attiva.
 */
function ensureStakingSnapshotsSchema() {
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS stakingRewardSnapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      positionId INTEGER NOT NULL,
      snapshotDate TEXT NOT NULL,      -- formato YYYY-MM-DD
      accruedReward REAL NOT NULL,     -- reward totale teorica alla data dello snapshot
      createdAt TEXT NOT NULL,
      UNIQUE(positionId, snapshotDate),
      FOREIGN KEY(positionId) REFERENCES stakingPositions(id)
    )
  `
  ).run();
}

ensureStakingSnapshotsSchema();

/**
 * Cron job: calcola la reward teorica di tutte le posizioni attive
 * e salva uno snapshot giornaliero per ciascuna.
 *
 * NOTA: questo job NON modifica i wallet dell'utente, ma solo una
 * tabella di analytics / reporting che può essere usata dal frontend
 * o dall'admin panel per mostrare l'andamento delle ricompense.
 */
export function stakingCronJob() {
  const now = new Date();
  const nowIso = now.toISOString();
  const snapshotDate = nowIso.slice(0, 10); // YYYY-MM-DD

  const positions = db
    .prepare(
      `
      SELECT id, userId, productId, asset, amount, apr, lockDays,
             startedAt, closedAt, status
      FROM stakingPositions
      WHERE status = 'active'
    `
    )
    .all() as StakingPosition[];

  if (!positions.length) {
    console.log(`[STAKING CRON] No active positions at ${nowIso}`);
    return;
  }

  const selectSnapshotStmt = db.prepare(
    `
    SELECT accruedReward
    FROM stakingRewardSnapshots
    WHERE positionId = ? AND snapshotDate = ?
  `
  );

  const insertSnapshotStmt = db.prepare(
    `
    INSERT INTO stakingRewardSnapshots (positionId, snapshotDate, accruedReward, createdAt)
    VALUES (?, ?, ?, ?)
  `
  );

  const updateSnapshotStmt = db.prepare(
    `
    UPDATE stakingRewardSnapshots
    SET accruedReward = ?, createdAt = ?
    WHERE positionId = ? AND snapshotDate = ?
  `
  );

  let touched = 0;

  for (const pos of positions) {
    const reward = calculateAccruedReward({
      amount: pos.amount,
      apr: pos.apr,
      startedAt: pos.startedAt,
      closedAt: pos.closedAt,
      status: pos.status,
    });

    if (!Number.isFinite(reward) || reward < 0) {
      continue;
    }

    const existing = selectSnapshotStmt.get(
      pos.id,
      snapshotDate
    ) as { accruedReward: number } | undefined;

    if (!existing) {
      insertSnapshotStmt.run(pos.id, snapshotDate, reward, nowIso);
      touched++;
    } else {
      // aggiorna solo se la reward è cambiata in modo significativo
      if (Math.abs(existing.accruedReward - reward) > 1e-8) {
        updateSnapshotStmt.run(reward, nowIso, pos.id, snapshotDate);
        touched++;
      }
    }
  }

  console.log(
    `[STAKING CRON] Snapshotted rewards for ${touched} / ${positions.length} active positions at ${nowIso}`
  );
}
