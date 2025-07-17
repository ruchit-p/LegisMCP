import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { UserProps } from "../types.js";

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
 * Register all MCP tools with the server
 * @param server - The MCP server instance
 * @param env - Environment variables
 * @param props - User properties including auth tokens
 */
export function registerTools(server: McpServer, env: any, props: UserProps) {
  // All tools now use LegisAPI backend instead of direct Congress.gov API calls
  // Register the bill analysis tool
  server.tool(
    BILL_ANALYSIS_NAME,
    BILL_ANALYSIS_DESC,
    BILL_ANALYSIS_PARAMS,
    async (args: any) => {
      if (!props?.tokenSet?.accessToken) {
        return {
          content: [{ text: "No access token available. Please authenticate first.", type: "text" }],
          isError: true
        };
      }

      return handleBillAnalysis(
        args,
        env.API_BASE_URL,
        props.tokenSet.accessToken
      );
    }
  );

  // Register list recent bills tool
  server.tool(
    LIST_RECENT_BILLS_NAME,
    LIST_RECENT_BILLS_DESC,
    LIST_RECENT_BILLS_PARAMS,
    async (args: any) => {
      if (!props?.tokenSet?.accessToken) {
        return {
          content: [{ text: "No access token available. Please authenticate first.", type: "text" }],
          isError: true
        };
      }

      return handleListRecentBills(
        args,
        env.API_BASE_URL,
        props.tokenSet.accessToken
      );
    }
  );

  // Register get bill tool
  server.tool(
    GET_BILL_NAME,
    GET_BILL_DESC,
    GET_BILL_PARAMS,
    async (args: any) => {
      if (!props?.tokenSet?.accessToken) {
        return {
          content: [{ text: "No access token available. Please authenticate first.", type: "text" }],
          isError: true
        };
      }

      return handleGetBill(
        args,
        env.API_BASE_URL,
        props.tokenSet.accessToken
      );
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
      if (!props?.tokenSet?.accessToken) {
        return {
          content: [{ text: "No access token available. Please authenticate first.", type: "text" }],
          isError: true
        };
      }

      return handleTrendingBills(
        args,
        env.API_BASE_URL,
        props.tokenSet.accessToken
      );
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
      if (!props?.tokenSet?.accessToken) {
        return {
          content: [{ text: "No access token available. Please authenticate first.", type: "text" }],
          isError: true
        };
      }

      return handleCongressQuery(
        args,
        env.API_BASE_URL,
        props.tokenSet.accessToken
      );
    }
  );

  // Register comprehensive member tools
  server.tool(
    MEMBER_DETAILS_NAME,
    MEMBER_DETAILS_DESC,
    MEMBER_DETAILS_PARAMS,
    async (args: any) => {
      if (!props?.tokenSet?.accessToken) {
        return {
          content: [{ text: "No access token available. Please authenticate first.", type: "text" }],
          isError: true
        };
      }

      return handleMemberDetails(
        args,
        env.API_BASE_URL,
        props.tokenSet.accessToken
      );
    }
  );

  server.tool(
    MEMBER_SEARCH_NAME,
    MEMBER_SEARCH_DESC,
    MEMBER_SEARCH_PARAMS,
    async (args: any) => {
      if (!props?.tokenSet?.accessToken) {
        return {
          content: [{ text: "No access token available. Please authenticate first.", type: "text" }],
          isError: true
        };
      }

      return handleMemberSearch(
        args,
        env.API_BASE_URL,
        props.tokenSet.accessToken
      );
    }
  );

  // Register universal search tool
  server.tool(
    UNIVERSAL_SEARCH_NAME,
    UNIVERSAL_SEARCH_DESC,
    UNIVERSAL_SEARCH_PARAMS,
    async (args: any) => {
      if (!props?.tokenSet?.accessToken) {
        return {
          content: [{ text: "No access token available. Please authenticate first.", type: "text" }],
          isError: true
        };
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
      if (!props?.tokenSet?.accessToken) {
        return {
          content: [{ text: "No access token available. Please authenticate first.", type: "text" }],
          isError: true
        };
      }

      return handleSubresource(
        args,
        env.API_BASE_URL,
        props.tokenSet.accessToken
      );
    }
  );

  // Keep essential utility tools
  
  // whoami tool
  server.tool("whoami", "Get the current user's details", {}, async () => ({
    content: [{ text: JSON.stringify(props.claims, null, 2), type: "text" }],
  }));

  // get-usage-stats tool (keep for API monitoring)
  server.tool(
    "get-usage-stats",
    "Get your API usage statistics",
    {
      days: z.number().default(30).describe("Number of days to look back"),
    },
    async (args: any) => {
      try {
        const params = new URLSearchParams();
        if (args.days) params.append("days", args.days.toString());

        if (!props?.tokenSet?.accessToken) {
          throw new Error("No access token available. Please authenticate first.");
        }

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