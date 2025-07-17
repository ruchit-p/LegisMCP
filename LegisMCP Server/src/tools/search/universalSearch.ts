import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { CongressApiService } from "../../services/CongressApiService.js";
import { 
  NotFoundError, 
  AuthenticationError, 
  RateLimitError, 
  ValidationError, 
  ApiError 
} from "../../utils/errors.js";

/**
 * Zod schema for universal search parameters
 */
export const universalSearchParamsSchema = z.object({
  query: z.string().min(1).describe("Search query across all legislative data"),
  collections: z.array(z.enum(["bill", "amendment", "member", "committee", "nomination", "treaty"])).optional().describe("Collections to search (default: all)"),
  limit: z.number().min(1).max(50).optional().default(10).describe("Maximum results per collection"),
  congress: z.string().optional().describe("Filter by specific congress number"),
  includeAnalysis: z.boolean().optional().default(true).describe("Whether to include cross-collection analysis"),
  sortBy: z.enum(["relevance", "date", "activity"]).optional().default("relevance").describe("Sort results by relevance, date, or activity")
});

export type UniversalSearchParams = z.infer<typeof universalSearchParamsSchema>;

/**
 * Universal search tool for comprehensive legislative data search
 */
export class UniversalSearchTool {
  constructor(private congressApi: CongressApiService) {}

  /**
   * Search across multiple collections with comprehensive analysis
   */
  async searchAll(params: UniversalSearchParams): Promise<any> {
    try {
      console.log('Performing universal search', { query: params.query, collections: params.collections });

      // Determine collections to search
      const collectionsToSearch = params.collections || ['bill', 'amendment', 'member', 'committee'];
      
      // Execute parallel searches across collections
      const searchResults = await this.executeParallelSearch(
        params.query, 
        collectionsToSearch, 
        params.limit || 10,
        params.congress
      );

      // Process and enhance results
      const processedResults = await this.processSearchResults(searchResults, params);

      // Generate cross-collection analysis
      const analysis = params.includeAnalysis ? 
        this.generateCrossCollectionAnalysis(processedResults, params) : null;

      // Sort and rank results
      const rankedResults = this.rankAndSortResults(processedResults, params.sortBy || 'relevance');

      return {
        query: params.query,
        results: rankedResults,
        analysis,
        summary: this.generateSearchSummary(rankedResults, params),
        metadata: {
          searchedAt: new Date().toISOString(),
          collectionsSearched: collectionsToSearch,
          congress: params.congress,
          totalResults: this.countTotalResults(rankedResults)
        }
      };

    } catch (error) {
      console.error('Error in universal search', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Execute parallel searches across collections
   */
  private async executeParallelSearch(
    query: string,
    collections: string[],
    limit: number,
    congress?: string
  ): Promise<Map<string, any>> {
    const searchPromises = collections.map(async (collection) => {
      try {
        const searchParams = {
          query,
          limit,
          offset: 0,
          filters: congress ? { congress } : undefined
        };

        const result = await this.congressApi.searchCollection(collection, searchParams);
        return [collection, result];
      } catch (error) {
        console.warn(`Search failed for collection ${collection}`, { error: (error as Error).message });
        return [collection, null];
      }
    });

    const results = await Promise.allSettled(searchPromises);
    const searchResults = new Map<string, any>();

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        const [collection, data] = result.value;
        searchResults.set(collection, data);
      }
    });

    return searchResults;
  }

  /**
   * Process and enhance search results
   */
  private async processSearchResults(
    searchResults: Map<string, any>,
    params: UniversalSearchParams
  ): Promise<any> {
    const processedResults: any = {};

    for (const [collection, data] of searchResults) {
      if (!data) continue;

      const items = this.extractItemsFromCollection(data, collection);
      const enhancedItems = await this.enhanceItemsWithBasicData(items, collection);
      
      processedResults[collection] = {
        items: enhancedItems,
        totalCount: data.pagination?.count || enhancedItems.length,
        hasMore: data.pagination?.next ? true : false
      };
    }

    return processedResults;
  }

  /**
   * Extract items from collection response
   */
  private extractItemsFromCollection(data: any, collection: string): any[] {
    switch (collection) {
      case 'bill':
        return data.bills || [];
      case 'amendment':
        return data.amendments || [];
      case 'member':
        return data.members || [];
      case 'committee':
        return data.committees || [];
      case 'nomination':
        return data.nominations || [];
      case 'treaty':
        return data.treaties || [];
      default:
        return [];
    }
  }

