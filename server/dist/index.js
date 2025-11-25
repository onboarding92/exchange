// src/index.ts
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// src/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, user: ctx.user } });
});
var adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// src/routers.auth.ts
import { z as z2 } from "zod";

// src/db.ts
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
var db = new Database(process.env.DB_FILE || "exchange.db");
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  kycStatus TEXT NOT NULL DEFAULT 'unverified',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  asset TEXT NOT NULL,
  balance REAL NOT NULL DEFAULT 0,
  UNIQUE(userId, asset)
);
CREATE TABLE IF NOT EXISTS prices (
  asset TEXT PRIMARY KEY,
  price REAL NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS deposits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  asset TEXT NOT NULL,
  amount REAL NOT NULL,
  gateway TEXT NOT NULL,
  status TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  asset TEXT NOT NULL,
  amount REAL NOT NULL,
  address TEXT NOT NULL,
  status TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  reviewedBy INTEGER,
  reviewedAt TEXT
);
CREATE TABLE IF NOT EXISTS trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  pair TEXT NOT NULL,
  side TEXT NOT NULL,
  price REAL NOT NULL,
  qty REAL NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS promoCodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  rewardType TEXT NOT NULL,
  rewardValue REAL NOT NULL,
  maxRedemptions INTEGER NOT NULL DEFAULT 1,
  expiresAt TEXT,
  createdBy INTEGER,
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS promoRedemptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  promoCodeId INTEGER NOT NULL,
  redeemedAt TEXT NOT NULL,
  bonusAmount REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS stakingPlans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset TEXT NOT NULL,
  apr REAL NOT NULL,
  lockDays INTEGER NOT NULL,
  minAmount REAL NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS userStakes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  planId INTEGER NOT NULL,
  amount REAL NOT NULL,
  startedAt TEXT NOT NULL,
  endsAt TEXT NOT NULL,
  closedAt TEXT,
  reward REAL
);
CREATE TABLE IF NOT EXISTS internalTransfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fromUserId INTEGER NOT NULL,
  toUserId INTEGER NOT NULL,
  asset TEXT NOT NULL,
  amount REAL NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  meta TEXT,
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS coins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  minWithdraw REAL NOT NULL DEFAULT 0,
  withdrawFee REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS emailOutbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  toEmail TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  sentAt TEXT
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  userId INTEGER NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
`);
function seedIfEmpty() {
  const row = db.prepare("SELECT COUNT(*) as c FROM users").get();
  if (row.c > 0) return;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const demoHash = bcrypt.hashSync("demo123", 10);
  const adminHash = bcrypt.hashSync("admin1234!!", 10);
  const insertUser = db.prepare(
    "INSERT INTO users (email,password,role,kycStatus,createdAt,updatedAt) VALUES (?,?,?,?,?,?)"
  );
  insertUser.run("demo@bitchange.money", demoHash, "user", "verified", now, now);
  insertUser.run("admin@bitchange.money", adminHash, "admin", "verified", now, now);
  const coins = [
    ["BTC", "Bitcoin"],
    ["ETH", "Ethereum"],
    ["USDT", "Tether"],
    ["BNB", "BNB"],
    ["SOL", "Solana"],
    ["XRP", "XRP"],
    ["DOGE", "Dogecoin"],
    ["ADA", "Cardano"],
    ["DOT", "Polkadot"],
    ["MATIC", "Polygon"],
    ["AVAX", "Avalanche"],
    ["LTC", "Litecoin"],
    ["TRX", "TRON"],
    ["TON", "Toncoin"],
    ["LINK", "Chainlink"]
  ];
  const insertCoin = db.prepare(
    "INSERT OR IGNORE INTO coins (asset,name,enabled,minWithdraw,withdrawFee) VALUES (?,?,?,?,?)"
  );
  const upsertPrice = db.prepare(
    "INSERT OR REPLACE INTO prices (asset,price,updatedAt) VALUES (?,?,?)"
  );
  const upsertWallet = db.prepare(
    "INSERT OR IGNORE INTO wallets (userId,asset,balance) VALUES (?,?,?)"
  );
  const demoId = db.prepare("SELECT id FROM users WHERE email=?").get("demo@bitchange.money").id;
  for (const [asset, name] of coins) {
    insertCoin.run(asset, name, 1, 5, 0.1);
    upsertPrice.run(asset, Math.random() * 5e4 + 10, now);
    upsertWallet.run(demoId, asset, asset === "USDT" ? 2e3 : 0.5);
  }
}

// src/routers.auth.ts
import bcrypt2 from "bcryptjs";

// src/session.ts
import crypto from "crypto";
function createSession(userId, email, role) {
  const token = crypto.randomBytes(24).toString("hex");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  db.prepare("INSERT INTO sessions (token,userId,email,role,createdAt) VALUES (?,?,?,?,?)").run(token, userId, email, role, now);
  return token;
}
function getSession(token) {
  if (!token) return null;
  const row = db.prepare("SELECT userId as id, email, role FROM sessions WHERE token=?").get(token);
  if (!row) return null;
  return row;
}
function destroySession(token) {
  if (!token) return;
  db.prepare("DELETE FROM sessions WHERE token=?").run(token);
}

// src/routers.auth.ts
import { TRPCError as TRPCError2 } from "@trpc/server";
import { authenticator } from "otplib";

// src/twoFactor.ts
db.prepare(`
  CREATE TABLE IF NOT EXISTS userTwoFactor (
    userId INTEGER PRIMARY KEY,
    secret TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )
`).run();
function getTwoFactor(userId) {
  return db.prepare("SELECT * FROM userTwoFactor WHERE userId=?").get(userId);
}
function upsertTwoFactor(userId, secret, enabled) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const existing = getTwoFactor(userId);
  if (existing) {
    db.prepare(
      "UPDATE userTwoFactor SET secret=?, enabled=?, updatedAt=? WHERE userId=?"
    ).run(secret, enabled ? 1 : 0, now, userId);
  } else {
    db.prepare(
      `INSERT INTO userTwoFactor (userId,secret,enabled,createdAt,updatedAt)
       VALUES (?,?,?,?,?)`
    ).run(userId, secret, enabled ? 1 : 0, now, now);
  }
}
function setTwoFactorEnabled(userId, enabled) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  db.prepare(
    "UPDATE userTwoFactor SET enabled=?, updatedAt=? WHERE userId=?"
  ).run(enabled ? 1 : 0, now, userId);
}
function disableTwoFactor(userId) {
  db.prepare("DELETE FROM userTwoFactor WHERE userId=?").run(userId);
}

// src/loginEvents.ts
db.prepare(`
  CREATE TABLE IF NOT EXISTS userLoginEvents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    ip TEXT NOT NULL,
    userAgent TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    isSuspicious INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )
`).run();
function detectSuspicious(userId, ip) {
  const last = db.prepare(
    "SELECT ip FROM userLoginEvents WHERE userId=? ORDER BY createdAt DESC LIMIT 1"
  ).get(userId);
  if (!last) return false;
  if (!last.ip) return false;
  return last.ip !== ip;
}
function recordLoginEvent(userId, ip, userAgent) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const suspicious = detectSuspicious(userId, ip) ? 1 : 0;
  db.prepare(
    `INSERT INTO userLoginEvents (userId, ip, userAgent, createdAt, isSuspicious)
     VALUES (?,?,?,?,?)`
  ).run(userId, ip, userAgent, now, suspicious);
}
function getRecentLogins(userId, limit = 20) {
  return db.prepare(
    `SELECT id,userId,ip,userAgent,createdAt,isSuspicious
       FROM userLoginEvents
       WHERE userId=?
       ORDER BY createdAt DESC
       LIMIT ?`
  ).all(userId, limit);
}

// src/kyc.ts
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
function submitKycDocuments(userId, documents) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM userKycDocuments WHERE userId=?").run(userId);
    const stmt = db.prepare(
      `INSERT INTO userKycDocuments (userId,type,fileKey,status,createdAt)
       VALUES (?,?,?,?,?)`
    );
    for (const doc of documents) {
      stmt.run(userId, doc.type, doc.fileKey, "pending", now);
    }
    db.prepare(
      "UPDATE users SET kycStatus = ?, updatedAt = ? WHERE id = ?"
    ).run("pending", now, userId);
  });
  tx();
}
function getUserKyc(userId) {
  const user = db.prepare("SELECT kycStatus FROM users WHERE id = ?").get(userId);
  const docs = db.prepare(
    `SELECT id,userId,type,fileKey,status,createdAt,reviewedAt,reviewedBy,reviewNote
       FROM userKycDocuments
       WHERE userId = ?
       ORDER BY createdAt DESC, id DESC`
  ).all(userId);
  const status = user?.kycStatus ?? "unverified";
  return { status, documents: docs };
}
function getPendingKycSubmissions() {
  const users = db.prepare(
    "SELECT id,email,kycStatus FROM users WHERE kycStatus = 'pending' ORDER BY id ASC"
  ).all();
  const out = [];
  for (const u of users) {
    const docs = db.prepare(
      `SELECT id,userId,type,fileKey,status,createdAt,reviewedAt,reviewedBy,reviewNote
         FROM userKycDocuments
         WHERE userId = ?
         ORDER BY createdAt DESC, id DESC`
    ).all(u.id);
    out.push({
      userId: u.id,
      email: u.email,
      status: u.kycStatus ?? "pending",
      documents: docs
    });
  }
  return out;
}
function reviewKycForUser(userId, newStatus, reviewNote, adminId) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
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

// src/email.ts
import nodemailer from "nodemailer";

// src/config.ts
import { z } from "zod";
var envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().transform((v) => parseInt(v, 10)).pipe(z.number().int().positive()).default("4000"),
  DB_PATH: z.string().default("./data/exchange.db"),
  JWT_SECRET: z.string().min(16).optional(),
  // kept optional for now to avoid breaking existing setups
  JWT_EXPIRES_IN: z.string().default("7d"),
  CLIENT_URL: z.string().optional(),
  RATE_LIMIT_LOGIN_MAX: z.string().transform((v) => parseInt(v, 10)).pipe(z.number().int().positive()).optional(),
  RATE_LIMIT_LOGIN_WINDOW_MS: z.string().transform((v) => parseInt(v, 10)).pipe(z.number().int().positive()).optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform((v) => parseInt(v, 10)).pipe(z.number().int().positive()).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  SMTP_SECURE: z.string().transform((v) => v === "true").optional(),
  // Payment API placeholders
  MOONPAY_API_KEY: z.string().optional(),
  MOONPAY_API_SECRET: z.string().optional(),
  TRANSAK_API_KEY: z.string().optional(),
  MERCURYO_API_KEY: z.string().optional(),
  BANXA_API_KEY: z.string().optional(),
  COINGATE_API_KEY: z.string().optional(),
  CHANGELLY_API_KEY: z.string().optional(),
  LOG_LEVEL: z.string().optional()
});
var parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.warn(
    "[config] Environment variables validation failed (non-fatal for now):",
    parsed.error.flatten()
  );
}
var config = parsed.success ? parsed.data : {};

// src/email.ts
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
var cachedTransporter = null;
function getTransporter() {
  const host = config.SMTP_HOST || process.env.SMTP_HOST;
  const port2 = config.SMTP_PORT ?? (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : void 0);
  const user = config.SMTP_USER || process.env.SMTP_USER;
  const pass = config.SMTP_PASS || process.env.SMTP_PASS;
  const secure = typeof config.SMTP_SECURE === "boolean" ? config.SMTP_SECURE : process.env.SMTP_SECURE === "true";
  if (!host || !port2 || !user || !pass) {
    console.warn(
      "[email] SMTP not configured (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS missing). Emails will not be sent."
    );
    return null;
  }
  if (cachedTransporter) {
    return cachedTransporter;
  }
  cachedTransporter = nodemailer.createTransport({
    host,
    port: port2,
    secure: secure ?? false,
    auth: {
      user,
      pass
    }
  });
  return cachedTransporter;
}
async function sendEmail(params) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(
      "[email] Email sending skipped (no SMTP config). Intended email:",
      {
        to: params.to,
        subject: params.subject
      }
    );
    return;
  }
  const from = config.SMTP_FROM || process.env.SMTP_FROM || "BitChange <no-reply@bitchange.money>";
  try {
    await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html ?? params.text
    });
  } catch (err) {
    console.error("[email] Failed to send email:", err);
  }
}
async function sendWelcomeEmail(to) {
  const subject = "Welcome to BitChange";
  const text = `Welcome to BitChange!

Your account has been created successfully.

If you did not create this account, please contact support immediately.

