import { trpc } from "@/lib/trpc";

/**
 * Hook to get the current user's client role
 * Returns 'viewer', 'user', 'admin', or null if not a client user
 */
export function useClientRole() {
  // Get user's client access list (includes roles)
  const { data: clientAccess } = trpc.clientPortal.getUserAccess.useQuery();

  // Return the first client role if user is a client user
  if (clientAccess && clientAccess.length > 0) {
    return clientAccess[0].role as 'viewer' | 'user' | 'admin';
  }

  return null;
}

/**
 * Helper function to check if user has a specific role
 */
export function hasRole(userRole: string | null, requiredRole: 'viewer' | 'user' | 'admin'): boolean {
  if (!userRole) return false;

  const roleHierarchy: Record<string, number> = {
    'viewer': 1,
    'user': 2,
    'admin': 3,
  };

  return (roleHierarchy[userRole] || 0) >= (roleHierarchy[requiredRole] || 0);
}

/**
 * Helper function to check if user can edit (not a viewer)
 */
export function canEdit(userRole: string | null): boolean {
  return hasRole(userRole, 'user');
}

/**
 * Helper function to check if user can download
 */
export function canDownload(userRole: string | null): boolean {
  return hasRole(userRole, 'user');
}
