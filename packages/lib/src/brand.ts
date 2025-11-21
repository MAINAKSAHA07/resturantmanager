/**
 * Brand key extraction from hostname
 */

const BRAND_CACHE = new Map<string, string>();

export function extractBrandKey(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0];
  
  // Extract subdomain (e.g., "saffron" from "saffron.example.com")
  const parts = host.split('.');
  if (parts.length >= 3) {
    const subdomain = parts[0];
    // Remove "-admin" suffix if present
    return subdomain.replace(/-admin$/, '');
  }
  
  // For localhost, check for custom header or default
  if (host === 'localhost' || host === '127.0.0.1') {
    return process.env.DEFAULT_BRAND_KEY || null;
  }
  
  return null;
}

export function getBrandKeyFromRequest(headers: Headers | Record<string, string>): string | null {
  const host = headers instanceof Headers 
    ? headers.get('host') || headers.get('x-forwarded-host')
    : headers['host'] || headers['x-forwarded-host'];
  
  if (!host) return null;
  
  return extractBrandKey(host);
}

export function cacheBrandKey(key: string, tenantId: string): void {
  BRAND_CACHE.set(key, tenantId);
}

export function getCachedTenantId(key: string): string | undefined {
  return BRAND_CACHE.get(key);
}



