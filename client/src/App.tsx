import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import LoginScreen from "@/components/LoginScreen";
import DashboardScreen from "@/components/DashboardScreen";
import DebtsListScreen from "@/components/DebtsListScreen";
import InvestmentsScreen from "@/components/InvestmentsScreen";
import StrategyScreen from "@/components/StrategyScreen";
import IncomesScreen from "@/components/IncomesScreen";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

function Router() {
  const [, setLocation] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && window.location.pathname !== "/") {
        setLocation("/");
      } else if (isAuthenticated && window.location.pathname === "/") {
        setLocation("/dashboard");
      }
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={LoginScreen} />
      <Route path="/dashboard" component={DashboardScreen} />
      <Route path="/debts" component={DebtsListScreen} />
      <Route path="/investments" component={InvestmentsScreen} />
      <Route path="/incomes" component={IncomesScreen} />
      <Route path="/strategy" component={StrategyScreen} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
