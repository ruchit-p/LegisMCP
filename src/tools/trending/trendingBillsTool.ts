import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { CongressApiService } from "../../services/CongressApiService.js";
import { getCurrentCongress } from "../../utils/congress.js";
import { findVotesInActions } from "../../utils/legislation.js";

/**
 * Zod schema for trending bills parameters
 */
export const trendingBillsParamsSchema = z.object({
  timeframe: z.enum(["week", "month", "quarter", "year"]).optional().default("month"),
  limit: z.number().min(1).max(50).optional().default(10),
  congress: z.number().optional()
});

export type TrendingBillsParams = z.infer<typeof trendingBillsParamsSchema>;

function calculateFromDateTime(timeframe: string): string {
  const now = Date.now();
  const ms = {
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    quarter: 90 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
  }[timeframe] ?? 30 * 24 * 60 * 60 * 1000;
  return new Date(now - ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Trending bills tool — fetches recently active bills with sub-resource data
 */
export class TrendingBillsTool {
  constructor(private congressApi: CongressApiService) {}

  /**
   * Get recently active bills with sub-resource data
   */
  async getTrendingBills(params: TrendingBillsParams): Promise<any> {
    try {
      console.error('Fetching trending bills', {
        timeframe: params.timeframe,
        limit: params.limit
      });

      // Step 1: Fetch recent bills sorted by updateDate
      const bills = await this.fetchRecentBills(params);

      // Step 2: Enhance with sub-resource data in parallel
      const enhancedBills = await this.enhanceBillsWithData(bills);

      console.error('Trending bills fetch completed', {
        billsFound: enhancedBills.length,
        timeframe: params.timeframe
      });

      return {
        bills: enhancedBills,
        metadata: {
          timeframe: params.timeframe,
          congress: params.congress || getCurrentCongress(),
          fetchedAt: new Date().toISOString(),
          totalBillsFetched: enhancedBills.length
        }
      };

    } catch (error) {
      console.error('Error fetching trending bills', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Fetch recent bills sorted by updateDate
   */
  private async fetchRecentBills(params: TrendingBillsParams): Promise<any[]> {
    const filters: Record<string, string> = {};
    if (params.congress) {
      filters.congress = params.congress.toString();
    } else {
      filters.congress = String(getCurrentCongress());
    }

    filters.fromDateTime = calculateFromDateTime(params.timeframe || 'month');

    const fetchLimit = Math.min((params.limit || 10) * 3, 100);

    const searchResult = await this.congressApi.searchCollection('bill', {
      limit: fetchLimit,
      sort: 'updateDate+desc',
      filters
    });

    const bills = searchResult.bills || [];

    // Re-sort by actual legislative activity date, not metadata update date
    return bills
      .filter((bill: any) => bill.latestAction?.actionDate)
      .sort((a: any, b: any) => {
        return new Date(b.latestAction.actionDate).getTime() - new Date(a.latestAction.actionDate).getTime();
      })
      .slice(0, params.limit);
  }

  /**
   * Enhance bills with sub-resource data using parallel fetching
   */
  private async enhanceBillsWithData(bills: any[]): Promise<any[]> {
    const enhancedBills = [];

    // Process bills in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < bills.length; i += batchSize) {
      const batch = bills.slice(i, i + batchSize);

      const batchPromises = batch.map(async (bill) => {
        const congress = bill.congress;
        const billType = bill.type || bill.billType;
        const billNumber = bill.number || bill.billNumber;

        if (!congress || !billType || !billNumber) {
          return { ...bill, subresources: {} };
        }

        const parentUri = `congress-gov:/bill/${congress}/${billType.toLowerCase()}/${billNumber}`;

        const [cosponsors, actions, committees, subjects] = await Promise.allSettled([
          this.congressApi.getSubResource(parentUri, 'cosponsors', { limit: 100 }),
          this.congressApi.getSubResource(parentUri, 'actions', { limit: 50 }),
          this.congressApi.getSubResource(parentUri, 'committees', { limit: 20 }),
          this.congressApi.getSubResource(parentUri, 'subjects', { limit: 50 })
        ]);

        const cosponsorData = cosponsors.status === 'fulfilled' ? cosponsors.value : null;
        const actionData = actions.status === 'fulfilled' ? actions.value : null;
        const committeeData = committees.status === 'fulfilled' ? committees.value : null;
        const subjectData = subjects.status === 'fulfilled' ? subjects.value : null;

        const allActions = actionData?.actions || [];
        const recordedVotes = findVotesInActions(allActions);

        return {
          ...bill,
          subresources: {
            cosponsors: cosponsorData?.cosponsors || [],
            recentActions: allActions.slice(0, 5),
            committees: committeeData?.committees || [],
            subjects: subjectData?.subjects || {},
            recordedVotes,
          }
        };
      });

      const enhancedBatch = await Promise.all(batchPromises);
      enhancedBills.push(...enhancedBatch);

      // Small delay between batches to be respectful to the API
      if (i + batchSize < bills.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return enhancedBills;
  }
}

/**
 * Handle trending bills tool execution
 */
export async function handleTrendingBills(
  params: TrendingBillsParams,
  congressApi: CongressApiService
): Promise<CallToolResult> {
  try {
    const tool = new TrendingBillsTool(congressApi);
    const result = await tool.getTrendingBills(params);

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    console.error('Error in handleTrendingBills:', error);

    return {
      content: [{
        type: "text" as const,
        text: `Failed to get trending bills: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}
