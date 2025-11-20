import { useNotifications } from "../notifications";
import React, { useState } from "react";
import { trpc } from "../trpc";

export default function Staking() {
  const { notify } = useNotifications();

  const plansQuery = trpc.staking.listPlans.useQuery();
  const stakesQuery = trpc.staking.myStakes.useQuery();
  const stakeMutation = trpc.staking.stake.useMutation();
  const claimMutation = trpc.staking.claim.useMutation();

  const [amount, setAmount] = useState(10);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);

  return (
    <div>
      <h2>Staking</h2>
      <h3>Plans</h3>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Asset</th>
            <th>APR</th>
            <th>Lock (days)</th>
            <th>Min</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {plansQuery.data?.map((p: any) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.asset}</td>
              <td>{p.apr}%</td>
              <td>{p.lockDays}</td>
              <td>{p.minAmount}</td>
              <td>
                <button onClick={() => setSelectedPlan(p.id)}>Select</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedPlan && (
        <div>
          <h4>Stake on plan #{selectedPlan}</h4>
          <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          <button
            onClick={() => {
              stakeMutation.mutate({ planId: selectedPlan, amount }, {
                onSuccess() { notify("success", "Staking started"); },
                onError(err) { notify("error", err.message); },
              });
            }}
          >
            Stake
          </button>
        </div>
      )}

      <h3>My Stakes</h3>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Asset</th>
            <th>Amount</th>
            <th>APR</th>
            <th>Ends</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {stakesQuery.data?.map((s: any) => (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td>{s.asset}</td>
              <td>{s.amount}</td>
              <td>{s.apr}%</td>
              <td>{new Date(s.endsAt).toLocaleDateString()}</td>
              <td>{s.closedAt ? "Closed" : "Active"}</td>
              <td>
                {!s.closedAt && (
                  <button onClick={() => claimMutation.mutate({ stakeId: s.id })}>Claim</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
