import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('pb_auth_token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '');
  const selectedTenant = request.cookies.get('selected_tenant_id')?.value;

  // Allow access to login page, tenant selection, and auth API routes
  if (request.nextUrl.pathname === '/login' || 
      request.nextUrl.pathname === '/select-tenant' ||
      request.nextUrl.pathname.startsWith('/api/auth/') ||
      request.nextUrl.pathname.startsWith('/api/tenants')) {
    // If already logged in and trying to access login, redirect to dashboard
    if (request.nextUrl.pathname === '/login' && token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Check if user is authenticated
  if (!token) {
    // Redirect to login if no token
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // For master users (admin), allow access without tenant selection
  // They can select tenant from navbar dropdown
  // For non-master users, require tenant selection
  // Note: We can't reliably check if user is master in middleware without API call
  // So we'll allow access and let pages handle tenant requirement
  // Master users will see tenant selector in navbar and can work without pre-selected tenant
  if (!selectedTenant && request.nextUrl.pathname !== '/select-tenant') {
    // Allow access - pages will handle tenant requirement
    // Master users can select from navbar, non-master will be redirected by page logic
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

