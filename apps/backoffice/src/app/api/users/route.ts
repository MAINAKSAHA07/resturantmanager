import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { getCurrentUser } from '@/lib/server-utils';
import { canPerformAction, hasPermission } from '@/lib/permissions';

export async function GET(request: NextRequest) {
    try {
        // Verify authentication first
        const user = await getCurrentUser(request);
        if (!user) {
            console.log('Users API: No user found (unauthorized)');
            return NextResponse.json(
                { error: 'Unauthorized: Please log in to view users' },
                { status: 401 }
            );
        }

        console.log('Users API: User authenticated', {
            id: user.id,
            email: user.email,
            role: user.role,
            isMaster: user.isMaster,
            isMasterUser: user.isMaster === true || user.role === 'admin'
        });

        // Then verify permissions
        const canPerform = canPerformAction(user, 'GET', '/api/users');
        console.log('Users API: Permission check', { canPerform, method: 'GET', path: '/api/users' });
        
        if (!canPerform) {
            return NextResponse.json(
                { error: 'Forbidden: You do not have permission to view users' },
                { status: 403 }
            );
        }

        const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
        const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
        const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';

        const pb = new PocketBase(pbUrl);
        await pb.admins.authWithPassword(adminEmail, adminPassword);

        const users = await pb.collection('users').getFullList({
            sort: '-created',
            expand: 'tenants',
        });

        console.log(`Users API: Fetched ${users.length} users`);

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
        // Verify authentication first
        const user = await getCurrentUser(request);
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized: Please log in to create users' },
                { status: 401 }
            );
        }

        // Then verify permissions
        if (!canPerformAction(user, 'POST', '/api/users')) {
            return NextResponse.json(
                { error: 'Forbidden: You do not have permission to create users' },
                { status: 403 }
            );
        }

        const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
        const adminEmail = process.env.PB_ADMIN_EMAIL || 'mainaksaha0807@gmail.com';
        const adminPassword = process.env.PB_ADMIN_PASSWORD || '8104760831';

        const pb = new PocketBase(pbUrl);
        await pb.admins.authWithPassword(adminEmail, adminPassword);

        const body = await request.json();

        // Check if user with this email already exists
        try {
            const existingUsers = await pb.collection('users').getList(1, 1, {
                filter: `email = "${body.email}"`,
            });

            if (existingUsers.items.length > 0) {
                return NextResponse.json(
                    { error: 'A user with this email already exists' },
                    { status: 400 }
                );
            }
        } catch (checkError: any) {
            // If filter fails, try to catch the error but continue
            console.error('Error checking for existing user:', checkError);
        }

        // Only master users can create master users
        const isCreatingMaster = body.isMaster === true;
        
        if (isCreatingMaster && !hasPermission(user, 'users.create.master')) {
            return NextResponse.json(
                { error: 'Forbidden: Only master users can create master users' },
                { status: 403 }
            );
        }

        const userData: any = {
            email: body.email,
            emailVisibility: true,
            password: body.password,
            passwordConfirm: body.passwordConfirm,
            name: body.name,
            role: body.role,
            isMaster: isCreatingMaster && hasPermission(user, 'users.create.master') ? true : false,
        };

        // Add tenants if provided (can be empty array)
        // Master users don't need tenant assignment
        if (body.tenants !== undefined && !userData.isMaster) {
            userData.tenants = Array.isArray(body.tenants) ? body.tenants : [];
        } else if (userData.isMaster) {
            userData.tenants = [];
        }

        const newUser = await pb.collection('users').create(userData);

        return NextResponse.json({ user: newUser });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to create user' },
            { status: 500 }
        );
    }
}
