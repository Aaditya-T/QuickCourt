import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

export default function RouteGuard({ children, allowedRoles, redirectTo = "/" }: RouteGuardProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && !allowedRoles.includes(user.role)) {
      // Redirect facility owners to their dashboard if they try to access restricted pages
      if (user.role === "facility_owner") {
        setLocation("/facility-owner");
      } else {
        setLocation(redirectTo);
      }
    }
  }, [user, allowedRoles, redirectTo, setLocation]);

  // Allow access if user is not logged in (for public pages) or has the right role
  if (!user || allowedRoles.includes(user.role)) {
    return <>{children}</>;
  }

  // Return null while redirecting
  return null;
}