import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
        const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
        const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';

        const pb = new PocketBase(pbUrl);
        await pb.admins.authWithPassword(adminEmail, adminPassword);

        const user = await pb.collection('users').getOne(params.id, {
            expand: 'tenants',
        });

        return NextResponse.json({ user });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch user' },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
        const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
        const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';

        const pb = new PocketBase(pbUrl);
        await pb.admins.authWithPassword(adminEmail, adminPassword);

        const body = await request.json();

        const updateData: any = {
            name: body.name,
            role: body.role,
            isMaster: body.isMaster === true,
        };

        // Add tenants if provided
        // Master users don't need tenant assignment
        if (body.tenants !== undefined && !updateData.isMaster) {
            updateData.tenants = Array.isArray(body.tenants) ? body.tenants : [];
        } else if (updateData.isMaster) {
            updateData.tenants = [];
        }

        const user = await pb.collection('users').update(params.id, updateData);

        return NextResponse.json({ user });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to update user' },
            { status: 500 }
        );
    }
}
