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


    const pbUrl = process.env.POCKETBASE_URL || process.env.AWS_POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL;
    const adminPassword = process.env.PB_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD must be set' }, { status: 500 });
    }

    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    // Get tenant ID - try exact match first, then case-insensitive
    let tenants = await pb.collection('tenant').getList(1, 1, {
      filter: `key = "${brandKey}"`,
    });

    // If not found, try case-insensitive search
    if (tenants.items.length === 0) {
      const allTenants = await pb.collection('tenant').getList(1, 100);
      const matchingTenant = allTenants.items.find((t: any) => 
        t.key?.toLowerCase() === brandKey.toLowerCase()
      );
      if (matchingTenant) {
        tenants = {
          page: 1,
          perPage: 1,
          totalItems: 1,
          totalPages: 1,
          items: [matchingTenant],
        };
      }
    }

    if (tenants.items.length === 0) {
      console.error('[Coupon Validate] Tenant not found:', {
        brandKey,
        availableTenants: (await pb.collection('tenant').getList(1, 100)).items.map((t: any) => t.key),
      });
      return NextResponse.json(
        { 
          error: `Tenant not found for key: ${brandKey}. Please check your tenant configuration.`,
        },
        { status: 404 }
      );
    }

    const tenantId = tenants.items[0].id;

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

    // Check if coupon is active for customer end
    // Default to true if field doesn't exist (for backward compatibility)
    const activeForCustomerEnd = coupon.activeForCustomerEnd !== undefined ? coupon.activeForCustomerEnd : true;
    
    if (!activeForCustomerEnd) {
      return NextResponse.json(
        { error: 'This coupon is not available for online orders' },
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

