import React from "react";
import { trpc } from "../trpc";

export default function Transactions() {
  const history = trpc.transactions.history.useQuery();

  return (
    <div>
      <h2>Transaction History</h2>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Asset/Pair</th>
            <th>Amount</th>
            <th>Extra</th>
            <th>Status</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {history.data?.map((tx: any, idx: number) => (
            <tr key={idx}>
              <td>{tx.type}</td>
              <td>{tx.asset}</td>
              <td>{tx.amount}</td>
              <td>{tx.extra}</td>
              <td>{tx.status}</td>
              <td>{new Date(tx.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
