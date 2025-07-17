import { getSession } from '@auth0/nextjs-auth0';

// MARK: - Auth0 Configuration
/**
 * Auth0 configuration object
 */
export const auth0Config = {
  domain: process.env.AUTH0_ISSUER_BASE_URL!,
  clientId: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
  baseUrl: process.env.AUTH0_BASE_URL!,
  secret: process.env.AUTH0_SECRET!,
} as const;

// MARK: - Auth0 Utility Functions
/**
 * Get user session from request
 * @param request - Next.js request object
 * @returns User session or null
 */
export async function getUserSession() {
  try {
    const session = await getSession();
    return session;
  } catch (error) {
    console.error('Error getting user session:', error);
    return null;
  }
}

/**
 * Get user ID from session
 * @returns User ID or null
 */
export async function getUserId(): Promise<string | null> {
  try {
    const session = await getUserSession();
    return session?.user?.sub || null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 * @returns True if user is authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const session = await getUserSession();
    return !!session?.user;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

/**
 * Get user profile from session
 * @returns User profile or null
 */
export async function getUserProfile() {
  try {
    const session = await getUserSession();
    if (!session?.user) return null;
    
    return {
      id: session.user.sub,
      email: session.user.email,
      name: session.user.name,
      nickname: session.user.nickname,
      picture: session.user.picture,
      emailVerified: session.user.email_verified,
      updatedAt: session.user.updated_at,
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

// MARK: - Auth0 Error Handling
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
 * @param error - Auth0 error type
 * @param message - Optional error message
 * @returns Error response object
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