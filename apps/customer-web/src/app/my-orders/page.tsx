'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCustomerSession } from '@/lib/auth';
import { generateOrderSummaryPDF } from '@/lib/pdf-generator';

interface Order {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  taxCgst: number;
  taxSgst: number;
  taxIgst: number;
  channel: string;
  created: string;
  timestamps: Record<string, string>;
  expand?: {
    orderItem?: Array<{
      id: string;
      nameSnapshot: string;
      qty: number;
      unitPrice: number;
    }>;
  };
}

export default function MyOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const session = getCustomerSession();
    if (!session) {
      router.push('/login?redirect=/my-orders');
      return;
    }

    fetchOrders();
    
    // Refresh orders every 10 seconds
    const interval = setInterval(fetchOrders, 10000);
    
    return () => {
      clearInterval(interval);
    };
  }, [router]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('customer_auth_token');
      if (!token) {
        router.push('/login?redirect=/my-orders');
        return;
      }

      // Add cache-busting to ensure fresh data
      const response = await fetch(`/api/my-orders?t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
        },
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch orders');
      }

      // Update orders - this will trigger re-render if status changed
      setOrders(data.orders || []);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      placed: 'bg-blue-100 text-blue-800',
      accepted: 'bg-yellow-100 text-yellow-800',
      in_kitchen: 'bg-orange-100 text-orange-800',
      ready: 'bg-purple-100 text-purple-800',
      served: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      canceled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-accent-blue/5 to-accent-purple/5 bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent-blue/5 to-accent-purple/5 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <h1 className="text-3xl font-bold mb-6">My Orders</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 mb-4">You haven't placed any orders yet.</p>
            <Link
              href="/"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Menu
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Order #{order.id.slice(0, 8).toUpperCase()}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDate(order.created)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <p className="text-xl font-bold mt-2">
                      ₹{(order.total / 100).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-2">
                      Channel: <span className="font-medium">{order.channel}</span>
                    </p>
                    {order.expand?.orderItem && order.expand.orderItem.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">
                          Items ({order.expand.orderItem.length}):
                        </p>
                        <div className="space-y-1">
                          {order.expand.orderItem.slice(0, 3).map((item: any) => (
                            <div key={item.id} className="text-sm text-gray-600 flex justify-between">
                              <span>{item.nameSnapshot} × {item.qty}</span>
                              <span className="font-medium">₹{((item.unitPrice * item.qty) / 100).toFixed(2)}</span>
                            </div>
                          ))}
                          {order.expand.orderItem.length > 3 && (
                            <p className="text-xs text-gray-500 italic">
                              +{order.expand.orderItem.length - 3} more item(s)
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No items found</p>
                    )}
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        // Fetch full order details for PDF generation
                        fetch(`/api/orders/${order.id}`)
                          .then(res => res.json())
                          .then(data => {
                            if (data.order) {
                              generateOrderSummaryPDF(data.order);
                            } else {
                              alert('Failed to load order details for PDF');
                            }
                          })
                          .catch(err => {
                            console.error('Error fetching order for PDF:', err);
                            alert('Failed to generate PDF');
                          });
                      }}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download PDF
                    </button>
                    <Link
                      href={`/order/${order.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

