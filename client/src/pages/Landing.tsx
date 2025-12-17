import React from "react";
import { Link } from "wouter";

export default function Landing() {
  return (
    <div style={{ minHeight: "100vh", background: "#0b0f17", color: "#e8eefc" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 18px" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 800, letterSpacing: 0.3 }}>BitChange</div>
          <nav style={{ display: "flex", gap: 14 }}>
            <a href="#features" style={{ color: "#b7c3dd", textDecoration: "none" }}>Features</a>
            <a href="#security" style={{ color: "#b7c3dd", textDecoration: "none" }}>Security</a>
            <Link href="/login" style={{ color: "#e8eefc", textDecoration: "none" }}>Login</Link>
          </nav>
        </header>

        <main style={{ padding: "56px 0 28px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 22 }}>
            <div>
              <h1 style={{ fontSize: 44, margin: 0, lineHeight: 1.05 }}>
                Crypto exchange MVP, <span style={{ color: "#78a6ff" }}>pronto da mostrare</span>
              </h1>
              <p style={{ marginTop: 14, color: "#b7c3dd", fontSize: 16, lineHeight: 1.6 }}>
                Trading, wallet, staking e area admin. Un’interfaccia pulita e una base tecnica solida (tRPC + TypeScript).
              </p>

              <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
                <Link
                  href="/app"
                  style={{
                    display: "inline-flex",
                    padding: "10px 14px",
                    background: "#2b5cff",
                    color: "white",
                    borderRadius: 10,
                    textDecoration: "none",
                    fontWeight: 700,
                  }}
                >
                  Apri dashboard
                </Link>
                <Link
                  href="/login"
                  style={{
                    display: "inline-flex",
                    padding: "10px 14px",
                    border: "1px solid #25314a",
                    color: "#e8eefc",
                    borderRadius: 10,
                    textDecoration: "none",
                    fontWeight: 700,
                  }}
                >
                  Accedi
                </Link>
              </div>

              <div id="features" style={{ marginTop: 34, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {[
                  { t: "Wallet", d: "Bilanci e movimenti utente" },
                  { t: "Trading", d: "Order book e storico trade" },
                  { t: "Staking", d: "Rewards e gestione staking" },
                ].map((x) => (
                  <div key={x.t} style={{ border: "1px solid #19233a", borderRadius: 14, padding: 14, background: "rgba(255,255,255,0.03)" }}>
                    <div style={{ fontWeight: 800 }}>{x.t}</div>
                    <div style={{ color: "#b7c3dd", marginTop: 6, fontSize: 13 }}>{x.d}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ border: "1px solid #19233a", borderRadius: 18, padding: 16, background: "rgba(255,255,255,0.03)" }}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Status</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: "#b7c3dd", lineHeight: 1.7 }}>
                <li>Backend online: /health</li>
                <li>API tRPC: /api</li>
                <li>UI: landing + dashboard</li>
              </ul>

              <div id="security" style={{ marginTop: 18, borderTop: "1px solid #19233a", paddingTop: 14 }}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Security baseline</div>
                <div style={{ color: "#b7c3dd", fontSize: 13, lineHeight: 1.6 }}>
                  Session cookies, rate limit e headers (Helmet). Per produzione reale servono audit, hardening e compliance.
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer style={{ padding: "18px 0", color: "#7f8aa3", fontSize: 12 }}>
          © {new Date().getFullYear()} BitChange — MVP demo.
        </footer>
      </div>
    </div>
  );
}
