import { NextRequest, NextResponse } from 'next/server';
import { getAdminPb } from '@/lib/server-utils';
import { cookies } from 'next/headers';
import { calculateGSTForItems, rupeesToPaise } from '@restaurant/lib';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pb = await getAdminPb();

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
        descriptionSnapshot: menuItem.description || '',
        qty: quantity,
        unitPrice: basePriceInPaise,
        optionsSnapshot: item.options || [],
        comment: item.comment || '',
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
        descriptionSnapshot: item.descriptionSnapshot || '',
        qty: item.qty,
        unitPrice: item.unitPrice,
        optionsSnapshot: item.optionsSnapshot,
        comment: item.comment || '',
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

    // Create KDS tickets for newly added items (even if order is already ready)
    // This ensures new items appear in KDS when added to existing orders
    try {
      console.log(`Creating KDS tickets for ${newOrderItems.length} newly added items to order ${params.id}...`);

      // Handle tenantId and locationId (they might be arrays)
      const tenantId = Array.isArray(order.tenantId) ? order.tenantId[0] : order.tenantId;
      const locationId = Array.isArray(order.locationId) ? order.locationId[0] : order.locationId;

      // Group new items by station
      const itemsByStation: Record<string, any[]> = {
        hot: [],
        cold: [],
        bar: [],
        default: [],
      };

      // Fetch menu items and their categories to determine station for each new item
      for (const newItem of newOrderItems) {
        try {
          const menuItem = await pb.collection('menuItem').getOne(newItem.menuItemId, {
            expand: 'categoryId',
          });

          // Get category name
          let categoryName = '';
          if (menuItem.categoryId) {
            try {
              const categoryId = Array.isArray(menuItem.categoryId) ? menuItem.categoryId[0] : menuItem.categoryId;
              const category = await pb.collection('menuCategory').getOne(categoryId);
              categoryName = category.name.toLowerCase();
            } catch (e) {
              // Category not found, skip
            }
          }

          // Map category to station based on category name
          let itemStation = 'default';
          if (categoryName.includes('beverage') || categoryName.includes('drink') || categoryName.includes('bar') || categoryName.includes('juice') || categoryName.includes('coffee') || categoryName.includes('tea') || categoryName.includes('cocktail') || categoryName.includes('mocktail') || categoryName.includes('shake') || categoryName.includes('smoothie')) {
            itemStation = 'bar';
          } else if (categoryName.includes('salad') || categoryName.includes('cold') || (categoryName.includes('appetizer') && categoryName.includes('cold')) || categoryName.includes('ice cream')) {
            itemStation = 'cold';
          } else if (categoryName.includes('main') || categoryName.includes('entree') || categoryName.includes('hot') || categoryName.includes('appetizer') || categoryName.includes('dessert') || categoryName.includes('starter') || categoryName.includes('bread') || categoryName.includes('rice') || categoryName.includes('soup') || categoryName.includes('curry') || categoryName.includes('tandoor') || categoryName.includes('pizza') || categoryName.includes('burger') || categoryName.includes('pasta')) {
            itemStation = 'hot';
          }

          // Add item to the appropriate station group
          itemsByStation[itemStation].push({
            menuItemId: newItem.menuItemId,
            name: newItem.nameSnapshot,
            description: newItem.descriptionSnapshot || '',
            qty: newItem.qty,
            options: newItem.optionsSnapshot || [],
            unitPrice: newItem.unitPrice,
            comment: newItem.comment || '',
          });
        } catch (e) {
          // Menu item not found, use default
          itemsByStation['default'].push({
            menuItemId: newItem.menuItemId,
            name: newItem.nameSnapshot,
            description: newItem.descriptionSnapshot || '',
            qty: newItem.qty,
            options: newItem.optionsSnapshot || [],
            unitPrice: newItem.unitPrice,
            comment: newItem.comment || '',
          });
        }
      }

      console.log(`Grouped new items by station for order ${params.id}:`, {
        hot: itemsByStation.hot.length,
        cold: itemsByStation.cold.length,
        bar: itemsByStation.bar.length,
        default: itemsByStation.default.length,
      });

      // Create separate KDS ticket for each station that has new items
      const createdTickets = [];
      for (const [station, items] of Object.entries(itemsByStation)) {
        if (items.length > 0) {
          try {
            const kdsTicket = await pb.collection('kdsTicket').create({
              tenantId: tenantId,
              locationId: locationId,
              orderId: params.id,
              station: station,
              status: 'queued',
              ticketItems: items,
              priority: false,
            });
            createdTickets.push({ station, ticketId: kdsTicket.id });
            console.log(`✅ Created KDS ticket ${kdsTicket.id} for newly added items to order ${params.id} at ${station} station with ${items.length} items`);
          } catch (ticketError: any) {
            console.error(`❌ Error creating KDS ticket for ${station} station:`, {
              message: ticketError.message,
              status: ticketError.status,
            });
          }
        }
      }

      if (createdTickets.length === 0) {
        console.warn(`⚠️  No KDS tickets created for newly added items to order ${params.id} (no items found)`);
      } else {
        console.log(`✅ Created ${createdTickets.length} KDS ticket(s) for newly added items to order ${params.id}:`, createdTickets);
      }
    } catch (kdsError: any) {
      console.error('❌ Error creating KDS tickets for newly added items:', {
        message: kdsError.message,
        status: kdsError.status,
      });
      // Don't fail the item addition if KDS ticket creation fails
    }

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

