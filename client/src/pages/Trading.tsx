import { useNotifications } from "../notifications";
import React, { useEffect, useState } from "react";
import { trpc } from "../trpc";

export default function Trading() {
  const { notify } = useNotifications();

  const pricesQuery = trpc.market.prices.useQuery(undefined, { refetchInterval: 5000 });
  const placeOrder = trpc.market.placeOrder.useMutation();

  const [pair, setPair] = useState("BTC/USDT");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [price, setPrice] = useState(50000);
  const [qty, setQty] = useState(0.01);

  useEffect(() => {
    if (pricesQuery.data) {
      const btc = pricesQuery.data.find((p: any) => p.asset === "BTC");
      if (btc) setPrice(btc.price);
    }
  }, [pricesQuery.data]);

  return (
    <div>
      <h2>Trading</h2>
      <h3>Live Prices</h3>
      <ul>
        {pricesQuery.data?.map((p: any) => (
          <li key={p.asset}>
            {p.asset}: {p.price.toFixed(2)}
          </li>
        ))}
      </ul>

      <h3>Place Order</h3>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input value={pair} onChange={(e) => setPair(e.target.value)} />
        <select value={side} onChange={(e) => setSide(e.target.value as any)}>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
        <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        <input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
        <button
          onClick={() => {
            placeOrder.mutate({ pair, side, price, qty }, {
              onSuccess() { notify("success", "Order placed"); },
              onError(err) { notify("error", err.message); },
            });
          }}
        >
          Submit
        </button>
      </div>
    </div>
  );
}
