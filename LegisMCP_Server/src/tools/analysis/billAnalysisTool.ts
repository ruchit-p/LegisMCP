import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { BillAnalysisParams } from "./billAnalysisParams.js";
import { handleEnhancedBillAnalysis } from "./enhancedBillAnalysisTool.js";
import { 
  NotFoundError, 
  AuthenticationError, 
  RateLimitError, 
  ValidationError, 
  ApiError 
} from "../../utils/errors.js";

export class BillAnalysisTool {
  constructor(
    private apiBaseUrl: string,
    private accessToken: string
  ) {}

  /**
   * Get comprehensive bill analysis
   * @param params - Bill analysis parameters
   * @returns Comprehensive bill analysis with context and insights
   */
  async analyzeBill(params: BillAnalysisParams): Promise<any> {
    try {
      console.log('Starting comprehensive bill analysis', { query: params.query });

      // Step 1: Find the bill
      const bill = await this.findBill(params.query, params.congress);
      if (!bill) {
        throw new NotFoundError(`No bill found matching: ${params.query}`);
      }

      console.log('Found bill for analysis', { 
        billNumber: bill.billNumber, 
        title: bill.title?.substring(0, 100),
        fullBillObject: bill 
      });

      // Extract bill identifiers - handle different property names
      const congress = bill.congress;
      const billType = bill.billType || bill.type;
      const billNumber = bill.billNumber || bill.number;
      
      console.log('Extracted identifiers', { congress, billType, billNumber });

      // Step 2: Gather all data in parallel (respecting 6 connection limit)
      // Split into batches to avoid exceeding simultaneous connection limit
      const [batch1Results, batch2Results] = await Promise.all([
        // Batch 1 (6 requests)
        Promise.allSettled([
          this.getBillDetails(congress, billType, billNumber),
          this.getBillActions(congress, billType, billNumber),
          this.getBillCosponsors(congress, billType, billNumber),
          this.getBillCommittees(congress, billType, billNumber),
          params.includeRelated ? this.getBillAmendments(congress, billType, billNumber) : Promise.resolve(null),
          params.includeRelated ? this.getBillRelatedBills(congress, billType, billNumber) : Promise.resolve(null),
        ]),
        // Batch 2 (4 requests)
        Promise.allSettled([
          this.getBillSubjects(congress, billType, billNumber),
          this.getBillSummaries(congress, billType, billNumber),
          params.includeText ? this.getBillText(congress, billType, billNumber) : Promise.resolve(null),
          params.includeVotes ? this.getBillVotes(congress, billType, billNumber) : Promise.resolve(null),
        ])
      ]);

      // Combine results
      const [
        billDetails,
        actions,
        cosponsors,
        committees,
        amendments,
        relatedBills
      ] = batch1Results;

      const [
        subjects,
        summaries,
        text,
        votes
      ] = batch2Results;

      // Step 3: Process and analyze the data
      const analysis = this.processAnalysis({
        bill,
        details: this.extractResult(billDetails),
        actions: this.extractResult(actions),
        cosponsors: this.extractResult(cosponsors),
        committees: this.extractResult(committees),
        amendments: this.extractResult(amendments),
        relatedBills: this.extractResult(relatedBills),
        votes: this.extractResult(votes),
        subjects: this.extractResult(subjects),
        summaries: this.extractResult(summaries),
        text: this.extractResult(text)
      });

      console.log('Bill analysis completed successfully', { 
        billNumber: bill.billNumber,
        analysisComponents: Object.keys(analysis).length
      });

      return analysis;

    } catch (error) {
      console.error('Error in bill analysis', { error: (error as Error).message, query: params.query });
      throw error;
    }
  }

  /**
   * Make authenticated API request
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
      throw new ApiError(`API error: ${response.statusText}`, response.status);
    }

    return response.json();
  }

  /**
   * Find a bill based on query
   */
  private async findBill(query: string, congress?: number): Promise<any> {
    // Clean up the query
    const cleanQuery = query.trim();
    
    try {
      // Use the API's bill search with the query
      const searchParams = new URLSearchParams({
        q: cleanQuery,
        limit: '1'
      });
      
      if (congress) {
        searchParams.append('congress', congress.toString());
      }
      
      console.log('Searching for bill with params:', searchParams.toString());
      
      const searchResult = await this.makeApiRequest(`/api/bills?${searchParams}`);
      
      if (searchResult.bills?.length > 0) {
        const bill = searchResult.bills[0];
        console.log('Found bill:', { 
          billType: bill.billType, 
          billNumber: bill.billNumber, 
          congress: bill.congress 
        });
        return bill;
      }
      
      console.log('No bills found for query:', cleanQuery);
      return null;
      
    } catch (error) {
      console.error('Error searching for bill:', error);
      throw error;
    }
  }

