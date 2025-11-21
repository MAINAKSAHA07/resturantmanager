import { createPocketBaseAdminClient } from '@restaurant/lib';
import Link from 'next/link';

async function getDashboardStats() {
  try {
    const pb = await createPocketBaseAdminClient();
    
    // Get today's orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();

    const orders = await pb.collection('orders').getList(1, 1000, {
      filter: `created >= "${todayStart}"`,
    });

    const todayOrders = orders.items;
    const totalRevenue = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const completedOrders = todayOrders.filter((o) => o.status === 'completed').length;

    return {
      todayOrders: todayOrders.length,
      totalRevenue,
      completedOrders,
    };
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    // Return default values on error
    return {
      todayOrders: 0,
      totalRevenue: 0,
      completedOrders: 0,
    };
  }
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-600 mb-2">Today's Orders</h2>
            <p className="text-3xl font-bold">{stats.todayOrders}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-600 mb-2">Total Revenue</h2>
            <p className="text-3xl font-bold">₹{(stats.totalRevenue / 100).toFixed(2)}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-600 mb-2">Completed</h2>
            <p className="text-3xl font-bold">{stats.completedOrders}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/menu"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 text-center"
            >
              Manage Menu
            </Link>
            <Link
              href="/orders"
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 text-center"
            >
              View Orders
            </Link>
            <Link
              href="/kds"
              className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 text-center"
            >
              Kitchen Display
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}



