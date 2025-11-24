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

    console.log('[Locations API] Fetching locations for tenant:', tenantId);

    if (!tenantId) {
      console.warn('[Locations API] No tenant selected. Returning empty list.');
      return NextResponse.json({ locations: [] });
    }

    // Verify tenant exists
    let tenant;
    try {
      tenant = await pb.collection('tenant').getOne(tenantId);
      console.log('[Locations API] Tenant verified:', { id: tenant.id, name: tenant.name });
    } catch (error: any) {
      console.error('[Locations API] Tenant not found:', {
        tenantId,
        error: error.message,
        status: error.status,
      });
      return NextResponse.json({ 
        locations: [],
        error: 'Tenant not found',
        tenantId 
      });
    }

    // Check if location collection exists
    let allLocations;
    try {
      allLocations = await pb.collection('location').getList(1, 100);
      console.log(`[Locations API] Fetched ${allLocations.items.length} total locations from database`);
      
      // Log all locations with their tenantId for debugging
      if (allLocations.items.length > 0) {
        console.log('[Locations API] All locations in database:');
        allLocations.items.forEach((loc: any) => {
          const locTenantId = Array.isArray(loc.tenantId) 
            ? loc.tenantId[0] 
            : (typeof loc.tenantId === 'object' && loc.tenantId !== null 
                ? loc.tenantId.id || loc.tenantId 
                : loc.tenantId);
          console.log(`  - "${loc.name}" (${loc.id}): tenantId = ${locTenantId} (type: ${typeof locTenantId}, isArray: ${Array.isArray(loc.tenantId)})`);
        });
      }
    } catch (error: any) {
      // Collection doesn't exist yet
      if (error.status === 404) {
        console.warn('[Locations API] location collection does not exist yet. Returning empty list.');
        return NextResponse.json({ locations: [] });
      }
      throw error;
    }

    // Filter by tenant (handle relation fields which may be arrays, objects, or strings)
    const filteredLocations = allLocations.items.filter((loc: any) => {
      // Handle different formats of tenantId:
      // 1. String (most common)
      // 2. Array (if multi-select, though this should be single)
      // 3. Object (if expanded)
      let locTenantId: string | null = null;
      
      if (Array.isArray(loc.tenantId)) {
        locTenantId = loc.tenantId[0] || null;
      } else if (typeof loc.tenantId === 'object' && loc.tenantId !== null) {
        // Expanded relation - get the ID
        locTenantId = loc.tenantId.id || loc.tenantId;
      } else if (typeof loc.tenantId === 'string') {
        locTenantId = loc.tenantId;
      }
      
      const matches = locTenantId === tenantId;
      
      if (!matches && locTenantId) {
        console.log(`[Locations API] Location "${loc.name}" (${loc.id}) belongs to tenant ${locTenantId}, not ${tenantId}`);
      } else if (!locTenantId) {
        console.warn(`[Locations API] Location "${loc.name}" (${loc.id}) has no tenantId!`);
      }
      
      return matches;
    });

    console.log(`[Locations API] Found ${filteredLocations.length} locations for tenant ${tenant.name} (${tenantId})`);
    console.log(`[Locations API] Looking for tenantId: "${tenantId}" (type: ${typeof tenantId})`);

    return NextResponse.json({ 
      locations: filteredLocations,
      tenant: {
        id: tenant.id,
        name: tenant.name,
      },
    });
  } catch (error: any) {
    console.error('[Locations API] Error fetching locations:', {
      message: error.message,
      status: error.status,
      response: error.response?.data,
      stack: error.stack,
    });
    
    // Return empty array on error instead of failing completely
    return NextResponse.json({ 
      locations: [],
      error: error.message || 'Failed to fetch locations'
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Use direct PocketBase connection like other endpoints
    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL;
    const adminPassword = process.env.PB_ADMIN_PASSWORD;

    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    const cookieStore = cookies();
    const tenantId = cookieStore.get('selected_tenant_id')?.value;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant selected. Please select a tenant first.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, stateCode, gstin, address, hours } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Location name is required' },
        { status: 400 }
      );
    }

    if (!stateCode || typeof stateCode !== 'string' || stateCode.trim() === '') {
      return NextResponse.json(
        { error: 'State code is required' },
        { status: 400 }
      );
    }

    if (!gstin || typeof gstin !== 'string' || gstin.trim() === '') {
      return NextResponse.json(
        { error: 'GSTIN is required' },
        { status: 400 }
      );
    }

    // Verify tenant exists before creating location
    let tenant;
    try {
      tenant = await pb.collection('tenant').getOne(tenantId);
      console.log('[Locations API] Creating location for tenant:', { id: tenant.id, name: tenant.name });
    } catch (error: any) {
      console.error('[Locations API] Tenant not found when creating location:', {
        tenantId,
        error: error.message,
        status: error.status,
      });
      return NextResponse.json(
        { error: `Tenant not found: ${tenantId}` },
        { status: 404 }
      );
    }

    const locationData: any = {
      tenantId, // PocketBase expects the relation ID as a string
      name: name.trim(),
      stateCode: stateCode.trim(),
      gstin: gstin.trim(),
    };

    if (address) {
      locationData.address = address;
    }

    if (hours) {
      locationData.hours = hours;
    }

    console.log('[Locations API] Creating location with data:', {
      tenantId,
      name: locationData.name,
      stateCode: locationData.stateCode,
      gstin: locationData.gstin,
    });

    const newLocation = await pb.collection('location').create(locationData);

    console.log('[Locations API] Location created successfully:', {
      id: newLocation.id,
      name: newLocation.name,
      tenantId: newLocation.tenantId,
    });

    return NextResponse.json({ success: true, location: newLocation });
  } catch (error: any) {
    console.error('Error creating location:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create location' },
      { status: error.status || 500 }
    );
  }
}