  /**
   * Get detailed bill information
   */
  private async getBillDetails(congress: number, billType: string | undefined | null, billNumber: number): Promise<any> {
    if (!billType) {
      console.error('getBillDetails called with undefined billType');
      throw new Error('Bill type is required');
    }
    const response = await this.makeApiRequest(`/api/bills/${congress}/${billType}/${billNumber}`);
    return response.bill;
  }

  /**
   * Get bill actions
   */
  private async getBillActions(congress: number, billType: string, billNumber: number): Promise<any> {
    const response = await this.makeApiRequest(`/api/bills/${congress}/${billType}/${billNumber}/actions`);
    return response.actions;
  }

  /**
   * Get bill cosponsors
   */
  private async getBillCosponsors(congress: number, billType: string, billNumber: number): Promise<any> {
    const response = await this.makeApiRequest(`/api/bills/${congress}/${billType}/${billNumber}/cosponsors`);
    return response.cosponsors;
  }

  /**
   * Get bill committees
   */
  private async getBillCommittees(congress: number, billType: string, billNumber: number): Promise<any> {
    const response = await this.makeApiRequest(`/api/bills/${congress}/${billType}/${billNumber}/committees`);
    return response.committees;
  }

  /**
   * Get bill amendments
   */
  private async getBillAmendments(congress: number, billType: string, billNumber: number): Promise<any> {
    const response = await this.makeApiRequest(`/api/bills/${congress}/${billType}/${billNumber}/amendments`);
    return response.amendments;
  }

  /**
   * Get related bills
   */
  private async getBillRelatedBills(congress: number, billType: string, billNumber: number): Promise<any> {
    const response = await this.makeApiRequest(`/api/bills/${congress}/${billType}/${billNumber}/relatedbills`);
    return response.relatedBills;
  }

  /**
   * Get bill votes (from actions that contain vote data)
   */
  private async getBillVotes(congress: number, billType: string, billNumber: number): Promise<any> {
    // Since direct vote endpoints are limited, extract from actions
    const response = await this.makeApiRequest(`/api/bills/${congress}/${billType}/${billNumber}/actions`);
    return response.actions;
  }

  /**
   * Get bill subjects
   */
  private async getBillSubjects(congress: number, billType: string, billNumber: number): Promise<any> {
    const response = await this.makeApiRequest(`/api/bills/${congress}/${billType}/${billNumber}/subjects`);
    return response.subjects;
  }

  /**
   * Get bill summaries
   */
  private async getBillSummaries(congress: number, billType: string, billNumber: number): Promise<any> {
    const response = await this.makeApiRequest(`/api/bills/${congress}/${billType}/${billNumber}/summaries`);
    return response.summaries;
  }

  /**
   * Get bill text
   */
  private async getBillText(congress: number, billType: string, billNumber: number): Promise<any> {
    const response = await this.makeApiRequest(`/api/bills/${congress}/${billType}/${billNumber}/text`);
    return response.text;
  }

  /**
   * Extract result from Promise.allSettled
   */
  private extractResult(result: PromiseSettledResult<any>): any {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    console.warn('Failed to fetch data component', { error: result.reason?.message });
    return null;
  }

