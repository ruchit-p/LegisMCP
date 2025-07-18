import { createAuth0Client, Auth0Client } from '@auth0/auth0-spa-js';

// MARK: - Environment Variable Validation
const requiredEnvVars = {
  domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
  clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
  audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
};

// Validate required environment variables
const validateEnvironment = () => {
  const missing = Object.entries(requiredEnvVars)
    .filter(([, value]) => !value)
    .map(([key]) => key);
    
  if (missing.length > 0) {
    console.error('❌ Missing required Auth0 environment variables:', missing);
    console.error('🔧 Required variables:');
    console.error('   - NEXT_PUBLIC_AUTH0_DOMAIN (your Auth0 domain without https://)');
    console.error('   - NEXT_PUBLIC_AUTH0_CLIENT_ID (your Auth0 application client ID)');
    console.error('   - NEXT_PUBLIC_AUTH0_AUDIENCE (your Auth0 API audience identifier)');
    console.error('📁 Create a .env.local file based on environment.template');
    console.error('📖 See docs/AUTH0_SETUP.md for setup instructions');
    return false;
  }
  
  // Additional validation for common mistakes
  const domain = requiredEnvVars.domain;
  if (domain && (domain.startsWith('http://') || domain.startsWith('https://'))) {
    console.warn('⚠️  NEXT_PUBLIC_AUTH0_DOMAIN should not include protocol (http:// or https://)');
    console.warn('   Current value:', domain);
    console.warn('   Should be:', domain.replace(/^https?:\/\//, ''));
  }
  
  console.log('✅ Auth0 environment variables validated successfully');
  return true;
};

// MARK: - Auth0 Configuration
export const auth0Config = validateEnvironment() ? {
  domain: requiredEnvVars.domain!,
  clientId: requiredEnvVars.clientId!,
  authorizationParams: {
    redirect_uri: typeof window !== 'undefined' ? window.location.origin : 'https://legismcp.com',
    audience: requiredEnvVars.audience,
    scope: 'openid profile email offline_access',
  },
  useRefreshTokens: true,
  cacheLocation: 'localstorage' as const,
} : null;

// MARK: - Auth0 Client Instance
let auth0Client: Auth0Client | null = null;

/**
 * Get Auth0 client instance
 */
export const getAuth0Client = async (): Promise<Auth0Client | null> => {
  if (!auth0Config) {
    console.error('❌ Auth0 configuration is invalid. Please check your environment variables.');
    return null;
  }
  
  if (!auth0Client && typeof window !== 'undefined') {
    try {
      auth0Client = await createAuth0Client(auth0Config);
      console.log('✅ Auth0 client created successfully');
    } catch (error) {
      console.error('❌ Failed to create Auth0 client:', error);
      return null;
    }
  }
  
  return auth0Client;
};

/**
 * Login with Auth0 Universal Login
 */
export const loginWithRedirect = async (options?: {
  screen_hint?: 'signup' | 'login';
  prompt?: 'none' | 'login' | 'consent' | 'select_account';
}) => {
  const client = await getAuth0Client();
  if (!client) {
    console.error('Auth0 client not available for loginWithRedirect');
    return;
  }
  await client.loginWithRedirect({
    authorizationParams: {
      ...auth0Config!.authorizationParams,
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
  if (!client) {
    console.error('Auth0 client not available for logout');
    return;
  }
  await client.logout({
    logoutParams: {
      returnTo: window.location.origin,
    },
  });
};

/**
 * Get access token for API calls
 */
export const getAccessToken = async () => {
  try {
    const client = await getAuth0Client();
    if (!client) {
      console.error('Auth0 client not available for getAccessToken');
      return null;
    }
    return await client.getTokenSilently();
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
};

/**
 * Get current user
 */
export const getUser = async () => {
  try {
    const client = await getAuth0Client();
    if (!client) {
      console.error('Auth0 client not available for getUser');
      return null;
    }
    return await client.getUser();
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async () => {
  try {
    const client = await getAuth0Client();
    if (!client) {
      console.error('Auth0 client not available for isAuthenticated');
      return false;
    }
    return await client.isAuthenticated();
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

/**
 * Handle redirect callback after login
 */
export const handleRedirectCallback = async () => {
  try {
    const client = await getAuth0Client();
    if (!client) {
      console.error('Auth0 client not available for handleRedirectCallback');
      return;
    }
    return await client.handleRedirectCallback();
  } catch (error) {
    console.error('Error handling redirect callback:', error);
    throw error;
  }
};

/**
 * Check for code and state parameters in URL
 */
export const hasAuthParams = () => {
  if (typeof window === 'undefined') return false;
  
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.has('code') && searchParams.has('state');
};

/**
 * Get access token silently
 */
export const getTokenSilently = async () => {
  try {
    const client = await getAuth0Client();
    if (!client) {
      console.error('Auth0 client not available for getTokenSilently');
      return null;
    }
    return await client.getTokenSilently();
  } catch (error) {
    console.error('Error getting token silently:', error);
    return null;
  }
};

// MARK: - Backward Compatibility Functions
// These functions are kept for compatibility with existing code

/**
 * Get user profile - backward compatibility
 */
export const getUserProfile = async () => {
  try {
    const user = await getUser();
    if (!user) return null;
    
    return {
      id: user.sub,
      email: user.email,
      name: user.name,
      nickname: user.nickname || user.name,
      picture: user.picture,
      emailVerified: user.email_verified,
      updatedAt: user.updated_at,
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

// MARK: - Auth0 Error Handling (Backward Compatibility)
/**
 * Auth0 error types
 */
export enum Auth0Error {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
}

/**
 * Auth0 error response helper
 */
export function createAuth0ErrorResponse(error: Auth0Error, message?: string) {
  const errorMessages = {
    [Auth0Error.UNAUTHORIZED]: 'Authentication required',
    [Auth0Error.FORBIDDEN]: 'Access denied',
    [Auth0Error.SESSION_EXPIRED]: 'Session expired',
    [Auth0Error.INVALID_TOKEN]: 'Invalid authentication token',
  };
  
  return {
    error: error,
    message: message || errorMessages[error],
    statusCode: error === Auth0Error.UNAUTHORIZED ? 401 : 403,
  };
}

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