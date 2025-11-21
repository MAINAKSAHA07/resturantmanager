'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewCategoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sort: '0',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('pb_auth_token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/menu/categories', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...formData,
          sort: parseInt(formData.sort, 10),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/menu/categories');
      } else {
        const errorMsg = data.error || 'Failed to create category';
        const details = data.details ? `\n\n${data.details}` : '';
        alert(`Error: ${errorMsg}${details}`);
      }
    } catch (error: any) {
      console.error('Error creating category:', error);
      alert(`Error: ${error.message || 'Failed to create category'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Add Menu Category</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4">
            <label className="block font-medium mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-2">Sort Order</label>
            <input
              type="number"
              value={formData.sort}
              onChange={(e) => setFormData({ ...formData, sort: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
            <p className="text-sm text-gray-600 mt-1">
              Lower numbers appear first in the menu
            </p>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Category'}
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

