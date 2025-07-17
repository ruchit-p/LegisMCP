import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { 
  NotFoundError, 
  AuthenticationError, 
  RateLimitError, 
  ValidationError, 
  ApiError 
} from "../../utils/errors.js";
import { RateLimitService } from "../../services/RateLimitService.js";

/**
 * Zod schema for congress query parameters
 */
export const congressQueryParamsSchema = z.object({
  query: z.string().min(1).describe("Natural language question about Congress.gov data (bills, members, committees, etc.)"),
  limit: z.number().min(1).max(50).optional().default(5).describe("Maximum number of results to return"),
  includeDetails: z.boolean().optional().default(true).describe("Whether to include detailed sub-resource data")
});

export type CongressQueryParams = z.infer<typeof congressQueryParamsSchema>;

// Query Analysis Types
interface QueryAnalysis {
  intent: 'bill' | 'member' | 'committee' | 'vote' | 'general';
  primaryEntity: string;
  searchTerms: string;
  subResources: string[];
  filters: {
    congress?: number;
    chamber?: string;
    state?: string;
    party?: string;
    dateRange?: { start?: string; end?: string };
  };
  confidence: number;
}

interface EnrichedResult {
  type: 'bill' | 'member' | 'committee' | 'vote' | 'general';
  data: any;
  contextualData?: any;
  narrativeSummary?: string;
  insights?: string[];
  relevanceScore?: number;
}

/**
 * Enhanced Congress Query Tool with natural language understanding
 */
export class CongressQueryTool {
  private rateLimiter: RateLimitService;

  constructor(
    private apiBaseUrl: string,
    private accessToken: string
  ) {
    this.rateLimiter = new RateLimitService();
  }

