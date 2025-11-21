'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface MenuCategory {
  id: string;
  name: string;
  sort: number;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  taxRate: number;
  isActive: boolean;
  categoryId: string;
  image?: string;
}

export default function MenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('pb_auth_token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const [categoriesRes, itemsRes] = await Promise.all([
        fetch('/api/menu/categories', { headers }),
        fetch('/api/menu/items', { headers }),
      ]);

      if (!categoriesRes.ok) {
        const errorData = await categoriesRes.json();
        console.error('Error fetching categories:', errorData);
        throw new Error(errorData.error || 'Failed to fetch categories');
      }

      if (!itemsRes.ok) {
        const errorData = await itemsRes.json();
        console.error('Error fetching items:', errorData);
        throw new Error(errorData.error || 'Failed to fetch items');
      }

      const categoriesData = await categoriesRes.json();
      const itemsData = await itemsRes.json();

      setCategories(categoriesData.categories || []);
      setItems(itemsData.items || []);
    } catch (error: any) {
      console.error('Error fetching menu:', error);
      alert(`Error loading menu: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = selectedCategory === 'all'
    ? items
    : items.filter(item => item.categoryId === selectedCategory);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Menu Management</h1>
          <div className="flex gap-2">
            <Link
              href="/menu/categories"
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              Manage Categories
            </Link>
            <Link
              href="/menu/categories/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Add Category
            </Link>
            <Link
              href="/menu/items/new"
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Add Item
            </Link>
          </div>
        </div>

        <div className="mb-6">
          <label className="block font-medium mb-2">Filter by Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              {item.image && (
                <div className="h-48 bg-gray-200">
                  <img
                    src={`http://localhost:8090/api/files/menuItem/${item.id}/${item.image}`}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-semibold">{item.name}</h3>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      item.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {item.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {item.description && (
                  <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                )}
                <div className="flex justify-between items-center">
                  <p className="text-lg font-bold">
                    ₹{(item.basePrice / 100).toFixed(2)}
                  </p>
                  <Link
                    href={`/menu/items/${item.id}/edit`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <p className="text-gray-600 mb-4">No menu items found</p>
            <Link
              href="/menu/items/new"
              className="text-blue-600 hover:underline"
            >
              Add your first menu item
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

