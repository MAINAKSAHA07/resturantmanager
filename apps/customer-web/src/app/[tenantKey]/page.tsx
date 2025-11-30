import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import PocketBase from 'pocketbase';

async function getTenantByKey(tenantKey: string) {
  try {
    const pbUrl = process.env.POCKETBASE_URL || process.env.AWS_POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL;
    const adminPassword = process.env.PB_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return null;
    }

    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    const tenants = await pb.collection('tenant').getList(1, 1, {
      filter: `key = "${tenantKey}"`,
    });

    if (tenants.items.length === 0) {
      return null;
    }

    return tenants.items[0];
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return null;
  }
}

export default async function TenantRedirectPage({
  params,
}: {
  params: Promise<{ tenantKey: string }>;
}) {
  const { tenantKey } = await params;

  if (!tenantKey) {
    redirect('/tenants');
  }

  const tenant = await getTenantByKey(tenantKey);

  if (!tenant) {
    // Tenant not found, redirect to tenant selection
    redirect('/tenants');
  }

  // Set tenant cookie server-side
  const cookieStore = cookies();
  cookieStore.set('selected_tenant', tenantKey, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: 'lax',
  });

  // Redirect to menu page
  redirect(`/?tenant=${tenantKey}`);
}

