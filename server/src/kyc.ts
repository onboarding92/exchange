import { db } from "./db";

export type KycStatus = "unverified" | "pending" | "verified" | "rejected";

export type KycDocumentRecord = {
  id: number;
  userId: number;
  type: string;
  fileKey: string;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: number | null;
  reviewNote: string | null;
};

// Create KYC documents table if it does not exist
db.prepare(`
  CREATE TABLE IF NOT EXISTS userKycDocuments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    type TEXT NOT NULL,
    fileKey TEXT NOT NULL,
    status TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    reviewedAt TEXT,
    reviewedBy INTEGER,
    reviewNote TEXT,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )
`).run();

/**
 * Submit a new KYC set for a user.
 * Strategy:
 * - Remove existing docs for that user
 * - Insert the new docs as "pending"
 * - Set users.kycStatus = "pending"
 */
export function submitKycDocuments(
  userId: number,
  documents: { type: string; fileKey: string }[]
) {
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    // Remove previous KYC docs so we only keep latest submission
    db.prepare("DELETE FROM userKycDocuments WHERE userId=?").run(userId);

    const stmt = db.prepare(
      `INSERT INTO userKycDocuments (userId,type,fileKey,status,createdAt)
       VALUES (?,?,?,?,?)`
    );

    for (const doc of documents) {
      stmt.run(userId, doc.type, doc.fileKey, "pending", now);
    }

    // Update user KYC status to pending
    db.prepare(
      "UPDATE users SET kycStatus = ?, updatedAt = ? WHERE id = ?"
    ).run("pending", now, userId);
  });

  tx();
}

/**
 * Fetch KYC status and documents for a user.
 */
export function getUserKyc(userId: number): {
  status: KycStatus;
  documents: KycDocumentRecord[];
} {
  const user = db
    .prepare("SELECT kycStatus FROM users WHERE id = ?")
    .get(userId) as { kycStatus?: string } | undefined;

  const docs = db
    .prepare(
      `SELECT id,userId,type,fileKey,status,createdAt,reviewedAt,reviewedBy,reviewNote
       FROM userKycDocuments
       WHERE userId = ?
       ORDER BY createdAt DESC, id DESC`
    )
    .all(userId) as KycDocumentRecord[];

  const status =
    (user?.kycStatus as KycStatus | undefined) ?? ("unverified" as KycStatus);

  return { status, documents: docs };
}
