'use client';

import { useRouter } from 'next/navigation';
import { clearAuthToken } from '../lib/auth';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthToken();
      document.cookie = 'pb_auth_token=; path=/; max-age=0';
      router.push('/login');
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 bg-accent-pink text-white rounded-lg hover:opacity-90 font-medium transition-all duration-200 hover:shadow-lg active:scale-95"
    >
      Logout
    </button>
  );
}

