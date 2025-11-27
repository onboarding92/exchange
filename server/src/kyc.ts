import crypto from "crypto";
import { db } from "./db";

export type KycStatus = "unverified" | "pending" | "verified" | "rejected";
function secureKey(original: string) {

  return crypto.createHash("sha256").update(original + Date.now()).digest("hex");

}


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

export type KycAdminSubmission = {
  userId: number;
  email: string;
  status: KycStatus;
  documents: KycDocumentRecord[];
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
      stmt.run(userId, doc.type, secureKey(doc.fileKey), "pending", now);
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

/**
 * Admin: get all pending KYC submissions (grouped by user).
 */
export function getPendingKycSubmissions(): KycAdminSubmission[] {
  const users = db
    .prepare(
      "SELECT id,email,kycStatus FROM users WHERE kycStatus = 'pending' ORDER BY id ASC"
    )
    .all() as { id: number; email: string; kycStatus: string }[];

  const out: KycAdminSubmission[] = [];

  for (const u of users) {
    const docs = db
      .prepare(
        `SELECT id,userId,type,fileKey,status,createdAt,reviewedAt,reviewedBy,reviewNote
         FROM userKycDocuments
         WHERE userId = ?
         ORDER BY createdAt DESC, id DESC`
      )
      .all(u.id) as KycDocumentRecord[];

    out.push({
      userId: u.id,
      email: u.email,
      status: (u.kycStatus as KycStatus) ?? "pending",
      documents: docs,
    });
  }

  return out;
}

/**
 * Admin: review a user KYC (verify or reject).
 * - Update all docs for that user to the new status
 * - Set review metadata
 * - Update users.kycStatus accordingly
 */
export function reviewKycForUser(
  userId: number,
  newStatus: Exclude<KycStatus, "unverified" | "pending">,
  reviewNote: string | undefined,
  adminId: number
) {
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE userKycDocuments
       SET status = ?, reviewedAt = ?, reviewedBy = ?, reviewNote = ?
       WHERE userId = ?`
    ).run(newStatus, now, adminId, reviewNote ?? null, userId);

    db.prepare(
      "UPDATE users SET kycStatus = ?, updatedAt = ? WHERE id = ?"
    ).run(newStatus, now, userId);
  });

  tx();
}
