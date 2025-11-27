import React, { useEffect, useMemo, useState } from "react";
import { trpc } from "../trpc";
import { useNotifications } from "../notifications";

type OrderSide = "buy" | "sell";

export default function Trading() {
  const { notify } = useNotifications();

  const [baseAsset, setBaseAsset] = useState("BTC");
  const [quoteAsset, setQuoteAsset] = useState("USDT");
  const [side, setSide] = useState<OrderSide>("buy");
  const [price, setPrice] = useState<number>(0);
  const [amount, setAmount] = useState<number>(0.01);

  const tickersQuery = trpc.market.tickers.useQuery(undefined, {
    refetchInterval: 10_000,
  });

  const placeLimitOrder = trpc.trading.placeLimitOrder.useMutation();
  const cancelOrder = trpc.trading.cancelOrder.useMutation();

  const orderBookQuery = trpc.trading.orderBook.useQuery(
    { baseAsset, quoteAsset },
    {
      enabled: !!baseAsset && !!quoteAsset,
      refetchInterval: 3_000,
    }
  );

  const myOrdersQuery = trpc.trading.myOrders.useQuery();
  const myTradesQuery = trpc.trading.myTrades.useQuery();

  const assets = tickersQuery.data?.assets ?? [];
  const tickers = tickersQuery.data?.tickers ?? [];

  // Aggiorna il prezzo di default quando cambiamo baseAsset
  useEffect(() => {
    if (!tickers.length) return;
    const t = tickers.find((t: any) => t.symbol === baseAsset);
    if (t) {
      setPrice(t.priceUsd);
    }
  }, [tickers, baseAsset]);

  const onSubmit = () => {
    if (!baseAsset || !quoteAsset || !price || !amount) {
      notify("error", "Compila tutti i campi dell'ordine.");
      return;
    }

    placeLimitOrder.mutate(
      {
        baseAsset,
        quoteAsset,
        side,
        price: Number(price),
        amount: Number(amount),
      },
      {
        onSuccess: () => {
          notify("success", "Ordine inserito");
          myOrdersQuery.refetch();
          orderBookQuery.refetch();
        },
        onError: (err) => {
          notify("error", err.message || "Errore nell'inserimento ordine");
        },
      }
    );
  };

  const onCancelOrder = (id: number) => {
    cancelOrder.mutate(
      { id },
      {
        onSuccess: () => {
          notify("success", "Ordine cancellato");
          myOrdersQuery.refetch();
          orderBookQuery.refetch();
        },
        onError: (err) => {
          notify("error", err.message || "Errore nella cancellazione ordine");
        },
      }
    );
  };

  const pair = useMemo(() => `${baseAsset}/${quoteAsset}`, [baseAsset, quoteAsset]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Trading</h2>

      {/* Sezione ticker */}
      <section className="space-y-2">
        <h3 className="text-xl font-semibold">Mercato</h3>
        {tickersQuery.isLoading && <p>Caricamento prezzi...</p>}
        {tickersQuery.error && (
          <p className="text-red-500">
            Errore nel caricamento dei prezzi: {tickersQuery.error.message}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {assets.map((a: any) => {
            const t = tickers.find((t: any) => t.symbol === a.symbol);
            return (
              <div
                key={a.symbol}
                className="border rounded px-3 py-1 text-sm flex flex-col"
              >
                <span className="font-semibold">
                  {a.symbol} – {a.name}
                </span>
                <span>
                  {t ? t.priceUsd.toFixed(2) + " USD" : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Form ordine */}
      <section className="space-y-3 border rounded p-4">
        <h3 className="text-xl font-semibold">Nuovo ordine</h3>

        <div className="flex flex-wrap gap-3 items-center">
          <label className="flex flex-col text-sm">
            Coppia
            <div className="flex gap-1">
              <select
                className="border rounded px-2 py-1"
                value={baseAsset}
                onChange={(e) => setBaseAsset(e.target.value)}
              >
                {assets.map((a: any) => (
                  <option key={a.symbol} value={a.symbol}>
                    {a.symbol}
                  </option>
                ))}
              </select>
              <span className="self-center">/</span>
              <select
                className="border rounded px-2 py-1"
                value={quoteAsset}
                onChange={(e) => setQuoteAsset(e.target.value)}
              >
                {assets.map((a: any) => (
                  <option key={a.symbol} value={a.symbol}>
                    {a.symbol}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="flex flex-col text-sm">
            Side
            <select
              className="border rounded px-2 py-1"
              value={side}
              onChange={(e) => setSide(e.target.value as OrderSide)}
            >
              <option value="buy">BUY</option>
              <option value="sell">SELL</option>
            </select>
          </label>

          <label className="flex flex-col text-sm">
            Prezzo ({quoteAsset})
            <input
              type="number"
              className="border rounded px-2 py-1"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              step="0.0001"
              min="0"
            />
          </label>

          <label className="flex flex-col text-sm">
            Quantità ({baseAsset})
            <input
              type="number"
              className="border rounded px-2 py-1"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              step="0.0001"
              min="0"
            />
          </label>

          <button
            className="px-4 py-2 rounded bg-blue-600 text-white text-sm"
            onClick={onSubmit}
            disabled={placeLimitOrder.isLoading}
          >
            {placeLimitOrder.isLoading ? "Invio..." : `Invia ordine ${pair}`}
          </button>
        </div>
      </section>

      {/* Order book */}
      <section className="space-y-3">
        <h3 className="text-xl font-semibold">
          Order Book – {pair}
        </h3>
        {orderBookQuery.isLoading && <p>Caricamento order book...</p>}
        {orderBookQuery.error && (
          <p className="text-red-500">
            Errore nel caricamento dell&apos;order book:{" "}
            {orderBookQuery.error.message}
          </p>
        )}
        {orderBookQuery.data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-green-600 mb-1">Bids (Buy)</h4>
              <table className="w-full text-sm border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-2 py-1 text-left">Prezzo ({quoteAsset})</th>
                    <th className="px-2 py-1 text-left">Quantità ({baseAsset})</th>
                  </tr>
                </thead>
                <tbody>
                  {orderBookQuery.data.bids.map((b) => (
                    <tr key={`bid-${b.price}`}>
                      <td className="px-2 py-1">{b.price}</td>
                      <td className="px-2 py-1">{b.amount}</td>
                    </tr>
                  ))}
                  {orderBookQuery.data.bids.length === 0 && (
                    <tr>
                      <td className="px-2 py-2 text-center" colSpan={2}>
                        Nessun bid
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div>
              <h4 className="font-semibold text-red-600 mb-1">Asks (Sell)</h4>
              <table className="w-full text-sm border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-2 py-1 text-left">Prezzo ({quoteAsset})</th>
                    <th className="px-2 py-1 text-left">Quantità ({baseAsset})</th>
                  </tr>
                </thead>
                <tbody>
                  {orderBookQuery.data.asks.map((a) => (
                    <tr key={`ask-${a.price}`}>
                      <td className="px-2 py-1">{a.price}</td>
                      <td className="px-2 py-1">{a.amount}</td>
                    </tr>
                  ))}
                  {orderBookQuery.data.asks.length === 0 && (
                    <tr>
                      <td className="px-2 py-2 text-center" colSpan={2}>
                        Nessun ask
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* I miei ordini */}
      <section className="space-y-3">
        <h3 className="text-xl font-semibold">I miei ordini</h3>
        {myOrdersQuery.isLoading && <p>Caricamento ordini...</p>}
        {myOrdersQuery.error && (
          <p className="text-red-500">
            Errore nel caricamento degli ordini: {myOrdersQuery.error.message}
          </p>
        )}
        {myOrdersQuery.data && (
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1 text-left">ID</th>
                <th className="px-2 py-1 text-left">Coppia</th>
                <th className="px-2 py-1 text-left">Side</th>
                <th className="px-2 py-1 text-left">Prezzo</th>
                <th className="px-2 py-1 text-left">Quantità</th>
                <th className="px-2 py-1 text-left">Filled</th>
                <th className="px-2 py-1 text-left">Stato</th>
                <th className="px-2 py-1 text-left">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {myOrdersQuery.data.map((o) => (
                <tr key={o.id}>
                  <td className="px-2 py-1">{o.id}</td>
                  <td className="px-2 py-1">
                    {o.baseAsset}/{o.quoteAsset}
                  </td>
                  <td className="px-2 py-1">{o.side.toUpperCase()}</td>
                  <td className="px-2 py-1">
                    {o.price != null ? o.price : "—"}
                  </td>
                  <td className="px-2 py-1">{o.amount}</td>
                  <td className="px-2 py-1">{o.filledAmount}</td>
                  <td className="px-2 py-1">{o.status}</td>
                  <td className="px-2 py-1">
                    {o.status === "open" ? (
                      <button
                        className="px-2 py-1 text-xs rounded bg-red-500 text-white"
                        onClick={() => onCancelOrder(o.id)}
                        disabled={cancelOrder.isLoading}
                      >
                        Cancella
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {myOrdersQuery.data.length === 0 && (
                <tr>
                  <td className="px-2 py-2 text-center" colSpan={8}>
                    Nessun ordine
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    
{/* I miei trade */}
<section className="space-y-3 mt-6">
  <h3 className="text-xl font-semibold">I miei trade</h3>
  {myTradesQuery?.isLoading && <p>Caricamento trade...</p>}
  {myTradesQuery?.error && (
    <p className="text-red-500">
      Errore nel caricamento dei trade: {myTradesQuery.error.message}
    </p>
  )}
  {myTradesQuery?.data && (
    <table className="w-full text-sm border">
      <thead>
        <tr className="bg-gray-100">
          <th className="px-2 py-1 text-left">ID</th>
          <th className="px-2 py-1 text-left">Coppia</th>
          <th className="px-2 py-1 text-left">Prezzo</th>
          <th className="px-2 py-1 text-left">Quantità</th>
          <th className="px-2 py-1 text-left">Data</th>
        </tr>
      </thead>
      <tbody>
        {myTradesQuery.data.map((t) => (
          <tr key={t.id}>
            <td className="px-2 py-1">{t.id}</td>
            <td className="px-2 py-1">
              {t.baseAsset}/{t.quoteAsset}
            </td>
            <td className="px-2 py-1">{t.price}</td>
            <td className="px-2 py-1">{t.amount}</td>
            <td className="px-2 py-1">
              {new Date(t.createdAt).toLocaleString()}
            </td>
          </tr>
        ))}
        {myTradesQuery.data.length === 0 && (
          <tr>
            <td className="px-2 py-2 text-center" colSpan={5}>
              Nessun trade eseguito
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )}
</section>

</div>
  );
}
