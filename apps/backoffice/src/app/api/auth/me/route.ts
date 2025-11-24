import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
    try {
        const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
        const pb = new PocketBase(pbUrl);

        // Get token from cookie
        const cookieStore = cookies();
        const token = cookieStore.get('pb_auth_token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Load the token
        pb.authStore.save(token, null);

        // Set up admin client for fallback
        const adminPb = new PocketBase(pbUrl);
        const adminEmail = process.env.PB_ADMIN_EMAIL;
        const adminPassword = process.env.PB_ADMIN_PASSWORD;
        
        let user = null;
        let isAdminToken = false;

        // First, check if this is an admin token by trying to refresh it as admin
        try {
            const adminAuthData = await pb.admins.authRefresh();
            // This is an admin token - create a virtual master user
            isAdminToken = true;
            const admin = adminAuthData.admin;
            
            // Create a virtual user object for admin
            user = {
                id: admin?.id || 'admin',
                email: admin?.email || adminEmail,
                name: 'Administrator',
                role: 'admin' as const,
                isMaster: true,
                tenants: [],
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
            };
        } catch (adminRefreshError: any) {
            // Not an admin token, try user token
            try {
                const authData = await pb.collection('users').authRefresh();
                user = authData.record;
            } catch (refreshError: any) {
                // If refresh fails, try to get user from token payload using admin client
                console.warn('Auth refresh failed, trying to get user from token:', refreshError.message);
                
                try {
                    await adminPb.admins.authWithPassword(adminEmail, adminPassword);
                    
                    // Try to parse token to get user ID
                    try {
                        const tokenParts = token.split('.');
                        if (tokenParts.length >= 2) {
                            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
                            const userId = payload.id || payload.userId || payload.record?.id || payload.recordId;
                            
                            if (userId) {
                                try {
                                    // Get user using admin client
                                    user = await adminPb.collection('users').getOne(userId, {
                                        expand: 'tenants',
                                    });
                                } catch (getUserError: any) {
                                    // User doesn't exist (404) - token is invalid
                                    if (getUserError.status === 404) {
                                        console.error('User from token does not exist:', userId);
                                        return NextResponse.json({ error: 'User not found. Please log in again.' }, { status: 401 });
                                    }
                                    throw getUserError;
                                }
                            } else {
                                throw new Error('User ID not found in token');
                            }
                        } else {
                            throw new Error('Invalid token format');
                        }
                    } catch (parseError: any) {
                        console.error('Failed to parse token or get user:', parseError);
                        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
                    }
                } catch (adminError: any) {
                    console.error('Failed to authenticate as admin:', adminError);
                    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
                }
            }
        }

        // If we have a user, get full data with expanded tenants
        if (user) {
            // If this is an admin token, return the virtual user with all tenants
            if (isAdminToken) {
                try {
                    // Get all tenants for admin user
                    await adminPb.admins.authWithPassword(adminEmail, adminPassword);
                    const tenants = await adminPb.collection('tenant').getList(1, 100, {
                        sort: 'name',
                    });
                    
                    return NextResponse.json({ 
                        user: {
                            ...user,
                            expand: {
                                tenants: tenants.items.map(t => ({ id: t.id, name: t.name }))
                            }
                        }
                    });
                } catch (error) {
                    // If we can't get tenants, return user without them
                    return NextResponse.json({ user });
                }
            }
            
            // For regular users, get full data with expanded tenants
            try {
                // Make sure admin client is authenticated
                if (!adminPb.authStore.isValid) {
                    await adminPb.admins.authWithPassword(adminEmail, adminPassword);
                }
                
                // Get user with expanded tenants
                try {
                    const fullUser = await adminPb.collection('users').getOne(user.id, {
                        expand: 'tenants',
                    });
                    
                    // Ensure isMaster and role are properly set
                    const userResponse: any = {
                        ...fullUser,
                        isMaster: fullUser.isMaster === true,
                        role: fullUser.role || 'staff',
                    };
                    
                    console.log('Auth me: Returning user', {
                        id: userResponse.id,
                        email: (userResponse as any).email || 'N/A',
                        role: userResponse.role,
                        isMaster: userResponse.isMaster,
                        isMasterUser: userResponse.isMaster === true || userResponse.role === 'admin'
                    });
                    
                    return NextResponse.json({ user: userResponse });
                } catch (getUserError: any) {
                    // If user doesn't exist (404), return 401
                    if (getUserError.status === 404) {
                        console.error('User does not exist:', user.id);
                        return NextResponse.json({ error: 'User not found. Please log in again.' }, { status: 401 });
                    }
                    // For other errors, return user without expanded data
                    console.warn('Could not fetch expanded user data:', getUserError);
                    return NextResponse.json({ user });
                }
            } catch (adminError) {
                // If admin auth fails, return user without expanded data
                console.warn('Could not authenticate as admin:', adminError);
                return NextResponse.json({ user });
            }
        }

        return NextResponse.json({ error: 'User not found' }, { status: 401 });

    } catch (error: any) {
        console.error('Error fetching user:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch user' },
            { status: 500 }
        );
    }
}
