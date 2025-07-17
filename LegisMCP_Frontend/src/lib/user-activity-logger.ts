/**
 * User Activity Logger
 * Comprehensive tracking of user interactions, navigation, and behavior
 * Extends the existing MCP logging infrastructure
 */

// Event types for comprehensive user tracking
export type UserActivityEventType = 
  | 'page_view'
  | 'button_click'
  | 'form_interaction'
  | 'search_query'
  | 'session_start'
  | 'session_end'
  | 'error'
  | 'feature_usage'
  | 'navigation'
  | 'scroll_depth'
  | 'time_on_page';

// Base interface for all user activity events
interface BaseUserActivityEvent {
  event_type: UserActivityEventType;
  timestamp: number;
  session_id: string;
  user_id?: string;
  page_url: string;
  page_title: string;
  referrer?: string;
  user_agent: string;
  viewport_size?: { width: number; height: number };
  device_type?: 'desktop' | 'mobile' | 'tablet';
}

// Specific event data interfaces
interface PageViewEvent extends BaseUserActivityEvent {
  event_type: 'page_view';
  data: {
    previous_page?: string;
    load_time?: number;
    is_initial_load: boolean;
  };
}

interface ButtonClickEvent extends BaseUserActivityEvent {
  event_type: 'button_click';
  data: {
    button_text: string;
    button_id?: string;
    button_class?: string;
    element_position: { x: number; y: number };
    section: string; // e.g., 'hero', 'pricing', 'cta'
  };
}

interface FormInteractionEvent extends BaseUserActivityEvent {
  event_type: 'form_interaction';
  data: {
    form_id: string;
    form_name: string;
    field_name?: string;
    interaction_type: 'focus' | 'blur' | 'change' | 'submit' | 'abandon';
    field_value_length?: number; // Don't log actual values for privacy
    time_spent?: number;
  };
}

interface SearchQueryEvent extends BaseUserActivityEvent {
  event_type: 'search_query';
  data: {
    query: string;
    filters_applied?: Record<string, string>;
    results_count?: number;
    search_type: 'bills' | 'members' | 'general';
  };
}

interface SessionEvent extends BaseUserActivityEvent {
  event_type: 'session_start' | 'session_end';
  data: {
    session_duration?: number; // for session_end
    pages_visited?: number;
    actions_taken?: number;
  };
}

interface ErrorEvent extends BaseUserActivityEvent {
  event_type: 'error';
  data: {
    error_type: 'javascript' | 'network' | 'api' | 'user_input';
    error_message: string;
    error_stack?: string;
    component?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
}

interface FeatureUsageEvent extends BaseUserActivityEvent {
  event_type: 'feature_usage';
  data: {
    feature_name: string;
    feature_category: string;
    usage_duration?: number;
    interaction_count?: number;
    success: boolean;
  };
}

interface NavigationEvent extends BaseUserActivityEvent {
  event_type: 'navigation';
  data: {
    navigation_type: 'click' | 'back' | 'forward' | 'external';
    destination: string;
    source_element?: string;
  };
}

interface ScrollDepthEvent extends BaseUserActivityEvent {
  event_type: 'scroll_depth';
  data: {
    max_depth_percent: number;
    page_height: number;
    scroll_time: number;
  };
}

interface TimeOnPageEvent extends BaseUserActivityEvent {
  event_type: 'time_on_page';
  data: {
    time_spent: number;
    active_time: number; // Time when tab was active
    interactions_count: number;
  };
}

// Union type for all possible events
export type UserActivityEvent = 
  | PageViewEvent
  | ButtonClickEvent
  | FormInteractionEvent
  | SearchQueryEvent
  | SessionEvent
  | ErrorEvent
  | FeatureUsageEvent
  | NavigationEvent
  | ScrollDepthEvent
  | TimeOnPageEvent;

// Logger configuration
interface UserActivityLoggerConfig {
  batchSize: number;
  batchTimeout: number; // ms
  enableClientSideErrors: boolean;
  enableScrollTracking: boolean;
  enableTimeTracking: boolean;
  privacyMode: boolean;
}

export class UserActivityLogger {
  private static instance: UserActivityLogger | null = null;
  private workerUrl: string;
  private accessToken: string | null = null;
  private sessionId: string;
  private eventQueue: UserActivityEvent[] = [];
  private config: UserActivityLoggerConfig;
  private batchTimer: NodeJS.Timeout | null = null;
  private pageStartTime: number = Date.now();
  private isEnabled: boolean = true;
  private deviceType: 'desktop' | 'mobile' | 'tablet';

