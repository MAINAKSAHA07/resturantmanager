import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminPb } from '@/lib/server-utils';

export async function GET(request: NextRequest) {
  try {
    const pb = await getAdminPb();

    // Get selected tenant from cookies
    const cookieStore = cookies();
    const tenantId = cookieStore.get('selected_tenant_id')?.value;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant selected. Please select a tenant first.' },
        { status: 400 }
      );
    }

    // Check if tables collection exists
    let allTables;
    try {
      allTables = await pb.collection('tables').getList(1, 100);
    } catch (error: any) {
      if (error.status === 404) {
        console.warn('tables collection does not exist yet. Returning empty list.');
        return NextResponse.json({ tables: [] });
      }
      throw error;
    }

    // Filter by tenant (handle relation fields which may be arrays)
    const filteredTables = allTables.items.filter((table: any) => {
      const tableTenantId = Array.isArray(table.tenantId) ? table.tenantId[0] : table.tenantId;
      return tableTenantId === tenantId;
    });

    // Get active orders for each table
    // Fetch all active orders and filter client-side to avoid query string size limits
    let activeOrders: any[] = [];
    if (filteredTables.length > 0) {
      try {
        // Fetch all orders with active statuses (more efficient than filtering by tableId)
        const ordersResponse = await pb.collection('orders').getList(1, 500, {
          filter: '(status = "placed" || status = "accepted" || status = "in_kitchen" || status = "ready" || status = "served")',
        });

        // Filter to only orders for our tables
        const tableIds = new Set(filteredTables.map((t: any) => t.id));
        activeOrders = ordersResponse.items.filter((order: any) => {
          const orderTableId = Array.isArray(order.tableId) ? order.tableId[0] : order.tableId;
          return orderTableId && tableIds.has(orderTableId);
        });

        console.log(`[Tables API] Found ${activeOrders.length} active orders for ${filteredTables.length} tables`);
      } catch (error: any) {
        console.warn('Error fetching orders for tables:', error.message);
        // Continue without order info - tables will still be returned
      }
    }

    // Attach order info to tables
    const tablesWithOrders = filteredTables.map((table: any) => {
      const tableOrders = activeOrders.filter((order: any) => {
        const orderTableId = Array.isArray(order.tableId) ? order.tableId[0] : order.tableId;
        return orderTableId === table.id;
      });
      // Auto-correct status: If table has active orders but is marked available, show as seated
      let status = table.status;
      if (tableOrders.length > 0 && status === 'available') {
        status = 'seated';
      }

      return {
        ...table,
        status,
        activeOrders: tableOrders.length,
        orderTotal: tableOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0),
      };
    });

    console.log(`Found ${tablesWithOrders.length} tables for tenant ${tenantId}`);

    return NextResponse.json({ tables: tablesWithOrders });
  } catch (error: any) {
    console.error('Error fetching tables:', {
      message: error.message,
      status: error.status,
      response: error.response?.data,
    });
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tables' },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { name, capacity, x, y, locationId } = body;

    // Validate all required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Table name is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (!capacity || typeof capacity !== 'number' || capacity < 1) {
      return NextResponse.json(
        { error: 'Capacity is required and must be at least 1' },
        { status: 400 }
      );
    }

    if (!locationId || locationId === '') {
      return NextResponse.json(
        { error: 'Location is required. Please select a location.' },
        { status: 400 }
      );
    }

    // Get location to verify it belongs to tenant
    const location = await pb.collection('location').getOne(locationId);
    const locationTenantId = Array.isArray(location.tenantId) ? location.tenantId[0] : location.tenantId;

    if (locationTenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Location does not belong to selected tenant' },
        { status: 403 }
      );
    }

    // Generate qrToken if not provided
    const crypto = require('crypto');
    const qrToken = crypto.randomBytes(16).toString('hex');

    const tableData: any = {
      tenantId,
      locationId,
      name,
      capacity: Math.floor(capacity), // Ensure it's an integer
      status: 'available',
      x: x || 0,
      y: y || 0,
      qrToken, // Auto-generate QR token for new tables
    };

    const newTable = await pb.collection('tables').create(tableData);

    return NextResponse.json({ success: true, table: newTable });
  } catch (error: any) {
    console.error('Error creating table:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create table' },
      { status: error.status || 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const pb = await getAdminPb();

    const body = await request.json();
    const { tableId, x, y, status, name, capacity } = body;

    const updateData: any = {};
    if (x !== undefined && y !== undefined) {
      updateData.x = x;
      updateData.y = y;
    }
    if (status !== undefined) {
      updateData.status = status;
    }
    if (name !== undefined) {
      updateData.name = name;
    }
    if (capacity !== undefined) {
      updateData.capacity = parseInt(capacity);
    }

    await pb.collection('tables').update(tableId, updateData);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating table:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update table' },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const pb = await getAdminPb();

    const searchParams = request.nextUrl.searchParams;
    const tableId = searchParams.get('id');

    if (!tableId) {
      return NextResponse.json(
        { error: 'Table ID is required' },
        { status: 400 }
      );
    }

    // Check if table has active orders
    const orders = await pb.collection('orders').getList(1, 10, {
      filter: `tableId = "${tableId}" && (status = "placed" || status = "accepted" || status = "in_kitchen" || status = "ready" || status = "served")`,
    });

    if (orders.items.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete table with active orders' },
        { status: 400 }
      );
    }

    await pb.collection('tables').delete(tableId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting table:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete table' },
      { status: error.status || 500 }
    );
  }
}

