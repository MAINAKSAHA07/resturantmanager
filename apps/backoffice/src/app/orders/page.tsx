'use client';

import { useEffect, useState } from 'react';
import { ORDER_STATUSES } from '@restaurant/lib';

interface OrderItem {
  id: string;
  menuItemId: string;
  nameSnapshot: string;
  qty: number;
  unitPrice: number;
  optionsSnapshot?: any;
}

interface Order {
  id: string;
  status: string;
  total: number;
  channel: string;
  created: string;
  timestamps: Record<string, string>;
  items?: OrderItem[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchOrders();
    
    // Auto-refresh orders every 10 seconds to get new orders and updated items
    const interval = setInterval(() => {
      fetchOrders();
    }, 10000);
    
    return () => {
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const url = filterStatus !== 'all' 
        ? `/api/orders?status=${filterStatus}`
        : '/api/orders';
      
      console.log('Fetching orders from:', url);
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('Orders API response:', { status: response.status, data });
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch orders');
      }
      
      const ordersData = data.orders || [];
      console.log('Setting orders:', ordersData.length, 'orders');
      
      // Log order items for debugging
      ordersData.forEach((order: Order) => {
        const itemCount = order.items?.length || 0;
        console.log(`Order ${order.id.slice(0, 8)}: ${itemCount} items`, order.items);
        if (itemCount === 0) {
          console.warn(`⚠️  Order ${order.id.slice(0, 8)} has no items!`);
        }
      });
      
      setOrders(ordersData);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      alert(error.message || 'Failed to fetch orders. Please ensure a tenant is selected.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      if (response.ok) {
        fetchOrders();
      } else {
        throw new Error('Failed to update order');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order status');
    }
  };

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Orders</h1>

        <div className="mb-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Statuses</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {orders.length === 0 && !loading && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 mb-2">No orders found.</p>
            <p className="text-sm text-gray-500">Make sure you have selected a tenant and that orders exist for that tenant.</p>
          </div>
        )}

        {orders.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left">Order ID</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Items</th>
                  <th className="px-4 py-3 text-left">Channel</th>
                  <th className="px-4 py-3 text-left">Total</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const isExpanded = expandedOrders.has(order.id);
                  const orderItems = order.items || [];
                  
                  return (
                    <>
                      <tr key={order.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-sm">
                          {order.id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {orderItems.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-medium text-gray-700">
                                {orderItems.length} item{orderItems.length !== 1 ? 's' : ''}
                              </span>
                              <button
                                onClick={() => toggleOrderExpansion(order.id)}
                                className="text-xs text-blue-600 hover:text-blue-800 underline"
                              >
                                {isExpanded ? 'Hide details' : 'Show details'}
                              </button>
                              {!isExpanded && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {orderItems.slice(0, 2).map((item, idx) => (
                                    <div key={item.id}>
                                      {item.nameSnapshot} × {item.qty}
                                    </div>
                                  ))}
                                  {orderItems.length > 2 && (
                                    <div className="text-gray-400">+{orderItems.length - 2} more</div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400 italic">No items</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{order.channel}</td>
                        <td className="px-4 py-3 font-semibold">
                          ₹{((order.total || 0) / 100).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(order.created).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            className="px-2 py-1 border rounded text-sm"
                          >
                            {ORDER_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                      {isExpanded && orderItems.length > 0 && (
                        <tr key={`${order.id}-items`} className="bg-gray-50">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="ml-6">
                              <h4 className="font-semibold mb-3 text-sm text-gray-800">Order Items Details ({orderItems.length}):</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {orderItems.map((item) => (
                                  <div key={item.id} className="bg-white rounded-lg p-3 border border-gray-200">
                                    <div className="flex justify-between items-start mb-2">
                                      <span className="font-medium text-sm text-gray-800">
                                        {item.nameSnapshot}
                                      </span>
                                      <span className="font-semibold text-sm text-gray-900">
                                        ₹{((item.unitPrice * item.qty) / 100).toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="text-xs text-gray-600 space-y-1">
                                      <div>Quantity: {item.qty}</div>
                                      <div>Unit Price: ₹{(item.unitPrice / 100).toFixed(2)}</div>
                                      {item.optionsSnapshot && item.optionsSnapshot.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-gray-100">
                                          <div className="font-medium mb-1">Options:</div>
                                          {item.optionsSnapshot.map((opt: any, idx: number) => (
                                            <div key={idx} className="text-gray-500">
                                              {opt.groupId || 'Option'} - {Array.isArray(opt.valueIds) ? opt.valueIds.join(', ') : opt.valueIds}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      {isExpanded && orderItems.length === 0 && (
                        <tr key={`${order.id}-no-items`} className="bg-gray-50">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="ml-6 text-sm text-gray-500 italic">
                              No items found for this order
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}



