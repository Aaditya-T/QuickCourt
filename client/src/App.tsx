import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthContext, useAuthProvider } from "./lib/auth";
import RouteGuard from "@/components/route-guard";

import Home from "@/pages/home";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Facilities from "@/pages/facilities";
import Facility from "@/pages/facility";
import Matches from "@/pages/matches";
import Dashboard from "@/pages/dashboard";
import FacilityOwnerDashboard from "@/pages/facility-owner-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import NotFound from "@/pages/not-found";
import StripePayment from "@/pages/stripe-payment";
import PaymentSuccess from "@/pages/payment-success";


function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/facilities/:id">
        <RouteGuard allowedRoles={["user", "admin"]}>
          <Facility />
        </RouteGuard>
      </Route>
      <Route path="/facilities">
        <RouteGuard allowedRoles={["user", "admin"]}>
          <Facilities />
        </RouteGuard>
      </Route>
      <Route path="/matches">
        <RouteGuard allowedRoles={["user", "admin"]}>
          <Matches />
        </RouteGuard>
      </Route>
      <Route path="/dashboard">
        <RouteGuard allowedRoles={["user"]}>
          <Dashboard />
        </RouteGuard>
      </Route>
      <Route path="/facility-owner">
        <RouteGuard allowedRoles={["facility_owner"]}>
          <FacilityOwnerDashboard />
        </RouteGuard>
      </Route>
      <Route path="/admin">
        <RouteGuard allowedRoles={["admin"]}>
          <AdminDashboard />
        </RouteGuard>
      </Route>
      <Route path="/payment">
        <RouteGuard allowedRoles={["user", "facility_owner", "admin"]}>
          <StripePayment />
        </RouteGuard>
      </Route>
      <Route path="/stripe-payment">
        <RouteGuard allowedRoles={["user", "facility_owner", "admin"]}>
          <StripePayment />
        </RouteGuard>
      </Route>
      <Route path="/payment-success">
        <RouteGuard allowedRoles={["user"]}>
          <PaymentSuccess />
        </RouteGuard>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const auth = useAuthProvider();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthContext.Provider value={auth}>
          <Toaster />
          <Router />
        </AuthContext.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
