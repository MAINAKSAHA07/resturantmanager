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
    // If already logged in and trying to access login, redirect to tenant selection or dashboard
    if (request.nextUrl.pathname === '/login' && token) {
      if (selectedTenant) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      return NextResponse.redirect(new URL('/select-tenant', request.url));
    }
    return NextResponse.next();
  }

  // Check if user is authenticated
  if (!token) {
    // Redirect to login if no token
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Check if tenant is selected (except for select-tenant page)
  if (!selectedTenant && request.nextUrl.pathname !== '/select-tenant') {
    return NextResponse.redirect(new URL('/select-tenant', request.url));
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

