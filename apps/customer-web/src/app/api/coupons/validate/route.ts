import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { extractBrandKey } from '@restaurant/lib';

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

    // Get tenant from cookie or hostname
    const cookies = request.cookies;
    const tenantCookie = cookies.get('selected_tenant')?.value;
    const hostname = request.headers.get('host') || '';
    const extractedBrandKey = extractBrandKey(hostname);
    const brandKey = tenantCookie || extractedBrandKey || 'saffron';

    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    // Get tenant ID
    const tenants = await pb.collection('tenant').getList(1, 1, {
      filter: `key = "${brandKey}"`,
    });

    if (tenants.items.length === 0) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const tenantId = tenants.items[0].id;

    // Find coupon
    const coupons = await pb.collection('coupon').getList(1, 1, {
      filter: `code = "${code.toUpperCase().trim()}" && tenantId = "${tenantId}"`,
    });

    if (coupons.items.length === 0) {
      return NextResponse.json(
        { error: 'Invalid coupon code' },
        { status: 404 }
      );
    }

    const coupon = coupons.items[0];

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
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json(
        { error: 'Coupon usage limit reached' },
        { status: 400 }
      );
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = Math.round((orderAmount * coupon.discountValue) / 100);
      // Apply max discount if set
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else {
      // Fixed discount
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
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount, // Calculated discount in paise
      },
    });
  } catch (error: any) {
    console.error('Error validating coupon:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to validate coupon' },
      { status: 500 }
    );
  }
}

