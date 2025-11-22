/**
 * Utility functions for user management and access control
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'staff';
  isMaster?: boolean;
  tenants?: string[];
  expand?: {
    tenants?: Array<{ id: string; name: string }>;
  };
}

/**
 * Check if a user is a master user
 * Master users have isMaster=true OR role='admin'
 */
export function isMasterUser(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.isMaster === true || user.role === 'admin';
}

/**
 * Check if a user has access to a tenant
 * Master users have access to all tenants
 */
export function hasTenantAccess(user: User | null | undefined, tenantId: string): boolean {
  if (!user) return false;
  
  // Master users have access to all tenants
  if (isMasterUser(user)) return true;
  
  // Check if user has this tenant assigned
  const userTenants = user.tenants || [];
  return userTenants.includes(tenantId);
}

