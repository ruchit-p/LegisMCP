import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';

export type UserRole = 'user' | 'admin' | 'super_admin';

interface UseUserRoleReturn {
  role: UserRole | null;
  isLoading: boolean;
  error: string | null;
  refreshRole: () => Promise<void>;
  hasRole: (requiredRole: UserRole | UserRole[]) => boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export function useUserRole(): UseUserRoleReturn {
  const { user, isLoading: authLoading } = useUser();
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserRole = useCallback(async () => {
    if (!user) {
      setRole(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/user/role', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setRole(data.data.role);
      } else {
        throw new Error(data.error || 'Failed to fetch user role');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error fetching user role:', err);
      
      // Fallback to 'user' role if API fails
      setRole('user');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchUserRole();
    }
  }, [user, authLoading, fetchUserRole]);

  const hasRole = (requiredRole: UserRole | UserRole[]): boolean => {
    if (!role) return false;
    
    const roleHierarchy: Record<UserRole, number> = {
      user: 1,
      admin: 2,
      super_admin: 3
    };
    
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(role);
    }
    
    return roleHierarchy[role] >= roleHierarchy[requiredRole];
  };

  const refreshRole = async () => {
    await fetchUserRole();
  };

  return {
    role,
    isLoading: isLoading || authLoading,
    error,
    refreshRole,
    hasRole,
    isAdmin: hasRole(['admin', 'super_admin']),
    isSuperAdmin: hasRole('super_admin')
  };
}