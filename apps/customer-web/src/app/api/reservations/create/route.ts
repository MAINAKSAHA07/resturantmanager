import { NextRequest, NextResponse } from 'next/server';
import { createPocketBaseAdminClient } from '@restaurant/lib';
import { extractBrandKey } from '@restaurant/lib';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Reservation request body:', body);
    
    const { partySize, startTime, notes, customerId } = body;

    if (!partySize || !startTime) {
      return NextResponse.json(
        { error: 'partySize and startTime are required' },
        { status: 400 }
      );
    }

    const hostname = request.headers.get('host') || '';
    const brandKey = extractBrandKey(hostname) || 'saffron';
    console.log('Brand key:', brandKey);

    const pb = await createPocketBaseAdminClient();

    // Get tenant
    const tenants = await pb.collection('tenant').getList(1, 1, {
      filter: `key = "${brandKey}"`,
    });

    if (tenants.items.length === 0) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const tenant = tenants.items[0];
    console.log('Tenant found:', tenant.id);

    // Get location
    const locations = await pb.collection('location').getList(1, 1, {
      filter: `tenantId = "${tenant.id}"`,
    });

    if (locations.items.length === 0) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const location = locations.items[0];
    console.log('Location found:', location.id);

    // Parse and validate startTime
    const startTimeDate = new Date(startTime);
    if (isNaN(startTimeDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid startTime format' },
        { status: 400 }
      );
    }

    // Create reservation
    const reservationData: any = {
      tenantId: tenant.id,
      locationId: location.id,
      partySize: parseInt(partySize, 10),
      startTime: startTimeDate.toISOString(),
      status: 'pending',
    };

    if (notes && notes.trim()) {
      reservationData.notes = notes.trim();
    }

    if (customerId) {
      reservationData.customerId = customerId;
    }

    console.log('Creating reservation with data:', reservationData);

    const reservation = await pb.collection('reservation').create(reservationData);

    console.log('Reservation created:', reservation.id);

    return NextResponse.json({ id: reservation.id });
  } catch (error: any) {
    console.error('Error creating reservation:', {
      message: error.message,
      name: error.name,
      response: error.response?.data || error.response,
      status: error.status || error.response?.status,
      stack: error.stack,
    });
    
    // Extract more detailed error information
    let errorMessage = error.message || 'Failed to create reservation';
    let errorDetails: any = undefined;

    if (error.response?.data) {
      errorDetails = error.response.data;
      // Try to extract a more user-friendly error message
      if (error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.response.data.data) {
        // PocketBase often nests errors in data.data
        const data = error.response.data.data;
        if (typeof data === 'object') {
          const firstError = Object.values(data)[0];
          if (firstError) {
            errorMessage = Array.isArray(firstError) ? firstError[0] : String(firstError);
          }
        }
      }
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    );
  }
}



