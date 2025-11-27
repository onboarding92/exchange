import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./db";
import {
  submitKycDocuments,
  getUserKyc,
  getPendingKycSubmissions,
  reviewKycForUser,
} from "./kyc";

describe("KYC module", () => {
  let demoUserId: number;
  let adminUserId: number;

  function ensureUser(email: string, role: "user" | "admin"): number {
    const existing = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email) as { id?: number } | undefined;

    const now = new Date().toISOString();

    if (!existing || !existing.id) {
      const result = db
        .prepare(
          "INSERT INTO users (email,password,role,kycStatus,createdAt,updatedAt) VALUES (?,?,?,?,?,?)",
        )
        .run(email, null, role, "unverified", now, now);

      const id = Number(result.lastInsertRowid);
      return id;
    }

    return existing.id;
  }

  beforeEach(() => {
    // Make sure demo & admin users exist
    demoUserId = ensureUser("demo@bitchange.money", "user");
    adminUserId = ensureUser("admin@bitchange.money", "admin");

    // Clean previous KYC docs for demo user only
    db.prepare("DELETE FROM userKycDocuments WHERE userId = ?").run(demoUserId);
    // Reset KYC status to unverified for demo user
    db.prepare("UPDATE users SET kycStatus = 'unverified' WHERE id = ?").run(
      demoUserId,
    );
  });

  it("submitKycDocuments sets user KYC status to pending and stores documents", () => {
    submitKycDocuments(demoUserId, [
      { type: "id_front", fileKey: "user/demo/id_front.png" },
      { type: "id_back", fileKey: "user/demo/id_back.png" },
    ]);

    const userRow = db
      .prepare("SELECT kycStatus FROM users WHERE id = ?")
      .get(demoUserId) as { kycStatus: string } | undefined;

    expect(userRow).toBeDefined();
    expect(userRow!.kycStatus).toBe("pending");

    const docs = db
      .prepare(
        "SELECT userId,type,fileKey,status FROM userKycDocuments WHERE userId = ? ORDER BY id ASC",
      )
      .all(demoUserId) as {
      userId: number;
      type: string;
      fileKey: string;
      status: string;
    }[];

    expect(docs.length).toBe(2);
    expect(docs[0].status).toBe("pending");
    expect(docs[1].status).toBe("pending");
  });

  it("getUserKyc returns current status and documents for the user", () => {
    submitKycDocuments(demoUserId, [
      { type: "passport", fileKey: "user/demo/passport.pdf" },
    ]);

    const result = getUserKyc(demoUserId);

    expect(result.status).toBe("pending");
    expect(result.documents.length).toBe(1);
    expect(result.documents[0].type).toBe("passport");
    expect(result.documents[0].status).toBe("pending");
  });

  it("getPendingKycSubmissions returns pending entries for users with pending status", () => {
    // Ensure fresh state for this user
    db.prepare("DELETE FROM userKycDocuments WHERE userId = ?").run(demoUserId);
    db.prepare("UPDATE users SET kycStatus = 'unverified' WHERE id = ?").run(
      demoUserId,
    );

    // Submit new KYC (will set status = pending)
    submitKycDocuments(demoUserId, [
      { type: "id_front", fileKey: "user/demo/id_front.png" },
    ]);

    const pending = getPendingKycSubmissions();

    const entry = pending.find((p) => p.userId === demoUserId);
    expect(entry).toBeDefined();
    expect(entry!.email).toBe("demo@bitchange.money");
    expect(entry!.status).toBe("pending");
    expect(entry!.documents.length).toBeGreaterThanOrEqual(1);
  });

  it("reviewKycForUser with verified updates user and documents status", () => {
    submitKycDocuments(demoUserId, [
      { type: "id_front", fileKey: "user/demo/id_front.png" },
      { type: "id_back", fileKey: "user/demo/id_back.png" },
    ]);

    reviewKycForUser(demoUserId, "verified", "All good", adminUserId);

    const userRow = db
      .prepare("SELECT kycStatus FROM users WHERE id = ?")
      .get(demoUserId) as { kycStatus: string } | undefined;

    expect(userRow).toBeDefined();
    expect(userRow!.kycStatus).toBe("verified");

    const docs = db
      .prepare(
        "SELECT status,reviewedAt,reviewedBy,reviewNote FROM userKycDocuments WHERE userId = ?",
      )
      .all(demoUserId) as {
      status: string;
      reviewedAt: string | null;
      reviewedBy: number | null;
      reviewNote: string | null;
    }[];

    expect(docs.length).toBe(2);
    for (const d of docs) {
      expect(d.status).toBe("verified");
      expect(d.reviewedAt).not.toBeNull();
      expect(d.reviewedBy).toBe(adminUserId);
      expect(d.reviewNote).toBe("All good");
    }
  });

  it("reviewKycForUser with rejected updates user and documents status", () => {
    submitKycDocuments(demoUserId, [
      { type: "selfie", fileKey: "user/demo/selfie.png" },
    ]);

    reviewKycForUser(demoUserId, "rejected", "Blurry document", adminUserId);

    const userRow = db
      .prepare("SELECT kycStatus FROM users WHERE id = ?")
      .get(demoUserId) as { kycStatus: string } | undefined;

    expect(userRow).toBeDefined();
    expect(userRow!.kycStatus).toBe("rejected");

    const docs = db
      .prepare(
        "SELECT status,reviewedAt,reviewedBy,reviewNote FROM userKycDocuments WHERE userId = ?",
      )
      .all(demoUserId) as {
      status: string;
      reviewedAt: string | null;
      reviewedBy: number | null;
      reviewNote: string | null;
    }[];

    expect(docs.length).toBe(1);
    expect(docs[0].status).toBe("rejected");
    expect(docs[0].reviewedAt).not.toBeNull();
    expect(docs[0].reviewedBy).toBe(adminUserId);
    expect(docs[0].reviewNote).toBe("Blurry document");
  });
});
