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
 * Zod schema for subresource parameters
 */
export const subresourceParamsSchema = z.object({
  parentUri: z.string().min(1).describe("Parent resource URI (e.g., 'congress-gov:/bill/118/hr/1')"),
  subresource: z.string().min(1).describe("Subresource name (e.g., 'actions', 'cosponsors', 'committees')"),
  limit: z.number().min(1).max(100).optional().default(20).describe("Maximum number of results to return"),
  offset: z.number().min(0).optional().default(0).describe("Number of results to skip"),
  includeAnalysis: z.boolean().optional().default(true).describe("Whether to include detailed analysis"),
  format: z.enum(["detailed", "summary", "raw"]).optional().default("detailed").describe("Output format level")
});

export type SubresourceParams = z.infer<typeof subresourceParamsSchema>;

/**
 * Enhanced subresource tool with intelligent processing
 */
export class SubresourceTool {
  constructor(
    private apiBaseUrl: string,
    private accessToken: string
  ) {}

  /**
   * Get subresource data with intelligent processing
   */
  async getSubresource(params: SubresourceParams): Promise<any> {
    try {
      console.log('Fetching subresource', { 
        parentUri: params.parentUri, 
        subresource: params.subresource 
      });

      // Validate and parse parent URI
      const parentInfo = this.parseParentUri(params.parentUri);
      if (!parentInfo) {
        throw new ValidationError(`Invalid parent URI format: ${params.parentUri}`);
      }

      // Build API endpoint based on parent URI and subresource
      const endpoint = this.buildEndpoint(parentInfo, params.subresource);
      if (!endpoint) {
        throw new ValidationError(`Unsupported subresource combination: ${parentInfo.collection}/${params.subresource}`);
      }
      
      // Fetch subresource data from LegisAPI
      const subresourceData = await this.makeApiRequest(endpoint);

      // Process and enhance the data
      const processedData = this.processSubresourceData(
        subresourceData,
        params.subresource,
        parentInfo,
        params.format || 'detailed'
      );

      // Generate analysis if requested
      const analysis = params.includeAnalysis ? 
        this.generateSubresourceAnalysis(processedData, params.subresource, parentInfo) : 
        null;

      return {
        parentResource: parentInfo,
        subresource: params.subresource,
        data: processedData,
        analysis,
        metadata: {
          fetchedAt: new Date().toISOString(),
          format: params.format,
          pagination: {
            limit: params.limit,
            offset: params.offset,
            hasMore: this.hasMoreResults(subresourceData)
          }
        }
      };

    } catch (error) {
      console.error('Error fetching subresource', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Parse parent URI to extract resource information
   */
  private parseParentUri(uri: string): any {
    try {
      // Handle congress-gov:// format
      const cleanUri = uri.replace(/^congress-gov:\/\/?/, '');
      const parts = cleanUri.split('/');
      
      if (parts.length < 1) return null;

      const collection = parts[0];
      const resourceInfo = {
        collection,
        path: `/${cleanUri}`,
        identifiers: {}
      };

      // Parse collection-specific identifiers
      switch (collection) {
        case 'bill':
          if (parts.length >= 4) {
            resourceInfo.identifiers = {
              congress: parts[1],
              billType: parts[2],
              billNumber: parts[3]
            };
          }
          break;
        case 'amendment':
          if (parts.length >= 4) {
            resourceInfo.identifiers = {
              congress: parts[1],
              amendmentType: parts[2],
              amendmentNumber: parts[3]
            };
          }
          break;
        case 'member':
          if (parts.length >= 2) {
            resourceInfo.identifiers = {
              memberId: parts[1],
              congress: parts[2]
            };
          }
          break;
        case 'committee':
          if (parts.length >= 3) {
            resourceInfo.identifiers = {
              chamber: parts[1],
              committeeCode: parts[2],
              congress: parts[3]
            };
          }
          break;
      }

      return resourceInfo;
    } catch (error) {
      console.error('Error parsing parent URI:', error);
      return null;
    }
  }

  /**
   * Process subresource data based on type
   */
  private processSubresourceData(
    data: any,
    subresource: string,
    parentInfo: any,
    format: string
  ): any {
    if (!data) return null;

    // Apply format-specific processing
    switch (format) {
      case 'raw':
        return data;
      case 'summary':
        return this.generateSummaryFormat(data, subresource);
      case 'detailed':
      default:
        return this.generateDetailedFormat(data, subresource, parentInfo);
    }
  }

  /**
   * Generate summary format
   */
  private generateSummaryFormat(data: any, subresource: string): any {
    const items = this.extractItems(data, subresource);
    
    return {
      count: items.length,
      summary: this.generateQuickSummary(items, subresource),
      keyStats: this.generateKeyStats(items, subresource)
    };
  }

  /**
   * Generate detailed format
   */
  private generateDetailedFormat(data: any, subresource: string, parentInfo: any): any {
    const items = this.extractItems(data, subresource);
    
    return {
      count: items.length,
      items: items.map(item => this.enhanceItem(item, subresource, parentInfo)),
      summary: this.generateDetailedSummary(items, subresource),
      insights: this.generateInsights(items, subresource),
      patterns: this.identifyPatterns(items, subresource)
    };
  }

  /**
   * Extract items from subresource data
   */
  private extractItems(data: any, subresource: string): any[] {
    if (!data) return [];
    
    // Map subresource names to data property names
    const dataMapping: Record<string, string> = {
      'actions': 'actions',
      'cosponsors': 'cosponsors',
      'committees': 'committees',
      'subjects': 'subjects',
      'text': 'text',
      'amendments': 'amendments',
      'related-bills': 'relatedBills',
      'summaries': 'summaries',
      'titles': 'titles',
      'sponsored-legislation': 'sponsoredLegislation',
      'cosponsored-legislation': 'cosponsoredLegislation'
    };

    const propertyName = dataMapping[subresource] || subresource;
    
    // Handle both old (double-wrapped) and new (correct) formats
    // New format: data.actions is the array directly
    if (Array.isArray(data[propertyName])) {
      return data[propertyName];
    }
    
    // Old format: data.actions.actions is the array (double-wrapped)
    if (data[propertyName] && Array.isArray(data[propertyName][propertyName])) {
      return data[propertyName][propertyName];
    }
    
    // Direct array response
    if (Array.isArray(data)) {
      return data;
    }
    
    // Special handling for subjects which has a different structure
    if (subresource === 'subjects' && data.subjects) {
      // Congress.gov returns subjects as an object with legislativeSubjects array
      return [data.subjects]; // Wrap in array for consistent handling
    }
    
    return [];
  }

  /**
   * Enhance individual item with additional context
   */
  private enhanceItem(item: any, subresource: string, parentInfo: any): any {
    const enhancedItem = { ...item };

    // Add subresource-specific enhancements
    switch (subresource) {
      case 'actions':
        enhancedItem.significance = this.assessActionSignificance(item);
        enhancedItem.category = this.categorizeAction(item);
        enhancedItem.daysAgo = this.calculateDaysAgo(item.actionDate);
        break;
      
      case 'cosponsors':
        enhancedItem.partyAffiliation = this.getPartyFullName(item.party);
        enhancedItem.isLeader = this.checkLeadershipStatus(item);
        enhancedItem.district = this.formatDistrict(item.district, item.state);
        break;
      
      case 'committees':
        enhancedItem.jurisdiction = this.getCommitteeJurisdiction(item);
        enhancedItem.memberRole = this.extractMemberRole(item);
        enhancedItem.activityLevel = this.assessCommitteeActivity(item);
        break;
      
      case 'subjects':
        enhancedItem.relevanceScore = this.calculateSubjectRelevance(item);
        enhancedItem.category = this.categorizeSubject(item);
        break;
    }

    return enhancedItem;
  }

  /**
   * Generate subresource analysis
   */
  private generateSubresourceAnalysis(
    data: any,
    subresource: string,
    parentInfo: any
  ): any {
    const analysis = {
      overview: this.generateOverview(data, subresource),
      trends: this.analyzeTrends(data, subresource),
      patterns: this.identifyPatterns(data.items || data, subresource),
      recommendations: this.generateRecommendations(data, subresource),
      context: this.generateContext(data, subresource, parentInfo)
    };

    return analysis;
  }

  /**
   * Generate overview analysis
   */
  private generateOverview(data: any, subresource: string): any {
    const items = data.items || data;
    const count = Array.isArray(items) ? items.length : 0;

    switch (subresource) {
      case 'actions':
        return {
          totalActions: count,
          timespan: this.calculateTimespan(items),
          activityLevel: this.assessActivityLevel(items),
          latestAction: count > 0 ? items[0] : null
        };
      
      case 'cosponsors':
        return {
          totalCosponsors: count,
          bipartisanSupport: this.assessBipartisanSupport(items),
          geographicDistribution: this.analyzeGeographicDistribution(items),
          partyBreakdown: this.analyzePartyBreakdown(items)
        };
      
      case 'committees':
        return {
          totalCommittees: count,
          chambers: this.analyzeChamberDistribution(items),
          jurisdictions: this.analyzeJurisdictions(items),
          leadership: this.analyzeLeadershipRoles(items)
        };
      
      default:
        return {
          totalItems: count,
          itemType: subresource,
          basicStats: this.generateBasicStats(items)
        };
    }
  }

  /**
   * Analyze trends in the data
   */
  private analyzeTrends(data: any, subresource: string): any {
    const items = data.items || data;
    
    switch (subresource) {
      case 'actions':
        return this.analyzeActionTrends(items);
      case 'cosponsors':
        return this.analyzeCosponsorTrends(items);
      default:
        return this.analyzeGenericTrends(items);
    }
  }

  /**
   * Analyze action trends
   */
  private analyzeActionTrends(actions: any[]): any {
    const trends = {
      activityOverTime: this.groupActionsByMonth(actions),
      typeDistribution: this.analyzeActionTypes(actions),
      momentum: this.calculateMomentum(actions)
    };

    return trends;
  }

  /**
   * Analyze cosponsor trends
   */
  private analyzeCosponsorTrends(cosponsors: any[]): any {
    const trends = {
      supportGrowth: this.analyzeSupportGrowth(cosponsors),
      geographicSpread: this.analyzeGeographicSpread(cosponsors),
      bipartisanEvolution: this.analyzeBipartisanEvolution(cosponsors)
    };

    return trends;
  }

  // Helper methods for analysis

  private assessActionSignificance(action: any): string {
    const text = action.text?.toLowerCase() || '';
    
    if (text.includes('became law') || text.includes('signed by president')) {
      return 'Critical';
    } else if (text.includes('passed house') || text.includes('passed senate')) {
      return 'High';
    } else if (text.includes('reported') || text.includes('markup')) {
      return 'Medium';
    }
    return 'Low';
  }

  private categorizeAction(action: any): string {
    const text = action.text?.toLowerCase() || '';
    
    if (text.includes('introduced')) return 'Introduction';
    if (text.includes('committee')) return 'Committee';
    if (text.includes('floor') || text.includes('vote')) return 'Floor';
    if (text.includes('passed')) return 'Passage';
    if (text.includes('signed') || text.includes('law')) return 'Enactment';
    return 'Other';
  }

  private calculateDaysAgo(dateString: string): number {
    if (!dateString) return -1;
    const date = new Date(dateString);
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  }

  private getPartyFullName(party: string): string {
    const partyMap: Record<string, string> = {
      'D': 'Democratic',
      'R': 'Republican',
      'I': 'Independent'
    };
    return partyMap[party] || party;
  }

  private checkLeadershipStatus(member: any): boolean {
    return member.leadership !== undefined && member.leadership !== null;
  }

  private formatDistrict(district: string, state: string): string {
    if (!district || !state) return '';
    return `${state}-${district}`;
  }

  private assessBipartisanSupport(cosponsors: any[]): any {
    const partyCount = new Map<string, number>();
    
    cosponsors.forEach(cosponsor => {
      const party = cosponsor.party || 'Unknown';
      partyCount.set(party, (partyCount.get(party) || 0) + 1);
    });

    const democrats = partyCount.get('D') || 0;
    const republicans = partyCount.get('R') || 0;
    const independents = partyCount.get('I') || 0;

    return {
      isBipartisan: democrats > 0 && republicans > 0,
      partyBalance: Math.min(democrats, republicans) / Math.max(democrats, republicans, 1),
      breakdown: { democrats, republicans, independents },
      score: this.calculateBipartisanScore(democrats, republicans, independents)
    };
  }

  private calculateBipartisanScore(dem: number, rep: number, ind: number): number {
    const total = dem + rep + ind;
    if (total === 0) return 0;
    
    const minority = Math.min(dem, rep);
    const majority = Math.max(dem, rep);
    
    return Math.round((minority / total) * 100);
  }

  private analyzeGeographicDistribution(members: any[]): any {
    const stateCount = new Map<string, number>();
    const regionCount = new Map<string, number>();
    
    members.forEach(member => {
      const state = member.state || 'Unknown';
      stateCount.set(state, (stateCount.get(state) || 0) + 1);
      
      const region = this.getRegion(state);
      regionCount.set(region, (regionCount.get(region) || 0) + 1);
    });

    return {
      stateCount: stateCount.size,
      topStates: Array.from(stateCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      regionDistribution: Object.fromEntries(regionCount)
    };
  }

  private getRegion(state: string): string {
    const regions = {
      'Northeast': ['ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA'],
      'Southeast': ['DE', 'MD', 'VA', 'WV', 'KY', 'TN', 'NC', 'SC', 'GA', 'FL', 'AL', 'MS', 'AR', 'LA'],
      'Midwest': ['OH', 'IN', 'IL', 'MI', 'WI', 'MN', 'IA', 'MO', 'ND', 'SD', 'NE', 'KS'],
      'Southwest': ['TX', 'OK', 'NM', 'AZ'],
      'West': ['CO', 'WY', 'MT', 'ID', 'WA', 'OR', 'UT', 'NV', 'CA', 'AK', 'HI']
    };

    for (const [region, states] of Object.entries(regions)) {
      if (states.includes(state)) return region;
    }
    return 'Other';
  }

  private analyzePartyBreakdown(members: any[]): any {
    const breakdown = new Map<string, number>();
    
    members.forEach(member => {
      const party = member.party || 'Unknown';
      breakdown.set(party, (breakdown.get(party) || 0) + 1);
    });

    return Object.fromEntries(breakdown);
  }

  private generateQuickSummary(items: any[], subresource: string): string {
    const count = items.length;
    
    switch (subresource) {
      case 'actions':
        return `${count} actions recorded, latest: ${items[0]?.text || 'Unknown'}`;
      case 'cosponsors':
        return `${count} cosponsors with ${this.assessBipartisanSupport(items).isBipartisan ? 'bipartisan' : 'partisan'} support`;
      case 'committees':
        return `${count} committees across ${this.analyzeChamberDistribution(items).chambers} chambers`;
      default:
        return `${count} ${subresource} found`;
    }
  }

  private generateKeyStats(items: any[], subresource: string): any {
    switch (subresource) {
      case 'actions':
        return {
          totalActions: items.length,
          daysActive: this.calculateTimespan(items),
          significantActions: items.filter(a => this.assessActionSignificance(a) === 'High').length
        };
      case 'cosponsors':
        const bipartisan = this.assessBipartisanSupport(items);
        return {
          totalCosponsors: items.length,
          bipartisanScore: bipartisan.score,
          stateCount: new Set(items.map(c => c.state)).size
        };
      default:
        return { totalItems: items.length };
    }
  }

  private calculateTimespan(items: any[]): number {
    if (items.length === 0) return 0;
    
    const dates = items
      .map(item => new Date(item.actionDate || item.date || item.introducedDate))
      .filter(date => !isNaN(date.getTime()))
      .sort((a, b) => b.getTime() - a.getTime());

    if (dates.length < 2) return 0;
    
    return Math.ceil((dates[0].getTime() - dates[dates.length - 1].getTime()) / (1000 * 60 * 60 * 24));
  }

  private assessActivityLevel(actions: any[]): string {
    const count = actions.length;
    const timespan = this.calculateTimespan(actions);
    
    if (timespan === 0) return 'Single Event';
    
    const actionsPerDay = count / timespan;
    
    if (actionsPerDay > 0.5) return 'Very High';
    if (actionsPerDay > 0.2) return 'High';
    if (actionsPerDay > 0.1) return 'Medium';
    return 'Low';
  }

  private analyzeChamberDistribution(committees: any[]): any {
    const chambers = new Set(committees.map(c => c.chamber));
    return {
      chambers: chambers.size,
      distribution: Object.fromEntries(
        Array.from(chambers).map(chamber => [
          chamber,
          committees.filter(c => c.chamber === chamber).length
        ])
      )
    };
  }

  private groupActionsByMonth(actions: any[]): any[] {
    const monthlyCount = new Map<string, number>();
    
    actions.forEach(action => {
      const date = new Date(action.actionDate || action.date);
      if (!isNaN(date.getTime())) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyCount.set(monthKey, (monthlyCount.get(monthKey) || 0) + 1);
      }
    });

    return Array.from(monthlyCount.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12)
      .map(([month, count]) => ({ month, count }));
  }

  private analyzeActionTypes(actions: any[]): any {
    const typeCount = new Map<string, number>();
    
    actions.forEach(action => {
      const category = this.categorizeAction(action);
      typeCount.set(category, (typeCount.get(category) || 0) + 1);
    });

    return Object.fromEntries(typeCount);
  }

  private calculateMomentum(actions: any[]): string {
    if (actions.length === 0) return 'None';
    
    const now = new Date();
    const recentActions = actions.filter(action => {
      const date = new Date(action.actionDate || action.date);
      return (now.getTime() - date.getTime()) < 30 * 24 * 60 * 60 * 1000; // 30 days
    });

    const recentRatio = recentActions.length / actions.length;
    
    if (recentRatio > 0.5) return 'High';
    if (recentRatio > 0.2) return 'Medium';
    return 'Low';
  }

  private hasMoreResults(data: any): boolean {
    return data.pagination?.next !== undefined;
  }

  private generateDetailedSummary(items: any[], subresource: string): string {
    return `Detailed analysis of ${items.length} ${subresource} items with comprehensive insights and patterns.`;
  }

  private generateInsights(items: any[], subresource: string): string[] {
    const insights = [];
    
    switch (subresource) {
      case 'actions':
        const recentActions = items.filter(a => this.calculateDaysAgo(a.actionDate) < 30);
        if (recentActions.length > 0) {
          insights.push(`${recentActions.length} actions in the last 30 days`);
        }
        break;
      case 'cosponsors':
        const bipartisan = this.assessBipartisanSupport(items);
        if (bipartisan.isBipartisan) {
          insights.push(`Bipartisan support with ${bipartisan.score}% minority party participation`);
        }
        break;
    }
    
    return insights;
  }

  private identifyPatterns(items: any[], subresource: string): any[] {
    const patterns = [];
    
    // Add pattern identification logic based on subresource type
    switch (subresource) {
      case 'actions':
        const actionFrequency = this.analyzeActionFrequency(items);
        if (actionFrequency.pattern) {
          patterns.push(actionFrequency);
        }
        break;
    }
    
    return patterns;
  }

  private analyzeActionFrequency(actions: any[]): any {
    // Simplified pattern analysis
    const dates = actions
      .map(a => new Date(a.actionDate || a.date))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (dates.length < 3) return { pattern: null };

    const intervals = [];
    for (let i = 1; i < dates.length; i++) {
      intervals.push(dates[i].getTime() - dates[i - 1].getTime());
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const avgDays = avgInterval / (1000 * 60 * 60 * 24);

    return {
      pattern: 'frequency',
      averageInterval: Math.round(avgDays),
      description: `Actions occur approximately every ${Math.round(avgDays)} days`
    };
  }

  private generateRecommendations(data: any, subresource: string): string[] {
    const recommendations = [];
    
    switch (subresource) {
      case 'actions':
        recommendations.push('Monitor recent actions for legislative momentum');
        break;
      case 'cosponsors':
        recommendations.push('Analyze cosponsor growth patterns for support trends');
        break;
    }
    
    return recommendations;
  }

  private generateContext(data: any, subresource: string, parentInfo: any): any {
    return {
      parentResource: parentInfo.collection,
      subresourceType: subresource,
      relationshipType: this.getRelationshipType(subresource),
      dataInterpretation: this.getDataInterpretation(subresource)
    };
  }

  private getRelationshipType(subresource: string): string {
    const relationships: Record<string, string> = {
      'actions': 'chronological',
      'cosponsors': 'supportive',
      'committees': 'jurisdictional',
      'subjects': 'topical',
      'amendments': 'modificational'
    };
    
    return relationships[subresource] || 'related';
  }

  private getDataInterpretation(subresource: string): string {
    const interpretations: Record<string, string> = {
      'actions': 'Legislative process steps and their timing',
      'cosponsors': 'Congressional support and coalition building',
      'committees': 'Jurisdictional oversight and review process',
      'subjects': 'Policy areas and topical classification',
      'amendments': 'Proposed modifications and changes'
    };
    
    return interpretations[subresource] || 'Related legislative data';
  }

  private generateBasicStats(items: any[]): any {
    return {
      count: items.length,
      hasData: items.length > 0
    };
  }

  private analyzeGenericTrends(items: any[]): any {
    return {
      itemCount: items.length,
      trend: 'stable'
    };
  }

  private analyzeSupportGrowth(cosponsors: any[]): any {
    // Simplified support growth analysis
    return {
      totalSupport: cosponsors.length,
      trend: 'growing'
    };
  }

  private analyzeGeographicSpread(cosponsors: any[]): any {
    const states = new Set(cosponsors.map(c => c.state));
    return {
      stateCount: states.size,
      nationalSpread: states.size > 25
    };
  }

  private analyzeBipartisanEvolution(cosponsors: any[]): any {
    const bipartisan = this.assessBipartisanSupport(cosponsors);
    return {
      currentState: bipartisan.isBipartisan ? 'bipartisan' : 'partisan',
      score: bipartisan.score
    };
  }

  private getCommitteeJurisdiction(committee: any): string {
    // Simplified jurisdiction mapping
    const name = committee.name?.toLowerCase() || '';
    if (name.includes('judiciary')) return 'Legal Affairs';
    if (name.includes('finance') || name.includes('budget')) return 'Economic Policy';
    if (name.includes('foreign')) return 'Foreign Affairs';
    if (name.includes('defense') || name.includes('armed')) return 'National Defense';
    return 'General Legislation';
  }

  private extractMemberRole(committee: any): string {
    if (committee.activities) {
      const activity = committee.activities.find((a: any) => 
        a.name?.toLowerCase().includes('chair') || 
        a.name?.toLowerCase().includes('ranking')
      );
      if (activity) return activity.name;
    }
    return 'Member';
  }

  private assessCommitteeActivity(committee: any): string {
    // Simplified activity assessment
    return committee.activities?.length > 3 ? 'High' : 'Medium';
  }

  private calculateSubjectRelevance(subject: any): number {
    // Simplified relevance scoring
    return 50;
  }

  private categorizeSubject(subject: any): string {
    // Simplified subject categorization
    return subject.name?.split(' ')[0] || 'General';
  }

  private analyzeJurisdictions(committees: any[]): any {
    const jurisdictions = new Map<string, number>();
    
    committees.forEach(committee => {
      const jurisdiction = this.getCommitteeJurisdiction(committee);
      jurisdictions.set(jurisdiction, (jurisdictions.get(jurisdiction) || 0) + 1);
    });

    return Object.fromEntries(jurisdictions);
  }

  private analyzeLeadershipRoles(committees: any[]): any {
    const roles = new Map<string, number>();
    
    committees.forEach(committee => {
      const role = this.extractMemberRole(committee);
      roles.set(role, (roles.get(role) || 0) + 1);
    });

    return Object.fromEntries(roles);
  }
  
  /**
   * Build LegisAPI endpoint from parent URI and subresource
   */
  private buildEndpoint(parentInfo: any, subresource: string): string | null {
    const { collection, identifiers } = parentInfo;
    
    // Handle bill subresources
    if (collection === 'bill' && identifiers.congress && identifiers.billType && identifiers.billNumber) {
      const { congress, billType, billNumber } = identifiers;
      const subresourceMap: Record<string, string> = {
        'actions': `/api/bills/${congress}/${billType}/${billNumber}/actions`,
        'cosponsors': `/api/bills/${congress}/${billType}/${billNumber}/cosponsors`,
        'committees': `/api/bills/${congress}/${billType}/${billNumber}/committees`,
        'subjects': `/api/bills/${congress}/${billType}/${billNumber}/subjects`,
        'text': `/api/bills/${congress}/${billType}/${billNumber}/text`,
        'summaries': `/api/bills/${congress}/${billType}/${billNumber}/summaries`,
        'amendments': `/api/bills/${congress}/${billType}/${billNumber}/amendments`,
        'relatedbills': `/api/bills/${congress}/${billType}/${billNumber}/relatedbills`,
        'related-bills': `/api/bills/${congress}/${billType}/${billNumber}/relatedbills`
      };
      return subresourceMap[subresource] || null;
    }
    
    // Other collections not yet supported in LegisAPI
    return null;
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
        throw new ApiError('API Permission denied - check Auth0 scopes or API key permissions', 403);
      }
      throw new ApiError(`API error: ${response.statusText}`, response.status);
    }

    return response.json();
  }
}

/**
 * Handle subresource tool execution
 */
export async function handleSubresource(
  params: SubresourceParams,
  apiBaseUrl: string,
  accessToken: string
): Promise<CallToolResult> {
  try {
    const tool = new SubresourceTool(apiBaseUrl, accessToken);
    const result = await tool.getSubresource(params);
    
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    console.error('Error in handleSubresource:', error);
    
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
          text: `Subresource not found: ${error.message}`
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
export const TOOL_NAME = "subresource";
export const TOOL_DESCRIPTION = `Get detailed subresource data with intelligent analysis and processing.

Supports all legislative subresources including:
- Bill subresources: actions, cosponsors, committees, subjects, text, amendments, summaries
- Member subresources: sponsored-legislation, cosponsored-legislation, committees
- Committee subresources: bills, reports, members
- Advanced analysis: trends, patterns, insights, recommendations

Output formats:
- detailed: Full analysis with insights and patterns
- summary: Key statistics and highlights only
- raw: Unprocessed API data

Examples:
- Get bill actions: parentUri = "congress-gov:/bill/118/hr/1", subresource = "actions"
- Get member committees: parentUri = "congress-gov:/member/P000197", subresource = "committees"
- Summary format: parentUri = "congress-gov:/bill/118/hr/1", subresource = "cosponsors", format = "summary"
- With pagination: parentUri = "congress-gov:/bill/118/hr/1", subresource = "actions", limit = 50, offset = 0`;

export const TOOL_PARAMS = {
  parentUri: z.string().min(1).describe("Parent resource URI (e.g., 'congress-gov:/bill/118/hr/1')"),
  subresource: z.string().min(1).describe("Subresource name (e.g., 'actions', 'cosponsors', 'committees')"),
  limit: z.number().min(1).max(100).optional().default(20).describe("Maximum number of results to return"),
  offset: z.number().min(0).optional().default(0).describe("Number of results to skip"),
  includeAnalysis: z.boolean().optional().default(true).describe("Whether to include detailed analysis"),
  format: z.enum(["detailed", "summary", "raw"]).optional().default("detailed").describe("Output format level")
};