  private constructor() {
    this.workerUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_WORKER_URL || 
                     process.env.CLOUDFLARE_WORKER_URL || 
                     'https://api.example.com';
    
    this.sessionId = this.generateSessionId();
    this.deviceType = this.detectDeviceType();
    
    this.config = {
      batchSize: 10,
      batchTimeout: 5000, // 5 seconds
      enableClientSideErrors: true,
      enableScrollTracking: true,
      enableTimeTracking: true,
      privacyMode: false
    };

    this.initializeEventListeners();
    this.logSessionStart();
  }

  /**
   * Get the singleton instance of UserActivityLogger
   */
  public static getInstance(): UserActivityLogger {
    if (!UserActivityLogger.instance) {
      UserActivityLogger.instance = new UserActivityLogger();
    }
    return UserActivityLogger.instance;
  }

  /**
   * Set the access token for authentication
   */
  public setAccessToken(token: string) {
    this.accessToken = token;
  }

  /**
   * Enable or disable logging
   */
  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<UserActivityLoggerConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Detect device type based on user agent and viewport
   */
  private detectDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    if (typeof window === 'undefined') return 'desktop';
    
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);
    
    if (isTablet) return 'tablet';
    if (isMobile) return 'mobile';
    return 'desktop';
  }

  /**
   * Initialize global event listeners
   */
  private initializeEventListeners() {
    if (typeof window === 'undefined') return;

    // Page visibility change tracking
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.logTimeOnPage();
      } else {
        this.pageStartTime = Date.now();
      }
    });

    // Window beforeunload for session end
    window.addEventListener('beforeunload', () => {
      this.logSessionEnd();
      this.flushEventQueue();
    });

    // Error tracking
    if (this.config.enableClientSideErrors) {
      window.addEventListener('error', (event) => {
        this.logError('javascript', event.message, event.error?.stack, 'high');
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.logError('javascript', event.reason?.message || 'Unhandled Promise Rejection', event.reason?.stack, 'high');
      });
    }

    // Scroll tracking
    if (this.config.enableScrollTracking) {
      let maxScrollDepth = 0;
      let scrollTimer: NodeJS.Timeout;

      window.addEventListener('scroll', () => {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
          const scrollDepth = Math.round((window.scrollY + window.innerHeight) / document.body.scrollHeight * 100);
          if (scrollDepth > maxScrollDepth) {
            maxScrollDepth = scrollDepth;
            this.logScrollDepth(maxScrollDepth);
          }
        }, 100);
      });
    }
  }

  /**
   * Create base event data
   */
  private createBaseEvent(eventType: UserActivityEventType): BaseUserActivityEvent {
    return {
      event_type: eventType,
      timestamp: Date.now(),
      session_id: this.sessionId,
      page_url: window.location.href,
      page_title: document.title,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      viewport_size: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      device_type: this.deviceType
    };
  }

  /**
   * Add event to queue and process if needed
   */
  private queueEvent(event: UserActivityEvent) {
    if (!this.isEnabled) return;
    
    this.eventQueue.push(event);
    
    // Process queue if batch size reached
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flushEventQueue();
    } else if (!this.batchTimer) {
      // Set timer for automatic batch processing
      this.batchTimer = setTimeout(() => {
        this.flushEventQueue();
      }, this.config.batchTimeout);
    }
  }

  /**
   * Flush the event queue to the backend
   */
  private async flushEventQueue() {
    if (this.eventQueue.length === 0) return;
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const response = await fetch(`${this.workerUrl}/api/analytics/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.accessToken ? { 'Authorization': `Bearer ${this.accessToken}` } : {})
        },
        body: JSON.stringify({ events })
      });

      if (!response.ok) {
        console.error('Failed to log user activity events:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Error logging user activity events:', error);
      // Don't throw - logging failures shouldn't break the application
    }
  }

  // Public methods for logging different types of events

  /**
   * Log page view
   */
  public logPageView(previousPage?: string, loadTime?: number, isInitialLoad: boolean = false) {
    const event: PageViewEvent = {
      ...this.createBaseEvent('page_view'),
      event_type: 'page_view',
      data: {
        previous_page: previousPage,
        load_time: loadTime,
        is_initial_load: isInitialLoad
      }
    };
    this.queueEvent(event);
  }

  /**
   * Log button click
   */
  public logButtonClick(buttonText: string, buttonId?: string, buttonClass?: string, section: string = 'unknown') {
    const event: ButtonClickEvent = {
      ...this.createBaseEvent('button_click'),
      event_type: 'button_click',
      data: {
        button_text: buttonText,
        button_id: buttonId,
        button_class: buttonClass,
        element_position: { x: 0, y: 0 }, // Could be enhanced with actual click position
        section
      }
    };
    this.queueEvent(event);
  }

  /**
   * Log form interaction
   */
  public logFormInteraction(
    formId: string,
    formName: string,
    interactionType: 'focus' | 'blur' | 'change' | 'submit' | 'abandon',
    fieldName?: string,
    fieldValueLength?: number,
    timeSpent?: number
  ) {
    const event: FormInteractionEvent = {
      ...this.createBaseEvent('form_interaction'),
      event_type: 'form_interaction',
      data: {
        form_id: formId,
        form_name: formName,
        field_name: fieldName,
        interaction_type: interactionType,
        field_value_length: fieldValueLength,
        time_spent: timeSpent
      }
    };
    this.queueEvent(event);
  }

  /**
   * Log search query
   */
  public logSearchQuery(query: string, searchType: 'bills' | 'members' | 'general', filtersApplied?: Record<string, string>, resultsCount?: number) {
    const event: SearchQueryEvent = {
      ...this.createBaseEvent('search_query'),
      event_type: 'search_query',
      data: {
        query,
        filters_applied: filtersApplied,
        results_count: resultsCount,
        search_type: searchType
      }
    };
    this.queueEvent(event);
  }

  /**
   * Log session start
   */
  public logSessionStart() {
    const event: SessionEvent = {
      ...this.createBaseEvent('session_start'),
      event_type: 'session_start',
      data: {}
    };
    this.queueEvent(event);
  }

  /**
   * Log session end
   */
  public logSessionEnd() {
    const sessionDuration = Date.now() - (this.pageStartTime || Date.now());
    const event: SessionEvent = {
      ...this.createBaseEvent('session_end'),
      event_type: 'session_end',
      data: {
        session_duration: sessionDuration,
        pages_visited: 1, // Could be enhanced to track across pages
        actions_taken: this.eventQueue.length
      }
    };
    this.queueEvent(event);
  }

  /**
   * Log error
   */
  public logError(errorType: 'javascript' | 'network' | 'api' | 'user_input', errorMessage: string, errorStack?: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium', component?: string) {
    const event: ErrorEvent = {
      ...this.createBaseEvent('error'),
      event_type: 'error',
      data: {
        error_type: errorType,
        error_message: errorMessage,
        error_stack: errorStack,
        component,
        severity
      }
    };
    this.queueEvent(event);
  }

  /**
   * Log feature usage
   */
  public logFeatureUsage(featureName: string, featureCategory: string, usageDuration?: number, interactionCount?: number, success: boolean = true) {
    const event: FeatureUsageEvent = {
      ...this.createBaseEvent('feature_usage'),
      event_type: 'feature_usage',
      data: {
        feature_name: featureName,
        feature_category: featureCategory,
        usage_duration: usageDuration,
        interaction_count: interactionCount,
        success
      }
    };
    this.queueEvent(event);
  }

  /**
   * Log navigation
   */
  public logNavigation(navigationType: 'click' | 'back' | 'forward' | 'external', destination: string, sourceElement?: string) {
    const event: NavigationEvent = {
      ...this.createBaseEvent('navigation'),
      event_type: 'navigation',
      data: {
        navigation_type: navigationType,
        destination,
        source_element: sourceElement
      }
    };
    this.queueEvent(event);
  }

  /**
   * Log scroll depth
   */
  public logScrollDepth(maxDepthPercent: number) {
    const event: ScrollDepthEvent = {
      ...this.createBaseEvent('scroll_depth'),
      event_type: 'scroll_depth',
      data: {
        max_depth_percent: maxDepthPercent,
        page_height: document.body.scrollHeight,
        scroll_time: Date.now() - this.pageStartTime
      }
    };
    this.queueEvent(event);
  }

  /**
   * Log time on page
   */
  public logTimeOnPage() {
    const timeSpent = Date.now() - this.pageStartTime;
    const event: TimeOnPageEvent = {
      ...this.createBaseEvent('time_on_page'),
      event_type: 'time_on_page',
      data: {
        time_spent: timeSpent,
        active_time: timeSpent, // Could be enhanced with actual active time tracking
        interactions_count: this.eventQueue.length
      }
    };
    this.queueEvent(event);
  }

  /**
   * Force flush all pending events
   */
  public async flush() {
    return this.flushEventQueue();
  }
}

// Export singleton instance getter
export const getUserActivityLogger = () => UserActivityLogger.getInstance();