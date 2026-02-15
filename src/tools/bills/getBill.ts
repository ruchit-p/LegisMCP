import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { CongressApiService } from "../../services/CongressApiService.js";
import { findVotesInActions } from "../../utils/legislation.js";

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
  congressApi: CongressApiService
): Promise<CallToolResult> {
  try {
    const data = await congressApi.getBillDetails({
      congress: args.congress.toString(),
      billType: args.billType,
      billNumber: args.billNumber.toString()
    });

    const bill = data.bill || data;

    // Format the response
    let content = `# ${(bill.type || bill.billType || args.billType).toUpperCase()} ${bill.number || bill.billNumber || args.billNumber} - ${bill.congress || args.congress}th Congress\n\n`;
    content += `## ${bill.title}\n\n`;

    // Basic Information
    content += "### Basic Information\n";
    content += `- **Bill Type**: ${(bill.type || bill.billType || args.billType).toUpperCase()}\n`;
    content += `- **Number**: ${bill.number || bill.billNumber || args.billNumber}\n`;
    content += `- **Congress**: ${bill.congress || args.congress}th\n`;
    content += `- **Introduced**: ${bill.introducedDate}\n`;
    if (bill.url) {
      content += `- **Congress.gov URL**: ${bill.url}\n`;
    }
    content += "\n";

    // Sponsor
    if (bill.sponsors && bill.sponsors.length > 0) {
      const sponsor = bill.sponsors[0];
      content += "### Sponsor\n";
      content += `- **Name**: ${sponsor.fullName || sponsor.firstName + ' ' + sponsor.lastName}\n`;
      if (sponsor.party) content += `- **Party**: ${sponsor.party}\n`;
      if (sponsor.state) content += `- **State**: ${sponsor.state}\n`;
      if (sponsor.bioguideId) content += `- **Bioguide ID**: ${sponsor.bioguideId}\n`;
      content += "\n";
    }

    // Current Status
    content += "### Current Status\n";
    if (bill.latestAction) {
      content += `- **Latest Action**: ${bill.latestAction.text}\n`;
      content += `- **Action Date**: ${bill.latestAction.actionDate}\n`;
    }
    content += "\n";

    // Policy Area
    if (bill.policyArea) {
      content += "### Policy Area\n";
      content += `- ${bill.policyArea.name || bill.policyArea}\n\n`;
    }

    // Summary
    if (bill.summaries && bill.summaries.length > 0) {
      content += "### Summary\n";
      content += bill.summaries[0].text + "\n\n";
    }

    // Recorded Votes — fetch actions to find vote references
    try {
      const parentUri = `congress-gov:/bill/${args.congress}/${args.billType.toLowerCase()}/${args.billNumber}`;
      const actionsData = await congressApi.getSubResource(parentUri, 'actions', { limit: 100 });
      const recordedVotes = findVotesInActions(actionsData?.actions || []);
      if (recordedVotes.length > 0) {
        content += "### Recorded Votes\n";
        recordedVotes.forEach((v: any) => {
          const chamber = v.chamber || 'Unknown chamber';
          const roll = v.rollNumber ? `Roll #${v.rollNumber}` : 'vote';
          const date = v.date || v.actionDate || '';
          content += `- **${chamber}** ${roll}`;
          if (date) content += ` (${date})`;
          if (v.url) content += ` — [Details](${v.url})`;
          content += '\n';
        });
        content += '\n';
      }
    } catch {
      // Actions fetch failed — skip vote section silently
    }

    // Additional Resources
    content += "### Additional Resources\n";
    content += `To get more details about this bill, you can use:\n`;
    content += `- \`analyze-bill\` tool with query "${args.billType}${args.billNumber}" and congress ${args.congress}\n`;
    content += `- \`subresource\` tool with parentUri "congress-gov:/bill/${args.congress}/${args.billType}/${args.billNumber}" for actions, cosponsors, text, etc.\n`;

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
