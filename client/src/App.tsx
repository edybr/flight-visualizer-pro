import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import FlightDetail from "./pages/FlightDetail";
import SharedFlight from "./pages/SharedFlight";
import ActualFlights from "./pages/ActualFlights";
import ActualFlightDetail from "./pages/ActualFlightDetail";
import SharedActualFlight from "./pages/SharedActualFlight";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminFlights from "./pages/admin/AdminFlights";
import AdminLeads from "./pages/admin/AdminLeads";
import AdminRevenue from "./pages/admin/AdminRevenue";
import AdminPlans from "./pages/admin/AdminPlans";
import Plans from "./pages/Plans";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/app"} component={Dashboard} />
      <Route path={"/flights/:id"} component={FlightDetail} />
      <Route path={"/share/:token"} component={SharedFlight} />
      <Route path={"/app/actual"} component={ActualFlights} />
      <Route path={"/actual/:id"} component={ActualFlightDetail} />
      <Route path={"/share-actual/:token"} component={SharedActualFlight} />
      <Route path={"/planos"} component={Plans} />
      <Route path={"/admin"} component={AdminDashboard} />
      <Route path={"/admin/users"} component={AdminUsers} />
      <Route path={"/admin/flights"} component={AdminFlights} />
      <Route path={"/admin/leads"} component={AdminLeads} />
      <Route path={"/admin/revenue"} component={AdminRevenue} />
      <Route path={"/admin/plans"} component={AdminPlans} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
