import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminPb } from '@/lib/server-utils';
import { calculateGSTForItems } from '@restaurant/lib';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const pb = await getAdminPb();

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
        { error: 'Cannot modify items in a completed or canceled order' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { quantity } = body;

    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { error: 'Quantity must be at least 1' },
        { status: 400 }
      );
    }

    // Get the order item
    const orderItem = await pb.collection('orderItem').getOne(params.itemId);
    
    // Verify it belongs to this order
    const itemOrderId = Array.isArray(orderItem.orderId) ? orderItem.orderId[0] : orderItem.orderId;
    if (itemOrderId !== params.id) {
      return NextResponse.json(
        { error: 'Order item does not belong to this order' },
        { status: 403 }
      );
    }

    // Get table and location for GST calculation
    const tableId = Array.isArray(order.tableId) ? order.tableId[0] : order.tableId;
    const table = await pb.collection('tables').getOne(tableId);
    const tableLocationId = Array.isArray(table.locationId) ? table.locationId[0] : table.locationId;
    const location = await pb.collection('location').getOne(tableLocationId);
    const locationStateCode = location.stateCode || '';

    // Calculate new subtotal for this item
    const oldSubtotal = (orderItem.unitPrice || 0) * (orderItem.qty || 1);
    const newSubtotal = (orderItem.unitPrice || 0) * quantity;
    const subtotalDiff = newSubtotal - oldSubtotal;

    // Calculate GST difference
    const menuItem = await pb.collection('menuItem').getOne(orderItem.menuItemId);
    const taxRate = menuItem.taxRate || 5;
    
    // Calculate GST for the difference amount
    const gst = calculateGSTForItems([{ subtotal: Math.abs(subtotalDiff), taxRate }], locationStateCode);
    
    // Apply the sign based on whether we're increasing or decreasing
    const sign = subtotalDiff > 0 ? 1 : -1;
    const taxCgstDiff = sign * ((gst.cgst !== undefined && gst.cgst !== null && !isNaN(Number(gst.cgst))) ? Math.round(Number(gst.cgst)) : 0);
    const taxSgstDiff = sign * ((gst.sgst !== undefined && gst.sgst !== null && !isNaN(Number(gst.sgst))) ? Math.round(Number(gst.sgst)) : 0);
    const taxIgstDiff = sign * ((gst.igst !== undefined && gst.igst !== null && !isNaN(Number(gst.igst))) ? Math.round(Number(gst.igst)) : 0);

    // Update order item quantity
    await pb.collection('orderItem').update(params.itemId, {
      qty: quantity,
    });

    // Update order totals
    const updatedSubtotal = (order.subtotal || 0) + subtotalDiff;
    const updatedTaxCgst = (order.taxCgst || 0) + taxCgstDiff;
    const updatedTaxSgst = (order.taxSgst || 0) + taxSgstDiff;
    const updatedTaxIgst = (order.taxIgst || 0) + taxIgstDiff;
    const updatedTotal = updatedSubtotal + updatedTaxCgst + updatedTaxSgst + updatedTaxIgst;

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
    console.error('Error updating order item:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update order item' },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const pb = await getAdminPb();

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
        { error: 'Cannot delete items from a completed or canceled order' },
        { status: 400 }
      );
    }

    // Get the order item
    const orderItem = await pb.collection('orderItem').getOne(params.itemId);
    
    // Verify it belongs to this order
    const itemOrderId = Array.isArray(orderItem.orderId) ? orderItem.orderId[0] : orderItem.orderId;
    if (itemOrderId !== params.id) {
      return NextResponse.json(
        { error: 'Order item does not belong to this order' },
        { status: 403 }
      );
    }

    // Calculate amount to subtract
    const itemSubtotal = (orderItem.unitPrice || 0) * (orderItem.qty || 1);
    
    // Get table and location for GST calculation
    const tableId = Array.isArray(order.tableId) ? order.tableId[0] : order.tableId;
    const table = await pb.collection('tables').getOne(tableId);
    const tableLocationId = Array.isArray(table.locationId) ? table.locationId[0] : table.locationId;
    const location = await pb.collection('location').getOne(tableLocationId);
    const locationStateCode = location.stateCode || '';

    // Calculate GST for this item
    const menuItem = await pb.collection('menuItem').getOne(orderItem.menuItemId);
    const taxRate = menuItem.taxRate || 5;
    
    const gst = calculateGSTForItems([{ subtotal: itemSubtotal, taxRate }], locationStateCode);
    
    const itemTaxCgst = (gst.cgst !== undefined && gst.cgst !== null && !isNaN(Number(gst.cgst))) 
      ? Math.round(Number(gst.cgst)) 
      : 0;
    const itemTaxSgst = (gst.sgst !== undefined && gst.sgst !== null && !isNaN(Number(gst.sgst))) 
      ? Math.round(Number(gst.sgst)) 
      : 0;
    const itemTaxIgst = (gst.igst !== undefined && gst.igst !== null && !isNaN(Number(gst.igst))) 
      ? Math.round(Number(gst.igst)) 
      : 0;

    // Delete the order item
    await pb.collection('orderItem').delete(params.itemId);

    // Update order totals (subtract the item amounts)
    const updatedSubtotal = Math.max(0, (order.subtotal || 0) - itemSubtotal);
    const updatedTaxCgst = Math.max(0, (order.taxCgst || 0) - itemTaxCgst);
    const updatedTaxSgst = Math.max(0, (order.taxSgst || 0) - itemTaxSgst);
    const updatedTaxIgst = Math.max(0, (order.taxIgst || 0) - itemTaxIgst);
    const updatedTotal = updatedSubtotal + updatedTaxCgst + updatedTaxSgst + updatedTaxIgst;

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
    console.error('Error deleting order item:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete order item' },
      { status: error.status || 500 }
    );
  }
}

