/**
 * Utility functions for tenant management
 */

export function getSelectedTenantId(request?: {
  cookies?: {
    get: (name: string) => { value: string } | undefined;
  };
  headers?: {
    get: (name: string) => string | null;
  };
}): string | null {
  if (typeof window !== 'undefined') {
    // Client-side: get from cookie
    const cookies = document.cookie.split(';');
    const tenantCookie = cookies.find(c => c.trim().startsWith('selected_tenant_id='));
    if (tenantCookie) {
      return tenantCookie.split('=')[1];
    }
    return null;
  }

  // Server-side: get from request
  if (request?.cookies) {
    return request.cookies.get('selected_tenant_id')?.value || null;
  }

  return null;
}

