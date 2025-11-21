import { NextRequest, NextResponse } from 'next/server';
import { extractBrandKey } from '@restaurant/lib';
import { calculateGSTForItems } from '@restaurant/lib';
import PocketBase from 'pocketbase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items are required' }, { status: 400 });
    }

    // Get tenant from cookie or hostname
    const cookies = request.cookies;
    const tenantCookie = cookies.get('selected_tenant')?.value;
    const hostname = request.headers.get('host') || '';
    const extractedBrandKey = extractBrandKey(hostname);
    const brandKey = tenantCookie || extractedBrandKey || 'saffron';

    // Direct PocketBase connection
    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    // Get tenant
    const tenants = await pb.collection('tenant').getList(1, 1, {
      filter: `key = "${brandKey}"`,
    });

    if (tenants.items.length === 0) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const tenant = tenants.items[0];

    // Get all locations and filter client-side to handle relation fields
    const allLocations = await pb.collection('location').getList(1, 100, {
      expand: 'tenantId',
    });
    
    // Filter by tenant (handle relation fields which may be arrays)
    const locations = allLocations.items.filter(loc => {
      const locTenantId = Array.isArray(loc.tenantId) ? loc.tenantId[0] : loc.tenantId;
      return locTenantId === tenant.id;
    });

    if (locations.length === 0) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // Use the first location (or could allow selection)
    const location = locations[0];

    // Calculate totals
    const itemData = await Promise.all(
      items.map(async (item: any) => {
        const menuItem = await pb.collection('menuItem').getOne(item.menuItemId);
        let itemPrice = menuItem.basePrice;

        // Add option prices (simplified)
        if (item.options) {
          for (const option of item.options) {
            for (const valueId of option.valueIds) {
              try {
                const optionValue = await pb.collection('optionValue').getOne(valueId);
                itemPrice += optionValue.priceDelta;
              } catch (error) {
                // Option value not found, skip
              }
            }
          }
        }

        return {
          subtotal: itemPrice * item.quantity,
          taxRate: menuItem.taxRate,
        };
      })
    );

    const subtotal = itemData.reduce((sum, item) => sum + item.subtotal, 0);
    const gst = calculateGSTForItems(itemData, location.stateCode);
    const total = subtotal + gst.totalTax;

    // Get customer ID from session token if available
    let customerId = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const session = JSON.parse(Buffer.from(token, 'base64').toString());
        if (session.customerId && session.exp > Date.now()) {
          customerId = session.customerId;
        }
      } catch (e) {
        // Invalid token, continue without customer ID (guest checkout)
      }
    }

    // Create order
    const orderData: any = {
      tenantId: tenant.id,
      locationId: location.id,
      channel: 'pickup', // Default, can be made configurable
      status: 'placed',
      subtotal,
      taxCgst: gst.cgst,
      taxSgst: gst.sgst,
      taxIgst: gst.igst,
      total,
      timestamps: {
        placedAt: new Date().toISOString(),
      },
    };

    if (customerId) {
      orderData.customerId = customerId;
    }

    const order = await pb.collection('orders').create(orderData);

    // Create order items
    for (const item of items) {
      const menuItem = await pb.collection('menuItem').getOne(item.menuItemId);
      let unitPrice = menuItem.basePrice;

      // Add option prices
      if (item.options) {
        for (const option of item.options) {
          for (const valueId of option.valueIds) {
            try {
              const optionValue = await pb.collection('optionValue').getOne(valueId);
              unitPrice += optionValue.priceDelta;
            } catch (error) {
              // Skip
            }
          }
        }
      }

      await pb.collection('orderItem').create({
        orderId: order.id,
        menuItemId: item.menuItemId,
        nameSnapshot: menuItem.name,
        qty: item.quantity,
        unitPrice,
        optionsSnapshot: item.options || [],
      });
    }

    return NextResponse.json({
      orderId: order.id,
      total,
      amount: total, // For Razorpay (in paise)
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}



