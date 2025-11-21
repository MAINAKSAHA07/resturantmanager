import { NextRequest, NextResponse } from 'next/server';
import { createPocketBaseAdminClient } from '@restaurant/lib';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pb = await createPocketBaseAdminClient();
    const reservationId = params.id;

    const reservation = await pb.collection('reservation').getOne(reservationId);

    return NextResponse.json({ reservation });
  } catch (error: any) {
    console.error('Error fetching reservation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reservation' },
      { status: 500 }
    );
  }
}

