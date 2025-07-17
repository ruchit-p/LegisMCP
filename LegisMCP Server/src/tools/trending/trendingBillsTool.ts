import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { 
  NotFoundError, 
  AuthenticationError, 
  RateLimitError, 
  ValidationError, 
  ApiError,
  BaseError
} from "../../utils/errors.js";
import { RateLimitService } from "../../services/RateLimitService.js";

/**
 * Zod schema for trending bills parameters
 */
export const trendingBillsParamsSchema = z.object({
  timeframe: z.enum(["week", "month", "quarter", "year"]).optional().default("month"),
  category: z.enum(["all", "passed", "active", "introduced", "bipartisan"]).optional().default("all"),
  limit: z.number().min(1).max(50).optional().default(10),
  congress: z.number().optional(),
  includeAnalysis: z.boolean().optional().default(true)
});

export type TrendingBillsParams = z.infer<typeof trendingBillsParamsSchema>;

/**
 * Enhanced trending bills tool with sophisticated scoring
 */
export class TrendingBillsTool {
  private rateLimiter: RateLimitService;

  constructor(
    private apiBaseUrl: string,
    private accessToken: string
  ) {
    this.rateLimiter = new RateLimitService();
  }

  /**
   * Get trending bills based on activity and significance
   */
  async getTrendingBills(params: TrendingBillsParams): Promise<any> {
    try {
      console.log('Fetching trending bills', { 
        timeframe: params.timeframe, 
        category: params.category, 
        limit: params.limit 
      });

      // Step 1: Get recent bills based on category
      const bills = await this.fetchBillsByCategory(params);
      
      // Step 2: Score and rank bills by trending factors
      const scoredBills = await this.scoreBillsByTrending(bills, params.timeframe);
      
      // Step 3: Get top trending bills
      const topTrending = scoredBills
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, params.limit);

      // Step 4: Enhance with additional data
      const enhancedBills = await this.enhanceBillsWithData(topTrending);

      // Step 5: Generate analysis if requested
      const analysis = params.includeAnalysis ? 
        this.generateTrendingAnalysis(enhancedBills, params) : null;

      console.log('Trending bills analysis completed', { 
        billsFound: enhancedBills.length,
        timeframe: params.timeframe 
      });

      return {
        trendingBills: enhancedBills,
        analysis,
        metadata: {
          timeframe: params.timeframe,
          category: params.category,
          generatedAt: new Date().toISOString(),
          totalBillsAnalyzed: bills.length
        }
      };

    } catch (error) {
      console.error('Error fetching trending bills', { error: (error as Error).message });
      throw error;
    }
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

  /**
   * Fetch bills based on category
   */
  private async fetchBillsByCategory(params: TrendingBillsParams): Promise<any[]> {
    const searchLimit = Math.min(params.limit * 5, 250); // Get more bills to analyze
    
    const searchParams = new URLSearchParams({
      limit: searchLimit.toString(),
      sort: params.category === 'introduced' ? 'introducedDate' : 'updateDate'
    });

    if (params.congress) {
      searchParams.append('congress', params.congress.toString());
    }

    // Apply category-specific filters
    switch (params.category) {
      case 'passed':
        // Bills that have passed at least one chamber
        searchParams.append('q', 'passed');
        break;
      case 'active':
        // Recent activity (default sort by updateDate)
        break;
      case 'introduced':
        // Recently introduced (sorted by introducedDate)
        break;
      case 'bipartisan':
        // Will filter after fetching based on cosponsor data
        break;
    }

    const searchResult = await this.makeApiRequest(`/api/bills?${searchParams}`);
    return searchResult.bills || [];
  }

  /**
   * Score bills by trending factors with sophisticated algorithms
   */
  private async scoreBillsByTrending(bills: any[], timeframe: string): Promise<any[]> {
    const timeframeDays = this.getTimeframeDays(timeframe);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeframeDays);

    const scoredBills = [];

    for (const bill of bills) {
      let score = 0;

      // Recent activity score (0-30 points)
      const lastUpdate = new Date(bill.updateDate || bill.latestAction?.actionDate);
      const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate <= 1) score += 30;
      else if (daysSinceUpdate <= 7) score += 20;
      else if (daysSinceUpdate <= 30) score += 10;
      else if (daysSinceUpdate <= 90) score += 5;

      // Title significance (0-20 points)
      score += this.scoreTitleSignificance(bill.title);

