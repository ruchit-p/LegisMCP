import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { CongressApiService } from "../../services/CongressApiService.js";
import { NotFoundError } from "../../utils/errors.js";

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
 * Member details tool — fetches member data with optional sub-resources
 */
export class MemberDetailsTool {
  constructor(private congressApi: CongressApiService) {}

  /**
   * Get member details with optional sub-resources
   */
  async getMemberDetails(params: MemberDetailsParams): Promise<any> {
    try {
      console.error('Fetching member details', { memberId: params.memberId });

      const memberData = await this.congressApi.getMemberDetails({
        memberId: params.memberId,
        congress: params.congress
      });

      if (!memberData.member) {
        throw new NotFoundError(`Member not found: ${params.memberId}`);
      }

      const member = memberData.member;

      if (params.includeDetails) {
        return await this.fetchMemberWithSubresources(member);
      }

      return {
        member,
        metadata: {
          fetchedAt: new Date().toISOString(),
          congress: params.congress
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
   * Fetch member with sub-resource data
   */
  private async fetchMemberWithSubresources(member: any): Promise<any> {
    const memberId = member.bioguideId;
    if (!memberId) {
      return {
        member,
        metadata: { fetchedAt: new Date().toISOString() }
      };
    }

    try {
      const parentUri = `congress-gov:/member/${memberId}`;

      const [sponsoredResult, cosponsoredResult] = await Promise.allSettled([
        this.congressApi.getSubResource(parentUri, 'sponsored-legislation', { limit: 50 }),
        this.congressApi.getSubResource(parentUri, 'cosponsored-legislation', { limit: 50 })
      ]);

      const sponsoredLegislation = sponsoredResult.status === 'fulfilled' ? sponsoredResult.value : null;
      const cosponsoredLegislation = cosponsoredResult.status === 'fulfilled' ? cosponsoredResult.value : null;

      const sponsoredBills = sponsoredLegislation?.sponsoredLegislation || [];
      const cosponsoredBills = cosponsoredLegislation?.cosponsoredLegislation || [];

      // Extract leadership positions from member data
      const leadershipPositions: any[] = [];
      if (member.leadership) {
        leadershipPositions.push({
          type: 'Chamber Leadership',
          title: member.leadership
        });
      }

      // Recent activity (last 6 months)
      const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
      const recentSponsored = sponsoredBills.filter((bill: any) =>
        new Date(bill.introducedDate) >= sixMonthsAgo
      );
      const recentCosponsored = cosponsoredBills.filter((bill: any) =>
        new Date(bill.introducedDate) >= sixMonthsAgo
      );

      return {
        member,
        sponsoredLegislation: sponsoredBills.slice(0, 10),
        cosponsoredLegislation: cosponsoredBills.slice(0, 10),
        legislativeCounts: {
          sponsored: sponsoredBills.length,
          cosponsored: cosponsoredBills.length,
          total: sponsoredBills.length + cosponsoredBills.length
        },
        leadershipPositions,
        recentActivity: {
          recentSponsored: recentSponsored.length,
          recentCosponsored: recentCosponsored.length,
          recentTotal: recentSponsored.length + recentCosponsored.length
        },
        metadata: {
          fetchedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.warn('Failed to fetch sub-resources for member', {
        memberId,
        error: (error as Error).message
      });

      return {
        member,
        sponsoredLegislation: [],
        cosponsoredLegislation: [],
        legislativeCounts: { sponsored: 0, cosponsored: 0, total: 0 },
        leadershipPositions: [],
        recentActivity: { recentSponsored: 0, recentCosponsored: 0, recentTotal: 0 },
        metadata: {
          fetchedAt: new Date().toISOString()
        }
      };
    }
  }
}

/**
 * Handle member details tool execution
 */
export async function handleMemberDetails(
  params: MemberDetailsParams,
  congressApi: CongressApiService
): Promise<CallToolResult> {
  try {
    const tool = new MemberDetailsTool(congressApi);
    const result = await tool.getMemberDetails(params);

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    console.error('Error in handleMemberDetails:', error);

    return {
      content: [{
        type: "text" as const,
        text: `Failed to get member details: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

// Export constants for tool registration
export const TOOL_NAME = "member-details";
export const TOOL_DESCRIPTION = `Get detailed information about a specific member of Congress.

Use this tool after finding a member's bioguideId via member-search. Returns
raw member data, sponsored/cosponsored legislation, leadership positions, and
recent activity counts. For questions like "What has Nancy Pelosi sponsored?",
first use member-search to find the bioguideId, then use this tool.

Provides:
- Basic member information (name, party, state, chamber, district)
- Sponsored and cosponsored legislation (top 10 each)
- Legislative counts (sponsored, cosponsored, total)
- Leadership positions
- Recent activity counts (last 6 months)

Examples:
- Get Nancy Pelosi's details: memberId = "P000197"
- Get specific congress data: memberId = "P000197", congress = "118"
- Basic info only: memberId = "P000197", includeDetails = false`;

export const TOOL_PARAMS = {
  memberId: z.string().min(1).describe("Bioguide ID of the member (e.g., 'P000197')"),
  congress: z.string().optional().describe("Specific congress number (e.g., '118')"),
  includeDetails: z.boolean().optional().default(true).describe("Whether to include detailed sub-resource data")
};
