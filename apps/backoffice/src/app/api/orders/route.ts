import { NextRequest, NextResponse } from 'next/server';
import { createPocketBaseAdminClient } from '@restaurant/lib';

export async function GET(request: NextRequest) {
  try {
    const pb = await createPocketBaseAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const filterStatus = searchParams.get('status') || 'all';
    
    const filter = filterStatus !== 'all' ? `status = "${filterStatus}"` : '';
    const orders = await pb.collection('orders').getList(1, 100, {
      filter,
      sort: '-created',
    });

    return NextResponse.json({ orders: orders.items });
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
    const pb = await createPocketBaseAdminClient();
    const body = await request.json();
    const { orderId, status } = body;

    await pb.collection('orders').update(orderId, { status });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update order' },
      { status: 500 }
    );
  }
}

