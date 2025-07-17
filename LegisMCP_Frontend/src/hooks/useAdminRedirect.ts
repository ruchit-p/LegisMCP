'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useUserRole } from './useUserRole';

interface UseAdminRedirectOptions {
  enabled?: boolean;
  redirectTo?: string;
  excludePaths?: string[];
}

export function useAdminRedirect({
  enabled = true,
  redirectTo = '/admin/dashboard',
  excludePaths = ['/admin', '/api', '/auth']
}: UseAdminRedirectOptions = {}) {
  const { user, isLoading: authLoading } = useUser();
  const { role, isLoading: roleLoading, isAdmin, isSuperAdmin } = useUserRole();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect if disabled or still loading
    if (!enabled || authLoading || roleLoading) {
      return;
    }

    // Don't redirect if user is not authenticated
    if (!user) {
      return;
    }

    // Don't redirect if user is not an admin
    if (!isAdmin && !isSuperAdmin) {
      return;
    }

    // Don't redirect if already on an excluded path
    const currentPath = window.location.pathname;
    const isExcludedPath = excludePaths.some(path => 
      currentPath.startsWith(path)
    );
    
    if (isExcludedPath) {
      return;
    }

    // Don't redirect if already on the target path
    if (currentPath === redirectTo) {
      return;
    }

    // Redirect admin users to admin dashboard
    console.log(`Redirecting admin user (${role}) to ${redirectTo}`);
    router.push(redirectTo);
  }, [
    enabled,
    authLoading,
    roleLoading,
    user,
    isAdmin,
    isSuperAdmin,
    role,
    redirectTo,
    excludePaths,
    router
  ]);

  return {
    shouldRedirect: enabled && !authLoading && !roleLoading && user && (isAdmin || isSuperAdmin),
    isLoading: authLoading || roleLoading,
    role
  };
}