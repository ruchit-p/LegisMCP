import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { CongressApiService } from "../../services/CongressApiService.js";
import { getCurrentCongress } from "../../utils/congress.js";

// MARK: - Tool Constants

export const TOOL_NAME = "list-committees";

export const TOOL_DESCRIPTION = `Browse and search congressional committees by chamber, type, and congress.
Returns committee name, chamber, type, system code, and subcommittee count.

Modes:
- List mode (default): Browse committees with optional chamber/congress filters and name search
- Detail mode (when committeeCode provided): Full committee profile with subcommittees, activity counts, and official website

Tips:
- Use chamber filter to narrow results (house, senate, joint)
- Committee system codes (e.g., "hspw00") can be used with the subresource tool to access bills, reports, or nominations
- Subcommittee codes end with non-zero digits (e.g., "hspw14")`;

export const TOOL_PARAMS = {
  chamber: z.enum(["house", "senate", "joint"]).optional().describe(
    "Filter by chamber: house, senate, or joint"
  ),
  congress: z.number().int().min(100).max(150).optional().describe(
    "Congress number. Defaults to current Congress."
  ),
  query: z.string().optional().describe(
    "Search filter on committee name (case-insensitive, applied locally)"
  ),
  committeeCode: z.string().optional().describe(
    'Get detailed info for a specific committee by system code (e.g., "hspw00")'
  ),
  limit: z.number().int().min(1).max(100).default(20).describe(
    "Maximum number of committees to return (max 100)"
  ),
  offset: z.number().int().min(0).default(0).describe(
    "Number of committees to skip for pagination"
  ),
};

export type ListCommitteesParams = z.infer<z.ZodObject<typeof TOOL_PARAMS>>;

// MARK: - Handler

