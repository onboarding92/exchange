import { db } from "./db";

export type UserLoginEvent = {
  id: number;
  userId: number;
  ip: string;
  userAgent: string;
  createdAt: string;
  isSuspicious: number;
};

// Create login events table
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

// Very simple suspicion heuristic: different IP than last login
function detectSuspicious(userId: number, ip: string): boolean {
  const last = db
    .prepare(
      "SELECT ip FROM userLoginEvents WHERE userId=? ORDER BY createdAt DESC LIMIT 1"
    )
    .get(userId) as { ip: string } | undefined;

  if (!last) return false;
  if (!last.ip) return false;
  return last.ip !== ip;
}

export function recordLoginEvent(userId: number, ip: string, userAgent: string) {
  const now = new Date().toISOString();
  const suspicious = detectSuspicious(userId, ip) ? 1 : 0;

  db.prepare(
    `INSERT INTO userLoginEvents (userId, ip, userAgent, createdAt, isSuspicious)
     VALUES (?,?,?,?,?)`
  ).run(userId, ip, userAgent, now, suspicious);
}

export function getRecentLogins(userId: number, limit = 20): UserLoginEvent[] {
  return db
    .prepare(
      `SELECT id,userId,ip,userAgent,createdAt,isSuspicious
       FROM userLoginEvents
       WHERE userId=?
       ORDER BY createdAt DESC
       LIMIT ?`
    )
    .all(userId, limit) as any;
}

// ===========================================
// "Smart" login alerts: new device / new IP
// ===========================================

export function isNewDeviceOrIp(
  userId: number,
  ip: string | null,
  userAgent: string | null
): boolean {
  // Reuse recent login events as a simple "memory" of known devices
  const recent = getRecentLogins(userId, 5);
  if (!recent.length) return true;

  const normalizedIp = ip ?? "";
  const normalizedUa = (userAgent ?? "").toLowerCase();

  const seenCombination = recent.some((e) => {
    const prevIp = e.ip ?? "";
    const prevUa = (e.userAgent ?? "").toLowerCase();
    return prevIp === normalizedIp && prevUa === normalizedUa;
  });

  // If we have never seen this IP/UA combination, treat it as a new device
  return !seenCombination;
}


export function deviceInfo(req: any) {
  return {
    ip: req?.headers?.["x-forwarded-for"] ?? req?.ip ?? "unknown",
    ua: req?.headers?.["user-agent"] ?? "unknown"
  };
}
