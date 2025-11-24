import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { getCurrentUser } from '@/lib/server-utils';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL;
    const adminPassword = process.env.PB_ADMIN_PASSWORD;
    
    console.log('[Coupons API GET] Using PocketBase URL:', pbUrl);
    console.log('[Coupons API GET] Environment check:', {
      hasAWS: !!process.env.AWS_POCKETBASE_URL,
      hasPOCKETBASE: !!process.env.POCKETBASE_URL,
      using: pbUrl.includes('localhost') ? 'LOCAL' : 'AWS',
    });
    
    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    // Get selected tenant from cookie
    const selectedTenantId = request.cookies.get('selected_tenant_id')?.value;
    if (!selectedTenantId) {
      return NextResponse.json({ coupons: [] });
    }

    // Check if coupon collection exists
    try {
      await pb.collections.getOne('coupon');
    } catch (collectionError: any) {
      if (collectionError.status === 404) {
        console.log('Coupon collection does not exist. Please run: npm run pb:create-coupon-collection');
        return NextResponse.json({ 
          coupons: [],
          message: 'Coupon collection not found. Please create it first using: npm run pb:create-coupon-collection'
        });
      }
      throw collectionError;
    }

    // Fetch coupons for the selected tenant
    console.log('[Coupons API GET] Fetching coupons for tenant:', selectedTenantId);
    
    let coupons;
    try {
      // Try filtering by tenantId (might be stored as relation or string)
      coupons = await pb.collection('coupon').getFullList({
        filter: `tenantId = "${selectedTenantId}" || tenantId ~ "${selectedTenantId}"`,
        sort: '-created',
      });
    } catch (filterError: any) {
      console.warn('[Coupons API GET] Filter error, trying without filter:', filterError.message);
      // Fallback: fetch all and filter client-side
      const allCoupons = await pb.collection('coupon').getFullList({
        sort: '-created',
      });
      coupons = allCoupons.filter((coupon: any) => {
        const couponTenantId = Array.isArray(coupon.tenantId) ? coupon.tenantId[0] : coupon.tenantId;
        return couponTenantId === selectedTenantId;
      });
    }

    console.log('[Coupons API GET] Found coupons:', coupons.length);
    if (coupons.length > 0) {
      console.log('[Coupons API GET] Sample coupon:', {
        id: coupons[0].id,
        code: coupons[0].code,
        discountType: coupons[0].discountType,
        discountValue: coupons[0].discountValue,
        tenantId: coupons[0].tenantId,
        tenantIdType: typeof coupons[0].tenantId,
        tenantIdIsArray: Array.isArray(coupons[0].tenantId),
      });
    } else {
      // Try fetching all coupons to see if any exist
      const allCoupons = await pb.collection('coupon').getFullList();
      console.log('[Coupons API GET] Total coupons in DB:', allCoupons.length);
      if (allCoupons.length > 0) {
        console.log('[Coupons API GET] Sample coupon from all:', {
          id: allCoupons[0].id,
          code: allCoupons[0].code,
          tenantId: allCoupons[0].tenantId,
          tenantIdType: typeof allCoupons[0].tenantId,
          tenantIdIsArray: Array.isArray(allCoupons[0].tenantId),
        });
      }
    }

    return NextResponse.json({ coupons });
  } catch (error: any) {
    console.error('Error fetching coupons:', error);
    if (error.status === 404) {
      return NextResponse.json(
        { 
          error: 'Coupon collection not found. Please run: npm run pb:create-coupon-collection',
          coupons: []
        },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch coupons' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    } = body;

    // Validation
    if (!code || !discountType || !discountValue || !validFrom || !validUntil) {
      return NextResponse.json(
        { error: 'Missing required fields: code, discountType, discountValue, validFrom, validUntil' },
        { status: 400 }
      );
    }

    // Validate and normalize discountType (must match schema exactly: 'percentage' or 'fixed')
    const normalizedDiscountType = discountType?.toLowerCase();
    if (normalizedDiscountType !== 'percentage' && normalizedDiscountType !== 'fixed') {
      return NextResponse.json(
        { error: 'Invalid discountType. Must be "percentage" or "fixed"' },
        { status: 400 }
      );
    }

    // Validate discountValue
    if (normalizedDiscountType === 'percentage') {
      if (discountValue < 0 || discountValue > 100) {
        return NextResponse.json(
          { error: 'Percentage discount must be between 0 and 100' },
          { status: 400 }
        );
      }
    } else if (normalizedDiscountType === 'fixed') {
      if (discountValue < 0) {
        return NextResponse.json(
          { error: 'Fixed discount must be positive' },
          { status: 400 }
        );
      }
    }

    // Validate dates
    if (!validFrom || !validUntil) {
      return NextResponse.json(
        { error: 'validFrom and validUntil are required' },
        { status: 400 }
      );
    }

    const fromDate = new Date(validFrom);
    const untilDate = new Date(validUntil);
    
    if (isNaN(fromDate.getTime()) || isNaN(untilDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format for validFrom or validUntil' },
        { status: 400 }
      );
    }

    if (untilDate < fromDate) {
      return NextResponse.json(
        { error: 'validUntil must be after validFrom' },
        { status: 400 }
      );
    }

    // Format dates for PocketBase (ISO 8601 format)
    const formattedValidFrom = fromDate.toISOString();
    const formattedValidUntil = untilDate.toISOString();

    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL;
    const adminPassword = process.env.PB_ADMIN_PASSWORD;
    
    console.log('[Coupons API] Using PocketBase URL:', pbUrl);
    
    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    // Check if coupon collection exists
    try {
      await pb.collections.getOne('coupon');
    } catch (collectionError: any) {
      if (collectionError.status === 404) {
        return NextResponse.json(
          { error: 'Coupon collection not found. Please run: npm run pb:create-coupon-collection' },
          { status: 404 }
        );
      }
      throw collectionError;
    }

    // Get selected tenant from cookie
    const selectedTenantId = request.cookies.get('selected_tenant_id')?.value;
    if (!selectedTenantId) {
      return NextResponse.json(
        { error: 'No tenant selected' },
        { status: 400 }
      );
    }

    // Check if coupon code already exists for this tenant
    const existing = await pb.collection('coupon').getList(1, 1, {
      filter: `code = "${code}" && tenantId = "${selectedTenantId}"`,
    });

    if (existing.items.length > 0) {
      return NextResponse.json(
        { error: 'Coupon code already exists for this tenant' },
        { status: 400 }
      );
    }

    // Prepare coupon data
    const couponData: any = {
      tenantId: selectedTenantId,
      code: code.toUpperCase().trim(),
      description: description || '',
      discountType: normalizedDiscountType, // Use normalized value
      validFrom: formattedValidFrom,
      validUntil: formattedValidUntil,
      usedCount: 0, // Explicitly set to 0 (number, not string)
      isActive: true,
    };

    // Ensure usedCount is explicitly set as a number (PocketBase may reject 0 if not properly typed)
    if (couponData.usedCount === undefined || couponData.usedCount === null) {
      couponData.usedCount = 0;
    }

    // Handle discountValue based on type
    if (normalizedDiscountType === 'percentage') {
      // For percentage, store as percentage * 100 (e.g., 10% = 1000)
      couponData.discountValue = Math.round(discountValue * 100);
    } else {
      // For fixed, store in paise
      couponData.discountValue = Math.round(discountValue * 100);
    }

    // Handle optional fields
    if (minOrderAmount !== undefined && minOrderAmount !== null) {
      couponData.minOrderAmount = Math.round(minOrderAmount * 100);
    } else {
      couponData.minOrderAmount = 0;
    }

    if (maxDiscountAmount !== undefined && maxDiscountAmount !== null) {
      couponData.maxDiscountAmount = Math.round(maxDiscountAmount * 100);
    }

    if (usageLimit !== undefined && usageLimit !== null) {
      couponData.usageLimit = parseInt(usageLimit.toString());
    }

    // Ensure usedCount is always explicitly set as a number (required field)
    // PocketBase may reject 0 if it's not explicitly present in the data
    couponData.usedCount = Number(couponData.usedCount || 0);

    console.log('[Coupons API] Creating coupon with data:', JSON.stringify(couponData, null, 2));
    console.log('[Coupons API] usedCount value:', couponData.usedCount, 'type:', typeof couponData.usedCount);

    // Create coupon
    try {
      const coupon = await pb.collection('coupon').create(couponData);
      console.log('[Coupons API] Coupon created successfully:', coupon.id);
      return NextResponse.json({ coupon });
    } catch (createError: any) {
      console.error('[Coupons API] Create error details:', {
        message: createError.message,
        status: createError.status,
        data: createError.data,
        response: createError.response?.data,
      });
      throw createError;
    }
  } catch (error: any) {
    const errorDetails: any = {
      message: error.message,
      status: error.status,
      url: error.url,
      pbUrl: process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090',
    };

    // Log PocketBase validation errors
    if (error.response?.data) {
      errorDetails.responseData = error.response.data;
      console.error('PocketBase validation errors:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.originalError?.data) {
      errorDetails.originalErrorData = error.originalError.data;
      console.error('PocketBase original error data:', JSON.stringify(error.originalError.data, null, 2));
    }
    if (error.data) {
      errorDetails.errorData = error.data;
      console.error('PocketBase error data:', JSON.stringify(error.data, null, 2));
    }

    console.error('Error creating coupon:', errorDetails);
    if (error.status === 404) {
      return NextResponse.json(
        { error: 'Coupon collection not found. Please run: npm run pb:create-coupon-collection' },
        { status: 404 }
      );
    }
    if (error.status === 400) {
      return NextResponse.json(
        { error: error.message || 'Invalid coupon data' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create coupon' },
      { status: 500 }
    );
  }
}

