import { initAuth0 } from '@auth0/nextjs-auth0';

/**
 * Initialize Auth0 with explicit configuration
 * This ensures proper cookie and session handling
 */
export const auth0Instance = initAuth0({
  baseURL: process.env.AUTH0_BASE_URL || 'http://localhost:3000',
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  secret: process.env.AUTH0_SECRET,
  clientID: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  clockTolerance: 60,
  httpTimeout: 5000,
  authorizationParams: {
    scope: 'openid profile email',
    audience: process.env.AUTH0_AUDIENCE,
  },
  session: {
    name: 'appSession',
    rolling: true,
    rollingDuration: 60 * 60 * 24 * 7, // 7 days
    absoluteDuration: 60 * 60 * 24 * 30, // 30 days
    cookie: {
      domain: undefined, // Use default domain
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    }
  },
  routes: {
    callback: '/api/auth/callback',
    postLogoutRedirect: '/',
    login: '/api/auth/login',
  },
});

export const {
  handleAuth,
  handleLogin,
  handleLogout,
  handleCallback,
  handleProfile,
  getSession,
  getAccessToken,
  withApiAuthRequired,
  withPageAuthRequired
} = auth0Instance;