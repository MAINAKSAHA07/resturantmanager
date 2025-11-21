import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

export async function GET(request: NextRequest) {
  try {
    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
    // Test basic connectivity
    const healthCheck = await fetch(`${pbUrl}/api/health`);
    const healthData = await healthCheck.json();
    
    // Test admin auth
    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    
    return NextResponse.json({
      success: true,
      pbUrl,
      adminEmail,
      healthCheck: healthData,
      authToken: pb.authStore.token ? 'Received' : 'Missing',
      env: {
        POCKETBASE_URL: process.env.POCKETBASE_URL || 'not set',
        PB_ADMIN_EMAIL: process.env.PB_ADMIN_EMAIL ? 'set' : 'not set',
        PB_ADMIN_PASSWORD: process.env.PB_ADMIN_PASSWORD ? 'set' : 'not set',
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      status: error.status || error.response?.status,
      pbUrl: process.env.POCKETBASE_URL || 'http://localhost:8090',
      env: {
        POCKETBASE_URL: process.env.POCKETBASE_URL || 'not set',
        PB_ADMIN_EMAIL: process.env.PB_ADMIN_EMAIL ? 'set' : 'not set',
        PB_ADMIN_PASSWORD: process.env.PB_ADMIN_PASSWORD ? 'set' : 'not set',
      },
    }, { status: 500 });
  }
}

