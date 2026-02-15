import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { BillAnalysisParams } from "./billAnalysisParams.js";
import { handleEnhancedBillAnalysis } from "./enhancedBillAnalysisTool.js";
import { CongressApiService } from "../../services/CongressApiService.js";

/**
 * Handle bill analysis tool execution
 * Delegates to the enhanced bill analysis implementation
 */
export async function handleBillAnalysis(
  params: BillAnalysisParams,
  congressApi: CongressApiService
): Promise<CallToolResult> {
  return handleEnhancedBillAnalysis(params, congressApi);
}
