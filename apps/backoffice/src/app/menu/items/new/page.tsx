'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Category {
  id: string;
  name: string;
}

export default function NewMenuItemPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: '',
    taxRate: '5',
    categoryId: '',
    isActive: true,
    hsnSac: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string>('');

  useEffect(() => {
    fetchCategories();
  }, []);

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
      if (data.categories && data.categories.length > 0) {
        setFormData(prev => ({ ...prev, categoryId: data.categories[0].id }));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
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
    setLoading(true);

    try {
      const token = localStorage.getItem('pb_auth_token');
      
      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description || '');
      formDataToSend.append('basePrice', parseFloat(formData.basePrice).toString());
      formDataToSend.append('taxRate', parseFloat(formData.taxRate).toString());
      formDataToSend.append('categoryId', formData.categoryId);
      formDataToSend.append('isActive', formData.isActive.toString());
      formDataToSend.append('hsnSac', formData.hsnSac || '');
      
      if (imageFile) {
        formDataToSend.append('image', imageFile);
      }

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      // Don't set Content-Type header - browser will set it with boundary for FormData

      const response = await fetch('/api/menu/items', {
        method: 'POST',
        headers,
        body: formDataToSend,
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/menu');
      } else {
        alert(`Error: ${data.error || 'Failed to create item'}`);
      }
    } catch (error: any) {
      console.error('Error creating item:', error);
      alert(`Error: ${error.message || 'Failed to create item'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Add Menu Item</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4">
            <label className="block font-medium mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={handleNameChange}
              className={`w-full px-4 py-2 border rounded-lg ${duplicateWarning ? 'border-yellow-500' : ''}`}
              required
            />
            {duplicateWarning && (
              <p className="text-yellow-600 text-sm mt-1">{duplicateWarning}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-2">Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-4 py-2 border rounded-lg"
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
              className="w-full px-4 py-2 border rounded-lg"
              rows={3}
            />
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-2">Category *</label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              required
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
                className="w-full px-4 py-2 border rounded-lg"
                required
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
                className="w-full px-4 py-2 border rounded-lg"
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
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="mr-2"
              />
              <span>Active (visible to customers)</span>
            </label>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Item'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

