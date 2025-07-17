import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

// MARK: - Auth0 React Hooks
/**
 * Custom hook for Auth0 authentication
 * Provides user information and authentication utilities
 */
export function useAuth0() {
  const { user, error, isLoading } = useUser();
  const router = useRouter();

  // MARK: - Authentication Status
  const isAuthenticated = Boolean(user);
  const isGuest = !isAuthenticated && !isLoading;

  // MARK: - User Information
  const userProfile = user ? {
    id: user.sub!,
    email: user.email!,
    name: user.name || '',
    nickname: user.nickname || '',
    picture: user.picture || '',
    emailVerified: user.email_verified || false,
    updatedAt: user.updated_at || '',
  } : null;

  // MARK: - Authentication Actions
  const login = useCallback((returnTo?: string) => {
    const url = returnTo 
      ? `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`
      : '/api/auth/login';
    router.push(url);
  }, [router]);

  const logout = useCallback(() => {
    router.push('/api/auth/logout');
  }, [router]);

  const loginWithRedirect = useCallback((returnTo?: string) => {
    login(returnTo);
  }, [login]);

  // MARK: - Loading States
  const isAuthLoading = isLoading;

  return {
    // User information
    user: userProfile,
    rawUser: user,
    
    // Authentication status
    isAuthenticated,
    isGuest,
    isLoading: isAuthLoading,
    
    // Authentication actions
    login,
    logout,
    loginWithRedirect,
    
    // Error handling
    error,
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
    login(redirectTo);
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