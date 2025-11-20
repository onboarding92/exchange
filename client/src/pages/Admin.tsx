import { useNotifications } from "../notifications";
import React, { useState } from "react";
import { trpc } from "../trpc";

type Tab = "dashboard" | "users" | "withdrawals" | "coins" | "logs" | "profit";

const sectionStyle: React.CSSProperties = {
  marginBottom: 24,
  padding: 16,
  borderRadius: 8,
  border: "1px solid #1e293b",
  background: "#020617",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thtdStyle: React.CSSProperties = {
  border: "1px solid #1e293b",
  padding: "6px 8px",
  fontSize: 13,
};

export default function Admin() {
  const { notify } = useNotifications();

  const [tab, setTab] = useState<Tab>("dashboard");

  const stats = trpc.admin.stats.useQuery();
  const users = trpc.admin.users.useQuery();
  const withdrawals = trpc.admin.withdrawals.useQuery();
  const coins = trpc.admin.coins.useQuery();
  const logs = trpc.admin.logs.useQuery();
  const profit = trpc.admin.profit.useQuery();

  const approveWithdrawal = trpc.admin.approveWithdrawal.useMutation({
    onSuccess: () => {
      withdrawals.refetch();
      notify("success", "Withdrawal updated");
    },
    onError: (err) => {
      notify("error", err.message);
    },
  });

  const updateCoin = trpc.admin.updateCoin.useMutation({
    onSuccess: () => {
      coins.refetch();
      notify("success", "Coin updated");
    },
    onError: (err) => {
      notify("error", err.message);
    },
  });

  return (
    <div>
      <h2>Admin Panel</h2>

      <div style={{ display: "flex", gap: 8, margin: "12px 0 20px" }}>
        <button onClick={() => setTab("dashboard")}>Dashboard</button>
        <button onClick={() => setTab("users")}>Users</button>
        <button onClick={() => setTab("withdrawals")}>Withdrawals</button>
        <button onClick={() => setTab("coins")}>Coins</button>
        <button onClick={() => setTab("logs")}>Logs</button>
        <button onClick={() => setTab("profit")}>Profit</button>
      </div>

      {tab === "dashboard" && (
        <section style={sectionStyle}>
          <h3>Overview</h3>
          {stats.isLoading ? (
            <p>Loading stats...</p>
          ) : (
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div>
                <strong>Users</strong>
                <div>{stats.data?.users ?? 0}</div>
              </div>
              <div>
                <strong>Deposits</strong>
                <div>{stats.data?.deposits ?? 0}</div>
              </div>
              <div>
                <strong>Withdrawals</strong>
                <div>{stats.data?.withdrawals ?? 0}</div>
              </div>
              <div>
                <strong>Trades</strong>
                <div>{stats.data?.trades ?? 0}</div>
              </div>
            </div>
          )}
        </section>
      )}

      {tab === "users" && (
        <section style={sectionStyle}>
          <h3>Users</h3>
          {users.isLoading ? (
            <p>Loading users...</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thtdStyle}>ID</th>
                  <th style={thtdStyle}>Email</th>
                  <th style={thtdStyle}>Role</th>
                  <th style={thtdStyle}>KYC</th>
                  <th style={thtdStyle}>Created</th>
                </tr>
              </thead>
              <tbody>
                {users.data?.map((u: any) => (
                  <tr key={u.id}>
                    <td style={thtdStyle}>{u.id}</td>
                    <td style={thtdStyle}>{u.email}</td>
                    <td style={thtdStyle}>{u.role}</td>
                    <td style={thtdStyle}>{u.kycStatus}</td>
                    <td style={thtdStyle}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {tab === "withdrawals" && (
        <section style={sectionStyle}>
          <h3>Withdrawals</h3>
          {withdrawals.isLoading ? (
            <p>Loading withdrawals...</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thtdStyle}>ID</th>
                  <th style={thtdStyle}>User</th>
                  <th style={thtdStyle}>Asset</th>
                  <th style={thtdStyle}>Amount</th>
                  <th style={thtdStyle}>Address</th>
                  <th style={thtdStyle}>Status</th>
                  <th style={thtdStyle}>Created</th>
                  <th style={thtdStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.data?.map((w: any) => (
                  <tr key={w.id}>
                    <td style={thtdStyle}>{w.id}</td>
                    <td style={thtdStyle}>{w.userId}</td>
                    <td style={thtdStyle}>{w.asset}</td>
                    <td style={thtdStyle}>{w.amount}</td>
                    <td style={thtdStyle}>{w.address}</td>
                    <td style={thtdStyle}>{w.status}</td>
                    <td style={thtdStyle}>
                      {w.createdAt ? new Date(w.createdAt).toLocaleString() : "-"}
                    </td>
                    <td style={thtdStyle}>
                      {w.status === "pending" ? (
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            onClick={() =>
                              approveWithdrawal.mutate({ id: w.id, approve: true })
                            }
                          >
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              approveWithdrawal.mutate({ id: w.id, approve: false })
                            }
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {tab === "coins" && (
        <section style={sectionStyle}>
          <h3>Coins</h3>
          {coins.isLoading ? (
            <p>Loading coins...</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thtdStyle}>ID</th>
                  <th style={thtdStyle}>Asset</th>
                  <th style={thtdStyle}>Name</th>
                  <th style={thtdStyle}>Enabled</th>
                  <th style={thtdStyle}>Min Withdraw</th>
                  <th style={thtdStyle}>Fee</th>
                  <th style={thtdStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coins.data?.map((c: any) => (
                  <tr key={c.id}>
                    <td style={thtdStyle}>{c.id}</td>
                    <td style={thtdStyle}>{c.asset}</td>
                    <td style={thtdStyle}>{c.name}</td>
                    <td style={thtdStyle}>{c.enabled ? "Yes" : "No"}</td>
                    <td style={thtdStyle}>{c.minWithdraw}</td>
                    <td style={thtdStyle}>{c.withdrawFee}</td>
                    <td style={thtdStyle}>
                      <button
                        onClick={() =>
                          updateCoin.mutate({
                            id: c.id,
                            enabled: !c.enabled,
                            minWithdraw: c.minWithdraw,
                            withdrawFee: c.withdrawFee,
                          })
                        }
                      >
                        Toggle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {tab === "logs" && (
        <section style={sectionStyle}>
          <h3>System Logs</h3>
          {logs.isLoading ? (
            <p>Loading logs...</p>
          ) : logs.data && logs.data.length === 0 ? (
            <p>No logs yet.</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thtdStyle}>ID</th>
                  <th style={thtdStyle}>Type</th>
                  <th style={thtdStyle}>Message</th>
                  <th style={thtdStyle}>Meta</th>
                  <th style={thtdStyle}>Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.data?.map((l: any) => (
                  <tr key={l.id}>
                    <td style={thtdStyle}>{l.id}</td>
                    <td style={thtdStyle}>{l.type}</td>
                    <td style={thtdStyle}>{l.message}</td>
                    <td style={thtdStyle}>{l.meta}</td>
                    <td style={thtdStyle}>
                      {l.createdAt ? new Date(l.createdAt).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {tab === "profit" && (
        <section style={sectionStyle}>
          <h3>Profit / Overview</h3>
          {profit.isLoading ? (
            <p>Loading...</p>
          ) : (
            <div>
              <p>Total users: {profit.data?.totalUsers ?? 0}</p>
              <p>Total deposited: {profit.data?.totalDeposited ?? 0}</p>
              <p>Total withdrawn: {profit.data?.totalWithdrawn ?? 0}</p>
              <p>Profit estimate: {profit.data?.profitEstimate ?? 0}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
