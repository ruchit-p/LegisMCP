import type { UserProps } from "../types.js";

export interface AuthValidationResult {
  isAuthenticated: boolean;
  hasUsageLeft: boolean;
  isRateLimited: boolean;
  error?: string;
  user?: any;
}

/**
 * Validates user authentication and usage limits before MCP tool execution
 */
export async function validateUserAuth(
  props: UserProps,
  apiBaseUrl: string
): Promise<AuthValidationResult> {
  // Check if user has access token
  if (!props?.tokenSet?.accessToken) {
    return {
      isAuthenticated: false,
      hasUsageLeft: false,
      isRateLimited: false,
      error: "No access token available. Please authenticate first."
    };
  }

  try {
    // Check user profile and usage limits with billing cycle awareness
    const response = await fetch(`${apiBaseUrl}/api/me?check_billing_cycle=true`, {
      headers: {
        Authorization: `Bearer ${props.tokenSet.accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          isAuthenticated: false,
          hasUsageLeft: false,
          isRateLimited: false,
          error: "Authentication token is invalid or expired. Please re-authenticate."
        };
      }
      if (response.status === 429) {
        const rateLimitData = await response.json().catch(() => ({}));
        return {
          isAuthenticated: true,
          hasUsageLeft: false,
          isRateLimited: true,
          error: "Rate limit exceeded. Please wait before making more requests.",
          user: rateLimitData
        };
      }
      return {
        isAuthenticated: false,
        hasUsageLeft: false,
        isRateLimited: false,
        error: `API responded with status ${response.status}. Please try again later.`
      };
    }

    const userData = await response.json() as any;
    
    // Check if user has usage left based on their current plan and billing cycle
    // Enterprise users have unlimited usage (-1 limit)
    const hasUsageLeft = userData.mcp_calls_limit === -1 || 
                        (userData.mcp_calls_count < userData.mcp_calls_limit);
    
    return {
      isAuthenticated: true,
      hasUsageLeft,
      isRateLimited: false,
      error: hasUsageLeft ? undefined : "API quota exceeded. Please upgrade your plan or wait for quota reset.",
      user: userData
    };
  } catch (error) {
    return {
      isAuthenticated: false,
      hasUsageLeft: false,
      isRateLimited: false,
      error: `Failed to validate authentication: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Helper function to create error response for MCP tools
 */
export function createAuthErrorResponse(error: string) {
  return {
    content: [{ 
      text: JSON.stringify({
        error: "Authentication Error",
        message: error,
        suggestion: "Please check your authentication status and try again."
      }, null, 2), 
      type: "text" as const 
    }],
    isError: true
  };
}

/**
 * Helper function to create usage limit error response
 */
export function createUsageLimitErrorResponse(user: any, frontendUrl?: string) {
  const dashboardUrl = frontendUrl || "https://legis-mcp.com";
  return {
    content: [{ 
      text: JSON.stringify({
        error: "Usage Limit Exceeded",
        message: "You have exceeded your API usage limit for this billing period.",
        currentUsage: user.mcp_calls_count || user.api_calls_count || 0,
        limit: user.mcp_calls_limit || user.api_calls_limit || 0,
        plan: user.plan || "free",
        billingCycleEnd: user.billing_cycle_end || null,
        daysUntilReset: user.days_until_reset || null,
        usagePercent: user.usage_percent || null,
        suggestion: user.plan === 'free' 
          ? "Consider upgrading to a paid plan for higher limits."
          : "Your usage will reset at the beginning of your next billing period.",
        actions: {
          viewDashboard: `${dashboardUrl}/dashboard`,
          upgradePlan: `${dashboardUrl}/billing`,
          viewUsage: `${dashboardUrl}/dashboard/usage`
        },
        nextSteps: [
          "Visit your dashboard to view detailed usage statistics",
          "Upgrade your plan for higher API limits",
          "Monitor your usage to avoid future interruptions"
        ]
      }, null, 2), 
      type: "text" as const 
    }],
    isError: true
  };
}

/**
 * Helper function to create rate limit error response
 */
export function createRateLimitErrorResponse(user: any, frontendUrl?: string) {
  const dashboardUrl = frontendUrl || "https://legis-mcp.com";
  return {
    content: [{ 
      text: JSON.stringify({
        error: "Rate Limit Exceeded",
        message: "You have exceeded the rate limit for API requests. Please wait before making more requests.",
        suggestion: "Try again in a few minutes or upgrade your plan for higher rate limits.",
        plan: user.plan || "free",
        actions: {
          viewDashboard: `${dashboardUrl}/dashboard`,
          upgradePlan: `${dashboardUrl}/billing`,
          viewUsage: `${dashboardUrl}/dashboard/usage`
        },
        nextSteps: [
          "Wait a few minutes before making more requests",
          "Upgrade your plan for higher rate limits",
          "Monitor your request patterns to avoid rate limiting"
        ],
        retryAfter: "Please wait 1-2 minutes before making another request"
      }, null, 2), 
      type: "text" as const 
    }],
    isError: true
  };
}