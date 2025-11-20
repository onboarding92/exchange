import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Wallet from "./pages/Wallet";
import Deposit from "./pages/Deposit";
import Withdraw from "./pages/Withdraw";
import Trading from "./pages/Trading";
import Profile from "./pages/Profile";
import Security from "./pages/Security";
import LoginHistory from "./pages/LoginHistory";
import Kyc from "./pages/Kyc";
import Prices from "./pages/Prices";
import DepositGateway from "./pages/DepositGateway";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminKyc from "./pages/AdminKyc";
import AdminLogs from "./pages/AdminLogs";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/wallet"} component={Wallet} />
      <Route path={"/deposit"} component={Deposit} />
      <Route path={"/deposit/gateway"} component={DepositGateway} />
      <Route path={"/withdraw"} component={Withdraw} />
      <Route path={"/trading"} component={Trading} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/security"} component={Security} />
      <Route path={"/login-history"} component={LoginHistory} />
      <Route path={"/kyc"} component={Kyc} />
      <Route path={"/prices"} component={Prices} />
      <Route path={"/admin-login"} component={AdminLogin} />
      <Route path={"/admin"} component={AdminDashboard} />
      <Route path={"/admin/kyc"} component={AdminKyc} />
      <Route path={"/admin/logs"} component={AdminLogs} />
      <Route path={"/404"} component={NotFound} />
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
