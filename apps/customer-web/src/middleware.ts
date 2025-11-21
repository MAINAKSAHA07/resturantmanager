import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { extractBrandKey } from '@restaurant/lib';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const brandKey = extractBrandKey(hostname);

  // Add brandKey to headers for use in pages
  const response = NextResponse.next();
  response.headers.set('x-brand-key', brandKey || '');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};



