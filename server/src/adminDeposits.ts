import { db } from "./db";

export type AdminDepositRow = {
  id: number;
  userId: number;
  userEmail: string;
  asset: string;
  amount: number;
  gateway: string | null;
  provider: string | null;
  status: string;
  createdAt: string;
  providerOrderId: string | null;
};

export type AdminDepositFilter = {
  status?: string;
  provider?: string;
  limit?: number;
  offset?: number;
};

export function adminListDeposits(filter: AdminDepositFilter = {}): AdminDepositRow[] {
  const where: string[] = [];
  const params: any[] = [];

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

  const rows = db.prepare(sql).all(...params) as AdminDepositRow[];

  return rows;
}