  /**
   * Process and analyze all gathered data
   */
  private processAnalysis(data: any): any {
    const { bill, details, actions, cosponsors, committees, amendments, relatedBills, votes, subjects, summaries, text } = data;

    // Use details if available, otherwise fall back to basic bill data
    const billData = details || bill;

    // Basic Information
    const basicInfo = {
      number: `${billData.billType ? billData.billType.toUpperCase() : billData.type ? billData.type.toUpperCase() : ''} ${billData.billNumber || billData.number || ''}`,
      title: billData.title,
      type: billData.billType || billData.type,
      congress: billData.congress,
      introducedDate: billData.introducedDate,
      updateDate: billData.updateDate || billData.latestAction?.actionDate,
      originChamber: billData.originChamber || this.inferChamber(billData.billType || billData.type),
      url: billData.url || (billData.congress && billData.billType && billData.billNumber ? 
        `https://www.congress.gov/bill/${billData.congress}/${billData.billType || billData.type}/${billData.billNumber || billData.number}` : '')
    };

    // Sponsor Information
    const sponsorInfo = billData.sponsor ? {
      name: billData.sponsor.fullName,
      party: billData.sponsor.party,
      state: billData.sponsor.state,
      district: billData.sponsor.district,
      bioguideId: billData.sponsor.bioguideId
    } : null;

    // Status Analysis
    const actionsData = actions?.actions || actions || [];
    const latestAction = billData.latestAction || actionsData[0];
    const statusAnalysis = {
      currentStatus: latestAction?.text || 'Unknown',
      currentStatusDate: latestAction?.actionDate,
      isActive: this.determineBillActivity(actionsData),
      stage: this.determineBillStage(actionsData),
      likelihood: this.assessPassageLikelihood(actionsData, cosponsors?.cosponsors || cosponsors || [])
    };

    // Support Analysis
    const cosponsorsData = cosponsors?.cosponsors || cosponsors || [];
    const supportAnalysis = {
      totalCosponsors: cosponsorsData.length,
      democraticSupport: cosponsorsData.filter((c: any) => 
        c.party === 'D' || c.party === 'Democratic'
      ).length,
      republicanSupport: cosponsorsData.filter((c: any) => 
        c.party === 'R' || c.party === 'Republican'
      ).length,
      bipartisanSupport: this.assessBipartisanSupport(cosponsorsData),
      supportTrend: this.analyzeSupportTrend(cosponsorsData)
    };

    // Committee Analysis
    const committeesData = committees?.committees || committees || [];
    const committeeAnalysis = {
      committees: committeesData.map((c: any) => ({
        name: c.name,
        chamber: c.chamber,
        systemCode: c.systemCode,
        activities: c.activities || []
      })),
      primaryCommittee: committeesData[0]?.name || 'Unknown'
    };

    // Timeline Analysis
    const timelineAnalysis = {
      keyMilestones: this.extractKeyMilestones(actionsData),
      daysInCongress: this.calculateDaysInCongress(billData.introducedDate),
      averageTimeForSimilarBills: 'Analysis not available',
      nextLikelyAction: this.predictNextAction(actionsData)
    };

    // Content Analysis
    const subjectsData = subjects?.subjects || subjects || {};
    const summariesData = summaries?.summaries || summaries || [];
    const contentAnalysis = {
      subjects: subjectsData.legislativeSubjects?.map((s: any) => s.name) || [],
      policyAreas: subjectsData.policyArea?.name ? [subjectsData.policyArea.name] : [],
      summary: summariesData[0]?.text || billData.summary || 'No summary available',
      complexity: this.assessBillComplexity(billData.title, summariesData[0]?.text)
    };

    // Related Legislation
    const amendmentsData = amendments?.amendments || amendments || [];
    const relatedBillsData = relatedBills?.relatedBills || relatedBills || [];
    const relatedAnalysis = {
      relatedBills: relatedBillsData.map((rb: any) => ({
        number: rb.number || `${rb.type} ${rb.billNumber}`,
        title: rb.title,
        relationship: rb.relationshipDetails?.[0]?.type || rb.type
      })),
      amendments: amendmentsData.length,
      companionBills: this.findCompanionBills(relatedBillsData)
    };

    // Voting Analysis
    const votingAnalysis = votes ? this.analyzeVotingRecord(votes) : null;

    // Overall Assessment
    const overallAssessment = {
      significance: this.assessBillSignificance(billData, supportAnalysis, committeeAnalysis),
      controversyLevel: this.assessControversyLevel(supportAnalysis, actionsData),
      mediaAttention: this.assessMediaAttention(billData.title, supportAnalysis.totalCosponsors),
      practicalImpact: this.assessPracticalImpact(contentAnalysis.subjects, contentAnalysis.policyAreas)
    };

    return {
      basicInfo,
      sponsorInfo,
      statusAnalysis,
      supportAnalysis,
      committeeAnalysis,
      timelineAnalysis,
      contentAnalysis,
      relatedAnalysis,
      votingAnalysis,
      overallAssessment,
      // Raw data for advanced users
      rawData: {
        actions: actionsData.slice(0, 10), // Latest 10 actions
        cosponsors: cosponsorsData.slice(0, 20), // First 20 cosponsors
        committees: committeesData,
        subjects: subjectsData,
        summaries: summariesData,
        ...(text && { textUrl: text.textVersions?.[0]?.formats?.[0]?.url })
      }
    };
  }

  // Analysis Helper Methods

  private inferChamber(billType: string | undefined | null): string {
    if (!billType) return 'Unknown';
    const lowerType = billType.toLowerCase();
    if (lowerType.startsWith('h')) return 'House';
    if (lowerType.startsWith('s')) return 'Senate';
    return 'Unknown';
  }

