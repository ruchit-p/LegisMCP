import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { CongressApiService } from "../../services/CongressApiService.js";
import { getCurrentCongress } from "../../utils/congress.js";
import { isEnactedBill, extractLawNumber } from "../../utils/legislation.js";

export const TOOL_NAME = "list-enacted-laws";

export const TOOL_DESCRIPTION = `List bills that have been enacted into law.
Finds bills signed by the President or that otherwise became law.

Use this to answer questions like:
- What laws were enacted recently?
- What bills became law this Congress?
- What has the President signed lately?`;

export const TOOL_PARAMS = {
  congress: z.number().int().min(100).max(150).optional().describe(
    "Congress number. Defaults to current Congress."
  ),
  timeframe: z.enum(["month", "quarter", "halfyear", "year", "all"]).optional().default("halfyear").describe(
    "How far back to search: month (30d), quarter (90d), halfyear (180d), year (365d), or all"
  ),
  limit: z.number().int().min(1).max(50).default(20).describe(
    "Maximum enacted laws to return (max 50)"
  ),
};

export type ListEnactedLawsParams = z.infer<z.ZodObject<typeof TOOL_PARAMS>>;

const TIMEFRAME_DAYS: Record<string, number | null> = {
  month: 30,
  quarter: 90,
  halfyear: 180,
  year: 365,
  all: null,
};

export async function handleListEnactedLaws(
  args: ListEnactedLawsParams,
  congressApi: CongressApiService,
): Promise<CallToolResult> {
  try {
    const congress = args.congress ?? getCurrentCongress();
    const days = TIMEFRAME_DAYS[args.timeframe || 'halfyear'];

    const filters: Record<string, string> = {
      congress: congress.toString(),
    };

    if (days != null) {
      const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      filters.fromDateTime = from.toISOString().replace(/\.\d{3}Z$/, 'Z');
    }

    // Over-fetch because we filter locally for enacted bills
    const data = await congressApi.searchCollection('bill', {
      limit: 250,
      sort: 'updateDate+desc',
      filters,
    });

    const allBills: any[] = data.bills || [];
    const enacted = allBills.filter(isEnactedBill).slice(0, args.limit);

    let content = `## Enacted Laws — ${congress}th Congress`;
    if (args.timeframe && args.timeframe !== 'all') {
      content += ` (last ${args.timeframe})`;
    }
    content += `\n\nFound ${enacted.length} enacted law(s):\n\n`;

    if (enacted.length === 0) {
      content += 'No enacted laws found for this time period. Try a broader timeframe.\n';
    }

    enacted.forEach((bill: any, i: number) => {
      const billType = (bill.type || bill.billType || '').toUpperCase();
      const billNum = bill.number || bill.billNumber || '';
      const lawNum = extractLawNumber(bill.latestAction?.text || '');

      content += `${i + 1}. **${billType} ${billNum}**`;
      if (lawNum) content += ` — P.L. ${lawNum}`;
      content += '\n';
      content += `   Title: ${bill.title}\n`;

      if (bill.sponsors && bill.sponsors.length > 0) {
        const s = bill.sponsors[0];
        content += `   Sponsor: ${s.fullName || s.firstName + ' ' + s.lastName} (${s.party || '?'}-${s.state || '?'})\n`;
      }

      if (bill.latestAction) {
        content += `   Enacted: ${bill.latestAction.actionDate}\n`;
        content += `   Action: ${bill.latestAction.text}\n`;
      }

      if (bill.policyArea) {
        content += `   Policy Area: ${bill.policyArea.name || bill.policyArea}\n`;
      }

      content += `   Bill ID: ${congress}-${billType.toLowerCase()}-${billNum}\n\n`;
    });

    return { content: [{ type: "text" as const, text: content }] };
  } catch (error) {
    return {
      content: [{
        type: "text" as const,
        text: `Failed to list enacted laws: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}
