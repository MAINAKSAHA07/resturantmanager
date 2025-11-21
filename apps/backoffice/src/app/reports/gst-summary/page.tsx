import { createPocketBaseAdminClient } from '@restaurant/lib';

async function getGSTSummary() {
  const pb = await createPocketBaseAdminClient();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.toISOString();

  const orders = await pb.collection('orders').getList(1, 1000, {
    filter: `created >= "${todayStart}" && status = "completed"`,
  });

  const summary = {
    cgst: orders.items.reduce((sum, order) => sum + order.taxCgst, 0),
    sgst: orders.items.reduce((sum, order) => sum + order.taxSgst, 0),
    igst: orders.items.reduce((sum, order) => sum + order.taxIgst, 0),
    totalTax: orders.items.reduce(
      (sum, order) => sum + order.taxCgst + order.taxSgst + order.taxIgst,
      0
    ),
  };

  return summary;
}

export default async function GSTSummaryPage() {
  const summary = await getGSTSummary();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">GST Summary</h1>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">CGST</p>
              <p className="text-2xl font-bold">₹{(summary.cgst / 100).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">SGST</p>
              <p className="text-2xl font-bold">₹{(summary.sgst / 100).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">IGST</p>
              <p className="text-2xl font-bold">₹{(summary.igst / 100).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Tax</p>
              <p className="text-2xl font-bold">₹{(summary.totalTax / 100).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



