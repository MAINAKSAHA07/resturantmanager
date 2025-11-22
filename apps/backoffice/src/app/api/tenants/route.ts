import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

export async function GET(request: NextRequest) {
  try {
    // Use admin client to fetch all tenants
    // No need to check user auth here - we'll filter on frontend based on user role
    // Create admin client directly to ensure environment variables are used
    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
    console.log('Tenants API - Connecting to:', {
      pbUrl,
      hasAwsUrl: !!process.env.AWS_POCKETBASE_URL,
      hasPocketbaseUrl: !!process.env.POCKETBASE_URL,
      hasEmail: !!process.env.PB_ADMIN_EMAIL,
      hasPassword: !!process.env.PB_ADMIN_PASSWORD,
    });
    
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
