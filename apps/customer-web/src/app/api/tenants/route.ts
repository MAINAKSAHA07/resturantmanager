import { NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

export async function GET() {
  try {
    // Direct PocketBase connection with explicit environment variable reading
    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    
    const tenants = await pb.collection('tenant').getList(1, 100, {
      sort: 'name',
    });
    
    return NextResponse.json({
      success: true,
      count: tenants.items.length,
      tenants: tenants.items.map(t => ({
        id: t.id,
        name: t.name,
        key: t.key,
        description: t.description,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching tenants in API:', {
      message: error?.message,
      status: error?.status || error?.response?.status,
      response: error?.response?.data || error?.response,
      pbUrl: process.env.POCKETBASE_URL,
      hasEmail: !!process.env.PB_ADMIN_EMAIL,
      hasPassword: !!process.env.PB_ADMIN_PASSWORD,
    });
    
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch tenants',
        details: process.env.NODE_ENV === 'development' 
          ? (error?.response?.data || error?.response) 
          : undefined,
      },
      { status: 500 }
    );
  }
}

