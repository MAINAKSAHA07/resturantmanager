import { createPocketBaseAdminClient } from '@restaurant/lib';
import Link from 'next/link';

async function getTenants() {
  try {
    // Direct PocketBase connection with explicit environment variable reading
    const PocketBase = (await import('pocketbase')).default;
    const pbUrl = process.env.POCKETBASE_URL || process.env.AWS_POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL;
    const adminPassword = process.env.PB_ADMIN_PASSWORD;
    
    if (!adminEmail || !adminPassword) {
      console.error('[TenantsPage] PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD must be set');
      return [];
    }
    
    console.log('[TenantsPage] Attempting connection:', {
      pbUrl,
      adminEmail,
      hasPassword: !!adminPassword,
    });
    
    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    
    const tenants = await pb.collection('tenant').getList(1, 100, {
      sort: 'name',
    });
    console.log('[TenantsPage] Successfully fetched', tenants.items.length, 'tenants');
    return tenants.items;
  } catch (error: any) {
    console.error('[TenantsPage] Error fetching tenants:', {
      message: error?.message,
      status: error?.status || error?.response?.status,
      response: error?.response?.data || error?.response,
      pbUrl: process.env.POCKETBASE_URL,
      hasEmail: !!process.env.PB_ADMIN_EMAIL,
      hasPassword: !!process.env.PB_ADMIN_PASSWORD,
      errorName: error?.name,
      errorCode: error?.code,
    });
    return [];
  }
}

export default async function TenantsPage() {
  const tenants = await getTenants();
  
  // Log for debugging (will show in server console)
  console.log('[TenantsPage] Fetched tenants:', tenants.length);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Choose Your Restaurant
          </h1>
          <p className="text-xl text-gray-600">
            Select a restaurant to view their menu and place an order
          </p>
        </div>

        {tenants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg mb-4">No restaurants available at this time.</p>
            <p className="text-sm text-gray-500">
              Please check that PocketBase is running and tenants are created.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tenants.map((tenant) => (
              <Link
                key={tenant.id}
                href={`/?tenant=${tenant.key}`}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group"
              >
                <div className="h-48 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="text-6xl font-bold mb-2 opacity-90">
                      {tenant.name.charAt(0)}
                    </div>
                    <p className="text-sm opacity-75">Restaurant</p>
                  </div>
                </div>
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {tenant.name}
                  </h2>
                  {tenant.description && (
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {tenant.description}
                    </p>
                  )}
                  <div className="flex items-center text-blue-600 font-semibold">
                    <span>View Menu</span>
                    <svg
                      className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {tenants.length > 0 && (
          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">
              Select a restaurant above to view their menu and place an order
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

