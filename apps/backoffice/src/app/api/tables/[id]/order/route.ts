import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { cookies } from 'next/headers';
import { calculateGSTForItems, paiseToRupees, rupeesToPaise } from '@restaurant/lib';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Use direct PocketBase connection like other endpoints
    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';

    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    const cookieStore = cookies();
    const tenantId = cookieStore.get('selected_tenant_id')?.value;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant selected. Please select a tenant first.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items are required' },
        { status: 400 }
      );
    }

    // Get table
    const table = await pb.collection('tables').getOne(params.id);
    const tableTenantId = Array.isArray(table.tenantId) ? table.tenantId[0] : table.tenantId;
    const tableLocationId = Array.isArray(table.locationId) ? table.locationId[0] : table.locationId;

    if (tableTenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Table does not belong to selected tenant' },
        { status: 403 }
      );
    }

    // Get location
    const location = await pb.collection('location').getOne(tableLocationId);
    const locationStateCode = location.stateCode || '';

    // Fetch menu items
    const menuItemIds = items.map((item: any) => item.menuItemId);
    const menuItems = await Promise.all(
      menuItemIds.map((id: string) => pb.collection('menuItem').getOne(id))
    );

    // Calculate totals (all in paise)
    let subtotalPaise = 0;
    const orderItems: any[] = [];
    const gstItems: Array<{ subtotal: number; taxRate: number }> = [];

    for (const item of items) {
      const menuItem = menuItems.find((mi: any) => mi.id === item.menuItemId);
      if (!menuItem) {
        return NextResponse.json(
          { error: `Menu item ${item.menuItemId} not found` },
          { status: 404 }
        );
      }

      // basePrice is stored in paise
      const basePriceInPaise = menuItem.basePrice || 0;
      const quantity = item.quantity || 1;
      const itemSubtotalPaise = basePriceInPaise * quantity;
      subtotalPaise += itemSubtotalPaise;

      orderItems.push({
        menuItemId: item.menuItemId,
        nameSnapshot: menuItem.name,
        descriptionSnapshot: menuItem.description || '',
        qty: quantity,
        unitPrice: basePriceInPaise, // Already in paise
        optionsSnapshot: item.options || [],
        comment: item.comment || '',
      });

      // Prepare GST calculation data (all in paise)
      gstItems.push({
        subtotal: itemSubtotalPaise,
        taxRate: menuItem.taxRate || 5,
      });
    }

    // Calculate GST (all amounts in paise)
    const gst = calculateGSTForItems(gstItems, locationStateCode);
    
    // Ensure all GST values are valid numbers
    const taxCgstPaise = (gst.cgst !== undefined && gst.cgst !== null && !isNaN(Number(gst.cgst))) 
      ? Math.round(Number(gst.cgst)) 
      : 0;
    const taxSgstPaise = (gst.sgst !== undefined && gst.sgst !== null && !isNaN(Number(gst.sgst))) 
      ? Math.round(Number(gst.sgst)) 
      : 0;
    const taxIgstPaise = (gst.igst !== undefined && gst.igst !== null && !isNaN(Number(gst.igst))) 
      ? Math.round(Number(gst.igst)) 
      : 0;

    const totalPaise = Math.round(subtotalPaise + taxCgstPaise + taxSgstPaise + taxIgstPaise);

    // Validate all values are valid numbers
    if (isNaN(subtotalPaise) || isNaN(taxCgstPaise) || isNaN(taxSgstPaise) || isNaN(taxIgstPaise) || isNaN(totalPaise)) {
      console.error('Invalid calculation result:', {
        subtotalPaise,
        taxCgstPaise,
        taxSgstPaise,
        taxIgstPaise,
        totalPaise,
      });
      return NextResponse.json(
        { error: 'Invalid calculation result. Please check menu item prices.' },
        { status: 400 }
      );
    }

    // Ensure all values are integers (already rounded, but double-check)
    const finalSubtotal = Math.round(subtotalPaise);
    const finalTaxCgst = Math.round(taxCgstPaise);
    const finalTaxSgst = Math.round(taxSgstPaise);
    const finalTaxIgst = Math.round(taxIgstPaise);
    const finalTotal = Math.round(totalPaise);

    // Create order (all amounts in paise)
    // For dine-in orders, set status to 'accepted' directly (skip 'placed' state)
    const now = new Date().toISOString();
    const orderData: any = {
      tenantId,
      locationId: tableLocationId,
      tableId: params.id,
      channel: 'dine_in',
      status: 'accepted', // Dine-in orders go directly to accepted state
      subtotal: finalSubtotal,
      taxCgst: finalTaxCgst,
      taxSgst: finalTaxSgst,
      taxIgst: finalTaxIgst,
      total: finalTotal,
      timestamps: {
        placedAt: now,
        acceptedAt: now, // Set accepted timestamp immediately
      },
    };

    console.log('Creating order with data:', {
      ...orderData,
      subtotalRupees: paiseToRupees(finalSubtotal),
      taxCgstRupees: paiseToRupees(finalTaxCgst),
      taxSgstRupees: paiseToRupees(finalTaxSgst),
      taxIgstRupees: paiseToRupees(finalTaxIgst),
      totalRupees: paiseToRupees(finalTotal),
      allValuesAreNumbers: {
        subtotal: typeof finalSubtotal === 'number',
        taxCgst: typeof finalTaxCgst === 'number',
        taxSgst: typeof finalTaxSgst === 'number',
        taxIgst: typeof finalTaxIgst === 'number',
        total: typeof finalTotal === 'number',
      },
    });

    let order;
    try {
      order = await pb.collection('orders').create(orderData);
    } catch (createError: any) {
      console.error('PocketBase create error:', {
        errorType: createError.constructor?.name,
        message: createError.message,
        status: createError.status,
        code: createError.code,
        response: createError.response,
        data: createError.data,
        responseData: createError.response?.data,
        responseDataData: createError.response?.data?.data,
      });

      // Extract validation errors
      let errorData: any = {};
      if (createError.response?.data?.data) {
        errorData = createError.response.data.data;
      } else if (createError.data?.data) {
        errorData = createError.data.data;
      } else if (createError.data) {
        errorData = createError.data;
      }

      console.error('Extracted errorData:', JSON.stringify(errorData, null, 2));
      console.error('Order data being sent:', JSON.stringify(orderData, null, 2));

      // Extract validation errors
      let errorMessages: string[] = [];
      if (errorData && typeof errorData === 'object') {
        Object.entries(errorData).forEach(([field, err]: [string, any]) => {
          if (err) {
            if (typeof err === 'object') {
              if (err.message) {
                errorMessages.push(`${field}: ${err.message}`);
              } else if (err.code) {
                errorMessages.push(`${field}: ${err.code}`);
              } else {
                errorMessages.push(`${field}: ${JSON.stringify(err)}`);
              }
            } else {
              errorMessages.push(`${field}: ${err}`);
            }
          }
        });
      }

      const errorMsg = errorMessages.length > 0
        ? `Validation error: ${errorMessages.join(', ')}`
        : createError.message || 'Failed to create order';

      return NextResponse.json(
        { error: errorMsg },
        { status: createError.status || 400 }
      );
    }

    // Create order items
    for (const item of orderItems) {
      await pb.collection('orderItem').create({
        orderId: order.id,
        menuItemId: item.menuItemId,
        nameSnapshot: item.nameSnapshot,
        descriptionSnapshot: item.descriptionSnapshot || '',
        qty: item.qty,
        unitPrice: item.unitPrice,
        optionsSnapshot: item.optionsSnapshot,
        comment: item.comment || '',
      });
    }

    // Update table status to 'seated'
    await pb.collection('tables').update(params.id, {
      status: 'seated',
    });

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error('Error creating order on table:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: error.status || 500 }
    );
  }
}

