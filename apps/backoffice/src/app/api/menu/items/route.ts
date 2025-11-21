import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

export async function GET(request: NextRequest) {
  try {
    // Get auth token from cookie or header
    const token = request.cookies.get('pb_auth_token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
    
    // Use admin client to ensure we have access to all collections
    // Create admin client directly to avoid environment variable issues
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
    const adminPb = new PocketBase(pbUrl);
    await adminPb.admins.authWithPassword(adminEmail, adminPassword);
    
    // Get selected tenant from cookie, or fallback to first tenant
    const selectedTenantId = request.cookies.get('selected_tenant_id')?.value;
    let tenant;
    
    if (selectedTenantId) {
      try {
        tenant = await adminPb.collection('tenant').getOne(selectedTenantId);
      } catch (error: any) {
        // If tenant not found, fallback to first tenant
        const tenants = await adminPb.collection('tenant').getList(1, 1);
        if (tenants.items.length === 0) {
          return NextResponse.json({ items: [] });
        }
        tenant = tenants.items[0];
      }
    } else {
      // Fallback to first tenant if no selection
      const tenants = await adminPb.collection('tenant').getList(1, 1);
      if (tenants.items.length === 0) {
        return NextResponse.json({ items: [] });
      }
      tenant = tenants.items[0];
    }
    
    // Check if location collection exists and get locations for this tenant
    let locations;
    try {
      // Get all locations and filter client-side to handle relation fields
      const allLocations = await adminPb.collection('location').getList(1, 100, {
        expand: 'tenantId',
      });
      
      // Filter by tenant (handle relation fields which may be arrays)
      locations = {
        items: allLocations.items.filter(loc => {
          const locTenantId = Array.isArray(loc.tenantId) ? loc.tenantId[0] : loc.tenantId;
          return locTenantId === tenant.id;
        })
      };
    } catch (error: any) {
      // Collection doesn't exist yet
      if (error.status === 404) {
        return NextResponse.json({ items: [] });
      }
      throw error;
    }

    if (locations.items.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // Get all location IDs for this tenant (to show items from all locations)
    const locationIds = locations.items.map(loc => loc.id);

    // Check if menuItem collection exists
    let items;
    try {
      // Get all items and filter client-side to handle relation fields properly
      const allItems = await adminPb.collection('menuItem').getList(1, 500, {
        expand: 'categoryId,tenantId,locationId',
      });
      
      // Filter by tenant only (show items from all locations for this tenant)
      items = {
        items: allItems.items.filter(item => {
          const itemTenantId = Array.isArray(item.tenantId) ? item.tenantId[0] : item.tenantId;
          const itemLocationId = Array.isArray(item.locationId) ? item.locationId[0] : item.locationId;
          // Match tenant AND ensure location belongs to this tenant
          return itemTenantId === tenant.id && locationIds.includes(itemLocationId);
        })
      };
    } catch (error: any) {
      // Collection doesn't exist yet
      if (error.status === 404) {
        return NextResponse.json({ items: [] });
      }
      throw error;
    }

    return NextResponse.json({ items: items.items });
  } catch (error: any) {
    const status = error.status || error.response?.status;
    
    console.error('Error fetching items:', {
      message: error.message,
      response: error.response?.data || error.response,
      status: status,
      stack: error.stack,
    });
    
    // Handle 404 - collection doesn't exist
    if (status === 404) {
      return NextResponse.json({ items: [] });
    }
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch items',
        details: process.env.NODE_ENV === 'development' ? (error.response?.data || error.response) : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get auth token from cookie or header
    const token = request.cookies.get('pb_auth_token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
    
    // Use admin client to ensure we have access to all collections
    // Create admin client directly to avoid environment variable issues
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
    const adminPb = new PocketBase(pbUrl);
    await adminPb.admins.authWithPassword(adminEmail, adminPassword);

    const body = await request.json();
    const { name, description, basePrice, taxRate, categoryId, isActive, hsnSac } = body;
    
    // Get selected tenant from cookie, or fallback to first tenant
    const selectedTenantId = request.cookies.get('selected_tenant_id')?.value;
    let tenant;
    
    if (selectedTenantId) {
      try {
        tenant = await adminPb.collection('tenant').getOne(selectedTenantId);
      } catch (error: any) {
        // If tenant not found, fallback to first tenant
        const tenants = await adminPb.collection('tenant').getList(1, 1);
        if (tenants.items.length === 0) {
          return NextResponse.json({ 
            error: 'No tenant found. Please run the seed script: npm run seed' 
          }, { status: 404 });
        }
        tenant = tenants.items[0];
      }
    } else {
      // Fallback to first tenant if no selection
      const tenants = await adminPb.collection('tenant').getList(1, 1);
      if (tenants.items.length === 0) {
        return NextResponse.json({ 
          error: 'No tenant found. Please run the seed script: npm run seed' 
        }, { status: 404 });
      }
      tenant = tenants.items[0];
    }
    // Get all locations and filter client-side to handle relation fields
    const allLocations = await adminPb.collection('location').getList(1, 100, {
      expand: 'tenantId',
    });
    
    // Filter by tenant (handle relation fields which may be arrays)
    const locations = {
      items: allLocations.items.filter(loc => {
        const locTenantId = Array.isArray(loc.tenantId) ? loc.tenantId[0] : loc.tenantId;
        return locTenantId === tenant.id;
      })
    };

    if (locations.items.length === 0) {
      return NextResponse.json({ 
        error: 'No location found for the selected tenant. Please create a location first or run the seed script: npm run seed' 
      }, { status: 404 });
    }

    const location = locations.items[0];

    const item = await adminPb.collection('menuItem').create({
      tenantId: tenant.id,
      locationId: location.id,
      categoryId,
      name,
      description: description || '',
      basePrice: Math.round(basePrice * 100), // Convert to paise
      taxRate: taxRate || 5,
      hsnSac: hsnSac || '',
      isActive: isActive !== false,
    });

    return NextResponse.json({ item });
  } catch (error: any) {
    console.error('Error creating item:', {
      message: error.message,
      status: error.status || error.response?.status,
      response: error.response?.data || error.response,
    });
    
    // Handle 404 - collection doesn't exist
    if (error.status === 404 || error.response?.status === 404) {
      return NextResponse.json(
        { 
          error: 'Required collections are missing. Please create "location" and "menuItem" collections in PocketBase Admin UI first.',
          details: 'Go to http://localhost:8090/_/ and create the collections manually.'
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to create item' },
      { status: 500 }
    );
  }
}

