import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getAdminPb } from '@/lib/server-utils';
import { isMasterUser } from '@/lib/user-utils';

export const dynamic = 'force-dynamic';

/**
 * Select tenant API
 */

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

    const adminPb = await getAdminPb();

    try {
      console.log('Fetching tenant:', tenantId);
      const tenant = await adminPb.collection('tenant').getOne(tenantId);
      console.log('Tenant found:', { id: tenant.id, name: tenant.name });

      // Verify user has access to this tenant
      // We use the robust getCurrentUser helper which validates the token against the DB
      const user = await getCurrentUser(request);

      if (!user) {
        console.log('Select tenant: No user found (unauthorized)');
        return NextResponse.json(
          { error: 'Unauthorized: Invalid or expired session' },
          { status: 401 }
        );
      }

      console.log('Select tenant: User authenticated', {
        id: user.id,
        email: user.email,
        role: user.role,
        isMaster: user.isMaster,
        isMasterUser: user.isMaster === true || user.role === 'admin',
        tenants: user.tenants
      });

      // Master users have access to all tenants
      const isMaster = isMasterUser(user);
      console.log('Select tenant: Master user check', { isMaster, tenantId });
      
      if (!isMaster) {
        const userTenants = user.tenants || [];

        if (!userTenants.includes(tenantId)) {
          console.log('Select tenant: User does not have access', {
            userTenants,
            requestedTenant: tenantId
          });
          return NextResponse.json(
            { error: 'You do not have access to this tenant' },
            { status: 403 }
          );
        }
      } else {
        console.log('Select tenant: Master user - allowing access to all tenants');
      }

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
      console.error('Error fetching tenant:', {
        tenantId,
        error: error.message,
        status: error.status,
        response: error.response?.data,
      });

      if (error.status === 404) {
        // List available tenants for debugging
        try {
          const allTenants = await adminPb.collection('tenant').getList(1, 100);
          console.log('Available tenants:', allTenants.items.map(t => ({ id: t.id, name: t.name })));
        } catch (listError) {
          console.error('Could not list tenants:', listError);
        }

        return NextResponse.json(
          {
            error: 'Tenant not found',
            tenantId,
            message: `Tenant with ID "${tenantId}" does not exist in the database`
          },
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

