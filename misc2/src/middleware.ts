
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const DEV_PASSWORD = 'mHg';
const COOKIE_NAME = 'dev_access_granted';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // This is the key change: only apply logic if the path is /dev
  if (pathname.startsWith('/dev')) {
    const password = searchParams.get('password');
    const hasAccessCookie = request.cookies.has(COOKIE_NAME);

    // If they already have the access cookie, let them through
    if (hasAccessCookie) {
      return NextResponse.next();
    }

    // If they are providing a password in the query
    if (password === DEV_PASSWORD) {
      // Create a response to set the cookie and redirect to the clean URL
      const response = NextResponse.redirect(new URL('/dev', request.url));
      response.cookies.set(COOKIE_NAME, 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/dev',
      });
      return response;
    }
    
    // If no cookie and no (or wrong) password, show the password page
    // by rewriting the URL with a param the page component can check.
    const url = request.nextUrl.clone();
    url.searchParams.set('auth', 'false');
    return NextResponse.rewrite(url);
  }

  // Fallback for any other path (e.g., '/', '/about', etc.)
  return NextResponse.next();
}

// This config ensures the middleware only runs on requests to /dev
export const config = {
  matcher: '/dev/:path*',
}
