# User Permissions Guide

## Overview

This document defines the permission system for the Restaurant Manager backoffice application. Master users (users with `isMaster=true` OR `role='admin'`) have **ALL permissions** and can access everything.

## User Roles

### 1. Master Users (`isMaster=true` OR `role='admin'`)
- **Full Access**: Can access and manage everything
- **Tenant Access**: Can access all tenants/restaurants
- **No Restrictions**: Bypass all permission checks

### 2. Admin (`role='admin'`)
- **Full Access**: Same as master users
- Can manage all aspects of the system
- Can create/edit/delete users
- Can manage tenants
- Can view all reports

### 3. Manager (`role='manager'`)
- **Operational Management**: Can manage day-to-day operations
- **Menu Management**: Full CRUD on menu items and categories
- **Orders**: Can view, create, edit, and cancel orders
- **KDS**: Can view and update kitchen display
- **Reservations**: Full CRUD on reservations
- **Floor Plan**: Can view and edit floor plans
- **Reports**: Can view all reports
- **Users**: Can view users but cannot create/edit/delete
- **Tenants**: Cannot manage tenants

### 4. Staff (`role='staff'`)
- **Limited Operations**: Basic operational access
- **Menu**: View only
- **Orders**: Can view, create, and edit orders
- **KDS**: Can view and update kitchen display
- **Reservations**: Can view, create, and edit reservations
- **Floor Plan**: View only
- **Users**: No access
- **Tenants**: No access
- **Reports**: No access

## Permission Matrix

| Feature | Master/Admin | Manager | Staff |
|---------|-------------|---------|-------|
| Dashboard | ✅ View | ✅ View | ✅ View |
| Menu - View | ✅ | ✅ | ✅ |
| Menu - Create/Edit/Delete | ✅ | ✅ | ❌ |
| Menu Categories - View | ✅ | ✅ | ❌ |
| Menu Categories - CRUD | ✅ | ✅ | ❌ |
| Orders - View | ✅ | ✅ | ✅ |
| Orders - Create/Edit | ✅ | ✅ | ✅ |
| Orders - Cancel | ✅ | ✅ | ❌ |
| Orders - Invoice | ✅ | ✅ | ❌ |
| KDS - View/Update | ✅ | ✅ | ✅ |
| Reservations - View | ✅ | ✅ | ✅ |
| Reservations - Create/Edit | ✅ | ✅ | ✅ |
| Reservations - Delete | ✅ | ✅ | ❌ |
| Floor Plan - View | ✅ | ✅ | ✅ |
| Floor Plan - Edit | ✅ | ✅ | ❌ |
| Users - View | ✅ | ✅ | ❌ |
| Users - Create/Edit/Delete | ✅ | ❌ | ❌ |
| Tenants - View | ✅ | ❌ | ❌ |
| Tenants - CRUD | ✅ | ❌ | ❌ |
| Reports - View | ✅ | ✅ | ❌ |
| Reports - Daily Sales | ✅ | ✅ | ❌ |
| Reports - GST Summary | ✅ | ✅ | ❌ |

## Permission Definitions

### Dashboard
- `dashboard.view` - View dashboard

### Menu
- `menu.view` - View menu items
- `menu.create` - Create menu items
- `menu.edit` - Edit menu items
- `menu.delete` - Delete menu items
- `menu.categories.view` - View categories
- `menu.categories.create` - Create categories
- `menu.categories.edit` - Edit categories
- `menu.categories.delete` - Delete categories

### Orders
- `orders.view` - View orders
- `orders.create` - Create orders
- `orders.edit` - Edit orders
- `orders.cancel` - Cancel orders
- `orders.invoice.view` - View invoices
- `orders.invoice.generate` - Generate invoices

### KDS
- `kds.view` - View kitchen display
- `kds.update` - Update order status

### Reservations
- `reservations.view` - View reservations
- `reservations.create` - Create reservations
- `reservations.edit` - Edit reservations
- `reservations.delete` - Delete reservations

### Floor Plan
- `floorplan.view` - View floor plan
- `floorplan.edit` - Edit floor plan

### Users
- `users.view` - View users
- `users.create` - Create users
- `users.edit` - Edit users
- `users.delete` - Delete users

### Tenants
- `tenants.view` - View tenants
- `tenants.create` - Create tenants
- `tenants.edit` - Edit tenants
- `tenants.delete` - Delete tenants

### Reports
- `reports.view` - View reports
- `reports.daily-sales` - View daily sales report
- `reports.gst-summary` - View GST summary report

## Usage in Code

```typescript
import { hasPermission, canAccessRoute, getUserPermissions } from '@/lib/permissions';
import { User } from '@/lib/user-utils';

// Check if user has a specific permission
if (hasPermission(user, 'menu.create')) {
  // Allow creating menu items
}

// Check if user can access a route
if (canAccessRoute(user, '/users')) {
  // Show users page
}

// Get all permissions for a user
const permissions = getUserPermissions(user);
```

## Important Notes

1. **Master users bypass all checks**: If `isMaster=true` OR `role='admin'`, all permission checks return `true`
2. **Tenant access**: Non-master users can only access data for their assigned tenants
3. **Role hierarchy**: Admin > Manager > Staff
4. **Backward compatibility**: Routes/actions not in the permission map are allowed by default

