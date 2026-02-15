import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { CongressApiService } from "../../services/CongressApiService.js";
import { getCurrentCongress } from "../../utils/congress.js";

// MARK: - Tool Constants

export const TOOL_NAME = "list-nominations";

export const TOOL_DESCRIPTION = `Track presidential nominations — judicial, cabinet, and agency positions.
Returns nomination citation, description, receiving date, status, and committee referrals.

Modes:
- List mode (default): Browse nominations with optional civilian/military filter
- Detail mode (when nominationNumber provided): Full nomination profile with nominees, committee referrals, actions timeline, and hearing references

Notes:
- Nominations are identified by PN (Presidential Nomination) numbers (e.g., PN1064)
- Partitioned nominations have a suffix (e.g., PN230-1, PN230-2)
- Military nominations are high-volume; use type filter to focus on civilian nominations for judicial/cabinet picks`;

export const TOOL_PARAMS = {
  congress: z.number().int().min(100).max(150).optional().describe(
    "Congress number. Defaults to current Congress."
  ),
  nominationNumber: z.number().int().optional().describe(
    "Get details for a specific nomination by number (e.g., 1064 for PN1064)"
  ),
  type: z.enum(["civilian", "military"]).optional().describe(
    "Filter by nomination type: civilian (judicial/cabinet/agency) or military"
  ),
  limit: z.number().int().min(1).max(50).default(20).describe(
    "Maximum number of nominations to return (max 50)"
  ),
  offset: z.number().int().min(0).default(0).describe(
    "Number of nominations to skip for pagination"
  ),
};

export type ListNominationsParams = z.infer<z.ZodObject<typeof TOOL_PARAMS>>;

// MARK: - Handler

