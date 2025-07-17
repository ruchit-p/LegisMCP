'use client';

import { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useSearchParams } from 'next/navigation';
import { getUserActivityLogger } from '@/lib/user-activity-logger';

// Analytics context interface
interface AnalyticsContextType {
  logButtonClick: (buttonText: string, buttonId?: string, buttonClass?: string, section?: string) => void;
  logFormInteraction: (formId: string, formName: string, interactionType: 'focus' | 'blur' | 'change' | 'submit' | 'abandon', fieldName?: string) => void;
  logSearchQuery: (query: string, searchType: 'bills' | 'members' | 'general', filters?: Record<string, string>, resultsCount?: number) => void;
  logFeatureUsage: (featureName: string, featureCategory: string, success?: boolean) => void;
  logError: (errorType: 'javascript' | 'network' | 'api' | 'user_input', errorMessage: string, severity?: 'low' | 'medium' | 'high' | 'critical') => void;
}

// Create analytics context
const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

// Custom hook to use analytics
export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};

// Analytics provider component
interface AnalyticsProviderProps {
  children: ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const { data: session, status } = useSession();
  const user = session?.user;
  const isLoading = status === 'loading';
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Only initialize logger in browser environment
  const logger = typeof window !== 'undefined' ? getUserActivityLogger() : null;
  
  // Track previous page for navigation analytics
  const previousPathRef = useRef<string | null>(null);
  const pageStartTimeRef = useRef<number>(Date.now());
  const isInitialLoadRef = useRef(true);

  // Initialize analytics when user loads
  useEffect(() => {
    if (!isLoading && user) {
      // Set access token from user session
      // Note: In a real implementation, you'd need to get the access token
      // This is a placeholder - you'd typically get this from your auth context
      console.log('Analytics: User authenticated, setting up tracking');
      
      // You might need to fetch the access token from your auth endpoint
      // For now, we'll proceed without it for anonymous tracking
    }
  }, [user, isLoading]);

  // Track page navigation
  useEffect(() => {
    const currentPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    
    // Don't track the initial load as navigation
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      logger?.logPageView(undefined, undefined, true);
      console.log('Analytics: Initial page load tracked:', currentPath);
    } else {
      // Track page navigation
      const previousPath = previousPathRef.current;
      
      if (previousPath && previousPath !== currentPath) {
        // Log time on previous page
        const timeOnPreviousPage = Date.now() - pageStartTimeRef.current;
        console.log('Analytics: Time on previous page:', timeOnPreviousPage, 'ms');
        
        // Log navigation event
        logger?.logNavigation('click', currentPath, previousPath);
        
        // Log new page view
        logger?.logPageView(previousPath, undefined, false);
        
        console.log('Analytics: Navigation tracked:', previousPath, '->', currentPath);
      }
    }
    
    // Update refs for next navigation
    previousPathRef.current = currentPath;
    pageStartTimeRef.current = Date.now();
  }, [pathname, searchParams, logger]);

  // Track page unload/visibility changes
  useEffect(() => {
    const handleBeforeUnload = () => {
      const timeOnPage = Date.now() - pageStartTimeRef.current;
      logger?.logTimeOnPage();
      console.log('Analytics: Session ending, time on page:', timeOnPage, 'ms');
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched away from tab
        const timeOnPage = Date.now() - pageStartTimeRef.current;
        logger?.logTimeOnPage();
        console.log('Analytics: Tab hidden, time on page:', timeOnPage, 'ms');
      } else {
        // User came back to tab
        pageStartTimeRef.current = Date.now();
        console.log('Analytics: Tab visible again');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [logger]);

  // Track performance metrics
  useEffect(() => {
    // Track page load performance
    if (typeof window !== 'undefined' && 'performance' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            const loadTime = navEntry.loadEventEnd - navEntry.loadEventStart;
            
            if (loadTime > 0) {
              console.log('Analytics: Page load time:', loadTime, 'ms');
              // You could log this as a performance metric
            }
          }
        }
      });
      
      observer.observe({ entryTypes: ['navigation'] });
      
      return () => observer.disconnect();
    }
  }, []);

  // Context value with helper methods
  const contextValue: AnalyticsContextType = {
    logButtonClick: (buttonText: string, buttonId?: string, buttonClass?: string, section?: string) => {
      logger?.logButtonClick(buttonText, buttonId, buttonClass, section);
      console.log('Analytics: Button click tracked:', buttonText, 'in section:', section);
    },

    logFormInteraction: (
      formId: string,
      formName: string,
      interactionType: 'focus' | 'blur' | 'change' | 'submit' | 'abandon',
      fieldName?: string
    ) => {
      logger?.logFormInteraction(formId, formName, interactionType, fieldName);
      console.log('Analytics: Form interaction tracked:', formName, interactionType, fieldName);
    },

    logSearchQuery: (
      query: string,
      searchType: 'bills' | 'members' | 'general',
      filters?: Record<string, string>,
      resultsCount?: number
    ) => {
      logger?.logSearchQuery(query, searchType, filters, resultsCount);
      console.log('Analytics: Search query tracked:', query, 'type:', searchType, 'results:', resultsCount);
    },

    logFeatureUsage: (featureName: string, featureCategory: string, success: boolean = true) => {
      logger?.logFeatureUsage(featureName, featureCategory, undefined, undefined, success);
      console.log('Analytics: Feature usage tracked:', featureName, 'category:', featureCategory, 'success:', success);
    },

    logError: (
      errorType: 'javascript' | 'network' | 'api' | 'user_input',
      errorMessage: string,
      severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
    ) => {
      logger?.logError(errorType, errorMessage, undefined, severity);
      console.log('Analytics: Error tracked:', errorType, errorMessage, 'severity:', severity);
    }
  };

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
}

