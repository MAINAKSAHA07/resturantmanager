/**
 * Permission definitions for user roles
 * Master users (isMaster=true OR role='admin') have ALL permissions
 */

import { User } from './user-utils';
import { isMasterUser } from './user-utils';

export type Permission = 
  // Dashboard & Overview
  | 'dashboard.view'
  
  // Menu Management
  | 'menu.view'
  | 'menu.create'
  | 'menu.edit'
  | 'menu.delete'
  | 'menu.categories.view'
  | 'menu.categories.create'
  | 'menu.categories.edit'
  | 'menu.categories.delete'
  
  // Orders
  | 'orders.view'
  | 'orders.create'
  | 'orders.edit'
  | 'orders.cancel'
  | 'orders.invoice.view'
  | 'orders.invoice.generate'
  
  // KDS (Kitchen Display System)
  | 'kds.view'
  | 'kds.update'
  
  // Reservations
  | 'reservations.view'
  | 'reservations.create'
  | 'reservations.edit'
  | 'reservations.delete'
  
  // Floor Plan
  | 'floorplan.view'
  | 'floorplan.edit'
  
  // Users Management
  | 'users.view'
  | 'users.create'
  | 'users.create.master' // Only master users can create master users
  | 'users.edit'
  | 'users.edit.master' // Only master users can edit master status
  | 'users.delete'
  
  // Tenants Management
  | 'tenants.view'
  | 'tenants.create'
  | 'tenants.edit'
  | 'tenants.delete'
  
  // Reports
  | 'reports.view'
  | 'reports.daily-sales'
  | 'reports.gst-summary';

/**
 * Role-based permission mappings
 * Master users automatically have all permissions
 */
const ROLE_PERMISSIONS: Record<'admin' | 'manager' | 'staff', Permission[]> = {
  admin: [
    // Admins have all permissions (same as master)
    'dashboard.view',
    'menu.view',
    'menu.create',
    'menu.edit',
    'menu.delete',
    'menu.categories.view',
    'menu.categories.create',
    'menu.categories.edit',
    'menu.categories.delete',
    'orders.view',
    'orders.create',
    'orders.edit',
    'orders.cancel',
    'orders.invoice.view',
    'orders.invoice.generate',
    'kds.view',
    'kds.update',
    'reservations.view',
    'reservations.create',
    'reservations.edit',
    'reservations.delete',
    'floorplan.view',
    'floorplan.edit',
    'users.view',
    'users.create',
    'users.create.master',
    'users.edit',
    'users.edit.master',
    'users.delete',
    'tenants.view',
    'tenants.create',
    'tenants.edit',
    'tenants.delete',
    'reports.view',
    'reports.daily-sales',
    'reports.gst-summary',
  ],
  
  manager: [
    // Managers can manage operations but not users/tenants
    'dashboard.view',
    'menu.view',
    'menu.create',
    'menu.edit',
    'menu.delete',
    'menu.categories.view',
    'menu.categories.create',
    'menu.categories.edit',
    'menu.categories.delete',
    'orders.view',
    'orders.create',
    'orders.edit',
    'orders.cancel',
    'orders.invoice.view',
    'orders.invoice.generate',
    'kds.view',
    'kds.update',
    'reservations.view',
    'reservations.create',
    'reservations.edit',
    'reservations.delete',
    'floorplan.view',
    'floorplan.edit',
    'users.view', // Can view but not manage
    'reports.view',
    'reports.daily-sales',
    'reports.gst-summary',
  ],
  
  staff: [
    // Staff have limited operational permissions
    'dashboard.view',
    'menu.view',
    'menu.edit', // Staff can edit menu items (e.g., availability status only)
    'orders.view',
    'orders.create',
    'orders.edit',
    'kds.view',
    'kds.update',
    'reservations.view',
    'reservations.create',
    'reservations.edit',
    'floorplan.view',
  ],
};

/**
 * Check if a user has a specific permission
 * Master users always have all permissions
 */
export function hasPermission(user: User | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  
  // Master users have all permissions
  if (isMasterUser(user)) return true;
  
  // Check role-based permissions
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  return rolePermissions.includes(permission);
}

/**
 * Check if user has any of the given permissions
 */
export function hasAnyPermission(user: User | null | undefined, permissions: Permission[]): boolean {
  if (!user) return false;
  if (isMasterUser(user)) return true;
  
  return permissions.some(permission => hasPermission(user, permission));
}

