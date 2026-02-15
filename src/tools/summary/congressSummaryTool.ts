import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { CongressApiService } from "../../services/CongressApiService.js";
import { getCurrentCongress } from "../../utils/congress.js";
import { isEnactedBill, extractLawNumber, hasVoteIndicator } from "../../utils/legislation.js";

export const TOOL_NAME = "congress-summary";

export const TOOL_DESCRIPTION = `Get a high-level summary of current congressional activity.
Provides an overview including recent bill counts, enacted laws, House votes, and floor activity.

Use this to answer broad questions like:
- What's going on in Congress?
- Give me a summary of congressional activity
- What has Congress been doing lately?`;

export const TOOL_PARAMS = {
  congress: z.number().int().min(100).max(150).optional().describe(
    "Congress number. Defaults to current Congress."
  ),
};

export type CongressSummaryParams = z.infer<z.ZodObject<typeof TOOL_PARAMS>>;

const FLOOR_KEYWORDS = /passed|agreed|vote|cloture|veto|signed by president|became public law/i;

export async function handleCongressSummary(
  args: CongressSummaryParams,
  congressApi: CongressApiService,
): Promise<CallToolResult> {
  try {
    const congress = args.congress ?? getCurrentCongress();

    // Compute a 30-day lookback for "recent" bills
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .replace(/\.\d{3}Z$/, 'Z');

    // 3 parallel API calls
    const [recentBillsResult, allBillsResult, houseVotesResult] = await Promise.allSettled([
      congressApi.searchCollection('bill', {
        limit: 50,
        sort: 'updateDate+desc',
        filters: { congress: String(congress), fromDateTime: thirtyDaysAgo },
      }),
      congressApi.searchCollection('bill', {
        limit: 250,
        sort: 'updateDate+desc',
        filters: { congress: String(congress) },
      }),
      // House vote data only available 118th Congress+
      congress >= 118
        ? congressApi.getHouseVotes({ congress, limit: 10 })
        : Promise.resolve(null),
    ]);

    const recentBills: any[] =
      recentBillsResult.status === 'fulfilled'
        ? (recentBillsResult.value?.bills || [])
        : [];

    const allBills: any[] =
      allBillsResult.status === 'fulfilled'
        ? (allBillsResult.value?.bills || [])
        : [];

    const houseVotes: any[] =
      houseVotesResult.status === 'fulfilled' && houseVotesResult.value
        ? (houseVotesResult.value.houseRollCallVotes || houseVotesResult.value.houseVotes || houseVotesResult.value.votes || [])
        : [];

    // Derive data
    const enacted = allBills.filter(isEnactedBill);
    const floorBills = recentBills.filter(
      (b: any) => b.latestAction?.text && FLOOR_KEYWORDS.test(b.latestAction.text),
    );

    // Build response
    let content = `# Congressional Activity Summary — ${congress}th Congress\n\n`;

    // Overview counts
    content += '## Overview\n';
    content += `- **Bills updated (last 30 days):** ${recentBills.length}\n`;
    content += `- **Laws enacted this Congress:** ${enacted.length}\n`;
    if (congress >= 118) {
      content += `- **Recent House roll call votes:** ${houseVotes.length}\n`;
    }
    content += `- **Bills with floor activity (last 30 days):** ${floorBills.length}\n\n`;

    // Enacted laws (top 5)
    if (enacted.length > 0) {
      content += '## Recently Enacted Laws\n';
      enacted.slice(0, 5).forEach((bill: any, i: number) => {
        const bt = (bill.type || bill.billType || '').toUpperCase();
        const bn = bill.number || bill.billNumber || '';
        const lawNum = extractLawNumber(bill.latestAction?.text || '');
        content += `${i + 1}. **${bt} ${bn}**`;
        if (lawNum) content += ` (P.L. ${lawNum})`;
        content += ` — ${bill.title}\n`;
        content += `   Enacted: ${bill.latestAction?.actionDate || 'Unknown'}\n`;
      });
      if (enacted.length > 5) {
        content += `\n_${enacted.length - 5} more enacted laws — use \`list-enacted-laws\` for the full list._\n`;
      }
      content += '\n';
    }

    // House votes (top 5)
    if (houseVotes.length > 0) {
      content += '## Recent House Votes\n';
      houseVotes.slice(0, 5).forEach((vote: any, i: number) => {
        const roll = vote.rollCallNumber || vote.rollNumber || '?';
        const date = vote.startDate || vote.date || vote.actionDate || 'Unknown';
        const question = vote.question || vote.voteType || vote.title || 'Unknown';
        const result = vote.result || 'Unknown';
        content += `${i + 1}. **Roll Call #${roll}** (${date}) — ${result}\n`;
        content += `   ${question}\n`;
        const legType = vote.legislationType || vote.bill?.type || '';
        const legNum = vote.legislationNumber || vote.bill?.number || '';
        if (legType || legNum) {
          content += `   Legislation: ${legType.toUpperCase()} ${legNum}\n`;
        }
      });
      if (houseVotes.length > 5) {
        content += `\n_Use \`list-house-votes\` for more votes._\n`;
      }
      content += '\n';
    }

    // Floor activity (top 5)
    if (floorBills.length > 0) {
      content += '## Recent Floor Activity\n';
      floorBills.slice(0, 5).forEach((bill: any, i: number) => {
        const bt = (bill.type || bill.billType || '').toUpperCase();
        const bn = bill.number || bill.billNumber || '';
        content += `${i + 1}. **${bt} ${bn}** — ${bill.title}\n`;
        content += `   Action: ${bill.latestAction?.text} (${bill.latestAction?.actionDate})\n`;
      });
      if (floorBills.length > 5) {
        content += `\n_${floorBills.length - 5} more — use \`list-recent-bills\` or \`trending-bills\` for details._\n`;
      }
      content += '\n';
    }

    content += `_Data fetched ${new Date().toISOString()}_\n`;

    return { content: [{ type: "text" as const, text: content }] };
  } catch (error) {
    return {
      content: [{
        type: "text" as const,
        text: `Failed to generate Congress summary: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}