BitChange Team`;
  const html = `
    <h2>Welcome to BitChange \u{1F44B}</h2>
    <p>Your account has been created successfully.</p>
    <p>If you did not create this account, please contact support immediately.</p>
    <p>Best regards,<br/>BitChange Team</p>
  `;
  return sendEmail({
    to,
    subject,
    text,
    html
  });
}
async function sendSupportReplyEmail(params) {
  const subject = `Support reply (Ticket #${params.ticketId})`;
  const text = `Hello,

We have replied to your support ticket #${params.ticketId}:

${params.message}

If you did not open this request or need further help, please reply to this email.

BitChange Support Team`;
  const html = `
    <h2>Support reply</h2>
    <p>We have replied to your support ticket <strong>#${escapeHtml(
    String(params.ticketId)
  )}</strong>:</p>
    <p>${escapeHtml(params.message)}</p>
    <p>If you did not open this request or need further help, please reply to this email.</p>
    <p>Best regards,<br/>BitChange Support Team</p>
  `;
  return sendEmail({
    to: params.to,
    subject,
    text,
    html
  });
}
async function sendLoginAlertEmail(params) {
  const subject = "New login to your BitChange account";
  const text = `Hello,

A new login to your BitChange account was detected.

IP address: ${params.ip}
Device / Browser: ${params.userAgent}
Time: ${params.createdAt}

If this was you, you can ignore this message.
If you do not recognize this login, please change your password immediately and contact support.

BitChange Security Team`;
  const html = `
    <h2>New login detected</h2>
    <p>A new login to your <strong>BitChange</strong> account was detected.</p>
    <ul>
      <li><strong>IP address:</strong> ${escapeHtml(params.ip)}</li>
      <li><strong>Device / Browser:</strong> ${escapeHtml(
    params.userAgent
  )}</li>
      <li><strong>Time:</strong> ${escapeHtml(params.createdAt)}</li>
    </ul>
    <p>If this was you, you can ignore this message.</p>
    <p>If you do not recognize this login, please change your password immediately and contact support.</p>
    <p>Best regards,<br/>BitChange Security Team</p>
  `;
  return sendEmail({
    to: params.to,
    subject,
    text,
    html
  });
}
async function sendWithdrawalRequestEmail(params) {
  const subject = "Withdrawal request received";
  const text = `Hello,

We have received your withdrawal request:

Asset: ${params.asset}
Amount: ${params.amount}
Destination address: ${params.address}

We will process this request according to our standard verification and security checks.

If you did not initiate this withdrawal, please contact support immediately.

BitChange Security Team`;
  const html = `
    <h2>Withdrawal request received</h2>
    <p>We have received a new withdrawal request from your <strong>BitChange</strong> account:</p>
    <ul>
      <li><strong>Asset:</strong> ${escapeHtml(params.asset)}</li>
      <li><strong>Amount:</strong> ${escapeHtml(String(params.amount))}</li>
      <li><strong>Destination address:</strong> ${escapeHtml(
    params.address
  )}</li>
    </ul>
    <p>We will process this request according to our standard verification and security checks.</p>
    <p>If you did not initiate this withdrawal, please change your password immediately and contact support.</p>
    <p>Best regards,<br/>BitChange Security Team</p>
  `;
  return sendEmail({
    to: params.to,
    subject,
    text,
    html
  });
}
async function sendWithdrawalStatusEmail(params) {
  const subject = `Withdrawal ${params.status}`;
  const baseText = `Hello,

Your withdrawal request has been ${params.status}.

Asset: ${params.asset}
Amount: ${params.amount}
${params.txId ? `Transaction ID: ${params.txId}
` : ""}${params.reason ? `Reason: ${params.reason}
` : ""}

If you do not recognize this action, please contact support immediately.

BitChange Security Team`;
  const html = `
    <h2>Withdrawal ${escapeHtml(params.status)}</h2>
    <p>Your withdrawal request has been <strong>${escapeHtml(
    params.status
  )}</strong>.</p>
    <ul>
      <li><strong>Asset:</strong> ${escapeHtml(params.asset)}</li>
      <li><strong>Amount:</strong> ${escapeHtml(String(params.amount))}</li>
      ${params.txId ? `<li><strong>Transaction ID:</strong> ${escapeHtml(params.txId)}</li>` : ""}
      ${params.reason ? `<li><strong>Reason:</strong> ${escapeHtml(params.reason)}</li>` : ""}
    </ul>
    <p>If you do not recognize this action, please contact support immediately.</p>
    <p>Best regards,<br/>BitChange Security Team</p>
  `;
  return sendEmail({
    to: params.to,
    subject,
    text: baseText,
    html
  });
}
async function sendKycStatusEmail(params) {
  const subject = params.status === "approved" ? "KYC approved" : "KYC review completed";
  const textApproved = `Hello,

Your KYC verification has been approved.

You can now access all features that require verified status.

BitChange Compliance Team`;
  const textRejected = `Hello,

Your KYC verification has been reviewed and was not approved.

Reason: ${params.reason || "no specific reason provided"}

You may update your documents and try again, or contact support for more information.

BitChange Compliance Team`;
  const htmlApproved = `
    <h2>KYC approved \u2705</h2>
    <p>Your KYC verification has been approved.</p>
    <p>You can now access all features that require verified status.</p>
    <p>Best regards,<br/>BitChange Compliance Team</p>
  `;
  const htmlRejected = `
    <h2>KYC review completed</h2>
    <p>Your KYC verification has been reviewed and was <strong>not approved</strong>.</p>
    <p><strong>Reason:</strong> ${escapeHtml(
    params.reason || "no specific reason provided"
  )}</p>
    <p>You may update your documents and try again, or contact support for more information.</p>
    <p>Best regards,<br/>BitChange Compliance Team</p>
  `;
  const isApproved = params.status === "approved";
  return sendEmail({
    to: params.to,
    subject,
    text: isApproved ? textApproved : textRejected,
    html: isApproved ? htmlApproved : htmlRejected
  });
}

// src/logger.ts
db.prepare(`
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    contextJson TEXT,
    createdAt TEXT NOT NULL
  )
`).run();
function writeLog(level, message, context) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const ctx = context ? JSON.stringify(context) : null;
  db.prepare(
    `INSERT INTO logs (level, message, contextJson, createdAt)
     VALUES (?,?,?,?)`
  ).run(level, message, ctx, now);
}
function logInfo(message, context) {
  writeLog("info", message, context);
}
function logWarn(message, context) {
  writeLog("warn", message, context);
}
function logError(message, context) {
  writeLog("error", message, context);
}
function logSecurity(message, context) {
  writeLog("security", message, context);
}
function getRecentLogs(options) {
  const level = options?.level;
  const search = options?.search?.trim();
  const limit = options?.limit ?? 100;
  const where = [];
  const params = [];
  if (level) {
    where.push("level = ?");
    params.push(level);
  }
  if (search && search.length > 0) {
    where.push("(message LIKE ? OR contextJson LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like);
  }
  let sql = `
    SELECT id, level, message, contextJson, createdAt
    FROM logs
  `;
  if (where.length > 0) {
    sql += " WHERE " + where.join(" AND ");
  }
  sql += " ORDER BY createdAt DESC LIMIT ?";
  params.push(limit);
  return db.prepare(sql).all(...params);
}

// src/activity.ts
function ensureActivitySchema() {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS activityLog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      metadataJson TEXT,
      ip TEXT,
      userAgent TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id)
    )`
  ).run();
}
ensureActivitySchema();
function logActivity(params) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const { userId, type, category, description, metadata, ip, userAgent } = params;
  let metadataJson = null;
  if (metadata) {
    try {
      metadataJson = JSON.stringify(metadata);
    } catch {
      metadataJson = null;
    }
  }
  db.prepare(
    `INSERT INTO activityLog
      (userId, type, category, description, metadataJson, ip, userAgent, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    userId ?? null,
    type,
    category,
    description,
    metadataJson,
    ip ?? null,
    userAgent ?? null,
    now
  );
}

// src/routers.auth.ts
var loginFailures = /* @__PURE__ */ new Map();
var registerAttempts = /* @__PURE__ */ new Map();
function getClientIp(ctx) {
  const xf = ctx.req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length > 0) {
    return xf.split(",")[0].trim();
  }
  const ip = ctx.req.socket?.remoteAddress;
  return typeof ip === "string" ? ip : "unknown";
}
function registerAttempt(map, key, limit, windowMs) {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry) {
    map.set(key, { count: 1, firstAttempt: now });
    return;
  }
  if (now - entry.firstAttempt > windowMs) {
    map.set(key, { count: 1, firstAttempt: now });
    return;
  }
  entry.count += 1;
  if (entry.count > limit) {
    logWarn("Rate limit exceeded", { key, limit, windowMs });
    throw new TRPCError2({
      code: "TOO_MANY_REQUESTS",
      message: "Too many attempts. Please try again later."
    });
  }
}
function clearAttempts(map, key) {
  if (map.has(key)) {
    map.delete(key);
  }
}
var authRouter = router({
  // === REGISTER ===
  register: publicProcedure.input(
    z2.object({
      email: z2.string().email(),
      password: z2.string().min(6)
    })
  ).mutation(async ({ input, ctx }) => {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const ip = getClientIp(ctx);
    const key = `${ip}:${input.email.toLowerCase()}`;
    registerAttempt(registerAttempts, key, 5, 15 * 60 * 1e3);
    const hash = await bcrypt2.hash(input.password, 10);
    try {
      const res = db.prepare(
        "INSERT INTO users (email,password,role,kycStatus,createdAt,updatedAt) VALUES (?,?,?,?,?,?)"
      ).run(input.email, hash, "user", "unverified", now, now);
      await sendWelcomeEmail(input.email);
      logInfo("User registered", { userId: res.lastInsertRowid, email: input.email, ip });
      return { id: res.lastInsertRowid };
    } catch (err) {
      logWarn("Registration failed", { email: input.email, ip, error: String(err) });
      throw new TRPCError2({
        code: "BAD_REQUEST",
        message: "Unable to create account. Please try a different email."
      });
    }
  }),
  // === LOGIN ===
  login: publicProcedure.input(
    z2.object({
      email: z2.string().email(),
      password: z2.string().min(1),
      twoFactorCode: z2.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const ip = getClientIp(ctx);
    const key = `${ip}:${input.email.toLowerCase()}`;
    const userAgent = typeof ctx.req.headers["user-agent"] === "string" ? ctx.req.headers["user-agent"] : "unknown";
    const row = db.prepare("SELECT id,email,password,role FROM users WHERE email=?").get(input.email);
    if (!row || !row.password) {
      registerAttempt(loginFailures, key, 5, 10 * 60 * 1e3);
      logWarn("Login failed: unknown email or missing password", {
        email: input.email,
        ip
      });
      throw new TRPCError2({
        code: "UNAUTHORIZED",
        message: "Invalid credentials"
      });
    }
    const ok = await bcrypt2.compare(input.password, row.password);
    if (!ok) {
      registerAttempt(loginFailures, key, 5, 10 * 60 * 1e3);
      logWarn("Login failed: invalid password", {
        userId: row.id,
        email: row.email,
        ip
      });
      throw new TRPCError2({
        code: "UNAUTHORIZED",
        message: "Invalid credentials"
      });
    }
    const twofa = getTwoFactor(row.id);
    if (twofa && twofa.enabled) {
      if (!input.twoFactorCode) {
        logWarn("Login blocked: 2FA required but not provided", {
          userId: row.id,
          email: row.email,
          ip
        });
        throw new TRPCError2({
          code: "UNAUTHORIZED",
          message: "TWO_FACTOR_REQUIRED"
        });
      }
      const isValid = authenticator.check(input.twoFactorCode, twofa.secret);
      if (!isValid) {
        logWarn("2FA validation failed on login", {
          userId: row.id,
          email: row.email,
          ip
        });
        throw new TRPCError2({
          code: "UNAUTHORIZED",
          message: "Invalid two-factor code"
        });
      }
    }
    clearAttempts(loginFailures, key);
    const token = createSession(row.id, row.email, row.role);
    const loginTimeIso = (/* @__PURE__ */ new Date()).toISOString();
    void sendLoginAlertEmail({
      to: row.email,
      ip,
      userAgent,
      createdAt: loginTimeIso
    });
    try {
      logActivity({
        userId: row.id,
        type: "login",
        category: "security",
        description: "User login",
        metadata: {
          email: row.email,
          ip,
          userAgent
        },
        ip,
        userAgent
      });
    } catch (err) {
      console.error("[activity] Failed to log login activity:", err);
    }
    ctx.res.cookie("session", token, { httpOnly: true, sameSite: "lax" });
    recordLoginEvent(row.id, ip, userAgent);
    logInfo("User login successful", {
      userId: row.id,
      email: row.email,
      ip,
      userAgent
    });
    return { user: { id: row.id, email: row.email, role: row.role } };
  }),
  // === CURRENT USER ===
  me: publicProcedure.query(({ ctx }) => {
    return { user: ctx.user };
  }),
  // === LOGOUT ===
  logout: authedProcedure.mutation(({ ctx }) => {
    const token = ctx.req.cookies?.session;
    if (ctx.user) {
      logInfo("User logout", { userId: ctx.user.id, email: ctx.user.email });
    }
    destroySession(token);
    ctx.res.clearCookie("session");
    return { success: true };
  }),
  // === 2FA SETUP: generate secret + QR URL ===
  init2FASetup: authedProcedure.mutation(({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError2({ code: "UNAUTHORIZED" });
    }
    const existing = getTwoFactor(ctx.user.id);
    if (existing && existing.enabled) {
      throw new TRPCError2({
        code: "BAD_REQUEST",
        message: "Two-factor authentication is already enabled."
      });
    }
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(
      ctx.user.email,
      "BitChange Exchange",
      secret
    );
    upsertTwoFactor(ctx.user.id, secret, false);
    logInfo("2FA setup initiated", { userId: ctx.user.id, email: ctx.user.email });
    return { otpauthUrl, secret };
  }),
  // === 2FA CONFIRM: verify token and enable ===
  confirm2FASetup: authedProcedure.input(
    z2.object({
      token: z2.string().min(6).max(8)
    })
  ).mutation(({ input, ctx }) => {
    if (!ctx.user) {
      throw new TRPCError2({ code: "UNAUTHORIZED" });
    }
    const rec = getTwoFactor(ctx.user.id);
    if (!rec) {
      throw new TRPCError2({
        code: "BAD_REQUEST",
        message: "2FA is not initialized."
      });
    }
    const isValid = authenticator.check(input.token, rec.secret);
    if (!isValid) {
      logWarn("2FA confirm failed", { userId: ctx.user.id, token: input.token });
      throw new TRPCError2({
        code: "UNAUTHORIZED",
        message: "Invalid two-factor code."
      });
    }
    setTwoFactorEnabled(ctx.user.id, true);
    logInfo("2FA enabled", { userId: ctx.user.id, email: ctx.user.email });
    return { success: true };
  }),
  // === 2FA DISABLE: require token to disable ===
  disable2FA: authedProcedure.input(
    z2.object({
      token: z2.string().min(6).max(8)
    })
  ).mutation(({ input, ctx }) => {
    if (!ctx.user) {
      throw new TRPCError2({ code: "UNAUTHORIZED" });
    }
    const rec = getTwoFactor(ctx.user.id);
    if (!rec || !rec.enabled) {
      throw new TRPCError2({
        code: "BAD_REQUEST",
        message: "Two-factor authentication is not enabled."
      });
    }
    const isValid = authenticator.check(input.token, rec.secret);
    if (!isValid) {
      logWarn("2FA disable failed (invalid code)", {
        userId: ctx.user.id,
        token: input.token
      });
      throw new TRPCError2({
        code: "UNAUTHORIZED",
        message: "Invalid two-factor code."
      });
    }
    disableTwoFactor(ctx.user.id);
    logSecurity("2FA disabled", { userId: ctx.user.id, email: ctx.user.email });
    return { success: true };
  }),
  // === LOGIN HISTORY: recent devices / IPs ===
  loginHistory: authedProcedure.query(({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError2({ code: "UNAUTHORIZED" });
    }
    const events = getRecentLogins(ctx.user.id, 20);
    return events;
  }),
  // === KYC STATUS: for current user ===
  kycStatus: authedProcedure.query(({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError2({ code: "UNAUTHORIZED" });
    }
    return getUserKyc(ctx.user.id);
  }),
  // === KYC SUBMIT: upload doc metadata (fileKey) ===
  submitKyc: authedProcedure.input(
    z2.object({
      documents: z2.array(
        z2.object({
          type: z2.string().min(2).max(50),
          fileKey: z2.string().min(1).max(512)
        })
      ).min(1).max(10)
    })
  ).mutation(({ ctx, input }) => {
    if (!ctx.user) {
      throw new TRPCError2({ code: "UNAUTHORIZED" });
    }
    submitKycDocuments(ctx.user.id, input.documents);
    logInfo("KYC submitted", {
      userId: ctx.user.id,
      email: ctx.user.email,
      docCount: input.documents.length
    });
    return { success: true };
  }),
  // === ADMIN: list pending KYC submissions ===
  adminListKycPending: authedProcedure.query(({ ctx }) => {
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "UNAUTHORIZED" });
    }
    return getPendingKycSubmissions();
  }),
  // === ADMIN: review a user KYC ===
  adminReviewKyc: authedProcedure.input(
    z2.object({
      userId: z2.number().int().positive(),
      status: z2.enum(["verified", "rejected"]),
      reviewNote: z2.string().max(1e3).optional()
    })
  ).mutation(({ ctx, input }) => {
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "UNAUTHORIZED" });
    }
    reviewKycForUser(
      input.userId,
      input.status,
      input.reviewNote,
      ctx.user.id
    );
    logSecurity("KYC reviewed", {
      adminId: ctx.user.id,
      userId: input.userId,
      newStatus: input.status,
      reviewNote: input.reviewNote
    });
    return { success: true };
  }),
  // === ADMIN: list logs ===
  adminListLogs: authedProcedure.input(
    z2.object({
      level: z2.enum(["info", "warn", "error", "security"]).optional(),
      search: z2.string().max(200).optional(),
      limit: z2.number().int().positive().max(500).optional()
    }).optional()
  ).query(({ ctx, input }) => {
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "UNAUTHORIZED" });
    }
    const logs = getRecentLogs({
      level: input?.level,
      search: input?.search,
      limit: input?.limit ?? 100
    });
    return logs;
  })
});

