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
 * Admins (role='admin') are treated as master users and have access to all tenants
 */
export function isMasterUser(user: User | null | undefined): boolean {
  if (!user) return false;
  // Users with isMaster=true are master users
  if (user.isMaster === true) return true;
  // Users with role='admin' are also treated as master users
  if (user.role === 'admin') return true;
  return false;
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

// Re-export permissions for convenience
export * from './permissions';

