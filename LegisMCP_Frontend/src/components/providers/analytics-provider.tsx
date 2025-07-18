'use client';

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { getUserActivityLogger } from '@/lib/user-activity-logger'

// MARK: - Analytics Provider Props
interface AnalyticsProviderProps {
  children: React.ReactNode
}

// MARK: - Analytics Provider Component
/**
 * Analytics Provider that tracks user activity and navigation
 * Integrates with NextAuth.js for user authentication state
 */
export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const { data: session, status } = useSession();
  const user = session?.user;
  const isAuthenticated = !!session;
  const isLoading = status === 'loading';
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Only initialize logger in browser environment
  const logger = typeof window !== 'undefined' ? getUserActivityLogger() : null;

  // Refs for tracking navigation and timing
  const isInitialLoadRef = useRef(true);
  const previousPathRef = useRef<string>('');
  const pageStartTimeRef = useRef<number>(Date.now());

  // MARK: - Set Access Token for Authentication
  // Set access token in logger when user is authenticated
  useEffect(() => {
    if (!logger || isLoading) return;

    const setupAuthentication = async () => {
      if (isAuthenticated && user && session?.accessToken) {
        try {
          logger.setAccessToken(session.accessToken);
          logger.setEnabled(true);
          console.log('Analytics: Access token set for user:', user.email);
        } catch (error) {
          console.error('Analytics: Failed to set access token:', error);
          // Disable analytics if we can't set a token
          logger.setEnabled(false);
        }
      } else {
        // Clear token and disable logging for unauthenticated users
        logger.setAccessToken('');
        logger.setEnabled(false);
        console.log('Analytics: Disabled for unauthenticated user');
      }
    };

    setupAuthentication();
  }, [isAuthenticated, user, logger, isLoading, session?.accessToken]);

  // MARK: - Page View Tracking
  useEffect(() => {
    if (!logger || isLoading) return;

    const currentPath = pathname;
    const currentSearchParams = searchParams?.toString() || '';
    const fullPath = currentSearchParams ? `${currentPath}?${currentSearchParams}` : currentPath;

    // Track page view for authenticated users only
    if (isAuthenticated && user) {
      // Calculate time spent on previous page
      if (!isInitialLoadRef.current && previousPathRef.current) {
        const timeSpent = Date.now() - pageStartTimeRef.current;
        
        try {
          logger.logPageView(previousPathRef.current, timeSpent, false);
        } catch (error) {
          console.error('Analytics: Failed to log page view for previous page:', error);
        }
      }

      // Log current page view (without time spent for new page)
      try {
        logger.logPageView(fullPath, undefined, isInitialLoadRef.current);
      } catch (error) {
        console.error('Analytics: Failed to log current page view:', error);
      }

      // Update refs for next navigation
      previousPathRef.current = fullPath;
      pageStartTimeRef.current = Date.now();
      isInitialLoadRef.current = false;
    }
  }, [pathname, searchParams, isAuthenticated, user, logger, isLoading]);

  // MARK: - Session Events Tracking
  useEffect(() => {
    if (!logger || isLoading) return;

    // Track login events
    if (isAuthenticated && user) {
      try {
        logger.logSessionStart();
        console.log('Analytics: Session started for user:', user.email);
      } catch (error) {
        console.error('Analytics: Failed to log session start:', error);
      }
    }
  }, [isAuthenticated, user, logger, isLoading]);

  // MARK: - Cleanup on Unmount
  useEffect(() => {
    return () => {
      // Log final page view with time spent when component unmounts
      if (logger && isAuthenticated && previousPathRef.current) {
        const timeSpent = Date.now() - pageStartTimeRef.current;
        try {
          logger.logPageView(previousPathRef.current, timeSpent, false);
        } catch (error) {
          console.error('Analytics: Failed to log final page view:', error);
        }
      }
    };
  }, [logger, isAuthenticated]);

  return <>{children}</>;
}

// MARK: - Utility Hooks
/**
 * Hook for automatic scroll tracking
 * Can be used independently in components that need scroll tracking
 */
export function useScrollTracking() {
  const logger = typeof window !== 'undefined' ? getUserActivityLogger() : null;

  useEffect(() => {
    if (!logger) return;

    let maxScrollDepth = 0;

    const handleScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );

      if (scrollPercent > maxScrollDepth) {
        maxScrollDepth = scrollPercent;
        logger.logScrollDepth(maxScrollDepth);
        console.log('Analytics: Scroll depth tracked:', maxScrollDepth, '%');
      }
    };

    // Throttle scroll events
    let ticking = false;
    const throttledHandleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledHandleScroll);

    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
    };
  }, [logger]);
}

// MARK: - Analytics Hooks
/**
 * Hook for accessing analytics functionality
 * Note: Currently returns stub implementation
 */
export function useAnalytics() {
  const { data: session } = useSession();
  
  return {
    trackEvent: (event: string, properties?: Record<string, any>) => {
      console.log('Analytics event:', event, properties);
    },
    trackPageView: (page: string) => {
      console.log('Analytics page view:', page);
    },
    isEnabled: !!session,
  };
}

/**
 * Hook for form tracking analytics
 * Note: Currently returns stub implementation
 */
export function useFormTracking() {
  return {
    trackFormStart: (formName: string) => {
      console.log('Form started:', formName);
    },
    trackFormSubmit: (formName: string, success: boolean) => {
      console.log('Form submitted:', formName, 'Success:', success);
    },
    trackFormError: (formName: string, error: string) => {
      console.log('Form error:', formName, error);
    },
  };
}