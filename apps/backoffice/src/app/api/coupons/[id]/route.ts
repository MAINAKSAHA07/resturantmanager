import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getAdminPb } from '@/lib/server-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const pb = await getAdminPb();

    const coupon = await pb.collection('coupon').getOne(id);
    return NextResponse.json({ coupon });
  } catch (error: any) {
    console.error('Error fetching coupon:', error);
    if (error.status === 404) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch coupon' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      validFrom,
      validUntil,
      usageLimit,
      isActive,
    } = body;

    const pb = await getAdminPb();

    // Get selected tenant from cookie
    const selectedTenantId = request.cookies.get('selected_tenant_id')?.value;
    if (!selectedTenantId) {
      return NextResponse.json(
        { error: 'No tenant selected' },
        { status: 400 }
      );
    }

    // Check if coupon belongs to selected tenant
    const existing = await pb.collection('coupon').getOne(id);
    const couponTenantId = Array.isArray(existing.tenantId) ? existing.tenantId[0] : existing.tenantId;
    if (couponTenantId !== selectedTenantId) {
      return NextResponse.json(
        { error: 'Coupon not found or access denied' },
        { status: 403 }
      );
    }

    // If code is being changed, check for duplicates
    if (code && code !== existing.code) {
      const duplicate = await pb.collection('coupon').getList(1, 1, {
        filter: `code = "${code}" && tenantId = "${selectedTenantId}" && id != "${id}"`,
      });
      if (duplicate.items.length > 0) {
        return NextResponse.json(
          { error: 'Coupon code already exists' },
          { status: 400 }
        );
      }
    }

    // Update coupon
    const updateData: any = {};
    if (code !== undefined) updateData.code = code.toUpperCase().trim();
    if (description !== undefined) updateData.description = description;
    if (discountType !== undefined) updateData.discountType = discountType;
    if (discountValue !== undefined) updateData.discountValue = Math.round(discountValue * 100);
    if (minOrderAmount !== undefined) updateData.minOrderAmount = Math.round(minOrderAmount * 100);
    if (maxDiscountAmount !== undefined) {
      updateData.maxDiscountAmount = maxDiscountAmount ? Math.round(maxDiscountAmount * 100) : null;
    }
    if (validFrom !== undefined) updateData.validFrom = validFrom;
    if (validUntil !== undefined) updateData.validUntil = validUntil;
    if (usageLimit !== undefined) updateData.usageLimit = usageLimit || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const coupon = await pb.collection('coupon').update(id, updateData);
    return NextResponse.json({ coupon });
  } catch (error: any) {
    console.error('Error updating coupon:', error);
    if (error.status === 404) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update coupon' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const pb = await getAdminPb();

    // Get selected tenant from cookie
    const selectedTenantId = request.cookies.get('selected_tenant_id')?.value;
    if (!selectedTenantId) {
      return NextResponse.json(
        { error: 'No tenant selected' },
        { status: 400 }
      );
    }

    // Check if coupon belongs to selected tenant
    const existing = await pb.collection('coupon').getOne(id);
    const couponTenantId = Array.isArray(existing.tenantId) ? existing.tenantId[0] : existing.tenantId;
    if (couponTenantId !== selectedTenantId) {
      return NextResponse.json(
        { error: 'Coupon not found or access denied' },
        { status: 403 }
      );
    }

    await pb.collection('coupon').delete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting coupon:', error);
    if (error.status === 404) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to delete coupon' },
      { status: 500 }
    );
  }
}

