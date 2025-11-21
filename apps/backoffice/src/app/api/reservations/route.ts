import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Direct PocketBase connection
    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    
    // Get selected tenant from cookies
    const cookieStore = cookies();
    const tenantId = cookieStore.get('selected_tenant_id')?.value;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant selected. Please select a tenant first.' },
        { status: 400 }
      );
    }
    
    // Fetch all reservations and filter client-side (PocketBase filters may not work reliably)
    const allReservations = await pb.collection('reservation').getList(1, 100, {
      sort: '-created',
      expand: 'customerId',
    });
    
    // Filter by tenant client-side
    const filteredReservations = allReservations.items.filter((reservation: any) => {
      const resTenantId = Array.isArray(reservation.tenantId) ? reservation.tenantId[0] : reservation.tenantId;
      return resTenantId === tenantId;
    });

    console.log(`Found ${filteredReservations.length} reservations for tenant ${tenantId}`);

    return NextResponse.json({ reservations: filteredReservations });
  } catch (error: any) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reservations' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Direct PocketBase connection
    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    
    const body = await request.json();
    const { reservationId, status } = body;

    await pb.collection('reservation').update(reservationId, { status });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating reservation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update reservation' },
      { status: 500 }
    );
  }
}

