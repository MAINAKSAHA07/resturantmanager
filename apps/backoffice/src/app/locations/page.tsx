'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Location {
  id: string;
  name: string;
  stateCode: string;
  gstin: string;
  address?: any;
  hours?: any;
}

interface Tenant {
  id: string;
  name: string;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    stateCode: '',
    gstin: '',
    address: '',
    hours: '',
  });

  useEffect(() => {
    // Check if we need to select a tenant first
    checkAndSelectTenant();
    
    // Also fetch debug info in development
    if (process.env.NODE_ENV === 'development') {
      fetchDebugInfo();
    }
  }, []);

  const fetchDebugInfo = async () => {
    try {
      const response = await fetch('/api/locations/debug');
      const data = await response.json();
      console.log('[Locations Page] Debug Info:', data);
    } catch (error) {
      console.error('Error fetching debug info:', error);
    }
  };

  const checkAndSelectTenant = async () => {
    // Check if tenant cookie exists
    const cookies = document.cookie.split(';');
    const tenantCookie = cookies.find(c => c.trim().startsWith('selected_tenant_id='));
    const tenantId = tenantCookie ? tenantCookie.split('=')[1] : null;

    if (!tenantId) {
      // No tenant selected, try to get available tenants and auto-select first one
      try {
        const tenantsResponse = await fetch('/api/tenants');
        const tenantsData = await tenantsResponse.json();
        
        if (tenantsData.tenants && tenantsData.tenants.length > 0) {
          const firstTenant = tenantsData.tenants[0];
          console.log('[Locations Page] No tenant selected. Auto-selecting first tenant:', firstTenant);
          
          // Select the first tenant
          const selectResponse = await fetch('/api/auth/select-tenant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: firstTenant.id }),
          });

          if (selectResponse.ok) {
            console.log('[Locations Page] Tenant selected successfully, fetching locations...');
            // Fetch locations after selecting tenant (don't reload, just fetch)
            await fetchLocations();
            return;
          } else {
            console.error('[Locations Page] Failed to select tenant');
          }
        }
      } catch (error) {
        console.error('Error auto-selecting tenant:', error);
      }
    }
    
    // If tenant exists or auto-select failed, fetch locations
    await fetchLocations();
  };

  const fetchLocations = async () => {
    try {
      // Check if tenant cookie exists on client side
      const cookies = document.cookie.split(';');
      const tenantCookie = cookies.find(c => c.trim().startsWith('selected_tenant_id='));
      const tenantId = tenantCookie ? tenantCookie.split('=')[1] : null;
      
      console.log('[Locations Page] Client-side tenant check:', {
        hasCookie: !!tenantCookie,
        tenantId,
        allCookies: document.cookie,
      });

      const response = await fetch('/api/locations');
      const data = await response.json();
      
      console.log('[Locations Page] API response:', {
        locationsCount: data.locations?.length || 0,
        hasTenant: !!data.tenant,
        tenant: data.tenant,
        error: data.error,
      });
      
      if (data.locations) {
        setLocations(data.locations);
      }
      
      if (data.tenant) {
        setTenant(data.tenant);
      }
      
      if (data.error) {
        console.error('Error from API:', data.error);
        if (data.error === 'Tenant not found' || !tenantId) {
          // Don't show alert, just show the message in the UI
          console.warn('No tenant selected. User needs to select a tenant from navbar.');
        }
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      alert('Failed to fetch locations. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.stateCode.trim() || !formData.gstin.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const locationData: any = {
        name: formData.name.trim(),
        stateCode: formData.stateCode.trim(),
        gstin: formData.gstin.trim(),
      };

      // Parse JSON fields if provided
      if (formData.address.trim()) {
        try {
          locationData.address = JSON.parse(formData.address);
        } catch {
          // If not valid JSON, store as simple text
          locationData.address = { text: formData.address };
        }
      }

      if (formData.hours.trim()) {
        try {
          locationData.hours = JSON.parse(formData.hours);
        } catch {
          locationData.hours = { text: formData.hours };
        }
      }

      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locationData),
      });

      const data = await response.json();
      if (data.success) {
        setShowAddModal(false);
        setFormData({ name: '', stateCode: '', gstin: '', address: '', hours: '' });
        await fetchLocations();
        alert('Location created successfully!');
      } else {
        alert(data.error || 'Failed to create location');
      }
    } catch (error: any) {
      console.error('Error creating location:', error);
      alert('Failed to create location: ' + error.message);
    }
  };

  const handleDelete = async (locationId: string, locationName: string) => {
    if (!confirm(`Are you sure you want to delete "${locationName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(locationId);
    try {
      const response = await fetch(`/api/locations/${locationId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        await fetchLocations();
        alert('Location deleted successfully!');
      } else {
        alert(data.error || 'Failed to delete location');
      }
    } catch (error: any) {
      console.error('Error deleting location:', error);
      alert('Failed to delete location: ' + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-accent-blue/5 to-accent-purple/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading locations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent-blue/5 via-accent-purple/5 to-accent-green/5 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">
              Locations
            </h1>
            {tenant && (
              <p className="text-gray-600 mt-1">Tenant: {tenant.name}</p>
            )}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary px-4 py-2"
            disabled={!tenant}
          >
            + Add Location
          </button>
        </div>

        {!tenant ? (
          <div className="card p-12 text-center">
            <p className="text-gray-600 mb-4">No tenant selected.</p>
            <p className="text-sm text-gray-500 mb-4">Please select a tenant from the dropdown in the navbar to view and manage locations.</p>
          </div>
        ) : locations.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-gray-600 mb-4">No locations found for {tenant.name}.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
            >
              Create Your First Location
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locations.map((location) => (
              <div
                key={location.id}
                className="card-accent border-l-4 border-l-accent-blue hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold">{location.name}</h3>
                  <div className="flex gap-2">
                    <Link
                      href={`/locations/${location.id}/edit`}
                      className="btn-secondary px-3 py-1 text-sm"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(location.id, location.name)}
                      disabled={deletingId === location.id}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {deletingId === location.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><strong>State Code:</strong> {location.stateCode}</p>
                  <p><strong>GSTIN:</strong> {location.gstin}</p>
                  {location.address && (
                    <p><strong>Address:</strong> {typeof location.address === 'string' ? location.address : JSON.stringify(location.address)}</p>
                  )}
                  {location.hours && (
                    <p><strong>Hours:</strong> {typeof location.hours === 'string' ? location.hours : JSON.stringify(location.hours)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Location Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">Add New Location</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block font-medium mb-2">Location Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="e.g., Main Branch"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium mb-2">State Code *</label>
                  <input
                    type="text"
                    value={formData.stateCode}
                    onChange={(e) => setFormData({ ...formData, stateCode: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="e.g., MH"
                    maxLength={2}
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium mb-2">GSTIN *</label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="e.g., 27AAAAA0000A1Z5"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium mb-2">Address (JSON or text)</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    rows={3}
                    placeholder='{"street": "123 Main St", "city": "Mumbai", "zip": "400001"}'
                  />
                </div>
                <div>
                  <label className="block font-medium mb-2">Hours (JSON or text)</label>
                  <textarea
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    rows={2}
                    placeholder='{"monday": "9:00-22:00", "tuesday": "9:00-22:00"}'
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Create Location
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({ name: '', stateCode: '', gstin: '', address: '', hours: '' });
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

