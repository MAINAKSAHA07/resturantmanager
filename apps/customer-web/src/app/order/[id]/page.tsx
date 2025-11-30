'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Script from 'next/script';
import Link from 'next/link';
import { getCustomerSession } from '@/lib/auth';
import { generateOrderSummaryPDF } from '@/lib/pdf-generator';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface OrderItem {
  id: string;
  nameSnapshot: string;
  qty: number;
  unitPrice: number;
  optionsSnapshot?: any;
}

interface Order {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  taxCgst: number;
  taxSgst: number;
  taxIgst: number;
  discountAmount?: number;
  couponId?: string | null;
  channel: string;
  created: string;
  timestamps: Record<string, string>;
  expand?: {
    locationId?: { name: string };
    orderItem?: OrderItem[];
  };
}

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    // Check authentication
    const session = getCustomerSession();
    if (!session) {
      router.push(`/login?redirect=/order/${orderId}`);
      return;
    }

    const fetchOrder = async () => {
      try {
        // Add cache-busting query parameter to ensure fresh data
        const response = await fetch(`/api/orders/${orderId}?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch order');
        }

        // Always update to ensure latest data is shown
        setOrder(data.order);
        console.log(`[Order Details] Order ${orderId} fetched:`, {
          status: data.order.status,
          total: data.order.total,
          subtotal: data.order.subtotal,
          taxCgst: data.order.taxCgst,
          taxSgst: data.order.taxSgst,
          taxIgst: data.order.taxIgst,
          discountAmount: data.order.discountAmount,
          couponId: data.order.couponId,
          hasDiscount: !!(data.order.discountAmount && data.order.discountAmount > 0),
        });
        setError('');
      } catch (err: any) {
        console.error('Error fetching order:', err);
        setError(err.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();

    // Poll for updates every 3 seconds (more frequent for better UX)
    const interval = setInterval(() => {
      fetchOrder();
    }, 3000);

    // Check if Razorpay is already loaded
    if (typeof window !== 'undefined' && window.Razorpay) {
      setRazorpayLoaded(true);
    }

    return () => {
      clearInterval(interval);
    };
  }, [orderId, router]);

  const handlePayment = async () => {
    if (!order) return;

    setProcessingPayment(true);
    try {
      // Create Razorpay order
      const paymentResponse = await fetch('/api/payments/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: order.total, orderId: order.id }),
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create payment order');
      }

      const { razorpay_order_id, key } = await paymentResponse.json();

      // Initialize Razorpay
      if (!window.Razorpay) {
        throw new Error('Razorpay SDK not loaded');
      }

      const options = {
        key,
        amount: order.total,
        currency: 'INR',
        name: 'Restaurant',
        description: 'Order Payment',
        order_id: razorpay_order_id,
        handler: async function (response: any) {
          try {
            // Capture payment
            const captureResponse = await fetch('/api/payments/razorpay/capture', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                orderId: order.id,
              }),
            });

            if (captureResponse.ok) {
              alert('Payment successful! Thank you for dining with us.');
              // Refresh order data immediately
              const res = await fetch(`/api/orders/${orderId}?t=${Date.now()}`, { cache: 'no-store' });
              const data = await res.json();
              if (res.ok) {
                setOrder(data.order);
              }
            } else {
              throw new Error('Payment capture failed');
            }
          } catch (error) {
            console.error('Payment error:', error);
            alert('Payment failed. Please try again.');
          }
        },
        prefill: {
          email: '',
          contact: '',
        },
        theme: {
          color: '#3399cc',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error('Payment initiation error:', error);
      alert(error.message || 'Failed to initiate payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-accent-blue/5 to-accent-purple/5 bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-accent-blue/5 to-accent-purple/5 bg-white flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold mb-4 text-red-600">Order Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The order you are looking for does not exist.'}</p>
          <Link
            href="/my-orders"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            View My Orders
          </Link>
        </div>
      </div>
    );
  }

  const statusSteps = [
    { key: 'placed', label: 'Order Placed' },
    { key: 'accepted', label: 'Order Accepted' },
    { key: 'in_kitchen', label: 'Preparing' },
    { key: 'ready', label: 'Ready' },
    { key: 'served', label: 'Served' },
    { key: 'completed', label: 'Completed' },
  ];

  const currentStepIndex = statusSteps.findIndex((step) => step.key === order.status);

  const orderItems = order.expand?.orderItem || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent-blue/5 to-accent-purple/5 bg-white">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayLoaded(true)}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div className="mb-6">
          <Link
            href="/my-orders"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back to My Orders
          </Link>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Order Tracking</h1>
          <button
            onClick={() => generateOrderSummaryPDF(order)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Order ID</p>
              <p className="font-mono text-sm">{order.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Order Date</p>
              <p className="text-sm">{new Date(order.created).toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Channel</p>
              <p className="text-sm font-medium">{order.channel}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-sm font-bold">{order.status.replace('_', ' ').toUpperCase()}</p>
            </div>
          </div>

          {orderItems.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-3 text-lg">Order Items ({orderItems.length})</h3>
              <div className="space-y-3">
                {orderItems.map((item: OrderItem) => (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-base">{item.nameSnapshot}</span>
                      <span className="font-semibold text-base">₹{((item.unitPrice * item.qty) / 100).toFixed(2)}</span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Quantity: {item.qty}</div>
                      <div>Unit Price: ₹{(item.unitPrice / 100).toFixed(2)}</div>
                      {item.optionsSnapshot && Array.isArray(item.optionsSnapshot) && item.optionsSnapshot.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="font-medium text-gray-700 mb-1">Options:</div>
                          {item.optionsSnapshot.map((opt: any, idx: number) => (
                            <div key={idx} className="text-gray-600">
                              {opt.groupId || 'Option'}: {Array.isArray(opt.valueIds) ? opt.valueIds.join(', ') : opt.valueIds}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {orderItems.length === 0 && (
            <div className="border-t pt-4 mt-4">
              <p className="text-sm text-gray-500 italic">No items found for this order</p>
            </div>
          )}

          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Subtotal</span>
              <span>₹{(order.subtotal / 100).toFixed(2)}</span>
            </div>
            {(order.taxCgst > 0 || order.taxSgst > 0) && (
              <>
                {order.taxCgst > 0 && (
                  <div className="flex justify-between text-sm mb-2">
                    <span>CGST</span>
                    <span>₹{(order.taxCgst / 100).toFixed(2)}</span>
                  </div>
                )}
                {order.taxSgst > 0 && (
                  <div className="flex justify-between text-sm mb-2">
                    <span>SGST</span>
                    <span>₹{(order.taxSgst / 100).toFixed(2)}</span>
                  </div>
                )}
              </>
            )}
            {order.taxIgst > 0 && (
              <div className="flex justify-between text-sm mb-2">
                <span>IGST</span>
                <span>₹{(order.taxIgst / 100).toFixed(2)}</span>
              </div>
            )}
            {order.discountAmount !== undefined && order.discountAmount !== null && order.discountAmount > 0 && (
              <div className="flex justify-between text-sm mb-2 text-green-600 font-medium">
                <span>Coupon Discount</span>
                <span>- ₹{(order.discountAmount / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-2 border-t-2 border-gray-300 mt-2">
              <span>Total Payable</span>
              <span className="text-accent-blue">₹{(order.total / 100).toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Button for Served Orders */}
          {order.status === 'served' && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={handlePayment}
                disabled={!razorpayLoaded || processingPayment}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-md transition-all transform hover:scale-[1.02]"
              >
                {processingPayment
                  ? 'Processing Payment...'
                  : !razorpayLoaded
                    ? 'Loading Payment System...'
                    : 'Pay & Complete Order'}
              </button>
              <p className="text-center text-sm text-gray-500 mt-2">
                Secure payment via Razorpay
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Order Status</h2>
          <div className="space-y-4">
            {statusSteps.map((step, index) => {
              const isCompleted = index <= currentStepIndex;
              const timestamp = order.timestamps?.[`${step.key}At`];

              return (
                <div key={step.key} className="flex items-center space-x-4">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${isCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                      }`}
                  >
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                    {timestamp && (
                      <p className="text-sm text-gray-500">
                        {new Date(timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}



