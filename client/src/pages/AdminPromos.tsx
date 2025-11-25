import React, { useState } from "react";
import { useNotifications } from "../notifications";
import { trpc } from "../trpc";

type AdminPromo = {
  id: number;
  code: string;
  type: "first_deposit" | "gift" | "random";
  rewardType: "fixed" | "percent";
  rewardValue: number;
  maxRedemptions: number;
  expiresAt: string | null;
  createdBy?: number;
  createdAt: string;
};

export default function AdminPromos() {
  const { notify } = useNotifications();

  // Form state
  const [code, setCode] = useState("");
  const [type, setType] = useState<AdminPromo["type"]>("first_deposit");
  const [rewardType, setRewardType] =
    useState<AdminPromo["rewardType"]>("fixed");
  const [rewardValue, setRewardValue] = useState<string>("");
  const [maxRedemptions, setMaxRedemptions] = useState<string>("1");
  const [expiresAt, setExpiresAt] = useState<string>("");

  const listQuery = trpc.promo.adminList.useQuery(undefined, {
    // gli endpoint admin hanno già il controllo di ruolo lato backend
    staleTime: 10_000,
  });

  const createMutation = trpc.promo.adminCreate.useMutation({
    onSuccess: () => {
      notify("success", "Promo code created successfully");
      listQuery.refetch();
      setCode("");
      setRewardValue("");
      setMaxRedemptions("1");
      setExpiresAt("");
    },
    onError: (err) => {
      notify("error", err.message || "Failed to create promo code");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numericReward = Number(rewardValue);
    const numericMax = Number(maxRedemptions);

    if (!code.trim()) {
      notify("error", "Code is required");
      return;
    }
    if (!Number.isFinite(numericReward) || numericReward <= 0) {
      notify("error", "Reward value must be a positive number");
      return;
    }
    if (!Number.isInteger(numericMax) || numericMax <= 0) {
      notify("error", "Max redemptions must be a positive integer");
      return;
    }

    createMutation.mutate({
      code: code.trim(),
      type,
      rewardType,
      rewardValue: numericReward,
      maxRedemptions: numericMax,
      // backend si aspetta ISO string oppure undefined
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    } as any);
  };

  const promos = (listQuery.data as AdminPromo[] | undefined) ?? [];

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
        Admin – Promo Codes
      </h1>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
        Create and manage promo codes used by users in the Promo section.
        Backend security: this page should be used only by admins; access is
        enforced on the server via adminProcedure.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        {/* Form creazione promo */}
        <form
          onSubmit={handleSubmit}
          style={{
            border: "1px solid #1e293b",
            borderRadius: 8,
            padding: 16,
            background: "#020617",
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            Create promo code
          </h2>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
              Code
            </label>
            <input
              style={{ width: "100%", padding: 8 }}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="WELCOME2025"
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
              Type
            </label>
            <select
              style={{ width: "100%", padding: 8 }}
              value={type}
              onChange={(e) => setType(e.target.value as AdminPromo["type"])}
            >
              <option value="first_deposit">First deposit</option>
              <option value="gift">Gift</option>
              <option value="random">Random</option>
            </select>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
              Reward type
            </label>
            <select
              style={{ width: "100%", padding: 8 }}
              value={rewardType}
              onChange={(e) =>
                setRewardType(e.target.value as AdminPromo["rewardType"])
              }
            >
              <option value="fixed">Fixed (USDT)</option>
              <option value="percent">Percent (%)</option>
            </select>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
              Reward value
            </label>
            <input
              style={{ width: "100%", padding: 8 }}
              type="number"
              min="0"
              step="0.01"
              value={rewardValue}
              onChange={(e) => setRewardValue(e.target.value)}
              placeholder={rewardType === "fixed" ? "10" : "5"}
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
              Max redemptions
            </label>
            <input
              style={{ width: "100%", padding: 8 }}
              type="number"
              min="1"
              step="1"
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(e.target.value)}
              placeholder="100"
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
              Expires at (optional)
            </label>
            <input
              style={{ width: "100%", padding: 8 }}
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
              Leave empty for no expiration.
            </div>
          </div>

          <button
            type="submit"
            disabled={createMutation.isLoading}
            style={{
              marginTop: 8,
              width: "100%",
              padding: "8px 12px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: createMutation.isLoading ? "default" : "pointer",
              opacity: createMutation.isLoading ? 0.6 : 1,
            }}
          >
            {createMutation.isLoading ? "Creating..." : "Create promo"}
          </button>
        </form>

        {/* Lista promo codes */}
        <div
          style={{
            border: "1px solid #1e293b",
            borderRadius: 8,
            padding: 16,
            background: "#020617",
            overflowX: "auto",
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            Existing promo codes
          </h2>
          {listQuery.isLoading && <p>Loading...</p>}
          {listQuery.error && (
            <p style={{ color: "salmon" }}>
              Error loading promos: {listQuery.error.message}
            </p>
          )}

          {!listQuery.isLoading && promos.length === 0 && (
            <p style={{ fontSize: 13, color: "#64748b" }}>
              No promo codes found yet.
            </p>
          )}

          {promos.length > 0 && (
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 4 }}>Code</th>
                  <th style={{ textAlign: "left", padding: 4 }}>Type</th>
                  <th style={{ textAlign: "left", padding: 4 }}>Reward</th>
                  <th style={{ textAlign: "left", padding: 4 }}>Max</th>
                  <th style={{ textAlign: "left", padding: 4 }}>Expires</th>
                  <th style={{ textAlign: "left", padding: 4 }}>Created at</th>
                </tr>
              </thead>
              <tbody>
                {promos.map((p) => (
                  <tr key={p.id}>
                    <td style={{ padding: 4 }}>{p.code}</td>
                    <td style={{ padding: 4 }}>{p.type}</td>
                    <td style={{ padding: 4 }}>
                      {p.rewardType === "fixed"
                        ? `${p.rewardValue} USDT`
                        : `${p.rewardValue}%`}
                    </td>
                    <td style={{ padding: 4 }}>{p.maxRedemptions}</td>
                    <td style={{ padding: 4 }}>
                      {p.expiresAt
                        ? new Date(p.expiresAt).toLocaleString()
                        : "—"}
                    </td>
                    <td style={{ padding: 4 }}>
                      {new Date(p.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