      // Bill type importance (0-15 points)
      score += this.scoreBillType(bill.billType);

      // Origin chamber (0-5 points)
      if (bill.originChamber === 'House') score += 3;
      else if (bill.originChamber === 'Senate') score += 5; // Senate bills often more significant

      // Latest action significance (0-25 points)
      score += this.scoreLatestAction(bill.latestAction?.text || '');

      // Recency bonus for introduction (0-10 points)
      const introducedDate = new Date(bill.introducedDate);
      const daysSinceIntroduced = (Date.now() - introducedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceIntroduced <= 7) score += 10;
      else if (daysSinceIntroduced <= 30) score += 5;

      // Congressional priority indicator (0-15 points)
      if (bill.billNumber < 100) score += 15; // Low bill numbers often indicate priority
      else if (bill.billNumber < 500) score += 8;
      else if (bill.billNumber < 1000) score += 3;

      scoredBills.push({
        ...bill,
        trendingScore: score,
        daysSinceUpdate,
        daysSinceIntroduced,
        scoringBreakdown: {
          activityScore: Math.min(30, score),
          significanceScore: this.scoreTitleSignificance(bill.title),
          typeScore: this.scoreBillType(bill.billType),
          actionScore: this.scoreLatestAction(bill.latestAction?.text || ''),
          priorityIndicator: bill.billNumber < 100
        }
      });
    }

    return scoredBills;
  }

  /**
   * Enhance bills with additional data using parallel fetching
   */
  private async enhanceBillsWithData(bills: any[]): Promise<any[]> {
    const enhancedBills = [];

    // Process bills in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < bills.length; i += batchSize) {
      const batch = bills.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (bill) => {
        const { congress, billType, billNumber } = bill;
        
        // Use Promise.allSettled for resilient data fetching
        const [cosponsors, actions, committees, subjects] = await Promise.allSettled([
          this.makeApiRequest(`/api/bills/${congress}/${billType}/${billNumber}/cosponsors`),
          this.makeApiRequest(`/api/bills/${congress}/${billType}/${billNumber}/actions`),
          this.makeApiRequest(`/api/bills/${congress}/${billType}/${billNumber}/committees`),
          this.makeApiRequest(`/api/bills/${congress}/${billType}/${billNumber}/subjects`)
        ]);

        const cosponsorData = cosponsors.status === 'fulfilled' ? cosponsors.value : null;
        const actionData = actions.status === 'fulfilled' ? actions.value : null;
        const committeeData = committees.status === 'fulfilled' ? committees.value : null;
        const subjectData = subjects.status === 'fulfilled' ? subjects.value : null;

        // Calculate enhanced metrics
        const cosponsorsArray = Array.isArray(cosponsorData?.cosponsors) ? cosponsorData.cosponsors : [];
        const actionsArray = Array.isArray(actionData?.actions) ? actionData.actions : [];
        const subjectsObject = subjectData?.subjects || {};
        
        const bipartisanMetrics = this.calculateBipartisanMetrics(cosponsorsArray);
        const momentumScore = this.calculateMomentumScore(actionsArray);
        const impactScore = this.calculateImpactScore(bill, subjectsObject);

        return {
          ...bill,
          enhancedData: {
            cosponsorCount: cosponsorsArray.length,
            bipartisanSupport: bipartisanMetrics.isBipartisan,
            bipartisanScore: bipartisanMetrics.score,
            partyBreakdown: bipartisanMetrics.partyBreakdown,
            recentActions: actionsArray.slice(0, 5),
            activityLevel: this.assessActivityLevel(actionsArray),
            momentumScore,
            committees: Array.isArray(committeeData?.committees) ? committeeData.committees.map((c: any) => c.name) : [],
            primarySubject: subjectsObject.policyArea?.name || 'Unknown',
            subjectCount: subjectsObject.legislativeSubjects?.length || 0,
            impactScore,
            combinedScore: bill.trendingScore + momentumScore + impactScore + bipartisanMetrics.score
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

  /**
   * Generate comprehensive trending analysis
   */
  private generateTrendingAnalysis(bills: any[], params: TrendingBillsParams): any {
    const analysis = {
      summary: this.generateSummary(bills, params),
      trends: this.identifyTrends(bills),
      insights: this.generateInsights(bills),
      recommendations: this.generateRecommendations(bills),
      policyFocus: this.analyzePolicyFocus(bills),
      predictedOutcomes: this.predictOutcomes(bills)
    };

    return analysis;
  }

  // Helper Methods

  private getTimeframeDays(timeframe: string): number {
    switch (timeframe) {
      case 'week': return 7;
      case 'month': return 30;
      case 'quarter': return 90;
      case 'year': return 365;
      default: return 30;
    }
  }

  private scoreTitleSignificance(title: string): number {
    let score = 0;
    const lowerTitle = title.toLowerCase();

    // High-impact keywords (weighted)
    const highImpactKeywords = {
      'infrastructure': 18,
      'healthcare': 17,
      'tax': 16,
      'budget': 16,
      'defense': 15,
      'national security': 18,
      'climate': 15,
      'energy': 14,
      'immigration': 16,
      'education': 14,
      'social security': 15,
      'medicare': 15,
      'medicaid': 14
    };

    // Medium-impact keywords
    const mediumImpactKeywords = {
      'reform': 10,
      'act': 8,
      'amendment': 9,
      'funding': 10,
      'relief': 11,
      'support': 8,
      'protection': 9,
      'development': 8,
      'innovation': 9,
      'modernization': 10
    };

    // Check for high-impact keywords
    for (const [keyword, weight] of Object.entries(highImpactKeywords)) {
      if (lowerTitle.includes(keyword)) {
        score = Math.max(score, weight);
      }
    }

    // Add medium-impact keywords (cumulative)
    for (const [keyword, weight] of Object.entries(mediumImpactKeywords)) {
      if (lowerTitle.includes(keyword)) {
        score += weight * 0.3;
      }
    }

    // Special indicators
    if (lowerTitle.includes('comprehensive') || lowerTitle.includes('omnibus')) {
      score += 5;
    }
    if (lowerTitle.includes('bipartisan')) {
      score += 7;
    }
    if (lowerTitle.includes('emergency')) {
      score += 8;
    }

    return Math.min(score, 20); // Cap at 20 points
  }

  private scoreBillType(type: string): number {
    switch (type?.toLowerCase()) {
      case 'hr': return 15;    // House bills
      case 's': return 12;     // Senate bills
      case 'hjres': return 10; // House joint resolutions
      case 'sjres': return 8;  // Senate joint resolutions
      case 'hres': return 5;   // House resolutions
      case 'sres': return 3;   // Senate resolutions
      default: return 0;
    }
  }

  private scoreLatestAction(actionText: string): number {
    let score = 0;
    const lowerAction = actionText.toLowerCase();

    // High-significance actions
    if (lowerAction.includes('became public law') || lowerAction.includes('signed by president')) {
      score = 25;
    } else if (lowerAction.includes('passed house') && lowerAction.includes('passed senate')) {
      score = 24;
    } else if (lowerAction.includes('passed house') || lowerAction.includes('passed senate')) {
      score = 22;
    } else if (lowerAction.includes('reported by committee') || lowerAction.includes('ordered to be reported')) {
      score = 18;
    } else if (lowerAction.includes('committee markup') || lowerAction.includes('markup session')) {
      score = 15;
    } else if (lowerAction.includes('hearing held') || lowerAction.includes('hearing scheduled')) {
      score = 12;
    } else if (lowerAction.includes('subcommittee')) {
      score = 8;
    } else if (lowerAction.includes('referred to committee')) {
      score = 5;
    } else if (lowerAction.includes('introduced')) {
      score = 3;
    }

    return score;
  }

  private calculateBipartisanMetrics(cosponsors: any[]): any {
    const partyCount = new Map<string, number>();
    
    // Ensure cosponsors is actually an array
    const sponsorArray = Array.isArray(cosponsors) ? cosponsors : [];
    
    sponsorArray.forEach(cosponsor => {
      const party = cosponsor.party || 'Unknown';
      partyCount.set(party, (partyCount.get(party) || 0) + 1);
    });

    const democrats = partyCount.get('D') || 0;
    const republicans = partyCount.get('R') || 0;
    const total = sponsorArray.length;

    let score = 0;
    const isBipartisan = democrats > 0 && republicans > 0;

    if (isBipartisan && total > 0) {
      // Calculate bipartisan score based on balance
      const minorityPercent = Math.min(democrats, republicans) / total;
      score = Math.floor(minorityPercent * 30); // 0-30 points based on balance
      
      // Bonus for high participation
      if (total > 50 && minorityPercent > 0.3) score += 10;
      if (total > 100 && minorityPercent > 0.4) score += 15;
    }

    return {
      isBipartisan,
      score,
      partyBreakdown: {
        democratic: democrats,
        republican: republicans,
        independent: partyCount.get('I') || 0,
        total
      }
    };
  }

  private calculateMomentumScore(actions: any[]): number {
    if (!actions || actions.length === 0) return 0;

    let score = 0;
    const now = Date.now();

    // Recent actions (last 30 days)
    const recentActions = actions.filter(action => {
      const actionDate = new Date(action.actionDate || action.date);
      return (now - actionDate.getTime()) < 30 * 24 * 60 * 60 * 1000;
    });

    // Score based on frequency and recency
    score += Math.min(recentActions.length * 5, 25); // Max 25 points

    // Score based on action progression
    const hasCommitteeAction = actions.some(a => 
      a.text?.toLowerCase().includes('committee') && 
      !a.text?.toLowerCase().includes('referred to')
    );
    const hasFloorAction = actions.some(a => 
      a.text?.toLowerCase().includes('floor') || 
      a.text?.toLowerCase().includes('vote')
    );
    const hasPassed = actions.some(a => 
      a.text?.toLowerCase().includes('passed')
    );

    if (hasCommitteeAction) score += 10;
    if (hasFloorAction) score += 15;
    if (hasPassed) score += 20;

    return Math.min(score, 60); // Cap at 60 points
  }

  private calculateImpactScore(bill: any, subjects: any): number {
    let score = 0;

    // Policy area impact
    const highImpactPolicyAreas = [
      'Economics and Public Finance',
      'Health',
      'Armed Forces and National Security',
      'Taxation',
      'Immigration',
      'Education',
      'Energy',
      'Environmental Protection'
    ];

    if (subjects.policyArea && highImpactPolicyAreas.includes(subjects.policyArea.name)) {
      score += 20;
    }

    // Number of subjects (complexity indicator)
    const subjectCount = subjects.legislativeSubjects?.length || 0;
    if (subjectCount > 10) score += 15;
    else if (subjectCount > 5) score += 10;
    else if (subjectCount > 2) score += 5;

    // Bill title indicators
    const title = bill.title.toLowerCase();
    if (title.includes('appropriations') || title.includes('authorization')) score += 10;
    if (title.includes('reform') || title.includes('comprehensive')) score += 8;

    return Math.min(score, 45); // Cap at 45 points
  }

  private assessActivityLevel(actions: any[]): string {
    if (!actions || actions.length === 0) return 'Low';
    
    const recentActions = actions.filter(action => {
      const actionDate = new Date(action.actionDate || action.date);
      const daysSince = (Date.now() - actionDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 30;
    });

    if (recentActions.length >= 5) return 'Very High';
    if (recentActions.length >= 3) return 'High';
    if (recentActions.length >= 1) return 'Medium';
    return 'Low';
  }

  private generateSummary(bills: any[], params: TrendingBillsParams): string {
    const totalBills = bills.length;
    const passedBills = bills.filter(b => 
      b.latestAction?.text?.toLowerCase().includes('passed')
    ).length;
    const bipartisanBills = bills.filter(b => 
      b.enhancedData?.bipartisanSupport
    ).length;
    const highMomentumBills = bills.filter(b => 
      b.enhancedData?.momentumScore > 30
    ).length;

    return `Analysis of ${totalBills} trending bills in the ${params.timeframe} timeframe:\n` +
           `- ${passedBills} bills (${Math.round(passedBills/totalBills*100)}%) have passed at least one chamber\n` +
           `- ${bipartisanBills} bills (${Math.round(bipartisanBills/totalBills*100)}%) have bipartisan support\n` +
           `- ${highMomentumBills} bills show high momentum with significant recent activity\n` +
           `- Overall legislative activity is ${this.assessOverallActivity(bills)}`;
  }

  private identifyTrends(bills: any[]): any[] {
    const trends = [];

    // Policy area trends
    const policyAreas = this.extractPolicyAreas(bills);
    if (policyAreas.length > 0) {
      trends.push({
        type: 'Policy Focus',
        description: `High legislative activity in: ${policyAreas.slice(0, 3).join(', ')}`,
        significance: 'High',
        affectedBills: bills.filter(b => 
          policyAreas.slice(0, 3).includes(b.enhancedData?.primarySubject)
        ).length
      });
    }

    // Bipartisan trend
    const bipartisanCount = bills.filter(b => b.enhancedData?.bipartisanSupport).length;
    const avgBipartisanScore = bills.reduce((sum, b) => sum + (b.enhancedData?.bipartisanScore || 0), 0) / bills.length;
    if (bipartisanCount > bills.length * 0.3) {
      trends.push({
        type: 'Bipartisan Cooperation',
        description: `${Math.round(bipartisanCount / bills.length * 100)}% of trending bills have bipartisan support (avg score: ${avgBipartisanScore.toFixed(1)})`,
        significance: 'High',
        insight: avgBipartisanScore > 20 ? 'Strong cross-party collaboration' : 'Moderate bipartisan efforts'
      });
    }

    // Momentum trend
    const highMomentumCount = bills.filter(b => b.enhancedData?.momentumScore > 30).length;
    if (highMomentumCount > bills.length * 0.4) {
      trends.push({
        type: 'Legislative Momentum',
        description: 'Accelerated legislative activity across multiple bills',
        significance: 'Very High',
        metrics: {
          highMomentumBills: highMomentumCount,
          averageMomentum: bills.reduce((sum, b) => sum + (b.enhancedData?.momentumScore || 0), 0) / bills.length
        }
      });
    }

    // Chamber activity
    const houseBills = bills.filter(b => b.originChamber === 'House').length;
    const senateBills = bills.filter(b => b.originChamber === 'Senate').length;
    if (Math.abs(houseBills - senateBills) > bills.length * 0.3) {
      trends.push({
        type: 'Chamber Activity',
        description: houseBills > senateBills ? 
          `House leading with ${houseBills} bills vs Senate's ${senateBills}` :
          `Senate leading with ${senateBills} bills vs House's ${houseBills}`,
        significance: 'Medium'
      });
    }

    return trends;
  }

  private generateInsights(bills: any[]): string[] {
    const insights = [];

    // Top scoring bills
    const topBills = bills.slice(0, 3);
    insights.push(`Top trending: ${topBills.map(b => `${b.number} (score: ${b.enhancedData?.combinedScore || b.trendingScore})`).join(', ')}`);

    // Bipartisan champions
    const mostBipartisan = bills
      .filter(b => b.enhancedData?.bipartisanSupport)
      .sort((a, b) => (b.enhancedData?.bipartisanScore || 0) - (a.enhancedData?.bipartisanScore || 0))
      .slice(0, 2);
    if (mostBipartisan.length > 0) {
      insights.push(`Strongest bipartisan support: ${mostBipartisan.map(b => b.number).join(', ')}`);
    }

    // Momentum leaders
    const highestMomentum = bills
      .sort((a, b) => (b.enhancedData?.momentumScore || 0) - (a.enhancedData?.momentumScore || 0))
      .slice(0, 2);
    insights.push(`Highest momentum: ${highestMomentum.map(b => `${b.number} (${b.enhancedData?.activityLevel} activity)`).join(', ')}`);

    // Support patterns
    const avgCosponsors = bills.reduce((sum, b) => sum + (b.enhancedData?.cosponsorCount || 0), 0) / bills.length;
    if (avgCosponsors > 30) {
      insights.push(`Strong legislative support with average of ${Math.round(avgCosponsors)} cosponsors per bill`);
    }

    // Committee activity
    const multiCommitteeBills = bills.filter(b => (b.enhancedData?.committees?.length || 0) > 1);
    if (multiCommitteeBills.length > bills.length * 0.3) {
      insights.push(`${multiCommitteeBills.length} bills under multi-committee review, indicating complex legislation`);
    }

    return insights;
  }

  private generateRecommendations(bills: any[]): string[] {
    const recommendations = [];

    // High-impact bills to watch
    const highImpactBills = bills
      .filter(b => (b.enhancedData?.combinedScore || b.trendingScore) > 100)
      .slice(0, 3);
    if (highImpactBills.length > 0) {
      recommendations.push(`Priority tracking: ${highImpactBills.map(b => `${b.number} - ${b.title.substring(0, 50)}...`).join('; ')}`);
    }

    // Bills likely to pass
    const likelyToPass = bills.filter(b => 
      b.enhancedData?.momentumScore > 40 && 
      b.enhancedData?.bipartisanSupport
    );
    if (likelyToPass.length > 0) {
      recommendations.push(`High passage probability: ${likelyToPass.slice(0, 3).map(b => b.number).join(', ')}`);
    }

    // Emerging issues
    const recentIntroductions = bills.filter(b => b.daysSinceIntroduced <= 7);
    if (recentIntroductions.length > 0) {
      recommendations.push(`Monitor new legislation: ${recentIntroductions.slice(0, 3).map(b => b.number).join(', ')}`);
    }

    // Committee bottlenecks
    const stuckInCommittee = bills.filter(b => 
      b.enhancedData?.activityLevel === 'Low' && 
      b.daysSinceUpdate > 30
    );
    if (stuckInCommittee.length > bills.length * 0.3) {
      recommendations.push(`${stuckInCommittee.length} bills may be stalled in committee - consider advocacy if priority`);
    }

    return recommendations;
  }

  private analyzePolicyFocus(bills: any[]): any {
    const policyMap = new Map<string, { count: number; bills: string[] }>();

    bills.forEach(bill => {
      const policyArea = bill.enhancedData?.primarySubject || 'Unknown';
      const current = policyMap.get(policyArea) || { count: 0, bills: [] };
      current.count++;
      current.bills.push(bill.number);
      policyMap.set(policyArea, current);
    });

    const sortedPolicies = Array.from(policyMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    return {
      topPolicyAreas: sortedPolicies.map(([area, data]) => ({
        area,
        billCount: data.count,
        percentage: Math.round(data.count / bills.length * 100),
        keyBills: data.bills.slice(0, 3)
      })),
      diversityScore: policyMap.size / bills.length // Higher score = more diverse
    };
  }

  private predictOutcomes(bills: any[]): any[] {
    const predictions: any[] = [];

    bills.slice(0, 5).forEach(bill => {
      const momentum = bill.enhancedData?.momentumScore || 0;
      const bipartisan = bill.enhancedData?.bipartisanScore || 0;
      const impact = bill.enhancedData?.impactScore || 0;
      
      let likelihood = 'Low';
      let timeframe = 'Unknown';
      
      if (momentum > 40 && bipartisan > 20) {
        likelihood = 'High';
        timeframe = momentum > 50 ? '1-2 months' : '3-6 months';
      } else if (momentum > 30 || bipartisan > 25) {
        likelihood = 'Medium';
        timeframe = '6-12 months';
      } else if (momentum > 20) {
        likelihood = 'Low';
        timeframe = 'Over 12 months';
      }

      predictions.push({
        billNumber: bill.number,
        passageLikelihood: likelihood,
        estimatedTimeframe: timeframe,
        keyFactors: {
          momentum: momentum > 30 ? 'Strong' : 'Moderate',
          bipartisan: bipartisan > 20 ? 'Good' : 'Limited',
          impact: impact > 30 ? 'High' : 'Moderate'
        },
        recommendation: likelihood === 'High' ? 'Track closely' : 
                       likelihood === 'Medium' ? 'Monitor progress' : 'Watch for changes'
      });
    });

    return predictions;
  }

  private assessOverallActivity(bills: any[]): string {
    const highActivityCount = bills.filter(b => 
      b.enhancedData?.activityLevel === 'High' || 
      b.enhancedData?.activityLevel === 'Very High'
    ).length;
    const avgMomentum = bills.reduce((sum, b) => sum + (b.enhancedData?.momentumScore || 0), 0) / bills.length;
    
    if (avgMomentum > 35 || highActivityCount > bills.length * 0.6) return 'very high';
    if (avgMomentum > 25 || highActivityCount > bills.length * 0.4) return 'high';
    if (avgMomentum > 15 || highActivityCount > bills.length * 0.2) return 'moderate';
    return 'low';
  }

  private extractPolicyAreas(bills: any[]): string[] {
    const policyCount = new Map<string, number>();

    bills.forEach(bill => {
      const policyArea = bill.enhancedData?.primarySubject;
      if (policyArea && policyArea !== 'Unknown') {
        policyCount.set(policyArea, (policyCount.get(policyArea) || 0) + 1);
      }
    });

    return Array.from(policyCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([area]) => area);
  }
}

/**
 * Handle trending bills tool execution
 */
export async function handleTrendingBills(
  params: TrendingBillsParams,
  apiBaseUrl: string,
  accessToken: string
): Promise<CallToolResult> {
  try {
    const tool = new TrendingBillsTool(apiBaseUrl, accessToken);
    const result = await tool.getTrendingBills(params);
    
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    console.error('Error in handleTrendingBills:', error);
    
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
          text: `No trending bills found: ${error.message}`
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