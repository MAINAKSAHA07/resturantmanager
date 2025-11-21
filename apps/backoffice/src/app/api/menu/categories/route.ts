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

    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    
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
          return NextResponse.json({ categories: [] });
        }
        tenant = tenants.items[0];
      }
    } else {
      // Fallback to first tenant if no selection
      const tenants = await adminPb.collection('tenant').getList(1, 1);
      if (tenants.items.length === 0) {
        return NextResponse.json({ categories: [] });
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
        return NextResponse.json({ categories: [] });
      }
      throw error;
    }

    if (locations.items.length === 0) {
      return NextResponse.json({ categories: [] });
    }

    // Get all location IDs for this tenant (to show categories from all locations)
    const locationIds = locations.items.map(loc => loc.id);

    // Check if menuCategory collection exists
    let categories;
    try {
      // Get all categories and filter client-side to handle relation fields properly
      const allCategories = await adminPb.collection('menuCategory').getList(1, 500, {
        sort: 'sort',
        expand: 'tenantId,locationId',
      });
      
      // Filter by tenant only (show categories from all locations for this tenant)
      const filteredCategories = allCategories.items.filter(cat => {
        const catTenantId = Array.isArray(cat.tenantId) ? cat.tenantId[0] : cat.tenantId;
        const catLocationId = Array.isArray(cat.locationId) ? cat.locationId[0] : cat.locationId;
        // Match tenant AND ensure location belongs to this tenant
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

      categories = {
        items: Array.from(categoryMap.values())
      };
    } catch (error: any) {
      // Collection doesn't exist yet
      if (error.status === 404) {
        return NextResponse.json({ categories: [] });
      }
      throw error;
    }

    // Sort by sort order
    const sortedCategories = categories.items.sort((a, b) => a.sort - b.sort);

    return NextResponse.json({ categories: sortedCategories });
  } catch (error: any) {
    console.error('Error fetching categories:', {
      message: error.message,
      response: error.response?.data || error.response,
      status: error.status || error.response?.status,
      stack: error.stack,
    });
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch categories',
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

    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    
    // Use admin client to ensure we have access to all collections
    // Create admin client directly to avoid environment variable issues
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
    const adminPb = new PocketBase(pbUrl);
    await adminPb.admins.authWithPassword(adminEmail, adminPassword);

    const body = await request.json();
    const { name, sort } = body;
    
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
            error: 'No tenant found. Please run the seed script to create initial data: npm run seed' 
          }, { status: 404 });
        }
        tenant = tenants.items[0];
      }
    } else {
      // Fallback to first tenant if no selection
      const tenants = await adminPb.collection('tenant').getList(1, 1);
      if (tenants.items.length === 0) {
        return NextResponse.json({ 
          error: 'No tenant found. Please run the seed script to create initial data: npm run seed' 
        }, { status: 404 });
      }
      tenant = tenants.items[0];
    }
    
    // Check if location collection exists
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
      const errorStatus = error.status || error.response?.status;
      if (errorStatus === 404) {
        return NextResponse.json({ 
          error: 'Location collection does not exist. Please create it in PocketBase Admin UI first.',
          details: 'Go to http://localhost:8090/_/ → Collections → Create new collection named "location"'
        }, { status: 404 });
      }
      throw error;
    }

    if (locations.items.length === 0) {
      return NextResponse.json({ 
        error: 'No location found for the selected tenant. Please create a location first or run the seed script: npm run seed' 
      }, { status: 404 });
    }

    const location = locations.items[0];

    // Check if menuCategory collection exists
    let category;
    try {
      category = await adminPb.collection('menuCategory').create({
        tenantId: tenant.id,
        locationId: location.id,
        name,
        sort: sort || 0,
      });
    } catch (error: any) {
      const errorStatus = error.status || error.response?.status;
      if (errorStatus === 404) {
        return NextResponse.json({ 
          error: 'menuCategory collection does not exist. Please create it in PocketBase Admin UI first.',
          details: 'Go to http://localhost:8090/_/ → Collections → Create new collection named "menuCategory"'
        }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ category });
  } catch (error: any) {
    console.error('Error creating category:', {
      message: error.message,
      status: error.status || error.response?.status,
      response: error.response?.data || error.response,
    });
    
    // Handle 404 - collection doesn't exist
    if (error.status === 404 || error.response?.status === 404) {
      return NextResponse.json(
        { 
          error: 'Required collections are missing. Please create "location" and "menuCategory" collections in PocketBase Admin UI first.',
          details: 'Go to http://localhost:8090/_/ and create the collections manually, or run the collection creation script.'
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to create category' },
      { status: 500 }
    );
  }
}

