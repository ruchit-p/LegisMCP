import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { CongressApiService } from "../../services/CongressApiService.js";
import { getCurrentCongress } from "../../utils/congress.js";
import { getVoteAnnotation } from "../../utils/legislation.js";

export const TOOL_NAME = "list-recent-bills";

export const TOOL_DESCRIPTION = `Lists recent congressional bills sorted by date of latest action.
Returns the most recently updated bills from Congress.

Since the Congress.gov API does not support text search, this tool helps you:
- See what bills are currently active in Congress
- Find bills by browsing recent activity
- Get bill identifiers for further analysis`;

export const TOOL_PARAMS = {
  congress: z.number().int().min(100).max(150).optional().describe(
    "Filter by specific congress number (e.g., 119). If omitted, defaults to the current congress."
  ),
  billType: z.string().optional().describe(
    "Filter by bill type: hr, s, hjres, sjres, hconres, sconres, hres, sres"
  ),
  limit: z.number().int().min(1).max(100).default(20).describe(
    "Number of bills to return (max 100)"
  ),
  offset: z.number().int().min(0).default(0).describe(
    "Number of bills to skip for pagination"
  )
};

export type ListRecentBillsParams = z.infer<z.ZodObject<typeof TOOL_PARAMS>>;

export async function handleListRecentBills(
  args: ListRecentBillsParams,
  congressApi: CongressApiService
): Promise<CallToolResult> {
  try {
    const filters: Record<string, string> = {};
    if (args.congress) {
      filters.congress = args.congress.toString();
    } else {
      // Default to current congress to avoid returning ancient bills
      filters.congress = String(getCurrentCongress());
    }
    if (args.billType) {
      filters.billType = args.billType.toLowerCase();
    }

    const data = await congressApi.searchCollection('bill', {
      limit: args.limit,
      offset: args.offset,
      sort: 'updateDate+desc',
      filters
    });

    const bills = data.bills || [];

    // Format the response
    let content = `Found ${bills.length} recent bills`;
    if (args.congress) {
      content += ` from the ${args.congress}th Congress`;
    }
    if (args.billType) {
      content += ` of type ${args.billType.toUpperCase()}`;
    }
    content += ":\n\n";

    bills.forEach((bill: any, index: number) => {
      const billType = (bill.type || bill.billType || '').toUpperCase();
      const billNumber = bill.number || bill.billNumber || '';
      const congress = bill.congress || '';
      content += `${index + 1}. **${billType} ${billNumber}** (${congress}th Congress)\n`;
      content += `   Title: ${bill.title}\n`;
      if (bill.sponsors && bill.sponsors.length > 0) {
        const sponsor = bill.sponsors[0];
        content += `   Sponsor: ${sponsor.fullName || sponsor.firstName + ' ' + sponsor.lastName} (${sponsor.party || '?'}-${sponsor.state || '?'})\n`;
      }
      if (bill.latestAction) {
        const voteNote = getVoteAnnotation(bill.latestAction.text);
        content += `   Latest Action: ${bill.latestAction.text} (${bill.latestAction.actionDate})`;
        if (voteNote) content += ` ${voteNote}`;
        content += '\n';
      }
      if (bill.policyArea) {
        content += `   Policy Area: ${bill.policyArea.name || bill.policyArea}\n`;
      }
      content += `   Bill ID: ${congress}-${billType.toLowerCase()}-${billNumber}\n`;
      content += "\n";
    });

    if (bills.length === args.limit) {
      content += `\nShowing ${args.offset + 1}-${args.offset + bills.length} results. `;
      content += `Use offset=${args.offset + args.limit} to see more.`;
    }

    return {
      content: [{ text: content, type: "text" }],
    };
  } catch (error) {
    return {
      content: [{
        text: `Failed to list recent bills: ${error instanceof Error ? error.message : String(error)}`,
        type: "text"
      }],
      isError: true
    };
  }
}
