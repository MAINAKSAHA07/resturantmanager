import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

export async function GET(request: NextRequest) {
  try {
    // Direct PocketBase connection
    const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
    const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
    const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';
    
    const pb = new PocketBase(pbUrl);
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    const searchParams = request.nextUrl.searchParams;
    const itemIds = searchParams.get('ids')?.split(',') || [];

    if (itemIds.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const items: any[] = [];
    for (const id of itemIds) {
      try {
        const item = await pb.collection('menuItem').getOne(id);
        items.push(item);
      } catch (error) {
        console.error(`Failed to fetch item ${id}:`, error);
      }
    }

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error('Error fetching menu items:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch items' },
      { status: 500 }
    );
  }
}

