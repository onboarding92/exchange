import SecuritySessions from "./pages/SecuritySessions";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import { Route, Switch } from "wouter";
import Landing from "./pages/Landing";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// UI / layout
import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";

// Pagine utente
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import AppShell from "./components/AppShell";
import Wallet from "./pages/Wallet";
import Deposit from "./pages/Deposit";
import DepositGateway from "./pages/DepositGateway";
import Withdraw from "./pages/Withdraw";
import InternalTransfer from "./pages/InternalTransfer";
import Trading from "./pages/Trading";
import Staking from "./pages/Staking";
import Promo from "./pages/Promo";
import Transactions from "./pages/Transactions";
import Support from "./pages/Support";
import Profile from "./pages/Profile";
import Security from "./pages/Security";
import LoginHistory from "./pages/LoginHistory";
import Kyc from "./pages/Kyc";
import Prices from "./pages/Prices";
import Login from "./pages/Login";


// Pagine admin
import AdminLogin from "./pages/AdminLogin";
import Admin from "./pages/Admin";
import AdminKyc from "./pages/AdminKyc";
import AdminLogs from "./pages/AdminLogs";
import AdminPayments from "./pages/AdminPayments";
import AdminPromos from "./pages/AdminPromos";
import AdminSupport from "./pages/AdminSupport";

// 404
import NotFound from "./pages/NotFound";

function Router() {
  return (
    <Switch>
      {/* User routes */}
      <Route path="/" component={Landing} />
      <Route path="/wallet" component={Wallet} />
      <Route path="/deposit" component={Deposit} />
      <Route path="/deposit/gateway" component={DepositGateway} />
      <Route path="/withdraw" component={Withdraw} />
      <Route path="/transfer" component={InternalTransfer} />
      <Route path="/trading" component={Trading} />
      <Route path="/staking" component={Staking} />
      <Route path="/promo" component={Promo} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/support" component={Support} />
      <Route path="/profile" component={Profile} />
      <Route path="/security" component={Security} />
      <Route path="/login-history" component={LoginHistory} />
      <Route path="/kyc" component={Kyc} />
      <Route path="/prices" component={Prices} />
      <Route path="/login" component={Login} />
      {/* App (exchange) */}
      <Route path="/app">
  <AppShell>
    <Home />
  </AppShell>
</Route>

<Route path="/app/wallet">
  <AppShell>
    <Wallet />
  </AppShell>
</Route>

<Route path="/app/trading">
  <AppShell>
    <Trading />
  </AppShell>
</Route>
      {/* Admin routes */}
      <Route path="/admin-login" component={AdminLogin} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/kyc" component={AdminKyc} />
      <Route path="/admin/logs" component={AdminLogs} />
      <Route path="/admin/payments" component={AdminPayments} />
      <Route path="/admin/promos" component={AdminPromos} />
      <Route path="/admin/support" component={AdminSupport} />

      {/* 404 */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