// src/routers.wallet.ts
import { z as z3 } from "zod";
import { TRPCError as TRPCError4 } from "@trpc/server";
import { authenticator as authenticator2 } from "otplib";

// src/marketPrices.ts
var ASSET_TO_COINGECKO = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  USDC: "usd-coin",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  SOL: "solana",
  DOGE: "dogecoin",
  TRX: "tron",
  MATIC: "matic-network",
  LTC: "litecoin",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  SHIB: "shiba-inu"
};
var CACHE_TTL_MS = 3e4;
var cache = null;
function nowMs() {
  return Date.now();
}
async function getUsdPrices(assets) {
  const normalized = Array.from(
    new Set(
      assets.map((a) => a.trim().toUpperCase()).filter((a) => a.length > 0)
    )
  );
  if (normalized.length === 0) {
    return {};
  }
  if (cache && nowMs() - cache.timestamp < CACHE_TTL_MS) {
    const out = {};
    for (const a of normalized) {
      if (cache.data[a] != null) {
        out[a] = cache.data[a];
      }
    }
    const allPresent = normalized.every((a) => out[a] != null);
    if (allPresent) {
      return out;
    }
  }
  const ids = /* @__PURE__ */ new Set();
  const assetToId = {};
  for (const a of normalized) {
    const id = ASSET_TO_COINGECKO[a];
    if (id) {
      ids.add(id);
      assetToId[a] = id;
    }
  }
  if (ids.size === 0) {
    return {};
  }
  const idList = Array.from(ids).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
    idList
  )}&vs_currencies=usd`;
  try {
    const res = await globalThis.fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    const fresh = {};
    for (const asset of normalized) {
      const id = assetToId[asset];
      if (!id) continue;
      const v = json[id]?.usd;
      if (typeof v === "number") {
        fresh[asset] = v;
      }
    }
    cache = {
      data: fresh,
      timestamp: nowMs()
    };
    return fresh;
  } catch (err) {
    logError("Failed to fetch prices from CoinGecko", {
      error: String(err),
      url
    });
    if (cache && cache.data) {
      const out = {};
      for (const a of normalized) {
        if (cache.data[a] != null) {
          out[a] = cache.data[a];
        }
      }
      return out;
    }
    return {};
  }
}

// src/rateLimit.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
var WINDOW_MS = 15 * 6e4;
var REGISTER_WINDOW_MS = 30 * 6e4;
var BLOCK_MS = 30 * 6e4;
function extractClientIp(req) {
  try {
    const xfwd = req.headers?.["x-forwarded-for"];
    if (typeof xfwd === "string" && xfwd.length > 0) {
      return xfwd.split(",")[0].trim();
    }
    const ip = req.ip || req._remoteAddress || req.socket?.remoteAddress || req.connection?.remoteAddress;
    return typeof ip === "string" ? ip : "unknown";
  } catch {
    return "unknown";
  }
}

// src/routers.wallet.ts
var assetSchema = z3.string().min(2).max(20).regex(/^[A-Z0-9]+$/, "Asset must be uppercase letters/numbers (e.g. BTC, ETH)");
var walletRouter = router({
  // === MARKET PRICES (public) ===
  marketPrices: publicProcedure.input(
    z3.object({
      assets: z3.array(assetSchema).min(1).max(50)
    })
  ).query(async ({ input }) => {
    const prices = await getUsdPrices(input.assets);
    return prices;
  }),
  // Return all wallets (balances) for current user
  balances: authedProcedure.query(({ ctx }) => {
    const rows = db.prepare(
      "SELECT asset,balance FROM wallets WHERE userId=? ORDER BY asset ASC"
    ).all(ctx.user.id);
    return rows;
  }),
  // Return all deposits for current user
  deposits: authedProcedure.query(({ ctx }) => {
    const rows = db.prepare(
      "SELECT id,asset,amount,gateway,status,createdAt FROM deposits WHERE userId=? ORDER BY createdAt DESC"
    ).all(ctx.user.id);
    return rows;
  }),
  // Return all withdrawals for current user
  withdrawals: authedProcedure.query(({ ctx }) => {
    const rows = db.prepare(
      "SELECT id,asset,amount,address,status,createdAt,reviewedAt FROM withdrawals WHERE userId=? ORDER BY createdAt DESC"
    ).all(ctx.user.id);
    return rows;
  }),
  // Create a deposit request (logical, not real gateway)
  createDeposit: authedProcedure.input(
    z3.object({
      asset: assetSchema,
      amount: z3.number().positive().max(1e9),
      gateway: z3.string().min(2).max(50)
    })
  ).mutation(({ input, ctx }) => {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    db.prepare(
      `INSERT INTO deposits (userId,asset,amount,gateway,status,createdAt)
         VALUES (?,?,?,?,?,?)`
    ).run(
      ctx.user.id,
      input.asset,
      input.amount,
      input.gateway,
      "pending",
      now
    );
    logInfo("Deposit request created", {
      userId: ctx.user.id,
      asset: input.asset,
      amount: input.amount,
      gateway: input.gateway
    });
    return { success: true };
  }),
  // Request a withdrawal (with 2FA enforcement)
  requestWithdrawal: authedProcedure.input(
    z3.object({
      asset: assetSchema,
      amount: z3.number().positive().max(1e9),
      address: z3.string().min(10).max(200),
      twoFactorCode: z3.string().optional()
    })
  ).mutation(({ input, ctx }) => {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const wallet = db.prepare(
      "SELECT balance FROM wallets WHERE userId=? AND asset=?"
    ).get(ctx.user.id, input.asset);
    if (!wallet || wallet.balance <= 0 || wallet.balance < input.amount) {
      logWarn("Withdrawal failed: insufficient balance", {
        userId: ctx.user.id,
        asset: input.asset,
        requestedAmount: input.amount,
        balance: wallet?.balance ?? 0
      });
      throw new TRPCError4({
        code: "BAD_REQUEST",
        message: "Insufficient balance for withdrawal."
      });
    }
    const twofa = getTwoFactor(ctx.user.id);
    if (twofa && twofa.enabled) {
      if (!input.twoFactorCode) {
        logWarn("Withdrawal blocked: 2FA required but not provided", {
          userId: ctx.user.id,
          asset: input.asset,
          amount: input.amount
        });
        throw new TRPCError4({
          code: "UNAUTHORIZED",
          message: "TWO_FACTOR_REQUIRED_WITHDRAWAL"
        });
      }
      const isValid = authenticator2.check(input.twoFactorCode, twofa.secret);
      if (!isValid) {
        logWarn("Withdrawal blocked: invalid 2FA code", {
          userId: ctx.user.id,
          asset: input.asset,
          amount: input.amount
        });
        throw new TRPCError4({
          code: "UNAUTHORIZED",
          message: "Invalid two-factor code for withdrawal."
        });
      }
    }
    db.prepare(
      `INSERT INTO withdrawals (userId,asset,amount,address,status,createdAt)
         VALUES (?,?,?,?,?,?)`
    ).run(
      ctx.user.id,
      input.asset,
      input.amount,
      input.address,
      "pending",
      now
    );
    try {
      const lastWd = db.prepare(
        "SELECT id, asset, amount, address FROM withdrawals WHERE userId=? ORDER BY createdAt DESC LIMIT 1"
      ).get(ctx.user.id);
      const req = ctx.req;
      const ip = extractClientIp(req);
      const userAgent = typeof req?.headers?.["user-agent"] === "string" ? req.headers["user-agent"] : null;
      if (ctx.user?.email && lastWd) {
        void sendWithdrawalRequestEmail({
          to: ctx.user.email,
          asset: lastWd.asset,
          amount: lastWd.amount,
          address: lastWd.address,
          requestId: lastWd.id
        });
      }
      if (lastWd) {
        logActivity({
          userId: ctx.user.id,
          type: "withdrawal_request",
          category: "wallet",
          description: `Withdrawal request ${lastWd.asset} ${lastWd.amount}`,
          metadata: {
            withdrawalId: lastWd.id,
            asset: lastWd.asset,
            amount: lastWd.amount,
            address: lastWd.address
          },
          ip,
          userAgent
        });
      }
    } catch (err) {
      console.error("[activity] Failed to handle withdrawal request activity:", err);
    }
    logSecurity("Withdrawal request created", {
      userId: ctx.user.id,
      asset: input.asset,
      amount: input.amount,
      address: input.address
    });
    return { success: true };
  })
});

// src/routers.market.ts
import { z as z4 } from "zod";

// src/market.ts
var COINGECKO_BASE = "https://api.coingecko.com/api/v3";
var SUPPORTED_ASSETS = [
  { symbol: "BTC", id: "bitcoin", name: "Bitcoin" },
  { symbol: "ETH", id: "ethereum", name: "Ethereum" },
  { symbol: "USDT", id: "tether", name: "Tether" },
  { symbol: "BNB", id: "binancecoin", name: "BNB" },
  { symbol: "ADA", id: "cardano", name: "Cardano" },
  { symbol: "SOL", id: "solana", name: "Solana" },
  { symbol: "XRP", id: "ripple", name: "XRP" },
  { symbol: "DOT", id: "polkadot", name: "Polkadot" },
  { symbol: "DOGE", id: "dogecoin", name: "Dogecoin" },
  { symbol: "AVAX", id: "avalanche-2", name: "Avalanche" },
  { symbol: "SHIB", id: "shiba-inu", name: "Shiba Inu" },
  { symbol: "MATIC", id: "polygon", name: "Polygon" },
  { symbol: "LTC", id: "litecoin", name: "Litecoin" },
  { symbol: "LINK", id: "chainlink", name: "Chainlink" },
  { symbol: "XLM", id: "stellar", name: "Stellar" }
];
function listSupportedAssets() {
  return SUPPORTED_ASSETS;
}
var tickerCache = null;
var historyCache = {};
var TICKER_TTL_MS = 3e4;
var HISTORY_TTL_MS = 6e4;
async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      "Accept": "application/json"
    }
  });
  if (!res.ok) {
    throw new Error(`Market API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
