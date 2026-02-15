import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CongressApiService } from "../services/CongressApiService.js";

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
  handleTrendingBills
} from "./trending/trendingBillsTool.js";

// Import comprehensive member tools
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
  TOOL_NAME as SUBRESOURCE_NAME,
  TOOL_DESCRIPTION as SUBRESOURCE_DESC,
  TOOL_PARAMS as SUBRESOURCE_PARAMS,
  handleSubresource
} from "./subresource/subresourceTool.js";

// Import new tools
import {
  TOOL_NAME as LIST_HOUSE_VOTES_NAME,
  TOOL_DESCRIPTION as LIST_HOUSE_VOTES_DESC,
  TOOL_PARAMS as LIST_HOUSE_VOTES_PARAMS,
  handleListHouseVotes
} from "./votes/listHouseVotes.js";

import {
  TOOL_NAME as LIST_ENACTED_LAWS_NAME,
  TOOL_DESCRIPTION as LIST_ENACTED_LAWS_DESC,
  TOOL_PARAMS as LIST_ENACTED_LAWS_PARAMS,
  handleListEnactedLaws
} from "./bills/listEnactedLaws.js";

import {
  TOOL_NAME as CONGRESS_SUMMARY_NAME,
  TOOL_DESCRIPTION as CONGRESS_SUMMARY_DESC,
  TOOL_PARAMS as CONGRESS_SUMMARY_PARAMS,
  handleCongressSummary
} from "./summary/congressSummaryTool.js";

// Import new domain tools
import {
  TOOL_NAME as LIST_COMMITTEES_NAME,
  TOOL_DESCRIPTION as LIST_COMMITTEES_DESC,
  TOOL_PARAMS as LIST_COMMITTEES_PARAMS,
  handleListCommittees
} from "./committees/listCommittees.js";

import {
  TOOL_NAME as LIST_NOMINATIONS_NAME,
  TOOL_DESCRIPTION as LIST_NOMINATIONS_DESC,
  TOOL_PARAMS as LIST_NOMINATIONS_PARAMS,
  handleListNominations
} from "./nominations/listNominations.js";

import {
  TOOL_NAME as LIST_HEARINGS_NAME,
  TOOL_DESCRIPTION as LIST_HEARINGS_DESC,
  TOOL_PARAMS as LIST_HEARINGS_PARAMS,
  handleListHearings
} from "./hearings/listHearings.js";

import {
  TOOL_NAME as RECENT_SUMMARIES_NAME,
  TOOL_DESCRIPTION as RECENT_SUMMARIES_DESC,
  TOOL_PARAMS as RECENT_SUMMARIES_PARAMS,
  handleRecentSummaries
} from "./summaries/recentSummaries.js";

import {
  TOOL_NAME as DAILY_RECORD_NAME,
  TOOL_DESCRIPTION as DAILY_RECORD_DESC,
  TOOL_PARAMS as DAILY_RECORD_PARAMS,
  handleDailyCongressionalRecord
} from "./record/dailyCongressionalRecord.js";

/**
 * Register all MCP tools with the server
 * @param server - The MCP server instance
 * @param congressApi - CongressApiService instance for direct API access
 */
export function registerTools(server: McpServer, congressApi: CongressApiService) {
  // Register the bill analysis tool
  server.tool(
    BILL_ANALYSIS_NAME,
    BILL_ANALYSIS_DESC,
    BILL_ANALYSIS_PARAMS,
    async (args: any) => {
      return handleBillAnalysis(args, congressApi);
    }
  );

  // Register list recent bills tool
  server.tool(
    LIST_RECENT_BILLS_NAME,
    LIST_RECENT_BILLS_DESC,
    LIST_RECENT_BILLS_PARAMS,
    async (args: any) => {
      return handleListRecentBills(args, congressApi);
    }
  );

  // Register get bill tool
  server.tool(
    GET_BILL_NAME,
    GET_BILL_DESC,
    GET_BILL_PARAMS,
    async (args: any) => {
      return handleGetBill(args, congressApi);
    }
  );

  // Register trending bills tool
  server.tool(
    "trending-bills",
    "List recently active congressional bills with sub-resource data. Returns raw data sorted by latest update date.",
    {
      timeframe: z.enum(["week", "month", "quarter", "year"]).optional().default("month").describe("Time period to look back for recent activity"),
      limit: z.number().min(1).max(50).optional().default(10).describe("Maximum number of results to return"),
      congress: z.number().optional().describe("Specific Congress number to search")
    },
    async (args: any) => {
      return handleTrendingBills(args, congressApi);
    }
  );

  // Register comprehensive member tools
  server.tool(
    MEMBER_DETAILS_NAME,
    MEMBER_DETAILS_DESC,
    MEMBER_DETAILS_PARAMS,
    async (args: any) => {
      return handleMemberDetails(args, congressApi);
    }
  );

  server.tool(
    MEMBER_SEARCH_NAME,
    MEMBER_SEARCH_DESC,
    MEMBER_SEARCH_PARAMS,
    async (args: any) => {
      return handleMemberSearch(args, congressApi);
    }
  );

  // Register subresource tool
  server.tool(
    SUBRESOURCE_NAME,
    SUBRESOURCE_DESC,
    SUBRESOURCE_PARAMS,
    async (args: any) => {
      return handleSubresource(args, congressApi);
    }
  );

  // Register House votes tool
  server.tool(
    LIST_HOUSE_VOTES_NAME,
    LIST_HOUSE_VOTES_DESC,
    LIST_HOUSE_VOTES_PARAMS,
    async (args: any) => {
      return handleListHouseVotes(args, congressApi);
    }
  );

  // Register enacted laws tool
  server.tool(
    LIST_ENACTED_LAWS_NAME,
    LIST_ENACTED_LAWS_DESC,
    LIST_ENACTED_LAWS_PARAMS,
    async (args: any) => {
      return handleListEnactedLaws(args, congressApi);
    }
  );

  // Register congress summary tool
  server.tool(
    CONGRESS_SUMMARY_NAME,
    CONGRESS_SUMMARY_DESC,
    CONGRESS_SUMMARY_PARAMS,
    async (args: any) => {
      return handleCongressSummary(args, congressApi);
    }
  );

  // MARK: - New Domain Tools

  // Register committees tool
  server.tool(
    LIST_COMMITTEES_NAME,
    LIST_COMMITTEES_DESC,
    LIST_COMMITTEES_PARAMS,
    async (args: any) => {
      return handleListCommittees(args, congressApi);
    }
  );

  // Register nominations tool
  server.tool(
    LIST_NOMINATIONS_NAME,
    LIST_NOMINATIONS_DESC,
    LIST_NOMINATIONS_PARAMS,
    async (args: any) => {
      return handleListNominations(args, congressApi);
    }
  );

  // Register hearings tool
  server.tool(
    LIST_HEARINGS_NAME,
    LIST_HEARINGS_DESC,
    LIST_HEARINGS_PARAMS,
    async (args: any) => {
      return handleListHearings(args, congressApi);
    }
  );

  // Register recent summaries tool
  server.tool(
    RECENT_SUMMARIES_NAME,
    RECENT_SUMMARIES_DESC,
    RECENT_SUMMARIES_PARAMS,
    async (args: any) => {
      return handleRecentSummaries(args, congressApi);
    }
  );

  // Register daily Congressional Record tool
  server.tool(
    DAILY_RECORD_NAME,
    DAILY_RECORD_DESC,
    DAILY_RECORD_PARAMS,
    async (args: any) => {
      return handleDailyCongressionalRecord(args, congressApi);
    }
  );
}
