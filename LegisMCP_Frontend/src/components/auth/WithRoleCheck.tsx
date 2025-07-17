import { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useUserRole, UserRole } from '@/hooks/useUserRole';

interface WithRoleCheckProps {
  children: ReactNode;
  requiredRole: UserRole | UserRole[];
  fallback?: ReactNode;
  redirectTo?: string;
}

export function WithRoleCheck({ 
  children, 
  requiredRole, 
  fallback,
  redirectTo = '/dashboard'
}: WithRoleCheckProps) {
  const { data: session, status } = useSession();
  const user = session?.user;
  const authLoading = status === 'loading';
  const { role, isLoading: roleLoading, hasRole } = useUserRole();
  const router = useRouter();

  // Show loading state while checking authentication and role
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    router.push('/api/auth/login');
    return null;
  }

  // Check if user has required role
  if (!hasRole(requiredRole)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    // Default access denied page
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don&apos;t have permission to access this page.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Required role: {Array.isArray(requiredRole) ? requiredRole.join(' or ') : requiredRole}
            {role && ` (Your role: ${role})`}
          </p>
          <button
            onClick={() => router.push(redirectTo)}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Hook for easier role checking in components
export function useRoleCheck(requiredRole: UserRole | UserRole[]) {
  const { hasRole, isLoading } = useUserRole();
  
  return {
    hasAccess: hasRole(requiredRole),
    isLoading
  };
}