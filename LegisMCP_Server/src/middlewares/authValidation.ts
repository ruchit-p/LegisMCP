import type { UserProps } from "../types.js";

export interface AuthValidationResult {
  isAuthenticated: boolean;
  hasUsageLeft: boolean;
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
      error: "No access token available. Please authenticate first."
    };
  }

  try {
    // Check user profile and usage limits
    const response = await fetch(`${apiBaseUrl}/api/me`, {
      headers: {
        Authorization: `Bearer ${props.tokenSet.accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          isAuthenticated: false,
          hasUsageLeft: false,
          error: "Authentication token is invalid or expired. Please re-authenticate."
        };
      }
      if (response.status === 429) {
        return {
          isAuthenticated: true,
          hasUsageLeft: false,
          error: "API quota exceeded. Please upgrade your plan or wait for quota reset."
        };
      }
      return {
        isAuthenticated: false,
        hasUsageLeft: false,
        error: `API responded with status ${response.status}. Please try again later.`
      };
    }

    const userData = await response.json() as any;
    
    // Check if user has usage left (unless enterprise)
    const hasUsageLeft = userData.plan === 'enterprise' || 
                        (userData.api_calls_count < userData.api_calls_limit);
    
    return {
      isAuthenticated: true,
      hasUsageLeft,
      error: hasUsageLeft ? undefined : "API quota exceeded. Please upgrade your plan or wait for quota reset.",
      user: userData
    };
  } catch (error) {
    return {
      isAuthenticated: false,
      hasUsageLeft: false,
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
export function createUsageLimitErrorResponse(user: any) {
  return {
    content: [{ 
      text: JSON.stringify({
        error: "Usage Limit Exceeded",
        message: "You have exceeded your API usage limit for this billing period.",
        currentUsage: user.api_calls_count,
        limit: user.api_calls_limit,
        plan: user.plan,
        suggestion: user.plan === 'free' 
          ? "Consider upgrading to a paid plan for higher limits."
          : "Your usage will reset at the beginning of your next billing period."
      }, null, 2), 
      type: "text" as const 
    }],
    isError: true
  };
}