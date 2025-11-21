'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '../components/Navbar';

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
      {showNavbar && <Navbar />}
      {children}
    </>
  );
}