/**
 * Check if user has all of the given permissions
 */
export function hasAllPermissions(user: User | null | undefined, permissions: Permission[]): boolean {
  if (!user) return false;
  if (isMasterUser(user)) return true;
  
  return permissions.every(permission => hasPermission(user, permission));
}

/**
 * Get all permissions for a user
 */
export function getUserPermissions(user: User | null | undefined): Permission[] {
  if (!user) return [];
  
  // Master users have all permissions
  if (isMasterUser(user)) {
    return Object.values(ROLE_PERMISSIONS).flat().filter((v, i, a) => a.indexOf(v) === i) as Permission[];
  }
  
  return ROLE_PERMISSIONS[user.role] || [];
}

/**
 * Route-based permission checks
 * Maps routes to required permissions
 */
export const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  '/dashboard': ['dashboard.view'],
  '/menu': ['menu.view'],
  '/menu/categories': ['menu.categories.view'],
  '/menu/items': ['menu.view'],
  '/orders': ['orders.view'],
  '/kds': ['kds.view'],
  '/reservations': ['reservations.view'],
  '/floorplan': ['floorplan.view'],
  '/users': ['users.view'],
  '/reports': ['reports.view'],
  '/reports/daily-sales': ['reports.daily-sales'],
  '/reports/gst-summary': ['reports.gst-summary'],
};

/**
 * Check if user can access a route
 */
export function canAccessRoute(user: User | null | undefined, route: string): boolean {
  if (!user) return false;
  if (isMasterUser(user)) return true;
  
  const requiredPermissions = ROUTE_PERMISSIONS[route];
  if (!requiredPermissions || requiredPermissions.length === 0) {
    // If route not in map, allow access (for backward compatibility)
    return true;
  }
  
  return hasAnyPermission(user, requiredPermissions);
}

/**
 * API action permissions
 */
export const API_PERMISSIONS: Record<string, Permission[]> = {
  'GET /api/menu': ['menu.view'],
  'POST /api/menu': ['menu.create'],
  'PATCH /api/menu': ['menu.edit'],
  'DELETE /api/menu': ['menu.delete'],
  
  'GET /api/menu/items': ['menu.view'],
  'POST /api/menu/items': ['menu.create'],
  'PATCH /api/menu/items': ['menu.edit'],
  'PUT /api/menu/items': ['menu.edit'],
  'DELETE /api/menu/items': ['menu.delete'],
  
  'GET /api/menu/categories': ['menu.categories.view'],
  'POST /api/menu/categories': ['menu.categories.create'],
  'PATCH /api/menu/categories': ['menu.categories.edit'],
  'DELETE /api/menu/categories': ['menu.categories.delete'],
  
  'GET /api/orders': ['orders.view'],
  'POST /api/orders': ['orders.create'],
  'PATCH /api/orders': ['orders.edit'],
  'DELETE /api/orders': ['orders.cancel'],
  
  'GET /api/kds': ['kds.view'],
  'PATCH /api/kds': ['kds.update'],
  
  'GET /api/reservations': ['reservations.view'],
  'POST /api/reservations': ['reservations.create'],
  'PATCH /api/reservations': ['reservations.edit'],
  'DELETE /api/reservations': ['reservations.delete'],
  
  'GET /api/users': ['users.view'],
  'POST /api/users': ['users.create'],
  'PATCH /api/users': ['users.edit'],
  'DELETE /api/users': ['users.delete'],
  
  'GET /api/tenants': ['tenants.view'],
  'POST /api/tenants': ['tenants.create'],
  'PATCH /api/tenants': ['tenants.edit'],
  'DELETE /api/tenants': ['tenants.delete'],
};

/**
 * Check if user can perform an API action
 */
export function canPerformAction(user: User | null | undefined, method: string, path: string): boolean {
  if (!user) return false;
  if (isMasterUser(user)) return true;
  
  // Normalize path: remove dynamic segments like [id] and trailing slashes
  const normalizedPath = path
    .replace(/\/\[.*?\]/g, '') // Remove [id], [slug], etc.
    .replace(/\/$/, ''); // Remove trailing slash
  
  const actionKey = `${method} ${normalizedPath}`;
  const requiredPermissions = API_PERMISSIONS[actionKey];
  
  if (!requiredPermissions || requiredPermissions.length === 0) {
    // If action not in map, allow access (for backward compatibility)
    return true;
  }
  
  return hasAnyPermission(user, requiredPermissions);
}

