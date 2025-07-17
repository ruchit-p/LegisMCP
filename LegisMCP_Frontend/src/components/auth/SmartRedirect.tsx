'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useUserRole } from '@/hooks/useUserRole';

interface SmartRedirectProps {
  children: React.ReactNode;
}

export function SmartRedirect({ children }: SmartRedirectProps) {
  const { user, isLoading: authLoading } = useUser();
  const { role, isLoading: roleLoading } = useUserRole();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't redirect if still loading
    if (authLoading || roleLoading) {
      return;
    }

    // Don't redirect if user is not authenticated
    if (!user || !role) {
      return;
    }

    // Define redirect rules based on user role and current path
    const redirectRules = {
      admin: {
        from: ['/', '/dashboard'],
        to: '/admin/dashboard'
      },
      super_admin: {
        from: ['/', '/dashboard'],
        to: '/admin/dashboard'
      },
      user: {
        from: ['/'],
        to: '/dashboard'
      }
    };

    // Paths that should never be redirected
    const excludedPaths = [
      '/admin',
      '/api',
      '/auth',
      '/profile',
      '/billing',
      '/contact',
      '/docs',
      '/api-docs',
      '/privacy',
      '/terms'
    ];

    // Check if current path is excluded
    const isExcluded = excludedPaths.some(path => pathname.startsWith(path));
    if (isExcluded) {
      return;
    }

    // Get redirect rule for current user's role
    const ruleForRole = redirectRules[role];
    if (!ruleForRole) {
      return;
    }

    // Check if current path matches a redirect pattern
    const shouldRedirect = ruleForRole.from.includes(pathname);
    if (!shouldRedirect) {
      return;
    }

    // Don't redirect if already on the target path
    if (pathname === ruleForRole.to) {
      return;
    }

    // Perform the redirect
    console.log(`Smart redirect: ${role} user from ${pathname} to ${ruleForRole.to}`);
    router.push(ruleForRole.to);
  }, [
    authLoading,
    roleLoading,
    user,
    role,
    pathname,
    router
  ]);

  return <>{children}</>;
}

// Hook to get redirect status for display purposes
export function useRedirectStatus() {
  const { user, isLoading: authLoading } = useUser();
  const { role, isLoading: roleLoading } = useUserRole();
  const pathname = usePathname();

  const isLoading = authLoading || roleLoading;
  
  if (isLoading || !user || !role) {
    return { isLoading, shouldRedirect: false, targetPath: null };
  }

  const redirectRules = {
    admin: {
      from: ['/', '/dashboard'],
      to: '/admin/dashboard'
    },
    super_admin: {
      from: ['/', '/dashboard'],
      to: '/admin/dashboard'
    },
    user: {
      from: ['/'],
      to: '/dashboard'
    }
  };

  const ruleForRole = redirectRules[role];
  if (!ruleForRole) {
    return { isLoading: false, shouldRedirect: false, targetPath: null };
  }

  const shouldRedirect = ruleForRole.from.includes(pathname) && pathname !== ruleForRole.to;
  
  return {
    isLoading: false,
    shouldRedirect,
    targetPath: shouldRedirect ? ruleForRole.to : null
  };
}