  /**
   * Process natural language query about Congress
   */
  async processQuery(params: CongressQueryParams): Promise<any> {
    try {
      console.log('Processing congress query', { query: params.query });

      // Step 1: Analyze the natural language query
      const analysis = this.analyzeQuery(params.query);
      console.log('Query analysis', { analysis });

      // Step 2: Execute search based on analysis
      const searchResults = await this.executeSearch(analysis, params.limit);
      
      if (!searchResults || searchResults.length === 0) {
        return this.formatNoResultsResponse(params.query, analysis);
      }

      // Step 3: Enrich results with contextual data
      const enrichedResults = params.includeDetails 
        ? await this.enrichResults(searchResults, analysis)
        : searchResults.map(r => ({ type: analysis.intent, data: r }));

      // Step 4: Generate comprehensive response
      const response = this.generateComprehensiveResponse(
        params.query,
        analysis,
        enrichedResults
      );

      console.log('Query processing completed', { 
        resultsCount: enrichedResults.length,
        intent: analysis.intent 
      });

      return response;

    } catch (error) {
      console.error('Error processing congress query', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Analyze natural language query to determine intent and parameters
   */
  private analyzeQuery(query: string): QueryAnalysis {
    if (!query || typeof query !== 'string') {
      return {
        intent: 'general',
        primaryEntity: 'bill',
        searchTerms: '',
        subResources: [],
        filters: {},
        confidence: 0
      };
    }
    
    const lowerQuery = query.toLowerCase();
    const analysis: QueryAnalysis = {
      intent: 'general',
      primaryEntity: 'bill',
      searchTerms: query,
      subResources: [],
      filters: {},
      confidence: 0.5
    };

    // Intent detection patterns
    const patterns = {
      bill: {
        keywords: ['bill', 'legislation', 'act', 'resolution', 'h.r.', 's.', 'hjres', 'sjres'],
        boost: ['passed', 'introduced', 'sponsored', 'status', 'vote', 'committee']
      },
      member: {
        keywords: ['member', 'congressman', 'congresswoman', 'senator', 'representative', 'rep.', 'sen.'],
        boost: ['sponsored', 'voted', 'committee', 'district', 'state']
      },
      committee: {
        keywords: ['committee', 'subcommittee', 'panel', 'hearing'],
        boost: ['chair', 'ranking', 'membership', 'jurisdiction']
      },
      vote: {
        keywords: ['vote', 'voted', 'voting', 'roll call', 'yea', 'nay'],
        boost: ['passed', 'failed', 'motion', 'amendment']
      }
    };

    // Detect primary intent
    let maxScore = 0;
    for (const [intent, pattern] of Object.entries(patterns)) {
      let score = 0;
      
      // Check keywords
      for (const keyword of pattern.keywords) {
        if (lowerQuery.includes(keyword)) {
          score += 2;
        }
      }
      
      // Check boost words
      for (const boost of pattern.boost) {
        if (lowerQuery.includes(boost)) {
          score += 1;
        }
      }
      
      if (score > maxScore) {
        maxScore = score;
        analysis.intent = intent as any;
        analysis.confidence = Math.min(score / 10, 1);
      }
    }

    // Extract filters and context
    analysis.filters = this.extractFilters(query);
    
    // Determine sub-resources based on query content
    analysis.subResources = this.determineSubResources(query, analysis.intent);
    
    // Clean search terms
    analysis.searchTerms = this.cleanSearchTerms(query, analysis);

    return analysis;
  }

  /**
   * Extract filters from query
   */
  private extractFilters(query: string): QueryAnalysis['filters'] {
    const filters: QueryAnalysis['filters'] = {};
    
    if (!query || typeof query !== 'string') {
      return filters;
    }
    
    const lowerQuery = query.toLowerCase();

    // Congress number
    const congressMatch = query.match(/\b(11[0-9]|1[2-9][0-9])\s*(?:th|st|nd|rd)?\s*congress\b/i);
    if (congressMatch) {
      filters.congress = parseInt(congressMatch[1]);
    }

    // Chamber
    if (lowerQuery.includes('house') && !lowerQuery.includes('senate')) {
      filters.chamber = 'house';
    } else if (lowerQuery.includes('senate') && !lowerQuery.includes('house')) {
      filters.chamber = 'senate';
    }

    // State (2-letter codes)
    const stateMatch = query.match(/\b([A-Z]{2})\b/);
    if (stateMatch && this.isValidState(stateMatch[1])) {
      filters.state = stateMatch[1];
    }

    // Party
    if (lowerQuery.includes('democrat') || lowerQuery.includes('dem')) {
      filters.party = 'D';
    } else if (lowerQuery.includes('republican') || lowerQuery.includes('gop')) {
      filters.party = 'R';
    }

    // Date ranges
    const currentYear = new Date().getFullYear();
    if (lowerQuery.includes('this year') || lowerQuery.includes(currentYear.toString())) {
      filters.dateRange = {
        start: `${currentYear}-01-01`,
        end: `${currentYear}-12-31`
      };
    } else if (lowerQuery.includes('last year')) {
      filters.dateRange = {
        start: `${currentYear - 1}-01-01`,
        end: `${currentYear - 1}-12-31`
      };
    }

    return filters;
  }

  /**
   * Determine which sub-resources to fetch
   */
  private determineSubResources(query: string, intent: string): string[] {
    if (!query || typeof query !== 'string') {
      return [];
    }
    
    const lowerQuery = query.toLowerCase();
    const subResources: string[] = [];

    if (intent === 'bill') {
      // Actions/Status
      if (['action', 'status', 'progress', 'stage', 'history'].some(word => lowerQuery.includes(word))) {
        subResources.push('actions');
      }
      
      // Sponsors/Cosponsors
      if (['sponsor', 'author', 'cosponsor', 'support'].some(word => lowerQuery.includes(word))) {
        subResources.push('cosponsors');
      }
      
      // Text
      if (['text', 'content', 'read', 'full'].some(word => lowerQuery.includes(word))) {
        subResources.push('text');
      }
      
      // Committees
      if (lowerQuery.includes('committee')) {
        subResources.push('committees');
      }
      
      // Subjects
      if (['subject', 'topic', 'about', 'related'].some(word => lowerQuery.includes(word))) {
        subResources.push('subjects');
      }
      
      // Default sub-resources if none specified
      if (subResources.length === 0) {
        subResources.push('actions', 'cosponsors');
      }
    } else if (intent === 'member') {
      // Sponsored legislation
      if (['sponsor', 'author', 'introduce'].some(word => lowerQuery.includes(word))) {
        subResources.push('sponsored-legislation');
      }
      
      // Committees
      if (lowerQuery.includes('committee')) {
        subResources.push('committees');
      }
      
      // Default for members
      if (subResources.length === 0) {
        subResources.push('sponsored-legislation');
      }
    }

    return subResources;
  }

  /**
   * Clean search terms by removing filter words
   */
  private cleanSearchTerms(query: string, analysis: QueryAnalysis): string {
    if (!query || typeof query !== 'string') {
      return '';
    }
    
    let cleaned = query;
    
    // Remove congress references
    cleaned = cleaned.replace(/\b(11[0-9]|1[2-9][0-9])\s*(?:th|st|nd|rd)?\s*congress\b/gi, '');
    
    // Remove chamber references if they're filters
    if (analysis?.filters?.chamber) {
      cleaned = cleaned.replace(/\b(house|senate)\b/gi, '');
    }
    
    // Remove common query words
    const removeWords = ['show me', 'find', 'search for', 'what', 'which', 'list', 'get'];
    for (const word of removeWords) {
      cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
    }
    
    return cleaned.trim();
  }

  /**
   * Execute search based on analysis
   */
  private async executeSearch(analysis: QueryAnalysis, limit: number): Promise<any[]> {
    const searchParams = new URLSearchParams();
    
    // Clean search terms for API
    const searchQuery = this.cleanSearchTerms(analysis.searchTerms, analysis);
    if (searchQuery) {
      searchParams.append('q', searchQuery);
    }
    
    searchParams.append('limit', limit.toString());
    
    // Apply filters
    if (analysis?.filters?.congress && typeof analysis.filters.congress === 'number') {
      searchParams.append('congress', analysis.filters.congress.toString());
    }
    
    // Determine endpoint based on intent
    let endpoint = '/api/bills'; // default
    if (analysis.intent === 'member') {
      endpoint = '/api/members';
      if (analysis?.filters?.chamber) {
        searchParams.append('chamber', analysis.filters.chamber);
      }
      if (analysis?.filters?.state) {
        searchParams.append('state', analysis.filters.state);
      }
    } else if (analysis.intent === 'committee') {
      endpoint = '/api/committees';
      if (analysis?.filters?.chamber) {
        searchParams.append('chamber', analysis.filters.chamber);
      }
    }

    const response = await this.makeApiRequest(`${endpoint}?${searchParams}`);
    
    // Extract results array from response
    return response.bills || response.members || response.committees || [];
  }

  /**
   * Enrich results with additional context
   */
  private async enrichResults(results: any[], analysis: QueryAnalysis): Promise<EnrichedResult[]> {
    const enrichedResults: EnrichedResult[] = [];
    
    // Process in batches to avoid overwhelming the API
    const batchSize = 3;
    for (let i = 0; i < results.length; i += batchSize) {
      const batch = results.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (item) => {
        try {
          if (analysis.intent === 'bill') {
            return await this.enrichBill(item, analysis.subResources);
          } else if (analysis.intent === 'member') {
            return await this.enrichMember(item, analysis.subResources);
          } else if (analysis.intent === 'committee') {
            return await this.enrichCommittee(item, analysis.subResources);
          }
          return { type: analysis.intent, data: item };
        } catch (error) {
          console.warn('Failed to enrich item', { error: (error as Error).message });
          return { type: analysis.intent, data: item };
        }
      });
      
      const enrichedBatch = await Promise.all(batchPromises);
      enrichedResults.push(...enrichedBatch);
    }
    
    return enrichedResults;
  }

  /**
   * Enrich bill with contextual data
   */
  private async enrichBill(bill: any, subResources: string[]): Promise<EnrichedResult> {
    if (!bill || !bill.congress || !bill.billType || !bill.billNumber) {
      // Return basic enriched result if bill data is incomplete
      return {
        type: 'bill',
        data: bill,
        narrativeSummary: bill?.title || 'Unknown bill',
        insights: ['Incomplete bill data']
      };
    }

    const { congress, billType, billNumber } = bill;
    const enrichmentPromises: Promise<any>[] = [];
    const enrichmentKeys: string[] = [];

    // Fetch requested sub-resources
    if (subResources.includes('actions')) {
      enrichmentPromises.push(this.makeApiRequest(`/api/bills/${congress}/${billType}/${billNumber}/actions`));
      enrichmentKeys.push('actions');
    }
    
    if (subResources.includes('cosponsors')) {
      enrichmentPromises.push(this.makeApiRequest(`/api/bills/${congress}/${billType}/${billNumber}/cosponsors`));
      enrichmentKeys.push('cosponsors');
    }
    
    if (subResources.includes('committees')) {
      enrichmentPromises.push(this.makeApiRequest(`/api/bills/${congress}/${billType}/${billNumber}/committees`));
      enrichmentKeys.push('committees');
    }
    
    if (subResources.includes('subjects')) {
      enrichmentPromises.push(this.makeApiRequest(`/api/bills/${congress}/${billType}/${billNumber}/subjects`));
      enrichmentKeys.push('subjects');
    }

    // Fetch all data in parallel
    const results = await Promise.allSettled(enrichmentPromises);
    
    // Build contextual data
    const contextualData: any = {};
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        contextualData[enrichmentKeys[index]] = result.value;
      }
    });