async function getTickers() {
  const now = Date.now();
  if (tickerCache && now - tickerCache.fetchedAt < TICKER_TTL_MS) {
    return tickerCache.data;
  }
  const ids = SUPPORTED_ASSETS.map((a) => a.id).join(",");
  const url = `${COINGECKO_BASE}/simple/price?ids=${encodeURIComponent(
    ids
  )}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;
  const json = await fetchJson(url);
  const tickers = SUPPORTED_ASSETS.map((asset) => {
    const entry = json[asset.id];
    if (!entry) {
      return {
        symbol: asset.symbol,
        name: asset.name,
        priceUsd: 0,
        change24h: null,
        marketCap: null,
        volume24h: null
      };
    }
    return {
      symbol: asset.symbol,
      name: asset.name,
      priceUsd: typeof entry.usd === "number" ? entry.usd : 0,
      change24h: typeof entry.usd_24h_change === "number" ? entry.usd_24h_change : null,
      marketCap: typeof entry.usd_market_cap === "number" ? entry.usd_market_cap : null,
      volume24h: typeof entry.usd_24h_vol === "number" ? entry.usd_24h_vol : null
    };
  });
  tickerCache = { data: tickers, fetchedAt: now };
  return tickers;
}
async function getHistory(symbol) {
  const asset = SUPPORTED_ASSETS.find(
    (a) => a.symbol.toUpperCase() === symbol.toUpperCase()
  );
  if (!asset) {
    throw new Error(`Unsupported asset symbol: ${symbol}`);
  }
  const now = Date.now();
  const cached = historyCache[asset.symbol];
  if (cached && now - cached.fetchedAt < HISTORY_TTL_MS) {
    return cached.data;
  }
  const url = `${COINGECKO_BASE}/coins/${asset.id}/market_chart?vs_currency=usd&days=1&interval=hourly`;
  const json = await fetchJson(url);
  const prices = Array.isArray(json.prices) ? json.prices.map((row) => {
    const ts = Array.isArray(row) ? row[0] : null;
    const price = Array.isArray(row) ? row[1] : null;
    return {
      timestamp: typeof ts === "number" ? ts : Date.now(),
      priceUsd: typeof price === "number" ? price : 0
    };
  }) : [];
  historyCache[asset.symbol] = { data: prices, fetchedAt: now };
  return prices;
}

// src/routers.market.ts
var marketRouter = router({
  // List current prices for all supported assets
  tickers: publicProcedure.query(async () => {
    const data = await getTickers();
    return {
      assets: listSupportedAssets(),
      tickers: data,
      fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }),
  // Get 24h history for one symbol (for charts)
  history: publicProcedure.input(
    z4.object({
      symbol: z4.string().min(2).max(10).regex(/^[A-Z0-9]+$/i, "Invalid symbol")
    })
  ).query(async ({ input }) => {
    const points = await getHistory(input.symbol.toUpperCase());
    return {
      symbol: input.symbol.toUpperCase(),
      points
    };
  })
});

// src/routers.promo.ts
import { z as z5 } from "zod";
var promoRouter = router({
  redeem: authedProcedure.input(z5.object({ code: z5.string().min(3).max(64) })).mutation(({ ctx, input }) => {
    const promo = db.prepare("SELECT * FROM promoCodes WHERE code=?").get(input.code);
    if (!promo) throw new Error("Invalid promo code");
    if (promo.expiresAt && promo.expiresAt < (/* @__PURE__ */ new Date()).toISOString()) {
      throw new Error("Promo code expired");
    }
    const userUsed = db.prepare(
      "SELECT COUNT(*) as c FROM promoRedemptions WHERE promoCodeId=? AND userId=?"
    ).get(promo.id, ctx.user.id);
    if (promo.type === "first_deposit" && userUsed.c > 0) {
      throw new Error("Promo already used");
    }
    const totalUsed = db.prepare(
      "SELECT COUNT(*) as c FROM promoRedemptions WHERE promoCodeId=?"
    ).get(promo.id);
    if (totalUsed.c >= promo.maxRedemptions) {
      throw new Error("Promo fully redeemed");
    }
    const bonusAmount = promo.rewardValue;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    db.prepare("INSERT INTO promoRedemptions (userId,promoCodeId,redeemedAt,bonusAmount) VALUES (?,?,?,?)").run(ctx.user.id, promo.id, now, bonusAmount);
    db.prepare("INSERT OR IGNORE INTO wallets (userId,asset,balance) VALUES (?,?,0)").run(ctx.user.id, "USDT", 0);
    db.prepare("UPDATE wallets SET balance=balance+? WHERE userId=? AND asset=?").run(bonusAmount, ctx.user.id, "USDT");
    if (ctx.user?.email) {
      void sendEmail(ctx.user.email, "Promo code redeemed", `You received a bonus of ${bonusAmount} USDT from promo code ${promo.code}.`);
    }
    return { success: true, bonusAmount };
  }),
  myRedemptions: authedProcedure.query(({ ctx }) => {
    return db.prepare(`
      SELECT pr.id, pc.code, pc.type, pr.bonusAmount, pr.redeemedAt
      FROM promoRedemptions pr
      JOIN promoCodes pc ON pc.id = pr.promoCodeId
      WHERE pr.userId=?
      ORDER BY pr.redeemedAt DESC
    `).all(ctx.user.id);
  }),
  adminList: adminProcedure.query(() => {
    return db.prepare("SELECT * FROM promoCodes ORDER BY createdAt DESC").all();
  }),
  adminCreate: adminProcedure.input(z5.object({
    code: z5.string().min(3).max(64),
    type: z5.enum(["first_deposit", "gift", "random"]),
    rewardType: z5.enum(["fixed", "percent"]),
    rewardValue: z5.number().positive(),
    maxRedemptions: z5.number().int().positive(),
    expiresAt: z5.string().datetime().optional()
  })).mutation(({ ctx, input }) => {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    db.prepare(`
        INSERT INTO promoCodes (code,type,rewardType,rewardValue,maxRedemptions,expiresAt,createdBy,createdAt)
        VALUES (?,?,?,?,?,?,?,?)
      `).run(
      input.code,
      input.type,
      input.rewardType,
      input.rewardValue,
      input.maxRedemptions,
      input.expiresAt ?? null,
      ctx.user.id,
      now
    );
    return { success: true };
  })
});

// src/routers.staking.ts
import { z as z7 } from "zod";

// src/staking.ts
function ensureStakingSchema() {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS stakingProducts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset TEXT NOT NULL,
      name TEXT NOT NULL,
      apr REAL NOT NULL,
      lockDays INTEGER NOT NULL,
      minAmount REAL NOT NULL,
      maxAmount REAL,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL
    )`
  ).run();
  db.prepare(
    `CREATE TABLE IF NOT EXISTS stakingPositions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      asset TEXT NOT NULL,
      amount REAL NOT NULL,
      apr REAL NOT NULL,
      lockDays INTEGER NOT NULL,
      startedAt TEXT NOT NULL,
      closedAt TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(productId) REFERENCES stakingProducts(id)
    )`
  ).run();
}
ensureStakingSchema();
(function seedDemoProducts() {
  const row = db.prepare("SELECT COUNT(*) as c FROM stakingProducts").get();
  if (row.c > 0) return;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const stmt = db.prepare(
    `INSERT INTO stakingProducts
      (asset, name, apr, lockDays, minAmount, maxAmount, isActive, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
  );
  stmt.run("USDT", "Flexible USDT 5% APR", 5, 0, 10, null, now);
  stmt.run("USDT", "USDT 30 days \u2013 8% APR", 8, 30, 50, null, now);
  stmt.run("BTC", "BTC 60 days \u2013 4% APR", 4, 60, 1e-3, null, now);
  stmt.run("ETH", "ETH 30 days \u2013 5% APR", 5, 30, 0.05, null, now);
})();
function listActiveStakingProducts() {
  const rows = db.prepare(
    `SELECT id, asset, name, apr, lockDays, minAmount, maxAmount, isActive, createdAt
       FROM stakingProducts
       WHERE isActive = 1
       ORDER BY apr DESC`
  ).all();
  return rows;
}
function listUserPositions(userId) {
  const rows = db.prepare(
    `SELECT id, userId, productId, asset, amount, apr, lockDays,
              startedAt, closedAt, status
       FROM stakingPositions
       WHERE userId = ?
       ORDER BY startedAt DESC`
  ).all(userId);
  return rows;
}
function calculateAccruedReward(position) {
  const start = new Date(position.startedAt).getTime();
  const end = position.status === "closed" && position.closedAt ? new Date(position.closedAt).getTime() : Date.now();
  if (!start || !end || end <= start) return 0;
  const diffDays = (end - start) / (1e3 * 60 * 60 * 24);
  const yearlyRate = position.apr / 100;
  const dailyRate = yearlyRate / 365;
  const fullDays = Math.floor(diffDays);
  if (!Number.isFinite(fullDays) || fullDays <= 0 || dailyRate <= 0) {
    return 0;
  }
  const principal = position.amount;
  const factor = Math.pow(1 + dailyRate, fullDays);
  const reward = principal * (factor - 1);
  return Number.isFinite(reward) ? reward : 0;
}

// src/routers.staking.ts
import { TRPCError as TRPCError5 } from "@trpc/server";

// src/validation.ts
import { z as z6 } from "zod";
var idSchema = z6.number().int().positive();
var emailSchema = z6.string().trim().min(3).max(255).email();
var passwordSchema = z6.string().min(8, "Password must be at least 8 characters long.").max(128);
var optionalStringSchema = z6.string().trim().max(255).optional().nullable().transform((v) => v === "" ? null : v ?? null);
var assetSymbolSchema = z6.string().trim().min(2).max(16).regex(/^[A-Za-z0-9._-]+$/, "Invalid asset symbol.");
var cryptoAmountSchema = z6.number().positive("Amount must be greater than zero.").max(1e9, "Amount is too large.");
var fiatAmountSchema = z6.number().positive("Amount must be greater than zero.").max(1e8, "Fiat amount is too large.");
var paginationSchema = z6.object({
  limit: z6.number().int().positive().max(200).optional(),
  offset: z6.number().int().min(0).optional()
}).optional();
var isoDateStringSchema = z6.string().refine(
  (value) => {
    if (!value) return false;
    const d = new Date(value);
    return !Number.isNaN(d.getTime());
  },
  {
    message: "Invalid ISO date string."
  }
);
var searchQuerySchema = z6.object({
  q: z6.string().trim().max(200).optional(),
  limit: z6.number().int().positive().max(200).optional(),
  offset: z6.number().int().min(0).optional()
}).optional();

// src/routers.staking.ts
var stakingRouter = router({
  // Public – list active staking products
  listProducts: publicProcedure.query(() => {
    return listActiveStakingProducts();
  }),
  // User – list own positions with computed rewards
  myPositions: authedProcedure.query(({ ctx }) => {
    const user = ctx.user;
    const rows = listUserPositions(user.id);
    return rows.map((p) => {
      const accruedReward = calculateAccruedReward(p);
      const roiPercent = p.amount > 0 ? accruedReward / p.amount * 100 : 0;
      return {
        ...p,
        accruedReward,
        roiPercent
      };
    });
  }),
  // User – stake from wallet
  stake: authedProcedure.input(
    z7.object({
      productId: idSchema,
      amount: cryptoAmountSchema
    })
  ).mutation(({ ctx, input }) => {
    const user = ctx.user;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const req = ctx.req;
    const ip = extractClientIp(req);
    const userAgent = req?.headers?.["user-agent"] ?? null;
    const product = db.prepare(
      `SELECT id, asset, name, apr, lockDays, minAmount, maxAmount, isActive
           FROM stakingProducts
           WHERE id = ?`
    ).get(input.productId);
    if (!product || !product.isActive) {
      throw new TRPCError5({
        code: "BAD_REQUEST",
        message: "Staking product not available."
      });
    }
    if (input.amount < product.minAmount) {
      throw new TRPCError5({
        code: "BAD_REQUEST",
        message: `Minimum amount is ${product.minAmount} ${product.asset}.`
      });
    }
    if (product.maxAmount !== null && input.amount > product.maxAmount) {
      throw new TRPCError5({
        code: "BAD_REQUEST",
        message: `Maximum amount is ${product.maxAmount} ${product.asset}.`
      });
    }
    const walletRow = db.prepare(
      "SELECT balance FROM wallets WHERE userId = ? AND asset = ?"
    ).get(user.id, product.asset);
    const currentBalance = walletRow?.balance ?? 0;
    if (currentBalance < input.amount) {
      throw new TRPCError5({
        code: "BAD_REQUEST",
        message: `Insufficient ${product.asset} balance.`
      });
    }
    try {
      const tx = db.transaction(
        (userId, productId, asset, amount, apr, lockDays, now2) => {
          db.prepare(
            "UPDATE wallets SET balance = balance - ? WHERE userId = ? AND asset = ?"
          ).run(amount, userId, asset);
          const res = db.prepare(
            `INSERT INTO stakingPositions
                  (userId, productId, asset, amount, apr, lockDays, startedAt, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`
          ).run(userId, productId, asset, amount, apr, lockDays, now2);
          const positionId2 = Number(res.lastInsertRowid);
          return positionId2;
        }
      );
      const positionId = tx(
        user.id,
        product.id,
        product.asset,
        input.amount,
        product.apr,
        product.lockDays,
        now
      );
      logSecurity("Staking created", {
        userId: user.id,
        productId: product.id,
        positionId,
        amount: input.amount,
        asset: product.asset
      });
      try {
        logActivity({
          userId: user.id,
          type: "staking_stake",
          category: "staking",
          description: `Staked ${input.amount} ${product.asset} in ${product.name}`,
          metadata: {
            positionId,
            productId: product.id,
            asset: product.asset,
            amount: input.amount,
            apr: product.apr,
            lockDays: product.lockDays
          },
          ip,
          userAgent
        });
      } catch (err) {
        console.error("[activity] Failed to log staking stake activity:", err);
      }
      return { success: true, positionId };
    } catch (err) {
      console.error("[staking] Failed to create staking position:", err);
      throw new TRPCError5({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create staking position. Please try again later."
      });
    }
  }),
  // User – unstake (after lock period)
  unstake: authedProcedure.input(
    z7.object({
      positionId: idSchema
    })
  ).mutation(({ ctx, input }) => {
    const user = ctx.user;
    const now = /* @__PURE__ */ new Date();
    const req = ctx.req;
    const ip = extractClientIp(req);
    const userAgent = req?.headers?.["user-agent"] ?? null;
    const pos = db.prepare(
      `SELECT id, userId, productId, asset, amount, apr, lockDays,
                  startedAt, closedAt, status
           FROM stakingPositions
           WHERE id = ?`
    ).get(input.positionId);
    if (!pos || pos.userId !== user.id) {
      throw new TRPCError5({
        code: "NOT_FOUND",
        message: "Position not found."
      });
    }
    if (pos.status !== "active") {
      throw new TRPCError5({
        code: "BAD_REQUEST",
        message: "This position is already closed."
      });
    }
    const startedAt = new Date(pos.startedAt);
    const diffDays = (now.getTime() - startedAt.getTime()) / (1e3 * 60 * 60 * 24);
    if (diffDays < pos.lockDays) {
      throw new TRPCError5({
        code: "BAD_REQUEST",
        message: `This staking is locked for ${pos.lockDays} days. You can unstake after the lock period.`
      });
    }
    const reward = calculateAccruedReward({
      amount: pos.amount,
      apr: pos.apr,
      startedAt: pos.startedAt,
      closedAt: now.toISOString(),
      status: "closed"
    });
    try {
      const tx = db.transaction(
        (positionId, userId, asset, principal, rewardAmount, closedAtIso2) => {
          db.prepare(
            `UPDATE stakingPositions
               SET status = 'closed', closedAt = ?
               WHERE id = ?`
          ).run(closedAtIso2, positionId);
          const totalReturn = principal + rewardAmount;
          const existing = db.prepare(
            "SELECT balance FROM wallets WHERE userId = ? AND asset = ?"
          ).get(userId, asset);
          if (existing) {
            db.prepare(
              "UPDATE wallets SET balance = balance + ? WHERE userId = ? AND asset = ?"
            ).run(totalReturn, userId, asset);
          } else {
            db.prepare(
              "INSERT INTO wallets (userId, asset, balance) VALUES (?, ?, ?)"
            ).run(userId, asset, totalReturn);
          }
        }
      );
      const closedAtIso = now.toISOString();
      tx(pos.id, user.id, pos.asset, pos.amount, reward, closedAtIso);
      logSecurity("Staking closed", {
        userId: user.id,
        positionId: pos.id,
        asset: pos.asset,
        principal: pos.amount,
        reward
      });
      try {
        logActivity({
          userId: user.id,
          type: "staking_unstake",
          category: "staking",
          description: `Unstaked ${pos.amount} ${pos.asset} (reward: ${reward})`,
          metadata: {
            positionId: pos.id,
            asset: pos.asset,
            principal: pos.amount,
            reward
          },
          ip,
          userAgent
        });
      } catch (err) {
        console.error("[activity] Failed to log staking unstake activity:", err);
      }
      return {
        success: true,
        reward
      };
    } catch (err) {
      console.error("[staking] Failed to close staking position:", err);
      throw new TRPCError5({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to close staking position. Please try again later."
      });
    }
  })
});

// src/routers.transactions.ts
import { z as z8 } from "zod";

// src/transactions.ts
function listTransactionsForUser(userId, limit = 200) {
  const txs = [];
  try {
    const rows = db.prepare(
      `
        SELECT id, asset, amount, gateway, status, createdAt
        FROM deposits
        WHERE userId = ?
        ORDER BY createdAt DESC
        LIMIT ?
      `
    ).all(userId, limit);
    for (const d of rows) {
      txs.push({
        id: `deposit:${d.id}`,
        type: "deposit",
        asset: d.asset,
        amount: d.amount,
        direction: "in",
        status: d.status,
        createdAt: d.createdAt,
        description: d.gateway ? `Deposit via ${d.gateway}` : "Deposit"
      });
    }
  } catch (e) {
    console.warn("[transactions] Skipping deposits in history:", e);
  }
  try {
    const rows = db.prepare(
      `
        SELECT id, asset, amount, address, status, createdAt
        FROM withdrawals
        WHERE userId = ?
        ORDER BY createdAt DESC
        LIMIT ?
      `
    ).all(userId, limit);
    for (const w of rows) {
      txs.push({
        id: `withdrawal:${w.id}`,
        type: "withdrawal",
        asset: w.asset,
        amount: w.amount,
        direction: "out",
        status: w.status,
        createdAt: w.createdAt,
        description: `Withdrawal to ${w.address ?? "external address"}`
      });
    }
  } catch (e) {
    console.warn("[transactions] Skipping withdrawals in history:", e);
  }
  try {
    const rows = db.prepare(
      `
        SELECT id, fromUserId, toUserId, asset, amount, createdAt
        FROM internalTransfers
        WHERE fromUserId = ? OR toUserId = ?
        ORDER BY createdAt DESC
        LIMIT ?
      `
    ).all(userId, userId, limit);
    for (const t2 of rows) {
      const isSender = t2.fromUserId === userId;
      txs.push({
        id: `internal:${t2.id}`,
        type: isSender ? "internal_sent" : "internal_received",
        asset: t2.asset,
        amount: t2.amount,
        direction: isSender ? "out" : "in",
        createdAt: t2.createdAt,
        description: isSender ? `Internal transfer to user #${t2.toUserId}` : `Internal transfer from user #${t2.fromUserId}`
      });
    }
  } catch (e) {
    console.warn(
      "[transactions] Skipping internalTransfers in history:",
      e
    );
  }
  txs.sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return tb - ta;
  });
  return txs.slice(0, limit);
}

