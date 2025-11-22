import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';

    // Validate environment variables
    if (!pbUrl || pbUrl === 'http://localhost:8090') {
      console.warn('[KDS API] Warning: Using default PocketBase URL. Set AWS_POCKETBASE_URL or POCKETBASE_URL environment variable.');
    }
    if (!adminEmail || adminEmail === 'mainaksaha0807@gmail.com') {
      console.warn('[KDS API] Warning: Using default admin email. Set PB_ADMIN_EMAIL environment variable.');
    }
    if (!adminPassword || adminPassword === '8104760831') {
      console.warn('[KDS API] Warning: Using default admin password. Set PB_ADMIN_PASSWORD environment variable.');
    }

    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    const searchParams = request.nextUrl.searchParams;
    const filterStatus = searchParams.get('status') || 'all';

    // Get selected tenant from cookies
    const cookieStore = cookies();
    const tenantId = cookieStore.get('selected_tenant_id')?.value;

    if (!tenantId) {
      return NextResponse.json({ tickets: [] });
    }

    // Fetch all tickets and filter client-side (PocketBase relation filters don't work reliably)
    // Handle case where kdsTicket collection might not exist yet
    let allTickets;
    try {
      allTickets = await pb.collection('kdsTicket').getList(1, 100, {
        expand: 'orderId',
        sort: '-created',
      });
    } catch (error: any) {
      if (error.status === 404) {
        console.warn('kdsTicket collection does not exist yet. Returning empty list.');
        return NextResponse.json({ tickets: [] });
      }
      throw error;
    }

    // Fetch all orders to check their status
    let allOrders;
    try {
      allOrders = await pb.collection('orders').getList(1, 1000);
    } catch (error: any) {
      console.warn('Could not fetch orders for filtering:', error.message);
      allOrders = { items: [] };
    }

    // Create a map of order IDs to their status
    const orderStatusMap = new Map<string, string>();
    allOrders.items.forEach((order: any) => {
      const orderId = order.id;
      orderStatusMap.set(orderId, order.status);
    });

    // Filter by tenant and status (exclude bumped tickets and tickets for completed orders)
    const filteredTickets = allTickets.items.filter((ticket: any) => {
      const ticketTenantId = Array.isArray(ticket.tenantId) ? ticket.tenantId[0] : ticket.tenantId;
      const matchesTenant = ticketTenantId === tenantId;
      
      // Exclude bumped tickets
      if (ticket.status === 'bumped') {
        return false;
      }
      
      // Exclude tickets for completed orders
      const orderId = Array.isArray(ticket.orderId) ? ticket.orderId[0] : ticket.orderId;
      const orderStatus = orderStatusMap.get(orderId);
      if (orderStatus === 'completed') {
        return false;
      }
      
      // Match status filter
      const matchesStatus = filterStatus === 'all' ? true : ticket.status === filterStatus;
      return matchesTenant && matchesStatus;
    });

    console.log(`Found ${filteredTickets.length} KDS tickets for tenant ${tenantId}`);

    // Fetch actual order items for each ticket from the orderItem collection
    const ticketsWithItems = await Promise.all(
      filteredTickets.map(async (ticket: any) => {
        let orderItems: any[] = [];

        try {
          // Get orderId (handle array format)
          const orderId = Array.isArray(ticket.orderId) ? ticket.orderId[0] : ticket.orderId;

          // Fetch all order items and filter client-side
          // Explicitly request fields including comment
          const allOrderItems = await pb.collection('orderItem').getList(1, 1000, {
            fields: 'id,orderId,menuItemId,nameSnapshot,descriptionSnapshot,qty,unitPrice,optionsSnapshot,comment,created,updated',
          });

          // Filter by orderId client-side
          orderItems = allOrderItems.items.filter((item: any) => {
            const itemOrderId = Array.isArray(item.orderId) ? item.orderId[0] : item.orderId;
            return itemOrderId === orderId;
          });
          
          // Debug: Log all orderItems to see their structure
          console.log(`Order ${orderId.slice(0, 8)}: All orderItems:`, orderItems.map((oi: any) => ({
            id: oi.id.slice(0, 8),
            menuItemId: oi.menuItemId,
            name: oi.nameSnapshot,
            qty: oi.qty,
            hasComment: !!(oi.comment && oi.comment.trim()),
            comment: oi.comment || '(empty)',
          })));

          // Log comments found in orderItems for debugging
          const itemsWithComments = orderItems.filter((item: any) => item.comment && item.comment.trim());
          console.log(`Ticket ${ticket.id.slice(0, 8)} (${ticket.station}): Found ${orderItems.length} order items for order ${orderId.slice(0, 8)}, ${itemsWithComments.length} with comments`);
          if (itemsWithComments.length > 0) {
            itemsWithComments.forEach((item: any) => {
              console.log(`  - ${item.nameSnapshot || item.menuItemId}: comment="${item.comment}"`);
            });
          }
        } catch (e: any) {
          console.error(`Error fetching items for ticket ${ticket.id}:`, {
            message: e.message,
            status: e.status,
          });
        }

        // Merge ticketItems with fresh orderItem data to ensure comments are always up-to-date
        // ticketItems contains station-specific items, but we need to merge with fresh orderItem data for comments
        let items: any[] = [];
        
        if (ticket.ticketItems && ticket.ticketItems.length > 0) {
          // Use ticketItems as base, but merge with fresh orderItem data to get latest comments
          items = ticket.ticketItems.map((ticketItem: any, ticketItemIndex: number) => {
            // Find matching orderItem to get latest comment
            // Strategy: Match by menuItemId first, then by qty if multiple matches
            const matchingOrderItems = orderItems.filter((oi: any) => oi.menuItemId === ticketItem.menuItemId);
            
            let matchingOrderItem: any = null;
            
            if (matchingOrderItems.length === 1) {
              // Single match - use it
              matchingOrderItem = matchingOrderItems[0];
            } else if (matchingOrderItems.length > 1) {
              // Multiple matches - try to match by qty
              matchingOrderItem = matchingOrderItems.find((oi: any) => oi.qty === ticketItem.qty);
              // If still no match by qty, use the first one
              if (!matchingOrderItem) {
                matchingOrderItem = matchingOrderItems[0];
              }
            }
            
            // If still no match, try by index as fallback
            if (!matchingOrderItem && orderItems.length > ticketItemIndex) {
              matchingOrderItem = orderItems[ticketItemIndex];
            }
            
            const commentFromOrderItem = matchingOrderItem?.comment || '';
            const commentFromTicketItem = ticketItem.comment || '';
            // Prioritize comment from orderItem (source of truth), fallback to ticketItem
            const finalComment = (commentFromOrderItem || commentFromTicketItem || '').trim();
            
            // Log for debugging
            if (matchingOrderItem) {
              console.log(`Ticket ${ticket.id.slice(0, 8)} (${ticket.station}): Item "${ticketItem.name || ticketItem.menuItemId}" (qty: ${ticketItem.qty}): Found matching orderItem (${matchingOrderItem.id.slice(0, 8)}), comment="${finalComment}" (from orderItem: ${!!commentFromOrderItem}, from ticketItem: ${!!commentFromTicketItem})`);
            } else {
              console.log(`Ticket ${ticket.id.slice(0, 8)} (${ticket.station}): Item "${ticketItem.name || ticketItem.menuItemId}": No matching orderItem found (${orderItems.length} total orderItems), using ticketItem.comment="${commentFromTicketItem}"`);
            }
            
            return {
              menuItemId: ticketItem.menuItemId,
              name: ticketItem.name || ticketItem.nameSnapshot || '',
              description: ticketItem.description || ticketItem.descriptionSnapshot || '',
              qty: ticketItem.qty,
              options: ticketItem.options || ticketItem.optionsSnapshot || [],
              unitPrice: ticketItem.unitPrice,
              // Always include comment, prioritizing orderItem data
              comment: finalComment,
            };
          });
        } else if (orderItems.length > 0) {
          // Fallback: use orderItems directly
          items = orderItems.map((item: any) => ({
            menuItemId: item.menuItemId,
            name: item.nameSnapshot,
            description: item.descriptionSnapshot || '',
            qty: item.qty,
            options: item.optionsSnapshot || [],
            unitPrice: item.unitPrice,
            comment: (item.comment || '').trim(),
          }));
        }

        console.log(`Ticket ${ticket.id.slice(0, 8)} (${ticket.station}): Using ${items.length} items (${ticket.ticketItems?.length || 0} from ticketItems, ${orderItems.length} from order)`);
        
        // Ensure all items have a comment field (even if empty) and log comments for debugging
        const itemsWithComments = items.filter((item: any) => item.comment && item.comment.trim());
        const finalItems = items.map((item: any) => ({
          ...item,
          comment: (item.comment || '').trim(), // Ensure comment is always a string
        }));
        
        if (itemsWithComments.length > 0) {
          console.log(`Ticket ${ticket.id.slice(0, 8)}: ${itemsWithComments.length} items have comments:`, 
            itemsWithComments.map((item: any) => `${item.name || item.menuItemId}: "${item.comment}"`).join(', '));
        } else {
          console.log(`Ticket ${ticket.id.slice(0, 8)}: No items have comments`);
        }

        return {
          ...ticket,
          items: finalItems,
          ticketItems: finalItems, // Keep both for compatibility
        };
      })
    );

    return NextResponse.json({ tickets: ticketsWithItems });
  } catch (error: any) {
    console.error('Error fetching KDS tickets:', {
      message: error.message,
      status: error.status,
      response: error.response?.data || error.response,
      stack: error.stack,
      pbUrl: process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL,
      hasEmail: !!process.env.PB_ADMIN_EMAIL,
      hasPassword: !!process.env.PB_ADMIN_PASSWORD,
    });
    
    // Return more detailed error in development, generic in production
    const errorMessage = process.env.NODE_ENV === 'development'
      ? error.message || 'Failed to fetch KDS tickets'
      : 'Failed to fetch KDS tickets';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' 
          ? { 
              message: error.message,
              status: error.status,
              response: error.response?.data || error.response,
            }
          : undefined
      },
      { status: error.status || 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';

    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    const body = await request.json();
    const { ticketId, status, orderId } = body;

    await pb.collection('kdsTicket').update(ticketId, { status });

    // If marking as ready, also update order status
    if (status === 'ready' && orderId) {
      await pb.collection('orders').update(orderId, { status: 'ready' });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating ticket:', {
      message: error.message,
      status: error.status,
      response: error.response?.data || error.response,
      stack: error.stack,
      pbUrl: process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL,
      hasEmail: !!process.env.PB_ADMIN_EMAIL,
      hasPassword: !!process.env.PB_ADMIN_PASSWORD,
    });
    
    return NextResponse.json(
      { 
        error: process.env.NODE_ENV === 'development'
          ? error.message || 'Failed to update ticket'
          : 'Failed to update ticket',
        details: process.env.NODE_ENV === 'development'
          ? { message: error.message, status: error.status }
          : undefined
      },
      { status: error.status || 500 }
    );
  }
}