  /**
   * Enhance items with basic additional data
   */
  private async enhanceItemsWithBasicData(items: any[], collection: string): Promise<any[]> {
    // For now, add basic enhancements like relevance scoring
    return items.map(item => ({
      ...item,
      collection,
      relevanceScore: this.calculateRelevanceScore(item, collection),
      enhancedData: {
        collection,
        displayTitle: this.generateDisplayTitle(item, collection),
        status: this.extractStatus(item, collection),
        lastActivity: this.extractLastActivity(item, collection)
      }
    }));
  }

  /**
   * Calculate relevance score for an item
   */
  private calculateRelevanceScore(item: any, collection: string): number {
    let score = 50; // Base score

    // Recent activity bonus
    const lastUpdate = this.extractLastActivity(item, collection);
    if (lastUpdate) {
      const daysSince = (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) score += 20;
      else if (daysSince < 30) score += 10;
      else if (daysSince < 90) score += 5;
    }

    // Collection-specific scoring
    switch (collection) {
      case 'bill':
        if (item.latestAction?.text?.toLowerCase().includes('passed')) score += 15;
        if (item.title?.toLowerCase().includes('act')) score += 5;
        break;
      case 'member':
        if (item.leadership) score += 20;
        if (item.chamber === 'Senate') score += 5;
        break;
      case 'committee':
        if (item.chamber === 'Joint') score += 10;
        break;
    }

    return Math.min(score, 100);
  }

  /**
   * Generate display title for an item
   */
  private generateDisplayTitle(item: any, collection: string): string {
    switch (collection) {
      case 'bill':
        return `${item.number || 'Unknown'}: ${item.title || 'Untitled Bill'}`;
      case 'amendment':
        return `${item.number || 'Unknown'}: ${item.title || 'Untitled Amendment'}`;
      case 'member':
        return `${item.name || 'Unknown'} (${item.party || '?'}-${item.state || '?'})`;
      case 'committee':
        return `${item.name || 'Unknown Committee'} (${item.chamber || 'Unknown'})`;
      case 'nomination':
        return `${item.nominee || 'Unknown'} - ${item.position || 'Unknown Position'}`;
      case 'treaty':
        return `${item.number || 'Unknown'}: ${item.title || 'Untitled Treaty'}`;
      default:
        return item.title || item.name || 'Unknown';
    }
  }

  /**
   * Extract status from item
   */
  private extractStatus(item: any, collection: string): string {
    switch (collection) {
      case 'bill':
        return item.latestAction?.text || 'Unknown status';
      case 'amendment':
        return item.latestAction?.text || 'Unknown status';
      case 'member':
        return item.chamber || 'Unknown chamber';
      case 'committee':
        return `${item.chamber || 'Unknown'} Committee`;
      case 'nomination':
        return item.latestAction?.text || 'Unknown status';
      case 'treaty':
        return item.latestAction?.text || 'Unknown status';
      default:
        return 'Unknown status';
    }
  }

  /**
   * Extract last activity date
   */
  private extractLastActivity(item: any, collection: string): string | null {
    if (item.updateDate) return item.updateDate;
    if (item.latestAction?.actionDate) return item.latestAction.actionDate;
    if (item.introducedDate) return item.introducedDate;
    return null;
  }

  /**
   * Generate cross-collection analysis
   */
  private generateCrossCollectionAnalysis(results: any, params: UniversalSearchParams): any {
    const analysis = {
      collectionDistribution: this.analyzeCollectionDistribution(results),
      timelineAnalysis: this.analyzeTimeline(results),
      interconnections: this.findInterconnections(results),
      topicsAndThemes: this.analyzeTopicsAndThemes(results, params.query),
      activityLevels: this.analyzeActivityLevels(results)
    };

    return analysis;
  }

  /**
   * Analyze distribution across collections
   */
  private analyzeCollectionDistribution(results: any): any {
    const distribution: Record<string, {
      count: number;
      hasMore: boolean;
      totalAvailable: number;
      percentage?: number;
    }> = {};
    let totalItems = 0;

    Object.entries(results).forEach(([collection, data]: [string, any]) => {
      const count = data.items?.length || 0;
      distribution[collection] = {
        count,
        hasMore: data.hasMore || false,
        totalAvailable: data.totalCount || count
      };
      totalItems += count;
    });

    // Calculate percentages
    Object.keys(distribution).forEach(collection => {
      distribution[collection].percentage = totalItems > 0 ? 
        Math.round((distribution[collection].count / totalItems) * 100) : 0;
    });

    return {
      distribution,
      totalItems,
      collectionsWithResults: Object.keys(distribution).filter(c => distribution[c].count > 0).length
    };
  }

