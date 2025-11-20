import { useNotifications } from "../notifications";
import React, { useState } from "react";
import { trpc } from "../trpc";
import { useLocation } from "wouter";

export default function Login() {
  const { notify } = useNotifications();
 {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("demo@bitchange.money");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess() {
      notify("success", "Logged in successfully");
      setLocation("/wallet");
    },
    onError(err) {
      setError(err.message);
      notify("error", err.message);
    },
  });

  return (
    <div style={{ maxWidth: 400 }}>
      <h2>Login</h2>
      <div style={{ display: "grid", gap: 8 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
        />
        <button onClick={() => loginMutation.mutate({ email, password })}>
          {loginMutation.isLoading ? "Logging in..." : "Login"}
        </button>
        {error && <p style={{ color: "salmon" }}>{error}</p>}
      </div>
    </div>
  );
}
