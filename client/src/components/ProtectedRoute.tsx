import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: "admin" | "coach" | "athlete" | "user";
  fallbackPath?: string;
}

/**
 * ProtectedRoute component wraps pages that require authentication
 * 
 * @param children - The component to render if authorized
 * @param requiredRole - The role required to access this route (optional)
 * @param fallbackPath - Where to redirect if not authorized (default: "/")
 */
export default function ProtectedRoute({
  children,
  requiredRole,
  fallbackPath = "/",
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Use effect to handle redirects - never call setLocation during render
  useEffect(() => {
    // Still loading auth state
    if (loading) {
      return;
    }

    // Not authenticated
    if (!user) {
      setLocation(fallbackPath);
      return;
    }

    // Check role if required
    if (requiredRole) {
      const hasAccess = checkRoleAccess(user.role, requiredRole);
      
      if (!hasAccess) {
        setLocation(fallbackPath);
        return;
      }
    }
  }, [user, loading, requiredRole, fallbackPath, setLocation]);

  // Still loading auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated or unauthorized - don't render children
  if (!user) {
    return null;
  }

  // Check role if required
  if (requiredRole) {
    const hasAccess = checkRoleAccess(user.role, requiredRole);
    
    if (!hasAccess) {
      return null;
    }
  }

  // Authorized - render children
  return <>{children}</>;
}

/**
 * Check if a user role has access to a required role
 */
function checkRoleAccess(userRole: string, requiredRole: string): boolean {
  // Admin has access to everything
  if (userRole === "admin") {
    return true;
  }

  // Coach can access coach routes
  if (requiredRole === "coach" && userRole === "coach") {
    return true;
  }

  // Athlete can access athlete routes
  if (requiredRole === "athlete" && userRole === "athlete") {
    return true;
  }

  // User role can access user routes
  if (requiredRole === "user" && (userRole === "athlete" || userRole === "coach")) {
    return true;
  }

  return false;
}
