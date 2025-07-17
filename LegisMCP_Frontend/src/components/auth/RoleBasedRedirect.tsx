import { useRoleBasedRedirect, RoleRedirectConfig } from '@/hooks/useRoleBasedRedirect';

interface RoleBasedRedirectProps {
  enabled?: boolean;
  redirectConfig?: RoleRedirectConfig;
  excludePaths?: string[];
  includeSubpaths?: boolean;
  children?: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

export function RoleBasedRedirect({
  enabled = true,
  redirectConfig = {
    admin: '/admin/dashboard',
    super_admin: '/admin/dashboard'
  },
  excludePaths = ['/admin', '/api', '/auth', '/profile', '/billing'],
  includeSubpaths = true,
  children,
  loadingComponent
}: RoleBasedRedirectProps) {
  const { shouldRedirect, isLoading, role, targetPath } = useRoleBasedRedirect({
    enabled,
    redirectConfig,
    excludePaths,
    includeSubpaths
  });

  // Default loading component
  const defaultLoadingComponent = (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    </div>
  );

  // Show loading state while checking
  if (isLoading) {
    return loadingComponent || defaultLoadingComponent;
  }

  // If redirect is happening, show redirect loading state
  if (shouldRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">
            Redirecting {role} user to {targetPath}...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Specific component for admin-only redirects
export function AdminOnlyRedirect({
  children,
  loadingComponent,
  ...props
}: Omit<RoleBasedRedirectProps, 'redirectConfig'>) {
  return (
    <RoleBasedRedirect
      {...props}
      redirectConfig={{
        admin: '/admin/dashboard',
        super_admin: '/admin/dashboard'
      }}
      loadingComponent={loadingComponent}
    >
      {children}
    </RoleBasedRedirect>
  );
}