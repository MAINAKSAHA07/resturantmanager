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
  };

  return (
    <nav className="bg-gradient-to-r from-accent-blue to-accent-purple shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-2xl font-bold text-white hover:text-accent-yellow transition-colors duration-200">
            Restaurant
          </Link>
          
          <div className="flex items-center space-x-6">
            <Link
              href="/"
              className={`text-white hover:text-accent-yellow transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-white/20 ${
                pathname === '/' ? 'font-semibold bg-white/20' : ''
              }`}
            >
              Menu
            </Link>
            {isLoggedIn && (
              <Link
                href="/my-orders"
                className={`text-white hover:text-accent-yellow transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-white/20 ${
                  pathname === '/my-orders' ? 'font-semibold bg-white/20' : ''
                }`}
              >
                My Orders
              </Link>
            )}
            <Link
              href="/reservations"
              className={`text-white hover:text-accent-yellow transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-white/20 ${
                pathname === '/reservations' ? 'font-semibold bg-white/20' : ''
              }`}
            >
              Reservations
            </Link>
            <Link
              href="/cart"
              className="relative text-white hover:text-accent-yellow transition-colors duration-200"
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
                <span className="absolute -top-2 -right-2 bg-accent-pink text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-lg">
                  {cartCount}
                </span>
              )}
            </Link>
            {isLoggedIn ? (
              <div className="flex items-center space-x-4">
                <Link
                  href="/profile"
                  className="text-sm text-white hover:text-accent-yellow transition-colors duration-200 px-3 py-1 rounded-lg hover:bg-white/20"
                >
                  {customerName ? `Hi, ${customerName}` : 'Profile'}
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-white hover:text-accent-yellow text-sm font-medium px-3 py-1 rounded-lg hover:bg-white/20 transition-all duration-200"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-white hover:text-accent-yellow text-sm font-medium px-3 py-1 rounded-lg hover:bg-white/20 transition-all duration-200"
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

