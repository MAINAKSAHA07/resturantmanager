import { NextRequest, NextResponse } from 'next/server';
import { createPocketBaseAdminClient } from '@restaurant/lib';

export async function GET(request: NextRequest) {
  try {
    const pb = await createPocketBaseAdminClient();
    
    const tickets = await pb.collection('kdsTicket').getList(1, 100, {
      filter: 'status != "bumped"',
      sort: '-created',
      expand: 'orderId',
    });

    return NextResponse.json({ tickets: tickets.items });
  } catch (error: any) {
    console.error('Error fetching KDS tickets:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const pb = await createPocketBaseAdminClient();
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

