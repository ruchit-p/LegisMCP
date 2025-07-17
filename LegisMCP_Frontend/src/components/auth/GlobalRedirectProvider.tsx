'use client';

import { createContext, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useUserRole } from '@/hooks/useUserRole';

interface GlobalRedirectConfig {
  enabled: boolean;
  redirectRules: {
    admin: string;
    super_admin: string;
    user?: string;
  };
  excludePaths: string[];
  includeSubpaths: boolean;
}

interface GlobalRedirectContextValue {
  config: GlobalRedirectConfig;
  updateConfig: (config: Partial<GlobalRedirectConfig>) => void;
}

const GlobalRedirectContext = createContext<GlobalRedirectContextValue | null>(null);

const defaultConfig: GlobalRedirectConfig = {
  enabled: true,
  redirectRules: {
    admin: '/admin/dashboard',
    super_admin: '/admin/dashboard',
    user: undefined // Users don't get redirected by default
  },
  excludePaths: ['/admin', '/api', '/auth', '/profile', '/billing', '/contact'],
  includeSubpaths: true
};

export function GlobalRedirectProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const user = session?.user;
  const authLoading = status === 'loading';
  const { role, isLoading: roleLoading } = useUserRole();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if enabled and not loading
    if (!defaultConfig.enabled || authLoading || roleLoading) {
      return;
    }

    // Don't redirect if user is not authenticated
    if (!user || !role) {
      return;
    }

    // Get the redirect path for the user's role
    const redirectPath = defaultConfig.redirectRules[role];
    
    // Don't redirect if no redirect path is configured for this role
    if (!redirectPath) {
      return;
    }

    // Check if current path should be excluded
    const currentPath = window.location.pathname;
    const isExcludedPath = defaultConfig.excludePaths.some(path => {
      if (defaultConfig.includeSubpaths) {
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
    console.log(`Global redirect: ${role} user to ${redirectPath}`);
    router.push(redirectPath);
  }, [
    authLoading,
    roleLoading,
    user,
    role,
    router
  ]);

  const updateConfig = (newConfig: Partial<GlobalRedirectConfig>) => {
    Object.assign(defaultConfig, newConfig);
  };

  return (
    <GlobalRedirectContext.Provider value={{ config: defaultConfig, updateConfig }}>
      {children}
    </GlobalRedirectContext.Provider>
  );
}

export function useGlobalRedirect() {
  const context = useContext(GlobalRedirectContext);
  if (!context) {
    throw new Error('useGlobalRedirect must be used within a GlobalRedirectProvider');
  }
  return context;
}

// Hook to disable global redirects for specific components
export function useDisableGlobalRedirect() {
  const { updateConfig } = useGlobalRedirect();
  
  useEffect(() => {
    updateConfig({ enabled: false });
    
    // Re-enable on cleanup
    return () => {
      updateConfig({ enabled: true });
    };
  }, [updateConfig]);
}