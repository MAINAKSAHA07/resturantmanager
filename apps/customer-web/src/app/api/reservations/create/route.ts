import { NextRequest, NextResponse } from 'next/server';
import { extractBrandKey } from '@restaurant/lib';
import PocketBase from 'pocketbase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Reservation request body:', body);
    
    const { name, email, phone, partySize, startTime, notes } = body;

    if (!partySize || !startTime || !name || !email || !phone) {
      return NextResponse.json(
        { error: 'name, email, phone, partySize and startTime are required' },
        { status: 400 }
      );
    }

    // Get customer ID from session if available, otherwise create/find customer
    let customerId: string | undefined;
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const session = JSON.parse(Buffer.from(token, 'base64').toString());
        if (session.customerId && session.exp > Date.now()) {
          customerId = session.customerId;
        }
      } catch (e) {
        // Not logged in, will create/find customer by email
      }
    }

    // If no customer ID from session, find or create customer by email
    if (!customerId) {
      try {
        // Try to find existing customer by email
        const existingCustomers = await pb.collection('customer').getList(1, 1, {
          filter: `email = "${email}"`,
        });

        if (existingCustomers.items.length > 0) {
          customerId = existingCustomers.items[0].id;
          // Update customer info if needed
          await pb.collection('customer').update(customerId, {
            name,
            phone,
          });
          console.log('Found existing customer:', customerId);
        } else {
          // Create new customer
          const newCustomer = await pb.collection('customer').create({
            name,
            email,
            phone,
          });
          customerId = newCustomer.id;
          console.log('Created new customer:', customerId);
        }
      } catch (e: any) {
        console.error('Error finding/creating customer:', e);
        // Continue without customerId if customer creation fails
      }
    }

    // Get tenant from cookie or hostname
    const cookies = request.cookies;
    const tenantCookie = cookies.get('selected_tenant')?.value;
    const hostname = request.headers.get('host') || '';
    const extractedBrandKey = extractBrandKey(hostname);
    const brandKey = tenantCookie || extractedBrandKey || 'saffron';
    console.log('Brand key:', brandKey);

    // Direct PocketBase connection
    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    // Get tenant
    const tenants = await pb.collection('tenant').getList(1, 1, {
      filter: `key = "${brandKey}"`,
    });

    if (tenants.items.length === 0) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const tenant = tenants.items[0];
    console.log('Tenant found:', tenant.id);

    // Get location - fetch all and filter client-side (PocketBase filters may not work reliably)
    const allLocations = await pb.collection('location').getList(1, 100);
    
    // Filter by tenant client-side
    const locations = allLocations.items.filter((loc: any) => {
      const locTenantId = Array.isArray(loc.tenantId) ? loc.tenantId[0] : loc.tenantId;
      return locTenantId === tenant.id;
    });

    if (locations.length === 0) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const location = locations[0];
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
      console.log('Customer ID:', customerId);
    } else {
      console.log('No customer ID - creating guest reservation');
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



