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

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-gradient-to-r from-accent-blue to-accent-purple shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl sm:text-2xl font-bold text-white hover:text-accent-yellow transition-colors duration-200">
            Restaurant
          </Link>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
            <Link
              href="/"
              className={`text-white hover:text-accent-yellow transition-colors duration-200 px-2 lg:px-3 py-2 rounded-lg hover:bg-white/20 text-sm lg:text-base ${
                pathname === '/' ? 'font-semibold bg-white/20' : ''
              }`}
            >
              Menu
            </Link>
            {isLoggedIn && (
              <Link
                href="/my-orders"
                className={`text-white hover:text-accent-yellow transition-colors duration-200 px-2 lg:px-3 py-2 rounded-lg hover:bg-white/20 text-sm lg:text-base ${
                  pathname === '/my-orders' ? 'font-semibold bg-white/20' : ''
                }`}
              >
                My Orders
              </Link>
            )}
            <Link
              href="/reservations"
              className={`text-white hover:text-accent-yellow transition-colors duration-200 px-2 lg:px-3 py-2 rounded-lg hover:bg-white/20 text-sm lg:text-base ${
                pathname === '/reservations' ? 'font-semibold bg-white/20' : ''
              }`}
            >
              Reservations
            </Link>
            <Link
              href="/cart"
              className="relative text-white hover:text-accent-yellow transition-colors duration-200 p-2"
            >
              <svg
                className="w-5 h-5 lg:w-6 lg:h-6"
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
                <span className="absolute -top-1 -right-1 bg-accent-pink text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-lg">
                  {cartCount}
                </span>
              )}
            </Link>
            {isLoggedIn ? (
              <div className="flex items-center space-x-2 lg:space-x-4">
                <Link
                  href="/profile"
                  className="text-xs lg:text-sm text-white hover:text-accent-yellow transition-colors duration-200 px-2 lg:px-3 py-1 rounded-lg hover:bg-white/20"
                >
                  {customerName ? `Hi, ${customerName.split(' ')[0]}` : 'Profile'}
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-xs lg:text-sm text-white hover:text-accent-yellow font-medium px-2 lg:px-3 py-1 rounded-lg hover:bg-white/20 transition-all duration-200"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-xs lg:text-sm text-white hover:text-accent-yellow font-medium px-2 lg:px-3 py-1 rounded-lg hover:bg-white/20 transition-all duration-200"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            <Link
              href="/cart"
              className="relative text-white hover:text-accent-yellow transition-colors duration-200 p-2"
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
                <span className="absolute -top-1 -right-1 bg-accent-pink text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-lg">
                  {cartCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-white p-2 rounded-lg hover:bg-white/20 transition-colors duration-200"
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-white/20 py-4 space-y-2">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block text-white hover:text-accent-yellow transition-colors duration-200 px-4 py-2 rounded-lg hover:bg-white/20 ${
                pathname === '/' ? 'font-semibold bg-white/20' : ''
              }`}
            >
              Menu
            </Link>
            {isLoggedIn && (
              <Link
                href="/my-orders"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block text-white hover:text-accent-yellow transition-colors duration-200 px-4 py-2 rounded-lg hover:bg-white/20 ${
                  pathname === '/my-orders' ? 'font-semibold bg-white/20' : ''
                }`}
              >
                My Orders
              </Link>
            )}
            <Link
              href="/reservations"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block text-white hover:text-accent-yellow transition-colors duration-200 px-4 py-2 rounded-lg hover:bg-white/20 ${
                pathname === '/reservations' ? 'font-semibold bg-white/20' : ''
              }`}
            >
              Reservations
            </Link>
            {isLoggedIn ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-white hover:text-accent-yellow transition-colors duration-200 px-4 py-2 rounded-lg hover:bg-white/20"
                >
                  {customerName ? `Hi, ${customerName}` : 'Profile'}
                </Link>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-left text-white hover:text-accent-yellow font-medium px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-white hover:text-accent-yellow font-medium px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200"
              >
                Login
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

