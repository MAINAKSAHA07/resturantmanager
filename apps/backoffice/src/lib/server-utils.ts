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

        if (!token) return null;

        // Create a temporary client to verify token
        const pbUrl = process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
        const pb = new PocketBase(pbUrl);

        // Load token into auth store
        pb.authStore.save(token, null);

        // Verify token and get user
        // We use authRefresh to ensure the token is still valid and get fresh user data
        const authData = await pb.collection('users').authRefresh();

        if (!authData.record) return null;

        const user = authData.record;

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isMaster: user.isMaster === true,
            tenants: user.tenants || [],
            expand: user.expand,
        };
    } catch (error) {
        // Token invalid or expired
        return null;
    }
}
