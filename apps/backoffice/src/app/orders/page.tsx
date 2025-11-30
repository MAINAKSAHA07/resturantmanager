'use client';

import { useEffect, useState } from 'react';
import { ORDER_STATUSES } from '@restaurant/lib';
import { PageHeader, Card, StatusPill, Select, Button, Tabs, TabsList, TabsTrigger } from '@restaurant/ui';

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
  tableId?: string;
  tableLabel?: string;
  items?: OrderItem[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterChannel, setFilterChannel] = useState<string>('dine_in'); // Default to Dine In
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterChannel]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const url = filterChannel !== 'all' 
        ? `/api/orders?channel=${filterChannel}`
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
      
      // Log order items for debugging and filter out invalid orders
      const validOrders: Order[] = [];
      ordersData.forEach((order: Order) => {
        const itemCount = order.items?.length || 0;
        if (itemCount === 0) {
          console.warn(`⚠️  Order ${order.id.slice(0, 8)} has no items! This order will be hidden from the list.`, {
            orderId: order.id,
            status: order.status,
            total: order.total,
            created: order.created,
          });
          // Don't add orders with no items to the list
          // This prevents UI issues and indicates a data integrity problem
        } else {
          console.log(`Order ${order.id.slice(0, 8)}: ${itemCount} items`, order.items);
          validOrders.push(order);
        }
      });
      
      // Use only valid orders (with items)
      const finalOrders = validOrders.length < ordersData.length 
        ? validOrders 
        : ordersData;
      
      if (validOrders.length < ordersData.length) {
        console.warn(`⚠️  Filtered out ${ordersData.length - validOrders.length} orders with no items`);
      }
      
      setOrders(finalOrders);
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

  const getStatusType = (status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'canceled':
      case 'refunded':
        return 'danger';
      case 'ready':
      case 'served':
        return 'info';
      case 'in_kitchen':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 to-accent-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto mb-4"></div>
          <p className="text-brand-600 font-medium">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-accent-50/30 to-brand-100/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <PageHeader
          title="Orders"
          subtitle={`Manage and track ${filterChannel === 'dine_in' ? 'dine-in' : filterChannel === 'pickup' ? 'delivery' : 'all'} orders`}
          actions={
            <Button onClick={fetchOrders} variant="secondary" size="sm" disabled={loading}>
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading...
                </>
              ) : (
                'Refresh'
              )}
            </Button>
          }
        />

        <div className="mb-6">
          <Tabs 
            defaultValue={filterChannel}
            value={filterChannel} 
            onChange={(value) => setFilterChannel(value)}
          >
            <TabsList className="bg-white border border-brand-200 shadow-sm rounded-lg p-1.5">
              <TabsTrigger value="all">All Orders</TabsTrigger>
              <TabsTrigger value="dine_in">Dine In</TabsTrigger>
              <TabsTrigger value="pickup">Delivery</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {orders.length === 0 && !loading && (
          <Card>
            <div className="text-center py-12">
              <div className="mb-4">
                <svg
                  className="mx-auto h-16 w-16 text-brand-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <p className="text-brand-700 mb-2 text-xl font-semibold">No orders found</p>
              <p className="text-sm text-brand-500 mb-4">
                {filterChannel === 'dine_in' 
                  ? 'No dine-in orders for the selected tenant.'
                  : filterChannel === 'pickup'
                  ? 'No delivery/pickup orders for the selected tenant.'
                  : 'Make sure you have selected a tenant and that orders exist for that tenant.'}
              </p>
              <Button onClick={fetchOrders} variant="secondary" size="sm">
                Refresh
              </Button>
            </div>
          </Card>
        )}

        {orders.length > 0 && (
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-gradient-to-r from-accent-500 to-accent-600 text-on-accent-500">
                <tr>
                  <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm">Order ID</th>
                  <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm">Status</th>
                  <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm">Items</th>
                  <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm hidden sm:table-cell">Channel</th>
                  <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm">Table</th>
                  <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm">Total</th>
                  <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm hidden md:table-cell">Created</th>
                  <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const isExpanded = expandedOrders.has(order.id);
                  const orderItems = order.items || [];
                  
                  return (
                    <>
                      <tr key={order.id} className="border-t border-brand-200 hover:bg-brand-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-sm text-brand-700">
                          {order.id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={getStatusType(order.status)} size="sm">
                            {order.status.replace('_', ' ')}
                          </StatusPill>
                        </td>
                        <td className="px-4 py-3">
                          {orderItems.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-medium text-brand-700">
                                {orderItems.length} item{orderItems.length !== 1 ? 's' : ''}
                              </span>
                              <button
                                onClick={() => toggleOrderExpansion(order.id)}
                                className="text-xs text-accent-500 hover:text-accent-600 font-medium transition-colors duration-200"
                              >
                                {isExpanded ? 'Hide details' : 'Show details'}
                              </button>
                              {!isExpanded && (
                                <div className="text-xs text-brand-500 mt-1">
                                  {orderItems.slice(0, 2).map((item, idx) => (
                                    <div key={item.id}>
                                      {item.nameSnapshot} × {item.qty}
                                    </div>
                                  ))}
                                  {orderItems.length > 2 && (
                                    <div className="text-brand-400">+{orderItems.length - 2} more</div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-brand-400 italic">No items</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-brand-700 hidden sm:table-cell">{order.channel}</td>
                        <td className="px-4 py-3 text-brand-700">
                          {order.tableLabel ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-accent-100 text-accent-700 text-xs font-medium">
                              🪑 {order.tableLabel}
                            </span>
                          ) : order.tableId ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-brand-100 text-brand-600 text-xs font-medium">
                              Table ID: {order.tableId.slice(0, 8)}
                            </span>
                          ) : (
                            <span className="text-brand-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-brand-900">
                          ₹{((order.total || 0) / 100).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-brand-600">
                          {new Date(order.created).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            options={ORDER_STATUSES.map((status) => ({
                              value: status,
                              label: status.replace('_', ' '),
                            }))}
                            className="text-sm min-w-[140px]"
                          />
                        </td>
                      </tr>
                      {isExpanded && orderItems.length > 0 && (
                        <tr key={`${order.id}-items`} className="bg-brand-50">
                          <td colSpan={8} className="px-4 py-3">
                            <div className="ml-6">
                              <h4 className="font-semibold mb-3 text-sm text-brand-800">Order Items Details ({orderItems.length}):</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {orderItems.map((item) => (
                                  <Card key={item.id} variant="outlined" padding="sm">
                                    <div className="flex justify-between items-start mb-2">
                                      <span className="font-medium text-sm text-brand-800">
                                        {item.nameSnapshot}
                                      </span>
                                      <span className="font-semibold text-sm text-brand-900">
                                        ₹{((item.unitPrice * item.qty) / 100).toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="text-xs text-brand-600 space-y-1">
                                      <div>Quantity: {item.qty}</div>
                                      <div>Unit Price: ₹{(item.unitPrice / 100).toFixed(2)}</div>
                                      {item.optionsSnapshot && item.optionsSnapshot.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-brand-200">
                                          <div className="font-medium mb-1 text-brand-700">Options:</div>
                                          {item.optionsSnapshot.map((opt: any, idx: number) => (
                                            <div key={idx} className="text-brand-500">
                                              {opt.groupId || 'Option'} - {Array.isArray(opt.valueIds) ? opt.valueIds.join(', ') : opt.valueIds}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      {isExpanded && orderItems.length === 0 && (
                        <tr key={`${order.id}-no-items`} className="bg-brand-50">
                          <td colSpan={8} className="px-4 py-3">
                            <div className="ml-6 text-sm text-brand-500 italic">
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
          </Card>
        )}
      </div>
    </div>
  );
}



