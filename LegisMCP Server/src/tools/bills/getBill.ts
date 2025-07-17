import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export const TOOL_NAME = "get-bill";

export const TOOL_DESCRIPTION = `Gets detailed information about a specific congressional bill.
Requires the congress number, bill type, and bill number.

Use this tool when you know the exact bill identifier and need:
- Full bill details including title, summary, and status
- Sponsor information
- Latest actions
- Committee assignments
- Direct link to Congress.gov`;

export const TOOL_PARAMS = {
  congress: z.number().int().min(100).max(150).describe(
    "REQUIRED: Congress number (e.g., 119 for 119th Congress)"
  ),
  billType: z.string().describe(
    "REQUIRED: Bill type (hr, s, hjres, sjres, hconres, sconres, hres, sres)"
  ),
  billNumber: z.number().int().min(1).describe(
    "REQUIRED: Bill number (e.g., 1234)"
  )
};

export type GetBillParams = z.infer<z.ZodObject<typeof TOOL_PARAMS>>;

export async function handleGetBill(
  args: GetBillParams,
  apiBaseUrl: string,
  accessToken: string
): Promise<CallToolResult> {
  try {
    const response = await fetch(
      `${apiBaseUrl}/api/bills/${args.congress}/${args.billType}/${args.billNumber}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return {
          content: [{ 
            text: `Bill not found: ${args.billType.toUpperCase()} ${args.billNumber} from the ${args.congress}th Congress`, 
            type: "text" 
          }],
          isError: true
        };
      }
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    const bill = data.bill;

    // Format the response
    let content = `# ${bill.billType.toUpperCase()} ${bill.billNumber} - ${bill.congress}th Congress\n\n`;
    content += `## ${bill.title}\n\n`;

    // Basic Information
    content += "### Basic Information\n";
    content += `- **Bill Type**: ${bill.billType.toUpperCase()}\n`;
    content += `- **Number**: ${bill.billNumber}\n`;
    content += `- **Congress**: ${bill.congress}th\n`;
    content += `- **Introduced**: ${bill.introducedDate}\n`;
    if (bill.url) {
      content += `- **Congress.gov URL**: ${bill.url}\n`;
    }
    content += "\n";

    // Sponsor
    if (bill.sponsor) {
      content += "### Sponsor\n";
      content += `- **Name**: ${bill.sponsor.fullName}\n`;
      content += `- **Party**: ${bill.sponsor.party}\n`;
      content += `- **State**: ${bill.sponsor.state}\n`;
      if (bill.sponsor.bioguideId) {
        content += `- **Bioguide ID**: ${bill.sponsor.bioguideId}\n`;
      }
      content += "\n";
    }

    // Current Status
    content += "### Current Status\n";
    if (bill.lastAction) {
      content += `- **Latest Action**: ${bill.lastAction}\n`;
      content += `- **Action Date**: ${bill.lastActionDate}\n`;
    }
    content += "\n";

    // Policy Area
    if (bill.policyArea) {
      content += "### Policy Area\n";
      content += `- ${bill.policyArea}\n\n`;
    }

    // Summary
    if (bill.summary) {
      content += "### Summary\n";
      content += bill.summary + "\n\n";
    }

    // Additional Resources
    content += "### Additional Resources\n";
    content += `To get more details about this bill, you can use:\n`;
    content += `- \`analyze-bill\` tool with query "${args.billType}${args.billNumber}" and congress ${args.congress}\n`;
    content += `- \`get-bill-actions\` to see all actions taken\n`;
    content += `- \`get-bill-cosponsors\` to see who supports it\n`;
    content += `- \`get-bill-text\` to read the full text\n`;

    return {
      content: [{ text: content, type: "text" }],
    };
  } catch (error) {
    return {
      content: [{ 
        text: `Failed to get bill details: ${error instanceof Error ? error.message : String(error)}`, 
        type: "text" 
      }],
      isError: true
    };
  }
}