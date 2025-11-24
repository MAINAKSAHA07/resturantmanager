import { NextRequest, NextResponse } from 'next/server';
import { getAdminPb } from '@/lib/server-utils';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, orderAmount } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Coupon code is required' },
        { status: 400 }
      );
    }

    if (!orderAmount || orderAmount < 0) {
      return NextResponse.json(
        { error: 'Valid order amount is required' },
        { status: 400 }
      );
    }

    const cookieStore = cookies();
    const tenantId = cookieStore.get('selected_tenant_id')?.value;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant selected' },
        { status: 400 }
      );
    }

    const pb = await getAdminPb();

    // Find coupon - try both relation and string matching
    let coupons;
    try {
      coupons = await pb.collection('coupon').getList(1, 1, {
        filter: `code = "${code.toUpperCase().trim()}" && (tenantId = "${tenantId}" || tenantId ~ "${tenantId}")`,
      });
    } catch (filterError: any) {
      // Fallback: fetch all matching codes and filter client-side
      const allCoupons = await pb.collection('coupon').getList(1, 200, {
        filter: `code = "${code.toUpperCase().trim()}"`,
      });
      coupons = {
        page: 1,
        perPage: 1,
        totalItems: allCoupons.items.filter((coupon: any) => {
          const couponTenantId = Array.isArray(coupon.tenantId) ? coupon.tenantId[0] : coupon.tenantId;
          return couponTenantId === tenantId;
        }).length,
        totalPages: 1,
        items: allCoupons.items.filter((coupon: any) => {
          const couponTenantId = Array.isArray(coupon.tenantId) ? coupon.tenantId[0] : coupon.tenantId;
          return couponTenantId === tenantId;
        }),
      };
    }

    if (coupons.items.length === 0) {
      return NextResponse.json(
        { error: 'Invalid coupon code' },
        { status: 404 }
      );
    }

    const coupon = coupons.items[0];

    // Check if coupon is active for floor plan
    // Default to true if field doesn't exist (for backward compatibility)
    const activeForFloorPlan = coupon.activeForFloorPlan !== undefined ? coupon.activeForFloorPlan : true;
    
    if (!activeForFloorPlan) {
      return NextResponse.json(
        { error: 'This coupon is not available for floor plan orders' },
        { status: 400 }
      );
    }

    // Validate coupon
    const now = new Date();
    const validFrom = new Date(coupon.validFrom);
    const validUntil = new Date(coupon.validUntil);

    if (!coupon.isActive) {
      return NextResponse.json(
        { error: 'Coupon is not active' },
        { status: 400 }
      );
    }

    if (now < validFrom) {
      return NextResponse.json(
        { error: 'Coupon is not yet valid' },
        { status: 400 }
      );
    }

    if (now > validUntil) {
      return NextResponse.json(
        { error: 'Coupon has expired' },
        { status: 400 }
      );
    }

    // Check minimum order amount (in paise)
    const minOrderAmountPaise = coupon.minOrderAmount || 0;
    if (orderAmount < minOrderAmountPaise) {
      return NextResponse.json(
        { 
          error: `Minimum order amount is ₹${(minOrderAmountPaise / 100).toFixed(2)}`,
          minOrderAmount: minOrderAmountPaise,
        },
        { status: 400 }
      );
    }

    // Check usage limit
    const usedCount = coupon.usedCount || 0;
    if (coupon.usageLimit && usedCount >= coupon.usageLimit) {
      return NextResponse.json(
        { error: 'Coupon usage limit reached' },
        { status: 400 }
      );
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      // discountValue is stored as percentage * 100 (e.g., 10% = 1000)
      discountAmount = Math.round((orderAmount * coupon.discountValue) / 10000);
      // Apply max discount if set
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else {
      // Fixed discount - already in paise
      discountAmount = coupon.discountValue;
      // Don't exceed order amount
      if (discountAmount > orderAmount) {
        discountAmount = orderAmount;
      }
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: discountAmount,
        description: coupon.description,
      }
    });
  } catch (error: any) {
    console.error('Error validating coupon:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to validate coupon' },
      { status: 500 }
    );
  }
}