  private determineBillActivity(actions: any[]): boolean {
    if (!actions || !actions.length) return false;
    const latestAction = actions[0];
    const actionDate = new Date(latestAction.actionDate || latestAction.date);
    const daysSinceAction = (Date.now() - actionDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceAction < 30; // Active if action within 30 days
  }

  private determineBillStage(actions: any[]): string {
    if (!actions || !actions.length) return 'Unknown';
    
    const actionTexts = actions.map(a => (a.text || a.description || '').toLowerCase());
    
    if (actionTexts.some(text => text.includes('became public law') || text.includes('signed by president'))) {
      return 'Enacted';
    } else if (actionTexts.some(text => text.includes('presented to president'))) {
      return 'Sent to President';
    } else if (actionTexts.some(text => text.includes('passed senate') && text.includes('passed house'))) {
      return 'Passed Both Chambers';
    } else if (actionTexts.some(text => text.includes('passed senate') || text.includes('passed house'))) {
      return 'Passed One Chamber';
    } else if (actionTexts.some(text => text.includes('reported') && text.includes('committee'))) {
      return 'Reported by Committee';
    } else if (actionTexts.some(text => text.includes('committee'))) {
      return 'In Committee';
    } else {
      return 'Introduced';
    }
  }

  private assessPassageLikelihood(actions: any[], cosponsors: any[]): string {
    let score = 0;
    
    // Cosponsor support
    if (cosponsors.length > 100) score += 3;
    else if (cosponsors.length > 50) score += 2;
    else if (cosponsors.length > 20) score += 1;
    
    // Bipartisan support
    const parties = new Set(cosponsors.map(c => c.party));
    if (parties.size > 1) score += 2;
    
    // Committee activity
    const hasCommitteeAction = actions.some(a => {
      const text = (a.text || a.description || '').toLowerCase();
      return text.includes('committee') && !text.includes('referred to');
    });
    if (hasCommitteeAction) score += 2;
    
    // Floor activity
    const hasFloorAction = actions.some(a => {
      const text = (a.text || a.description || '').toLowerCase();
      return text.includes('floor') || text.includes('vote') || text.includes('passed');
    });
    if (hasFloorAction) score += 3;
    
    if (score >= 7) return 'High';
    if (score >= 4) return 'Medium';
    if (score >= 2) return 'Low';
    return 'Very Low';
  }

  private assessBipartisanSupport(cosponsors: any[]): boolean {
    const parties = new Set(cosponsors.map(c => c.party));
    return parties.size > 1;
  }

  private analyzeSupportTrend(cosponsors: any[]): string {
    if (cosponsors.length < 5) return 'Insufficient data';
    
    // Sort by date added (if available)
    const sortedCosponsors = cosponsors.sort((a, b) => 
      new Date(a.sponsorshipDate || a.date || '').getTime() - 
      new Date(b.sponsorshipDate || b.date || '').getTime()
    );
    
    const recentCosponsors = sortedCosponsors.slice(-5);
    const earlierCosponsors = sortedCosponsors.slice(0, 5);
    
    if (recentCosponsors.length > earlierCosponsors.length) {
      return 'Growing';
    } else if (recentCosponsors.length < earlierCosponsors.length) {
      return 'Declining';
    } else {
      return 'Stable';
    }
  }

  private extractKeyMilestones(actions: any[]): any[] {
    const milestones = [];
    const importantKeywords = [
      'introduced',
      'referred to committee',
      'reported by committee',
      'passed house',
      'passed senate',
      'presented to president',
      'became public law',
      'signed by president'
    ];
    
    for (const action of actions || []) {
      const actionText = (action.text || action.description || '').toLowerCase();
      for (const keyword of importantKeywords) {
        if (actionText.includes(keyword)) {
          milestones.push({
            date: action.actionDate || action.date,
            action: action.text || action.description,
            type: keyword
          });
          break;
        }
      }
    }
    
    return milestones.slice(0, 10); // Top 10 milestones
  }

  private calculateDaysInCongress(introducedDate: string): number {
    if (!introducedDate) return 0;
    const introduced = new Date(introducedDate);
    const now = new Date();
    return Math.floor((now.getTime() - introduced.getTime()) / (1000 * 60 * 60 * 24));
  }

  private predictNextAction(actions: any[]): string {
    if (!actions || !actions.length) return 'Unknown';
    
    const latestAction = (actions[0].text || actions[0].description || '').toLowerCase();
    
    if (latestAction.includes('introduced')) {
      return 'Committee referral';
    } else if (latestAction.includes('referred to committee')) {
      return 'Committee markup or hearing';
    } else if (latestAction.includes('reported by committee')) {
      return 'Floor consideration';
    } else if (latestAction.includes('passed house') && !latestAction.includes('passed senate')) {
      return 'Senate consideration';
    } else if (latestAction.includes('passed senate') && !latestAction.includes('passed house')) {
      return 'House consideration';
    } else if (latestAction.includes('passed house') && latestAction.includes('passed senate')) {
      return 'President signature';
    } else {
      return 'Further legislative action';
    }
  }

  private assessBillComplexity(title: string, summary?: string): string {
    let complexity = 0;
    
    // Title analysis
    if (title && title.length > 100) complexity += 1;
    if (title && (title.includes('comprehensive') || title.includes('omnibus'))) complexity += 2;
    
    // Summary analysis
    if (summary) {
      if (summary.length > 1000) complexity += 1;
      if (summary.split('.').length > 10) complexity += 1;
    }
    
    if (complexity >= 3) return 'High';
    if (complexity >= 2) return 'Medium';
    return 'Low';
  }

  private findCompanionBills(relatedBills: any[]): any[] {
    return relatedBills.filter(rb => {
      const relType = rb.relationshipDetails?.[0]?.type || rb.type || '';
      return relType.toLowerCase().includes('companion') || 
             relType.toLowerCase().includes('identical');
    });
  }

  private analyzeVotingRecord(votes: any): any {
    // Extract vote information from actions
    const voteActions = (votes?.actions || votes || []).filter((action: any) => {
      const text = (action.text || action.description || '').toLowerCase();
      return text.includes('vote') || text.includes('yea') || text.includes('nay');
    });

    return {
      totalVotes: voteActions.length,
      votes: voteActions.map((v: any) => ({
        date: v.actionDate || v.date,
        description: v.text || v.description,
        chamber: v.actionChamber || v.chamber || 'Unknown'
      }))
    };
  }

  private assessBillSignificance(bill: any, supportAnalysis: any, committeeAnalysis: any): string {
    let score = 0;
    
    if (supportAnalysis.totalCosponsors > 50) score += 2;
    if (supportAnalysis.bipartisanSupport) score += 2;
    if (committeeAnalysis.committees.length > 1) score += 1;
    if (bill.title && bill.title.toLowerCase().includes('act')) score += 1;
    
    if (score >= 4) return 'High';
    if (score >= 2) return 'Medium';
    return 'Low';
  }

  private assessControversyLevel(supportAnalysis: any, actions: any[]): string {
    // Low controversy indicators
    if (supportAnalysis.bipartisanSupport && supportAnalysis.totalCosponsors > 20) {
      return 'Low';
    }
    
    // High controversy indicators
    if (!supportAnalysis.bipartisanSupport && supportAnalysis.totalCosponsors < 10) {
      return 'High';
    }
    
    return 'Medium';
  }

  private assessMediaAttention(title: string, cosponsorCount: number): string {
    let score = 0;
    
    // Title keywords that attract media attention
    const mediaKeywords = ['healthcare', 'tax', 'immigration', 'climate', 'infrastructure', 'security', 'abortion', 'gun'];
    if (title && mediaKeywords.some(keyword => title.toLowerCase().includes(keyword))) {
      score += 2;
    }
    
    if (cosponsorCount > 100) score += 2;
    else if (cosponsorCount > 50) score += 1;
    
    if (score >= 3) return 'High';
    if (score >= 1) return 'Medium';
    return 'Low';
  }

  private assessPracticalImpact(subjects: string[], policyAreas: string[]): string {
    const highImpactAreas = [
      'economics', 'healthcare', 'education', 'taxation', 'social welfare',
      'transportation', 'energy', 'environment', 'immigration', 'defense',
      'agriculture', 'housing', 'civil rights', 'labor'
    ];
    
    const allAreas = [...subjects, ...policyAreas].map(area => area.toLowerCase());
    const hasHighImpact = allAreas.some(area => 
      highImpactAreas.some(highArea => area.includes(highArea))
    );
    
    return hasHighImpact ? 'High' : 'Medium';
  }
}

/**
 * Handle bill analysis tool execution
 * Delegates to the enhanced bill analysis implementation
 */
export async function handleBillAnalysis(
  params: BillAnalysisParams,
  apiBaseUrl: string,
  accessToken: string
): Promise<CallToolResult> {
  // Use the enhanced implementation
  return handleEnhancedBillAnalysis(params, apiBaseUrl, accessToken);
}