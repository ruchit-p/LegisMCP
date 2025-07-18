'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth0 } from '@/hooks/use-auth0';
import { useUserRole } from '@/hooks/useUserRole';

interface SmartRedirectProps {
  children: React.ReactNode;
}

export function SmartRedirect({ children }: SmartRedirectProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth0();
  const { role, isLoading: roleLoading } = useUserRole();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't redirect while loading
    if (authLoading || roleLoading) return;
    
    // Handle authentication redirects
    if (!isAuthenticated) {
      // Public routes - no redirect needed
      const publicRoutes = ['/', '/contact', '/contact/enterprise'];
      if (publicRoutes.includes(pathname)) return;
      
      // Protected route - redirect to home
      router.push('/');
      return;
    }

    // User is authenticated - handle role-based redirects
    if (role) {
      // Admin users accessing general areas - redirect to admin dashboard
      if (role === 'admin' && pathname === '/dashboard') {
        router.push('/admin/dashboard');
        return;
      }
      
      // Regular users accessing admin areas - redirect to regular dashboard
      if (role !== 'admin' && pathname.startsWith('/admin')) {
        router.push('/dashboard');
        return;
      }
    }
  }, [isAuthenticated, authLoading, roleLoading, role, pathname, router]);

  // Show loading state while authenticating
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <div className="min-h-screen bg-white">{children}</div>;
}

// Hook to get redirect status for display purposes
export function useRedirectStatus() {
  const { isAuthenticated, isLoading: authLoading } = useAuth0();
  const { role, isLoading: roleLoading } = useUserRole();
  const pathname = usePathname();

  const isLoading = authLoading || roleLoading;
  const shouldRedirect = !isLoading && !isAuthenticated && pathname !== '/';

  return {
    isLoading,
    shouldRedirect,
    user: null, // Simplified for this hook
    role,
  };
}