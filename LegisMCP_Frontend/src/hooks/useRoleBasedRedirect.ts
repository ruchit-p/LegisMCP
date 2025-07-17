import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useUserRole } from './useUserRole';

export interface RoleRedirectConfig {
  admin: string;
  super_admin: string;
  user?: string;
}

interface UseRoleBasedRedirectOptions {
  enabled?: boolean;
  redirectConfig?: RoleRedirectConfig;
  excludePaths?: string[];
  includeSubpaths?: boolean;
}

export function useRoleBasedRedirect({
  enabled = true,
  redirectConfig = {
    admin: '/admin/dashboard',
    super_admin: '/admin/dashboard',
    user: undefined // Users stay on current page
  },
  excludePaths = ['/admin', '/api', '/auth', '/profile', '/billing'],
  includeSubpaths = true
}: UseRoleBasedRedirectOptions = {}) {
  const { user, isLoading: authLoading } = useUser();
  const { role, isLoading: roleLoading } = useUserRole();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect if disabled or still loading
    if (!enabled || authLoading || roleLoading) {
      return;
    }

    // Don't redirect if user is not authenticated
    if (!user || !role) {
      return;
    }

    // Get the redirect path for the user's role
    const redirectPath = redirectConfig[role];
    
    // Don't redirect if no redirect path is configured for this role
    if (!redirectPath) {
      return;
    }

    // Check if current path should be excluded
    const currentPath = window.location.pathname;
    const isExcludedPath = excludePaths.some(path => {
      if (includeSubpaths) {
        return currentPath.startsWith(path);
      }
      return currentPath === path;
    });
    
    if (isExcludedPath) {
      return;
    }

    // Don't redirect if already on the target path
    if (currentPath === redirectPath) {
      return;
    }

    // Perform the redirect
    console.log(`Redirecting ${role} user to ${redirectPath}`);
    router.push(redirectPath);
  }, [
    enabled,
    authLoading,
    roleLoading,
    user,
    role,
    redirectConfig,
    excludePaths,
    includeSubpaths,
    router
  ]);

  return {
    shouldRedirect: enabled && !authLoading && !roleLoading && user && role && redirectConfig[role],
    isLoading: authLoading || roleLoading,
    role,
    targetPath: role ? redirectConfig[role] : undefined
  };
}

// Specific hook for admin redirect only
export function useAdminOnlyRedirect(options: Omit<UseRoleBasedRedirectOptions, 'redirectConfig'> = {}) {
  return useRoleBasedRedirect({
    ...options,
    redirectConfig: {
      admin: '/admin/dashboard',
      super_admin: '/admin/dashboard'
    }
  });
}