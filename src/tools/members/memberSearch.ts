import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { CongressApiService } from "../../services/CongressApiService.js";
import { getMemberSummary } from "../../utils/member.js";

/**
 * Zod schema for member search parameters
 */
export const memberSearchParamsSchema = z.object({
  query: z.string().optional().describe("Search query for member names"),
  chamber: z.enum(["house", "senate"]).optional().describe("Chamber: 'house' or 'senate'"),
  state: z.string().optional().describe("Two-letter state code (e.g., 'CA', 'TX')"),
  party: z.enum(["D", "R", "I"]).optional().describe("Party: 'D' (Democrat), 'R' (Republican), 'I' (Independent)"),
  currentMember: z.boolean().optional().default(true).describe("Whether to include only current members"),
  congress: z.string().optional().describe("Specific congress number (e.g., '118')"),
  limit: z.number().min(1).max(100).optional().default(20).describe("Maximum number of results to return"),
  offset: z.number().min(0).optional().default(0).describe("Number of results to skip")
});

export type MemberSearchParams = z.infer<typeof memberSearchParamsSchema>;

/**
 * Member search tool with filtering
 */
export class MemberSearchTool {
  constructor(private congressApi: CongressApiService) {}

  /**
   * Search for members with filtering
   */
  async searchMembers(params: MemberSearchParams): Promise<any> {
    try {
      console.error('Searching members', {
        query: params.query,
        chamber: params.chamber,
        state: params.state,
        party: params.party
      });

      // Build search filters
      const filters: Record<string, string> = {};
      if (params.congress) {
        filters.congress = params.congress;
      }
      if (params.currentMember !== undefined) {
        filters.currentMember = params.currentMember.toString();
      }

      // Over-fetch when local filters are active since the API doesn't support them.
      // Also over-fetch when query (name) is provided, since the API ignores the query param
      // for member endpoints and results aren't alphabetical.
      const hasLocalFilters = !!(params.chamber || params.state || params.party || params.query);
      const fetchLimit = hasLocalFilters ? 535 : params.limit;

      // Execute search using CongressApiService — omit query since API ignores it for members
      const searchResult = await this.congressApi.searchCollection('member', {
        limit: fetchLimit,
        offset: params.offset,
        filters
      });

      if (!searchResult.members || searchResult.members.length === 0) {
        return {
          members: [],
          totalCount: 0,
          searchCriteria: this.formatSearchCriteria(params),
          pagination: {
            limit: params.limit,
            offset: params.offset,
            hasMore: false
          },
          metadata: {
            searchedAt: new Date().toISOString(),
            congress: params.congress
          }
        };
      }

      // Filter results based on local criteria (API may not support all filters)
      let filteredMembers = this.applyLocalFilters(searchResult.members, params);

      // Trim to requested limit after local filtering
      filteredMembers = filteredMembers.slice(0, params.limit);

      // Add summaries (no extra API calls needed)
      const membersWithSummaries = filteredMembers.map(member => ({
        ...member,
        summary: this.generateMemberSummary(member)
      }));

      return {
        members: membersWithSummaries,
        totalCount: membersWithSummaries.length,
        searchCriteria: this.formatSearchCriteria(params),
        pagination: {
          limit: params.limit,
          offset: params.offset,
          hasMore: hasLocalFilters ? false : (searchResult.pagination?.next ? true : false)
        },
        metadata: {
          searchedAt: new Date().toISOString(),
          congress: params.congress
        }
      };

    } catch (error) {
      console.error('Error searching members', { error: (error as Error).message });
      throw error;
    }
  }

