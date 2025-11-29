import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError: any) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected JSON.' },
        { status: 400 }
      );
    }
    
    const { qrToken } = body;

    if (!qrToken || typeof qrToken !== 'string') {
      return NextResponse.json(
        { error: 'qrToken is required' },
        { status: 400 }
      );
    }

    // Direct PocketBase connection
    const pbUrl = process.env.POCKETBASE_URL || process.env.AWS_POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL;
    const adminPassword = process.env.PB_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD must be set' },
        { status: 500 }
      );
    }

    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    // Find table by qrToken
    const tables = await pb.collection('tables').getList(1, 1, {
      filter: `qrToken = "${qrToken}"`,
      expand: 'tenantId,locationId',
    });

    if (tables.items.length === 0) {
      return NextResponse.json(
        { error: 'Table not found or invalid QR code' },
        { status: 404 }
      );
    }

    const table = tables.items[0];

    // Get tenant and location IDs (handle relation fields)
    const tenantId = Array.isArray(table.tenantId) ? table.tenantId[0] : table.tenantId;
    const locationId = Array.isArray(table.locationId) ? table.locationId[0] : table.locationId;

    if (!tenantId || !locationId) {
      return NextResponse.json(
        { error: 'Table is missing tenant or location information' },
        { status: 400 }
      );
    }

    // Get tenant to get the key
    const tenant = await pb.collection('tenant').getOne(tenantId);
    const location = await pb.collection('location').getOne(locationId);

    // Check if table is active (not disabled)
    if (table.status === 'held' || !table.name) {
      return NextResponse.json(
        { error: 'Table is not available' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      tenantKey: tenant.key,
      tenantId: tenant.id,
      locationId: location.id,
      locationName: location.name,
      tableId: table.id,
      tableName: table.name,
    });
  } catch (error: any) {
    console.error('Error resolving QR token:', error);
    
    // Safely extract error message
    const errorMessage = error?.message || 'Failed to resolve table from QR code';
    const errorDetails = process.env.NODE_ENV === 'development' 
      ? (error?.stack || error?.toString()) 
      : undefined;

    return NextResponse.json(
      {
        error: errorMessage,
        ...(errorDetails && { details: errorDetails }),
      },
      { status: 500 }
    );
  }
}

