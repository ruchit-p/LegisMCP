import { handleAuth, handleLogin } from '@auth0/nextjs-auth0';

// MARK: - Auth0 Authentication Routes
/**
 * Dynamic API route handler for Auth0 authentication
 * 
 * This route handles all Auth0 authentication flows:
 * - GET /api/auth/login - Redirects to Auth0 login with dashboard as return URL
 * - GET /api/auth/logout - Handles logout  
 * - GET /api/auth/callback - Handles Auth0 callback and redirects based on returnTo
 * - GET /api/auth/me - Returns current user info
 * - GET /api/auth/signup - Redirects to Auth0 signup page
 */
export const GET = handleAuth({
  login: handleLogin((req) => {
    // Get the base URL - use environment variable for production
    const baseURL = process.env.AUTH0_BASE_URL || 'http://localhost:3000';
    const url = new URL(req.url, baseURL);
    const screenHint = url.searchParams.get('screen_hint');
    const connection = url.searchParams.get('connection');
    const returnTo = url.searchParams.get('returnTo') || '/dashboard';
    
    return {
      authorizationParams: {
        audience: process.env.AUTH0_AUDIENCE,
        scope: 'openid profile email offline_access',
        ...(screenHint && { screen_hint: screenHint }),
        ...(connection && { connection: connection })
      },
      returnTo: returnTo
    };
  }),
  signup: handleLogin((req) => {
    const baseURL = process.env.AUTH0_BASE_URL || 'http://localhost:3000';
    const url = new URL(req.url, baseURL);
    const returnTo = url.searchParams.get('returnTo') || '/dashboard';
    const connection = url.searchParams.get('connection') || 'Username-Password-Authentication';
    
    return {
      authorizationParams: {
        audience: process.env.AUTH0_AUDIENCE,
        scope: 'openid profile email offline_access',
        screen_hint: 'signup',
        connection: connection
      },
      returnTo: returnTo
    };
  })
}); 