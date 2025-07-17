import { createAuth0Client, Auth0Client } from '@auth0/auth0-react';

// MARK: - Auth0 Configuration
export const auth0Config = {
  domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN!,
  clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID!,
  authorizationParams: {
    redirect_uri: typeof window !== 'undefined' ? window.location.origin : 'https://legismcp.com',
    audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
    scope: 'openid profile email offline_access',
  },
  useRefreshTokens: true,
  cacheLocation: 'localstorage' as const,
};

// MARK: - Auth0 Client Instance
let auth0Client: Auth0Client | null = null;

/**
 * Get Auth0 client instance
 */
export const getAuth0Client = async (): Promise<Auth0Client> => {
  if (!auth0Client && typeof window !== 'undefined') {
    auth0Client = await createAuth0Client(auth0Config);
  }
  return auth0Client!;
};

// MARK: - Auth0 Helper Functions

/**
 * Login with redirect to Auth0 Universal Login
 */
export const loginWithRedirect = async (options?: { 
  screen_hint?: 'signup' | 'login';
  prompt?: string;
}) => {
  const client = await getAuth0Client();
  await client.loginWithRedirect({
    authorizationParams: {
      ...auth0Config.authorizationParams,
      screen_hint: options?.screen_hint,
      prompt: options?.prompt,
    },
  });
};

/**
 * Logout and redirect to homepage
 */
export const logout = async () => {
  const client = await getAuth0Client();
  await client.logout({
    logoutParams: {
      returnTo: typeof window !== 'undefined' ? window.location.origin : 'https://legismcp.com',
    },
  });
};

/**
 * Get access token for API calls
 */
export const getAccessToken = async () => {
  try {
    const client = await getAuth0Client();
    return await client.getTokenSilently();
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
};

/**
 * Get user profile
 */
export const getUser = async () => {
  try {
    const client = await getAuth0Client();
    return await client.getUser();
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const client = await getAuth0Client();
    return await client.isAuthenticated();
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

// MARK: - Types
export interface Auth0User {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  nickname: string;
  picture: string;
  updated_at: string;
}

export interface AuthState {
  user: Auth0User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
} 