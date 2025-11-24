'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Coupon {
  id: string;
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  activeForCustomerEnd?: boolean;
  activeForFloorPlan?: boolean;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: '',
    minOrderAmount: '',
    maxDiscountAmount: '',
    validFrom: '',
    validUntil: '',
    usageLimit: '',
    isActive: true,
    activeForCustomerEnd: true,
    activeForFloorPlan: true,
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setError(null);
      console.log('[Coupons Page] Fetching coupons...');
      const response = await fetch('/api/coupons');
      console.log('[Coupons Page] Response status:', response.status);
      const data = await response.json();
      console.log('[Coupons Page] Response data:', data);
      
      if (data.coupons && Array.isArray(data.coupons)) {
        console.log('[Coupons Page] Setting coupons:', data.coupons.length);
        setCoupons(data.coupons);
      } else if (data.message) {
        console.warn('[Coupons Page] Coupon collection message:', data.message);
        setError(data.message);
        setCoupons([]);
      } else if (data.error) {
        console.error('[Coupons Page] API error:', data.error);
        setError(data.error);
        setCoupons([]);
      } else {
        console.warn('[Coupons Page] Unexpected response format:', data);
        setError('Unexpected response format from server');
        setCoupons([]);
      }
    } catch (error: any) {
      console.error('[Coupons Page] Error fetching coupons:', error);
      setError(error.message || 'Failed to fetch coupons');
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        discountValue: parseFloat(formData.discountValue),
        minOrderAmount: formData.minOrderAmount ? parseFloat(formData.minOrderAmount) : 0,
        maxDiscountAmount: formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : null,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
      };

      const url = editingCoupon ? `/api/coupons/${editingCoupon.id}` : '/api/coupons';
      const method = editingCoupon ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save coupon');
      }

      setShowAddModal(false);
      setEditingCoupon(null);
      resetForm();
      fetchCoupons();
    } catch (error: any) {
      alert(error.message || 'Failed to save coupon');
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      discountType: coupon.discountType,
      discountValue: (coupon.discountValue / 100).toFixed(2),
      minOrderAmount: (coupon.minOrderAmount / 100).toFixed(2),
      maxDiscountAmount: coupon.maxDiscountAmount ? (coupon.maxDiscountAmount / 100).toFixed(2) : '',
      validFrom: coupon.validFrom.split('T')[0],
      validUntil: coupon.validUntil.split('T')[0],
      usageLimit: coupon.usageLimit?.toString() || '',
      isActive: coupon.isActive,
      activeForCustomerEnd: coupon.activeForCustomerEnd !== undefined ? coupon.activeForCustomerEnd : true,
      activeForFloorPlan: coupon.activeForFloorPlan !== undefined ? coupon.activeForFloorPlan : true,
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;

    try {
      const response = await fetch(`/api/coupons/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete coupon');
      }

      fetchCoupons();
    } catch (error: any) {
      alert(error.message || 'Failed to delete coupon');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: '',
      minOrderAmount: '',
      maxDiscountAmount: '',
      validFrom: '',
      validUntil: '',
      usageLimit: '',
      isActive: true,
      activeForCustomerEnd: true,
      activeForFloorPlan: true,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  const isActive = (coupon: Coupon) => {
    if (!coupon.isActive) return false;
    if (isExpired(coupon.validUntil)) return false;
    if (coupon.usageLimit && (coupon.usedCount || 0) >= coupon.usageLimit) return false;
    return true;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading coupons...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent-blue/5 via-accent-purple/5 to-accent-green/5 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">
            Coupons
          </h1>
          <button
            onClick={() => {
              resetForm();
              setEditingCoupon(null);
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-accent-blue to-accent-purple text-white rounded-lg hover:from-accent-blue/90 hover:to-accent-purple/90 transition-all shadow-md hover:shadow-lg"
          >
            Add Coupon
          </button>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coupons.map((coupon) => (
          <div
            key={coupon.id}
            className={`card hover:shadow-lg transition-shadow ${!isActive(coupon) ? 'opacity-60' : ''}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold">{coupon.code}</h3>
                <span
                  className={`inline-block px-2 py-1 rounded text-xs mt-1 ${
                    isActive(coupon)
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {isActive(coupon) ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(coupon)}
                  className="text-accent-blue hover:text-accent-blue/80"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(coupon.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>

            {coupon.description && (
              <p className="text-sm text-gray-600 mb-2">{coupon.description}</p>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700">Discount:</span>
                {coupon.discountType === 'percentage' ? (
                  <span className="text-accent-blue font-semibold">{(coupon.discountValue / 100).toFixed(0)}%</span>
                ) : (
                  <span className="text-accent-blue font-semibold">₹{(coupon.discountValue / 100).toFixed(2)}</span>
                )}
              </div>
              {coupon.minOrderAmount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">Min Order:</span>
                  <span>₹{(coupon.minOrderAmount / 100).toFixed(2)}</span>
                </div>
              )}
              {coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">Max Discount:</span>
                  <span>₹{(coupon.maxDiscountAmount / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700">Valid:</span>
                <span className="text-gray-600">{formatDate(coupon.validFrom)} - {formatDate(coupon.validUntil)}</span>
              </div>
              {coupon.usageLimit && coupon.usageLimit > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">Usage:</span>
                  <span className={coupon.usedCount >= coupon.usageLimit ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                    {coupon.usedCount || 0} / {coupon.usageLimit}
                  </span>
                </div>
              )}
              {(!coupon.usageLimit || coupon.usageLimit === 0) && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">Usage:</span>
                  <span className="text-gray-600">{coupon.usedCount || 0} / Unlimited</span>
                </div>
              )}
              <div className="flex items-center gap-4 pt-2 border-t">
                <span className="font-medium text-gray-700 text-xs">Available For:</span>
                <div className="flex gap-3">
                  <span className={`text-xs px-2 py-1 rounded ${
                    coupon.activeForCustomerEnd !== false 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    Customer End
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    coupon.activeForFloorPlan !== false 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    Floor Plan
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Error: {error}</p>
          <button
            onClick={fetchCoupons}
            className="mt-2 text-red-600 hover:text-red-800 underline text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {coupons.length === 0 && !loading && !error && (
        <div className="text-center py-12">
          <div className="bg-white rounded-lg p-8 shadow-sm">
            <p className="text-gray-500 text-lg">No coupons found.</p>
            <p className="text-gray-400 text-sm mt-2">Create your first coupon to get started!</p>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingCoupon ? 'Edit Coupon' : 'Add Coupon'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-medium mb-1">Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Discount Type *</label>
                <select
                  value={formData.discountType}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'percentage' | 'fixed' })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">
                  Discount Value * ({formData.discountType === 'percentage' ? '%' : '₹'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={formData.discountType === 'percentage' ? '100' : undefined}
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Minimum Order Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minOrderAmount}
                  onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              {formData.discountType === 'percentage' && (
                <div>
                  <label className="block font-medium mb-1">Max Discount Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.maxDiscountAmount}
                    onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              )}
              <div>
                <label className="block font-medium mb-1">Valid From *</label>
                <input
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Valid Until *</label>
                <input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Usage Limit</label>
                <input
                  type="number"
                  min="1"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Leave empty for unlimited"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="isActive" className="font-medium">Active</label>
              </div>
              <div className="border-t pt-4 space-y-3">
                <h3 className="font-semibold text-gray-700">Available For:</h3>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="activeForCustomerEnd"
                    checked={formData.activeForCustomerEnd}
                    onChange={(e) => setFormData({ ...formData, activeForCustomerEnd: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="activeForCustomerEnd" className="font-medium">Customer End (Online Orders)</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="activeForFloorPlan"
                    checked={formData.activeForFloorPlan}
                    onChange={(e) => setFormData({ ...formData, activeForFloorPlan: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="activeForFloorPlan" className="font-medium">Floor Plan (Table Orders)</label>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90"
                >
                  {editingCoupon ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingCoupon(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

