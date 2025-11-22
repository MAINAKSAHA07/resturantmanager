import { headers, cookies } from 'next/headers';
import { extractBrandKey } from '@restaurant/lib';
import Link from 'next/link';
import PocketBase from 'pocketbase';
import TenantSelector from '@/components/TenantSelector';

async function getMenu(brandKey: string) {
  try {
    // Direct PocketBase connection with explicit environment variable reading
    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    
    // Get tenant by key
    const tenants = await pb.collection('tenant').getList(1, 10, {
      filter: `key = "${brandKey}"`,
    });

    if (tenants.items.length === 0) {
      return { categories: [], items: [], location: null };
    }

    const tenant = tenants.items[0];
    
    // Get all locations and filter client-side to handle relation fields
    const allLocations = await pb.collection('location').getList(1, 100, {
      expand: 'tenantId',
    });
    
    // Filter by tenant (handle relation fields which may be arrays)
    const locations = allLocations.items.filter(loc => {
      const locTenantId = Array.isArray(loc.tenantId) ? loc.tenantId[0] : loc.tenantId;
      return locTenantId === tenant.id;
    });

    if (locations.length === 0) {
      return { categories: [], items: [], location: null };
    }

    // Use the first location (or could show all locations)
    const location = locations[0];
    const locationIds = locations.map(loc => loc.id);

    // Get all categories and filter client-side
    const allCategories = await pb.collection('menuCategory').getList(1, 500, {
      sort: 'sort',
      expand: 'tenantId,locationId',
    });
    
    // Filter by tenant and location (handle relation fields)
    const filteredCategories = allCategories.items.filter(cat => {
      const catTenantId = Array.isArray(cat.tenantId) ? cat.tenantId[0] : cat.tenantId;
      const catLocationId = Array.isArray(cat.locationId) ? cat.locationId[0] : cat.locationId;
      return catTenantId === tenant.id && locationIds.includes(catLocationId);
    });

    // Deduplicate categories by name (keep the one with the lowest sort order, or first created)
    const categoryMap = new Map<string, any>();
    filteredCategories.forEach(cat => {
      const nameKey = cat.name.toLowerCase().trim();
      if (!categoryMap.has(nameKey)) {
        categoryMap.set(nameKey, cat);
      } else {
        // If duplicate found, keep the one with lower sort order, or if same sort, keep the one with earlier ID (created first)
        const existing = categoryMap.get(nameKey);
        if (cat.sort < existing.sort || (cat.sort === existing.sort && cat.id < existing.id)) {
          categoryMap.set(nameKey, cat);
        }
      }
    });

    // Also deduplicate by ID to ensure no duplicate IDs
    const categoryIdMap = new Map<string, any>();
    Array.from(categoryMap.values()).forEach(cat => {
      if (!categoryIdMap.has(cat.id)) {
        categoryIdMap.set(cat.id, cat);
      }
    });

    const categories = Array.from(categoryIdMap.values()).sort((a, b) => a.sort - b.sort);

    // Get all items and filter client-side
    const allItems = await pb.collection('menuItem').getList(1, 500, {
      expand: 'categoryId,tenantId,locationId',
    });
    
    // Filter by tenant, location, and availability status
    // Only show items that are "available" to customers
    // Also remove duplicates by ID first, then by name+category
    const itemIdMap = new Map<string, any>();
    const filteredItems = allItems.items.filter(item => {
      const itemTenantId = Array.isArray(item.tenantId) ? item.tenantId[0] : item.tenantId;
      const itemLocationId = Array.isArray(item.locationId) ? item.locationId[0] : item.locationId;
      
      // Check availability: prioritize availability field, fallback to isActive only if availability is undefined
      let isAvailable = false;
      if (item.availability !== undefined) {
        isAvailable = item.availability === 'available';
      } else {
        // Fallback to isActive only if availability is not set
        isAvailable = item.isActive !== false;
      }
      
      return itemTenantId === tenant.id && locationIds.includes(itemLocationId) && isAvailable;
    });

    // First deduplicate by item ID
    filteredItems.forEach(item => {
      if (!itemIdMap.has(item.id)) {
        itemIdMap.set(item.id, item);
      }
    });

    // Then deduplicate by name+category (keep the most recent)
    const seenItems = new Map<string, any>();
    const items = Array.from(itemIdMap.values()).filter(item => {
      const itemCategoryId = Array.isArray(item.categoryId) ? item.categoryId[0] : item.categoryId;
      const key = `${item.name.toLowerCase().trim()}_${itemCategoryId}`;
      if (seenItems.has(key)) {
        // Keep the one with the most recent created date
        const existing = seenItems.get(key);
        if (new Date(item.created) > new Date(existing.created)) {
          seenItems.set(key, item);
          return true;
        }
        return false;
      }
      seenItems.set(key, item);
      return true;
    });

    return { categories, items, location };
  } catch (error) {
    console.error('Error fetching menu:', error);
    return { categories: [], items: [], location: null };
  }
}