export async function handleListNominations(
  args: ListNominationsParams,
  congressApi: CongressApiService,
): Promise<CallToolResult> {
  try {
    const congress = args.congress ?? getCurrentCongress();

    // Detail mode: fetch a specific nomination
    if (args.nominationNumber) {
      return await handleNominationDetail(congress, args.nominationNumber, congressApi);
    }

    // List mode: browse nominations
    return await handleNominationList(congress, args, congressApi);
  } catch (error) {
    return {
      content: [{
        type: "text" as const,
        text: `Failed to list nominations: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}

// MARK: - Detail Mode

async function handleNominationDetail(
  congress: number,
  nominationNumber: number,
  congressApi: CongressApiService,
): Promise<CallToolResult> {
  const data = await congressApi.getNominationDetail({ congress, nominationNumber });
  const nom = data.nomination || data;

  const citation = nom.citation || `PN${nominationNumber}`;
  const typeLabel = getNominationType(nom);

  let content = `## Nomination: ${citation} (${congress}th Congress)\n\n`;
  content += `**Description:** ${nom.description || 'N/A'}\n\n`;
  content += `| Field | Value |\n|-------|-------|\n`;
  content += `| Received Date | ${nom.receivedDate || 'N/A'} |\n`;
  content += `| Type | ${typeLabel} |\n`;
  content += `| Privileged | ${nom.isPrivileged ?? 'N/A'} |\n`;
  content += `| List Service | ${nom.isList ?? 'N/A'} |\n`;

  if (nom.executiveCalendarNumber) {
    content += `| Executive Calendar # | ${nom.executiveCalendarNumber} |\n`;
  }
  if (nom.authorityDate) {
    content += `| Authority Date | ${nom.authorityDate} |\n`;
  }
  content += '\n';

  // Nominee positions
  const positions = nom.nomineePositions?.item || nom.positions || [];
  if (positions.length > 0) {
    content += `### Nominee Positions\n\n`;
    positions.forEach((pos: any) => {
      const org = pos.organization || 'N/A';
      const posTitle = pos.positionTitle || pos.name || 'N/A';
      const count = pos.nomineeCount || '';
      content += `- **${posTitle}**\n`;
      content += `  Organization: ${org}`;
      if (count) content += ` | Nominees: ${count}`;
      content += '\n';
    });
    content += '\n';
  }

  // Committee referrals
  const committees = nom.committees;
  if (committees && committees.count > 0) {
    content += `### Committee Referrals (${committees.count})\n\n`;
    // The detail endpoint provides a URL; we note the count
    content += `This nomination has been referred to ${committees.count} committee(s).\n\n`;
  }

  // Actions timeline
  const actions = nom.actions;
  if (actions && actions.count > 0) {
    content += `### Actions Timeline (${actions.count})\n\n`;
    content += `This nomination has ${actions.count} recorded action(s).\n\n`;
  }

  // Latest action (always available at item level)
  if (nom.latestAction) {
    content += `### Latest Action\n\n`;
    content += `**${nom.latestAction.actionDate || 'N/A'}:** ${nom.latestAction.text || 'N/A'}\n`;
    content += `\nStatus: **${deriveStatus(nom.latestAction.text)}**\n\n`;
  }

  // Hearings
  const hearings = nom.hearings;
  if (hearings && hearings.count > 0) {
    content += `### Hearings (${hearings.count})\n\n`;
    content += `${hearings.count} hearing(s) associated with this nomination.\n\n`;
  }

  content += `---\n`;
  content += `*Use the \`subresource\` tool with \`congress-gov:/nomination/${congress}/${nominationNumber}\` to access actions, committees, or hearings.*\n`;

  return { content: [{ type: "text" as const, text: content }] };
}

// MARK: - List Mode

async function handleNominationList(
  congress: number,
  args: ListNominationsParams,
  congressApi: CongressApiService,
): Promise<CallToolResult> {
  // Fetch more when filtering locally by type
  const fetchLimit = args.type ? Math.min(args.limit * 3, 250) : args.limit;
  const fetchOffset = args.type ? 0 : args.offset;

  const data = await congressApi.getNominations({
    congress,
    limit: fetchLimit,
    offset: fetchOffset,
  });

  let nominations = data.nominations || [];

  // Apply local type filter
  if (args.type) {
    nominations = nominations.filter((n: any) => {
      const isCivilian = n.nominationType?.isCivilian === 'True' || n.nominationType?.isCivilian === true;
      return args.type === 'civilian' ? isCivilian : !isCivilian;
    });
    // Paginate after filtering
    nominations = nominations.slice(args.offset, args.offset + args.limit);
  }

  let content = `## Presidential Nominations — ${congress}th Congress`;
  if (args.type) content += ` (${args.type})`;
  content += `\n\nFound ${nominations.length} nomination(s):\n\n`;

  nominations.forEach((n: any, i: number) => {
    const citation = n.citation || `PN${n.number || '?'}`;
    const desc = n.description || 'No description';
    const truncDesc = desc.length > 200 ? desc.slice(0, 200) + '...' : desc;
    const received = n.receivedDate || 'Unknown date';
    const org = n.organization || '';
    const typeLabel = getNominationType(n);

    content += `${args.offset + i + 1}. **${citation}** — ${received}\n`;
    content += `   ${truncDesc}\n`;
    if (org) content += `   Organization: ${org}\n`;
    content += `   Type: ${typeLabel}\n`;

    if (n.latestAction) {
      const status = deriveStatus(n.latestAction.text);
      content += `   Latest Action (${n.latestAction.actionDate || '?'}): ${n.latestAction.text || 'N/A'}`;
      content += ` [**${status}**]\n`;
    }
    content += '\n';
  });

  if (nominations.length === args.limit) {
    content += `Showing ${args.offset + 1}-${args.offset + nominations.length}. `;
    content += `Use offset=${args.offset + args.limit} for more.\n`;
  }

  content += `\n*Use nominationNumber parameter for full details on a specific nomination.*\n`;

  return { content: [{ type: "text" as const, text: content }] };
}

// MARK: - Helpers

/**
 * Get human-readable nomination type from API flags
 */
function getNominationType(nomination: any): string {
  const nomType = nomination.nominationType || nomination;
  const isCivilian = nomType.isCivilian === 'True' || nomType.isCivilian === true;
  const isMilitary = nomType.isMilitary === 'True' || nomType.isMilitary === true;
  if (isCivilian && !isMilitary) return 'Civilian';
  if (isMilitary && !isCivilian) return 'Military';
  if (isCivilian && isMilitary) return 'Civilian/Military';
  return 'Unknown';
}

/**
 * Derive a human-readable status from the latest action text
 */
function deriveStatus(actionText: string | undefined): string {
  if (!actionText) return 'Pending';
  const text = actionText.toLowerCase();
  if (text.includes('confirmed')) return 'Confirmed';
  if (text.includes('withdrawn')) return 'Withdrawn';
  if (text.includes('returned to the president')) return 'Returned to President';
  if (text.includes('reported')) return 'Reported';
  if (text.includes('referred')) return 'Referred to Committee';
  if (text.includes('received')) return 'Received';
  if (text.includes('placed on')) return 'On Calendar';
  return 'Pending';
}
