import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { createPocketBaseAdminClient } from '@restaurant/lib';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { tenantId } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Verify tenant exists - use direct authentication
    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
    const adminPb = new PocketBase(pbUrl);
    try {
      await adminPb.admins.authWithPassword(adminEmail, adminPassword);
    } catch (error: any) {
      console.error('Failed to authenticate as admin in select-tenant route:', {
        email: adminEmail,
        url: pbUrl,
        error: error.message,
        status: error.status || error.response?.status,
      });
      throw error;
    }
    try {
      const tenant = await adminPb.collection('tenant').getOne(tenantId);
      
      const response = NextResponse.json({ 
        success: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          key: tenant.key,
        }
      });

      // Store selected tenant in cookie
      response.cookies.set('selected_tenant_id', tenantId, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });

      return response;
    } catch (error: any) {
      if (error.status === 404) {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error selecting tenant:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to select tenant' },
      { status: 500 }
    );
  }
}

