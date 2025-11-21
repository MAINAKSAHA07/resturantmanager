import { NextRequest, NextResponse } from 'next/server';
import { extractBrandKey } from '@restaurant/lib';
import PocketBase from 'pocketbase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get tenant from cookie or hostname
    const cookies = request.cookies;
    const tenantCookie = cookies.get('selected_tenant')?.value;
    const hostname = request.headers.get('host') || '';
    const extractedBrandKey = extractBrandKey(hostname);
    const brandKey = tenantCookie || extractedBrandKey || 'saffron';
    
    // Direct PocketBase connection
    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    // Get tenant ID
    const tenants = await pb.collection('tenant').getList(1, 1, {
      filter: `key = "${brandKey}"`,
    });

    if (tenants.items.length === 0) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const tenantId = tenants.items[0].id;

    // Fetch order - don't use expand as it might not work reliably
    const order = await pb.collection('orders').getOne(id);

    // Verify order belongs to the selected tenant
    const orderTenantId = Array.isArray(order.tenantId) ? order.tenantId[0] : order.tenantId;
    if (orderTenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Order not found or does not belong to this tenant' },
        { status: 404 }
      );
    }

    // Fetch order items separately - use client-side filtering (PocketBase filters don't work reliably for relation fields)
    const allOrderItems = await pb.collection('orderItem').getList(1, 1000);
    
    // Filter by orderId client-side
    const orderItems: any[] = allOrderItems.items.filter((item: any) => {
      const itemOrderId = Array.isArray(item.orderId) ? item.orderId[0] : item.orderId;
      return itemOrderId === id;
    });
    
    console.log(`Order ${id.slice(0, 8)}: Found ${orderItems.length} items`);

    // Fetch location separately if needed
    let location = null;
    if (order.locationId) {
      try {
        const locationId = Array.isArray(order.locationId) ? order.locationId[0] : order.locationId;
        location = await pb.collection('location').getOne(locationId);
      } catch (e) {
        console.error('Error fetching location:', e);
      }
    }

    // Return order with all data
    return NextResponse.json({ 
      order: {
        id: order.id,
        status: order.status,
        total: order.total,
        subtotal: order.subtotal,
        taxCgst: order.taxCgst,
        taxSgst: order.taxSgst,
        taxIgst: order.taxIgst,
        channel: order.channel,
        created: order.created,
        updated: order.updated,
        timestamps: order.timestamps || {},
        customerId: order.customerId,
        expand: {
          locationId: location,
          orderItem: orderItems,
        },
      }
    });
  } catch (error: any) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch order' },
      { status: error.status || 500 }
    );
  }
}

