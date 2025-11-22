/**
 * Script to check and verify user permissions
 * This can be used to audit user access
 */

import { User } from './user-utils';
import { getUserPermissions, hasPermission, canAccessRoute } from './permissions';

/**
 * Check user permissions and generate a report
 */
export function checkUserPermissions(user: User): {
  email: string;
  role: string;
  isMaster: boolean;
  permissions: string[];
  canAccess: Record<string, boolean>;
} {
  const permissions = getUserPermissions(user);
  
  // Check access to common routes
  const routes = [
    '/dashboard',
    '/menu',
    '/orders',
    '/kds',
    '/reservations',
    '/floorplan',
    '/users',
    '/reports',
  ];
  
  const canAccess: Record<string, boolean> = {};
  routes.forEach(route => {
    canAccess[route] = canAccessRoute(user, route);
  });
  
  return {
    email: user.email,
    role: user.role,
    isMaster: user.isMaster === true || user.role === 'admin',
    permissions,
    canAccess,
  };
}

/**
 * Validate user has correct permissions based on role
 */
export function validateUserPermissions(user: User): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Master users should have isMaster=true or role='admin'
  if (user.isMaster === true && user.role !== 'admin') {
    // This is fine - isMaster can be set independently
  }
  
  if (user.role === 'admin' && user.isMaster !== true) {
    // Admin role implies master, but isMaster flag might not be set
    // This is acceptable but could be normalized
  }
  
  // Staff should have tenants assigned (unless master)
  if (user.role === 'staff' && !user.isMaster && (!user.tenants || user.tenants.length === 0)) {
    issues.push('Staff user should have at least one tenant assigned');
  }
  
  // Manager should have tenants assigned (unless master)
  if (user.role === 'manager' && !user.isMaster && (!user.tenants || user.tenants.length === 0)) {
    issues.push('Manager user should have at least one tenant assigned');
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}