    // Generate insights
    const insights = this.generateBillInsights(bill, contextualData);
    const narrativeSummary = this.generateBillNarrative(bill, contextualData);

    return {
      type: 'bill',
      data: bill,
      contextualData,
      narrativeSummary,
      insights,
      relevanceScore: this.calculateRelevanceScore(bill, contextualData)
    };
  }

  /**
   * Enrich member with contextual data
   */
  private async enrichMember(member: any, subResources: string[]): Promise<EnrichedResult> {
    if (!member) {
      return {
        type: 'member',
        data: member,
        narrativeSummary: 'Unknown member',
        insights: ['No member data available']
      };
    }

    const contextualData: any = {};
    
    // Get member ID from URL or bioguideId
    const memberId = member.bioguideId || this.extractMemberIdFromUrl(member.url);
    
    if (memberId && subResources.includes('sponsored-legislation')) {
      try {
        const sponsored = await this.makeApiRequest(`/api/members/${memberId}/sponsored-legislation`);
        contextualData.sponsoredLegislation = sponsored;
      } catch (error) {
        console.warn('Failed to fetch sponsored legislation', { error });
      }
    }

    const insights = this.generateMemberInsights(member, contextualData);
    const narrativeSummary = this.generateMemberNarrative(member, contextualData);

    return {
      type: 'member',
      data: member,
      contextualData,
      narrativeSummary,
      insights
    };
  }

  /**
   * Enrich committee with contextual data
   */
  private async enrichCommittee(committee: any, subResources: string[]): Promise<EnrichedResult> {
    return {
      type: 'committee',
      data: committee,
      narrativeSummary: `${committee.name} - ${committee.chamber} committee`
    };
  }

  /**
   * Generate comprehensive response
   */
  private generateComprehensiveResponse(
    query: string,
    analysis: QueryAnalysis,
    results: EnrichedResult[]
  ): any {
    // Sort results by relevance if scores are available
    const sortedResults = results.sort((a, b) => 
      (b.relevanceScore || 0) - (a.relevanceScore || 0)
    );

    return {
      query,
      interpretation: {
        intent: analysis.intent,
        confidence: analysis.confidence,
        filters: analysis.filters,
        requestedData: analysis.subResources
      },
      summary: this.generateSummary(sortedResults, analysis),
      results: sortedResults.map(r => ({
        type: r.type,
        data: r.data,
        contextualData: r.contextualData,
        narrative: r.narrativeSummary,
        insights: r.insights
      })),
      metadata: {
        totalResults: results.length,
        timestamp: new Date().toISOString(),
        dataSource: 'Congress.gov API'
      },
      suggestions: this.generateSuggestions(results, analysis)
    };
  }

  /**
   * Format no results response
   */
  private formatNoResultsResponse(query: string, analysis: QueryAnalysis): any {
    return {
      query,
      interpretation: {
        intent: analysis.intent,
        confidence: analysis.confidence,
        filters: analysis.filters
      },
      message: "No results found for your query.",
      suggestions: [
        "Try using different keywords",
        "Check spelling of names or bill numbers",
        "Use more general terms",
        analysis.filters.congress ? "Try searching without specifying a Congress number" : "Try specifying a Congress number (e.g., '118th Congress')",
        "Example: 'infrastructure bills from 2023' or 'bills sponsored by John Smith'"
      ],
      metadata: {
        timestamp: new Date().toISOString()
      }
    };
  }

  // Helper methods for insights and narratives

  private generateBillInsights(bill: any, contextualData: any): string[] {
    const insights: string[] = [];
    
    if (!contextualData) {
      return insights;
    }
    
    // Stage insight
    if (contextualData.actions?.actions?.length > 0) {
      const stage = this.determineBillStage(contextualData.actions.actions);
      insights.push(`Current stage: ${stage}`);
    }
    
    // Bipartisan support
    if (contextualData.cosponsors?.cosponsors?.length > 0) {
      const bipartisan = this.assessBipartisanSupport(contextualData.cosponsors.cosponsors);
      insights.push(bipartisan);
    }
    
    // Activity level
    if (contextualData.actions?.actions?.length > 0) {
      const activity = this.assessActivityLevel(contextualData.actions.actions);
      insights.push(activity);
    }
    
    // Subject areas
    if (contextualData.subjects?.subjects?.policyArea?.name) {
      insights.push(`Primary topic: ${contextualData.subjects.subjects.policyArea.name}`);
    }
    
    return insights;
  }

  private generateBillNarrative(bill: any, contextualData: any): string {
    if (!bill) return 'Unknown bill';
    
    let narrative = `${bill.title || 'Unknown title'}`;
    
    if (bill.billType && bill.billNumber) {
      narrative += ` (${bill.billType.toUpperCase()} ${bill.billNumber})`;
    }
    
    if (bill.sponsor?.fullName) {
      const party = bill.sponsor.party || '?';
      const state = bill.sponsor.state || '?';
      narrative += ` was introduced by ${bill.sponsor.fullName} (${party}-${state})`;
    }
    
    if (contextualData?.actions?.actions?.length > 0) {
      const latestAction = contextualData.actions.actions[0];
      if (latestAction?.text && latestAction?.actionDate) {
        narrative += `. Latest action: ${latestAction.text} (${new Date(latestAction.actionDate).toLocaleDateString()})`;
      }
    }
    
    if (contextualData?.cosponsors?.cosponsors?.length > 0) {
      narrative += `. Has ${contextualData.cosponsors.cosponsors.length} cosponsors`;
    }
    
    return narrative;
  }

  private generateMemberInsights(member: any, contextualData: any): string[] {
    const insights: string[] = [];
    
    insights.push(`${member.party} from ${member.state}`);
    
    if (contextualData.sponsoredLegislation?.bills?.length > 0) {
      insights.push(`Has sponsored ${contextualData.sponsoredLegislation.bills.length} bills`);
    }
    
    if (member.leadership) {
      insights.push(`Leadership position: ${member.leadership}`);
    }
    
    return insights;
  }

  private generateMemberNarrative(member: any, contextualData: any): string {
    if (!member) return 'Unknown member';
    
    let narrative = `${member.name || 'Unknown name'}`;
    
    if (member.party) {
      const partyName = member.party === 'D' ? 'Democratic' : 
                       member.party === 'R' ? 'Republican' : 
                       member.party === 'I' ? 'Independent' : 
                       member.party;
      narrative += ` is a ${partyName} `;
    }
    
    if (member.chamber) {
      narrative += member.chamber === 'house' ? 'Representative' : 'Senator';
    }
    
    if (member.state) {
      narrative += ` from ${member.state}`;
    }
    
    if (member.district) {
      narrative += ` (District ${member.district})`;
    }
    
    if (contextualData?.sponsoredLegislation?.bills?.length > 0) {
      narrative += `. Has sponsored ${contextualData.sponsoredLegislation.bills.length} pieces of legislation`;
    }
    
    return narrative;
  }

  private generateSummary(results: EnrichedResult[], analysis: QueryAnalysis): string {
    if (results.length === 0) {
      return "No results found matching your query.";
    }
    
    const entityType = analysis.intent === 'bill' ? 'bills' : 
                      analysis.intent === 'member' ? 'members' : 'committees';
    
    let summary = `Found ${results.length} ${entityType} matching your query`;
    
    if (analysis.filters.congress) {
      summary += ` from the ${analysis.filters.congress}th Congress`;
    }
    
    if (analysis.filters.chamber) {
      summary += ` in the ${analysis.filters.chamber}`;
    }
    
    summary += '.';
    
    // Add key insights from top results
    if (results.length > 0 && results[0].insights && results[0].insights.length > 0) {
      summary += ` Top result: ${results[0].insights[0]}`;
    }
    
    return summary;
  }

  private generateSuggestions(results: EnrichedResult[], analysis: QueryAnalysis): string[] {
    const suggestions: string[] = [];
    
    if (results.length > 0) {
      if (analysis.intent === 'bill' && results[0].data.sponsor) {
        suggestions.push(`View all bills by ${results[0].data.sponsor.fullName}`);
      }
      
      if (analysis.intent === 'bill' && results[0].contextualData?.subjects?.subjects?.policyArea) {
        suggestions.push(`Search for more ${results[0].contextualData.subjects.subjects.policyArea.name} bills`);
      }
      
      if (!analysis.subResources.includes('text')) {
        suggestions.push("Add 'full text' to your query to see bill content");
      }
    }
    
    return suggestions;
  }

  private determineBillStage(actions: any[]): string {
    if (!actions || actions.length === 0) return 'Unknown';
    
    const latestAction = actions[0];
    const actionText = latestAction?.text?.toLowerCase() || '';
    
    if (actionText.includes('became law') || actionText.includes('signed by president')) {
      return 'Enacted into law';
    } else if (actionText.includes('passed house') && actionText.includes('passed senate')) {
      return 'Passed both chambers';
    } else if (actionText.includes('passed house') || actionText.includes('passed senate')) {
      return 'Passed one chamber';
    } else if (actionText.includes('reported') && actionText.includes('committee')) {
      return 'Reported by committee';
    } else if (actionText.includes('committee')) {
      return 'In committee';
    } else if (actionText.includes('introduced')) {
      return 'Introduced';
    }
    
    return 'In progress';
  }

  private assessBipartisanSupport(cosponsors: any[]): string {
    if (!cosponsors || !Array.isArray(cosponsors) || cosponsors.length === 0) {
      return 'No cosponsors yet';
    }
    
    const partyCount = new Map<string, number>();
    
    cosponsors.forEach(cosponsor => {
      const party = cosponsor?.party || 'Unknown';
      partyCount.set(party, (partyCount.get(party) || 0) + 1);
    });
    
    const democrats = partyCount.get('D') || 0;
    const republicans = partyCount.get('R') || 0;
    
    if (democrats > 0 && republicans > 0) {
      const total = cosponsors.length;
      const minorityPercent = Math.min(democrats, republicans) / total;
      
      if (minorityPercent > 0.3) return `Strong bipartisan support (${democrats}D, ${republicans}R)`;
      if (minorityPercent > 0.1) return `Moderate bipartisan support (${democrats}D, ${republicans}R)`;
      return `Limited bipartisan support (${democrats}D, ${republicans}R)`;
    }
    
    if (democrats > 0) return `Democratic support only (${democrats} cosponsors)`;
    if (republicans > 0) return `Republican support only (${republicans} cosponsors)`;
    return 'No cosponsors yet';
  }

  private assessActivityLevel(actions: any[]): string {
    if (!actions || actions.length === 0) return 'No recent activity';
    
    const latestAction = actions[0];
    if (!latestAction) return 'No recent activity';
    
    const actionDate = new Date(latestAction.actionDate || latestAction.date);
    const daysSince = Math.floor((Date.now() - actionDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSince === 0) return 'Activity today - very active';
    if (daysSince === 1) return 'Activity yesterday - very active';
    if (daysSince < 7) return `Last activity ${daysSince} days ago - active`;
    if (daysSince < 30) return `Last activity ${Math.floor(daysSince / 7)} weeks ago - moderately active`;
    if (daysSince < 90) return `Last activity ${Math.floor(daysSince / 30)} months ago - slow progress`;
    return `Last activity ${Math.floor(daysSince / 30)} months ago - stalled`;
  }

  private calculateRelevanceScore(bill: any, contextualData: any): number {
    let score = 50; // Base score
    
    if (!contextualData) {
      return score;
    }
    
    // Recent activity boost
    if (contextualData.actions?.actions?.length > 0) {
      const latestAction = contextualData.actions.actions[0];
      if (latestAction?.actionDate) {
        const daysSince = Math.floor((Date.now() - new Date(latestAction.actionDate).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince < 7) score += 20;
        else if (daysSince < 30) score += 10;
      }
    }
    
    // Cosponsor support boost
    const cosponsorCount = contextualData.cosponsors?.cosponsors?.length || 0;
    if (cosponsorCount > 50) score += 15;
    else if (cosponsorCount > 20) score += 10;
    else if (cosponsorCount > 5) score += 5;
    
    // Stage progression boost
    if (contextualData.actions?.actions?.length > 0) {
      const stage = this.determineBillStage(contextualData.actions.actions);
      if (stage.includes('law')) score += 25;
      else if (stage.includes('Passed both')) score += 20;
      else if (stage.includes('Passed one')) score += 15;
      else if (stage.includes('committee')) score += 5;
    }
    
    return Math.min(score, 100);
  }

  private isValidState(code: string): boolean {
    const states = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC','PR','VI','GU','AS','MP'];
    return states.includes(code);
  }

  private extractMemberIdFromUrl(url: string): string | null {
    if (!url || typeof url !== 'string') return null;
    const match = url.match(/\/member\/([^\/]+)/);
    return match ? match[1] : null;
  }

  /**
   * Make authenticated API request with rate limiting
   */
  private async makeApiRequest(endpoint: string): Promise<any> {
    if (!this.rateLimiter.canMakeRequest()) {
      const resetTime = this.rateLimiter.getResetTime();
      throw new RateLimitError(`Rate limit exceeded. Resets at ${resetTime?.toISOString()}`);
    }

    const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    this.rateLimiter.recordRequest();

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
      throw new ApiError(`API error: ${response.statusText}`, response.status);
    }

    return response.json();
  }
}

/**
 * Handle congress query tool execution
 */
export async function handleCongressQuery(
  params: CongressQueryParams,
  apiBaseUrl: string,
  accessToken: string
): Promise<CallToolResult> {
  try {
    const tool = new CongressQueryTool(apiBaseUrl, accessToken);
    const result = await tool.processQuery(params);
    
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    console.error('Error in handleCongressQuery:', error);
    
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
          text: `Not found: ${error.message}`
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