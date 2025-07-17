'use client';

import { useAdminRedirect } from '@/hooks/useAdminRedirect';

interface AdminRedirectProps {
  enabled?: boolean;
  redirectTo?: string;
  excludePaths?: string[];
  children?: React.ReactNode;
}

export function AdminRedirect({
  enabled = true,
  redirectTo = '/admin/dashboard',
  excludePaths = ['/admin', '/api', '/auth'],
  children
}: AdminRedirectProps) {
  const { shouldRedirect, isLoading } = useAdminRedirect({
    enabled,
    redirectTo,
    excludePaths
  });

  // Show loading state while checking
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If redirect is happening, show loading state
  if (shouldRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Redirecting to admin dashboard...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}