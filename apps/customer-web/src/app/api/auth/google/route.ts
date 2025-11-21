import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { OAuth2Client } from 'google-auth-library';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credential } = body;

    if (!credential) {
      return NextResponse.json(
        { error: 'Credential is required' },
        { status: 400 }
      );
    }

    // Verify Google token
    const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      return NextResponse.json(
        { error: 'Google Client ID not configured' },
        { status: 500 }
      );
    }

    const client = new OAuth2Client(googleClientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 400 }
      );
    }

    const email = payload.email;
    const name = payload.name || email?.split('@')[0] || '';
    const picture = payload.picture || '';

    if (!email) {
      return NextResponse.json(
        { error: 'Email not provided by Google' },
        { status: 400 }
      );
    }

    // Connect to PocketBase as admin
    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
    const adminPb = new PocketBase(pbUrl);
    await adminPb.admins.authWithPassword(adminEmail, adminPassword);

    // Check if customer exists
    let customer;
    try {
      const customers = await adminPb.collection('customer').getList(1, 1, {
        filter: `email = "${email}"`,
      });

      if (customers.items.length > 0) {
        customer = customers.items[0];
      } else {
        // Create new customer with a temporary password
        // We'll use Google OAuth for future logins, but need a password for PocketBase auth collection
        const tempPassword = `google_${Math.random().toString(36).slice(-16)}`;
        
        customer = await adminPb.collection('customer').create({
          email,
          password: tempPassword,
          passwordConfirm: tempPassword,
          name: name || email.split('@')[0],
          phone: '',
          address: '',
          city: '',
          state: '',
          pincode: '',
        });
      }
    } catch (error: any) {
      console.error('Error creating/fetching customer:', error);
      return NextResponse.json(
        { error: 'Failed to authenticate customer', details: error.message },
        { status: 500 }
      );
    }

    // Create a session token (JWT-like) for client-side storage
    // In production, you might want to use a proper JWT library
    const sessionData = {
      customerId: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');

    // Check if profile is complete (has phone and address)
    const profileComplete = customer.phone && customer.address && customer.city && customer.state && customer.pincode;

    return NextResponse.json({
      token: sessionToken,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone || '',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        pincode: customer.pincode || '',
      },
      profileComplete,
    });
  } catch (error: any) {
    console.error('Google auth error:', error);
    return NextResponse.json(
      { error: error.message || 'Authentication failed' },
      { status: 500 }
    );
  }
}

