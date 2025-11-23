'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';
import { type User } from '@/lib/user-utils';

interface Category {
  id: string;
  name: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  taxRate: number;
  categoryId: string;
  isActive: boolean;
  availability?: 'available' | 'not available';
  hsnSac: string;
  image?: string;
}

export default function EditMenuItemPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params.id as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: '',
    taxRate: '5',
    categoryId: '',
    availability: 'available' as 'available' | 'not available',
    hsnSac: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string>('');
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchCategories();
    fetchItem();
  }, [itemId]);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      if (response.ok && data.user) {
        setUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('pb_auth_token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/menu/categories', { headers });
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchItem = async () => {
    try {
      const token = localStorage.getItem('pb_auth_token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Add cache-busting to ensure fresh data
      const response = await fetch(`/api/menu/items/${itemId}?t=${Date.now()}`, {
        headers,
        cache: 'no-store'
      });
      const data = await response.json();

      if (response.ok && data.item) {
        const item = data.item;
        // Handle both new 'availability' field and legacy 'isActive' boolean
        let availability: 'available' | 'not available' = 'available';
        if (item.availability) {
          availability = item.availability === 'not available' ? 'not available' : 'available';
        } else if (item.isActive !== undefined) {
          // Legacy support: convert boolean to availability
          availability = item.isActive !== false ? 'available' : 'not available';
        }

        setFormData({
          name: item.name || '',
          description: item.description || '',
          basePrice: ((item.basePrice || 0) / 100).toFixed(2),
          taxRate: (item.taxRate || 5).toString(),
          categoryId: Array.isArray(item.categoryId) ? item.categoryId[0] : item.categoryId,
          availability: availability,
          hsnSac: item.hsnSac || '',
        });

        // Set existing image if available
        if (item.image) {
          const pbUrl = process.env.NEXT_PUBLIC_AWS_POCKETBASE_URL || process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://localhost:8090';
          setExistingImageUrl(`${pbUrl}/api/files/menuItem/${item.id}/${item.image}`);
        }
      } else {
        alert(`Error: ${data.error || 'Failed to load item'}`);
        router.push('/menu');
      }
    } catch (error: any) {
      console.error('Error fetching item:', error);
      alert(`Error: ${error.message || 'Failed to load item'}`);
      router.push('/menu');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      setImageFile(file);
      setRemoveImage(false);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const checkDuplicate = async (name: string) => {
    if (!name.trim()) {
      setDuplicateWarning('');
      return;
    }

    try {
      const token = localStorage.getItem('pb_auth_token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/menu/items/check-duplicate?name=${encodeURIComponent(name)}`, { headers });
      const data = await response.json();

      if (data.isDuplicate) {
        setDuplicateWarning(`⚠️ A menu item with the name "${name}" already exists.`);
      } else {
        setDuplicateWarning('');
      }
    } catch (error) {
      // Silently fail duplicate check
      console.error('Error checking duplicate:', error);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setFormData({ ...formData, name: newName });
    // Debounce duplicate check
    setTimeout(() => checkDuplicate(newName), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('pb_auth_token');

      // Create FormData for file upload
      const formDataToSend = new FormData();
      
      // Staff can only update availability
      if (isStaffOnly) {
        formDataToSend.append('availability', formData.availability);
      } else {
        // Managers/admins can update all fields
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description || '');
      formDataToSend.append('basePrice', parseFloat(formData.basePrice).toString());
      formDataToSend.append('taxRate', parseFloat(formData.taxRate).toString());
      formDataToSend.append('categoryId', formData.categoryId);
      // Send availability as 'available' or 'not available'
      formDataToSend.append('availability', formData.availability);
      console.log('[Frontend] Sending availability:', formData.availability);
      formDataToSend.append('hsnSac', formData.hsnSac || '');
      formDataToSend.append('removeImage', removeImage.toString());

      if (imageFile) {
        formDataToSend.append('image', imageFile);
        }
      }

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      // Don't set Content-Type header - browser will set it with boundary for FormData

      const response = await fetch(`/api/menu/items/${itemId}`, {
        method: 'PUT',
        headers,
        body: formDataToSend,
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Item updated successfully, navigating to menu...');
        // Force a hard refresh by using window.location to bypass Next.js cache
        window.location.href = '/menu?refresh=' + Date.now();
      } else {
        alert(`Error: ${data.error || 'Failed to update item'}`);
      }
    } catch (error: any) {
      console.error('Error updating item:', error);
      alert(`Error: ${error.message || 'Failed to update item'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setDeleting(true);
    try {
      const token = localStorage.getItem('pb_auth_token');

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/menu/items/${itemId}`, {
        method: 'DELETE',
        headers,
      });

      const data = await response.json();

      if (response.ok) {
        // Navigate to menu and force refresh to show updated status
        router.push('/menu?refresh=' + Date.now());
        // Small delay to ensure navigation completes before refresh
        setTimeout(() => {
          router.refresh();
        }, 100);
      } else {
        alert(`Error: ${data.error || 'Failed to delete item'}`);
        setShowDeleteConfirm(false);
      }
    } catch (error: any) {
      console.error('Error deleting item:', error);
      alert(`Error: ${error.message || 'Failed to delete item'}`);
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading menu item...</p>
        </div>
      </div>
    );
  }

  // Check if user is staff (can only edit availability)
  const isStaffOnly = Boolean(user && user.role === 'staff' && !hasPermission(user, 'menu.create'));
  const canEditAll = hasPermission(user, 'menu.create') || hasPermission(user, 'menu.delete');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Edit Menu Item</h1>
        
        {isStaffOnly && (
          <div className="mb-4 p-4 bg-accent-yellow/20 border-l-4 border-accent-yellow rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Staff Mode:</strong> You can only change the availability status of this item.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4">
            <label className="block font-medium mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={handleNameChange}
              className={`w-full px-4 py-2 border rounded-lg ${duplicateWarning ? 'border-yellow-500' : ''} ${isStaffOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              required
              disabled={isStaffOnly}
              readOnly={isStaffOnly}
            />
            {duplicateWarning && (
              <p className="text-yellow-600 text-sm mt-1">{duplicateWarning}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-2">Image</label>
            {existingImageUrl && !imagePreview && !removeImage && (
              <div className="mb-3">
                <img
                  src={existingImageUrl}
                  alt="Current"
                  className="w-32 h-32 object-cover rounded-lg border border-gray-300 mb-2"
                />
                {!isStaffOnly && (
                <label className="flex items-center text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={removeImage}
                    onChange={(e) => {
                      setRemoveImage(e.target.checked);
                      if (e.target.checked) {
                        setImagePreview(null);
                        setImageFile(null);
                      }
                    }}
                    className="mr-2"
                  />
                  Remove current image
                </label>
                )}
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className={`w-full px-4 py-2 border rounded-lg ${isStaffOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              disabled={removeImage || isStaffOnly}
            />
            {imagePreview && (
              <div className="mt-3">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                />
              </div>
            )}
            <p className="text-sm text-gray-500 mt-1">Max size: 5MB. Supported formats: JPG, PNG, WebP</p>
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg ${isStaffOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              rows={3}
              disabled={isStaffOnly}
              readOnly={isStaffOnly}
            />
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-2">Category *</label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg ${isStaffOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              required
              disabled={isStaffOnly}
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block font-medium mb-2">Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg ${isStaffOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                required
                disabled={isStaffOnly}
                readOnly={isStaffOnly}
              />
            </div>

            <div>
              <label className="block font-medium mb-2">Tax Rate (%) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.taxRate}
                onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg ${isStaffOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                disabled={isStaffOnly}
                readOnly={isStaffOnly}
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-2">HSN/SAC Code</label>
            <input
              type="text"
              value={formData.hsnSac}
              onChange={(e) => setFormData({ ...formData, hsnSac: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg ${isStaffOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              disabled={isStaffOnly}
              readOnly={isStaffOnly}
            />
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-2">Availability *</label>
            <select
              value={formData.availability}
              onChange={(e) => setFormData({ ...formData, availability: e.target.value as 'available' | 'not available' })}
              className="w-full px-4 py-2 border rounded-lg"
              required
            >
              <option value="available">Available</option>
              <option value="not available">Not Available</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              {formData.availability === 'available'
                ? 'This item will be visible to customers'
                : 'This item will be hidden from customers'}
            </p>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving || deleting}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              disabled={saving || deleting}
              className="flex-1 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>

          {canEditAll && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h3>
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving || deleting}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Delete Item
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 mb-3 font-medium">
                    Are you sure you want to delete this menu item? This action cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleting ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          )}
        </form>
      </div>
    </div>
  );
}

