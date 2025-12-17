import React, { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Placeholder: collega qui la chiamata tRPC quando vuoi
    console.log("login submit", { email, password });
    alert("Login placeholder: collega il backend (tRPC) qui.");
  }

  return (
    <div style={{ maxWidth: 420, margin: "48px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Login</h1>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>
        Accedi al tuo account BitChange.
      </p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="you@example.com"
            required
            style={{ padding: 10, borderRadius: 8, border: "1px solid #333" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="••••••••"
            required
            style={{ padding: 10, borderRadius: 8, border: "1px solid #333" }}
          />
        </label>

        <button
          type="submit"
          style={{
            padding: 10,
            borderRadius: 8,
            border: "1px solid #333",
            cursor: "pointer",
          }}
        >
          Accedi
        </button>
      </form>
    </div>
  );
}