// Higher-order component for automatic button click tracking
export function withAnalytics<T extends object>(
  Component: React.ComponentType<T>,
  componentName: string,
  section: string = 'unknown'
) {
  return function AnalyticsWrapper(props: T) {
    const analytics = useAnalytics();
    
    // Add onClick handler if component accepts it
    const enhancedProps = {
      ...props,
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        // Call original onClick if it exists
        if ('onClick' in props && typeof props.onClick === 'function') {
          (props.onClick as (event: React.MouseEvent<HTMLElement>) => void)(event);
        }
        
        // Track the click
        const target = event.currentTarget;
        const buttonText = target.textContent || target.getAttribute('aria-label') || componentName;
        const buttonId = target.id;
        const buttonClass = target.className;
        
        analytics.logButtonClick(buttonText, buttonId, buttonClass, section);
      }
    };
    
    return <Component {...enhancedProps} />;
  };
}

// Hook for automatic scroll tracking
export function useScrollTracking() {
  const logger = typeof window !== 'undefined' ? getUserActivityLogger() : null;
  
  useEffect(() => {
    let maxScrollDepth = 0;
    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      
      scrollTimeout = setTimeout(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        const scrollPercent = Math.round(((scrollTop + windowHeight) / documentHeight) * 100);
        
        if (scrollPercent > maxScrollDepth) {
          maxScrollDepth = scrollPercent;
          logger?.logScrollDepth(maxScrollDepth);
          console.log('Analytics: Scroll depth tracked:', maxScrollDepth, '%');
        }
      }, 100);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [logger]);
}

// Hook for form tracking
export function useFormTracking(formId: string, formName: string) {
  const analytics = useAnalytics();
  
  const trackFormSubmit = () => {
    analytics.logFormInteraction(formId, formName, 'submit');
  };
  
  const trackFormAbandon = () => {
    analytics.logFormInteraction(formId, formName, 'abandon');
  };
  
  const trackFieldInteraction = (fieldName: string, interactionType: 'focus' | 'blur' | 'change') => {
    analytics.logFormInteraction(formId, formName, interactionType, fieldName);
  };
  
  return {
    trackFormSubmit,
    trackFormAbandon,
    trackFieldInteraction
  };
}