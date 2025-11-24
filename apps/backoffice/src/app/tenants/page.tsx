'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Tenant {
  id: string;
  name: string;
  key: string;
  primaryDomain?: string;
  adminDomain?: string;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isMasterUser, setIsMasterUser] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    primaryDomain: '',
    adminDomain: '',
    // Location fields (only for new tenants)
    locationName: '',
    locationStateCode: '',
    locationGstin: '',
    locationAddress: '',
    locationHours: '',
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchCurrentUser();
    fetchTenants();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      if (response.ok && data.user) {
        setCurrentUser(data.user);
        const isMaster = data.user.isMaster === true || data.user.role === 'admin';
        setIsMasterUser(isMaster);
        
        // Redirect non-master users
        if (!isMaster) {
          window.location.href = '/dashboard';
        }
      }
    } catch (err) {
      console.error('Error fetching current user:', err);
    }
  };

  const fetchTenants = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetch('/api/tenants');
      const data = await response.json();
      
      if (response.ok) {
        setTenants(data.tenants || []);
      } else {
        if (response.status === 401) {
          setError('Unauthorized: Please log in again.');
        } else if (response.status === 403) {
          setError('Forbidden: You do not have permission to view tenants.');
        } else {
          setError(data.error || `Failed to fetch tenants: ${response.statusText}`);
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to fetch tenants. Please check your connection.';
      setError(errorMessage);
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const url = editingTenant ? `/api/tenants/${editingTenant.id}` : '/api/tenants';
      const method = editingTenant ? 'PUT' : 'POST';
      
      // For edit, don't send location fields
      const body = editingTenant 
        ? {
            key: formData.key,
            name: formData.name,
            primaryDomain: formData.primaryDomain,
            adminDomain: formData.adminDomain,
          }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${editingTenant ? 'update' : 'create'} tenant`);
      }

      // Reset form and close modal
      setFormData({
        key: '',
        name: '',
        primaryDomain: '',
        adminDomain: '',
        locationName: '',
        locationStateCode: '',
        locationGstin: '',
        locationAddress: '',
        locationHours: '',
      });
      setShowAddModal(false);
      setShowEditModal(false);
      setEditingTenant(null);
      
      // Refresh tenants list
      fetchTenants();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (tenant: Tenant) => {
    try {
      // Fetch full tenant details
      const response = await fetch(`/api/tenants/${tenant.id}`);
      const data = await response.json();
      
      if (response.ok && data.tenant) {
        setEditingTenant(data.tenant);
        setFormData({
          key: data.tenant.key || '',
          name: data.tenant.name || '',
          primaryDomain: data.tenant.primaryDomain || '',
          adminDomain: data.tenant.adminDomain || '',
          locationName: '',
          locationStateCode: '',
          locationGstin: '',
          locationAddress: '',
          locationHours: '',
        });
        setFormError('');
        setShowEditModal(true);
      } else {
        alert(data.error || 'Failed to load tenant details');
      }
    } catch (err: any) {
      alert('Failed to load tenant details: ' + err.message);
    }
  };

  const handleDeleteClick = (tenant: Tenant) => {
    setDeletingTenant(tenant);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTenant) return;

    setDeleting(true);
    setFormError('');

    try {
      const response = await fetch(`/api/tenants/${deletingTenant.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete tenant');
      }

      setShowDeleteModal(false);
      setDeletingTenant(null);
      
      // Refresh tenants list
      fetchTenants();
    } catch (err: any) {
      setFormError(err.message);
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-accent-blue/5 to-accent-purple/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading tenants...</p>
        </div>
      </div>
    );
  }

  // Don't render if not master user (will redirect)
  if (!isMasterUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent-blue/5 via-accent-purple/5 to-accent-green/5 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">
            Tenants
          </h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary px-4 py-2 text-sm"
          >
            Add Tenant
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-accent-pink/10 border-l-4 border-accent-pink rounded-lg">
            <div className="flex justify-between items-center">
              <p className="font-semibold text-accent-pink">{error}</p>
              <button
                onClick={fetchTenants}
                className="text-sm text-accent-pink hover:text-accent-pink/80 underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {tenants.length === 0 && !error ? (
          <div className="card text-center py-12">
            <p className="text-gray-600 text-lg mb-4">No tenants found.</p>
            <button onClick={() => setShowAddModal(true)} className="btn-primary inline-block">
              Add your first tenant
            </button>
          </div>
        ) : (
          <div className="card overflow-hidden overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 min-w-[640px]">
              <thead className="bg-gradient-to-r from-accent-blue to-accent-purple text-white">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Key
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider hidden md:table-cell">
                    Primary Domain
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider hidden lg:table-cell">
                    Admin Domain
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{tenant.name || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 font-mono">{tenant.key}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                      <div className="text-sm text-gray-500">{tenant.primaryDomain || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                      <div className="text-sm text-gray-500">{tenant.adminDomain || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(tenant)}
                        className="text-accent-blue hover:text-accent-purple font-medium transition-colors duration-200 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(tenant)}
                        className="text-red-600 hover:text-red-800 font-medium transition-colors duration-200"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add/Edit Tenant Modal */}
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingTenant ? 'Edit Tenant' : 'Add New Tenant'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      setEditingTenant(null);
                      setFormError('');
                      setFormData({
                        key: '',
                        name: '',
                        primaryDomain: '',
                        adminDomain: '',
                        locationName: '',
                        locationStateCode: '',
                        locationGstin: '',
                        locationAddress: '',
                        locationHours: '',
                      });
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {formError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{formError}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="key" className="block text-sm font-medium text-gray-700 mb-1">
                        Tenant Key <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="key"
                        required={!editingTenant}
                        value={formData.key}
                        onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-transparent ${
                          editingTenant ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                        placeholder="e.g., restaurant-1"
                        disabled={!!editingTenant}
                        readOnly={!!editingTenant}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        {editingTenant 
                          ? 'Tenant key cannot be changed after creation'
                          : 'Unique identifier for the tenant (lowercase, no spaces)'}
                      </p>
                    </div>

                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Tenant Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-transparent"
                        placeholder="e.g., Restaurant One"
                      />
                    </div>

                    <div>
                      <label htmlFor="primaryDomain" className="block text-sm font-medium text-gray-700 mb-1">
                        Primary Domain <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="primaryDomain"
                        required
                        value={formData.primaryDomain}
                        onChange={(e) => setFormData({ ...formData, primaryDomain: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-transparent"
                        placeholder="e.g., restaurant1.example.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="adminDomain" className="block text-sm font-medium text-gray-700 mb-1">
                        Admin Domain <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="adminDomain"
                        required
                        value={formData.adminDomain}
                        onChange={(e) => setFormData({ ...formData, adminDomain: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-transparent"
                        placeholder="e.g., admin.restaurant1.example.com"
                      />
                    </div>

                    {/* Location Section - Only show for new tenants */}
                    {!editingTenant && (
                      <div className="pt-4 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Default Location</h3>
                        <p className="text-sm text-gray-500 mb-4">A default location will be created for this tenant. This is required for the tenant to function properly.</p>
                      
                      <div>
                        <label htmlFor="locationName" className="block text-sm font-medium text-gray-700 mb-1">
                          Location Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="locationName"
                          required
                          value={formData.locationName}
                          onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-transparent"
                          placeholder="e.g., Main Location"
                        />
                      </div>

                      <div className="mt-4">
                        <label htmlFor="locationStateCode" className="block text-sm font-medium text-gray-700 mb-1">
                          State Code <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="locationStateCode"
                          required
                          value={formData.locationStateCode}
                          onChange={(e) => setFormData({ ...formData, locationStateCode: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-transparent"
                          placeholder="e.g., MH, DL, KA"
                          maxLength={2}
                        />
                        <p className="mt-1 text-xs text-gray-500">2-letter state code (e.g., MH for Maharashtra)</p>
                      </div>

                      <div className="mt-4">
                        <label htmlFor="locationGstin" className="block text-sm font-medium text-gray-700 mb-1">
                          GSTIN <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="locationGstin"
                          required
                          value={formData.locationGstin}
                          onChange={(e) => setFormData({ ...formData, locationGstin: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-transparent"
                          placeholder="e.g., 27ABCDE1234F1Z5"
                          maxLength={15}
                        />
                        <p className="mt-1 text-xs text-gray-500">15-character GSTIN number</p>
                      </div>

                      <div className="mt-4">
                        <label htmlFor="locationAddress" className="block text-sm font-medium text-gray-700 mb-1">
                          Address (Optional)
                        </label>
                        <textarea
                          id="locationAddress"
                          value={formData.locationAddress}
                          onChange={(e) => setFormData({ ...formData, locationAddress: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-transparent"
                          placeholder="Enter full address (can be JSON or plain text)"
                          rows={3}
                        />
                        <p className="mt-1 text-xs text-gray-500">Full address of the location</p>
                      </div>

                      <div className="mt-4">
                        <label htmlFor="locationHours" className="block text-sm font-medium text-gray-700 mb-1">
                          Operating Hours (Optional)
                        </label>
                        <textarea
                          id="locationHours"
                          value={formData.locationHours}
                          onChange={(e) => setFormData({ ...formData, locationHours: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-transparent"
                          placeholder='e.g., {"monday": "9:00 AM - 10:00 PM"} or plain text'
                          rows={2}
                        />
                        <p className="mt-1 text-xs text-gray-500">Operating hours (can be JSON or plain text)</p>
                      </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        setShowEditModal(false);
                        setEditingTenant(null);
                        setFormError('');
                        setFormData({
                          key: '',
                          name: '',
                          primaryDomain: '',
                          adminDomain: '',
                          locationName: '',
                          locationStateCode: '',
                          locationGstin: '',
                          locationAddress: '',
                          locationHours: '',
                        });
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 btn-primary px-4 py-2"
                      disabled={submitting}
                    >
                      {submitting 
                        ? (editingTenant ? 'Updating...' : 'Creating...') 
                        : (editingTenant ? 'Update Tenant' : 'Create Tenant')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && deletingTenant && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Delete Tenant</h2>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletingTenant(null);
                      setFormError('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                    disabled={deleting}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {formError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{formError}</p>
                  </div>
                )}

                <div className="mb-6">
                  <p className="text-gray-700 mb-2">
                    Are you sure you want to delete the tenant <strong>{deletingTenant.name}</strong>?
                  </p>
                  <p className="text-sm text-gray-500">
                    This action cannot be undone. If this tenant has associated locations, users, orders, or other data, 
                    you will need to remove or reassign them first.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletingTenant(null);
                      setFormError('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteConfirm}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting...' : 'Delete Tenant'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

