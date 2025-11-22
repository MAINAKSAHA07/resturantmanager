import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

export async function GET(request: NextRequest) {
    try {
        const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
        const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
        const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';

        const pb = new PocketBase(pbUrl);
        await pb.admins.authWithPassword(adminEmail, adminPassword);

        const users = await pb.collection('users').getFullList({
            sort: '-created',
            expand: 'tenants',
        });

        return NextResponse.json({ users });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch users' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
        const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
        const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';

        const pb = new PocketBase(pbUrl);
        await pb.admins.authWithPassword(adminEmail, adminPassword);

        const body = await request.json();

        const userData: any = {
            email: body.email,
            emailVisibility: true,
            password: body.password,
            passwordConfirm: body.passwordConfirm,
            name: body.name,
            role: body.role,
            isMaster: body.isMaster === true,
        };

        // Add tenants if provided (can be empty array)
        // Master users don't need tenant assignment
        if (body.tenants !== undefined && !userData.isMaster) {
            userData.tenants = Array.isArray(body.tenants) ? body.tenants : [];
        } else if (userData.isMaster) {
            userData.tenants = [];
        }

        const user = await pb.collection('users').create(userData);

        return NextResponse.json({ user });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to create user' },
            { status: 500 }
        );
    }
}
