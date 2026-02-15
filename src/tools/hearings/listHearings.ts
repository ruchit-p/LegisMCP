import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { CongressApiService } from "../../services/CongressApiService.js";
import { getCurrentCongress } from "../../utils/congress.js";

// MARK: - Tool Constants

export const TOOL_NAME = "list-hearings";

export const TOOL_DESCRIPTION = `Browse congressional hearings by chamber, congress, and topic.
Returns hearing jacket number, title, chamber, committee, date(s), and transcript links.

Modes:
- List mode (default): Browse hearings with optional chamber filter
- Detail mode (when jacketNumber AND chamber provided): Full hearing details with title, committee(s), dates, and transcript format links

Notes:
- Hearings are identified by jacket numbers (usually 5 digits)
- Detail mode requires both jacketNumber and chamber parameters
- Transcript availability varies; not all hearings have published transcripts`;

export const TOOL_PARAMS = {
  congress: z.number().int().min(100).max(150).optional().describe(
    "Congress number. Defaults to current Congress."
  ),
  chamber: z.enum(["house", "senate"]).optional().describe(
    "Filter by chamber: house or senate"
  ),
  jacketNumber: z.number().int().optional().describe(
    "Get details for a specific hearing by jacket number (requires chamber parameter)"
  ),
  limit: z.number().int().min(1).max(50).default(20).describe(
    "Maximum number of hearings to return (max 50)"
  ),
  offset: z.number().int().min(0).default(0).describe(
    "Number of hearings to skip for pagination"
  ),
};

export type ListHearingsParams = z.infer<z.ZodObject<typeof TOOL_PARAMS>>;

// MARK: - Handler

export async function handleListHearings(
  args: ListHearingsParams,
  congressApi: CongressApiService,
): Promise<CallToolResult> {
  try {
    const congress = args.congress ?? getCurrentCongress();

    // Detail mode: requires both jacketNumber and chamber
    if (args.jacketNumber) {
      if (!args.chamber) {
        return {
          content: [{
            type: "text" as const,
            text: 'The chamber parameter is required when using jacketNumber for hearing details. Please specify chamber as "house" or "senate".',
          }],
          isError: true,
        };
      }
      return await handleHearingDetail(congress, args.chamber, args.jacketNumber, congressApi);
    }

    // List mode
    return await handleHearingList(congress, args, congressApi);
  } catch (error) {
    return {
      content: [{
        type: "text" as const,
        text: `Failed to list hearings: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}

// MARK: - Detail Mode

async function handleHearingDetail(
  congress: number,
  chamber: string,
  jacketNumber: number,
  congressApi: CongressApiService,
): Promise<CallToolResult> {
  const data = await congressApi.getHearingDetail({ congress, chamber, jacketNumber });
  const hearing = data.hearing || data;

  const title = hearing.title || 'Untitled Hearing';
  const citation = hearing.citation || '';
  const chamberLabel = formatChamber(hearing.chamber || chamber);

  let content = `## Hearing: ${title}\n\n`;
  content += `| Field | Value |\n|-------|-------|\n`;
  content += `| Jacket Number | ${hearing.jacketNumber || jacketNumber} |\n`;
  if (citation) content += `| Citation | ${citation} |\n`;
  content += `| Chamber | ${chamberLabel} |\n`;
  content += `| Congress | ${hearing.congress || congress} |\n`;
  if (hearing.number) content += `| Hearing Number | ${hearing.number} |\n`;
  if (hearing.part) content += `| Part | ${hearing.part} |\n`;
  content += '\n';

  // Committees
  const committees = hearing.committees?.item || hearing.committees || [];
  if (committees.length > 0) {
    content += `### Committee(s)\n\n`;
    committees.forEach((c: any) => {
      const name = c.name || 'Unknown';
      const code = c.systemCode || '';
      content += `- **${name}**`;
      if (code) content += ` (\`${code}\`)`;
      content += '\n';
    });
    content += '\n';
  }

  // Dates
  const dates = hearing.dates?.item || hearing.dates || [];
  if (dates.length > 0) {
    content += `### Hearing Date(s)\n\n`;
    dates.forEach((d: any) => {
      const date = d.date || d;
      content += `- ${typeof date === 'string' ? date.split('T')[0] : date}\n`;
    });
    content += '\n';
  }

  // Transcript formats
  const formats = hearing.formats?.item || hearing.formats || [];
  if (formats.length > 0) {
    content += `### Transcript Formats\n\n`;
    formats.forEach((f: any) => {
      const type = f.type || 'Unknown';
      const url = f.url || '';
      content += `- **${type}**`;
      if (url) content += `: ${url}`;
      content += '\n';
    });
    content += '\n';
  }

  // Associated meeting
  if (hearing.associatedMeeting) {
    const meeting = hearing.associatedMeeting;
    if (meeting.eventId) {
      content += `### Associated Committee Meeting\n\n`;
      content += `Event ID: ${meeting.eventId}\n\n`;
    }
  }

  return { content: [{ type: "text" as const, text: content }] };
}

// MARK: - List Mode

async function handleHearingList(
  congress: number,
  args: ListHearingsParams,
  congressApi: CongressApiService,
): Promise<CallToolResult> {
  const data = await congressApi.getHearings({
    congress,
    chamber: args.chamber,
    limit: args.limit,
    offset: args.offset,
  });

  const hearings = data.hearings || [];

  let content = `## Congressional Hearings — ${congress}th Congress`;
  if (args.chamber) content += ` (${formatChamber(args.chamber)})`;
  content += `\n\nFound ${hearings.length} hearing(s):\n\n`;

  hearings.forEach((h: any, i: number) => {
    const jacket = h.jacketNumber || '?';
    const chamberLabel = formatChamber(h.chamber);
    const hearingNum = h.number ? `#${h.number}` : '';
    const updated = h.updateDate ? h.updateDate.split('T')[0] : '';

    content += `${args.offset + i + 1}. **Jacket ${jacket}**`;
    if (hearingNum) content += ` ${hearingNum}`;
    content += ` — ${chamberLabel}`;
    if (h.congress) content += ` (${h.congress}th)`;
    content += '\n';
    if (updated) content += `   Updated: ${updated}\n`;

    // Part info
    if (h.part && h.part !== '0') {
      content += `   Part: ${h.part}\n`;
    }
    content += '\n';
  });

  if (hearings.length === args.limit) {
    content += `Showing ${args.offset + 1}-${args.offset + hearings.length}. `;
    content += `Use offset=${args.offset + args.limit} for more.\n`;
  }

  content += `\n*Use jacketNumber and chamber parameters together for full hearing details including title, committees, and transcripts.*\n`;

  return { content: [{ type: "text" as const, text: content }] };
}

// MARK: - Helpers

/**
 * Format chamber string to title case
 */
function formatChamber(chamber: string | undefined): string {
  if (!chamber) return 'N/A';
  const lower = chamber.toLowerCase();
  if (lower === 'nochamber') return 'Joint/No Chamber';
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