// src/routers.transactions.ts
var transactionsRouter = router({
  historyForUser: authedProcedure.input(
    z8.object({
      limit: z8.number().int().positive().max(500).optional()
    }).optional()
  ).query(({ ctx, input }) => {
    const user = ctx.user;
    const limit = input?.limit ?? 200;
    const txs = listTransactionsForUser(user.id, limit);
    return txs;
  })
});

// src/routers.internal.ts
import { z as z9 } from "zod";
import { TRPCError as TRPCError6 } from "@trpc/server";

// src/internalTransfers.ts
function ensureInternalTransfersTable() {
  const rows = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='internalTransfers'"
  ).all();
  if (!rows || rows.length === 0) {
    db.prepare(
      `CREATE TABLE internalTransfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fromUserId INTEGER NOT NULL,
        toUserId INTEGER NOT NULL,
        asset TEXT NOT NULL,
        amount REAL NOT NULL,
        memo TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY(fromUserId) REFERENCES users(id),
        FOREIGN KEY(toUserId) REFERENCES users(id)
      )`
    ).run();
    console.log("[internalTransfers] Created internalTransfers table");
  }
}
ensureInternalTransfersTable();
function listInternalTransfersForUser(userId) {
  const sql = `
    SELECT id, fromUserId, toUserId, asset, amount, memo, createdAt
    FROM internalTransfers
    WHERE fromUserId = ? OR toUserId = ?
    ORDER BY createdAt DESC
    LIMIT 500
  `;
  const rows = db.prepare(sql).all(userId, userId);
  return rows;
}

