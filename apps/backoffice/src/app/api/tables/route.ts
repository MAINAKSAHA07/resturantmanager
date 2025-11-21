import { NextRequest, NextResponse } from 'next/server';
import { createPocketBaseAdminClient } from '@restaurant/lib';

export async function GET(request: NextRequest) {
  try {
    const pb = await createPocketBaseAdminClient();
    
    const tables = await pb.collection('tables').getList(1, 100);

    return NextResponse.json({ tables: tables.items });
  } catch (error: any) {
    console.error('Error fetching tables:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const pb = await createPocketBaseAdminClient();
    const body = await request.json();
    const { tableId, x, y, status } = body;

    const updateData: any = {};
    if (x !== undefined && y !== undefined) {
      updateData.x = x;
      updateData.y = y;
    }
    if (status !== undefined) {
      updateData.status = status;
    }

    await pb.collection('tables').update(tableId, updateData);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating table:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update table' },
      { status: 500 }
    );
  }
}

