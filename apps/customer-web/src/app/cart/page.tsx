'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { calculateGSTForItems } from '@restaurant/lib';

interface CartItem {
  menuItemId: string;
  quantity: number;
  options?: Array<{ groupId: string; valueIds: string[] }>;
}

interface MenuItem {
  id: string;
  name: string;
  basePrice: number;
  taxRate: number;
  image?: string;
}

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [items, setItems] = useState<Record<string, MenuItem>>({});
  const [loading, setLoading] = useState(true);
  const [locationStateCode, setLocationStateCode] = useState('MH');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  useEffect(() => {
    const cartData = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(cartData);
    
    // Don't auto-load coupon from localStorage - user must manually apply
    // This prevents auto-application of coupons

    // Fetch menu items
    const fetchItems = async () => {
      try {
        const itemIds = cartData.map((item: CartItem) => item.menuItemId);
        const response = await fetch(`/api/menu-items?ids=${itemIds.join(',')}`);
        const data = await response.json();
        
        const fetchedItems: Record<string, MenuItem> = {};
        (data.items || []).forEach((item: MenuItem) => {
          fetchedItems[item.id] = item;
        });

        setItems(fetchedItems);

        // Get location state code (simplified - should come from location)
        // For now, using default
      } catch (error) {
        console.error('Error fetching items:', error);
      } finally {
        setLoading(false);
      }
    };

    if (cartData.length > 0) {
      fetchItems();
    } else {
      setLoading(false);
    }
  }, []);

  const calculateItemTotal = (item: CartItem): number => {
    const menuItem = items[item.menuItemId];
    if (!menuItem) return 0;

    let itemPrice = menuItem.basePrice;
    // Add option prices (simplified - would need to fetch option values)
    // For now, just use base price

    return itemPrice * item.quantity;
  };

  const calculateTotals = () => {
    const itemTotals = cart.map((item) => ({
      subtotal: calculateItemTotal(item),
      taxRate: items[item.menuItemId]?.taxRate || 5,
    }));

    const subtotal = itemTotals.reduce((sum, item) => sum + item.subtotal, 0);
    const gst = calculateGSTForItems(itemTotals, locationStateCode);
    let total = subtotal + gst.totalTax;
    
    // Apply coupon discount if available
    let discountAmount = 0;
    if (appliedCoupon && appliedCoupon.discountAmount) {
      discountAmount = appliedCoupon.discountAmount;
      total = Math.max(0, total - discountAmount);
    }

    return { subtotal, gst, total, discountAmount };
  };

  const { subtotal, gst, total, discountAmount } = calculateTotals();

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    setValidatingCoupon(true);
    setCouponError('');

    try {
      // Calculate order amount from cart (in paise)
      let orderAmount = 0;
      cart.forEach((item) => {
        const menuItem = items[item.menuItemId];
        if (menuItem) {
          orderAmount += menuItem.basePrice * item.quantity;
        }
      });

      // Add GST to order amount for validation
      const itemTotals = cart.map((item) => ({
        subtotal: calculateItemTotal(item),
        taxRate: items[item.menuItemId]?.taxRate || 5,
      }));
      const gst = calculateGSTForItems(itemTotals, locationStateCode);
      orderAmount += gst.totalTax;

      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, orderAmount }),
      });

      const data = await response.json();
      if (response.ok && data.valid) {
        setAppliedCoupon(data.coupon);
        setCouponError('');
        // Save to localStorage
        localStorage.setItem('applied_coupon', JSON.stringify(data.coupon));
      } else {
        setCouponError(data.error || 'Invalid coupon code');
        setAppliedCoupon(null);
        localStorage.removeItem('applied_coupon');
      }
    } catch (error: any) {
      setCouponError('Failed to validate coupon');
      setAppliedCoupon(null);
      localStorage.removeItem('applied_coupon');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponError('');
    localStorage.removeItem('applied_coupon');
  };

  const updateQuantity = (index: number, delta: number) => {
    const newCart = [...cart];
    newCart[index].quantity = Math.max(1, newCart[index].quantity + delta);
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const removeItem = (index: number) => {
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const handleCheckout = () => {
    // Check if user is logged in
    const token = localStorage.getItem('customer_auth_token');
    if (!token) {
      router.push('/login?redirect=/checkout');
      return;
    }
    router.push('/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent-blue/5 to-accent-purple/5">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading cart...</p>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-accent-blue/5 to-accent-purple/5 flex items-center justify-center">
        <div className="text-center max-w-md">
          <svg
            className="mx-auto h-24 w-24 text-accent-purple mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">Your cart is empty</h1>
          <p className="text-gray-600 mb-6">Add some delicious items to get started!</p>
          <Link
            href="/"
            className="inline-block btn-primary"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent-blue/5 to-accent-purple/5 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 sm:mb-8 bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">Shopping Cart</h1>

        <div className="card mb-4 sm:mb-6">
          {cart.map((item, index) => {
            const menuItem = items[item.menuItemId];
            if (!menuItem) return null;

            return (
              <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-4 py-4 border-b last:border-b-0">
                {menuItem.image && (
                  <img
                    src={`/api/images/menuItem/${menuItem.id}/${menuItem.image}`}
                    alt={menuItem.name}
                    className="w-full sm:w-24 h-40 sm:h-24 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base sm:text-lg text-gray-900 mb-2">{menuItem.name}</h3>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className="flex items-center space-x-2 border-2 border-gray-200 rounded-lg self-start">
                      <button
                        onClick={() => updateQuantity(index, -1)}
                        className="px-3 py-1 hover:bg-accent-blue/10 hover:border-accent-blue rounded-l-lg transition-all duration-200"
                      >
                        -
                      </button>
                      <span className="px-3 py-1 font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(index, 1)}
                        className="px-3 py-1 hover:bg-accent-blue/10 hover:border-accent-blue rounded-r-lg transition-all duration-200"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(index)}
                      className="text-accent-pink hover:text-accent-pink/80 text-sm font-medium transition-colors duration-200 self-start"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-bold text-base sm:text-lg text-gray-900">
                    ₹{(calculateItemTotal(item) / 100).toFixed(2)}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">
                    ₹{((calculateItemTotal(item) / item.quantity) / 100).toFixed(2)} each
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="card border-2 border-accent-blue/20">
          {/* Coupon Code Section */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <label htmlFor="couponCode" className="block text-sm font-medium text-gray-700 mb-2">
              Have a coupon code?
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="couponCode"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Enter coupon code"
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-accent-blue focus:border-accent-blue"
                disabled={!!appliedCoupon}
              />
              {!appliedCoupon ? (
                <button
                  onClick={handleApplyCoupon}
                  disabled={validatingCoupon || !couponCode.trim()}
                  className="px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {validatingCoupon ? 'Applying...' : 'Apply'}
                </button>
              ) : (
                <button
                  onClick={handleRemoveCoupon}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
            {couponError && (
              <p className="text-red-500 text-sm mt-1">{couponError}</p>
            )}
            {appliedCoupon && (
              <p className="text-green-600 text-sm mt-1">
                Coupon "{appliedCoupon.code}" applied! Discount: ₹{(appliedCoupon.discountAmount / 100).toFixed(2)}
              </p>
            )}
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal:</span>
              <span className="font-semibold">₹{(subtotal / 100).toFixed(2)}</span>
            </div>
            {gst.cgst > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>CGST:</span>
                <span>₹{(gst.cgst / 100).toFixed(2)}</span>
              </div>
            )}
            {gst.sgst > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>SGST:</span>
                <span>₹{(gst.sgst / 100).toFixed(2)}</span>
              </div>
            )}
            {gst.igst > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>IGST:</span>
                <span>₹{(gst.igst / 100).toFixed(2)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600 font-medium">
                <span>Coupon Discount ({appliedCoupon?.code}):</span>
                <span>- ₹{(discountAmount / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold pt-2 border-t-2 border-accent-blue/20">
              <span className="text-accent-blue">Total Payable:</span>
              <span className="text-accent-blue">₹{(total / 100).toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={handleCheckout}
            className="w-full btn-primary mt-4"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}



