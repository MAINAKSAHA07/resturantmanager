import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Use direct PocketBase connection like other endpoints
    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL;
    const adminPassword = process.env.PB_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD must be set' }, { status: 500 });
    }

    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    const cookieStore = cookies();
    const tenantId = cookieStore.get('selected_tenant_id')?.value;

    // Get all tenants
    const tenants = await pb.collection('tenant').getList(1, 100);
    
    // Get all locations
    let locations;
    try {
      locations = await pb.collection('location').getList(1, 100);
    } catch (error: any) {
      return NextResponse.json({
        error: 'Location collection does not exist',
        status: error.status,
        tenants: tenants.items.map(t => ({ id: t.id, name: t.name })),
      });
    }

    // Analyze each location's tenantId
    const locationAnalysis = locations.items.map((loc: any) => {
      let locTenantId: any = loc.tenantId;
      let tenantIdType = typeof locTenantId;
      let isArray = Array.isArray(locTenantId);
      let isObject = typeof locTenantId === 'object' && locTenantId !== null;
      let resolvedTenantId: string | null = null;

      if (isArray) {
        resolvedTenantId = locTenantId[0] || null;
      } else if (isObject) {
        resolvedTenantId = locTenantId.id || null;
      } else if (typeof locTenantId === 'string') {
        resolvedTenantId = locTenantId;
      }

      return {
        id: loc.id,
        name: loc.name,
        rawTenantId: locTenantId,
        tenantIdType,
        isArray,
        isObject,
        resolvedTenantId,
        matchesSelectedTenant: resolvedTenantId === tenantId,
      };
    });

    return NextResponse.json({
      selectedTenantId: tenantId,
      tenants: tenants.items.map(t => ({ id: t.id, name: t.name })),
      totalLocations: locations.items.length,
      locations: locationAnalysis,
      locationsForSelectedTenant: locationAnalysis.filter(l => l.matchesSelectedTenant).length,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      status: error.status,
    }, { status: 500 });
  }
}