export async function handleListCommittees(
  args: ListCommitteesParams,
  congressApi: CongressApiService,
): Promise<CallToolResult> {
  try {
    // Detail mode: fetch a specific committee by code
    if (args.committeeCode) {
      return await handleCommitteeDetail(args.committeeCode, congressApi);
    }

    // List mode: browse/search committees
    return await handleCommitteeList(args, congressApi);
  } catch (error) {
    return {
      content: [{
        type: "text" as const,
        text: `Failed to list committees: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}

// MARK: - Detail Mode

async function handleCommitteeDetail(
  committeeCode: string,
  congressApi: CongressApiService,
): Promise<CallToolResult> {
  // Infer chamber from the committee code prefix (h=house, s=senate, j=joint)
  const prefix = committeeCode.charAt(0).toLowerCase();
  let chamber: string;
  if (prefix === 'h') chamber = 'house';
  else if (prefix === 's') chamber = 'senate';
  else if (prefix === 'j') chamber = 'joint';
  else {
    return {
      content: [{
        type: "text" as const,
        text: `Unable to determine chamber from committee code "${committeeCode}". Codes start with h (House), s (Senate), or j (Joint).`,
      }],
      isError: true,
    };
  }

  const data = await congressApi.getCommitteeDetail({ chamber, committeeCode });
  const committee = data.committee || data;

  // The detail endpoint doesn't return name/chamber at top level —
  // derive the display name from history (most recent entry) or system code
  const history = committee.history?.item || committee.history || [];
  const currentName = history.length > 0
    ? (history[0].officialName || history[0].name || committeeCode)
    : committeeCode;

  let content = `## Committee: ${committee.name || currentName}\n\n`;
  content += `| Field | Value |\n|-------|-------|\n`;
  content += `| System Code | ${committee.systemCode || committeeCode} |\n`;
  content += `| Chamber | ${formatChamber(chamber)} |\n`;
  content += `| Type | ${committee.type || 'N/A'} |\n`;
  content += `| Active | ${committee.isCurrent ?? 'N/A'} |\n`;

  if (committee.committeeWebsiteUrl) {
    content += `| Official Website | ${committee.committeeWebsiteUrl} |\n`;
  }
  content += '\n';

  // Subcommittees
  const subcommittees = committee.subcommittees?.item || committee.subcommittees || [];
  if (subcommittees.length > 0) {
    content += `### Subcommittees (${subcommittees.length})\n\n`;
    subcommittees.forEach((sub: any) => {
      const subName = sub.name || 'Unknown';
      const subCode = sub.systemCode || '';
      content += `- **${subName}** (${subCode})\n`;
    });
    content += '\n';
  }

  // Sub-resource counts (bills, reports, nominations, communications)
  const sections = [
    { key: 'bills', label: 'Bills Referred' },
    { key: 'reports', label: 'Committee Reports' },
    { key: 'nominations', label: 'Nominations' },
    { key: 'houseCommunications', label: 'House Communications' },
    { key: 'senateCommunications', label: 'Senate Communications' },
  ];

  const activityParts: string[] = [];
  for (const { key, label } of sections) {
    const section = committee[key];
    if (section && section.count != null) {
      activityParts.push(`${label}: ${section.count}`);
    }
  }

  if (activityParts.length > 0) {
    content += `### Activity Counts\n\n`;
    activityParts.forEach(part => { content += `- ${part}\n`; });
    content += '\n';
  }

  // History (reuse the history array from above)
  if (history.length > 0) {
    content += `### Name History\n\n`;
    history.forEach((entry: any) => {
      const name = entry.officialName || entry.name || 'Unknown';
      const start = entry.startDate ? entry.startDate.split('T')[0] : '?';
      const end = entry.endDate ? entry.endDate.split('T')[0] : 'present';
      content += `- ${name} (${start} to ${end})\n`;
    });
    content += '\n';
  }

  content += `---\n`;
  content += `*Use the \`subresource\` tool with \`congress-gov:/committee/${chamber}/${committeeCode}\` to access bills, reports, or nominations for this committee.*\n`;

  return { content: [{ type: "text" as const, text: content }] };
}

// MARK: - List Mode

async function handleCommitteeList(
  args: ListCommitteesParams,
  congressApi: CongressApiService,
): Promise<CallToolResult> {
  const data = await congressApi.getCommitteeList({
    chamber: args.chamber,
    congress: args.congress,
    limit: args.query ? 250 : args.limit, // fetch more when filtering locally
    offset: args.query ? 0 : args.offset,
  });

  let committees = data.committees || [];

  // Apply local name filter if query provided
  if (args.query) {
    const q = args.query.toLowerCase();
    committees = committees.filter((c: any) =>
      (c.name || '').toLowerCase().includes(q)
    );
    // Apply pagination after local filtering
    committees = committees.slice(args.offset, args.offset + args.limit);
  }

  const congress = args.congress ?? getCurrentCongress();
  let content = `## Congressional Committees`;
  if (args.chamber) content += ` — ${formatChamber(args.chamber)}`;
  if (args.congress) content += ` (${congress}th Congress)`;
  if (args.query) content += ` matching "${args.query}"`;
  content += `\n\nFound ${committees.length} committee(s):\n\n`;

  committees.forEach((c: any, i: number) => {
    const name = c.name || 'Unknown Committee';
    const chamber = formatChamber(c.chamber);
    const type = c.committeeTypeCode || c.type || '';
    const code = c.systemCode || '';

    content += `${args.offset + i + 1}. **${name}**\n`;
    content += `   Chamber: ${chamber}`;
    if (type) content += ` | Type: ${type}`;
    content += ` | Code: \`${code}\`\n`;

    // Show subcommittee count if available
    const subs = c.subcommittees?.item || c.subcommittees;
    if (Array.isArray(subs) && subs.length > 0) {
      content += `   Subcommittees: ${subs.length}\n`;
    }
    content += '\n';
  });

  if (committees.length === args.limit) {
    content += `Showing ${args.offset + 1}-${args.offset + committees.length}. `;
    content += `Use offset=${args.offset + args.limit} for more.\n`;
  }

  content += `\n*Use committeeCode parameter for detailed info, or the \`subresource\` tool for bills/reports/nominations.*\n`;

  return { content: [{ type: "text" as const, text: content }] };
}

// MARK: - Helpers

/**
 * Format chamber string to title case
 */
function formatChamber(chamber: string | undefined): string {
  if (!chamber) return 'N/A';
  return chamber.charAt(0).toUpperCase() + chamber.slice(1).toLowerCase();
}