async function getTenants() {
  try {
    // Direct PocketBase connection
    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    
    const tenants = await pb.collection('tenant').getList(1, 100, {
      sort: 'name',
    });
    return tenants.items;
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return [];
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }>;
}) {
  const headersList = headers();
  const cookieStore = cookies();
  const hostname = headersList.get('host') || '';
  
  // Check for tenant in query params first, then cookie, then subdomain
  const params = await searchParams;
  const tenantParam = params?.tenant;
  const tenantCookie = cookieStore.get('selected_tenant')?.value;
  const extractedBrandKey = extractBrandKey(hostname);
  const brandKey = tenantParam || tenantCookie || extractedBrandKey;

  // If no tenant is selected (no query param, no cookie, and no subdomain), redirect to tenant selection
  if (!brandKey) {
    const { redirect } = await import('next/navigation');
    redirect('/tenants');
  }
  
  // Use the selected tenant (query param takes precedence, then cookie, then subdomain)
  const selectedTenant = brandKey || 'saffron';

  const { categories, items, location } = await getMenu(selectedTenant);
  const tenants = await getTenants();

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent-blue/5 via-accent-purple/5 to-accent-green/5">
      <TenantSelector />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Tenant Selector */}
        {tenants.length > 1 && (
          <div className="mb-6 card border-2 border-accent-blue/20">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-2 font-medium">Switch Restaurant:</p>
                <div className="flex flex-wrap gap-2">
                  {tenants.map((tenant) => (
                    <Link
                      key={tenant.id}
                      href={`/?tenant=${tenant.key}`}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        tenant.key === brandKey
                          ? 'bg-accent-blue text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-accent-purple/20 hover:border-2 hover:border-accent-purple/30'
                      }`}
                    >
                      {tenant.name}
                    </Link>
                  ))}
                </div>
              </div>
              <Link
                href="/tenants"
                className="text-sm text-accent-blue hover:text-accent-purple font-medium transition-colors duration-200"
              >
                View All →
              </Link>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent mb-2">Our Menu</h1>
          {location && (
            <p className="text-lg text-gray-600 font-medium">{location.name}</p>
          )}
        </div>
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No menu items available at this time.</p>
          </div>
        ) : (
          categories.map((category) => {
            const categoryItems = items.filter((item) => {
              const itemCategoryId = Array.isArray(item.categoryId) 
                ? item.categoryId[0] 
                : item.categoryId;
              return itemCategoryId === category.id;
            });

            if (categoryItems.length === 0) return null;

            return (
              <section key={category.id} className="mb-16">
                <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent border-b-2 border-accent-blue/30 pb-2">
                  {category.name}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryItems.map((item) => (
                    <Link
                      key={item.id}
                      href={`/item/${item.id}`}
                      className="card overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 border-2 border-transparent hover:border-accent-blue/30"
                    >
                      {item.image && (
                        <div className="h-48 bg-gray-200 overflow-hidden">
                          <img
                            src={`${process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://localhost:8090'}/api/files/menuItem/${item.id}/${item.image}`}
                            alt={item.name}
                            className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <div className="p-5">
                        <h3 className="text-xl font-semibold mb-2 text-gray-900">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        <p className="text-xl font-bold text-accent-blue">
                          ₹{(item.basePrice / 100).toFixed(2)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </main>
    </div>
  );
}



