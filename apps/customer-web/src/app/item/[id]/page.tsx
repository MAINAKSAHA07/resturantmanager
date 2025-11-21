import { headers, cookies } from 'next/headers';
import { extractBrandKey } from '@restaurant/lib';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import AddToCartButton from '@/components/AddToCartButton';
import PocketBase from 'pocketbase';

async function getMenuItem(id: string, brandKey: string) {
  // Direct PocketBase connection with explicit environment variable reading
  const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
  const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
  const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
  
  const pb = new PocketBase(pbUrl);
  await pb.admins.authWithPassword(adminEmail, adminPassword);

  const tenants = await pb.collection('tenant').getList(1, 10, {
    filter: `key = "${brandKey}"`,
  });

  if (tenants.items.length === 0) {
    return null;
  }

  const tenant = tenants.items[0];

  try {
    // Get the item directly by ID
    const item = await pb.collection('menuItem').getOne(id, {
      expand: 'categoryId,tenantId,locationId',
    });

    // Verify item belongs to this tenant and is active
    const itemTenantId = Array.isArray(item.tenantId) ? item.tenantId[0] : item.tenantId;
    if (itemTenantId !== tenant.id || item.isActive !== true) {
      return null;
    }

    // Get all option groups and filter client-side (handle case where collection doesn't exist)
    let optionGroups: any[] = [];
    try {
      const allOptionGroups = await pb.collection('optionGroup').getList(1, 100);
      optionGroups = allOptionGroups.items.filter(group => {
        const groupMenuItemId = Array.isArray(group.menuItemId) ? group.menuItemId[0] : group.menuItemId;
        return groupMenuItemId === id;
      });
    } catch (error: any) {
      // Collection doesn't exist or no access - just continue without options
      console.log('Option groups not available:', error?.message);
    }

    // Get option values for each group
    const groupsWithOptions = await Promise.all(
      optionGroups.map(async (group) => {
        try {
          const allValues = await pb.collection('optionValue').getList(1, 100);
          const values = allValues.items.filter(value => {
            const valueGroupId = Array.isArray(value.groupId) ? value.groupId[0] : value.groupId;
            return valueGroupId === group.id;
          });
          return { ...group, values };
        } catch (error) {
          return { ...group, values: [] };
        }
      })
    );

    return { item, optionGroups: groupsWithOptions };
  } catch (error) {
    console.error('Error fetching menu item:', error);
    return null;
  }
}

export default async function ItemPage({
  params,
}: {
  params: { id: string };
}) {
  const headersList = headers();
  const cookieStore = cookies();
  const hostname = headersList.get('host') || '';
  
  // Check for tenant in cookie first, then subdomain
  const tenantCookie = cookieStore.get('selected_tenant')?.value;
  const extractedBrandKey = extractBrandKey(hostname);
  const brandKey = tenantCookie || extractedBrandKey || 'saffron';

  const data = await getMenuItem(params.id, brandKey);

  if (!data) {
    notFound();
  }

  const { item, optionGroups } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Menu
        </Link>
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {item.image && (
            <div className="h-96 bg-gray-200">
              <img
                src={`${process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://localhost:8090'}/api/files/menuItem/${item.id}/${item.image}`}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="p-6">
            <h1 className="text-3xl font-bold mb-2">{item.name}</h1>
            {item.description && (
              <p className="text-gray-600 mb-4">{item.description}</p>
            )}
            <p className="text-2xl font-bold mb-6">
              ₹{(item.basePrice / 100).toFixed(2)}
            </p>

            {optionGroups.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4">Customize</h2>
                {optionGroups.map((group) => (
                  <div key={group.id} className="mb-4">
                    <label className="block font-medium mb-2">
                      {group.name}
                      {group.required && <span className="text-red-500">*</span>}
                    </label>
                    <div className="space-y-2">
                      {group.values.map((value) => (
                        <label
                          key={value.id}
                          className="flex items-center space-x-2 cursor-pointer"
                        >
                          <input
                            type={
                              group.maxSelect === 1 ? 'radio' : 'checkbox'
                            }
                            name={group.id}
                            value={value.id}
                            className="form-radio"
                          />
                          <span>{value.name}</span>
                          {value.priceDelta !== 0 && (
                            <span className="text-sm text-gray-600">
                              (+₹{(value.priceDelta / 100).toFixed(2)})
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <AddToCartButton itemId={item.id} optionGroups={optionGroups} />
          </div>
        </div>
      </div>
    </div>
  );
}



