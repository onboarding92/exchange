import React from "react";
import { Link } from "wouter";

export default function Home() {
  return (
    <div>
      <h1 style={{ margin: 0, fontSize: 28 }}>Dashboard</h1>
      <p style={{ color: "#b7c3dd", marginTop: 8 }}>
        Benvenuto su BitChange. Da qui puoi accedere alle sezioni principali.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 16 }}>
        {[
          { t: "Wallet", d: "Depositi, prelievi e bilanci", href: "/app/wallet" },
          { t: "Trading", d: "Ordini e storico trade", href: "/app/trading" },
          { t: "Staking", d: "Gestione staking e rewards", href: "/app/staking" },
          { t: "Transactions", d: "Movimenti e filtri", href: "/app/transactions" },
          { t: "Profile", d: "Impostazioni e sicurezza", href: "/app/profile" },
          { t: "Support", d: "Ticket e assistenza", href: "/app/support" },
        ].map((x) => (
          <Link key={x.t} href={x.href} style={{ textDecoration: "none" }}>
            <div style={{ border: "1px solid #19233a", borderRadius: 14, padding: 14, background: "rgba(255,255,255,0.02)", color: "#e8eefc" }}>
              <div style={{ fontWeight: 900 }}>{x.t}</div>
              <div style={{ color: "#b7c3dd", marginTop: 6, fontSize: 13 }}>{x.d}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
