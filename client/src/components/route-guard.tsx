import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

export default function RouteGuard({ children, allowedRoles, redirectTo = "/" }: RouteGuardProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Don't redirect while still loading
    if (isLoading) return;
    
    if (user && !allowedRoles.includes(user.role)) {
      // Redirect facility owners to their dashboard if they try to access restricted pages
      if (user.role === "facility_owner") {
        setLocation("/facility-owner");
      } else {
        setLocation(redirectTo);
      }
    }
  }, [user, allowedRoles, redirectTo, setLocation, isLoading]);

  // Show loading state while auth is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Allow access if user is not logged in (for public pages) or has the right role
  if (!user || allowedRoles.includes(user.role)) {
    return <>{children}</>;
  }

  // Return null while redirecting
  return null;
}