import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    
    // Get selected tenant from cookies
    const cookieStore = cookies();
    const tenantId = cookieStore.get('selected_tenant_id')?.value;
    
    if (!tenantId) {
      return NextResponse.json({
        todayOrders: 0,
        totalRevenue: 0,
        completedOrders: 0,
      });
    }
    
    // Get today's orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();

    // Fetch all orders and filter client-side (PocketBase relation filters don't work reliably)
    const allOrders = await pb.collection('orders').getList(1, 1000, {
      filter: `created >= "${todayStart}"`,
      sort: '-created',
    });

    // Filter by tenant
    const todayOrders = allOrders.items.filter((order: any) => {
      const orderTenantId = Array.isArray(order.tenantId) ? order.tenantId[0] : order.tenantId;
      return orderTenantId === tenantId;
    });

    const totalRevenue = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const completedOrders = todayOrders.filter((o) => o.status === 'completed').length;

    return NextResponse.json({
      todayOrders: todayOrders.length,
      totalRevenue,
      completedOrders,
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      {
        todayOrders: 0,
        totalRevenue: 0,
        completedOrders: 0,
      },
      { status: 500 }
    );
  }
}

