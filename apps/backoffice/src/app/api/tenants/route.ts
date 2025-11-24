import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getAdminPb } from '@/lib/server-utils';
import { isMasterUser } from '@/lib/user-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Note: Tenants API is accessible to all authenticated users
    // Permission filtering happens on the frontend based on user role
    // We use admin client to fetch all tenants, then frontend filters based on user permissions

    const adminPb = await getAdminPb();

    const tenants = await adminPb.collection('tenant').getList(1, 100, {
      sort: 'name',
    });

    console.log('Tenants API - Fetched tenants:', {
      count: tenants.items.length,
      tenantIds: tenants.items.map(t => ({ id: t.id, name: t.name })),
    });

    return NextResponse.json({
      success: true,
      tenants: tenants.items.map(t => ({
        id: t.id,
        name: t.name,
        key: t.key,
        primaryDomain: t.primaryDomain,
        adminDomain: t.adminDomain,
      }))
    });
  } catch (error: any) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tenants' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication first
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: Please log in to create tenants' },
        { status: 401 }
      );
    }

    // Only master users can create tenants
    if (!isMasterUser(user)) {
      return NextResponse.json(
        { error: 'Forbidden: Only master users can create tenants' },
        { status: 403 }
      );
    }

    const adminPb = await getAdminPb();

    const body = await request.json();
    const { 
      key, 
      name, 
      primaryDomain, 
      adminDomain, 
      theme,
      // Location fields
      locationName,
      locationStateCode,
      locationGstin,
      locationAddress,
      locationHours,
    } = body;

    // Validate required fields
    if (!key || typeof key !== 'string' || key.trim() === '') {
      return NextResponse.json(
        { error: 'Tenant key is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Tenant name is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (!primaryDomain || typeof primaryDomain !== 'string' || primaryDomain.trim() === '') {
      return NextResponse.json(
        { error: 'Primary domain is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (!adminDomain || typeof adminDomain !== 'string' || adminDomain.trim() === '') {
      return NextResponse.json(
        { error: 'Admin domain is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Validate location fields
    if (!locationName || typeof locationName !== 'string' || locationName.trim() === '') {
      return NextResponse.json(
        { error: 'Location name is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (!locationStateCode || typeof locationStateCode !== 'string' || locationStateCode.trim() === '') {
      return NextResponse.json(
        { error: 'Location state code is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (!locationGstin || typeof locationGstin !== 'string' || locationGstin.trim() === '') {
      return NextResponse.json(
        { error: 'Location GSTIN is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Check if tenant with this key already exists
    try {
      const existingTenants = await adminPb.collection('tenant').getList(1, 1, {
        filter: `key = "${key.trim()}"`,
      });

      if (existingTenants.items.length > 0) {
        return NextResponse.json(
          { error: 'A tenant with this key already exists' },
          { status: 400 }
        );
      }
    } catch (checkError: any) {
      // If filter fails, continue (might be a network issue)
      console.error('Error checking for existing tenant:', checkError);
    }

    // Create tenant data
    const tenantData: any = {
      key: key.trim(),
      name: name.trim(),
      primaryDomain: primaryDomain.trim(),
      adminDomain: adminDomain.trim(),
    };

    // Add theme if provided
    if (theme !== undefined && theme !== null) {
      tenantData.theme = theme;
    }

    // Create the tenant
    const newTenant = await adminPb.collection('tenant').create(tenantData);

    console.log('Tenants API - Created tenant:', {
      id: newTenant.id,
      name: newTenant.name,
      key: newTenant.key,
    });

    // Create default location for the tenant
    let defaultLocation = null;
    try {
      const locationData: any = {
        tenantId: newTenant.id,
        name: locationName.trim(),
        stateCode: locationStateCode.trim(),
        gstin: locationGstin.trim(),
      };

      // Parse address if provided
      if (locationAddress && locationAddress.trim()) {
        try {
          locationData.address = JSON.parse(locationAddress);
        } catch {
          // If not valid JSON, store as object with text field
          locationData.address = { text: locationAddress.trim() };
        }
      }

      // Parse hours if provided
      if (locationHours && locationHours.trim()) {
        try {
          locationData.hours = JSON.parse(locationHours);
        } catch {
          // If not valid JSON, store as object with text field
          locationData.hours = { text: locationHours.trim() };
        }
      }

      defaultLocation = await adminPb.collection('location').create(locationData);

      console.log('Tenants API - Created default location:', {
        id: defaultLocation.id,
        name: defaultLocation.name,
        tenantId: defaultLocation.tenantId,
      });
    } catch (locationError: any) {
      // Log error but don't fail tenant creation if location creation fails
      // However, we should still return an error since location is required
      console.error('Tenants API - Failed to create default location:', {
        error: locationError.message,
        status: locationError.status || locationError.response?.status,
        tenantId: newTenant.id,
      });
      
      // Try to delete the tenant if location creation fails
      try {
        await adminPb.collection('tenant').delete(newTenant.id);
        console.log('Tenants API - Deleted tenant due to location creation failure');
      } catch (deleteError: any) {
        console.error('Tenants API - Failed to delete tenant after location creation failure:', deleteError.message);
      }

      return NextResponse.json(
        { 
          error: 'Failed to create default location. Tenant creation was rolled back.',
          details: locationError.message || 'Unknown error'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tenant: {
        id: newTenant.id,
        name: newTenant.name,
        key: newTenant.key,
        primaryDomain: newTenant.primaryDomain,
        adminDomain: newTenant.adminDomain,
        theme: newTenant.theme,
      },
      location: defaultLocation ? {
        id: defaultLocation.id,
        name: defaultLocation.name,
      } : null,
    });
  } catch (error: any) {
    console.error('Error creating tenant:', error);
    
    // Handle PocketBase validation errors
    if (error.response?.data) {
      const pbError = error.response.data;
      if (pbError.data) {
        const fieldErrors = Object.entries(pbError.data)
          .map(([field, message]) => `${field}: ${message}`)
          .join(', ');
        return NextResponse.json(
          { error: `Validation error: ${fieldErrors}` },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create tenant' },
      { status: 500 }
    );
  }
}
