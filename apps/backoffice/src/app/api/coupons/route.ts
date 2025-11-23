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
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    // Get selected tenant from cookie
    const selectedTenantId = request.cookies.get('selected_tenant_id')?.value;
    if (!selectedTenantId) {
      return NextResponse.json({ coupons: [] });
    }

    // Fetch coupons for the selected tenant
    const coupons = await pb.collection('coupon').getFullList({
      filter: `tenantId = "${selectedTenantId}"`,
      sort: '-created',
    });

    return NextResponse.json({ coupons });
  } catch (error: any) {
    console.error('Error fetching coupons:', error);
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

    if (discountType === 'percentage' && (discountValue < 0 || discountValue > 100)) {
      return NextResponse.json(
        { error: 'Percentage discount must be between 0 and 100' },
        { status: 400 }
      );
    }

    if (discountType === 'fixed' && discountValue < 0) {
      return NextResponse.json(
        { error: 'Fixed discount must be positive' },
        { status: 400 }
      );
    }

    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);

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

    // Create coupon
    const coupon = await pb.collection('coupon').create({
      tenantId: selectedTenantId,
      code: code.toUpperCase().trim(),
      description: description || '',
      discountType,
      discountValue: Math.round(discountValue * 100), // Store in paise
      minOrderAmount: minOrderAmount ? Math.round(minOrderAmount * 100) : 0,
      maxDiscountAmount: maxDiscountAmount ? Math.round(maxDiscountAmount * 100) : null,
      validFrom,
      validUntil,
      usageLimit: usageLimit || null,
      usedCount: 0,
      isActive: true,
    });

    return NextResponse.json({ coupon });
  } catch (error: any) {
    console.error('Error creating coupon:', error);
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

