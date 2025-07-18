import { useAuth0 as useAuth0React } from '@auth0/auth0-react';
import { useCallback } from 'react';

// MARK: - Auth0 Hook
/**
 * Custom Auth0 hook with Universal Login
 * Provides authentication state and methods
 */
export function useAuth0() {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0React();

  // MARK: - Authentication Methods
  
  /**
   * Login with Auth0 Universal Login
   */
  const login = useCallback(async (options?: { 
    screen_hint?: 'signup' | 'login';
    prompt?: 'none' | 'login' | 'consent' | 'select_account';
  }) => {
    try {
      await loginWithRedirect({
        authorizationParams: {
          screen_hint: options?.screen_hint,
          prompt: options?.prompt,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
    }
  }, [loginWithRedirect]);

  /**
   * Signup with Auth0 Universal Login  
   */
  const signup = useCallback(async () => {
    try {
      await loginWithRedirect({
        authorizationParams: {
          screen_hint: 'signup',
        },
      });
    } catch (error) {
      console.error('Signup error:', error);
    }
  }, [loginWithRedirect]);

  /**
   * Logout and redirect to homepage
   */
  const logout = useCallback(async () => {
    try {
      await auth0Logout({
        logoutParams: {
          returnTo: window.location.origin,
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [auth0Logout]);

  /**
   * Get access token for API calls
   */
  const getAccessToken = useCallback(async () => {
    try {
      if (!isAuthenticated) return null;
      return await getAccessTokenSilently();
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  // MARK: - Return State and Methods
  return {
    // Auth state
    user,
    isAuthenticated,
    isLoading,
    error,
    
    // Auth methods
    login,
    signup,
    logout,
    getAccessToken,
    
    // Utility methods
    loginWithRedirect,
  };
}

// MARK: - Auth0 Route Guards
/**
 * Hook for protecting routes that require authentication
 * Redirects to login page if user is not authenticated
 */
export function useAuthGuard(redirectTo?: string) {
  const { isAuthenticated, isLoading, login } = useAuth0();

  // Redirect to login if not authenticated
  if (!isLoading && !isAuthenticated) {
    // Store redirect URL for use after authentication
    if (redirectTo && typeof window !== 'undefined') {
      localStorage.setItem('auth_return_to', redirectTo);
    }
    // Call login with Auth0 options format
    login();
  }

  return {
    isAuthenticated,
    isLoading,
  };
}

// MARK: - Auth0 User Profile
/**
 * Hook for managing user profile information
 */
export function useUserProfile() {
  const { user, isAuthenticated, isLoading } = useAuth0();

  return {
    profile: user,
    isAuthenticated,
    isLoading,
    hasProfile: Boolean(user),
  };
} 