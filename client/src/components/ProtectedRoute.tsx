import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: "admin" | "coach" | "athlete" | "parent" | "user";
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
      <div className="coach-dark min-h-screen flex items-center justify-center bg-background">
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
 * Check if a user role has access to a required role.
 *
 * Rules:
 *  - admin has access to every gated page (superuser).
 *  - coach, athlete, and parent each only match their own scope.
 *  - 'user' is the generic "any signed-in non-admin" bucket.
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

  // Parent can access parent routes
  if (requiredRole === "parent" && userRole === "parent") {
    return true;
  }

  // 'user' = any authenticated non-admin with a real app role
  if (
    requiredRole === "user" &&
    (userRole === "athlete" || userRole === "coach" || userRole === "parent")
  ) {
    return true;
  }

  return false;
}
