import React from "react";
import { Route, Switch, Link, useLocation } from "wouter";
import { trpc } from "./trpc";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Wallet from "./pages/Wallet";
import Trading from "./pages/Trading";
import Staking from "./pages/Staking";
import Promo from "./pages/Promo";
import Support from "./pages/Support";
import Transactions from "./pages/Transactions";
import Admin from "./pages/Admin";

function LoginRequired() {
  const [, setLocation] = useLocation();
  return (
    <div>
      <p>You must be logged in to access this page.</p>
      <button onClick={() => setLocation("/login")}>Go to login</button>
    </div>
  );
}

function Forbidden() {
  return (
    <div>
      <h2>Access denied</h2>
      <p>You do not have permission to view this area.</p>
    </div>
  );
}

export default function App() {
  const meQuery = trpc.auth.me.useQuery();
  const user = meQuery.data?.user ?? null;

  const Protected =
    (Component: React.ComponentType) =>
    () =>
      meQuery.isLoading ? (
        <p>Loading...</p>
      ) : user ? (
        <Component />
      ) : (
        <LoginRequired />
      );

  const AdminRoute = () =>
    meQuery.isLoading ? (
      <p>Loading...</p>
    ) : !user ? (
      <LoginRequired />
    ) : user.role !== "admin" ? (
      <Forbidden />
    ) : (
      <Admin />
    );

  return (
    <div style={{ minHeight: "100vh", background: "#020617", color: "#e5e7eb", fontFamily: "system-ui, sans-serif" }}>
      <nav
        style={{
          display: "flex",
          padding: "10px 16px",
          borderBottom: "1px solid #1e293b",
          alignItems: "center",
          gap: 16,
        }}
      >
        <Link href="/">BitChange</Link>
        {user && (
          <>
            <Link href="/wallet">Wallet</Link>
            <Link href="/trading">Trading</Link>
            <Link href="/staking">Staking</Link>
            <Link href="/promo">Promo</Link>
            <Link href="/transactions">History</Link>
            <Link href="/support">Support</Link>
            {user.role === "admin" && <Link href="/admin">Admin</Link>}
          </>
        )}
        <div style={{ marginLeft: "auto" }}>
          {user ? (
            <span>Hi {user.email}</span>
          ) : (
            <Link href="/login">Login</Link>
          )}
        </div>
      </nav>
      <main style={{ padding: 16 }}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/login" component={Login} />
          <Route path="/wallet" component={Protected(Wallet)} />
          <Route path="/trading" component={Protected(Trading)} />
          <Route path="/staking" component={Protected(Staking)} />
          <Route path="/promo" component={Protected(Promo)} />
          <Route path="/transactions" component={Protected(Transactions)} />
          <Route path="/support" component={Protected(Support)} />
          <Route path="/admin" component={AdminRoute} />
          <Route>404 Not Found</Route>
        </Switch>
      </main>
    </div>
  );
}
