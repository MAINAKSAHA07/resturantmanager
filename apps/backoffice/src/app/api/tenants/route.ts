import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { createPocketBaseAdminClient } from '@restaurant/lib';

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

    // Use admin client to fetch all tenants
    // Create admin client directly to ensure environment variables are used
    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
    const adminPb = new PocketBase(pbUrl);
    try {
      await adminPb.admins.authWithPassword(adminEmail, adminPassword);
    } catch (error: any) {
      console.error('Failed to authenticate as admin in tenants route:', {
        email: adminEmail,
        url: pbUrl,
        error: error.message,
        status: error.status || error.response?.status,
        envEmail: process.env.PB_ADMIN_EMAIL ? 'set' : 'not set',
        envPassword: process.env.PB_ADMIN_PASSWORD ? 'set' : 'not set',
      });
      throw error;
    }
    
    const tenants = await adminPb.collection('tenant').getList(1, 100, {
      sort: 'name',
    });

    return NextResponse.json({ 
      tenants: tenants.items.map(t => ({
        id: t.id,
        name: t.name,
        key: t.key,
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