  // Map two-letter state codes to full state names used by Congress.gov API
  private static STATE_MAP: Record<string, string> = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
    CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
    HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
    KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
    MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
    MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
    NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
    OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
    SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
    VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
    DC: 'District of Columbia', PR: 'Puerto Rico', GU: 'Guam', VI: 'Virgin Islands',
    AS: 'American Samoa', MP: 'Northern Mariana Islands',
  };

  private static PARTY_MAP: Record<string, string> = {
    D: 'Democratic', R: 'Republican', I: 'Independent',
  };

  private static CHAMBER_MAP: Record<string, string> = {
    house: 'House of Representatives', senate: 'Senate',
  };

  /**
   * Apply local filters that may not be supported by API
   */
  private applyLocalFilters(members: any[], params: MemberSearchParams): any[] {
    let filtered = [...members];

    // Name filtering — API ignores query param for member endpoint.
    // API returns names in "Last, First" format (e.g., "Cruz, Ted").
    // Match by checking that all query words appear in at least one name field.
    if (params.query) {
      const queryWords = params.query.toLowerCase().split(/\s+/).filter(Boolean);
      filtered = filtered.filter(member => {
        const nameFields = [
          member.name,
          member.directOrderName,
          member.invertedOrderName,
          member.firstName,
          member.lastName,
          member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : null
        ].filter(Boolean).map((n: string) => n.toLowerCase());
        // All query words must appear in at least one name field
        return queryWords.every(word =>
          nameFields.some(n => n.includes(word))
        );
      });
    }

    if (params.chamber) {
      const chamberFull = MemberSearchTool.CHAMBER_MAP[params.chamber.toLowerCase()] || params.chamber;
      filtered = filtered.filter(member => {
        // Chamber is in terms.item[].chamber
        const terms = member.terms?.item;
        if (!terms || terms.length === 0) return false;
        // Check the most recent term
        const latestTerm = terms[terms.length - 1];
        return latestTerm.chamber?.toLowerCase() === chamberFull.toLowerCase();
      });
    }

    if (params.state) {
      const stateFull = MemberSearchTool.STATE_MAP[params.state.toUpperCase()] || params.state;
      filtered = filtered.filter(member =>
        member.state?.toLowerCase() === stateFull.toLowerCase()
      );
    }

    if (params.party) {
      const partyFull = MemberSearchTool.PARTY_MAP[params.party.toUpperCase()] || params.party;
      filtered = filtered.filter(member =>
        member.partyName?.toLowerCase() === partyFull.toLowerCase()
      );
    }

    return filtered;
  }

  /**
   * Generate member summary
   */
  private generateMemberSummary(member: any): string {
    return getMemberSummary(member);
  }

  /**
   * Format search criteria for display
   */
  private formatSearchCriteria(params: MemberSearchParams): string {
    const criteria = [];

    if (params.query) criteria.push(`Query: "${params.query}"`);
    if (params.chamber) criteria.push(`Chamber: ${params.chamber}`);
    if (params.state) criteria.push(`State: ${params.state}`);
    if (params.party) criteria.push(`Party: ${params.party}`);
    if (params.congress) criteria.push(`Congress: ${params.congress}`);
    if (params.currentMember === false) criteria.push('Including former members');

    return criteria.length > 0 ? criteria.join(', ') : 'No specific criteria';
  }
}

/**
 * Handle member search tool execution
 */
export async function handleMemberSearch(
  params: MemberSearchParams,
  congressApi: CongressApiService
): Promise<CallToolResult> {
  try {
    const tool = new MemberSearchTool(congressApi);
    const result = await tool.searchMembers(params);

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    console.error('Error in handleMemberSearch:', error);

    return {
      content: [{
        type: "text" as const,
        text: `Failed to search members: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

// Export constants for tool registration
export const TOOL_NAME = "member-search";
export const TOOL_DESCRIPTION = `Search for members of Congress with filtering.

Use this tool to find members by name, state, party, or chamber. This is the
starting point for member-related queries like "Who represents Texas?" or
"Find Ted Cruz". Use the returned bioguideId with member-details for full info.

Filtering capabilities:
- Name-based search with partial matching
- Chamber filtering (House/Senate)
- State and party filtering
- Current/former member filtering

Examples:
- Search by name: query = "Pelosi"
- Search by state: state = "CA"
- Search House Republicans: chamber = "house", party = "R"
- Search former members: currentMember = false`;

export const TOOL_PARAMS = {
  query: z.string().optional().describe("Search query for member names"),
  chamber: z.enum(["house", "senate"]).optional().describe("Chamber: 'house' or 'senate'"),
  state: z.string().optional().describe("Two-letter state code (e.g., 'CA', 'TX')"),
  party: z.enum(["D", "R", "I"]).optional().describe("Party: 'D' (Democrat), 'R' (Republican), 'I' (Independent)"),
  currentMember: z.boolean().optional().default(true).describe("Whether to include only current members"),
  congress: z.string().optional().describe("Specific congress number (e.g., '118')"),
  limit: z.number().min(1).max(100).optional().default(20).describe("Maximum number of results to return"),
  offset: z.number().min(0).optional().default(0).describe("Number of results to skip")
};
