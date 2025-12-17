import React from "react";
import { Link } from "wouter";

const nav = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/wallet", label: "Wallet" },
  { href: "/app/trading", label: "Trading" },
  { href: "/app/staking", label: "Staking" },
  { href: "/app/transactions", label: "Transactions" },
  { href: "/app/profile", label: "Profile" },
  { href: "/app/support", label: "Support" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0b0f17", color: "#e8eefc" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          borderBottom: "1px solid #19233a",
          background: "rgba(11,15,23,0.85)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontWeight: 900 }}>BitChange</div>
            <span style={{ fontSize: 12, color: "#7f8aa3" }}>Exchange MVP</span>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link href="/" style={{ color: "#b7c3dd", textDecoration: "none" }}>Landing</Link>
            <Link href="/login" style={{ color: "#e8eefc", textDecoration: "none" }}>Logout</Link>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "18px", display: "grid", gridTemplateColumns: "240px 1fr", gap: 18 }}>
        <aside style={{ border: "1px solid #19233a", borderRadius: 16, padding: 12, background: "rgba(255,255,255,0.03)", height: "fit-content" }}>
          <div style={{ fontSize: 12, color: "#7f8aa3", marginBottom: 10 }}>Navigation</div>
          <div style={{ display: "grid", gap: 8 }}>
            {nav.map((x) => (
              <Link
                key={x.href}
                href={x.href}
                style={{
                  display: "block",
                  padding: "10px 10px",
                  borderRadius: 12,
                  textDecoration: "none",
                  color: "#e8eefc",
                  border: "1px solid #19233a",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                {x.label}
              </Link>
            ))}
          </div>
        </aside>

        <main style={{ border: "1px solid #19233a", borderRadius: 16, padding: 16, background: "rgba(255,255,255,0.03)" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
