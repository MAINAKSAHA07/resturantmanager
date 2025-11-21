'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LogoutButton from './LogoutButton';

interface Tenant {
  id: string;
  name: string;
  key: string;
}

export default function Navbar() {
  const router = useRouter();
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [showTenantSelector, setShowTenantSelector] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);

  useEffect(() => {
    fetchCurrentTenant();
    fetchTenants();
  }, []);

  const fetchCurrentTenant = async () => {
    try {
      // Get tenant ID from cookie
      const cookies = document.cookie.split(';');
      const tenantCookie = cookies.find(c => c.trim().startsWith('selected_tenant_id='));
      if (tenantCookie) {
        const tenantId = tenantCookie.split('=')[1];
        const response = await fetch('/api/tenants');
        const data = await response.json();
        if (response.ok && data.tenants) {
          const tenant = data.tenants.find((t: Tenant) => t.id === tenantId);
          if (tenant) {
            setCurrentTenant(tenant);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching current tenant:', err);
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/tenants');
      const data = await response.json();
      if (response.ok) {
        setTenants(data.tenants || []);
      }
    } catch (err) {
      console.error('Error fetching tenants:', err);
    }
  };

  const handleSwitchTenant = async (tenantId: string) => {
    try {
      const response = await fetch('/api/auth/select-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      });

      if (response.ok) {
        setShowTenantSelector(false);
        router.refresh();
        window.location.reload(); // Reload to refresh all data
      }
    } catch (err) {
      console.error('Error switching tenant:', err);
    }
  };

  return (
    <nav className="bg-white shadow-md mb-6">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-6 items-center">
            <Link href="/dashboard" className="text-gray-700 hover:text-blue-600 font-medium">
              Dashboard
            </Link>
            <Link href="/menu" className="text-gray-700 hover:text-blue-600 font-medium">
              Menu
            </Link>
            <Link href="/orders" className="text-gray-700 hover:text-blue-600 font-medium">
              Orders
            </Link>
            <Link href="/kds" className="text-gray-700 hover:text-blue-600 font-medium">
              KDS
            </Link>
            <Link href="/reservations" className="text-gray-700 hover:text-blue-600 font-medium">
              Reservations
            </Link>
            <Link href="/floorplan" className="text-gray-700 hover:text-blue-600 font-medium">
              Floor Plan
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {currentTenant && (
              <div className="relative">
                <button
                  onClick={() => setShowTenantSelector(!showTenantSelector)}
                  className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium text-sm"
                >
                  {currentTenant.name} ▼
                </button>
                {showTenantSelector && tenants.length > 1 && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-2">
                      {tenants.map((tenant) => (
                        <button
                          key={tenant.id}
                          onClick={() => handleSwitchTenant(tenant.id)}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                            tenant.id === currentTenant.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          {tenant.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <LogoutButton />
          </div>
        </div>
      </div>
    </nav>
  );
}

