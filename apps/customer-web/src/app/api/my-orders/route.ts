import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

export async function GET(request: NextRequest) {
  try {
    // Get customer ID from session token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let customerId: string;
    try {
      const token = authHeader.replace('Bearer ', '');
      const session = JSON.parse(Buffer.from(token, 'base64').toString());
      
      if (!session.customerId || session.exp < Date.now()) {
        return NextResponse.json(
          { error: 'Invalid or expired session' },
          { status: 401 }
        );
      }
      customerId = session.customerId;
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid session token' },
        { status: 401 }
      );
    }

    // Connect to PocketBase
    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    // Fetch orders for this customer - don't use expand as it might not work reliably
    // Fetch all orders and filter client-side because customerId might be stored as an array
    const allOrders = await pb.collection('orders').getList(1, 100, {
      sort: '-created',
    });
    
    // Filter by customerId (handle both string and array formats)
    const orders = {
      items: allOrders.items.filter((order: any) => {
        const orderCustomerId = Array.isArray(order.customerId) ? order.customerId[0] : order.customerId;
        return orderCustomerId === customerId;
      }),
    };

    // Fetch order items for each order - use client-side filtering
    const allOrderItems = await pb.collection('orderItem').getList(1, 1000);
    
    const ordersWithItems = await Promise.all(
      orders.items.map(async (order) => {
        let orderItems = [];
        try {
          // Filter by orderId client-side
          orderItems = allOrderItems.items.filter((item: any) => {
            const itemOrderId = Array.isArray(item.orderId) ? item.orderId[0] : item.orderId;
            return itemOrderId === order.id;
          });
          
          console.log(`Order ${order.id.slice(0, 8)}: Found ${orderItems.length} items`);
        } catch (e) {
          console.error(`Error fetching items for order ${order.id}:`, e);
        }

        return {
          id: order.id,
          status: order.status,
          total: order.total,
          subtotal: order.subtotal,
          taxCgst: order.taxCgst,
          taxSgst: order.taxSgst,
          taxIgst: order.taxIgst,
          channel: order.channel,
          created: order.created,
          updated: order.updated, // Include updated timestamp for change detection
          timestamps: order.timestamps || {},
          expand: {
            orderItem: orderItems,
          },
        };
      })
    );

    return NextResponse.json({
      success: true,
      orders: ordersWithItems,
    });
  } catch (error: any) {
    console.error('Error fetching customer orders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

