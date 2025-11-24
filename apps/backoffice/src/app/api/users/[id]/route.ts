import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { getCurrentUser } from '@/lib/server-utils';
import { canPerformAction, hasPermission } from '@/lib/permissions';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Verify authentication
        const user = await getCurrentUser(request);
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized: Please log in to view users' },
                { status: 401 }
            );
        }

        // Verify permissions
        if (!canPerformAction(user, 'GET', '/api/users')) {
            return NextResponse.json(
                { error: 'Forbidden: You do not have permission to view users' },
                { status: 403 }
            );
        }

        const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
        const adminEmail = process.env.PB_ADMIN_EMAIL;
        const adminPassword = process.env.PB_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD must be set' }, { status: 500 });
    }

    const pb = new PocketBase(pbUrl);
        await pb.admins.authWithPassword(adminEmail, adminPassword);

        const userData = await pb.collection('users').getOne(params.id, {
            expand: 'tenants',
        });

        return NextResponse.json({ user: userData });
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
        // Verify authentication
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json(
                { error: 'Unauthorized: Please log in to edit users' },
                { status: 401 }
            );
        }

        // Verify permissions
        if (!canPerformAction(currentUser, 'PATCH', '/api/users')) {
            return NextResponse.json(
                { error: 'Forbidden: You do not have permission to edit users' },
                { status: 403 }
            );
        }

        const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
        const adminEmail = process.env.PB_ADMIN_EMAIL;
        const adminPassword = process.env.PB_ADMIN_PASSWORD;

        const pb = new PocketBase(pbUrl);
        await pb.admins.authWithPassword(adminEmail, adminPassword);

        const body = await request.json();

        // Get target user data to check current values
        const targetUserData = await pb.collection('users').getOne(params.id);
        
        // Check if email is being changed and if it's already in use
        if (body.email && body.email !== targetUserData.email) {
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
                console.error('Error checking for existing user:', checkError);
            }
        }

        // Only master users can edit master status
        const isEditingMaster = body.isMaster === true;
        const wasMaster = targetUserData.isMaster === true;
        const isChangingMasterStatus = (wasMaster !== isEditingMaster);

        if (isChangingMasterStatus && !hasPermission(currentUser, 'users.edit.master')) {
            return NextResponse.json(
                { error: 'Forbidden: Only master users can change master user status' },
                { status: 403 }
            );
        }

        const updateData: any = {
            name: body.name,
            role: body.role,
            isMaster: isEditingMaster && hasPermission(currentUser, 'users.edit.master') ? true : (wasMaster ? true : false), // Only allow change if current user has permission
        };
        
        // Only update email if it's provided and different
        if (body.email && body.email !== targetUserData.email) {
            updateData.email = body.email;
        }

        // Add tenants if provided
        // Master users don't need tenant assignment
        if (body.tenants !== undefined && !updateData.isMaster) {
            updateData.tenants = Array.isArray(body.tenants) ? body.tenants : [];
        } else if (updateData.isMaster) {
            updateData.tenants = [];
        }

        const updatedUser = await pb.collection('users').update(params.id, updateData);

        return NextResponse.json({ user: updatedUser });
    } catch (error: any) {
        // Check if error is due to duplicate email
        if (error.response?.data?.data?.email) {
            return NextResponse.json(
                { error: 'A user with this email already exists' },
                { status: 400 }
            );
        }
        
        return NextResponse.json(
            { error: error.message || 'Failed to update user' },
            { status: 500 }
        );
    }
}
