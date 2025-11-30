'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import OrderNotification from '../components/OrderNotification';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showNavbar, setShowNavbar] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('pb_auth_token');
    // Show navbar on all pages except login
    setShowNavbar(!!token && pathname !== '/login');
  }, [pathname]);

  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 5000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
        }}
      />
      {showNavbar && (
        <>
          <Navbar />
          <OrderNotification />
        </>
      )}
      <div className={showNavbar ? 'lg:pl-64' : ''}>
        {children}
      </div>
    </>
  );
}