  /**
   * Analyze timeline of activities
   */
  private analyzeTimeline(results: any): any {
    const allItems: {
      date: Date;
      collection: string;
      item: string;
    }[] = [];
    
    Object.entries(results).forEach(([collection, data]: [string, any]) => {
      if (data.items) {
        data.items.forEach((item: any) => {
          const date = this.extractLastActivity(item, collection);
          if (date) {
            allItems.push({
              date: new Date(date),
              collection,
              item: item.enhancedData?.displayTitle || 'Unknown'
            });
          }
        });
      }
    });

    allItems.sort((a, b) => b.date.getTime() - a.date.getTime());

    const recentActivity = allItems.slice(0, 10);
    const activityByMonth = this.groupActivityByMonth(allItems);

    return {
      recentActivity,
      activityByMonth,
      totalActivities: allItems.length,
      dateRange: {
        earliest: allItems.length > 0 ? allItems[allItems.length - 1].date : null,
        latest: allItems.length > 0 ? allItems[0].date : null
      }
    };
  }

  /**
   * Find interconnections between items
   */
  private findInterconnections(results: any): any {
    const interconnections = {
      billsAndMembers: this.findBillMemberConnections(results),
      committeesAndBills: this.findCommitteeBillConnections(results),
      crossReferences: this.findCrossReferences(results)
    };

    return interconnections;
  }

  /**
   * Find bill-member connections
   */
  private findBillMemberConnections(results: any): any[] {
    const connections: any[] = [];
    const bills = results.bill?.items || [];
    const members = results.member?.items || [];

    bills.forEach((bill: any) => {
      const sponsor = bill.sponsor;
      if (sponsor) {
        const matchingMember = members.find((member: any) => 
          member.name?.toLowerCase().includes(sponsor.fullName?.toLowerCase()) ||
          member.bioguideId === sponsor.bioguideId
        );
        
        if (matchingMember) {
          connections.push({
            type: 'sponsorship',
            bill: bill.enhancedData?.displayTitle,
            member: matchingMember.enhancedData?.displayTitle,
            relationship: 'sponsor'
          });
        }
      }
    });

    return connections;
  }

  /**
   * Find committee-bill connections
   */
  private findCommitteeBillConnections(results: any): any[] {
    const connections: any[] = [];
    const bills = results.bill?.items || [];
    const committees = results.committee?.items || [];

    // This would require more detailed bill committee data
    // For now, return basic structure
    return connections;
  }

  /**
   * Find cross-references between items
   */
  private findCrossReferences(results: any): any[] {
    const crossRefs: any[] = [];
    
    // Look for mentions of bill numbers in other items
    const bills = results.bill?.items || [];
    const amendments = results.amendment?.items || [];

    bills.forEach((bill: any) => {
      if (bill.number) {
        amendments.forEach((amendment: any) => {
          if (amendment.title?.includes(bill.number) || 
              amendment.description?.includes(bill.number)) {
            crossRefs.push({
              type: 'amendment_to_bill',
              source: amendment.enhancedData?.displayTitle,
              target: bill.enhancedData?.displayTitle
            });
          }
        });
      }
    });

    return crossRefs;
  }

