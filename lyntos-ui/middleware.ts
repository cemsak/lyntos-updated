/**
 * LYNTOS Next.js Middleware
 * Route koruması — token yoksa login'e yönlendir
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('lyntos_token')?.value;
  const { pathname } = request.nextUrl;

  // Login sayfası — token varsa dashboard'a yönlendir
  if (pathname === '/v2/login') {
    if (token) {
      return NextResponse.redirect(new URL('/v2/dashboard-v3', request.url));
    }
    return NextResponse.next();
  }

  // Diğer v2 sayfaları — token yoksa login'e yönlendir
  if (!token) {
    return NextResponse.redirect(new URL('/v2/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/v2/:path*'],
};
