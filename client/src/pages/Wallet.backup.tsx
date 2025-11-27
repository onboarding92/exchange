import { useNotifications } from "../notifications";
import React, { useState } from "react";
import { trpc } from "../trpc";

export default function Wallet() {
  const { notify } = useNotifications();

  const balancesQuery = trpc.wallet.balances.useQuery();
  const depositMutation = trpc.wallet.createDeposit.useMutation();
  const withdrawMutation = trpc.wallet.withdraw.useMutation();
  const internalTransfer = trpc.internal.transfer.useMutation();

  const [depositAsset, setDepositAsset] = useState("USDT");
  const [depositAmount, setDepositAmount] = useState(100);
  const [depositGateway, setDepositGateway] = useState("MoonPay");

  const [withdrawAsset, setWithdrawAsset] = useState("USDT");
  const [withdrawAmount, setWithdrawAmount] = useState(50);
  const [withdrawAddress, setWithdrawAddress] = useState("");

  const [transferEmail, setTransferEmail] = useState("");
  const [transferAsset, setTransferAsset] = useState("USDT");
  const [transferAmount, setTransferAmount] = useState(10);

  return (
    <div>
      <h2>Wallet</h2>
      <h3>Balances</h3>
      <table>
        <thead>
          <tr>
            <th>Asset</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          {balancesQuery.data?.map((b: any) => (
            <tr key={b.asset}>
              <td>{b.asset}</td>
              <td>{b.balance}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Deposit</h3>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input value={depositAsset} onChange={(e) => setDepositAsset(e.target.value)} />
        <input
          type="number"
          value={depositAmount}
          onChange={(e) => setDepositAmount(Number(e.target.value))}
        />
        <select value={depositGateway} onChange={(e) => setDepositGateway(e.target.value)}>
          <option>MoonPay</option>
          <option>Changelly</option>
          <option>Banxa</option>
          <option>Transak</option>
          <option>Mercuryo</option>
          <option>CoinGate</option>
        </select>
        <button
          onClick={() => {
            depositMutation.mutate({
              asset: depositAsset,
              amount: depositAmount,
              gateway: depositGateway as any,
            }, {
              onSuccess() { notify("success", "Deposit request created"); },
              onError(err) { notify("error", err.message); },
            });
          }}
        >
          Create Deposit
        </button>
      </div>

      <h3>Withdraw</h3>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input value={withdrawAsset} onChange={(e) => setWithdrawAsset(e.target.value)} />
        <input
          type="number"
          value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(Number(e.target.value))}
        />
        <input
          value={withdrawAddress}
          onChange={(e) => setWithdrawAddress(e.target.value)}
          placeholder="Address"
        />
        <button
          onClick={() => {
            withdrawMutation.mutate({
              asset: withdrawAsset,
              amount: withdrawAmount,
              address: withdrawAddress,
            }, {
              onSuccess() { notify("success", "Withdrawal request submitted"); },
              onError(err) { notify("error", err.message); },
            });
          }}
        >
          Request Withdrawal
        </button>
      </div>

      <h3>Internal Transfer</h3>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={transferEmail}
          onChange={(e) => setTransferEmail(e.target.value)}
          placeholder="Recipient email"
        />
        <input value={transferAsset} onChange={(e) => setTransferAsset(e.target.value)} />
        <input
          type="number"
          value={transferAmount}
          onChange={(e) => setTransferAmount(Number(e.target.value))}
        />
        <button
          onClick={() => {
            internalTransfer.mutate({
              toEmail: transferEmail,
              asset: transferAsset,
              amount: transferAmount,
            }, {
              onSuccess() { notify("success", "Internal transfer completed"); },
              onError(err) { notify("error", err.message); },
            });
          }}
        >
          Transfer
        </button>
      </div>
    </div>
  );
}
