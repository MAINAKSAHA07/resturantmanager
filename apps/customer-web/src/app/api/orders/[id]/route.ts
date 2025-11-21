import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Direct PocketBase connection
    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    // Fetch order - don't use expand as it might not work reliably
    const order = await pb.collection('orders').getOne(id);

    // Fetch order items separately - use client-side filtering (PocketBase filters don't work reliably for relation fields)
    let orderItems = [];
    try {
      const allOrderItems = await pb.collection('orderItem').getList(1, 1000);
      
      // Filter by orderId client-side
      orderItems = allOrderItems.items.filter((item: any) => {
        const itemOrderId = Array.isArray(item.orderId) ? item.orderId[0] : item.orderId;
        return itemOrderId === id;
      });
      
      console.log(`Order ${id.slice(0, 8)}: Found ${orderItems.length} items`);
    } catch (e) {
      console.error('Error fetching order items:', e);
    }

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

