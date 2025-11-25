import React, { useState } from "react";

const Withdraw: React.FC = () => {
  const [asset, setAsset] = useState("USDT");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("Withdrawal request submitted (UI placeholder).");

    // TODO: collegare questa pagina alla mutation tRPC reale
    // per creare una richiesta di prelievo dal backend.

    setTimeout(() => {
      setIsSubmitting(false);
    }, 500);
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Withdraw</h1>

      <p className="text-sm text-gray-500 mb-4">
        This is a placeholder withdrawal page. The logic will be fully wired to
        the backend (tRPC) in a later step.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Asset</label>
          <select
            className="border rounded px-3 py-2 w-full"
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
          >
            <option value="USDT">USDT</option>
            <option value="BTC">BTC</option>
            <option value="ETH">ETH</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Amount</label>
          <input
            className="border rounded px-3 py-2 w-full"
            type="number"
            min="0"
            step="0.0001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Withdraw address</label>
          <input
            className="border rounded px-3 py-2 w-full"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Your external wallet address"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {isSubmitting ? "Submitting..." : "Request withdrawal"}
        </button>
      </form>

      {message && (
        <div className="mt-4 text-sm text-green-600">
          {message}
        </div>
      )}
    </div>
  );
};

export default Withdraw;
