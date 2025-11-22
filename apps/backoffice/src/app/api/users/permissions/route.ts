import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { getUserPermissions, canAccessRoute } from '@/lib/permissions';
import { validateUserPermissions } from '@/lib/check-user-permissions';
import { User } from '@/lib/user-utils';

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

        // Check permissions for each user
        const usersWithPermissions = users.map((user: any) => {
            const userObj: User = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                isMaster: user.isMaster === true,
                tenants: user.tenants || [],
            };

            const permissions = getUserPermissions(userObj);
            const validation = validateUserPermissions(userObj);
            
            // Check access to common routes
            const routes = [
                '/dashboard',
                '/menu',
                '/orders',
                '/kds',
                '/reservations',
                '/floorplan',
                '/users',
                '/reports',
            ];
            
            const routeAccess: Record<string, boolean> = {};
            routes.forEach(route => {
                routeAccess[route] = canAccessRoute(userObj, route);
            });

            return {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                isMaster: user.isMaster === true,
                tenants: user.tenants || [],
                tenantNames: user.expand?.tenants?.map((t: any) => t.name) || [],
                permissions: {
                    count: permissions.length,
                    list: permissions,
                },
                routeAccess,
                validation,
            };
        });

        return NextResponse.json({
            success: true,
            totalUsers: usersWithPermissions.length,
            users: usersWithPermissions,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch user permissions' },
            { status: 500 }
        );
    }
}