// src/routers.internal.ts
var assetSchema2 = z9.string().min(2).max(20).regex(/^[A-Z0-9]+$/, "Asset must be uppercase letters/numbers (e.g. BTC, ETH)");
var internalRouter = router({
  // Create an internal transfer from the current user to another user by email
  createTransfer: authedProcedure.input(
    z9.object({
      recipientEmail: z9.string().email(),
      asset: assetSchema2,
      amount: z9.number().positive().max(1e9),
      memo: z9.string().max(500).optional()
    })
  ).mutation(({ ctx, input }) => {
    const user = ctx.user;
    const senderId = user.id;
    const recipient = db.prepare("SELECT id, email FROM users WHERE email = ?").get(input.recipientEmail);
    if (!recipient) {
      logWarn("Internal transfer failed: recipient not found", {
        fromUserId: senderId,
        recipientEmail: input.recipientEmail
      });
      throw new TRPCError6({
        code: "BAD_REQUEST",
        message: "Recipient not found."
      });
    }
    if (recipient.id === senderId) {
      throw new TRPCError6({
        code: "BAD_REQUEST",
        message: "You cannot send funds to yourself."
      });
    }
    const wallet = db.prepare(
      "SELECT balance FROM wallets WHERE userId = ? AND asset = ?"
    ).get(senderId, input.asset);
    if (!wallet || wallet.balance < input.amount) {
      logWarn("Internal transfer failed: insufficient balance", {
        fromUserId: senderId,
        toUserId: recipient.id,
        asset: input.asset,
        requestedAmount: input.amount,
        balance: wallet?.balance ?? 0
      });
      throw new TRPCError6({
        code: "BAD_REQUEST",
        message: "Insufficient balance."
      });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const tx = db.transaction(
      (fromId, toId, asset, amount, memo) => {
        db.prepare(
          "UPDATE wallets SET balance = balance - ? WHERE userId = ? AND asset = ?"
        ).run(amount, fromId, asset);
        const existingRecipientWallet = db.prepare(
          "SELECT balance FROM wallets WHERE userId = ? AND asset = ?"
        ).get(toId, asset);
        if (existingRecipientWallet) {
          db.prepare(
            "UPDATE wallets SET balance = balance + ? WHERE userId = ? AND asset = ?"
          ).run(amount, toId, asset);
        } else {
          db.prepare(
            "INSERT INTO wallets (userId, asset, balance) VALUES (?, ?, ?)"
          ).run(toId, asset, amount);
        }
        db.prepare(
          `INSERT INTO internalTransfers (fromUserId, toUserId, asset, amount, memo, createdAt)
             VALUES (?, ?, ?, ?, ?, ?)`
        ).run(fromId, toId, asset, amount, memo, now);
      }
    );
    tx(senderId, recipient.id, input.asset, input.amount, input.memo ?? null);
    logSecurity("Internal transfer completed", {
      fromUserId: senderId,
      toUserId: recipient.id,
      asset: input.asset,
      amount: input.amount
    });
    return { success: true };
  }),
  // List internal transfers involving the current user
  historyForUser: authedProcedure.query(({ ctx }) => {
    const user = ctx.user;
    const rows = listInternalTransfersForUser(user.id);
    return rows;
  })
});

// src/routers.support.ts
import { z as z10 } from "zod";
import { TRPCError as TRPCError7 } from "@trpc/server";

// src/support.ts
function ensureSupportSchema() {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS supportTickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      subject TEXT NOT NULL,
      category TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      priority TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      lastMessageAt TEXT,
      lastMessageBy TEXT,
      FOREIGN KEY(userId) REFERENCES users(id)
    )`
  ).run();
  db.prepare(
    `CREATE TABLE IF NOT EXISTS supportMessages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticketId INTEGER NOT NULL,
      userId INTEGER,
      authorRole TEXT NOT NULL,
      message TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(ticketId) REFERENCES supportTickets(id),
      FOREIGN KEY(userId) REFERENCES users(id)
    )`
  ).run();
}
ensureSupportSchema();
function listTicketsForUser(userId) {
  const rows = db.prepare(
    `SELECT id, userId, subject, category, status, priority,
              createdAt, updatedAt, lastMessageAt, lastMessageBy
       FROM supportTickets
       WHERE userId = ?
       ORDER BY updatedAt DESC
       LIMIT 200`
  ).all(userId);
  return rows;
}
function listTicketsAdmin(status, category, limit = 200) {
  const where = [];
  const params = [];
  if (status) {
    where.push("t.status = ?");
    params.push(status);
  }
  if (category) {
    where.push("t.category = ?");
    params.push(category);
  }
  let sql = `
    SELECT
      t.id,
      t.userId,
      u.email as userEmail,
      t.subject,
      t.category,
      t.status,
      t.priority,
      t.createdAt,
      t.updatedAt,
      t.lastMessageAt,
      t.lastMessageBy
    FROM supportTickets t
    LEFT JOIN users u ON u.id = t.userId
  `;
  if (where.length > 0) {
    sql += " WHERE " + where.join(" AND ");
  }
  sql += " ORDER BY t.updatedAt DESC LIMIT ?";
  params.push(limit);
  const rows = db.prepare(sql).all(...params);
  return rows;
}
function getTicketWithMessages(ticketId) {
  const ticket = db.prepare(
    `SELECT
         t.id,
         t.userId,
         u.email as userEmail,
         t.subject,
         t.category,
         t.status,
         t.priority,
         t.createdAt,
         t.updatedAt,
         t.lastMessageAt,
         t.lastMessageBy
       FROM supportTickets t
       LEFT JOIN users u ON u.id = t.userId
       WHERE t.id = ?`
  ).get(ticketId);
  if (!ticket) return null;
  const messages = db.prepare(
    `SELECT id, ticketId, userId, authorRole, message, createdAt
       FROM supportMessages
       WHERE ticketId = ?
       ORDER BY createdAt ASC`
  ).all(ticketId);
  return { ticket, messages };
}

// src/routers.support.ts
var subjectSchema = z10.string().min(5).max(200);
var messageSchema = z10.string().min(5).max(5e3);
var supportRouter = router({
  // User: create a new ticket
  createTicket: authedProcedure.input(
    z10.object({
      subject: subjectSchema,
      category: z10.string().max(100).optional(),
      message: messageSchema
    })
  ).mutation(({ ctx, input }) => {
    const user = ctx.user;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const tx = db.transaction(
      (userId, subject, category, message, now2) => {
        const res = db.prepare(
          `INSERT INTO supportTickets
                (userId, subject, category, status, priority, createdAt, updatedAt, lastMessageAt, lastMessageBy)
               VALUES (?, ?, ?, 'open', 'normal', ?, ?, ?, 'user')`
        ).run(userId, subject, category, now2, now2, now2);
        const ticketId2 = Number(res.lastInsertRowid);
        db.prepare(
          `INSERT INTO supportMessages
              (ticketId, userId, authorRole, message, createdAt)
             VALUES (?, ?, 'user', ?, ?)`
        ).run(ticketId2, userId, message, now2);
        return ticketId2;
      }
    );
    const ticketId = tx(
      user.id,
      input.subject,
      input.category ?? null,
      input.message,
      now
    );
    logSecurity("Support ticket created", {
      userId: user.id,
      email: user.email,
      ticketId
    });
    return { success: true, ticketId };
  }),
  // User: list own tickets
  myTickets: authedProcedure.query(({ ctx }) => {
    const user = ctx.user;
    return listTicketsForUser(user.id);
  }),
  // User: get a ticket with messages (only if owner)
  getTicket: authedProcedure.input(
    z10.object({
      ticketId: z10.number().int().positive()
    })
  ).query(({ ctx, input }) => {
    const user = ctx.user;
    const data = getTicketWithMessages(input.ticketId);
    if (!data) {
      throw new TRPCError7({ code: "NOT_FOUND", message: "Ticket not found." });
    }
    if (data.ticket.userId !== user.id && user.role !== "admin") {
      throw new TRPCError7({ code: "FORBIDDEN", message: "Access denied." });
    }
    return data;
  }),
  // User: reply to own ticket
  replyTicket: authedProcedure.input(
    z10.object({
      ticketId: z10.number().int().positive(),
      message: messageSchema
    })
  ).mutation(({ ctx, input }) => {
    const user = ctx.user;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const ticket = db.prepare(
      `SELECT id, userId, status
           FROM supportTickets
           WHERE id = ?`
    ).get(input.ticketId);
    if (!ticket || ticket.userId !== user.id) {
      throw new TRPCError7({ code: "NOT_FOUND", message: "Ticket not found." });
    }
    if (ticket.status === "closed") {
      throw new TRPCError7({
        code: "BAD_REQUEST",
        message: "This ticket is closed."
      });
    }
    const tx = db.transaction(
      (ticketId, userId, message, now2) => {
        db.prepare(
          `INSERT INTO supportMessages
              (ticketId, userId, authorRole, message, createdAt)
             VALUES (?, ?, 'user', ?, ?)`
        ).run(ticketId, userId, message, now2);
        db.prepare(
          `UPDATE supportTickets
             SET updatedAt = ?, lastMessageAt = ?, lastMessageBy = 'user'
             WHERE id = ?`
        ).run(now2, now2, ticketId);
      }
    );
    tx(ticket.id, user.id, input.message, now);
    logSecurity("Support ticket user reply", {
      userId: user.id,
      ticketId: ticket.id
    });
    return { success: true };
  }),
  // Admin: list tickets
  listTickets: authedProcedure.input(
    z10.object({
      status: z10.string().max(50).optional(),
      category: z10.string().max(100).optional()
    }).optional()
  ).query(({ ctx, input }) => {
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError7({ code: "UNAUTHORIZED" });
    }
    return listTicketsAdmin(input?.status, input?.category ?? void 0, 500);
  }),
  // Admin: reply to ticket
  adminReply: authedProcedure.input(
    z10.object({
      ticketId: z10.number().int().positive(),
      message: messageSchema,
      newStatus: z10.enum(["open", "pending", "closed"]).optional()
    })
  ).mutation(({ ctx, input }) => {
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError7({ code: "UNAUTHORIZED" });
    }
    const admin = ctx.user;
    const ticket = db.prepare(
      `SELECT id, userId, status
           FROM supportTickets
           WHERE id = ?`
    ).get(input.ticketId);
    if (!ticket) {
      throw new TRPCError7({ code: "NOT_FOUND", message: "Ticket not found." });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const newStatus = input.newStatus ?? ticket.status;
    const tx = db.transaction(
      (ticketId, adminId, message, now2, status) => {
        db.prepare(
          `INSERT INTO supportMessages
              (ticketId, userId, authorRole, message, createdAt)
             VALUES (?, ?, 'admin', ?, ?)`
        ).run(ticketId, adminId, message, now2);
        db.prepare(
          `UPDATE supportTickets
             SET status = ?, updatedAt = ?, lastMessageAt = ?, lastMessageBy = 'admin'
             WHERE id = ?`
        ).run(status, now2, now2, ticketId);
      }
    );
    tx(ticket.id, admin.id, input.message, now, newStatus);
    logSecurity("Support ticket admin reply", {
      adminId: admin.id,
      ticketId: ticket.id,
      newStatus
    });
    try {
      const userRow = db.prepare("SELECT email FROM users WHERE id = ?").get(ticket.userId);
      if (userRow?.email) {
        const snippet = input.message.length > 200 ? input.message.slice(0, 200) + "..." : input.message;
        void sendSupportReplyEmail({
          to: userRow.email,
          ticketId: ticket.id,
          subject: ticket.id.toString(),
          replySnippet: snippet
        });
      }
    } catch (err) {
      console.error("[email] Failed to schedule support reply email:", err);
    }
    return { success: true };
  }),
  // Admin: update ticket status without message
  adminUpdateStatus: authedProcedure.input(
    z10.object({
      ticketId: z10.number().int().positive(),
      status: z10.enum(["open", "pending", "closed"])
    })
  ).mutation(({ ctx, input }) => {
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError7({ code: "UNAUTHORIZED" });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    db.prepare(
      `UPDATE supportTickets
         SET status = ?, updatedAt = ?
         WHERE id = ?`
    ).run(input.status, now, input.ticketId);
    logSecurity("Support ticket status updated", {
      adminId: ctx.user.id,
      ticketId: input.ticketId,
      status: input.status
    });
    return { success: true };
  })
});

// src/adminDeposits.ts
function adminListDeposits(filter = {}) {
  const where = [];
  const params = [];
  if (filter.status) {
    where.push("d.status = ?");
    params.push(filter.status);
  }
  if (filter.provider) {
    where.push("d.provider = ?");
    params.push(filter.provider);
  }
  let sql = `
    SELECT
      d.id,
      d.userId,
      u.email AS userEmail,
      d.asset,
      d.amount,
      d.gateway,
      d.provider,
      d.status,
      d.createdAt,
      d.providerOrderId
    FROM deposits d
    LEFT JOIN users u ON u.id = d.userId
  `;
  if (where.length > 0) {
    sql += " WHERE " + where.join(" AND ");
  }
  sql += " ORDER BY d.createdAt DESC";
  const limit = filter.limit && filter.limit > 0 && filter.limit <= 500 ? filter.limit : 200;
  const offset = filter.offset && filter.offset >= 0 ? filter.offset : 0;
  sql += " LIMIT ? OFFSET ?";
  params.push(limit, offset);
  const rows = db.prepare(sql).all(...params);
  return rows;
}

// src/routers.admin.ts
import { z as z11 } from "zod";
import { TRPCError as TRPCError8 } from "@trpc/server";
var adminRouter = router({
  // ========================
  // KYC status update
  // ========================
  updateKycStatus: authedProcedure.input(
    z11.object({
      kycId: z11.number().int().positive(),
      status: z11.enum(["approved", "rejected"]),
      reason: z11.string().optional()
    })
  ).mutation(({ ctx, input }) => {
    const admin = ctx.user;
    if (!admin || admin.role !== "admin") {
      throw new TRPCError8({
        code: "FORBIDDEN",
        message: "Admin privileges required."
      });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const existing = db.prepare(
      `SELECT id, userId, status, rejectionReason
           FROM kycRequests
           WHERE id = ?`
    ).get(input.kycId);
    if (!existing) {
      throw new TRPCError8({
        code: "NOT_FOUND",
        message: "KYC request not found."
      });
    }
    db.prepare(
      `UPDATE kycRequests
         SET status = ?, rejectionReason = ?, reviewedAt = ?, reviewerId = ?
         WHERE id = ?`
    ).run(
      input.status,
      input.status === "rejected" ? input.reason ?? null : null,
      now,
      admin.id,
      input.kycId
    );
    const request = db.prepare(
      `SELECT kr.id,
                  kr.userId,
                  kr.status,
                  kr.rejectionReason,
                  u.email
           FROM kycRequests kr
           JOIN users u ON u.id = kr.userId
           WHERE kr.id = ?`
    ).get(input.kycId);
    if (request && request.email) {
      void sendKycStatusEmail({
        to: request.email,
        status: input.status === "approved" ? "approved" : "rejected",
        reason: input.reason ?? request.rejectionReason ?? null
      });
      const req = ctx.req;
      const ip = extractClientIp(req);
      const userAgent = req?.headers?.["user-agent"] ?? null;
      try {
        logActivity({
          userId: request.userId,
          type: "kyc_status_update",
          category: "security",
          description: input.status === "approved" ? "KYC approved by admin" : "KYC rejected by admin",
          metadata: {
            kycId: request.id,
            status: input.status,
            reason: input.reason ?? request.rejectionReason ?? null,
            adminId: admin.id
          },
          ip,
          userAgent
        });
      } catch (err) {
        console.error(
          "[activity] Failed to log KYC status update:",
          err
        );
      }
    }
    return { success: true };
  }),
  // ========================
  // Deposits list (admin)
  // ========================
  listDeposits: authedProcedure.input(
    z11.object({
      status: z11.string().max(50).optional(),
      provider: z11.string().max(50).optional(),
      limit: z11.number().int().positive().max(500).optional(),
      offset: z11.number().int().nonnegative().optional()
    }).optional()
  ).query(({ ctx, input }) => {
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError8({ code: "UNAUTHORIZED" });
    }
    return adminListDeposits({
      status: input?.status,
      provider: input?.provider,
      limit: input?.limit,
      offset: input?.offset
    });
  }),
  // ========================
  // Stats dashboard
  // ========================
  stats: adminProcedure.query(() => {
    const users = db.prepare("SELECT COUNT(*) as c FROM users").get();
    const deposits = db.prepare("SELECT COUNT(*) as c FROM deposits").get();
    const withdrawals = db.prepare("SELECT COUNT(*) as c FROM withdrawals").get();
    const trades = db.prepare("SELECT COUNT(*) as c FROM trades").get();
    return {
      users: users.c,
      deposits: deposits.c,
      withdrawals: withdrawals.c,
      trades: trades.c
    };
  }),
  // ========================
  // Users table
  // ========================
  users: adminProcedure.query(() => {
    return db.prepare(
      "SELECT id,email,role,kycStatus,createdAt FROM users ORDER BY createdAt DESC"
    ).all();
  }),
  // ========================
  // Withdrawals (list)
  // ========================
  withdrawals: adminProcedure.query(() => {
    return db.prepare("SELECT * FROM withdrawals ORDER BY createdAt DESC").all();
  }),
  // ========================
  // Approve / reject withdrawal
  // ========================
  approveWithdrawal: adminProcedure.input(
    z11.object({
      id: z11.number().int(),
      approve: z11.boolean()
    })
  ).mutation(({ ctx, input }) => {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const status = input.approve ? "approved" : "rejected";
    const wd = db.prepare("SELECT * FROM withdrawals WHERE id=?").get(input.id);
    if (!wd) {
      throw new TRPCError8({
        code: "NOT_FOUND",
        message: "Withdrawal not found."
      });
    }
    db.prepare(
      "UPDATE withdrawals SET status=?, reviewedBy=?, reviewedAt=? WHERE id=?"
    ).run(status, ctx.user.id, now, input.id);
    if (wd.userId) {
      const u = db.prepare("SELECT email FROM users WHERE id=?").get(wd.userId);
      if (u?.email) {
        void sendWithdrawalStatusEmail({
          to: u.email,
          asset: wd.asset,
          amount: wd.amount,
          status,
          txId: null,
          reason: void 0
        });
      }
    }
    const req = ctx.req;
    const ip = extractClientIp(req);
    const userAgent = req?.headers?.["user-agent"] ?? null;
    try {
      logActivity({
        userId: wd.userId ?? null,
        type: "withdrawal_status_update",
        category: "wallet",
        description: `Withdrawal ${status} by admin`,
        metadata: {
          withdrawalId: wd.id,
          asset: wd.asset,
          amount: wd.amount,
          status,
          adminId: ctx.user.id
        },
        ip,
        userAgent
      });
    } catch (err) {
      console.error(
        "[activity] Failed to log withdrawal status update:",
        err
      );
    }
    return { success: true };
  }),
  // ========================
  // Coins management
  // ========================
  coins: adminProcedure.query(() => {
    return db.prepare("SELECT * FROM coins ORDER BY asset ASC").all();
  }),
  updateCoin: adminProcedure.input(
    z11.object({
      id: z11.number().int(),
      enabled: z11.boolean(),
      minWithdraw: z11.number(),
      withdrawFee: z11.number()
    })
  ).mutation(({ input }) => {
    db.prepare(
      "UPDATE coins SET enabled=?, minWithdraw=?, withdrawFee=? WHERE id=?"
    ).run(
      input.enabled ? 1 : 0,
      input.minWithdraw,
      input.withdrawFee,
      input.id
    );
    return { success: true };
  }),
  // ========================
  // Logs
  // ========================
  logs: adminProcedure.query(() => {
    return db.prepare(
      "SELECT * FROM logs ORDER BY createdAt DESC LIMIT 200"
    ).all();
  }),
  // ========================
  // Profit (very simple)
  // ========================
  profit: adminProcedure.query(() => {
    const totalUsers = db.prepare("SELECT COUNT(*) as c FROM users").get().c ?? 0;
    const totalDeposited = db.prepare(
      "SELECT SUM(amount) as s FROM deposits WHERE status='completed'"
    ).get().s || 0;
    const totalWithdrawn = db.prepare(
      "SELECT SUM(amount) as s FROM withdrawals WHERE status='approved'"
    ).get().s || 0;
    return {
      totalUsers,
      totalDeposited,
      totalWithdrawn,
      profitEstimate: (totalDeposited - totalWithdrawn) * 0.01
    };
  })
});

// src/routers.payment.ts
import { z as z12 } from "zod";

// src/paymentGateways/moonpay.ts
import crypto2 from "crypto";
var PUBLISHABLE_API_KEY = process.env.MOONPAY_API_KEY || "";
var SECRET_KEY = process.env.MOONPAY_SECRET_KEY || "";
var WEBHOOK_SECRET = process.env.MOONPAY_WEBHOOK_SECRET || "";
var ENVIRONMENT = (process.env.MOONPAY_ENV || "sandbox").toLowerCase();
var WIDGET_BASE = ENVIRONMENT === "production" ? "https://buy.moonpay.com" : "https://buy-sandbox.moonpay.com";
var API_BASE = ENVIRONMENT === "production" ? "https://api.moonpay.com" : "https://api.moonpay.com";
function ensureConfig() {
  if (!PUBLISHABLE_API_KEY) {
    throw new Error("MOONPAY_API_KEY is not set");
  }
  if (!SECRET_KEY) {
    throw new Error("MOONPAY_SECRET_KEY is not set");
  }
  if (!WEBHOOK_SECRET) {
    console.warn("[MoonPay] MOONPAY_WEBHOOK_SECRET is not set \u2013 webhook validation disabled");
  }
}
function buildWidgetUrl(params) {
  const url = new URL(WIDGET_BASE);
  const searchParams = url.searchParams;
  searchParams.set("apiKey", PUBLISHABLE_API_KEY);
  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, String(value));
  }
  const queryString = "?" + searchParams.toString();
  const signature = crypto2.createHmac("sha256", SECRET_KEY).update(queryString).digest("base64");
  searchParams.set("signature", encodeURIComponent(signature));
  return url.toString();
}
function verifyMoonpayWebhook(headers, rawBody) {
  if (!WEBHOOK_SECRET) {
    console.warn("[MoonPay] WEBHOOK_SECRET missing, cannot verify webhook");
    return false;
  }
  const headerValue = headers["moonpay-signature-v2"] || headers["Moonpay-Signature-V2"] || headers["moonpay-signature"] || headers["Moonpay-Signature"];
  if (!headerValue || typeof headerValue !== "string") {
    return false;
  }
  const parts = headerValue.split(",");
  const tPart = parts.find((p) => p.trim().startsWith("t="));
  const sPart = parts.find((p) => p.trim().startsWith("s="));
  if (!tPart || !sPart) {
    return false;
  }
  const timestamp = tPart.split("=")[1];
  const signature = sPart.split("=")[1];
  if (!timestamp || !signature) {
    return false;
  }
  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto2.createHmac("sha256", WEBHOOK_SECRET).update(signedPayload, "utf8").digest("hex");
  try {
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length) return false;
    return crypto2.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}
var moonpayAdapter = {
  name: "moonpay",
  /**
   * Get a real-time buy quote from MoonPay:
   * GET /v3/currencies/{currencyCode}/buy_quote
   */
  async getQuote(req) {
    ensureConfig();
    const currencyCode = req.asset.toLowerCase();
    const baseCurrencyCode = req.fiatCurrency.toLowerCase();
    const url = new URL(
      `${API_BASE}/v3/currencies/${encodeURIComponent(currencyCode)}/buy_quote`
    );
    url.searchParams.set("apiKey", PUBLISHABLE_API_KEY);
    url.searchParams.set("baseCurrencyAmount", String(req.fiatAmount));
    url.searchParams.set("baseCurrencyCode", baseCurrencyCode);
    url.searchParams.set("areFeesIncluded", "true");
    const res = await globalThis.fetch(url.toString(), {
      method: "GET"
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `[MoonPay] Failed to fetch buy quote: HTTP ${res.status} ${text}`
      );
    }
    const json = await res.json();
    const cryptoAmount = Number(json.quoteCurrencyAmount || 0);
    const feeAmount = Number(json.feeAmount || 0) + Number(json.extraFeeAmount || 0) + Number(json.networkFeeAmount || 0);
    return {
      provider: "moonpay",
      asset: req.asset,
      fiatAmount: req.fiatAmount,
      cryptoAmount,
      fees: feeAmount
    };
  },
  /**
   * Create an "order" by generating a signed MoonPay widget URL.
   * This does NOT hit the MoonPay REST "create transaction" endpoint.
   * The user completes the flow in the widget.
   */
  async createOrder(req) {
    ensureConfig();
    const currencyCode = req.asset.toLowerCase();
    const baseCurrencyCode = "usd";
    const externalTransactionId = `moonpay-${req.userId}-${Date.now()}`;
    const params = {
      currencyCode,
      walletAddress: req.walletAddress,
      baseCurrencyCode,
      baseCurrencyAmount: req.fiatAmount,
      // lock amount so it matches what you show
      lockAmount: true,
      // pre-fill email + your custom tracking fields on widget side (optional; you can add later)
      // email: userEmail,
      externalTransactionId,
      // send user back to your app after flow; MoonPay will append ?transactionId=...&transactionStatus=...
      redirectURL: req.redirectUrl,
      // widget style
      theme: "dark"
    };
    const checkoutUrl = buildWidgetUrl(params);
    return {
      provider: "moonpay",
      orderId: externalTransactionId,
      checkoutUrl
    };
  },
  /**
   * Verify webhook signature (Moonpay-Signature-V2).
   *
   * NOTE: `body` MUST be the RAW request body string, not parsed JSON.
   * Make sure Express/Koa is configured to give you raw body for this route.
   */
  verifyWebhookSignature(headers, body) {
    return verifyMoonpayWebhook(headers, body);
  },
  /**
   * Normalize MoonPay webhook payload into internal format.
   * See MoonPay "Buy" webhook docs for full payload shape.
   */
  normalizeWebhook(body) {
    const data = body?.data || {};
    const statusRaw = (data.status || "").toString().toLowerCase();
    let status = "pending";
    if (statusRaw === "completed" || statusRaw === "finished") {
      status = "completed";
    } else if (statusRaw === "failed") {
      status = "failed";
    }
    const txHash = data.cryptoTransactionId || data.cryptoTransactionHash || data.transactionHash || void 0;
    const cryptoAmount = typeof data.quoteCurrencyAmount === "number" ? data.quoteCurrencyAmount : void 0;
    return {
      provider: "moonpay",
      orderId: data.externalTransactionId || data.id || "unknown",
      txHash,
      status,
      amountCrypto: cryptoAmount,
      raw: body
    };
  }
};

// src/paymentGateways/changelly.ts
var changellyAdapter = {
  name: "changelly",
  async getQuote(req) {
    return { provider: "changelly", asset: req.asset, fiatAmount: req.fiatAmount, cryptoAmount: 0, fees: 0 };
  },
  async createOrder(req) {
    return { provider: "changelly", orderId: "pending", checkoutUrl: "https://placeholder.changelly.com" };
  },
  verifyWebhookSignature() {
    return true;
  },
  normalizeWebhook(body) {
    return { provider: "changelly", orderId: "unknown", status: "pending", raw: body };
  }
};

// src/paymentGateways/banxa.ts
var banxaAdapter = {
  name: "banxa",
  async getQuote(req) {
    return { provider: "banxa", asset: req.asset, fiatAmount: req.fiatAmount, cryptoAmount: 0, fees: 0 };
  },
  async createOrder(req) {
    return { provider: "banxa", orderId: "pending", checkoutUrl: "https://placeholder.banxa.com" };
  },
  verifyWebhookSignature() {
    return true;
  },
  normalizeWebhook(body) {
    return { provider: "banxa", orderId: "unknown", status: "pending", raw: body };
  }
};

// src/paymentGateways/transak.ts
var transakAdapter = {
  name: "transak",
  async getQuote(req) {
    return { provider: "transak", asset: req.asset, fiatAmount: req.fiatAmount, cryptoAmount: 0, fees: 0 };
  },
  async createOrder(req) {
    return { provider: "transak", orderId: "pending", checkoutUrl: "https://placeholder.transak.com" };
  },
  verifyWebhookSignature() {
    return true;
  },
  normalizeWebhook(body) {
    return { provider: "transak", orderId: "unknown", status: "pending", raw: body };
  }
};

// src/paymentGateways/mercuryo.ts
var mercuryoAdapter = {
  name: "mercuryo",
  async getQuote(req) {
    return { provider: "mercuryo", asset: req.asset, fiatAmount: req.fiatAmount, cryptoAmount: 0, fees: 0 };
  },
  async createOrder(req) {
    return { provider: "mercuryo", orderId: "pending", checkoutUrl: "https://placeholder.mercuryo.com" };
  },
  verifyWebhookSignature() {
    return true;
  },
  normalizeWebhook(body) {
    return { provider: "mercuryo", orderId: "unknown", status: "pending", raw: body };
  }
};

// src/paymentGateways/coingate.ts
var coingateAdapter = {
  name: "coingate",
  async getQuote(req) {
    return { provider: "coingate", asset: req.asset, fiatAmount: req.fiatAmount, cryptoAmount: 0, fees: 0 };
  },
  async createOrder(req) {
    return { provider: "coingate", orderId: "pending", checkoutUrl: "https://placeholder.coingate.com" };
  },
  verifyWebhookSignature() {
    return true;
  },
  normalizeWebhook(body) {
    return { provider: "coingate", orderId: "unknown", status: "pending", raw: body };
  }
};

// src/paymentGateways/index.ts
var adapters = {
  moonpay: moonpayAdapter,
  changelly: changellyAdapter,
  banxa: banxaAdapter,
  transak: transakAdapter,
  mercuryo: mercuryoAdapter,
  coingate: coingateAdapter
};
function getGateway(provider) {
  const key = provider.toLowerCase();
  const adapter = adapters[key];
  if (!adapter) {
    throw new Error(`Unknown payment provider: ${provider}`);
  }
  return adapter;
}
function listGateways() {
  return Object.keys(adapters);
}

// src/depositsSchema.ts
function ensureDepositColumns() {
  try {
    const cols = db.prepare("PRAGMA table_info(deposits)").all();
    if (!cols || cols.length === 0) {
      console.warn("[depositsSchema] deposits table not found, skipping column checks.");
      return;
    }
    const names = cols.map((c) => c.name);
    const addIfMissing = (name, ddl) => {
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
ensureDepositColumns();

// src/routers.payment.ts
var providerEnum = z12.enum([
  "moonpay",
  "changelly",
  "banxa",
  "transak",
  "mercuryo",
  "coingate"
]);
var assetSchema3 = z12.string().min(2).max(20).regex(/^[A-Z0-9]+$/, "Asset must be uppercase letters/numbers (e.g. BTC, ETH)");
var fiatSchema = z12.string().min(3).max(3).regex(/^[A-Z]{3}$/, "Fiat currency must be a 3-letter code (e.g. USD, EUR)");
var paymentRouter = router({
  // List available providers
  listProviders: publicProcedure.query(() => {
    return listGateways();
  }),
  // Get a price quote from a provider (currently implemented for MoonPay)
  getQuote: authedProcedure.input(
    z12.object({
      provider: providerEnum,
      asset: assetSchema3,
      fiatCurrency: fiatSchema,
      fiatAmount: z12.number().positive().max(1e6)
    })
  ).query(async ({ input }) => {
    const gw = getGateway(input.provider);
    const quote = await gw.getQuote({
      asset: input.asset,
      fiatCurrency: input.fiatCurrency,
      fiatAmount: input.fiatAmount
    });
    return quote;
  }),
  // Create a new buy order via a payment gateway
  createOrder: authedProcedure.input(
    z12.object({
      provider: providerEnum,
      asset: assetSchema3,
      fiatCurrency: fiatSchema,
      fiatAmount: z12.number().positive().max(1e6),
      walletAddress: z12.string().min(10).max(200),
      redirectUrl: z12.string().url()
    })
  ).mutation(async ({ ctx, input }) => {
    const user = ctx.user;
    const gw = getGateway(input.provider);
    const orderReq = {
      userId: user.id,
      asset: input.asset,
      fiatAmount: input.fiatAmount,
      walletAddress: input.walletAddress,
      redirectUrl: input.redirectUrl
    };
    const order = await gw.createOrder(orderReq);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const stmt = db.prepare(
      `INSERT INTO deposits
          (userId, asset, amount, gateway, status, createdAt, provider, providerOrderId, providerRaw)
         VALUES (?,?,?,?,?,?,?,?,?)`
    );
    const res = stmt.run(
      user.id,
      input.asset,
      input.fiatAmount,
      input.provider,
      "pending",
      now,
      input.provider,
      order.orderId,
      JSON.stringify({
        provider: input.provider,
        orderId: order.orderId,
        checkoutUrl: order.checkoutUrl
      })
    );
    const depositId = Number(res.lastInsertRowid);
    logSecurity("Payment order created", {
      userId: user.id,
      email: user.email,
      provider: input.provider,
      depositId,
      providerOrderId: order.orderId
    });
    return {
      depositId,
      provider: input.provider,
      providerOrderId: order.orderId,
      checkoutUrl: order.checkoutUrl
    };
  })
});

// src/routers.loginHistory.ts
import { z as z13 } from "zod";

// src/loginHistory.ts
function ensureLoginHistorySchema() {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS loginHistory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      email TEXT,
      ip TEXT,
      userAgent TEXT,
      method TEXT,
      success INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      metadataJson TEXT,
      FOREIGN KEY(userId) REFERENCES users(id)
    )`
  ).run();
}
ensureLoginHistorySchema();
function listLoginHistoryForUser(userId, limit = 100) {
  const rows = db.prepare(
    `SELECT id, userId, email, ip, userAgent, method, success, createdAt, metadataJson
       FROM loginHistory
       WHERE userId = ?
          OR (userId IS NULL AND email IS NOT NULL AND email = (
                SELECT email FROM users WHERE id = ?
             ))
       ORDER BY createdAt DESC
       LIMIT ?`
  ).all(userId, userId, limit);
  return rows;
}

