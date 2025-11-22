import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

export async function GET(request: NextRequest) {
  try {
    // Check for duplicate query parameter
    const searchParams = request.nextUrl.searchParams;
    const checkName = searchParams.get('name');

    if (checkName) {
      // Check for duplicate
      const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
      const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
      const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';

      const adminPb = new PocketBase(pbUrl);
      await adminPb.admins.authWithPassword(adminEmail, adminPassword);

      // Get selected tenant
      const cookieStore = request.cookies;
      const selectedTenantId = cookieStore.get('selected_tenant_id')?.value;

      if (!selectedTenantId) {
        return NextResponse.json({ isDuplicate: false });
      }

      // Get location for tenant
      const allLocations = await adminPb.collection('location').getList(1, 100);
      const locations = allLocations.items.filter((loc: any) => {
        const locTenantId = Array.isArray(loc.tenantId) ? loc.tenantId[0] : loc.tenantId;
        return locTenantId === selectedTenantId;
      });

      if (locations.length === 0) {
        return NextResponse.json({ isDuplicate: false });
      }

      const locationId = locations[0].id;

      // Check for duplicate name in same tenant and location
      const allItems = await adminPb.collection('menuItem').getList(1, 1000);
      const duplicate = allItems.items.find((item: any) => {
        const itemTenantId = Array.isArray(item.tenantId) ? item.tenantId[0] : item.tenantId;
        const itemLocationId = Array.isArray(item.locationId) ? item.locationId[0] : item.locationId;
        return item.name.toLowerCase().trim() === checkName.toLowerCase().trim() &&
          itemTenantId === selectedTenantId &&
          itemLocationId === locationId;
      });

      return NextResponse.json({ isDuplicate: !!duplicate });
    }

    // Regular GET - fetch all items
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
      // Get all items - don't use expand as it might cause duplication issues
      // We'll handle relations manually
      const allItems = await adminPb.collection('menuItem').getList(1, 1000);

      // Filter by tenant and deduplicate by ID immediately (most important step)
      const initialFilteredMap = new Map<string, any>();
      const initialSeenIds = new Set<string>();

      allItems.items.forEach(item => {
        // Skip if we've already seen this ID
        if (initialSeenIds.has(item.id)) {
          return;
        }
        initialSeenIds.add(item.id);

        const itemTenantId = Array.isArray(item.tenantId) ? item.tenantId[0] : item.tenantId;
        const itemLocationId = Array.isArray(item.locationId) ? item.locationId[0] : item.locationId;

        // Match tenant AND ensure location belongs to this tenant
        if (itemTenantId === tenant.id && locationIds.includes(itemLocationId)) {
          // Only add if not already in map (extra safety)
          if (!initialFilteredMap.has(item.id)) {
            initialFilteredMap.set(item.id, item);
          }
        }
      });

      const filteredItems = Array.from(initialFilteredMap.values());
      console.log(`[API] After initial filter: ${allItems.items.length} -> ${filteredItems.length} items`);

      // Get all categories to map IDs to names
      const allCategories = await adminPb.collection('menuCategory').getList(1, 500);
      const categoryMap = new Map<string, string>();
      allCategories.items.forEach(cat => {
        categoryMap.set(cat.id, cat.name);
      });

      // Map items and normalize categoryId, then deduplicate by item ID and name+category
      const itemIdMap = new Map<string, any>();
      const normalizedItems = filteredItems.map(item => {
        // Normalize categoryId to always be a string
        const categoryId = Array.isArray(item.categoryId) ? item.categoryId[0] : item.categoryId;
        const categoryName = categoryId ? categoryMap.get(categoryId) : null;

        // Normalize availability to lowercase for consistency
        let normalizedAvailability = item.availability || (item.isActive !== false ? 'available' : 'not available');
        normalizedAvailability = String(normalizedAvailability).toLowerCase().trim();
        if (normalizedAvailability !== 'available' && normalizedAvailability !== 'not available') {
          normalizedAvailability = normalizedAvailability === 'notavailable' ? 'not available' : 'available';
        }

        return {
          ...item,
          categoryId: categoryId || '',
          categoryName: categoryName || null,
          // Ensure availability is always included and normalized to lowercase
          availability: normalizedAvailability,
        };
      });

      // First deduplicate by item ID (most important - same ID = same item)
      normalizedItems.forEach(item => {
        if (!itemIdMap.has(item.id)) {
          itemIdMap.set(item.id, item);
        } else {
          // If duplicate ID found, keep the one with more complete data or most recent
          const existing = itemIdMap.get(item.id);
          const itemTime = new Date(item.created || item.updated || 0).getTime();
          const existingTime = new Date(existing.created || existing.updated || 0).getTime();
          if (itemTime > existingTime) {
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
          const existing = nameCategoryMap.get(key);

          // Normalize availability for comparison
          const itemAvailability = String(item.availability || (item.isActive !== false ? 'available' : 'not available')).toLowerCase();
          const existingAvailability = String(existing.availability || (existing.isActive !== false ? 'available' : 'not available')).toLowerCase();

          // Priority: prefer "not available" items (they're more restrictive/accurate)
          // If both have same availability, prefer the most recent
          if (itemAvailability === 'not available' && existingAvailability === 'available') {
            nameCategoryMap.set(key, item);
          } else if (itemAvailability === 'available' && existingAvailability === 'not available') {
            // Keep existing (not available)
          } else {
            // Same availability - keep the most recent
            const itemTime = new Date(item.created || item.updated || 0).getTime();
            const existingTime = new Date(existing.created || existing.updated || 0).getTime();
            if (itemTime > existingTime) {
              nameCategoryMap.set(key, item);
            }
          }
        }
      });

      // Final deduplication pass using Set to ensure absolute uniqueness by ID
      const finalUniqueItems: any[] = [];
      const finalSeenIds = new Set<string>();

      Array.from(nameCategoryMap.values()).forEach((item: any) => {
        if (!finalSeenIds.has(item.id)) {
          finalSeenIds.add(item.id);
          finalUniqueItems.push(item);
        }
      });

      console.log(`[API] Deduplication: ${normalizedItems.length} items -> ${finalUniqueItems.length} unique items`);

      items = {
        items: finalUniqueItems
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

    // Handle FormData for file upload
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string || '';
    const basePrice = parseFloat(formData.get('basePrice') as string);
    const taxRate = parseFloat(formData.get('taxRate') as string) || 5;
    const categoryId = formData.get('categoryId') as string;
    // Handle availability: 'available' or 'not available'
    // Support legacy boolean values for backward compatibility
    const availabilityValue = formData.get('availability') || formData.get('isActive');
    let availability: string;
    if (availabilityValue === null || availabilityValue === undefined || availabilityValue === '') {
      availability = 'available'; // Default
    } else {
      const strValue = String(availabilityValue).toLowerCase().trim();
      if (strValue === 'true' || strValue === '1' || strValue === 'available') {
        availability = 'available';
      } else if (strValue === 'false' || strValue === '0' || strValue === 'not available') {
        availability = 'not available';
      } else {
        availability = 'available'; // Default
      }
    }
    const hsnSac = formData.get('hsnSac') as string || '';
    const imageFile = formData.get('image') as File | null;

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

    // Check for duplicate name in same tenant and location
    const allItems = await adminPb.collection('menuItem').getList(1, 1000);
    const duplicate = allItems.items.find((item: any) => {
      const itemTenantId = Array.isArray(item.tenantId) ? item.tenantId[0] : item.tenantId;
      const itemLocationId = Array.isArray(item.locationId) ? item.locationId[0] : item.locationId;
      return item.name.toLowerCase().trim() === name.toLowerCase().trim() &&
        itemTenantId === tenant.id &&
        itemLocationId === location.id;
    });

    if (duplicate) {
      return NextResponse.json(
        { error: `A menu item with the name "${name}" already exists in this location.` },
        { status: 400 }
      );
    }

    // Create FormData for PocketBase
    const itemData = new FormData();
    itemData.append('tenantId', tenant.id);
    itemData.append('locationId', location.id);
    itemData.append('categoryId', categoryId);
    itemData.append('name', name);
    itemData.append('description', description);
    itemData.append('basePrice', Math.round(basePrice * 100).toString()); // Convert to paise
    itemData.append('taxRate', (taxRate || 5).toString());
    itemData.append('hsnSac', hsnSac);
    itemData.append('availability', availability); // 'available' or 'not available'

    // Add image if provided
    if (imageFile && imageFile.size > 0) {
      itemData.append('image', imageFile);
    }

    const item = await adminPb.collection('menuItem').create(itemData);

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

