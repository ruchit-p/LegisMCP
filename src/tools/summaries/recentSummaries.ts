import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { CongressApiService } from "../../services/CongressApiService.js";
import { stripHtml, truncateText } from "../../utils/html.js";

// MARK: - Tool Constants

export const TOOL_NAME = "recent-summaries";

export const TOOL_DESCRIPTION = `Get recently published CRS (Congressional Research Service) bill summaries.
Returns a curated feed of bills that analysts have recently summarized, with plain-text summary excerpts.

This is different from getting summaries for a specific bill — this endpoint surfaces what CRS is actively analyzing across all legislation.

Notes:
- Defaults to summaries published in the last 7 days
- Use fromDateTime/toDateTime for custom date ranges
- Summary text is stripped of HTML and truncated for readability
- Use get-bill or analyze-bill for the full summary of a specific bill`;

export const TOOL_PARAMS = {
  congress: z.number().int().min(100).max(150).optional().describe(
    "Filter by Congress number"
  ),
  billType: z.enum(["hr", "s", "hjres", "sjres", "hconres", "sconres", "hres", "sres"]).optional().describe(
    "Filter by bill type (e.g., hr for House bills, s for Senate bills)"
  ),
  fromDateTime: z.string().optional().describe(
    "Start of date range in ISO 8601 format (e.g., 2025-01-01T00:00:00Z). Defaults to 7 days ago."
  ),
  toDateTime: z.string().optional().describe(
    "End of date range in ISO 8601 format (e.g., 2025-12-31T23:59:59Z)"
  ),
  limit: z.number().int().min(1).max(50).default(20).describe(
    "Maximum number of summaries to return (max 50)"
  ),
  offset: z.number().int().min(0).default(0).describe(
    "Number of summaries to skip for pagination"
  ),
};

export type RecentSummariesParams = z.infer<z.ZodObject<typeof TOOL_PARAMS>>;

// MARK: - Version Code Mapping
// Maps CRS version codes to human-readable action descriptions

const VERSION_CODE_MAP: Record<string, string> = {
  '00': 'Introduced',
  '01': 'Reported to Senate with amendment(s)',
  '07': 'Reported to House',
  '08': 'Reported to House, Part I',
  '17': 'Reported to House with amendment(s)',
  '25': 'Reported to Senate',
  '35': 'Passed Senate amended',
  '36': 'Passed House amended',
  '49': 'Public Law',
  '53': 'Passed House',
  '55': 'Passed Senate',
  '59': 'House agreed to Senate amendment',
  '74': 'Senate agreed to House amendment',
  '77': 'Discharged from House committee',
  '78': 'Discharged from Senate committee',
  '79': 'Reported to House without amendment',
  '80': 'Reported to Senate without amendment',
  '81': 'Passed House without amendment',
  '82': 'Passed Senate without amendment',
};

// MARK: - Handler

export async function handleRecentSummaries(
  args: RecentSummariesParams,
  congressApi: CongressApiService,
): Promise<CallToolResult> {
  try {
    // Default fromDateTime to 7 days ago if not specified
    // Strip milliseconds — Congress.gov API requires YYYY-MM-DDTHH:MM:SSZ format
    const fromDateTime = stripMilliseconds(args.fromDateTime || getDefaultFromDate());
    const toDateTime = args.toDateTime ? stripMilliseconds(args.toDateTime) : undefined;

    const data = await congressApi.getSummaries({
      congress: args.congress,
      billType: args.billType,
      fromDateTime,
      toDateTime,
      limit: args.limit,
      offset: args.offset,
    });

    const summaries = data.summaries || [];

    let content = `## Recently Published Bill Summaries\n\n`;
    content += `Period: ${formatDateRange(fromDateTime, args.toDateTime)}`;
    if (args.congress) content += ` | Congress: ${args.congress}th`;
    if (args.billType) content += ` | Type: ${args.billType.toUpperCase()}`;
    content += `\n\nFound ${summaries.length} summary(ies):\n\n`;

    summaries.forEach((s: any, i: number) => {
      const bill = s.bill || {};
      const billType = (bill.type || '').toUpperCase();
      const billNum = bill.number || '?';
      const billTitle = bill.title || 'Untitled';
      const congress = bill.congress || '';

      // Action info
      const actionDesc = s.actionDesc || getVersionDescription(s.versionCode) || 'Unknown action';
      const actionDate = s.actionDate || '';
      const chamberLabel = s.currentChamber || '';

      // Summary text — strip HTML and truncate
      const rawText = s.text || '';
      const plainText = stripHtml(rawText);
      const excerpt = truncateText(plainText, 500);

      content += `${args.offset + i + 1}. **${billType} ${billNum}** — ${billTitle}\n`;
      content += `   Congress: ${congress}th`;
      if (chamberLabel) content += ` | Chamber: ${chamberLabel}`;
      content += '\n';
      content += `   Action: ${actionDesc}`;
      if (actionDate) content += ` (${actionDate})`;
      content += '\n';

      if (excerpt) {
        content += `   Summary: ${excerpt}\n`;
      }

      // Last updated
      if (s.updateDate) {
        content += `   Updated: ${s.updateDate.split('T')[0]}\n`;
      }

      content += '\n';
    });

    if (summaries.length === args.limit) {
      content += `Showing ${args.offset + 1}-${args.offset + summaries.length}. `;
      content += `Use offset=${args.offset + args.limit} for more.\n`;
    }

    content += `\n*Use \`get-bill\` or \`analyze-bill\` for the full summary and details of a specific bill.*\n`;

    return { content: [{ type: "text" as const, text: content }] };
  } catch (error) {
    return {
      content: [{
        type: "text" as const,
        text: `Failed to fetch recent summaries: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}

// MARK: - Helpers

/**
 * Get a default "from" date 7 days in the past.
 * Congress.gov API requires format: YYYY-MM-DDTHH:MM:SSZ (no milliseconds).
 */
function getDefaultFromDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return stripMilliseconds(d.toISOString());
}

/**
 * Strip milliseconds from an ISO 8601 datetime string.
 * Congress.gov API rejects timestamps with milliseconds.
 * Converts "2026-02-08T07:14:40.521Z" → "2026-02-08T07:14:40Z"
 */
function stripMilliseconds(isoString: string): string {
  return isoString.replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Look up human-readable description for a CRS version code
 */
function getVersionDescription(code: string | undefined): string {
  if (!code) return '';
  return VERSION_CODE_MAP[code] || `Version ${code}`;
}

/**
 * Format a date range for display
 */
function formatDateRange(from: string, to?: string): string {
  const fromDate = from.split('T')[0];
  const toDate = to ? to.split('T')[0] : 'now';
  return `${fromDate} to ${toDate}`;
}