// src/routers.loginHistory.ts
var loginHistoryRouter = router({
  historyForUser: authedProcedure.input(
    z13.object({
      limit: z13.number().int().positive().max(200).optional()
    }).optional()
  ).query(({ ctx, input }) => {
    const user = ctx.user;
    const limit = input?.limit ?? 50;
    const rows = listLoginHistoryForUser(user.id, limit);
    return rows;
  })
});

// src/routers.internalTransfer.ts
import { z as z14 } from "zod";

// src/internalTransfer.ts
function ensureInternalTransferSchema() {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS internalTransfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fromUserId INTEGER NOT NULL,
      toUserId INTEGER NOT NULL,
      asset TEXT NOT NULL,
      amount REAL NOT NULL,
      note TEXT,
      status TEXT NOT NULL DEFAULT 'completed',
      createdAt TEXT NOT NULL,
      FOREIGN KEY(fromUserId) REFERENCES users(id),
      FOREIGN KEY(toUserId) REFERENCES users(id)
    )`
  ).run();
}
ensureInternalTransferSchema();
function listTransfersForUser(userId, limit = 100) {
  const rows = db.prepare(
    `SELECT id, fromUserId, toUserId, asset, amount, note, status, createdAt
       FROM internalTransfers
       WHERE fromUserId = ? OR toUserId = ?
       ORDER BY createdAt DESC
       LIMIT ?`
  ).all(userId, userId, limit);
  return rows;
}

// src/routers.internalTransfer.ts
import { TRPCError as TRPCError9 } from "@trpc/server";
var internalTransferRouter = router({
  myTransfers: authedProcedure.input(
    z14.object({
      limit: z14.number().int().positive().max(200).optional()
    }).optional()
  ).query(({ ctx, input }) => {
    const user = ctx.user;
    const limit = input?.limit ?? 100;
    return listTransfersForUser(user.id, limit);
  }),
  createTransfer: authedProcedure.input(
    z14.object({
      recipientEmail: emailSchema,
      asset: assetSymbolSchema,
      amount: cryptoAmountSchema,
      note: optionalStringSchema
    })
  ).mutation(({ ctx, input }) => {
    const user = ctx.user;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const req = ctx.req;
    const ip = extractClientIp(req);
    const userAgent = req?.headers?.["user-agent"] ?? null;
    const recipientEmail = input.recipientEmail.trim().toLowerCase();
    const asset = input.asset.trim().toUpperCase();
    const amount = input.amount;
    const note = input.note ?? null;
    if (!recipientEmail) {
      throw new TRPCError9({
        code: "BAD_REQUEST",
        message: "Recipient email is required."
      });
    }
    if (recipientEmail === user.email?.toLowerCase()) {
      throw new TRPCError9({
        code: "BAD_REQUEST",
        message: "You cannot send funds to yourself."
      });
    }
    const recipient = db.prepare(
      "SELECT id, email FROM users WHERE lower(email) = lower(?)"
    ).get(recipientEmail);
    if (!recipient) {
      throw new TRPCError9({
        code: "BAD_REQUEST",
        message: "Recipient not found."
      });
    }
    if (recipient.id === user.id) {
      throw new TRPCError9({
        code: "BAD_REQUEST",
        message: "You cannot send funds to yourself."
      });
    }
    const walletRow = db.prepare(
      "SELECT balance FROM wallets WHERE userId = ? AND asset = ?"
    ).get(user.id, asset);
    const balance = walletRow?.balance ?? 0;
    if (balance < amount) {
      throw new TRPCError9({
        code: "BAD_REQUEST",
        message: `Insufficient ${asset} balance.`
      });
    }
    try {
      const tx = db.transaction(
        (fromUserId, toUserId, asset2, amount2, now2, note2) => {
          db.prepare(
            "UPDATE wallets SET balance = balance - ? WHERE userId = ? AND asset = ?"
          ).run(amount2, fromUserId, asset2);
          const existing = db.prepare(
            "SELECT balance FROM wallets WHERE userId = ? AND asset = ?"
          ).get(toUserId, asset2);
          if (existing) {
            db.prepare(
              "UPDATE wallets SET balance = balance + ? WHERE userId = ? AND asset = ?"
            ).run(amount2, toUserId, asset2);
          } else {
            db.prepare(
              "INSERT INTO wallets (userId, asset, balance) VALUES (?, ?, ?)"
            ).run(toUserId, asset2, amount2);
          }
          const res = db.prepare(
            `INSERT INTO internalTransfers
                  (fromUserId, toUserId, asset, amount, note, status, createdAt)
                 VALUES (?, ?, ?, ?, ?, 'completed', ?)`
          ).run(fromUserId, toUserId, asset2, amount2, note2, now2);
          return Number(res.lastInsertRowid);
        }
      );
      const transferId = tx(
        user.id,
        recipient.id,
        asset,
        amount,
        now,
        note
      );
      logSecurity("Internal transfer created", {
        transferId,
        fromUserId: user.id,
        toUserId: recipient.id,
        asset,
        amount
      });
      try {
        logActivity({
          userId: user.id,
          type: "internal_transfer",
          category: "wallet",
          description: `Sent ${amount} ${asset} to ${recipient.email}`,
          metadata: {
            transferId,
            recipientEmail,
            amount,
            asset,
            note
          },
          ip,
          userAgent
        });
      } catch (err) {
        console.error("[activity] Failed to log internal transfer activity:", err);
      }
      return { success: true, transferId };
    } catch (err) {
      console.error("[internalTransfer] Failed to create transfer:", err);
      throw new TRPCError9({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create internal transfer. Please try again later."
      });
    }
  })
});

// src/routers.ts
var appRouter = router({
  internalTransfer: internalTransferRouter,
  loginHistory: loginHistoryRouter,
  payment: paymentRouter,
  auth: authRouter,
  wallet: walletRouter,
  market: marketRouter,
  promo: promoRouter,
  staking: stakingRouter,
  transactions: transactionsRouter,
  internal: internalRouter,
  support: supportRouter,
  admin: adminRouter
});

// src/index.ts
import cron from "node-cron";

// src/jobs/stakingCron.ts
import dayjs from "dayjs";

// src/prisma.ts
import { PrismaClient } from "@prisma/client";
var prisma = new PrismaClient();

// src/jobs/stakingCron.ts
async function stakingCronJob() {
  const positions = await prisma.stakingPosition.findMany({
    where: { status: "active" }
  });
  if (!positions.length) {
    return;
  }
  const now = dayjs();
  for (const pos of positions) {
    const lastUpdate = dayjs(pos.updatedAt ?? pos.createdAt);
    const days = now.diff(lastUpdate, "day", true);
    if (days <= 0) continue;
    const apr = Number(pos.apr) / 100;
    const amount = Number(pos.amount);
    const reward = amount * apr * (days / 365);
    await prisma.stakingPosition.update({
      where: { id: pos.id },
      data: {
        reward: {
          increment: reward
        },
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
  }
  console.log(`[STAKING CRON] Updated ${positions.length} positions at ${now.toISOString()}`);
}

// src/index.ts
seedIfEmpty();
var app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use("/trpc", createExpressMiddleware({
  router: appRouter,
  createContext: ({ req, res }) => {
    const token = req.cookies?.session;
    const sess = getSession(token);
    return { req, res, user: sess };
  }
}));
var port = Number(process.env.PORT || 4e3);
app.listen(port, () => {
  console.log("API listening on http://localhost:" + port);
});
cron.schedule("* * * * *", async () => {
  try {
    await stakingCronJob();
  } catch (err) {
    console.error("[STAKING CRON ERROR]", err);
  }
});
