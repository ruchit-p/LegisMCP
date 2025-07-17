import { NextRequest, NextResponse } from 'next/server';

// MARK: - Route Protection Configuration
/**
 * Next.js middleware for protecting authenticated routes
 * 
 * This middleware checks for Auth0 session cookies and redirects
 * unauthenticated users to the login page for protected routes.
 */
export function middleware(request: NextRequest) {
  // Check if user has Auth0 session cookie
  const hasAuth0Session = request.cookies.has('appSession');
  
  // If no session and trying to access protected route, redirect to login
  if (!hasAuth0Session) {
    const loginUrl = new URL('/api/auth/login', request.url);
    loginUrl.searchParams.set('returnTo', request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
}

// MARK: - Middleware Configuration
/**
 * Configure which routes should be protected by authentication
 */
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/keys/:path*',
    '/api/usage/:path*',
    // Add other protected routes here
  ]
}; 