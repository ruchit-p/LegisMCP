import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { UserProps } from "../types.js";
import { validateUserAuth, createAuthErrorResponse, createUsageLimitErrorResponse, createRateLimitErrorResponse } from "../middlewares/authValidation.js";

// Import comprehensive tool implementations
import { 
  TOOL_NAME as BILL_ANALYSIS_NAME,
  TOOL_DESCRIPTION as BILL_ANALYSIS_DESC,
  TOOL_PARAMS as BILL_ANALYSIS_PARAMS
} from "./analysis/billAnalysisParams.js";
import { handleBillAnalysis } from "./analysis/billAnalysisTool.js";

// Import new bill tools
import {
  TOOL_NAME as LIST_RECENT_BILLS_NAME,
  TOOL_DESCRIPTION as LIST_RECENT_BILLS_DESC,
  TOOL_PARAMS as LIST_RECENT_BILLS_PARAMS,
  handleListRecentBills
} from "./bills/listRecentBills.js";

import {
  TOOL_NAME as GET_BILL_NAME,
  TOOL_DESCRIPTION as GET_BILL_DESC,
  TOOL_PARAMS as GET_BILL_PARAMS,
  handleGetBill
} from "./bills/getBill.js";

// Import trending bills tool
import {
  trendingBillsParamsSchema,
  handleTrendingBills
} from "./trending/trendingBillsTool.js";

// Import congress query tool (omnibox)
import {
  congressQueryParamsSchema,
  handleCongressQuery
} from "./omnibox/congressQueryTool.js";

// Import new comprehensive tools
import {
  TOOL_NAME as MEMBER_DETAILS_NAME,
  TOOL_DESCRIPTION as MEMBER_DETAILS_DESC,
  TOOL_PARAMS as MEMBER_DETAILS_PARAMS,
  handleMemberDetails
} from "./members/memberDetails.js";

import {
  TOOL_NAME as MEMBER_SEARCH_NAME,
  TOOL_DESCRIPTION as MEMBER_SEARCH_DESC,
  TOOL_PARAMS as MEMBER_SEARCH_PARAMS,
  handleMemberSearch
} from "./members/memberSearch.js";

import {
  TOOL_NAME as UNIVERSAL_SEARCH_NAME,
  TOOL_DESCRIPTION as UNIVERSAL_SEARCH_DESC,
  TOOL_PARAMS as UNIVERSAL_SEARCH_PARAMS,
  handleUniversalSearch
} from "./search/universalSearch.js";

import {
  TOOL_NAME as SUBRESOURCE_NAME,
  TOOL_DESCRIPTION as SUBRESOURCE_DESC,
  TOOL_PARAMS as SUBRESOURCE_PARAMS,
  handleSubresource
} from "./subresource/subresourceTool.js";

/**
 * Wrapper function to add authentication validation to all tools
 */
async function withAuthValidation(
  toolHandler: (args: any, apiBaseUrl: string, accessToken: string) => Promise<any>,
  toolName: string,
  args: any,
  env: any,
  props: UserProps
) {
  const startTime = Date.now();
  let toolResult: any;
  let error: Error | null = null;

  // Validate user authentication and usage limits
  const authResult = await validateUserAuth(props, env.API_BASE_URL);
  
  if (!authResult.isAuthenticated) {
    return createAuthErrorResponse(authResult.error || "Authentication failed");
  }
  
  if (!authResult.hasUsageLeft) {
    return createUsageLimitErrorResponse(authResult.user, env.FRONTEND_URL);
  }
  
  try {
    // User is authenticated and has usage left, proceed with tool execution
    toolResult = await toolHandler(args, env.API_BASE_URL, props.tokenSet.accessToken);
    
    // Log successful tool usage to the backend
    const responseTime = Date.now() - startTime;
         await logToolUsage(
       props.tokenSet.accessToken,
       env.API_BASE_URL,
       toolName,
       args,
       toolResult,
       'success',
       responseTime
     );
    
    return toolResult;
  } catch (err) {
    error = err as Error;
    const responseTime = Date.now() - startTime;
    
    // Log failed tool usage to the backend
         await logToolUsage(
       props.tokenSet.accessToken,
       env.API_BASE_URL,
       toolName,
       args,
       null,
       'error',
       responseTime,
       error.message
     );
    
    throw error;
  }
}

/**
 * Log tool usage to the backend MCP logs endpoint
 */
