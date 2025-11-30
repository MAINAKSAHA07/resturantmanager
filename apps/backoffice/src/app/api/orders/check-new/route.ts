import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminPb } from '@/lib/server-utils';

export async function GET(request: NextRequest) {
    try {
        const pb = await getAdminPb();

        // Get selected tenant from cookies
        const cookieStore = cookies();
        const tenantId = cookieStore.get('selected_tenant_id')?.value;

        if (!tenantId) {
            return NextResponse.json(
                { error: 'No tenant selected' },
                { status: 400 }
            );
        }

        // Fetch orders and filter client-side (PocketBase relation filters don't work reliably)
        const allOrders = await pb.collection('orders').getList(1, 100, {
            sort: '-created',
            fields: 'id,created,status,total,tenantId',
        });

        // Filter by tenant client-side (handle relation fields which may be arrays)
        const filteredOrders = allOrders.items.filter((order: any) => {
            const orderTenantId = Array.isArray(order.tenantId) ? order.tenantId[0] : order.tenantId;
            return orderTenantId === tenantId;
        });

        if (filteredOrders.length === 0) {
            return NextResponse.json({ latestOrder: null });
        }

        const latestOrder = filteredOrders[0];

        return NextResponse.json({
            latestOrder: {
                id: latestOrder.id,
                created: latestOrder.created,
                status: latestOrder.status,
                total: latestOrder.total,
            },
        });
    } catch (error: any) {
        console.error('Error checking for new orders:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to check orders' },
            { status: 500 }
        );
    }
}
