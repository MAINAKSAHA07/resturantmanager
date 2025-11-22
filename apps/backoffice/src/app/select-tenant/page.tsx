'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Tenant {
  id: string;
  name: string;
  key: string;
}

export default function SelectTenantPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setError(''); // Clear any previous errors on mount
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setError(''); // Clear any previous errors
      const response = await fetch('/api/tenants');
      const data = await response.json();
      
      if (response.ok && data.success !== false) {
        setTenants(data.tenants || []);
        setError(''); // Clear error on success
      } else {
        setError(data.error || 'Failed to load tenants');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTenant = async (tenantId: string) => {
    setSelecting(true);
    setError(''); // Clear any previous errors

    try {
      const response = await fetch('/api/auth/select-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      });

      const data = await response.json();

      if (response.ok) {
        // Clear error on success before redirecting
        setError('');
        router.push('/dashboard');
      } else {
        // Only show error if it's not a 404 (tenant not found might be from stale data)
        const errorMsg = data.error || 'Failed to select tenant';
        setError(errorMsg);
        setSelecting(false);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setSelecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tenants...</p>
        </div>
      </div>
    );
  }

  if (error && tenants.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-center mb-2">Select Tenant</h1>
        <p className="text-center text-gray-600 mb-8">
          Choose which restaurant brand you want to manage
        </p>

        {error && tenants.length === 0 && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {tenants.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No tenants available.</p>
            <p className="text-sm text-gray-500">
              Please contact your administrator to set up tenants.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tenants.map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => handleSelectTenant(tenant.id)}
                disabled={selecting}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <h2 className="text-xl font-semibold mb-2">{tenant.name}</h2>
                <p className="text-sm text-gray-500">Key: {tenant.key}</p>
                {selecting && (
                  <div className="mt-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 inline-block"></div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/login')}
            className="text-gray-600 hover:text-gray-800 text-sm"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

