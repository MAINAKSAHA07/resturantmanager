import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminPb } from '@/lib/server-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pb = await getAdminPb();
    const location = await pb.collection('location').getOne(params.id);

    return NextResponse.json({ location });
  } catch (error: any) {
    console.error('Error fetching location:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch location' },
      { status: error.status || 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pb = await getAdminPb();
    const cookieStore = cookies();
    const tenantId = cookieStore.get('selected_tenant_id')?.value;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant selected. Please select a tenant first.' },
        { status: 400 }
      );
    }

    // Get existing location to verify it belongs to tenant
    const existingLocation = await pb.collection('location').getOne(params.id);
    const locationTenantId = Array.isArray(existingLocation.tenantId) 
      ? existingLocation.tenantId[0] 
      : existingLocation.tenantId;

    if (locationTenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Location does not belong to selected tenant' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, stateCode, gstin, address, hours } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Location name is required' },
        { status: 400 }
      );
    }

    if (!stateCode || typeof stateCode !== 'string' || stateCode.trim() === '') {
      return NextResponse.json(
        { error: 'State code is required' },
        { status: 400 }
      );
    }

    if (!gstin || typeof gstin !== 'string' || gstin.trim() === '') {
      return NextResponse.json(
        { error: 'GSTIN is required' },
        { status: 400 }
      );
    }

    const updateData: any = {
      name: name.trim(),
      stateCode: stateCode.trim(),
      gstin: gstin.trim(),
    };

    if (address) {
      updateData.address = address;
    }

    if (hours) {
      updateData.hours = hours;
    }

    const updatedLocation = await pb.collection('location').update(params.id, updateData);

    return NextResponse.json({ success: true, location: updatedLocation });
  } catch (error: any) {
    console.error('Error updating location:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update location' },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pb = await getAdminPb();
    const cookieStore = cookies();
    const tenantId = cookieStore.get('selected_tenant_id')?.value;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant selected. Please select a tenant first.' },
        { status: 400 }
      );
    }

    // Get existing location to verify it belongs to tenant
    const existingLocation = await pb.collection('location').getOne(params.id);
    const locationTenantId = Array.isArray(existingLocation.tenantId) 
      ? existingLocation.tenantId[0] 
      : existingLocation.tenantId;

    if (locationTenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Location does not belong to selected tenant' },
        { status: 403 }
      );
    }

    // Check for all collections that reference this location
    const checks = {
      tables: 0,
      orders: 0,
      menuCategories: 0,
      menuItems: 0,
      reservations: 0,
      kdsTickets: 0,
    };

    console.log(`[DELETE Location] Checking references for location: ${params.id}`);

    try {
      // Check tables - locationId might be array or string
      try {
        const tables = await pb.collection('tables').getList(1, 1, {
          filter: `locationId = "${params.id}" || locationId ~ "${params.id}"`,
        });
        checks.tables = tables.totalItems;
        console.log(`[DELETE Location] Tables check: ${checks.tables} found`);
      } catch (e: any) {
        console.error('[DELETE Location] Error checking tables:', e.message);
      }

      // Check orders (required relation - most critical)
      try {
        const orders = await pb.collection('orders').getList(1, 1, {
          filter: `locationId = "${params.id}" || locationId ~ "${params.id}"`,
        });
        checks.orders = orders.totalItems;
        console.log(`[DELETE Location] Orders check: ${checks.orders} found`);
      } catch (e: any) {
        console.error('[DELETE Location] Error checking orders:', e.message);
      }

      // Check menu categories
      try {
        const menuCategories = await pb.collection('menuCategory').getList(1, 1, {
          filter: `locationId = "${params.id}" || locationId ~ "${params.id}"`,
        });
        checks.menuCategories = menuCategories.totalItems;
        console.log(`[DELETE Location] Menu categories check: ${checks.menuCategories} found`);
      } catch (e: any) {
        console.error('[DELETE Location] Error checking menu categories:', e.message);
      }

      // Check menu items
      try {
        const menuItems = await pb.collection('menuItem').getList(1, 1, {
          filter: `locationId = "${params.id}" || locationId ~ "${params.id}"`,
        });
        checks.menuItems = menuItems.totalItems;
        console.log(`[DELETE Location] Menu items check: ${checks.menuItems} found`);
      } catch (e: any) {
        console.error('[DELETE Location] Error checking menu items:', e.message);
      }

      // Check reservations
      try {
        const reservations = await pb.collection('reservation').getList(1, 1, {
          filter: `locationId = "${params.id}" || locationId ~ "${params.id}"`,
        });
        checks.reservations = reservations.totalItems;
        console.log(`[DELETE Location] Reservations check: ${checks.reservations} found`);
      } catch (e: any) {
        // Collection might not exist
        console.log('[DELETE Location] Reservation collection check skipped:', e.message);
      }

      // Check KDS tickets
      try {
        const kdsTickets = await pb.collection('kdsTicket').getList(1, 1, {
          filter: `locationId = "${params.id}" || locationId ~ "${params.id}"`,
        });
        checks.kdsTickets = kdsTickets.totalItems;
        console.log(`[DELETE Location] KDS tickets check: ${checks.kdsTickets} found`);
      } catch (e: any) {
        // Collection might not exist
        console.log('[DELETE Location] KDS ticket collection check skipped:', e.message);
      }

      console.log(`[DELETE Location] All checks completed:`, checks);
    } catch (error: any) {
      console.error('[DELETE Location] Error checking location references:', error);
      return NextResponse.json(
        { error: 'Failed to check location dependencies. Please try again.' },
        { status: 500 }
      );
    }

    // Build error message with all blocking references
    const blockingItems: string[] = [];
    if (checks.tables > 0) blockingItems.push(`${checks.tables} table(s)`);
    if (checks.orders > 0) blockingItems.push(`${checks.orders} order(s)`);
    if (checks.menuCategories > 0) blockingItems.push(`${checks.menuCategories} menu categor(ies)`);
    if (checks.menuItems > 0) blockingItems.push(`${checks.menuItems} menu item(s)`);
    if (checks.reservations > 0) blockingItems.push(`${checks.reservations} reservation(s)`);
    if (checks.kdsTickets > 0) blockingItems.push(`${checks.kdsTickets} KDS ticket(s)`);

    if (blockingItems.length > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete location. It is referenced by: ${blockingItems.join(', ')}. Please remove or reassign these items first.`,
          details: checks
        },
        { status: 400 }
      );
    }

    // All checks passed, proceed with deletion
    console.log(`[DELETE Location] All checks passed, attempting deletion of location: ${params.id}`);
    try {
      await pb.collection('location').delete(params.id);
      console.log(`[DELETE Location] Successfully deleted location: ${params.id}`);
      return NextResponse.json({ success: true });
    } catch (deleteError: any) {
      console.error('[DELETE Location] PocketBase delete error:', {
        message: deleteError.message,
        status: deleteError.status,
        response: deleteError.response,
        data: deleteError.data,
        responseData: deleteError.response?.data,
      });
      
      // Extract more detailed error information
      const errorMessage = deleteError.message || 'Failed to delete location';
      const errorData = deleteError.response?.data || deleteError.data;
      
      // If the error is about required relations, provide helpful message
      if (errorMessage.includes('required relation') || errorMessage.includes('relation reference')) {
        return NextResponse.json(
          { 
            error: 'Cannot delete location. It is still referenced by other records (orders, menu items, categories, or tables). Please remove or reassign all related records first.',
            details: checks,
            suggestion: 'Check the following: orders, menu categories, menu items, tables, reservations, and KDS tickets.'
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: errorData,
          checks: checks,
          suggestion: 'This location may be referenced by other records. Please check all related data and remove references first.'
        },
        { status: deleteError.status || 400 }
      );
    }
  } catch (error: any) {
    console.error('Error deleting location:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete location' },
      { status: error.status || 500 }
    );
  }
}

