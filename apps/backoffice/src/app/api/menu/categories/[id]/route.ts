import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('pb_auth_token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
    const pb = new PocketBase(pbUrl);
    pb.authStore.save(token, null);
    
    // Token is saved, will be validated when making API calls
    const body = await request.json();
    const { name, sort } = body;

    const category = await pb.collection('menuCategory').update(params.id, {
      name,
      sort: sort || 0,
    });

    return NextResponse.json({ category });
  } catch (error: any) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update category' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('pb_auth_token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pbUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';
    const pb = new PocketBase(pbUrl);
    pb.authStore.save(token, null);
    
    // Token is saved, will be validated when making API calls

    // Check if category has items
    const items = await pb.collection('menuItem').getList(1, 1, {
      filter: `categoryId = "${params.id}"`,
    });

    if (items.items.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with existing menu items. Please reassign or delete items first.' },
        { status: 400 }
      );
    }

    await pb.collection('menuCategory').delete(params.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete category' },
      { status: 500 }
    );
  }
}

