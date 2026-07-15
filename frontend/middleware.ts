import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_ROUTES = ['/login', '/otp-login', '/forgot-password', '/reset-password'];
const APP_PREFIXES = ['/app', '/portal', '/staff'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('dd_access_token')?.value;

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isProtectedRoute = APP_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/app/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/otp-login', '/forgot-password', '/reset-password', '/app/:path*', '/portal/:path*', '/staff/:path*'],
};