  /**
   * Analyze topics and themes
   */
  private analyzeTopicsAndThemes(results: any, query: string): any {
    const themes = new Map<string, number>();
    const keywords = this.extractKeywords(query);

    // Analyze titles and descriptions for themes
    Object.entries(results).forEach(([collection, data]: [string, any]) => {
      if (data.items) {
        data.items.forEach((item: any) => {
          const text = `${item.title || ''} ${item.description || ''}`.toLowerCase();
          
          // Look for policy area keywords
          const policyKeywords = [
            'healthcare', 'education', 'defense', 'environment', 'economy',
            'infrastructure', 'immigration', 'technology', 'agriculture', 'energy'
          ];

          policyKeywords.forEach(keyword => {
            if (text.includes(keyword)) {
              themes.set(keyword, (themes.get(keyword) || 0) + 1);
            }
          });
        });
      }
    });

    return {
      primaryThemes: Array.from(themes.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      queryKeywords: keywords,
      themeDistribution: Object.fromEntries(themes)
    };
  }

  /**
   * Analyze activity levels
   */
  private analyzeActivityLevels(results: any): any {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    let recentActivity = 0;
    let totalActivity = 0;

    Object.entries(results).forEach(([collection, data]: [string, any]) => {
      if (data.items) {
        data.items.forEach((item: any) => {
          totalActivity++;
          const lastActivity = this.extractLastActivity(item, collection);
          if (lastActivity && new Date(lastActivity) >= thirtyDaysAgo) {
            recentActivity++;
          }
        });
      }
    });

    return {
      recentActivity,
      totalActivity,
      activityRate: totalActivity > 0 ? Math.round((recentActivity / totalActivity) * 100) : 0,
      trend: recentActivity > totalActivity * 0.3 ? 'High' : 
             recentActivity > totalActivity * 0.1 ? 'Medium' : 'Low'
    };
  }

  /**
   * Rank and sort results
   */
  private rankAndSortResults(results: any, sortBy: string): any {
    const rankedResults = { ...results };

    Object.keys(rankedResults).forEach(collection => {
      if (rankedResults[collection].items) {
        rankedResults[collection].items.sort((a: any, b: any) => {
          switch (sortBy) {
            case 'relevance':
              return (b.relevanceScore || 0) - (a.relevanceScore || 0);
            case 'date':
              const dateA = new Date(this.extractLastActivity(a, collection) || 0);
              const dateB = new Date(this.extractLastActivity(b, collection) || 0);
              return dateB.getTime() - dateA.getTime();
            case 'activity':
              // For now, use relevance score as proxy for activity
              return (b.relevanceScore || 0) - (a.relevanceScore || 0);
            default:
              return 0;
          }
        });
      }
    });

    return rankedResults;
  }

  /**
   * Generate search summary
   */
  private generateSearchSummary(results: any, params: UniversalSearchParams): string {
    const totalResults = this.countTotalResults(results);
    const collectionsWithResults = Object.keys(results).filter(c => 
      results[c].items && results[c].items.length > 0
    );

    let summary = `Found ${totalResults} results across ${collectionsWithResults.length} collections for "${params.query}".`;

    if (collectionsWithResults.length > 0) {
      const breakdown = collectionsWithResults.map(collection => 
        `${results[collection].items.length} ${collection}(s)`
      ).join(', ');
      summary += ` Results include: ${breakdown}.`;
    }

    return summary;
  }

  /**
   * Count total results
   */
  private countTotalResults(results: any): number {
    return Object.values(results).reduce((total: number, collection: any) => {
      return total + (collection.items?.length || 0);
    }, 0);
  }

  /**
   * Group activity by month
   */
  private groupActivityByMonth(items: any[]): any {
    const monthlyActivity = new Map<string, number>();
    
    items.forEach(item => {
      const monthKey = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}`;
      monthlyActivity.set(monthKey, (monthlyActivity.get(monthKey) || 0) + 1);
    });

    return Array.from(monthlyActivity.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12)
      .map(([month, count]) => ({ month, count }));
  }

  /**
   * Extract keywords from query
   */
  private extractKeywords(query: string): string[] {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'about'];
    return query.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 10);
  }
}

/**
 * Handle universal search tool execution
 */
export async function handleUniversalSearch(
  params: UniversalSearchParams,
  congressApi: CongressApiService
): Promise<CallToolResult> {
  try {
    const tool = new UniversalSearchTool(congressApi);
    const result = await tool.searchAll(params);
    
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    console.error('Error in handleUniversalSearch:', error);
    
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
          text: `No results found: ${error.message}`
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
export const TOOL_NAME = "universal-search";
export const TOOL_DESCRIPTION = `Search comprehensively across all legislative collections with advanced analysis.

Performs cross-collection search and analysis including:
- Bills, amendments, members, committees, nominations, and treaties
- Relevance scoring and intelligent ranking
- Cross-collection relationship analysis
- Timeline and activity analysis
- Topic and theme identification
- Interconnection discovery between legislative items

Examples:
- Search everything: query = "infrastructure"
- Search specific collections: query = "healthcare", collections = ["bill", "member"]
- Congress-specific search: query = "climate", congress = "118"
- Activity-sorted results: query = "tax", sortBy = "activity"
- Quick overview: query = "education", includeAnalysis = false`;

export const TOOL_PARAMS = {
  query: z.string().min(1).describe("Search query across all legislative data"),
  collections: z.array(z.enum(["bill", "amendment", "member", "committee", "nomination", "treaty"])).optional().describe("Collections to search (default: all)"),
  limit: z.number().min(1).max(50).optional().default(10).describe("Maximum results per collection"),
  congress: z.string().optional().describe("Filter by specific congress number"),
  includeAnalysis: z.boolean().optional().default(true).describe("Whether to include cross-collection analysis"),
  sortBy: z.enum(["relevance", "date", "activity"]).optional().default("relevance").describe("Sort results by relevance, date, or activity")
};