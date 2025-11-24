import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { getCurrentUser } from '@/lib/server-utils';
import { isMasterUser } from '@/lib/user-utils';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please log in to view tenants' },
        { status: 401 }
      );
    }

    // Only master users can view tenant details
    if (!isMasterUser(user)) {
      return NextResponse.json(
        { error: 'Forbidden: Only master users can view tenant details' },
        { status: 403 }
      );
    }

    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL;
    const adminPassword = process.env.PB_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      throw new Error('PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD must be set in environment variables');
    }

    const adminPb = new PocketBase(pbUrl);
    await adminPb.admins.authWithPassword(adminEmail, adminPassword);

    const tenant = await adminPb.collection('tenant').getOne(params.id);

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        key: tenant.key,
        primaryDomain: tenant.primaryDomain,
        adminDomain: tenant.adminDomain,
        theme: tenant.theme,
      }
    });
  } catch (error: any) {
    console.error('Error fetching tenant:', error);
    if (error.status === 404) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tenant' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please log in to edit tenants' },
        { status: 401 }
      );
    }

    // Only master users can edit tenants
    if (!isMasterUser(user)) {
      return NextResponse.json(
        { error: 'Forbidden: Only master users can edit tenants' },
        { status: 403 }
      );
    }

    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL;
    const adminPassword = process.env.PB_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      throw new Error('PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD must be set in environment variables');
    }

    const adminPb = new PocketBase(pbUrl);
    await adminPb.admins.authWithPassword(adminEmail, adminPassword);

    // Check if tenant exists
    try {
      await adminPb.collection('tenant').getOne(params.id);
    } catch (error: any) {
      if (error.status === 404) {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    const body = await request.json();
    const { key, name, primaryDomain, adminDomain, theme } = body;

    // Validate required fields
    if (key !== undefined && (!key || typeof key !== 'string' || key.trim() === '')) {
      return NextResponse.json(
        { error: 'Tenant key cannot be empty' },
        { status: 400 }
      );
    }

    if (name !== undefined && (!name || typeof name !== 'string' || name.trim() === '')) {
      return NextResponse.json(
        { error: 'Tenant name cannot be empty' },
        { status: 400 }
      );
    }

    if (primaryDomain !== undefined && (!primaryDomain || typeof primaryDomain !== 'string' || primaryDomain.trim() === '')) {
      return NextResponse.json(
        { error: 'Primary domain cannot be empty' },
        { status: 400 }
      );
    }

    if (adminDomain !== undefined && (!adminDomain || typeof adminDomain !== 'string' || adminDomain.trim() === '')) {
      return NextResponse.json(
        { error: 'Admin domain cannot be empty' },
        { status: 400 }
      );
    }

    // Check if key is being changed and if new key already exists
    if (key !== undefined) {
      try {
        const existingTenants = await adminPb.collection('tenant').getList(1, 1, {
          filter: `key = "${key.trim()}" && id != "${params.id}"`,
        });

        if (existingTenants.items.length > 0) {
          return NextResponse.json(
            { error: 'A tenant with this key already exists' },
            { status: 400 }
          );
        }
      } catch (checkError: any) {
        console.error('Error checking for existing tenant:', checkError);
      }
    }

    // Build update data
    const updateData: any = {};
    if (key !== undefined) updateData.key = key.trim();
    if (name !== undefined) updateData.name = name.trim();
    if (primaryDomain !== undefined) updateData.primaryDomain = primaryDomain.trim();
    if (adminDomain !== undefined) updateData.adminDomain = adminDomain.trim();
    if (theme !== undefined) updateData.theme = theme;

    // Update the tenant
    const updatedTenant = await adminPb.collection('tenant').update(params.id, updateData);

    console.log('Tenants API - Updated tenant:', {
      id: updatedTenant.id,
      name: updatedTenant.name,
      key: updatedTenant.key,
    });

    return NextResponse.json({
      success: true,
      tenant: {
        id: updatedTenant.id,
        name: updatedTenant.name,
        key: updatedTenant.key,
        primaryDomain: updatedTenant.primaryDomain,
        adminDomain: updatedTenant.adminDomain,
        theme: updatedTenant.theme,
      }
    });
  } catch (error: any) {
    console.error('Error updating tenant:', error);
    
    // Handle PocketBase validation errors
    if (error.response?.data) {
      const pbError = error.response.data;
      if (pbError.data) {
        const fieldErrors = Object.entries(pbError.data)
          .map(([field, message]) => `${field}: ${message}`)
          .join(', ');
        return NextResponse.json(
          { error: `Validation error: ${fieldErrors}` },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update tenant' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please log in to delete tenants' },
        { status: 401 }
      );
    }

    // Only master users can delete tenants
    if (!isMasterUser(user)) {
      return NextResponse.json(
        { error: 'Forbidden: Only master users can delete tenants' },
        { status: 403 }
      );
    }

    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL;
    const adminPassword = process.env.PB_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      throw new Error('PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD must be set in environment variables');
    }

    const adminPb = new PocketBase(pbUrl);
    await adminPb.admins.authWithPassword(adminEmail, adminPassword);

    // Check if tenant exists
    let tenant;
    try {
      tenant = await adminPb.collection('tenant').getOne(params.id);
    } catch (error: any) {
      if (error.status === 404) {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    // Check for references to this tenant
    const checks = {
      locations: 0,
      users: 0,
      orders: 0,
      menuCategories: 0,
      menuItems: 0,
      reservations: 0,
      tables: 0,
    };

    console.log(`[DELETE Tenant] Checking references for tenant: ${params.id}`);

    try {
      // Check locations
      try {
        const locations = await adminPb.collection('location').getList(1, 1, {
          filter: `tenantId = "${params.id}" || tenantId ~ "${params.id}"`,
        });
        checks.locations = locations.totalItems;
        console.log(`[DELETE Tenant] Locations check: ${checks.locations} found`);
      } catch (e: any) {
        console.error('[DELETE Tenant] Error checking locations:', e.message);
      }

      // Check users (tenants field)
      try {
        const users = await adminPb.collection('users').getList(1, 1, {
          filter: `tenants ~ "${params.id}"`,
        });
        checks.users = users.totalItems;
        console.log(`[DELETE Tenant] Users check: ${checks.users} found`);
      } catch (e: any) {
        console.error('[DELETE Tenant] Error checking users:', e.message);
      }

      // Check orders
      try {
        const orders = await adminPb.collection('orders').getList(1, 1, {
          filter: `tenantId = "${params.id}" || tenantId ~ "${params.id}"`,
        });
        checks.orders = orders.totalItems;
        console.log(`[DELETE Tenant] Orders check: ${checks.orders} found`);
      } catch (e: any) {
        console.error('[DELETE Tenant] Error checking orders:', e.message);
      }

      // Check menu categories
      try {
        const menuCategories = await adminPb.collection('menuCategory').getList(1, 1, {
          filter: `tenantId = "${params.id}" || tenantId ~ "${params.id}"`,
        });
        checks.menuCategories = menuCategories.totalItems;
        console.log(`[DELETE Tenant] Menu categories check: ${checks.menuCategories} found`);
      } catch (e: any) {
        console.error('[DELETE Tenant] Error checking menu categories:', e.message);
      }

      // Check menu items
      try {
        const menuItems = await adminPb.collection('menuItem').getList(1, 1, {
          filter: `tenantId = "${params.id}" || tenantId ~ "${params.id}"`,
        });
        checks.menuItems = menuItems.totalItems;
        console.log(`[DELETE Tenant] Menu items check: ${checks.menuItems} found`);
      } catch (e: any) {
        console.error('[DELETE Tenant] Error checking menu items:', e.message);
      }

      // Check reservations
      try {
        const reservations = await adminPb.collection('reservation').getList(1, 1, {
          filter: `tenantId = "${params.id}" || tenantId ~ "${params.id}"`,
        });
        checks.reservations = reservations.totalItems;
        console.log(`[DELETE Tenant] Reservations check: ${checks.reservations} found`);
      } catch (e: any) {
        console.log('[DELETE Tenant] Reservation collection check skipped:', e.message);
      }

      // Check tables
      try {
        const tables = await adminPb.collection('tables').getList(1, 1, {
          filter: `tenantId = "${params.id}" || tenantId ~ "${params.id}"`,
        });
        checks.tables = tables.totalItems;
        console.log(`[DELETE Tenant] Tables check: ${checks.tables} found`);
      } catch (e: any) {
        console.error('[DELETE Tenant] Error checking tables:', e.message);
      }

      console.log(`[DELETE Tenant] All checks completed:`, checks);
    } catch (error: any) {
      console.error('[DELETE Tenant] Error checking tenant references:', error);
      return NextResponse.json(
        { error: 'Failed to check tenant dependencies. Please try again.' },
        { status: 500 }
      );
    }

    // Build error message with all blocking references
    const blockingItems: string[] = [];
    if (checks.locations > 0) blockingItems.push(`${checks.locations} location(s)`);
    if (checks.users > 0) blockingItems.push(`${checks.users} user(s)`);
    if (checks.orders > 0) blockingItems.push(`${checks.orders} order(s)`);
    if (checks.menuCategories > 0) blockingItems.push(`${checks.menuCategories} menu categor(ies)`);
    if (checks.menuItems > 0) blockingItems.push(`${checks.menuItems} menu item(s)`);
    if (checks.reservations > 0) blockingItems.push(`${checks.reservations} reservation(s)`);
    if (checks.tables > 0) blockingItems.push(`${checks.tables} table(s)`);

    if (blockingItems.length > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete tenant. It is referenced by: ${blockingItems.join(', ')}. Please remove or reassign these items first.`,
          details: checks
        },
        { status: 400 }
      );
    }

    // All checks passed, proceed with deletion
    console.log(`[DELETE Tenant] All checks passed, attempting deletion of tenant: ${params.id}`);
    try {
      await adminPb.collection('tenant').delete(params.id);
      console.log(`[DELETE Tenant] Successfully deleted tenant: ${params.id}`);
      return NextResponse.json({ success: true, message: 'Tenant deleted successfully' });
    } catch (deleteError: any) {
      console.error('[DELETE Tenant] PocketBase delete error:', {
        message: deleteError.message,
        status: deleteError.status,
        response: deleteError.response,
      });
      
      const errorMessage = deleteError.message || 'Failed to delete tenant';
      
      if (errorMessage.includes('required relation') || errorMessage.includes('relation reference')) {
        return NextResponse.json(
          { 
            error: 'Cannot delete tenant. It is still referenced by other records. Please remove or reassign all related records first.',
            details: checks,
            suggestion: 'Check the following: locations, users, orders, menu categories, menu items, reservations, and tables.'
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: checks,
          suggestion: 'This tenant may be referenced by other records. Please check all related data and remove references first.'
        },
        { status: deleteError.status || 400 }
      );
    }
  } catch (error: any) {
    console.error('Error deleting tenant:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete tenant' },
      { status: error.status || 500 }
    );
  }
}

