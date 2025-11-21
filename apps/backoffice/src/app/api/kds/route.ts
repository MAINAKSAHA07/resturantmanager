import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
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

    // Filter by tenant and status (exclude bumped tickets)
    const filteredTickets = allTickets.items.filter((ticket: any) => {
      const ticketTenantId = Array.isArray(ticket.tenantId) ? ticket.tenantId[0] : ticket.tenantId;
      const matchesTenant = ticketTenantId === tenantId;
      const matchesStatus = filterStatus === 'all' ? ticket.status !== 'bumped' : ticket.status === filterStatus;
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
          const allOrderItems = await pb.collection('orderItem').getList(1, 1000);
          
          // Filter by orderId client-side
          orderItems = allOrderItems.items.filter((item: any) => {
            const itemOrderId = Array.isArray(item.orderId) ? item.orderId[0] : item.orderId;
            return itemOrderId === orderId;
          });

          console.log(`Ticket ${ticket.id.slice(0, 8)}: Found ${orderItems.length} order items for order ${orderId.slice(0, 8)}`);
        } catch (e: any) {
          console.error(`Error fetching items for ticket ${ticket.id}:`, {
            message: e.message,
            status: e.status,
          });
        }

        // Use actual order items if available, otherwise fall back to ticketItems
        const items = orderItems.length > 0 
          ? orderItems.map((item: any) => ({
              menuItemId: item.menuItemId,
              name: item.nameSnapshot,
              qty: item.qty,
              options: item.optionsSnapshot || [],
              unitPrice: item.unitPrice,
            }))
          : (ticket.ticketItems || []);

        return {
          ...ticket,
          items: items,
          ticketItems: items, // Keep both for compatibility
        };
      })
    );

    return NextResponse.json({ tickets: ticketsWithItems });
  } catch (error: any) {
    console.error('Error fetching KDS tickets:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch KDS tickets' },
      { status: 500 }
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
    console.error('Error updating ticket:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update ticket' },
      { status: 500 }
    );
  }
}

