import { NextRequest } from 'next/server';
import PocketBase from 'pocketbase';
import { User } from './user-utils';

/**
 * Get the current user from the request
 * This verifies the token and fetches the user record
 */
export async function getCurrentUser(request: NextRequest): Promise<User | null> {
    try {
        // Get token from cookie or header
        const token = request.cookies.get('pb_auth_token')?.value ||
            request.headers.get('authorization')?.replace('Bearer ', '');

        if (!token) {
            console.log('getCurrentUser: No token found');
            return null;
        }

        // Create PocketBase client
        const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
        const pb = new PocketBase(pbUrl);

        // Load token into auth store
        pb.authStore.save(token, null);

        // Set up admin client for fallback
        const adminPb = new PocketBase(pbUrl);
        const adminEmail = process.env.PB_ADMIN_EMAIL;
        const adminPassword = process.env.PB_ADMIN_PASSWORD;

        // First, check if this is an admin token
        try {
            const adminAuthData = await pb.admins.authRefresh();
            // This is an admin token - create a virtual master user
            const admin = adminAuthData.admin;
            
            console.log('getCurrentUser: Admin token detected', {
                adminId: admin?.id,
                adminEmail: admin?.email
            });
            
            // Return a virtual master user for admin
            return {
                id: admin?.id || 'admin',
                email: admin?.email || adminEmail,
                name: 'Administrator',
                role: 'admin' as const,
                isMaster: true,
                tenants: [],
            };
        } catch (adminRefreshError: any) {
            // Not an admin token, try user token
            console.log('getCurrentUser: Not an admin token, trying user token');
            
            try {
        const authData = await pb.collection('users').authRefresh();
                if (authData.record) {
                    const user = authData.record;
                    const userObj = {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: (user.role || 'staff') as 'admin' | 'manager' | 'staff',
                        isMaster: user.isMaster === true,
                        tenants: user.tenants || [],
                        expand: user.expand,
                    };
                    
                    console.log('getCurrentUser: User token refreshed', {
                        id: userObj.id,
                        email: userObj.email,
                        role: userObj.role,
                        isMaster: userObj.isMaster,
                        isMasterUser: userObj.isMaster === true || userObj.role === 'admin'
                    });
                    
                    return userObj;
                }
            } catch (refreshError: any) {
                // If refresh fails, try to get user from token payload using admin client
                console.log('getCurrentUser: authRefresh failed, trying direct fetch', refreshError.message);
                
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
                                    const user = await adminPb.collection('users').getOne(userId, {
                                        expand: 'tenants',
                                    });
                                    
                                    const userObj = {
            id: user.id,
            email: user.email,
            name: user.name,
                                        role: (user.role || 'staff') as 'admin' | 'manager' | 'staff',
            isMaster: user.isMaster === true,
            tenants: user.tenants || [],
            expand: user.expand,
        };
                                    
                                    console.log('getCurrentUser: Fetched user by ID from token', {
                                        id: userObj.id,
                                        email: userObj.email,
                                        role: userObj.role,
                                        isMaster: userObj.isMaster,
                                        isMasterUser: userObj.isMaster === true || userObj.role === 'admin'
                                    });
                                    
                                    return userObj;
                                } catch (getUserError: any) {
                                    // User doesn't exist (404) - token is invalid
                                    if (getUserError.status === 404) {
                                        console.error('getCurrentUser: User from token does not exist:', userId);
                                        return null;
                                    }
                                    throw getUserError;
                                }
                            } else {
                                console.error('getCurrentUser: User ID not found in token payload');
                                return null;
                            }
                        } else {
                            console.error('getCurrentUser: Invalid token format');
                            return null;
                        }
                    } catch (parseError: any) {
                        console.error('getCurrentUser: Failed to parse token or get user:', parseError.message);
                        return null;
                    }
                } catch (adminError: any) {
                    console.error('getCurrentUser: Failed to authenticate as admin:', adminError.message);
                    return null;
                }
            }
        }

        return null;
    } catch (error: any) {
        // Token invalid or expired
        console.error('getCurrentUser: Error validating token', error.message);
        return null;
    }
}
