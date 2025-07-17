import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export const TOOL_NAME = "list-recent-bills";

export const TOOL_DESCRIPTION = `Lists recent congressional bills sorted by date of latest action.
Returns the most recently updated bills from Congress.

Since the Congress.gov API does not support text search, this tool helps you:
- See what bills are currently active in Congress
- Find bills by browsing recent activity
- Get bill identifiers for further analysis`;

export const TOOL_PARAMS = {
  congress: z.number().int().min(100).max(150).optional().describe(
    "Filter by specific congress number (e.g., 119). If omitted, returns all recent bills."
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
  apiBaseUrl: string,
  accessToken: string
): Promise<CallToolResult> {
  try {
    const params = new URLSearchParams({
      limit: args.limit.toString(),
      offset: args.offset.toString()
    });

    if (args.congress) {
      params.append('congress', args.congress.toString());
    }

    if (args.billType) {
      params.append('type', args.billType);
    }

    const response = await fetch(`${apiBaseUrl}/api/bills?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
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
      content += `${index + 1}. **${bill.billType.toUpperCase()} ${bill.billNumber}** (${bill.congress}th Congress)\n`;
      content += `   Title: ${bill.title}\n`;
      if (bill.sponsor) {
        content += `   Sponsor: ${bill.sponsor.fullName} (${bill.sponsor.party}-${bill.sponsor.state})\n`;
      }
      if (bill.lastAction) {
        content += `   Latest Action: ${bill.lastAction} (${bill.lastActionDate})\n`;
      }
      if (bill.policyArea) {
        content += `   Policy Area: ${bill.policyArea}\n`;
      }
      content += `   Bill ID: ${bill.congress}-${bill.billType}-${bill.billNumber}\n`;
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