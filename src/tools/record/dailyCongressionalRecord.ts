import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { CongressApiService } from "../../services/CongressApiService.js";

// MARK: - Tool Constants

export const TOOL_NAME = "daily-congressional-record";

export const TOOL_DESCRIPTION = `Access the Daily Congressional Record — the official transcript of floor proceedings.
Includes debates, statements, votes, and legislative activity on the House and Senate floors.

Modes:
- List mode (default): Browse recent Congressional Record issues by date
- Issue detail mode (when volumeNumber AND issueNumber provided): View sections (Senate, House, Extensions of Remarks, Daily Digest) with page ranges and text links
- Articles mode (add includeArticles=true to issue detail): View individual articles grouped by section with titles and text links

Notes:
- Volume numbers map roughly to Congress sessions (e.g., volume 171 for the 119th Congress)
- Each issue covers one day of congressional proceedings
- Sections include Senate, House, Extensions of Remarks, and Daily Digest`;

export const TOOL_PARAMS = {
  volumeNumber: z.number().int().optional().describe(
    "Specific volume number. Required with issueNumber for detail mode."
  ),
  issueNumber: z.number().int().optional().describe(
    "Specific issue number. Requires volumeNumber."
  ),
  includeArticles: z.boolean().default(false).describe(
    "When viewing a specific issue, include article listings grouped by section"
  ),
  limit: z.number().int().min(1).max(50).default(20).describe(
    "Maximum number of issues to return in list mode (max 50)"
  ),
  offset: z.number().int().min(0).default(0).describe(
    "Number of issues to skip for pagination"
  ),
};

export type DailyCongressionalRecordParams = z.infer<z.ZodObject<typeof TOOL_PARAMS>>;

// MARK: - Handler

