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
      
      if (response.ok) {
        const tenantList = data.tenants || [];
        setTenants(tenantList);
        // Always clear error when we successfully get tenants
        if (tenantList.length > 0) {
          setError('');
        } else {
          setError('No tenants available');
        }
      } else {
        // Only set error if we don't have tenants
        setError(data.error || 'Failed to load tenants');
      }
    } catch (err: any) {
      // Only set error if we don't have tenants from a previous load
      if (tenants.length === 0) {
        setError(err.message || 'An error occurred');
      } else {
        setError(''); // Clear error if we have tenants
      }
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
        // Show error for failed selection (but don't persist it)
        const errorMsg = data.error || 'Failed to select tenant';
        setError(errorMsg);
        setSelecting(false);
        // Auto-clear error after 5 seconds if tenants are still available
        if (tenants.length > 0) {
          setTimeout(() => setError(''), 5000);
        }
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

        {/* Only show error if there are no tenants - don't show selection errors when tenants are available */}
        {error && tenants.length === 0 && !loading && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {/* Show selection error temporarily if tenants are available */}
        {error && tenants.length > 0 && !selecting && (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            {error}
            <button 
              onClick={() => setError('')}
              className="ml-2 text-yellow-800 hover:text-yellow-900 underline"
            >
              Dismiss
            </button>
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

