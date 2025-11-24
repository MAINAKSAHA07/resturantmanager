import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Direct PocketBase connection
    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL;
    const adminPassword = process.env.PB_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD must be set' }, { status: 500 });
    }

    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    const searchParams = request.nextUrl.searchParams;
    const filterStatus = searchParams.get('status') || 'all';

    // Get selected tenant from cookies
    const cookieStore = cookies();
    const tenantId = cookieStore.get('selected_tenant_id')?.value;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant selected. Please select a tenant first.' },
        { status: 400 }
      );
    }

    console.log('Selected tenant ID:', tenantId);
    console.log('Filter status:', filterStatus);

    // Fetch all orders and filter client-side because PocketBase relation filters don't work reliably
    const allOrders = await pb.collection('orders').getList(1, 500, {
      sort: '-created',
    });

    console.log(`Fetched ${allOrders.items.length} total orders from database`);

    // Filter client-side by tenant and status
    const filteredOrders = allOrders.items.filter((order: any) => {
      // Handle tenantId - it might be a string or an array (relation field)
      const orderTenantId = Array.isArray(order.tenantId) ? order.tenantId[0] : order.tenantId;
      const matchesTenant = orderTenantId === tenantId;
      const matchesStatus = filterStatus === 'all' || order.status === filterStatus;

      if (!matchesTenant) {
        console.log(`Order ${order.id.slice(0, 8)}: tenant mismatch - order has ${orderTenantId}, looking for ${tenantId}`);
      }

      return matchesTenant && matchesStatus;
    });

    console.log(`Found ${filteredOrders.length} orders for tenant ${tenantId} with status ${filterStatus}`);
    if (filteredOrders.length > 0) {
      console.log('Order IDs:', filteredOrders.map((o: any) => o.id.slice(0, 8)));
    }

    // Fetch all order items once (more efficient than fetching per order)
    let allOrderItems: any[] = [];
    try {
      const orderItemsResponse = await pb.collection('orderItem').getList(1, 1000);
      allOrderItems = orderItemsResponse.items;
      console.log(`Fetched ${allOrderItems.length} total order items from database`);
    } catch (e: any) {
      console.error('Error fetching order items:', {
        message: e.message,
        status: e.status,
        response: e.response?.data,
      });
    }

    // Map order items by orderId for quick lookup
    const orderItemsMap = new Map<string, any[]>();
    allOrderItems.forEach((item: any) => {
      const itemOrderId = Array.isArray(item.orderId) ? item.orderId[0] : item.orderId;
      if (!orderItemsMap.has(itemOrderId)) {
        orderItemsMap.set(itemOrderId, []);
      }
      orderItemsMap.get(itemOrderId)!.push(item);
    });

    // Attach items to each order
    const ordersWithItems = filteredOrders.map((order: any) => {
      const orderItems = orderItemsMap.get(order.id) || [];

      console.log(`Order ${order.id.slice(0, 8)}: Found ${orderItems.length} items`);

      return {
        id: order.id,
        status: order.status,
        total: order.total,
        subtotal: order.subtotal,
        taxCgst: order.taxCgst,
        taxSgst: order.taxSgst,
        taxIgst: order.taxIgst,
        channel: order.channel,
        created: order.created,
        updated: order.updated,
        timestamps: order.timestamps || {},
        tenantId: order.tenantId,
        locationId: order.locationId,
        tableId: order.tableId, // Include tableId for filtering
        customerId: order.customerId,
        items: orderItems.map((item: any) => ({
          id: item.id,
          menuItemId: item.menuItemId,
          nameSnapshot: item.nameSnapshot,
          qty: item.qty,
          unitPrice: item.unitPrice,
          optionsSnapshot: item.optionsSnapshot || [],
        })),
      };
    });

    return NextResponse.json({ orders: ordersWithItems });
  } catch (error: any) {
    console.error('Error fetching orders:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch orders',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Direct PocketBase connection
    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL;
    const adminPassword = process.env.PB_ADMIN_PASSWORD;

    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    const body = await request.json();
    const { orderId, status } = body;

    // Get the current order to check old status
    const currentOrder = await pb.collection('orders').getOne(orderId);
    const oldStatus = currentOrder.status;

    console.log(`Updating order ${orderId}: ${oldStatus} -> ${status}`);

    // Update order status and timestamps
    const updateData: any = { status };

    // Update timestamps based on status
    const now = new Date().toISOString();
    if (status === 'accepted' && oldStatus !== 'accepted') {
      updateData.timestamps = { ...currentOrder.timestamps, acceptedAt: now };
    } else if (status === 'in_kitchen' && oldStatus !== 'in_kitchen') {
      updateData.timestamps = { ...currentOrder.timestamps, inKitchenAt: now };
    } else if (status === 'ready' && oldStatus !== 'ready') {
      updateData.timestamps = { ...currentOrder.timestamps, readyAt: now };
    } else if (status === 'served' && oldStatus !== 'served') {
      updateData.timestamps = { ...currentOrder.timestamps, servedAt: now };
    } else if (status === 'completed' && oldStatus !== 'completed') {
      updateData.timestamps = { ...currentOrder.timestamps, completedAt: now };
    }

    await pb.collection('orders').update(orderId, updateData);
    console.log(`✅ Order ${orderId} updated to status: ${status}`);

    // If order is completed, mark all KDS tickets for this order as bumped (removed from KDS)
    if (status === 'completed' && oldStatus !== 'completed') {
      try {
        const allTickets = await pb.collection('kdsTicket').getList(1, 100, {
          filter: `orderId = "${orderId}"`,
        });

        if (allTickets.items.length > 0) {
          console.log(`Marking ${allTickets.items.length} KDS ticket(s) as bumped for completed order ${orderId}`);
          
          // Mark all tickets as bumped
          await Promise.all(
            allTickets.items.map((ticket: any) =>
              pb.collection('kdsTicket').update(ticket.id, { status: 'bumped' })
            )
          );
          
          console.log(`✅ All KDS tickets for order ${orderId} have been marked as bumped`);
        }
      } catch (bumpError: any) {
        console.error('❌ Error bumping KDS tickets for completed order:', {
          message: bumpError.message,
          status: bumpError.status,
        });
        // Don't fail the order update if ticket bumping fails
      }
    }

    // Create KDS ticket when order is accepted or moved to in_kitchen
    // Check if a ticket should be created (when order is accepted or moved to kitchen)
    const shouldCreateTicket =
      (status === 'accepted' && oldStatus !== 'accepted') ||
      (status === 'in_kitchen' && oldStatus !== 'in_kitchen');

    console.log(`Checking KDS ticket creation: shouldCreateTicket=${shouldCreateTicket}, oldStatus=${oldStatus}, newStatus=${status}`);

    if (shouldCreateTicket) {
      console.log(`Order ${orderId} status changed to ${status}, checking for KDS ticket...`);
      try {
        // Check if KDS tickets already exist for this order
        const allExistingTickets = await pb.collection('kdsTicket').getList(1, 100, {
          filter: `orderId = "${orderId}"`,
        });

        if (allExistingTickets.items.length === 0) {
          console.log(`Creating KDS tickets for order ${orderId}...`);

          // Fetch order items - fetch all and filter client-side (PocketBase filters don't work reliably for relation fields)
          const allOrderItems = await pb.collection('orderItem').getList(1, 1000);

          // Filter by orderId client-side
          const orderItems = allOrderItems.items.filter((item: any) => {
            const itemOrderId = Array.isArray(item.orderId) ? item.orderId[0] : item.orderId;
            return itemOrderId === orderId;
          });

          console.log(`Found ${orderItems.length} order items for order ${orderId}`);

          if (orderItems.length === 0) {
            console.warn(`⚠️  Order ${orderId} has no items. Creating KDS ticket with empty items array.`);
          }

          // Handle tenantId and locationId (they might be arrays)
          const tenantId = Array.isArray(currentOrder.tenantId) ? currentOrder.tenantId[0] : currentOrder.tenantId;
          const locationId = Array.isArray(currentOrder.locationId) ? currentOrder.locationId[0] : currentOrder.locationId;

          // Group order items by station
          const itemsByStation: Record<string, any[]> = {
            hot: [],
            cold: [],
            bar: [],
            default: [],
          };

          // Fetch menu items and their categories to determine station for each item
          for (const orderItem of orderItems) {
            try {
              const menuItem = await pb.collection('menuItem').getOne(orderItem.menuItemId, {
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
              const itemComment = orderItem.comment || '';
              console.log(`[KDS Ticket Creation] OrderItem ${orderItem.id.slice(0, 8)}: comment="${itemComment}"`);
              
              itemsByStation[itemStation].push({
                menuItemId: orderItem.menuItemId,
                name: orderItem.nameSnapshot,
                description: orderItem.descriptionSnapshot || '',
                qty: orderItem.qty,
                options: orderItem.optionsSnapshot || [],
                unitPrice: orderItem.unitPrice,
                comment: itemComment,
              });
            } catch (e) {
              // Menu item not found, use default
              itemsByStation['default'].push({
                menuItemId: orderItem.menuItemId,
                name: orderItem.nameSnapshot,
                description: orderItem.descriptionSnapshot || '',
                qty: orderItem.qty,
                options: orderItem.optionsSnapshot || [],
                unitPrice: orderItem.unitPrice,
                comment: orderItem.comment || '',
              });
            }
          }

          console.log(`Grouped items by station for order ${orderId}:`, {
            hot: itemsByStation.hot.length,
            cold: itemsByStation.cold.length,
            bar: itemsByStation.bar.length,
            default: itemsByStation.default.length,
          });

          // Create separate KDS ticket for each station that has items
          const createdTickets = [];
          for (const [station, items] of Object.entries(itemsByStation)) {
            if (items.length > 0) {
              try {
          const kdsTicket = await pb.collection('kdsTicket').create({
            tenantId: tenantId,
            locationId: locationId,
            orderId: orderId,
            station: station,
            status: 'queued',
            ticketItems: items,
            priority: false,
          });
                createdTickets.push({ station, ticketId: kdsTicket.id });
                console.log(`✅ Created KDS ticket ${kdsTicket.id} for order ${orderId} at ${station} station with ${items.length} items`);
              } catch (ticketError: any) {
                console.error(`❌ Error creating KDS ticket for ${station} station:`, {
                  message: ticketError.message,
                  status: ticketError.status,
                });
              }
            }
          }

          if (createdTickets.length === 0) {
            console.warn(`⚠️  No KDS tickets created for order ${orderId} (no items found)`);
          } else {
            console.log(`✅ Created ${createdTickets.length} KDS ticket(s) for order ${orderId}:`, createdTickets);
          }
        } else {
          console.log(`KDS tickets already exist for order ${orderId} (${allExistingTickets.items.length} ticket(s) found)`);
        }
      } catch (kdsError: any) {
        console.error('❌ Error creating KDS ticket:', {
          message: kdsError.message,
          status: kdsError.status,
          response: kdsError.response?.data,
          stack: kdsError.stack,
        });
        // Don't fail the order update if KDS ticket creation fails
      }
    } else {
      console.log(`Order ${orderId} status change from ${oldStatus} to ${status} does not require KDS ticket creation`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update order' },
      { status: 500 }
    );
  }
}


