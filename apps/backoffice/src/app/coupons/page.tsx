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
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
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
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const response = await fetch('/api/coupons');
      const data = await response.json();
      if (data.coupons) {
        setCoupons(data.coupons);
      }
    } catch (error) {
      console.error('Error fetching coupons:', error);
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
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return false;
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">
          Coupons
        </h1>
        <button
          onClick={() => {
            resetForm();
            setEditingCoupon(null);
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors"
        >
          Add Coupon
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coupons.map((coupon) => (
          <div
            key={coupon.id}
            className={`card ${!isActive(coupon) ? 'opacity-60' : ''}`}
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

            <div className="space-y-1 text-sm">
              <div>
                <span className="font-medium">Discount: </span>
                {coupon.discountType === 'percentage' ? (
                  <span>{coupon.discountValue / 100}%</span>
                ) : (
                  <span>₹{(coupon.discountValue / 100).toFixed(2)}</span>
                )}
              </div>
              {coupon.minOrderAmount > 0 && (
                <div>
                  <span className="font-medium">Min Order: </span>
                  <span>₹{(coupon.minOrderAmount / 100).toFixed(2)}</span>
                </div>
              )}
              {coupon.maxDiscountAmount && (
                <div>
                  <span className="font-medium">Max Discount: </span>
                  <span>₹{(coupon.maxDiscountAmount / 100).toFixed(2)}</span>
                </div>
              )}
              <div>
                <span className="font-medium">Valid: </span>
                <span>{formatDate(coupon.validFrom)} - {formatDate(coupon.validUntil)}</span>
              </div>
              {coupon.usageLimit && (
                <div>
                  <span className="font-medium">Usage: </span>
                  <span>{coupon.usedCount} / {coupon.usageLimit}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {coupons.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No coupons found. Create your first coupon!</p>
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
  );
}

