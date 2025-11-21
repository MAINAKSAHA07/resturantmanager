import { headers, cookies } from 'next/headers';
import { extractBrandKey } from '@restaurant/lib';
import Link from 'next/link';
import PocketBase from 'pocketbase';
import TenantSelector from '@/components/TenantSelector';

async function getMenu(brandKey: string) {
  try {
    // Direct PocketBase connection with explicit environment variable reading
    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
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
    const categories = allCategories.items.filter(cat => {
      const catTenantId = Array.isArray(cat.tenantId) ? cat.tenantId[0] : cat.tenantId;
      const catLocationId = Array.isArray(cat.locationId) ? cat.locationId[0] : cat.locationId;
      return catTenantId === tenant.id && locationIds.includes(catLocationId);
    });

    // Get all items and filter client-side
    const allItems = await pb.collection('menuItem').getList(1, 500, {
      expand: 'categoryId,tenantId,locationId',
    });
    
    // Filter by tenant, location, and active status
    // Also remove duplicates (same name in same category)
    const seenItems = new Map<string, any>();
    const items = allItems.items
      .filter(item => {
        const itemTenantId = Array.isArray(item.tenantId) ? item.tenantId[0] : item.tenantId;
        const itemLocationId = Array.isArray(item.locationId) ? item.locationId[0] : item.locationId;
        return itemTenantId === tenant.id && locationIds.includes(itemLocationId) && item.isActive === true;
      })
      .filter(item => {
        // Check for duplicates: same name in same category
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
    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
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
  const selectedTenant = brandKey;

  const { categories, items, location } = await getMenu(brandKey);
  const tenants = await getTenants();

  return (
    <div className="min-h-screen bg-gray-50">
      <TenantSelector />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Tenant Selector */}
        {tenants.length > 1 && (
          <div className="mb-6 bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Switch Restaurant:</p>
                <div className="flex flex-wrap gap-2">
                  {tenants.map((tenant) => (
                    <Link
                      key={tenant.id}
                      href={`/?tenant=${tenant.key}`}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        tenant.key === brandKey
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tenant.name}
                    </Link>
                  ))}
                </div>
              </div>
              <Link
                href="/tenants"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All →
              </Link>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Our Menu</h1>
          {location && (
            <p className="text-lg text-gray-600">{location.name}</p>
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
                <h2 className="text-3xl font-bold mb-6 text-gray-900 border-b-2 border-gray-200 pb-2">
                  {category.name}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryItems.map((item) => (
                    <Link
                      key={item.id}
                      href={`/item/${item.id}`}
                      className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
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
                        <p className="text-xl font-bold text-blue-600">
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



