import { db } from "./db";

export type SupportTicketRow = {
  id: number;
  userId: number;
  subject: string;
  category: string | null;
  status: string; // "open" | "pending" | "closed"
  priority: string | null; // e.g. "low" | "normal" | "high"
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  lastMessageBy: string | null; // "user" | "admin" | null
};

export type SupportMessageRow = {
  id: number;
  ticketId: number;
  userId: number | null; // null for admin system messages if needed
  authorRole: string; // "user" | "admin"
  message: string;
  createdAt: string;
};

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

export function listTicketsForUser(userId: number): SupportTicketRow[] {
  const rows = db
    .prepare(
      `SELECT id, userId, subject, category, status, priority,
              createdAt, updatedAt, lastMessageAt, lastMessageBy
       FROM supportTickets
       WHERE userId = ?
       ORDER BY updatedAt DESC
       LIMIT 200`
    )
    .all(userId) as SupportTicketRow[];
  return rows;
}

export function listTicketsAdmin(
  status?: string | null,
  category?: string | null,
  limit = 200
): (SupportTicketRow & { userEmail?: string })[] {
  const where: string[] = [];
  const params: any[] = [];

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

  const rows = db.prepare(sql).all(...params) as any[];
  return rows;
}

export function getTicketWithMessages(
  ticketId: number
): {
  ticket: SupportTicketRow & { userEmail?: string };
  messages: SupportMessageRow[];
} | null {
  const ticket = db
    .prepare(
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
    )
    .get(ticketId) as any;

  if (!ticket) return null;

  const messages = db
    .prepare(
      `SELECT id, ticketId, userId, authorRole, message, createdAt
       FROM supportMessages
       WHERE ticketId = ?
       ORDER BY createdAt ASC`
    )
    .all(ticketId) as SupportMessageRow[];

  return { ticket, messages };
}
