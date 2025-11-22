import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { cookies } from 'next/headers';
import { calculateGSTForItems, rupeesToPaise } from '@restaurant/lib';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';

    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    // Fetch order items for this order
    const orderItems = await pb.collection('orderItem').getFullList({
      filter: `orderId = "${params.id}" || orderId ~ "${params.id}"`,
    });

    return NextResponse.json({ items: orderItems });
  } catch (error: any) {
    console.error('Error fetching order items:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch order items' },
      { status: error.status || 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    // Get existing order
    const order = await pb.collection('orders').getOne(params.id);
    const orderTenantId = Array.isArray(order.tenantId) ? order.tenantId[0] : order.tenantId;

    if (orderTenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Order does not belong to selected tenant' },
        { status: 403 }
      );
    }

    // Check if order is completed or canceled
    if (order.status === 'completed' || order.status === 'canceled') {
      return NextResponse.json(
        { error: 'Cannot add items to a completed or canceled order' },
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

    // Get table and location
    const tableId = Array.isArray(order.tableId) ? order.tableId[0] : order.tableId;
    const table = await pb.collection('tables').getOne(tableId);
    const tableLocationId = Array.isArray(table.locationId) ? table.locationId[0] : table.locationId;
    const location = await pb.collection('location').getOne(tableLocationId);
    const locationStateCode = location.stateCode || '';

    // Fetch menu items
    const menuItemIds = items.map((item: any) => item.menuItemId);
    const menuItems = await Promise.all(
      menuItemIds.map((id: string) => pb.collection('menuItem').getOne(id))
    );

    // Calculate totals for new items (all in paise)
    let newSubtotalPaise = 0;
    const newOrderItems: any[] = [];
    const gstItems: Array<{ subtotal: number; taxRate: number }> = [];

    for (const item of items) {
      const menuItem = menuItems.find((mi: any) => mi.id === item.menuItemId);
      if (!menuItem) {
        return NextResponse.json(
          { error: `Menu item ${item.menuItemId} not found` },
          { status: 404 }
        );
      }

      const basePriceInPaise = menuItem.basePrice || 0;
      const quantity = item.quantity || 1;
      const itemSubtotalPaise = basePriceInPaise * quantity;
      newSubtotalPaise += itemSubtotalPaise;

      newOrderItems.push({
        menuItemId: item.menuItemId,
        nameSnapshot: menuItem.name,
        qty: quantity,
        unitPrice: basePriceInPaise,
        optionsSnapshot: item.options || [],
      });

      gstItems.push({
        subtotal: itemSubtotalPaise,
        taxRate: menuItem.taxRate || 5,
      });
    }

    // Calculate GST for new items
    const gst = calculateGSTForItems(gstItems, locationStateCode);
    
    const newTaxCgstPaise = (gst.cgst !== undefined && gst.cgst !== null && !isNaN(Number(gst.cgst))) 
      ? Math.round(Number(gst.cgst)) 
      : 0;
    const newTaxSgstPaise = (gst.sgst !== undefined && gst.sgst !== null && !isNaN(Number(gst.sgst))) 
      ? Math.round(Number(gst.sgst)) 
      : 0;
    const newTaxIgstPaise = (gst.igst !== undefined && gst.igst !== null && !isNaN(Number(gst.igst))) 
      ? Math.round(Number(gst.igst)) 
      : 0;

    // Update order totals (add new amounts to existing)
    const updatedSubtotal = (order.subtotal || 0) + newSubtotalPaise;
    const updatedTaxCgst = (order.taxCgst || 0) + newTaxCgstPaise;
    const updatedTaxSgst = (order.taxSgst || 0) + newTaxSgstPaise;
    const updatedTaxIgst = (order.taxIgst || 0) + newTaxIgstPaise;
    const updatedTotal = updatedSubtotal + updatedTaxCgst + updatedTaxSgst + updatedTaxIgst;

    // Create new order items
    for (const item of newOrderItems) {
      await pb.collection('orderItem').create({
        orderId: params.id,
        menuItemId: item.menuItemId,
        nameSnapshot: item.nameSnapshot,
        qty: item.qty,
        unitPrice: item.unitPrice,
        optionsSnapshot: item.optionsSnapshot,
      });
    }

    // Update order totals
    await pb.collection('orders').update(params.id, {
      subtotal: Math.round(updatedSubtotal),
      taxCgst: Math.round(updatedTaxCgst),
      taxSgst: Math.round(updatedTaxSgst),
      taxIgst: Math.round(updatedTaxIgst),
      total: Math.round(updatedTotal),
    });

    // Fetch updated order
    const updatedOrder = await pb.collection('orders').getOne(params.id);

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    console.error('Error adding items to order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add items to order' },
      { status: error.status || 500 }
    );
  }
}

