import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminPb } from '@/lib/server-utils';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const tenantId = cookieStore.get('selected_tenant_id')?.value;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant selected' },
        { status: 404 }
      );
    }

    const adminPb = await getAdminPb();
    const tenant = await adminPb.collection('tenant').getOne(tenantId);

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        key: tenant.key,
        primaryDomain: tenant.primaryDomain,
        adminDomain: tenant.adminDomain,
        customerUrl: tenant.customerUrl || tenant.primaryDomain,
      }
    });
  } catch (error: any) {
    console.error('Error fetching current tenant:', error);
    if (error.status === 404) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tenant' },
      { status: 500 }
    );
  }
}




