import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL;
    const adminPassword = process.env.PB_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD must be set' }, { status: 500 });
    }

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

    // Calculate daily sales for the last 30 days
    const dailySalesMap = new Map<string, number>();
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    // Initialize all days in range with 0
    const daysToShow = range === '1d' ? 1 : range === '7d' ? 7 : 30;
    for (let i = 0; i < daysToShow; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      dailySalesMap.set(dateKey, 0);
    }

    // Aggregate sales by date
    todayOrders.forEach((order: any) => {
      const orderDate = new Date(order.created);
      const dateKey = orderDate.toISOString().split('T')[0];
      if (dailySalesMap.has(dateKey)) {
        dailySalesMap.set(dateKey, (dailySalesMap.get(dateKey) || 0) + (order.total || 0));
      }
    });

    // Convert to array and sort by date
    const dailySales = Array.from(dailySalesMap.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate orders by status (count and total value)
    const statusCounts = new Map<string, number>();
    const statusTotals = new Map<string, number>();
    todayOrders.forEach((order: any) => {
      const status = order.status || 'placed';
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
      statusTotals.set(status, (statusTotals.get(status) || 0) + (order.total || 0));
    });

    const ordersByStatus = Array.from(statusCounts.entries())
      .map(([status, count]) => ({ 
        status, 
        count,
        total: statusTotals.get(status) || 0
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending

    return NextResponse.json({
      todayOrders: todayOrders.length,
      totalRevenue,
      completedOrders,
      dailySales,
      ordersByStatus,
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

