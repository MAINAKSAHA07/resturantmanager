import { NextRequest, NextResponse } from 'next/server';
import { createPocketBaseAdminClient } from '@restaurant/lib';

export async function GET(request: NextRequest) {
  try {
    const pb = await createPocketBaseAdminClient();
    
    const reservations = await pb.collection('reservation').getList(1, 100, {
      sort: '-created',
    });

    return NextResponse.json({ reservations: reservations.items });
  } catch (error: any) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reservations' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const pb = await createPocketBaseAdminClient();
    const body = await request.json();
    const { reservationId, status } = body;

    await pb.collection('reservation').update(reservationId, { status });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating reservation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update reservation' },
      { status: 500 }
    );
  }
}

