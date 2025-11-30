'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import Link from 'next/link';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('cod');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('customer_auth_token');
    if (!token) {
      router.push(`/login?redirect=${encodeURIComponent('/checkout')}`);
      return;
    }
    setIsAuthenticated(true);
    setCheckingAuth(false);

    // Load applied coupon from localStorage (set by cart page)
    const savedCoupon = localStorage.getItem('applied_coupon');
    if (savedCoupon) {
      try {
        const coupon = JSON.parse(savedCoupon);
        setAppliedCoupon(coupon);
      } catch (error) {
        localStorage.removeItem('applied_coupon');
      }
    }

    // Check if Razorpay script is loaded
    if (typeof window !== 'undefined' && window.Razorpay) {
      setRazorpayLoaded(true);
    }
  }, [router]);


  const handleCheckout = async () => {
    setLoading(true);
    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');

      // Get auth token
      const token = localStorage.getItem('customer_auth_token');
      if (!token) {
        router.push(`/login?redirect=${encodeURIComponent('/checkout')}`);
        return;
      }

      // Only use coupon if explicitly applied by user (from state)
      let couponCodeToSend = null;
      if (appliedCoupon?.code) {
        couponCodeToSend = appliedCoupon.code;
      }

      // Get table context from cookie to pass in request
      let tableContextFromCookie = null;
      try {
        const cookies = document.cookie.split(';');
        const tableContextCookie = cookies.find(c => c.trim().startsWith('tableContext='));
        if (tableContextCookie) {
          const value = tableContextCookie.split('=').slice(1).join('=');
          tableContextFromCookie = JSON.parse(decodeURIComponent(value));
          console.log('[Checkout] Found table context:', tableContextFromCookie);
        }
      } catch (e) {
        console.warn('[Checkout] Failed to read table context from cookie:', e);
      }

      // Create order with coupon if applied
      const orderResponse = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: cart,
          couponCode: couponCodeToSend,
          comment: comment.trim() || null,
          // Pass table context explicitly in body as fallback
          tableContext: tableContextFromCookie,
        }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json().catch(() => ({}));
        console.error('[Checkout] Order creation failed:', {
          status: orderResponse.status,
          error: errorData.error || errorData.message || 'Unknown error',
          details: errorData,
        });
        throw new Error(errorData.error || errorData.message || 'Failed to create order');
      }

      const orderData = await orderResponse.json();

      // Warn if coupon was sent but discount is 0
      if (couponCodeToSend && (!orderData.discountAmount || orderData.discountAmount === 0)) {
        console.warn('[Checkout] Coupon was sent but discount is 0');
      }

      if (!orderData.orderId) {
        const errorMsg = orderData.error || 'Failed to create order';
        throw new Error(errorMsg);
      }

      const { orderId, amount } = orderData;

      // If Cash on Delivery, skip payment and redirect
      if (paymentMethod === 'cod') {
        localStorage.removeItem('cart');
        localStorage.removeItem('applied_coupon'); // Clear applied coupon after order
        window.dispatchEvent(new Event('cartUpdated'));
        router.push(`/order/${orderId}`);
        return;
      }

      // Razorpay payment flow
      if (!amount) {
        throw new Error('Order amount is required for payment');
      }

      // Create Razorpay order
      const paymentResponse = await fetch('/api/payments/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, orderId }),
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json().catch(() => ({}));
        if (paymentResponse.status === 503) {
          // Razorpay not configured, fallback to COD
          alert('Online payment is not available. Placing order without payment.');
          localStorage.removeItem('cart');
          localStorage.removeItem('applied_coupon'); // Clear applied coupon after order
          window.dispatchEvent(new Event('cartUpdated'));
          router.push(`/order/${orderId}`);
          return;
        }
        throw new Error(errorData.error || 'Failed to create payment order');
      }

      const { razorpay_order_id, key } = await paymentResponse.json();

      // Initialize Razorpay
      if (!window.Razorpay) {
        throw new Error('Razorpay SDK not loaded');
      }

      const options = {
        key,
        amount,
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
                orderId,
              }),
            });

            if (captureResponse.ok) {
              localStorage.removeItem('cart');
              localStorage.removeItem('applied_coupon'); // Clear applied coupon after order
              window.dispatchEvent(new Event('cartUpdated'));
              router.push(`/order/${orderId}`);
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
      console.error('Checkout error:', error);
      const errorMessage = error?.message || error?.error || 'Checkout failed. Please try again.';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-accent-blue/5 to-accent-purple/5 bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent-blue/5 to-accent-purple/5 bg-white flex items-center justify-center py-12">
      {paymentMethod === 'razorpay' && (
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          onLoad={() => setRazorpayLoaded(true)}
        />
      )}
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">Checkout</h1>
        <p className="text-gray-600 mb-6">
          Choose your payment method
        </p>

        {/* Applied Coupon Display */}
        {appliedCoupon && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-green-800">Coupon Applied: {appliedCoupon.code}</span>
                <span className="text-sm text-green-600 ml-2 block mt-1">
                  Discount: ₹{(appliedCoupon.discountAmount / 100).toFixed(2)}
                </span>
              </div>
              <Link
                href="/cart"
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                Change
              </Link>
            </div>
          </div>
        )}

        {/* Order Comments */}
        <div className="mb-6">
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
            Order Comments / Instructions
          </label>
          <textarea
            id="comment"
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            placeholder="E.g., No onions, extra spicy, allergy info..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        {/* Payment Method Selection */}
        <div className="mb-6 space-y-3">
          <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
            <input
              type="radio"
              name="paymentMethod"
              value="cod"
              checked={paymentMethod === 'cod'}
              onChange={(e) => setPaymentMethod(e.target.value as 'cod')}
              className="mr-3"
            />
            <div className="flex-1">
              <div className="font-semibold">Place Order</div>
              <div className="text-sm text-gray-600">Pay at restaurant or on delivery</div>
            </div>
          </label>

          <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
            <input
              type="radio"
              name="paymentMethod"
              value="razorpay"
              checked={paymentMethod === 'razorpay'}
              onChange={(e) => setPaymentMethod(e.target.value as 'razorpay')}
              className="mr-3"
            />
            <div className="flex-1">
              <div className="font-semibold">Pay Online</div>
              <div className="text-sm text-gray-600">Pay securely with Razorpay</div>
            </div>
          </label>
        </div>

        <button
          onClick={handleCheckout}
          disabled={loading || (paymentMethod === 'razorpay' && !razorpayLoaded)}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {loading
            ? 'Processing...'
            : paymentMethod === 'razorpay'
              ? 'Pay with Razorpay'
              : 'Place Order'}
        </button>
        <Link
          href="/"
          className="block text-center text-sm text-gray-600 hover:text-gray-900 mt-4"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}



