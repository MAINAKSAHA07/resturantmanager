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
  availability?: 'available' | 'not available';
  isActive?: boolean; // Legacy field for backward compatibility
  categoryId: string;
  categoryName?: string | null;
  image?: string;
}

export default function MenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchMenu();
    
    // Refetch when page becomes visible (user navigates back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchMenu();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchMenu = async () => {
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('pb_auth_token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Add cache-busting to ensure fresh data
      const timestamp = Date.now();
      const [categoriesRes, itemsRes] = await Promise.all([
        fetch(`/api/menu/categories?t=${timestamp}`, { headers, cache: 'no-store' }),
        fetch(`/api/menu/items?t=${timestamp}`, { headers, cache: 'no-store' }),
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

      // Normalize items to ensure categoryId is always a string
      const normalizedItems = (itemsData.items || []).map((item: any) => ({
        ...item,
        categoryId: Array.isArray(item.categoryId) ? item.categoryId[0] : item.categoryId || '',
      }));

      // Deduplicate by item ID first (most important - same ID = same item)
      const itemIdMap = new Map<string, any>();
      normalizedItems.forEach(item => {
        if (!itemIdMap.has(item.id)) {
          itemIdMap.set(item.id, item);
        } else {
          // If duplicate ID found, keep the one with more complete data or most recent
          const existing = itemIdMap.get(item.id);
          const itemCreated = new Date(item.created || item.updated || 0).getTime();
          const existingCreated = new Date(existing.created || existing.updated || 0).getTime();
          if (itemCreated > existingCreated) {
            itemIdMap.set(item.id, item);
          }
        }
      });

      // Then deduplicate by name+category combination (in case same item appears with different IDs)
      const nameCategoryMap = new Map<string, any>();
      Array.from(itemIdMap.values()).forEach(item => {
        const key = `${item.name.toLowerCase().trim()}_${item.categoryId || 'nocategory'}`;
        if (!nameCategoryMap.has(key)) {
          nameCategoryMap.set(key, item);
        } else {
          // Keep the one with the most recent created/updated date
          const existing = nameCategoryMap.get(key);
          const itemTime = new Date(item.created || item.updated || 0).getTime();
          const existingTime = new Date(existing.created || existing.updated || 0).getTime();
          if (itemTime > existingTime) {
            nameCategoryMap.set(key, item);
          }
        }
      });

      // Final deduplication pass using Set to ensure absolute uniqueness by ID
      const finalUniqueItems: MenuItem[] = [];
      const seenIds = new Set<string>();
      
      Array.from(nameCategoryMap.values()).forEach((item: any) => {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          finalUniqueItems.push(item);
        }
      });

      console.log(`Deduplication: ${normalizedItems.length} items -> ${finalUniqueItems.length} unique items`);
      
      // Debug: Log availability status for first few items
      if (finalUniqueItems.length > 0) {
        console.log('Sample items availability:', finalUniqueItems.slice(0, 3).map(item => ({
          name: item.name,
          availability: item.availability,
          isActive: item.isActive
        })));
      }
      
      setCategories(categoriesData.categories || []);
      setItems(finalUniqueItems);
    } catch (error: any) {
      console.error('Error fetching menu:', error);
      alert(`Error loading menu: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter items and ensure no duplicates in filtered results
  const filteredItemsMap = new Map<string, MenuItem>();
  
  // Get category IDs for "all" filter
  const categoryIds = new Set(categories.map(cat => cat.id));
  
  let itemsToFilter: MenuItem[];
  if (selectedCategory === 'all') {
    // Only show items that belong to displayed categories
    itemsToFilter = items.filter(item => {
      const itemCategoryId = Array.isArray(item.categoryId) ? item.categoryId[0] : item.categoryId;
      return itemCategoryId && categoryIds.has(itemCategoryId);
    });
  } else if (selectedCategory === 'uncategorized') {
    // Show items without categories or with categories not in the list
    itemsToFilter = items.filter(item => {
      const itemCategoryId = Array.isArray(item.categoryId) ? item.categoryId[0] : item.categoryId;
      return !itemCategoryId || !categoryIds.has(itemCategoryId);
    });
  } else {
    // Filter by specific category
    itemsToFilter = items.filter(item => {
      const itemCategoryId = Array.isArray(item.categoryId) ? item.categoryId[0] : item.categoryId;
      return itemCategoryId === selectedCategory;
    });
  }

  // Final deduplication of filtered items by ID
  itemsToFilter.forEach(item => {
    if (!filteredItemsMap.has(item.id)) {
      filteredItemsMap.set(item.id, item);
    }
  });

  const filteredItems = Array.from(filteredItemsMap.values());

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Menu Management</h1>
            <p className="text-gray-600 mt-1">
              {(() => {
                const categoryIds = new Set(categories.map(cat => cat.id));
                const categorizedItems = items.filter(item => {
                  const itemCategoryId = Array.isArray(item.categoryId) ? item.categoryId[0] : item.categoryId;
                  return itemCategoryId && categoryIds.has(itemCategoryId);
                });
                
                if (selectedCategory === 'all') {
                  return `Total Items: ${categorizedItems.length}`;
                } else if (selectedCategory === 'uncategorized') {
                  const uncategorizedCount = items.filter(item => {
                    const itemCategoryId = Array.isArray(item.categoryId) ? item.categoryId[0] : item.categoryId;
                    return !itemCategoryId || !categoryIds.has(itemCategoryId);
                  }).length;
                  return `Uncategorized Items: ${uncategorizedCount}`;
                } else {
                  return `Showing ${filteredItems.length} of ${categorizedItems.length} items`;
                }
              })()}
            </p>
          </div>
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

        <div className="mb-6 flex items-end gap-4">
          <div className="flex-1">
            <label className="block font-medium mb-2">Filter by Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border rounded-lg w-full"
            >
              {(() => {
                // Get category IDs for filtering
                const categoryIds = new Set(categories.map(cat => cat.id));
                
                // Count items that belong to displayed categories
                const categorizedItems = items.filter(item => {
                  const itemCategoryId = Array.isArray(item.categoryId) ? item.categoryId[0] : item.categoryId;
                  return itemCategoryId && categoryIds.has(itemCategoryId);
                });
                
                // Count uncategorized items
                const uncategorizedItems = items.filter(item => {
                  const itemCategoryId = Array.isArray(item.categoryId) ? item.categoryId[0] : item.categoryId;
                  return !itemCategoryId || !categoryIds.has(itemCategoryId);
                });
                
                return (
                  <>
                    <option value="all">
                      All Categories ({categorizedItems.length} items)
                    </option>
                    {categories.map((category) => {
                      const categoryItemCount = items.filter(item => {
                        const itemCategoryId = Array.isArray(item.categoryId) ? item.categoryId[0] : item.categoryId;
                        return itemCategoryId === category.id;
                      }).length;
                      return (
                        <option key={category.id} value={category.id}>
                          {category.name} ({categoryItemCount} items)
                        </option>
                      );
                    })}
                    {uncategorizedItems.length > 0 && (
                      <option value="uncategorized">
                        Uncategorized ({uncategorizedItems.length} items)
                      </option>
                    )}
                  </>
                );
              })()}
            </select>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg border shadow-sm">
            <p className="text-sm text-gray-600">Displaying</p>
            <p className="text-2xl font-bold text-blue-600">{filteredItems.length}</p>
            <p className="text-xs text-gray-500">menu items</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            // Ensure unique key - use ID only since we've already deduplicated
            return (
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
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">{item.name}</h3>
                    {item.categoryName ? (
                      <p className="text-xs text-gray-500 mt-1">Category: {item.categoryName}</p>
                    ) : item.categoryId ? (
                      <p className="text-xs text-yellow-600 mt-1">Category ID: {item.categoryId}</p>
                    ) : (
                      <p className="text-xs text-red-600 mt-1">No category assigned</p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      (() => {
                        // Prioritize availability field, fallback to isActive only if availability is not set
                        if (item.availability !== undefined) {
                          return item.availability === 'available';
                        }
                        return item.isActive !== false;
                      })()
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {(() => {
                      // Prioritize availability field, fallback to isActive only if availability is not set
                      if (item.availability !== undefined) {
                        return item.availability === 'available' ? 'Available' : 'Not Available';
                      }
                      return item.isActive !== false ? 'Available' : 'Not Available';
                    })()}
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
            );
          })}
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