export async function handleDailyCongressionalRecord(
  args: DailyCongressionalRecordParams,
  congressApi: CongressApiService,
): Promise<CallToolResult> {
  try {
    // Issue detail mode: requires both volumeNumber and issueNumber
    if (args.volumeNumber != null && args.issueNumber != null) {
      return await handleIssueDetail(args, congressApi);
    }

    // Validate: issueNumber without volumeNumber is invalid
    if (args.issueNumber != null && args.volumeNumber == null) {
      return {
        content: [{
          type: "text" as const,
          text: "The volumeNumber parameter is required when using issueNumber. Please provide both to view a specific issue.",
        }],
        isError: true,
      };
    }

    // List mode
    return await handleRecordList(args, congressApi);
  } catch (error) {
    return {
      content: [{
        type: "text" as const,
        text: `Failed to access Congressional Record: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}

// MARK: - Issue Detail Mode

async function handleIssueDetail(
  args: DailyCongressionalRecordParams,
  congressApi: CongressApiService,
): Promise<CallToolResult> {
  const volumeNumber = args.volumeNumber!;
  const issueNumber = args.issueNumber!;

  // Fetch issue details
  const data = await congressApi.getCongressionalRecordIssue({
    volumeNumber,
    issueNumber,
  });

  // API response: { issue: { fullIssue: { sections: [...], entireIssue: [...], articles: {...} }, ... } }
  const issue = data.issue || data.dailyCongressionalRecord || data;

  let content = `## Congressional Record — Volume ${volumeNumber}, Issue ${issueNumber}\n\n`;

  // Issue metadata
  const issueDate = issue.issueDate || issue.date || '';
  const congress = issue.congress || '';
  const session = issue.sessionNumber || issue.session || '';

  if (issueDate || congress || session) {
    content += `| Field | Value |\n|-------|-------|\n`;
    if (issueDate) content += `| Date | ${formatDate(issueDate)} |\n`;
    if (congress) content += `| Congress | ${congress}th |\n`;
    if (session) content += `| Session | ${session} |\n`;
    content += '\n';
  }

  // The actual content is nested under issue.fullIssue
  const fullIssue = issue.fullIssue || {};

  // Sections — nested under fullIssue.sections (array)
  const sections = fullIssue.sections || [];
  if (Array.isArray(sections) && sections.length > 0) {
    content += `### Sections\n\n`;
    sections.forEach((s: any) => {
      const name = s.name || 'Unknown Section';
      const startPage = s.startPage || '';
      const endPage = s.endPage || '';
      const pageRange = startPage && endPage ? ` (pp. ${startPage}–${endPage})` : '';

      content += `- **${name}**${pageRange}\n`;

      // Section text formats — array of { type, url, part? }
      const textItems = s.text || [];
      if (Array.isArray(textItems)) {
        textItems.forEach((t: any) => {
          const type = t.type || '';
          const url = t.url || '';
          if (type || url) {
            content += `  - ${type}`;
            if (url) content += `: ${url}`;
            content += '\n';
          }
        });
      }
    });
    content += '\n';
  }

  // Full issue download formats — fullIssue.entireIssue (array of { part, type, url })
  const entireIssue = fullIssue.entireIssue || [];
  if (Array.isArray(entireIssue) && entireIssue.length > 0) {
    content += `### Full Issue Download\n\n`;
    entireIssue.forEach((f: any) => {
      const type = f.type || 'Unknown';
      const url = f.url || '';
      content += `- **${type}**`;
      if (url) content += `: ${url}`;
      content += '\n';
    });
    content += '\n';
  }

  // Article count hint
  const articleInfo = fullIssue.articles;
  if (articleInfo && articleInfo.count) {
    content += `**Articles:** ${articleInfo.count} total`;
    if (!args.includeArticles) {
      content += ` (use includeArticles=true to list them)`;
    }
    content += '\n\n';
  }

  // Articles (if requested)
  if (args.includeArticles) {
    try {
      const articlesData = await congressApi.getCongressionalRecordArticles({
        volumeNumber,
        issueNumber,
      });

      // API shape: { articles: [ { name, sectionArticles: [ { title, startPage, endPage, text: [{type,url}] } ] } ] }
      const articleSections = articlesData.articles || [];

      if (Array.isArray(articleSections) && articleSections.length > 0) {
        content += `### Articles\n\n`;
        articleSections.forEach((section: any) => {
          const sectionName = section.name || 'Unknown Section';
          const sectionArticles = section.sectionArticles || [];

          content += `#### ${sectionName} (${sectionArticles.length} article${sectionArticles.length !== 1 ? 's' : ''})\n\n`;

          if (Array.isArray(sectionArticles) && sectionArticles.length > 0) {
            sectionArticles.forEach((a: any) => {
              const title = a.title || 'Untitled';
              const startPage = a.startPage || '';
              const endPage = a.endPage || '';
              const pageRange = startPage && endPage ? ` (pp. ${startPage}–${endPage})` : '';

              content += `- **${title}**${pageRange}\n`;

              // Article text formats — array of { type, url }
              const textItems = a.text || [];
              if (Array.isArray(textItems)) {
                textItems.forEach((t: any) => {
                  const type = t.type || '';
                  const url = t.url || '';
                  if (type || url) {
                    content += `  - ${type}`;
                    if (url) content += `: ${url}`;
                    content += '\n';
                  }
                });
              }
            });
          } else {
            content += `No articles available for this section.\n`;
          }
          content += '\n';
        });
      } else {
        content += `### Articles\n\nNo articles available for this issue.\n\n`;
      }
    } catch (articleError) {
      content += `### Articles\n\n*Failed to load articles: ${articleError instanceof Error ? articleError.message : String(articleError)}*\n\n`;
    }
  }

  return { content: [{ type: "text" as const, text: content }] };
}

// MARK: - List Mode

async function handleRecordList(
  args: DailyCongressionalRecordParams,
  congressApi: CongressApiService,
): Promise<CallToolResult> {
  const data = await congressApi.getDailyCongressionalRecord({
    limit: args.limit,
    offset: args.offset,
  });

  const issues = data.dailyCongressionalRecord || data.issues || [];

  let content = `## Daily Congressional Record — Recent Issues\n\n`;
  content += `Found ${issues.length} issue(s):\n\n`;

  issues.forEach((issue: any, i: number) => {
    const volume = issue.volumeNumber || issue.volume || '?';
    const issueNum = issue.issueNumber || issue.issue || '?';
    const date = issue.issueDate || issue.date || '';
    const congress = issue.congress || '';
    const session = issue.sessionNumber || issue.session || '';
    const url = issue.url || '';

    content += `${args.offset + i + 1}. **Vol. ${volume}, No. ${issueNum}**`;
    if (date) content += ` — ${formatDate(date)}`;
    content += '\n';

    if (congress || session) {
      content += `   `;
      if (congress) content += `Congress: ${congress}th`;
      if (congress && session) content += ' | ';
      if (session) content += `Session: ${session}`;
      content += '\n';
    }
    if (url) content += `   URL: ${url}\n`;
    content += '\n';
  });

  if (issues.length === args.limit) {
    content += `Showing ${args.offset + 1}-${args.offset + issues.length}. `;
    content += `Use offset=${args.offset + args.limit} for more.\n`;
  }

  content += `\n*Use volumeNumber and issueNumber parameters together for section details. Add includeArticles=true for individual articles.*\n`;

  return { content: [{ type: "text" as const, text: content }] };
}

// MARK: - Helpers

/**
 * Format a date string to a human-readable form (YYYY-MM-DD)
 */
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  // Handle ISO format or plain date strings
  return dateStr.split('T')[0];
}
