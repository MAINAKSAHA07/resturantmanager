'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [cartCount, setCartCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const count = cart.reduce((sum: number, item: any) => sum + item.quantity, 0);
      setCartCount(count);
    };

    const checkAuth = () => {
      const token = localStorage.getItem('customer_auth_token');
      const customerData = localStorage.getItem('customer_data');
      setIsLoggedIn(!!token);
      if (customerData) {
        try {
          const customer = JSON.parse(customerData);
          setCustomerName(customer.name || '');
        } catch (e) {
          // Ignore parse errors
        }
      }
    };

    updateCartCount();
    checkAuth();
    
    // Listen for storage changes (when cart is updated in another tab)
    window.addEventListener('storage', () => {
      updateCartCount();
      checkAuth();
    });
    
    // Custom event for cart updates in same tab
    window.addEventListener('cartUpdated', updateCartCount);
    
    // Listen for customer data updates
    const handleCustomerDataUpdate = () => {
      checkAuth();
    };
    window.addEventListener('customerDataUpdated', handleCustomerDataUpdate);

    return () => {
      window.removeEventListener('storage', updateCartCount);
      window.removeEventListener('cartUpdated', updateCartCount);
      window.removeEventListener('customerDataUpdated', handleCustomerDataUpdate);
    };
  }, []);

  const handleLogout = async () => {
    try {
      // Call logout API to clear server-side session if needed
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      // Ignore errors, continue with client-side logout
    }
    
    // Clear client-side storage
    localStorage.removeItem('customer_auth_token');
    localStorage.removeItem('customer_data');
    localStorage.removeItem('cart'); // Also clear cart on logout
    setIsLoggedIn(false);
    setCustomerName('');
    setCartCount(0);
    
    // Dispatch cart update event
    window.dispatchEvent(new Event('cartUpdated'));
    
    // Redirect to home
    router.push('/');
    router.refresh();
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-2xl font-bold text-gray-900 hover:text-blue-600">
            Restaurant
          </Link>
          
          <div className="flex items-center space-x-6">
            <Link
              href="/"
              className={`text-gray-700 hover:text-blue-600 ${
                pathname === '/' ? 'font-semibold text-blue-600' : ''
              }`}
            >
              Menu
            </Link>
            <Link
              href="/reservations"
              className={`text-gray-700 hover:text-blue-600 ${
                pathname === '/reservations' ? 'font-semibold text-blue-600' : ''
              }`}
            >
              Reservations
            </Link>
            <Link
              href="/cart"
              className="relative text-gray-700 hover:text-blue-600"
            >
              <svg
                className="w-6 h-6"
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
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
            {isLoggedIn ? (
              <div className="flex items-center space-x-4">
                <Link
                  href="/profile"
                  className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
                >
                  {customerName ? `Hi, ${customerName}` : 'Profile'}
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:text-blue-600 text-sm font-medium px-3 py-1 rounded hover:bg-gray-100 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-gray-700 hover:text-blue-600 text-sm font-medium px-3 py-1 rounded hover:bg-gray-100 transition-colors"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

