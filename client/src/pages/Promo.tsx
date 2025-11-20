import { useNotifications } from "../notifications";
import React, { useState } from "react";
import { trpc } from "../trpc";

export default function Promo() {
  const { notify } = useNotifications();

  const [code, setCode] = useState("");
  const redeemMutation = trpc.promo.redeem.useMutation();
  const redemptionsQuery = trpc.promo.myRedemptions.useQuery();

  return (
    <div>
      <h2>Promo Codes</h2>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter promo code"
        />
        <button
          onClick={() => {
            redeemMutation.mutate({ code }, {
              onSuccess(data) { notify("success", `Promo redeemed: +${data.bonusAmount} USDT`); },
              onError(err) { notify("error", err.message); },
            });
          }}
        >
          Redeem
        </button>
      </div>
      {redeemMutation.error && (
        <p style={{ color: "salmon" }}>{redeemMutation.error.message}</p>
      )}
      {redeemMutation.data && (
        <p>Bonus received: {redeemMutation.data.bonusAmount} USDT</p>
      )}

      <h3>My Redemptions</h3>
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Type</th>
            <th>Bonus</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {redemptionsQuery.data?.map((r: any) => (
            <tr key={r.id}>
              <td>{r.code}</td>
              <td>{r.type}</td>
              <td>{r.bonusAmount}</td>
              <td>{new Date(r.redeemedAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
