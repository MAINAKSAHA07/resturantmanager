import PocketBase from 'pocketbase';

function getPocketBaseUrl(): string {
  // Read dynamically each time to ensure Next.js env vars are available
  // Priority: AWS_POCKETBASE_URL (for production/AWS) > POCKETBASE_URL (for local/other) > localhost default
  return process.env.AWS_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://localhost:8090';
}

export function createPocketBaseClient(token?: string): PocketBase {
  const pb = new PocketBase(getPocketBaseUrl());
  if (token) {
    pb.authStore.save(token, null);
  }
  return pb;
}

export function getPocketBaseClient(): PocketBase {
  return createPocketBaseClient();
}

/**
 * Create an authenticated PocketBase admin client for server-side operations
 * Use this in Next.js server components/API routes that need admin access
 */
export async function createPocketBaseAdminClient(): Promise<PocketBase> {
  // Read dynamically each time to ensure Next.js env vars are available
  const pbUrl = getPocketBaseUrl();
  const pb = new PocketBase(pbUrl);

  // Use environment variables with fallback to known working credentials
  // Read dynamically to ensure Next.js env vars are loaded
  const adminEmail = process.env.PB_ADMIN_EMAIL;
  const adminPassword = process.env.PB_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      'PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD environment variables are required for admin access.'
    );
  }

  try {
    await pb.admins.authWithPassword(adminEmail, adminPassword);
  } catch (error: any) {
    const status = error?.response?.status || error?.status;
    const errorData = error?.response?.data || error?.response;

    console.error('Failed to authenticate as admin:', {
      email: adminEmail,
      url: pbUrl,
      status: status,
      error: error?.message || error,
      response: errorData,
      envEmail: process.env.PB_ADMIN_EMAIL ? 'set' : 'not set',
      envPassword: process.env.PB_ADMIN_PASSWORD ? 'set' : 'not set',
      pbUrlEnv: process.env.POCKETBASE_URL ? 'set' : 'not set',
    });

    // Provide more helpful error message based on status code
    if (status === 400 || status === 401) {
      throw new Error(
        `Admin authentication failed: Invalid credentials.\n\n` +
        `Attempted email: ${adminEmail}\n` +
        `Please:\n` +
        `1. Verify your admin account exists at ${pbUrl}/_/\n` +
        `2. Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD in your .env.local file\n` +
        `3. Make sure the credentials match your PocketBase admin account\n` +
        `4. Restart your Next.js dev server after updating .env.local`
      );
    }

    if (status === 404) {
      // 404 could mean server not found OR admin endpoint/auth issue
      // Check if it's actually a server connectivity issue
      const errorMessage = error?.message || '';
      if (errorMessage.includes('fetch') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('network')) {
        throw new Error(
          `PocketBase server not found at ${pbUrl}.\n\n` +
          `Please ensure PocketBase is running:\n` +
          `- Check Docker: docker ps | grep pocketbase\n` +
          `- Or start with: docker-compose up -d pocketbase`
        );
      } else {
        // Likely an admin authentication issue (admin account doesn't exist)
        throw new Error(
          `Admin account not found.\n\n` +
          `Please:\n` +
          `1. Go to ${pbUrl}/_/ and create/login to your admin account\n` +
          `2. Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD in your .env.local file\n` +
          `3. Make sure the credentials match your PocketBase admin account\n` +
          `4. Restart your Next.js dev server after updating .env.local`
        );
      }
    }

    if (status === 403) {
      throw new Error(
        `Access denied. The account exists but may not have admin privileges.`
      );
    }

    throw new Error(
      `Admin authentication failed: ${error?.message || 'Unknown error'}\n\n` +
      `Check that:\n` +
      `- PocketBase is running at ${pbUrl}\n` +
      `- Admin account exists and credentials are correct\n` +
      `- Environment variables are set in .env.local file\n` +
      `- Next.js dev server has been restarted after updating .env.local`
    );
  }

  return pb;
}



