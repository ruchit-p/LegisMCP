import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { CongressApiService } from "../../services/CongressApiService.js";
import { getCurrentCongress } from "../../utils/congress.js";

export const TOOL_NAME = "list-house-votes";

export const TOOL_DESCRIPTION = `List recent House of Representatives roll call votes.
Returns vote results with roll call number, date, result, and related legislation.

Notes:
- Only House votes are available (the Congress.gov API does not have a Senate vote endpoint)
- Data available for 118th Congress (2023-2024) onward
- Each vote includes the question, result, and total count by party when available`;

export const TOOL_PARAMS = {
  congress: z.number().int().min(118).max(150).optional().describe(
    "Congress number (min 118). Defaults to current Congress."
  ),
  session: z.number().int().min(1).max(2).optional().describe(
    "Session number (1 or 2). If omitted, returns votes from both sessions."
  ),
  limit: z.number().int().min(1).max(50).default(20).describe(
    "Maximum number of votes to return (max 50)"
  ),
  offset: z.number().int().min(0).default(0).describe(
    "Number of votes to skip for pagination"
  ),
};

export type ListHouseVotesParams = z.infer<z.ZodObject<typeof TOOL_PARAMS>>;

export async function handleListHouseVotes(
  args: ListHouseVotesParams,
  congressApi: CongressApiService,
): Promise<CallToolResult> {
  try {
    const congress = args.congress ?? getCurrentCongress();

    if (congress < 118) {
      return {
        content: [{
          type: "text" as const,
          text: "House vote data is only available for the 118th Congress (2023-2024) onward.",
        }],
        isError: true,
      };
    }

    const data = await congressApi.getHouseVotes({
      congress,
      session: args.session,
      limit: args.limit,
      offset: args.offset,
    });

    const votes = data.houseRollCallVotes || data.houseVotes || data.votes || [];

    let content = `## House Roll Call Votes — ${congress}th Congress`;
    if (args.session) content += `, Session ${args.session}`;
    content += `\n\nFound ${votes.length} vote(s):\n\n`;

    votes.forEach((vote: any, i: number) => {
      const rollCall = vote.rollCallNumber || vote.rollNumber || '?';
      const date = vote.startDate || vote.date || vote.actionDate || 'Unknown date';
      const question = vote.question || vote.voteType || vote.title || 'No question text';
      const result = vote.result || 'Unknown';

      content += `${args.offset + i + 1}. **Roll Call #${rollCall}** — ${date}\n`;
      content += `   Type: ${question}\n`;
      content += `   Result: ${result}\n`;

      // The API nests legislation info differently depending on the response shape
      const legType = vote.legislationType || vote.bill?.type || '';
      const legNum = vote.legislationNumber || vote.bill?.number || '';
      if (legType || legNum) {
        content += `   Legislation: ${legType.toUpperCase()} ${legNum}`;
        if (vote.bill?.title) content += ` — ${vote.bill.title}`;
        content += '\n';
      }

      if (vote.totals || vote.yea || vote.nay) {
        const totals = vote.totals || {};
        const yea = totals.yea ?? vote.yea ?? '?';
        const nay = totals.nay ?? vote.nay ?? '?';
        const present = totals.present ?? vote.present;
        const notVoting = totals.notVoting ?? vote.notVoting;
        content += `   Tally: Yea ${yea} — Nay ${nay}`;
        if (present != null) content += ` — Present ${present}`;
        if (notVoting != null) content += ` — Not Voting ${notVoting}`;
        content += '\n';
      }
      content += '\n';
    });

    if (votes.length === args.limit) {
      content += `Showing ${args.offset + 1}-${args.offset + votes.length}. `;
      content += `Use offset=${args.offset + args.limit} for more.`;
    }

    return { content: [{ type: "text" as const, text: content }] };
  } catch (error) {
    return {
      content: [{
        type: "text" as const,
        text: `Failed to list House votes: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}
