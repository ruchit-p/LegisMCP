import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { 
  NotFoundError, 
  AuthenticationError, 
  RateLimitError, 
  ValidationError, 
  ApiError 
} from "../../utils/errors.js";

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
  offset: z.number().min(0).optional().default(0).describe("Number of results to skip"),
  includeDetails: z.boolean().optional().default(false).describe("Whether to include detailed member data")
});

export type MemberSearchParams = z.infer<typeof memberSearchParamsSchema>;

/**
 * Enhanced member search tool with comprehensive filtering
 */
export class MemberSearchTool {
  constructor(
    private apiBaseUrl: string,
    private accessToken: string
  ) {}

  /**
   * Search for members with comprehensive filtering and enhancement
   */
  async searchMembers(params: MemberSearchParams): Promise<any> {
    try {
      console.log('Searching members', { 
        query: params.query,
        chamber: params.chamber,
        state: params.state,
        party: params.party
      });

      // Build search parameters
      const searchParams = {
        query: params.query,
        limit: params.limit,
        offset: params.offset,
        filters: this.buildSearchFilters(params)
      };

      // Execute search using LegisAPI backend
      const searchResult = await this.makeApiRequest(
        `/api/members?${this.buildQueryString(searchParams)}`
      );

      if (!searchResult.members || searchResult.members.length === 0) {
        return {
          members: [],
          totalCount: 0,
          message: "No members found matching your criteria",
          searchCriteria: this.formatSearchCriteria(params),
          suggestions: this.generateSearchSuggestions(params)
        };
      }

      // Filter results based on local criteria (API may not support all filters)
      const filteredMembers = this.applyLocalFilters(searchResult.members, params);

      // Enhance with additional data if requested
      const enhancedMembers = params.includeDetails ? 
        await this.enhanceMembersWithBasicData(filteredMembers) : 
        filteredMembers;

      // Generate insights
      const insights = this.generateSearchInsights(enhancedMembers, params);

      return {
        members: enhancedMembers,
        totalCount: searchResult.pagination?.count || enhancedMembers.length,
        searchCriteria: this.formatSearchCriteria(params),
        insights,
        pagination: {
          limit: params.limit,
          offset: params.offset,
          hasMore: searchResult.pagination?.next ? true : false
        },
        metadata: {
          searchedAt: new Date().toISOString(),
          congress: params.congress,
          dataSource: 'Congress.gov API'
        }
      };

    } catch (error) {
      console.error('Error searching members', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Build search filters for API request
   */
  private buildSearchFilters(params: MemberSearchParams): Record<string, string> {
    const filters: Record<string, string> = {};

    if (params.congress) {
      filters.congress = params.congress;
    }

    if (params.currentMember !== undefined) {
      filters.currentMember = params.currentMember.toString();
    }

    return filters;
  }

  /**
   * Apply local filters that may not be supported by API
   */
  private applyLocalFilters(members: any[], params: MemberSearchParams): any[] {
    let filtered = [...members];

    // Filter by chamber
    if (params.chamber) {
      filtered = filtered.filter(member => 
        member.chamber?.toLowerCase() === params.chamber?.toLowerCase()
      );
    }

    // Filter by state
    if (params.state) {
      filtered = filtered.filter(member => 
        member.state?.toUpperCase() === params.state?.toUpperCase()
      );
    }

    // Filter by party
    if (params.party) {
      filtered = filtered.filter(member => 
        member.party?.toUpperCase() === params.party?.toUpperCase()
      );
    }

    return filtered;
  }

  /**
   * Enhance members with basic additional data
   */
  private async enhanceMembersWithBasicData(members: any[]): Promise<any[]> {
    const enhancedMembers = [];

    // Process in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < members.length; i += batchSize) {
      const batch = members.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (member) => {
        try {
          if (!member.url) {
            return { ...member, enhancedData: null };
          }

          // Parse member URL to get URI format
          const urlObj = new URL(member.url);
          const path = urlObj.pathname.replace('/v3/', '');
          const parentUri = `congress-gov:/${path}`;

          // Skip committee enhancement for now since it would require subresource access
          const committees = { committees: [] };

          const enhancedData = {
            committeeCount: committees.committees?.length || 0,
            topCommittees: committees.committees?.slice(0, 3).map((c: any) => ({
              name: c.name,
              chamber: c.chamber
            })) || [],
            isCommitteeLeader: this.checkCommitteeLeadership(committees.committees || [])
          };

          return {
            ...member,
            enhancedData,
            summary: this.generateMemberSummary(member, enhancedData)
          };

        } catch (error) {
          console.warn('Failed to enhance member', { 
            memberId: member.bioguideId, 
            error: (error as Error).message 
          });
          return { ...member, enhancedData: null };
        }
      });

      const enhancedBatch = await Promise.all(batchPromises);
      enhancedMembers.push(...enhancedBatch);

      // Small delay between batches
      if (i + batchSize < members.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return enhancedMembers;
  }

  /**
   * Check if member has committee leadership positions
   */
  private checkCommitteeLeadership(committees: any[]): boolean {
    return committees.some(committee => 
      committee.activities?.some((activity: any) => 
        activity.name.toLowerCase().includes('chair') || 
        activity.name.toLowerCase().includes('ranking')
      )
    );
  }

  /**
   * Generate member summary
   */
  private generateMemberSummary(member: any, enhancedData: any): string {
    const name = member.fullName || member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unknown';
    const party = member.party || member.partyName || '?';
    const state = member.state || '?';
    const chamber = member.chamber || 'Unknown';
    
    let summary = `${name} (${party}-${state})`;
    
    if (chamber.toLowerCase() === 'house' && member.district) {
      summary += ` - House District ${member.district}`;
    } else if (chamber.toLowerCase() === 'senate') {
      summary += ` - Senator`;
    }

    if (enhancedData) {
      if (enhancedData.isCommitteeLeader) {
        summary += ` - Committee Leader`;
      }
      if (enhancedData.committeeCount > 0) {
        summary += ` - ${enhancedData.committeeCount} committees`;
      }
    }

    return summary;
  }

  /**
   * Generate search insights
   */
  private generateSearchInsights(members: any[], params: MemberSearchParams): any {
    const insights = {
      totalMembers: members.length,
      partyBreakdown: this.analyzePartyBreakdown(members),
      stateDistribution: this.analyzeStateDistribution(members),
      chamberBreakdown: this.analyzeChamberBreakdown(members),
      leadershipCount: this.countLeaders(members),
      committeeParticipation: this.analyzeCommitteeParticipation(members)
    };

    return insights;
  }

  /**
   * Analyze party breakdown
   */
  private analyzePartyBreakdown(members: any[]): any {
    const partyCount = new Map<string, number>();
    
    members.forEach(member => {
      const party = member.party || 'Unknown';
      partyCount.set(party, (partyCount.get(party) || 0) + 1);
    });

    return {
      democratic: partyCount.get('D') || 0,
      republican: partyCount.get('R') || 0,
      independent: partyCount.get('I') || 0,
      other: partyCount.get('Unknown') || 0,
      breakdown: Array.from(partyCount.entries()).map(([party, count]) => ({
        party,
        count,
        percentage: Math.round((count / members.length) * 100)
      }))
    };
  }

  /**
   * Analyze state distribution
   */
  private analyzeStateDistribution(members: any[]): any {
    const stateCount = new Map<string, number>();
    
    members.forEach(member => {
      const state = member.state || 'Unknown';
      stateCount.set(state, (stateCount.get(state) || 0) + 1);
    });

    return {
      totalStates: stateCount.size,
      topStates: Array.from(stateCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([state, count]) => ({ state, count }))
    };
  }

  /**
   * Analyze chamber breakdown
   */
  private analyzeChamberBreakdown(members: any[]): any {
    const chamberCount = new Map<string, number>();
    
    members.forEach(member => {
      const chamber = member.chamber || 'Unknown';
      chamberCount.set(chamber, (chamberCount.get(chamber) || 0) + 1);
    });

    return {
      house: chamberCount.get('House') || 0,
      senate: chamberCount.get('Senate') || 0,
      unknown: chamberCount.get('Unknown') || 0
    };
  }

  /**
   * Count leaders in the result set
   */
  private countLeaders(members: any[]): number {
    return members.filter(member => 
      member.enhancedData?.isCommitteeLeader || 
      member.leadership
    ).length;
  }

  /**
   * Analyze committee participation
   */
  private analyzeCommitteeParticipation(members: any[]): any {
    const membersWithCommittees = members.filter(m => 
      m.enhancedData?.committeeCount > 0
    );

    const avgCommittees = membersWithCommittees.length > 0 ? 
      membersWithCommittees.reduce((sum, m) => sum + (m.enhancedData?.committeeCount || 0), 0) / membersWithCommittees.length : 0;

    return {
      membersWithCommittees: membersWithCommittees.length,
      averageCommittees: Math.round(avgCommittees * 10) / 10,
      participationRate: Math.round((membersWithCommittees.length / members.length) * 100)
    };
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

  /**
   * Generate search suggestions
   */
  private generateSearchSuggestions(params: MemberSearchParams): string[] {
    const suggestions = [];
    
    if (params.query) {
      suggestions.push('Try a broader search term or partial name');
      suggestions.push('Check spelling of the member name');
    }
    
    if (params.chamber) {
      suggestions.push(`Try searching in the other chamber (${params.chamber === 'house' ? 'senate' : 'house'})`);
    }
    
    if (params.state) {
      suggestions.push('Try searching without state filter');
    }
    
    if (params.party) {
      suggestions.push('Try searching without party filter');
    }
    
    if (params.currentMember !== false) {
      suggestions.push('Try including former members (set currentMember to false)');
    }
    
    suggestions.push('Use partial names or last names only');
    suggestions.push('Try searching by state or chamber only');
    
    return suggestions;
  }
  
  /**
   * Make authenticated API request to LegisAPI backend
   */
  private async makeApiRequest(endpoint: string): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new AuthenticationError('Invalid or expired access token');
      }
      if (response.status === 404) {
        throw new NotFoundError(`Resource not found: ${endpoint}`);
      }
      if (response.status === 429) {
        throw new RateLimitError('API rate limit exceeded');
      }
      if (response.status === 403) {
        throw new ApiError('API Permission denied - check Auth0 scopes', 403);
      }
      throw new ApiError(`API error: ${response.statusText}`, response.status);
    }

    return response.json();
  }

  /**
   * Build query string from search parameters
   */
  private buildQueryString(params: any): string {
    const queryParams = new URLSearchParams();
    
    if (params.query) queryParams.append('q', params.query);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    
    // Add filters
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    return queryParams.toString();
  }
}

/**
 * Handle member search tool execution
 */
export async function handleMemberSearch(
  params: MemberSearchParams,
  apiBaseUrl: string,
  accessToken: string
): Promise<CallToolResult> {
  try {
    const tool = new MemberSearchTool(apiBaseUrl, accessToken);
    const result = await tool.searchMembers(params);
    
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    console.error('Error in handleMemberSearch:', error);
    
    // Map errors appropriately
    if (error instanceof ValidationError) {
      return {
        content: [{
          type: "text" as const,
          text: `Validation error: ${error.message}`
        }],
        isError: true
      };
    }
    
    if (error instanceof NotFoundError) {
      return {
        content: [{
          type: "text" as const,
          text: `No members found: ${error.message}`
        }],
        isError: true
      };
    }
    
    if (error instanceof AuthenticationError) {
      return {
        content: [{
          type: "text" as const,
          text: `Authentication error: ${error.message}. Please re-authenticate.`
        }],
        isError: true
      };
    }
    
    if (error instanceof RateLimitError) {
      return {
        content: [{
          type: "text" as const,
          text: `Rate limit exceeded: ${error.message}. Please try again later.`
        }],
        isError: true
      };
    }
    
    if (error instanceof ApiError) {
      return {
        content: [{
          type: "text" as const,
          text: `API error (${error.statusCode}): ${error.message}`
        }],
        isError: true
      };
    }
    
    // Generic error
    return {
      content: [{
        type: "text" as const,
        text: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`
      }],
      isError: true
    };
  }
}

// Export constants for tool registration
export const TOOL_NAME = "member-search";
export const TOOL_DESCRIPTION = `Search for members of Congress with comprehensive filtering and analysis.

Provides advanced search capabilities including:
- Name-based search with partial matching
- Chamber filtering (House/Senate)
- State and party filtering
- Current/former member filtering
- Committee participation analysis
- Leadership position identification
- Party and geographic distribution insights

Examples:
- Search by name: query = "Pelosi"
- Search by state: state = "CA"
- Search House Republicans: chamber = "house", party = "R"
- Search with details: query = "Smith", includeDetails = true
- Search former members: currentMember = false`;

export const TOOL_PARAMS = {
  query: z.string().optional().describe("Search query for member names"),
  chamber: z.enum(["house", "senate"]).optional().describe("Chamber: 'house' or 'senate'"),
  state: z.string().optional().describe("Two-letter state code (e.g., 'CA', 'TX')"),
  party: z.enum(["D", "R", "I"]).optional().describe("Party: 'D' (Democrat), 'R' (Republican), 'I' (Independent)"),
  currentMember: z.boolean().optional().default(true).describe("Whether to include only current members"),
  congress: z.string().optional().describe("Specific congress number (e.g., '118')"),
  limit: z.number().min(1).max(100).optional().default(20).describe("Maximum number of results to return"),
  offset: z.number().min(0).optional().default(0).describe("Number of results to skip"),
  includeDetails: z.boolean().optional().default(false).describe("Whether to include detailed member data")
};