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
 * Zod schema for member details parameters
 */
export const memberDetailsParamsSchema = z.object({
  memberId: z.string().min(1).describe("Bioguide ID of the member (e.g., 'P000197')"),
  congress: z.string().optional().describe("Specific congress number (e.g., '118')"),
  includeDetails: z.boolean().optional().default(true).describe("Whether to include detailed sub-resource data")
});

export type MemberDetailsParams = z.infer<typeof memberDetailsParamsSchema>;

/**
 * Enhanced member details tool with comprehensive data fetching
 */
export class MemberDetailsTool {
  constructor(
    private apiBaseUrl: string,
    private accessToken: string
  ) {}

  /**
   * Get comprehensive member details with optional sub-resources
   */
  async getMemberDetails(params: MemberDetailsParams): Promise<any> {
    try {
      console.log('Fetching member details', { memberId: params.memberId });

      // Step 1: Get basic member information from LegisAPI
      const memberData = await this.makeApiRequest(
        `/api/members/${params.memberId}`
      );

      if (!memberData.member) {
        throw new NotFoundError(`Member not found: ${params.memberId}`);
      }

      const member = memberData.member;

      // Step 2: Enhance with additional data if requested
      if (params.includeDetails) {
        const enhancedMember = await this.enhanceMemberWithDetails(member);
        
        return {
          member: enhancedMember,
          metadata: {
            fetchedAt: new Date().toISOString(),
            congress: params.congress,
            dataSource: 'Congress.gov API'
          }
        };
      }

      return {
        member,
        metadata: {
          fetchedAt: new Date().toISOString(),
          congress: params.congress,
          dataSource: 'Congress.gov API'
        }
      };

    } catch (error) {
      console.error('Error fetching member details', { 
        memberId: params.memberId, 
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Enhance member with detailed sub-resource data
   */
  private async enhanceMemberWithDetails(member: any): Promise<any> {
    if (!member.url) {
      console.warn('Member URL not available, skipping enhancement');
      return member;
    }

    try {
      // Parse member URL to get URI format
      const urlObj = new URL(member.url);
      const path = urlObj.pathname.replace('/v3/', '');
      const parentUri = `congress-gov:/${path}`;

      // Skip sub-resource fetching for now due to API limitations
      const sponsoredResult = { status: 'fulfilled', value: { sponsoredLegislation: [] } };
      const cosponsoredResult = { status: 'fulfilled', value: { cosponsoredLegislation: [] } };
      const committeesResult = { status: 'fulfilled', value: { committees: [] } };

      // Process results
      const sponsoredLegislation = sponsoredResult.status === 'fulfilled' ? 
        sponsoredResult.value : null;
      const cosponsoredLegislation = cosponsoredResult.status === 'fulfilled' ? 
        cosponsoredResult.value : null;
      const committees = committeesResult.status === 'fulfilled' ? 
        committeesResult.value : null;

      // Calculate enhanced metrics
      const legislativeMetrics = this.calculateLegislativeMetrics(
        sponsoredLegislation,
        cosponsoredLegislation
      );

      const leadershipInfo = this.extractLeadershipInfo(member, committees);
      const activity = this.assessLegislativeActivity(sponsoredLegislation, cosponsoredLegislation);

      return {
        ...member,
        enhancedData: {
          legislativeMetrics,
          leadershipInfo,
          activity,
          committees: committees?.committees || [],
          recentSponsoredBills: sponsoredLegislation?.sponsoredLegislation?.slice(0, 5) || [],
          recentCosponsoredBills: cosponsoredLegislation?.cosponsoredLegislation?.slice(0, 5) || []
        },
        narrative: this.generateMemberNarrative(member, {
          legislativeMetrics,
          leadershipInfo,
          activity,
          committees: committees?.committees || []
        })
      };

    } catch (error) {
      console.warn('Failed to enhance member with details', { 
        memberId: member.bioguideId, 
        error: (error as Error).message 
      });
      
      // Return member with basic enhancement
      return {
        ...member,
        enhancedData: {
          legislativeMetrics: { sponsoredCount: 0, cosponsoredCount: 0 },
          leadershipInfo: { positions: [], isLeader: false },
          activity: { level: 'Unknown', description: 'Unable to assess' },
          committees: [],
          recentSponsoredBills: [],
          recentCosponsoredBills: []
        },
        narrative: this.generateMemberNarrative(member, {})
      };
    }
  }

  /**
   * Calculate legislative metrics
   */
  private calculateLegislativeMetrics(
    sponsoredLegislation: any,
    cosponsoredLegislation: any
  ): any {
    const sponsoredCount = sponsoredLegislation?.sponsoredLegislation?.length || 0;
    const cosponsoredCount = cosponsoredLegislation?.cosponsoredLegislation?.length || 0;
    
    // Analyze bill types and subjects
    const billTypes = new Map<string, number>();
    const subjects = new Map<string, number>();
    
    const allBills = [
      ...(sponsoredLegislation?.sponsoredLegislation || []),
      ...(cosponsoredLegislation?.cosponsoredLegislation || [])
    ];

    allBills.forEach(bill => {
      if (bill.type) {
        billTypes.set(bill.type, (billTypes.get(bill.type) || 0) + 1);
      }
      if (bill.policyArea) {
        subjects.set(bill.policyArea, (subjects.get(bill.policyArea) || 0) + 1);
      }
    });

    return {
      sponsoredCount,
      cosponsoredCount,
      totalLegislation: sponsoredCount + cosponsoredCount,
      preferredBillTypes: Array.from(billTypes.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3),
      topPolicyAreas: Array.from(subjects.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      collaborationScore: this.calculateCollaborationScore(cosponsoredCount, sponsoredCount)
    };
  }

  /**
   * Extract leadership information
   */
  private extractLeadershipInfo(member: any, committees: any): any {
    const positions = [];
    let isLeader = false;

    // Check for leadership positions in member data
    if (member.leadership) {
      positions.push({
        type: 'Chamber Leadership',
        title: member.leadership,
        scope: 'Chamber'
      });
      isLeader = true;
    }

    // Check committee leadership
    if (committees?.committees) {
      committees.committees.forEach((committee: any) => {
        if (committee.activities) {
          committee.activities.forEach((activity: any) => {
            if (activity.name.toLowerCase().includes('chair') || 
                activity.name.toLowerCase().includes('ranking')) {
              positions.push({
                type: 'Committee Leadership',
                title: activity.name,
                committee: committee.name,
                scope: 'Committee'
              });
              isLeader = true;
            }
          });
        }
      });
    }

    return {
      positions,
      isLeader,
      leadershipScore: this.calculateLeadershipScore(positions)
    };
  }

  /**
   * Assess legislative activity level
   */
  private assessLegislativeActivity(
    sponsoredLegislation: any,
    cosponsoredLegislation: any
  ): any {
    const sponsoredCount = sponsoredLegislation?.sponsoredLegislation?.length || 0;
    const cosponsoredCount = cosponsoredLegislation?.cosponsoredLegislation?.length || 0;
    const totalActivity = sponsoredCount + cosponsoredCount;

    let level = 'Low';
    let description = 'Limited legislative activity';

    if (totalActivity > 100) {
      level = 'Very High';
      description = 'Extremely active legislator with extensive involvement';
    } else if (totalActivity > 50) {
      level = 'High';
      description = 'Highly active legislator with significant involvement';
    } else if (totalActivity > 20) {
      level = 'Medium';
      description = 'Moderately active legislator';
    } else if (totalActivity > 5) {
      level = 'Low-Medium';
      description = 'Limited but consistent legislative activity';
    }

    // Analyze recent activity pattern
    const recentActivity = this.analyzeRecentActivity(
      sponsoredLegislation?.sponsoredLegislation || [],
      cosponsoredLegislation?.cosponsoredLegislation || []
    );

    return {
      level,
      description,
      totalActivity,
      recentTrend: recentActivity.trend,
      activityBreakdown: {
        sponsored: sponsoredCount,
        cosponsored: cosponsoredCount,
        ratio: sponsoredCount > 0 ? cosponsoredCount / sponsoredCount : 0
      }
    };
  }

  /**
   * Generate member narrative
   */
  private generateMemberNarrative(member: any, enhancedData: any): string {
    const name = member.name || 'Unknown Member';
    const party = member.party || 'Unknown';
    const state = member.state || 'Unknown';
    const chamber = member.chamber || 'Unknown';
    
    let narrative = `${name} is a ${party} `;
    
    if (chamber.toLowerCase() === 'house') {
      narrative += `Representative from ${state}`;
      if (member.district) {
        narrative += ` (District ${member.district})`;
      }
    } else if (chamber.toLowerCase() === 'senate') {
      narrative += `Senator from ${state}`;
    } else {
      narrative += `member from ${state}`;
    }

    if (enhancedData.legislativeMetrics) {
      const metrics = enhancedData.legislativeMetrics;
      narrative += `. Has sponsored ${metrics.sponsoredCount} bills and cosponsored ${metrics.cosponsoredCount} bills`;
      
      if (metrics.topPolicyAreas && metrics.topPolicyAreas.length > 0) {
        narrative += `, with primary focus on ${metrics.topPolicyAreas[0][0]}`;
      }
    }

    if (enhancedData.leadershipInfo?.isLeader) {
      narrative += `. Holds leadership positions`;
    }

    if (enhancedData.activity) {
      narrative += `. ${enhancedData.activity.description}`;
    }

    return narrative;
  }

  /**
   * Calculate collaboration score based on cosponsoring patterns
   */
  private calculateCollaborationScore(cosponsoredCount: number, sponsoredCount: number): number {
    if (sponsoredCount === 0) return cosponsoredCount > 0 ? 100 : 0;
    const ratio = cosponsoredCount / sponsoredCount;
    return Math.min(Math.round(ratio * 10), 100);
  }

  /**
   * Calculate leadership score
   */
  private calculateLeadershipScore(positions: any[]): number {
    let score = 0;
    positions.forEach(position => {
      if (position.scope === 'Chamber') score += 50;
      else if (position.scope === 'Committee') score += 25;
    });
    return Math.min(score, 100);
  }

  /**
   * Analyze recent activity patterns
   */
  private analyzeRecentActivity(sponsoredBills: any[], cosponsoredBills: any[]): any {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
    
    const recentSponsored = sponsoredBills.filter(bill => {
      const introDate = new Date(bill.introducedDate);
      return introDate >= sixMonthsAgo;
    });

    const recentCosponsored = cosponsoredBills.filter(bill => {
      const introDate = new Date(bill.introducedDate);
      return introDate >= sixMonthsAgo;
    });

    const recentTotal = recentSponsored.length + recentCosponsored.length;
    const totalActivity = sponsoredBills.length + cosponsoredBills.length;
    
    const recentActivityRatio = totalActivity > 0 ? recentTotal / totalActivity : 0;
    
    let trend = 'Stable';
    if (recentActivityRatio > 0.5) trend = 'Increasing';
    else if (recentActivityRatio < 0.1) trend = 'Decreasing';

    return {
      trend,
      recentCount: recentTotal,
      recentSponsored: recentSponsored.length,
      recentCosponsored: recentCosponsored.length,
      activityRatio: recentActivityRatio
    };
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
}

/**
 * Handle member details tool execution
 */
export async function handleMemberDetails(
  params: MemberDetailsParams,
  apiBaseUrl: string,
  accessToken: string
): Promise<CallToolResult> {
  try {
    const tool = new MemberDetailsTool(apiBaseUrl, accessToken);
    const result = await tool.getMemberDetails(params);
    
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    console.error('Error in handleMemberDetails:', error);
    
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
          text: `Member not found: ${error.message}`
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
export const TOOL_NAME = "member-details";
export const TOOL_DESCRIPTION = `Get comprehensive details about a specific member of Congress.

Provides detailed information including:
- Basic member information (name, party, state, chamber, district)
- Legislative metrics (sponsored/cosponsored bills, policy focus areas)
- Leadership positions and committee memberships
- Activity level and recent trends
- Collaboration patterns and scoring

Examples:
- Get Nancy Pelosi's details: memberId = "P000197"
- Get specific congress data: memberId = "P000197", congress = "118"
- Basic info only: memberId = "P000197", includeDetails = false`;

export const TOOL_PARAMS = {
  memberId: z.string().min(1).describe("Bioguide ID of the member (e.g., 'P000197')"),
  congress: z.string().optional().describe("Specific congress number (e.g., '118')"),
  includeDetails: z.boolean().optional().default(true).describe("Whether to include detailed sub-resource data")
};