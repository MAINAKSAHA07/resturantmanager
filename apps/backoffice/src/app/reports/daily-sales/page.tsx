import { createPocketBaseAdminClient } from '@restaurant/lib';

export const dynamic = 'force-dynamic';

async function getDailySales() {
  const pb = await createPocketBaseAdminClient();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.toISOString();

  const orders = await pb.collection('orders').getList(1, 1000, {
    filter: `created >= "${todayStart}" && status = "completed"`,
  });

  const gross = orders.items.reduce((sum, order) => sum + order.total, 0);
  const tax = orders.items.reduce(
    (sum, order) => sum + order.taxCgst + order.taxSgst + order.taxIgst,
    0
  );
  const net = gross - tax;

  return {
    date: today.toISOString().split('T')[0],
    ordersCount: orders.items.length,
    gross,
    net,
    tax,
  };
}

export default async function DailySalesPage() {
  const stats = await getDailySales();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Daily Sales Report</h1>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600">Date</p>
            <p className="text-xl font-bold">{stats.date}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Orders</p>
              <p className="text-2xl font-bold">{stats.ordersCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Gross Revenue</p>
              <p className="text-2xl font-bold">₹{(stats.gross / 100).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Tax</p>
              <p className="text-2xl font-bold">₹{(stats.tax / 100).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Net Revenue</p>
              <p className="text-2xl font-bold">₹{(stats.net / 100).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



