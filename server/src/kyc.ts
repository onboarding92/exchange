import { db } from "./db";
import crypto from "crypto";

function secureKey(original: string) {
  return crypto
    .createHash("sha256")
    .update(original + Date.now().toString())
    .digest("hex");
}

export function submitKycDocuments(userId: number, docs: any[]) {
  const now = new Date().toISOString();

  for (const d of docs) {
    db.prepare(
      `INSERT INTO userKycDocuments (userId, frontUrl, status, createdAt)
       VALUES (?, ?, 'pending', ?)`
    ).run(userId, secureKey(d.fileKey), now);
  }

  db.prepare("UPDATE users SET kycStatus='pending' WHERE id=?").run(userId);
}

export function getUserKyc(userId: number) {
  const user = db.prepare("SELECT kycStatus FROM users WHERE id=?").get(userId);
  const docs = db.prepare("SELECT * FROM userKycDocuments WHERE userId=?").all(userId);
  return { status: user.kycStatus, documents: docs };
}

export function reviewKycForUser(userId: number, status: string, note: string | null, adminId: number) {
  const now = new Date().toISOString();

  db.prepare(
    "UPDATE userKycDocuments SET status=?, reviewNote=?, reviewedAt=?, reviewedBy=? WHERE userId=?"
  ).run(status, note, now, adminId, userId);

  db.prepare("UPDATE users SET kycStatus=? WHERE id=?").run(status, userId);
}
