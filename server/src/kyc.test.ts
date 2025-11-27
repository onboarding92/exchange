import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./db";
import { submitKycDocuments, getUserKyc, getPendingKycSubmissions, reviewKycForUser } from "./kyc";

describe("KYC module", () => {
  let demo: any;
  let admin: any;

  beforeEach(() => {
    demo = db.prepare("SELECT * FROM users WHERE email='demo@bitchange.money'").get();
    admin = db.prepare("SELECT * FROM users WHERE email='admin@bitchange.money'").get();

    db.prepare("DELETE FROM userKycDocuments WHERE userId=?").run(demo.id);
    db.prepare("UPDATE users SET kycStatus='unverified' WHERE id=?").run(demo.id);
  });

  it("submit sets status pending", () => {
    submitKycDocuments(demo.id, [{ type: "front", fileKey: "A" }]);
    const u = getUserKyc(demo.id);
    expect(u.status).toBe("pending");
  });

  it("review verified", () => {
    submitKycDocuments(demo.id, [{ type: "front", fileKey: "A" }]);
    reviewKycForUser(demo.id, "verified", null, admin.id);
    const u = getUserKyc(demo.id);
    expect(u.status).toBe("verified");
  });
});
