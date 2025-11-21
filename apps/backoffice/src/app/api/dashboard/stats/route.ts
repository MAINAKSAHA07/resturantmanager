import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
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

    // Get time range from query params (default: 1d)
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || '1d';

    // Calculate start date based on range
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0); // Start of today by default

    if (range === '7d') {
      startDate.setDate(startDate.getDate() - 6); // Last 7 days including today
    } else if (range === '30d') {
      startDate.setDate(startDate.getDate() - 29); // Last 30 days including today
    }

    // Format date for PocketBase (YYYY-MM-DD HH:mm:ss)
    const filterDate = startDate.toISOString().replace('T', ' ').replace('Z', '');

    // Fetch all orders and filter client-side (PocketBase relation filters don't work reliably)
    const allOrders = await pb.collection('orders').getList(1, 1000, {
      filter: `created >= "${filterDate}"`,
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