async function logToolUsage(
  accessToken: string,
  apiBaseUrl: string,
  toolName: string,
  requestData: any,
  responseData: any,
  status: 'success' | 'error' | 'timeout',
  responseTimeMs: number,
  errorMessage?: string
) {
  try {
    await fetch(`${apiBaseUrl}/api/mcp/logs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool_name: toolName,
        request_data: requestData,
        response_data: responseData,
        status,
        response_time_ms: responseTimeMs,
        error_message: errorMessage,
        tokens_used: 0 // Could be calculated based on response size
      })
    });
  } catch (logError) {
    // Don't fail the tool execution if logging fails
    console.error('Failed to log tool usage:', logError);
  }
}

/**
 * Register all MCP tools with the server
 * @param server - The MCP server instance
 * @param env - Environment variables
 * @param props - User properties including auth tokens
 */
export async function registerTools(server: McpServer, env: any, props: UserProps) {
  // Check authentication before registering any tools
  // Only authenticated users should see tools available
  const authResult = await validateUserAuth(props, env.API_BASE_URL);
  
  if (!authResult.isAuthenticated) {
    // Don't register any tools if user is not authenticated
    console.log('User not authenticated, no tools will be registered');
    return;
  }
  
  // If user is rate limited, only show the rate limit tool
  if (authResult.isRateLimited) {
    console.log('User is rate limited, showing only rate limit tool');
    server.tool(
      "rate-limit-info",
      "Information about your current rate limit status and how to resolve it",
      {},
      async () => {
        return createRateLimitErrorResponse(authResult.user, env.FRONTEND_URL);
      }
    );
    return;
  }
  
  // If user has no usage left, only show the usage cap tool
  if (!authResult.hasUsageLeft) {
    console.log('User has no usage left, showing only usage cap tool');
    server.tool(
      "usage-cap-info",
      "Information about your API usage limits and upgrade options",
      {},
      async () => {
        return createUsageLimitErrorResponse(authResult.user, env.FRONTEND_URL);
      }
    );
    return;
  }
  
  // All tools now use LegisAPI backend instead of direct Congress.gov API calls
  // Register the bill analysis tool
  server.tool(
    BILL_ANALYSIS_NAME,
    BILL_ANALYSIS_DESC,
    BILL_ANALYSIS_PARAMS,
    async (args: any) => {
      return withAuthValidation(handleBillAnalysis, BILL_ANALYSIS_NAME, args, env, props);
    }
  );

  // Register list recent bills tool
  server.tool(
    LIST_RECENT_BILLS_NAME,
    LIST_RECENT_BILLS_DESC,
    LIST_RECENT_BILLS_PARAMS,
    async (args: any) => {
      return withAuthValidation(handleListRecentBills, "list-recent-bills", args, env, props);
    }
  );

  // Register get bill tool
  server.tool(
    GET_BILL_NAME,
    GET_BILL_DESC,
    GET_BILL_PARAMS,
    async (args: any) => {
      return withAuthValidation(handleGetBill, "get-bill", args, env, props);
    }
  );

  // Register trending bills tool
  server.tool(
    "trending-bills",
    "Get trending congressional bills based on activity, significance, and momentum. Provides comprehensive analysis of the most important current legislation.",
    {
      timeframe: z.enum(["week", "month", "quarter", "year"]).optional().default("month").describe("Time period for analysis"),
      category: z.enum(["all", "passed", "active", "introduced", "bipartisan"]).optional().default("all").describe("Type of bills to analyze"),
      limit: z.number().min(1).max(50).optional().default(10).describe("Maximum number of results to return"),
      congress: z.number().optional().describe("Specific Congress number to search"),
      includeAnalysis: z.boolean().optional().default(true).describe("Whether to include detailed analysis")
    },
    async (args: any) => {
      return withAuthValidation(handleTrendingBills, "trending-bills", args, env, props);
    }
  );

  // Register congress query tool (omnibox)
  server.tool(
    "congress-query",
    `🎯 One-Stop Congressional Research Tool

Ask natural language questions about Congress.gov data and get comprehensive answers automatically.

Examples:
- "What happened to the infrastructure bill?"
- "Show me Nancy Pelosi's recent sponsored legislation"
- "Find all climate change bills from 2023"
- "What committees is Alexandria Ocasio-Cortez on?"

Automatically searches, fetches related data, and provides insights.`,
    {
      query: z.string().min(1).describe("Natural language question about Congress.gov data (bills, members, committees, etc.)"),
      limit: z.number().min(1).max(50).optional().default(5).describe("Maximum number of results to return"),
      includeDetails: z.boolean().optional().default(true).describe("Whether to include detailed sub-resource data")
    },
    async (args: any) => {
      return withAuthValidation(handleCongressQuery, "congress-query", args, env, props);
    }
  );

  // Register comprehensive member tools
  server.tool(
    MEMBER_DETAILS_NAME,
    MEMBER_DETAILS_DESC,
    MEMBER_DETAILS_PARAMS,
    async (args: any) => {
      return withAuthValidation(handleMemberDetails, "member-details", args, env, props);
    }
  );

  server.tool(
    MEMBER_SEARCH_NAME,
    MEMBER_SEARCH_DESC,
    MEMBER_SEARCH_PARAMS,
    async (args: any) => {
      return withAuthValidation(handleMemberSearch, "member-search", args, env, props);
    }
  );

  // Register universal search tool
  server.tool(
    UNIVERSAL_SEARCH_NAME,
    UNIVERSAL_SEARCH_DESC,
    UNIVERSAL_SEARCH_PARAMS,
    async (args: any) => {
      // Validate user auth first
      const authResult = await validateUserAuth(props, env.API_BASE_URL);
      
      if (!authResult.isAuthenticated) {
        return createAuthErrorResponse(authResult.error || "Authentication failed");
      }
      
      if (!authResult.hasUsageLeft) {
        return createUsageLimitErrorResponse(authResult.user, env.FRONTEND_URL);
      }

      // Universal search requires implementation in LegisAPI backend
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            message: "Universal search is not yet implemented in the LegisAPI backend",
            suggestion: "Please use specific search tools: search-bills, member-search, etc.",
            requestedQuery: args.query
          }, null, 2)
        }]
      };
    }
  );

  // Register subresource tool
  server.tool(
    SUBRESOURCE_NAME,
    SUBRESOURCE_DESC,
    SUBRESOURCE_PARAMS,
    async (args: any) => {
      return withAuthValidation(handleSubresource, "subresource", args, env, props);
    }
  );

  // Keep essential utility tools
  
  // whoami tool
  server.tool("whoami", "Get the current user's details", {}, async () => {
    try {
      // Get enhanced user info from API
      const response = await fetch(`${env.API_BASE_URL}/api/me`, {
        headers: {
          Authorization: `Bearer ${props.tokenSet.accessToken}`,
        },
      });

      if (response.ok) {
        const userData = await response.json() as any;
        return {
          content: [{ 
            text: JSON.stringify({
              ...props.claims,
              plan: userData.plan,
              apiCallsCount: userData.api_calls_count,
              apiCallsLimit: userData.api_calls_limit,
              usageRemaining: userData.api_calls_limit === -1 ? 'Unlimited' : 
                             (userData.api_calls_limit - userData.api_calls_count)
            }, null, 2), 
            type: "text" 
          }],
        };
      }
    } catch (error) {
      // Fall back to basic claims if API call fails
      console.warn('Failed to get enhanced user info:', error);
    }
    
    return {
      content: [{ text: JSON.stringify(props.claims, null, 2), type: "text" }],
    };
  });

  // get-usage-stats tool (keep for API monitoring)
  server.tool(
    "get-usage-stats",
    "Get your API usage statistics",
    {
      days: z.number().default(30).describe("Number of days to look back"),
    },
    async (args: any) => {
      // Validate user auth first
      const authResult = await validateUserAuth(props, env.API_BASE_URL);
      
      if (!authResult.isAuthenticated) {
        return createAuthErrorResponse(authResult.error || "Authentication failed");
      }

      try {
        const params = new URLSearchParams();
        if (args.days) params.append("days", args.days.toString());

        const response = await fetch(`${env.API_BASE_URL}/api/usage?${params}`, {
          headers: {
            Authorization: `Bearer ${props.tokenSet.accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`API responded with ${response.status}`);
        }

        const data = await response.json();
        return {
          content: [
            {
              text: JSON.stringify(data, null, 2),
              type: "text",
            },
          ],
        };
      } catch (e) {
        return {
          content: [{ text: `Failed to get usage stats: ${e}`, type: "text" }],
          isError: true
        };
      }
    }
  );
}