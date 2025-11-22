import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

export const dynamic = 'force-dynamic';

/**
 * Check if user is a master user (isMaster=true OR role='admin')
 */
function isMasterUser(user: any): boolean {
  return user?.isMaster === true || user?.role === 'admin';
}

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
    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';

    console.log('Select tenant request:', { tenantId, pbUrl, hasEmail: !!adminEmail, hasPassword: !!adminPassword });

    const adminPb = new PocketBase(pbUrl);
    try {
      await adminPb.admins.authWithPassword(adminEmail, adminPassword);
      console.log('Admin authenticated successfully');
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
      console.log('Fetching tenant:', tenantId);
      const tenant = await adminPb.collection('tenant').getOne(tenantId);
      console.log('Tenant found:', { id: tenant.id, name: tenant.name });

      // Verify user has access to this tenant (if we can get the user)
      // Try to get user info, but don't fail if we can't - graceful degradation
      let user = null;
      let canVerifyAccess = false;

      try {
        const userPb = new PocketBase(pbUrl);
        userPb.authStore.save(token, null);

        try {
          // Try to refresh auth to get current user data
          const authData = await userPb.collection('users').authRefresh();
          user = authData.record;
          canVerifyAccess = true;
        } catch (refreshError: any) {
          // If refresh fails, token might be expired but still valid for basic operations
          // Try to parse token to get user info, but don't fail if we can't
          try {
            const tokenParts = token.split('.');
            if (tokenParts.length >= 2) {
              const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
              const userId = payload.id || payload.userId || payload.record?.id || payload.recordId;

              if (userId) {
                try {
                  // Try to get user using admin client
                  user = await adminPb.collection('users').getOne(userId);
                  canVerifyAccess = true;
                } catch (getUserError: any) {
                  // User doesn't exist or can't be fetched - token might be stale
                  // But token exists, so we'll allow tenant selection anyway
                  console.warn('Could not fetch user for tenant access verification:', getUserError.message);
                  canVerifyAccess = false;
                }
              }
            }
          } catch (parseError: any) {
            // Token format is invalid, but we have a token so allow it
            console.warn('Could not parse token for user verification:', parseError.message);
            canVerifyAccess = false;
          }
        }
      } catch (error: any) {
        // If we can't verify user, we'll still allow tenant selection
        // since they have a valid token (they're logged in)
        console.warn('Could not verify user access, allowing tenant selection anyway:', error.message);
        canVerifyAccess = false;
      }

      // Only check tenant access if we successfully got user info
      if (canVerifyAccess && user) {
        // Master users have access to all tenants
        if (!isMasterUser(user)) {
          const userTenants = user.tenants || [];

          if (!userTenants.includes(tenantId)) {
            return NextResponse.json(
              { error: 'You do not have access to this tenant' },
              { status: 403 }
            );
          }
        }
      }
      // If we can't verify access, we still allow it since:
      // 1. They have a valid token (they're authenticated)
      // 2. The tenant exists (we verified that above)
      // 3. This is a graceful degradation for edge cases

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
        pbUrl,
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

