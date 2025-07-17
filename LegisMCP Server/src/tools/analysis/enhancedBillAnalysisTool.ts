import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { TOOL_NAME, TOOL_DESCRIPTION, TOOL_PARAMS, BillAnalysisParams } from "./billAnalysisParams.js";
import { 
  ApiError, 
  NotFoundError, 
  RateLimitError, 
  ValidationError,
  AuthenticationError 
} from "../../utils/errors.js";

export class EnhancedBillAnalysisTool {
  constructor(
    private apiBaseUrl: string,
    private accessToken: string
  ) {}

  /**
   * Get comprehensive bill analysis with enhanced scoring and insights
   */
  async analyzeBill(params: BillAnalysisParams): Promise<any> {
    try {
      console.log('Starting enhanced bill analysis', { query: params.query });

      // Step 1: Find the bill
      const bill = await this.findBill(params.query, params.congress);
      if (!bill) {
        throw new NotFoundError(`No bill found matching: ${params.query}`);
      }

      console.log('Found bill for analysis', { 
        billNumber: bill.billNumber, 
        title: bill.title?.substring(0, 100) 
      });

      // Step 2: Gather all data in parallel using Promise.allSettled for resilience
      const [
        billDetailsResult,
        actionsResult,
        cosponsorsResult,
        committeesResult,
        amendmentsResult,
        relatedBillsResult,
        subjectsResult,
        summariesResult,
        textResult
      ] = await Promise.allSettled([
        this.getBillDetails(bill.congress, bill.billType, bill.billNumber),
        this.getBillActions(bill.congress, bill.billType, bill.billNumber),
        this.getBillCosponsors(bill.congress, bill.billType, bill.billNumber),
        this.getBillCommittees(bill.congress, bill.billType, bill.billNumber),
        params.includeRelated ? this.getBillAmendments(bill.congress, bill.billType, bill.billNumber) : Promise.resolve(null),
        params.includeRelated ? this.getBillRelatedBills(bill.congress, bill.billType, bill.billNumber) : Promise.resolve(null),
        this.getBillSubjects(bill.congress, bill.billType, bill.billNumber),
        this.getBillSummaries(bill.congress, bill.billType, bill.billNumber),
        params.includeText ? this.getBillText(bill.congress, bill.billType, bill.billNumber) : Promise.resolve(null)
      ]);

      // Extract results with error handling
      const billDetails = this.extractResult(billDetailsResult) || bill;
      const actions = this.extractResult(actionsResult);
      const cosponsors = this.extractResult(cosponsorsResult);
      const committees = this.extractResult(committeesResult);
      const amendments = this.extractResult(amendmentsResult);
      const relatedBills = this.extractResult(relatedBillsResult);
      const subjects = this.extractResult(subjectsResult);
      const summaries = this.extractResult(summariesResult);
      const text = this.extractResult(textResult);

      // Step 3: Process and analyze the data with enhanced algorithms
      const analysis = this.processEnhancedAnalysis({
        bill: billDetails,
        actions,
        cosponsors,
        committees,
        amendments,
        relatedBills,
        subjects,
        summaries,
        text
      });

      console.log('Enhanced bill analysis completed successfully', { 
        billNumber: bill.billNumber,
        analysisComponents: Object.keys(analysis).length
      });

      return analysis;

    } catch (error) {
      console.error('Error in enhanced bill analysis', { error: (error as Error).message, query: params.query });
      throw error;
    }
  }

  /**
   * Process analysis with enhanced scoring and insights
   */
  private processEnhancedAnalysis(data: any): any {
    const { bill, actions, cosponsors, committees, amendments, relatedBills, subjects, summaries, text } = data;

    // Basic Information
    const basicInfo = {
      billNumber: `${(bill.billType || '').toUpperCase()} ${bill.billNumber}`,
      congress: bill.congress,
      title: bill.title,
      introducedDate: bill.introducedDate,
      updateDate: bill.lastActionDate || bill.updateDate,
      originChamber: bill.originChamber || this.inferChamber(bill.billType),
      url: bill.url || `https://www.congress.gov/bill/${bill.congress}/${bill.billType}/${bill.billNumber}`
    };

    // Sponsor Information
    const sponsorInfo = bill.sponsor ? {
      name: bill.sponsor.fullName,
      party: bill.sponsor.party,
      state: bill.sponsor.state,
      district: bill.sponsor.district,
      bioguideId: bill.sponsor.bioguideId
    } : null;

    // Enhanced Status Analysis
    const actionsData = actions?.actions || [];
    const latestAction = bill.lastAction || actionsData[0];
    const statusAnalysis = {
      currentStatus: latestAction || 'Unknown',
      currentStatusDate: bill.lastActionDate,
      isActive: this.determineBillActivity(actionsData),
      stage: this.determineBillStage(actionsData),
      likelihood: this.assessPassageLikelihood(actionsData, cosponsors?.cosponsors || []),
      daysInCongress: this.calculateDaysInCongress(bill.introducedDate),
      keyMilestones: this.extractKeyMilestones(actionsData),
      nextLikelyAction: this.predictNextAction(actionsData)
    };

    // Enhanced Support Analysis
    const cosponsorsData = cosponsors?.cosponsors || [];
    const supportAnalysis = {
      totalCosponsors: cosponsorsData.length,
      democraticSupport: cosponsorsData.filter((c: any) => 
        c.party === 'D' || c.party === 'Democratic'
      ).length,
      republicanSupport: cosponsorsData.filter((c: any) => 
        c.party === 'R' || c.party === 'Republican'
      ).length,
      bipartisanSupport: this.assessBipartisanSupport(cosponsorsData),
      supportTrend: this.analyzeSupportTrend(cosponsorsData),
      supportStrength: this.calculateSupportStrength(cosponsorsData),
      keySuporters: this.identifyKeySuporters(cosponsorsData)
    };

    // Committee Analysis
    const committeesData = committees?.committees || [];
    const committeeAnalysis = {
      committees: committeesData.map((c: any) => ({
        name: c.name,
        chamber: c.chamber,
        systemCode: c.systemCode,
        activities: c.activities || []
      })),
      primaryCommittee: committeesData[0]?.name || 'Unknown',
      committeeActivity: this.assessCommitteeActivity(committeesData, actionsData)
    };

    // Content Analysis
    const subjectsData = subjects?.subjects || {};
    const summariesData = summaries?.summaries || [];
    const contentAnalysis = {
      subjects: subjectsData.legislativeSubjects?.map((s: any) => s.name) || [],
      policyAreas: subjectsData.policyArea?.name ? [subjectsData.policyArea.name] : [],
      summary: summariesData[0]?.text || bill.summary || 'No summary available',
      complexity: this.assessBillComplexity(bill.title, summariesData[0]?.text),
      keyTopics: this.extractKeyTopics(bill.title, summariesData[0]?.text)
    };

    // Related Legislation
    const amendmentsData = amendments?.amendments || [];
    const relatedBillsData = relatedBills?.relatedBills || [];
    const relatedAnalysis = {
      relatedBills: relatedBillsData.map((rb: any) => ({
        number: rb.number || `${rb.type} ${rb.billNumber}`,
        title: rb.title,
        relationship: rb.relationshipDetails?.[0]?.type || rb.type
      })),
      amendments: amendmentsData.length,
      companionBills: this.findCompanionBills(relatedBillsData),
      legislativeNetwork: this.analyzeLegislativeNetwork(relatedBillsData)
    };

    // Overall Assessment
    const overallAssessment = {
      significance: this.assessBillSignificance(bill, supportAnalysis, committeeAnalysis, contentAnalysis),
      controversyLevel: this.assessControversyLevel(supportAnalysis, actionsData, contentAnalysis),
      mediaAttention: this.assessMediaAttention(bill.title, supportAnalysis.totalCosponsors),
      practicalImpact: this.assessPracticalImpact(contentAnalysis.subjects, contentAnalysis.policyAreas),
      politicalFeasibility: this.assessPoliticalFeasibility(supportAnalysis, statusAnalysis)
    };

    // Generate comprehensive insights
    const insights = this.generateComprehensiveInsights({
      basicInfo,
      statusAnalysis,
      supportAnalysis,
      committeeAnalysis,
      contentAnalysis,
      overallAssessment
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      statusAnalysis,
      supportAnalysis,
      overallAssessment
    });

    return {
      basicInfo,
      sponsorInfo,
      statusAnalysis,
      supportAnalysis,
      committeeAnalysis,
      contentAnalysis,
      relatedAnalysis,
      overallAssessment,
      insights,
      recommendations,
      metadata: {
        analysisVersion: '2.0',
        generatedAt: new Date().toISOString(),
        dataCompleteness: this.calculateDataCompleteness(data)
      }
    };
  }

  // Enhanced Analysis Methods

  private determineBillActivity(actions: any[]): boolean {
    if (!actions.length) return false;
    const latestAction = actions[0];
    const actionDate = new Date(latestAction.actionDate);
    const daysSinceAction = (Date.now() - actionDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceAction < 30;
  }

  private determineBillStage(actions: any[]): string {
    if (!actions.length) return 'Unknown';
    
    const actionTexts = actions.map(a => a.text.toLowerCase());
    
    if (actionTexts.some(text => text.includes('became public law'))) {
      return 'Enacted';
    } else if (actionTexts.some(text => text.includes('presented to president'))) {
      return 'Sent to President';
    } else if (actionTexts.some(text => text.includes('passed senate') && text.includes('passed house'))) {
      return 'Passed Both Chambers';
    } else if (actionTexts.some(text => text.includes('passed senate') || text.includes('passed house'))) {
      return 'Passed One Chamber';
    } else if (actionTexts.some(text => text.includes('reported by committee'))) {
      return 'Reported by Committee';
    } else if (actionTexts.some(text => text.includes('markup') || text.includes('hearing'))) {
      return 'In Committee - Active';
    } else if (actionTexts.some(text => text.includes('committee'))) {
      return 'In Committee';
    } else {
      return 'Introduced';
    }
  }

  private assessPassageLikelihood(actions: any[], cosponsors: any[]): string {
    let score = 0;
    
    // Cosponsor support (0-30 points)
    if (cosponsors.length > 100) score += 30;
    else if (cosponsors.length > 50) score += 20;
    else if (cosponsors.length > 20) score += 10;
    else if (cosponsors.length > 10) score += 5;
    
    // Bipartisan support (0-20 points)
    const parties = new Set(cosponsors.map(c => c.party));
    if (parties.size > 1) {
      const partyBreakdown = this.getPartyBreakdown(cosponsors);
      const minorityPercent = Math.min(partyBreakdown.democratic, partyBreakdown.republican) / 100;
      score += Math.floor(minorityPercent * 20);
    }
    
    // Committee activity (0-20 points)
    const committeeActions = actions.filter(a => {
      const text = a.text.toLowerCase();
      return text.includes('committee') && !text.includes('referred to');
    });
    
    if (committeeActions.some(a => a.text.toLowerCase().includes('reported'))) score += 20;
    else if (committeeActions.some(a => a.text.toLowerCase().includes('markup'))) score += 15;
    else if (committeeActions.some(a => a.text.toLowerCase().includes('hearing'))) score += 10;
    else if (committeeActions.length > 0) score += 5;
    
    // Floor activity (0-30 points)
    if (actions.some(a => a.text.toLowerCase().includes('passed house') && a.text.toLowerCase().includes('passed senate'))) {
      score += 30;
    } else if (actions.some(a => a.text.toLowerCase().includes('passed'))) {
      score += 20;
    } else if (actions.some(a => a.text.toLowerCase().includes('floor'))) {
      score += 10;
    }
    
    // Convert score to likelihood
    if (score >= 80) return 'Very High';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    if (score >= 20) return 'Low';
    return 'Very Low';
  }

  private calculateDaysInCongress(introducedDate: string): number {
    const introduced = new Date(introducedDate);
    const now = new Date();
    return Math.floor((now.getTime() - introduced.getTime()) / (1000 * 60 * 60 * 24));
  }

  private extractKeyMilestones(actions: any[]): any[] {
    const milestones = [];
    const importantKeywords = [
      { keyword: 'introduced', weight: 1 },
      { keyword: 'referred to committee', weight: 2 },
      { keyword: 'hearing', weight: 3 },
      { keyword: 'markup', weight: 4 },
      { keyword: 'reported by committee', weight: 5 },
      { keyword: 'passed house', weight: 6 },
      { keyword: 'passed senate', weight: 6 },
      { keyword: 'conference', weight: 7 },
      { keyword: 'presented to president', weight: 8 },
      { keyword: 'became public law', weight: 9 }
    ];
    
    for (const action of actions) {
      for (const { keyword, weight } of importantKeywords) {
        if (action.text.toLowerCase().includes(keyword)) {
          milestones.push({
            date: action.actionDate,
            action: action.text,
            type: keyword,
            weight,
            daysAgo: this.calculateDaysAgo(action.actionDate)
          });
          break;
        }
      }
    }
    
    return milestones.sort((a, b) => b.weight - a.weight).slice(0, 10);
  }

  private predictNextAction(actions: any[]): string {
    if (!actions.length) return 'Introduction to committee expected';
    
    const stage = this.determineBillStage(actions);
    
    switch (stage) {
      case 'Introduced':
        return 'Referral to committee';
      case 'In Committee':
        return 'Committee hearing or markup session';
      case 'In Committee - Active':
        return 'Committee report';
      case 'Reported by Committee':
        return 'Floor consideration';
      case 'Passed One Chamber':
        return 'Consideration by other chamber';
      case 'Passed Both Chambers':
        return 'Presidential action';
      case 'Sent to President':
        return 'Presidential signature or veto';
      default:
        return 'No further action expected';
    }
  }

  private assessBipartisanSupport(cosponsors: any[]): boolean {
    const parties = new Set(cosponsors.map(c => c.party));
    if (parties.size <= 1) return false;
    
    // Check for meaningful bipartisan support (at least 20% from minority party)
    const partyBreakdown = this.getPartyBreakdown(cosponsors);
    const minorityPercent = Math.min(partyBreakdown.democratic, partyBreakdown.republican);
    
    return minorityPercent >= 20;
  }

  private analyzeSupportTrend(cosponsors: any[]): string {
    if (cosponsors.length < 5) return 'Insufficient data';
    
    // Sort by sponsorship date
    const dated = cosponsors.filter(c => c.sponsorshipDate);
    if (dated.length < 5) return 'Insufficient dated data';
    
    const sorted = dated.sort((a, b) => 
      new Date(a.sponsorshipDate).getTime() - new Date(b.sponsorshipDate).getTime()
    );
    
    // Compare first third with last third
    const firstThird = sorted.slice(0, Math.floor(sorted.length / 3));
    const lastThird = sorted.slice(-Math.floor(sorted.length / 3));
    
    const firstPeriodDays = this.calculatePeriodLength(firstThird);
    const lastPeriodDays = this.calculatePeriodLength(lastThird);
    
    const firstRate = firstThird.length / firstPeriodDays;
    const lastRate = lastThird.length / lastPeriodDays;
    
    if (lastRate > firstRate * 1.5) return 'Accelerating';
    if (lastRate > firstRate * 1.1) return 'Growing';
    if (lastRate < firstRate * 0.5) return 'Declining';
    if (lastRate < firstRate * 0.9) return 'Slowing';
    return 'Stable';
  }

  private calculateSupportStrength(cosponsors: any[]): string {
    const total = cosponsors.length;
    
    // Consider both quantity and quality
    let score = 0;
    
    // Quantity score
    if (total > 100) score += 50;
    else if (total > 50) score += 30;
    else if (total > 20) score += 20;
    else if (total > 10) score += 10;
    else score += 5;
    
    // Bipartisan bonus
    if (this.assessBipartisanSupport(cosponsors)) {
      score += 30;
    }
    
    // Leadership support (simplified - would need more data)
    const leadershipTitles = ['leader', 'whip', 'chair'];
    const hasLeadership = cosponsors.some(c => 
      leadershipTitles.some(title => c.name?.toLowerCase().includes(title))
    );
    if (hasLeadership) score += 20;
    
    if (score >= 80) return 'Very Strong';
    if (score >= 60) return 'Strong';
    if (score >= 40) return 'Moderate';
    if (score >= 20) return 'Weak';
    return 'Very Weak';
  }

  private identifyKeySuporters(cosponsors: any[]): any[] {
    // In real implementation, would identify committee chairs, leadership, etc.
    return cosponsors
      .slice(0, 5)
      .map(c => ({
        name: c.fullName,
        party: c.party,
        state: c.state,
        sponsorshipDate: c.sponsorshipDate
      }));
  }

  private assessCommitteeActivity(committees: any[], actions: any[]): string {
    const committeeActions = actions.filter(a => 
      a.text.toLowerCase().includes('committee')
    );
    
    if (committeeActions.some(a => a.text.toLowerCase().includes('reported'))) {
      return 'Reported - Ready for floor';
    } else if (committeeActions.some(a => a.text.toLowerCase().includes('markup'))) {
      return 'In markup - Active consideration';
    } else if (committeeActions.some(a => a.text.toLowerCase().includes('hearing'))) {
      return 'Hearing held - Under review';
    } else if (committees.length > 0) {
      return 'Referred - Awaiting action';
    }
    return 'No committee activity';
  }

  private assessBillComplexity(title: string, summary?: string): string {
    const text = `${title} ${summary || ''}`.toLowerCase();
    
    // Simple heuristics for complexity
    let complexityScore = 0;
    
    // Length factor
    if (text.length > 5000) complexityScore += 3;
    else if (text.length > 2000) complexityScore += 2;
    else if (text.length > 1000) complexityScore += 1;
    
    // Comprehensive/omnibus indicators
    if (text.includes('comprehensive') || text.includes('omnibus')) complexityScore += 2;
    
    // Multiple topic indicators
    const topics = ['tax', 'healthcare', 'defense', 'education', 'infrastructure'];
    const topicCount = topics.filter(topic => text.includes(topic)).length;
    complexityScore += topicCount;
    
    if (complexityScore >= 6) return 'Very Complex';
    if (complexityScore >= 4) return 'Complex';
    if (complexityScore >= 2) return 'Moderate';
    return 'Simple';
  }

  private extractKeyTopics(title: string, summary?: string): string[] {
    const text = `${title} ${summary || ''}`.toLowerCase();
    const topics = [];
    
    const topicKeywords = {
      'Healthcare': ['health', 'medical', 'medicare', 'medicaid', 'insurance'],
      'Economy': ['economic', 'tax', 'budget', 'fiscal', 'spending'],
      'Defense': ['defense', 'military', 'veteran', 'security'],
      'Education': ['education', 'school', 'student', 'college', 'university'],
      'Environment': ['climate', 'environment', 'energy', 'pollution', 'conservation'],
      'Infrastructure': ['infrastructure', 'transportation', 'highway', 'bridge'],
      'Immigration': ['immigration', 'border', 'citizenship', 'visa'],
      'Technology': ['technology', 'internet', 'cyber', 'data', 'privacy']
    };
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        topics.push(topic);
      }
    }
    
    return topics;
  }

  private findCompanionBills(relatedBills: any[]): any[] {
    return relatedBills.filter(rb => 
      rb.relationshipDetails?.[0]?.type === 'companion' ||
      rb.type === 'companion'
    );
  }

  private analyzeLegislativeNetwork(relatedBills: any[]): any {
    const network = {
      totalRelated: relatedBills.length,
      companions: 0,
      similarBills: 0,
      amendments: 0
    };
    
    relatedBills.forEach(rb => {
      const relationship = rb.relationshipDetails?.[0]?.type || rb.type || '';
      if (relationship.includes('companion')) network.companions++;
      else if (relationship.includes('similar')) network.similarBills++;
      else if (relationship.includes('amendment')) network.amendments++;
    });
    
    return network;
  }

  private assessBillSignificance(bill: any, support: any, committee: any, content: any): string {
    let score = 0;
    
    // Support strength (0-30)
    if (support.supportStrength === 'Very Strong') score += 30;
    else if (support.supportStrength === 'Strong') score += 20;
    else if (support.supportStrength === 'Moderate') score += 10;
    
    // Policy area importance (0-20)
    const importantAreas = ['Healthcare', 'Economy', 'Defense', 'Education'];
    const billTopics = content.keyTopics || [];
    const importantTopicCount = billTopics.filter((t: string) => importantAreas.includes(t)).length;
    score += importantTopicCount * 10;
    
    // Bipartisan support (0-20)
    if (support.bipartisanSupport) score += 20;
    
    // Committee activity (0-15)
    if (committee.committeeActivity.includes('Reported')) score += 15;
    else if (committee.committeeActivity.includes('markup')) score += 10;
    else if (committee.committeeActivity.includes('Hearing')) score += 5;
    
    // Complexity factor (0-15)
    if (content.complexity === 'Very Complex') score += 15;
    else if (content.complexity === 'Complex') score += 10;
    else if (content.complexity === 'Moderate') score += 5;
    
    if (score >= 80) return 'Major Legislation';
    if (score >= 60) return 'Significant';
    if (score >= 40) return 'Moderate';
    if (score >= 20) return 'Minor';
    return 'Routine';
  }

  private assessControversyLevel(support: any, actions: any[], content: any): string {
    let controversyScore = 0;
    
    // Low bipartisan support in significant bill
    if (!support.bipartisanSupport && support.totalCosponsors > 20) {
      controversyScore += 30;
    }
    
    // Partisan divide
    const partyBalance = Math.abs(support.democraticSupport - support.republicanSupport);
    if (partyBalance > support.totalCosponsors * 0.8) {
      controversyScore += 20;
    }
    
    // Controversial topics
    const controversialTopics = ['Immigration', 'Healthcare', 'Tax'];
    const topicCount = (content.keyTopics || []).filter((t: string) => 
      controversialTopics.includes(t)
    ).length;
    controversyScore += topicCount * 15;
    
    // Opposition actions (simplified)
    const oppositionActions = actions.filter(a => {
      const text = a.text.toLowerCase();
      return text.includes('objection') || text.includes('failed') || text.includes('rejected');
    });
    controversyScore += oppositionActions.length * 10;
    
    if (controversyScore >= 60) return 'Highly Controversial';
    if (controversyScore >= 40) return 'Controversial';
    if (controversyScore >= 20) return 'Somewhat Controversial';
    return 'Not Controversial';
  }

  private assessMediaAttention(title: string, cosponsorCount: number): string {
    let attentionScore = 0;
    
    // High-profile keywords
    const mediaKeywords = [
      'reform', 'crisis', 'emergency', 'covid', 'pandemic',
      'war', 'security', 'scandal', 'investigation'
    ];
    
    const titleLower = title.toLowerCase();
    const keywordCount = mediaKeywords.filter(kw => titleLower.includes(kw)).length;
    attentionScore += keywordCount * 20;
    
    // Cosponsor count as proxy for attention
    if (cosponsorCount > 100) attentionScore += 30;
    else if (cosponsorCount > 50) attentionScore += 20;
    else if (cosponsorCount > 20) attentionScore += 10;
    
    if (attentionScore >= 50) return 'High Media Attention';
    if (attentionScore >= 30) return 'Moderate Media Attention';
    if (attentionScore >= 10) return 'Some Media Attention';
    return 'Limited Media Attention';
  }

  private assessPracticalImpact(subjects: string[], policyAreas: string[]): string {
    // Simplified impact assessment based on policy areas
    const highImpactAreas = [
      'Taxation', 'Health', 'Armed Forces and National Security',
      'Economics and Public Finance', 'Education', 'Immigration'
    ];
    
    const allAreas = [...subjects, ...policyAreas];
    const impactCount = allAreas.filter(area => 
      highImpactAreas.some(impact => area.includes(impact))
    ).length;
    
    if (impactCount >= 3) return 'Very High Impact';
    if (impactCount >= 2) return 'High Impact';
    if (impactCount >= 1) return 'Moderate Impact';
    return 'Limited Impact';
  }

  private assessPoliticalFeasibility(support: any, status: any): string {
    let feasibilityScore = 0;
    
    // Passage likelihood contributes most
    switch (status.likelihood) {
      case 'Very High': feasibilityScore += 50; break;
      case 'High': feasibilityScore += 40; break;
      case 'Medium': feasibilityScore += 25; break;
      case 'Low': feasibilityScore += 10; break;
      default: feasibilityScore += 0;
    }
    
    // Bipartisan support
    if (support.bipartisanSupport) feasibilityScore += 30;
    
    // Support strength
    switch (support.supportStrength) {
      case 'Very Strong': feasibilityScore += 20; break;
      case 'Strong': feasibilityScore += 15; break;
      case 'Moderate': feasibilityScore += 10; break;
      case 'Weak': feasibilityScore += 5; break;
      default: feasibilityScore += 0;
    }
    
    if (feasibilityScore >= 80) return 'Highly Feasible';
    if (feasibilityScore >= 60) return 'Feasible';
    if (feasibilityScore >= 40) return 'Challenging';
    if (feasibilityScore >= 20) return 'Difficult';
    return 'Very Difficult';
  }

  private generateComprehensiveInsights(analysis: any): string[] {
    const insights = [];
    
    // Status insights
    if (analysis.statusAnalysis.isActive) {
      insights.push(`This bill is actively moving through Congress with recent action ${analysis.statusAnalysis.daysInCongress} days after introduction`);
    } else {
      insights.push(`This bill has been inactive for over 30 days and may be stalled`);
    }
    
    // Support insights
    if (analysis.supportAnalysis.bipartisanSupport) {
      const breakdown = this.getPartyBreakdownFromAnalysis(analysis.supportAnalysis);
      insights.push(`Strong bipartisan support with ${breakdown} split among cosponsors`);
    } else if (analysis.supportAnalysis.totalCosponsors > 0) {
      insights.push(`Partisan bill with support primarily from ${analysis.supportAnalysis.democraticSupport > analysis.supportAnalysis.republicanSupport ? 'Democrats' : 'Republicans'}`);
    }
    
    // Trend insights
    if (analysis.supportAnalysis.supportTrend === 'Accelerating' || analysis.supportAnalysis.supportTrend === 'Growing') {
      insights.push(`Momentum is building with ${analysis.supportAnalysis.supportTrend.toLowerCase()} cosponsor support`);
    } else if (analysis.supportAnalysis.supportTrend === 'Declining') {
      insights.push(`Support appears to be waning with declining cosponsor additions`);
    }
    
    // Significance insights
    if (analysis.overallAssessment.significance === 'Major Legislation') {
      insights.push(`This appears to be major legislation with potential for significant policy impact`);
    }
    
    // Controversy insights
    if (analysis.overallAssessment.controversyLevel === 'Highly Controversial' || analysis.overallAssessment.controversyLevel === 'Controversial') {
      insights.push(`Expect significant debate and opposition due to ${analysis.overallAssessment.controversyLevel.toLowerCase()} nature`);
    }
    
    // Committee insights
    if (analysis.committeeAnalysis.committeeActivity.includes('Reported')) {
      insights.push(`Successfully reported from committee, indicating readiness for floor consideration`);
    } else if (analysis.committeeAnalysis.committeeActivity.includes('markup')) {
      insights.push(`Currently in committee markup phase where amendments are being considered`);
    }
    
    return insights;
  }

  private generateRecommendations(analysis: any): string[] {
    const recommendations = [];
    
    // Based on passage likelihood
    if (analysis.statusAnalysis.likelihood === 'High' || analysis.statusAnalysis.likelihood === 'Very High') {
      recommendations.push('Monitor closely as this bill has strong prospects for passage');
    } else if (analysis.statusAnalysis.likelihood === 'Low' || analysis.statusAnalysis.likelihood === 'Very Low') {
      recommendations.push('Consider this bill unlikely to advance without significant changes or increased support');
    }
    
    // Based on support analysis
    if (analysis.supportAnalysis.supportTrend === 'Accelerating') {
      recommendations.push('Track momentum as rapid cosponsor growth suggests increasing political viability');
    }
    
    if (!analysis.supportAnalysis.bipartisanSupport && analysis.supportAnalysis.totalCosponsors > 10) {
      recommendations.push('Watch for bipartisan amendments or negotiations that could broaden support');
    }
    
    // Based on stage
    switch (analysis.statusAnalysis.stage) {
      case 'In Committee':
        recommendations.push('Follow committee hearings and markup sessions for amendment opportunities');
        break;
      case 'Reported by Committee':
        recommendations.push('Prepare for floor debate and potential amendments');
        break;
      case 'Passed One Chamber':
        recommendations.push('Monitor parallel legislation in the other chamber for reconciliation prospects');
        break;
    }
    
    // Political feasibility
    if (analysis.overallAssessment.politicalFeasibility === 'Challenging' || analysis.overallAssessment.politicalFeasibility === 'Difficult') {
      recommendations.push('Consider alternative legislative vehicles or incremental approaches');
    }
    
    return recommendations;
  }

  // Helper methods

  private makeApiRequest(endpoint: string): Promise<any> {
    return fetch(`${this.apiBaseUrl}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    }).then(response => {
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
    });
  }

  private async findBill(query: string, congress?: number): Promise<any> {
    const cleanQuery = query.trim();
    
    try {
      const searchParams = new URLSearchParams({
        q: cleanQuery,
        limit: '1'
      });
      
      if (congress) {
        searchParams.append('congress', congress.toString());
      }
      
      const searchResult = await this.makeApiRequest(`/api/bills?${searchParams}`);
      
      if (searchResult.bills?.length > 0) {
        return searchResult.bills[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error searching for bill:', error);
      throw error;
    }
  }

  private getBillDetails(congress: number, billType: string, billNumber: number): Promise<any> {
    return this.makeApiRequest(`/api/bills/${congress}/${billType}/${billNumber}`);
  }

  private getBillActions(congress: number, billType: string, billNumber: number): Promise<any> {
    return this.makeApiRequest(`/api/bills/${congress}/${billType}/${billNumber}/actions`);
  }

  private getBillCosponsors(congress: number, billType: string, billNumber: number): Promise<any> {
    return this.makeApiRequest(`/api/bills/${congress}/${billType}/${billNumber}/cosponsors`);
  }

  private getBillCommittees(congress: number, billType: string, billNumber: number): Promise<any> {
    return this.makeApiRequest(`/api/bills/${congress}/${billType}/${billNumber}/committees`);
  }

  private getBillAmendments(congress: number, billType: string, billNumber: number): Promise<any> {
    return this.makeApiRequest(`/api/bills/${congress}/${billType}/${billNumber}/amendments`);
  }

  private getBillRelatedBills(congress: number, billType: string, billNumber: number): Promise<any> {
    return this.makeApiRequest(`/api/bills/${congress}/${billType}/${billNumber}/relatedbills`);
  }

  private getBillSubjects(congress: number, billType: string, billNumber: number): Promise<any> {
    return this.makeApiRequest(`/api/bills/${congress}/${billType}/${billNumber}/subjects`);
  }

  private getBillSummaries(congress: number, billType: string, billNumber: number): Promise<any> {
    return this.makeApiRequest(`/api/bills/${congress}/${billType}/${billNumber}/summaries`);
  }

  private getBillText(congress: number, billType: string, billNumber: number): Promise<any> {
    return this.makeApiRequest(`/api/bills/${congress}/${billType}/${billNumber}/text`);
  }

  private extractResult(result: PromiseSettledResult<any>): any {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    console.warn('Promise rejected:', result.reason);
    return null;
  }

  private inferChamber(billType: string): string {
    const houseBillTypes = ['hr', 'hres', 'hjres', 'hconres'];
    const senateBillTypes = ['s', 'sres', 'sjres', 'sconres'];
    
    if (houseBillTypes.includes(billType.toLowerCase())) {
      return 'House';
    } else if (senateBillTypes.includes(billType.toLowerCase())) {
      return 'Senate';
    }
    return 'Unknown';
  }

  private getPartyBreakdown(cosponsors: any[]): { democratic: number; republican: number } {
    const total = cosponsors.length || 1;
    const dems = cosponsors.filter(c => c.party === 'D' || c.party === 'Democratic').length;
    const reps = cosponsors.filter(c => c.party === 'R' || c.party === 'Republican').length;
    
    return {
      democratic: Math.round((dems / total) * 100),
      republican: Math.round((reps / total) * 100)
    };
  }

  private getPartyBreakdownFromAnalysis(support: any): string {
    const total = support.totalCosponsors || 1;
    const demPercent = Math.round((support.democraticSupport / total) * 100);
    const repPercent = Math.round((support.republicanSupport / total) * 100);
    return `${demPercent}% Democrat / ${repPercent}% Republican`;
  }

  private calculatePeriodLength(cosponsors: any[]): number {
    if (cosponsors.length < 2) return 1;
    
    const dates = cosponsors
      .map(c => new Date(c.sponsorshipDate).getTime())
      .sort((a, b) => a - b);
    
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    
    const days = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
    return Math.max(1, days);
  }

  private calculateDaysAgo(dateString: string): number {
    const date = new Date(dateString);
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  }

  private calculateDataCompleteness(data: any): number {
    const components = [
      'bill', 'actions', 'cosponsors', 'committees',
      'amendments', 'relatedBills', 'subjects', 'summaries'
    ];
    
    const available = components.filter(key => data[key] !== null).length;
    return Math.round((available / components.length) * 100);
  }
}

export async function handleEnhancedBillAnalysis(
  params: BillAnalysisParams,
  apiBaseUrl: string,
  accessToken: string
): Promise<CallToolResult> {
  const tool = new EnhancedBillAnalysisTool(apiBaseUrl, accessToken);
  
  try {
    const analysis = await tool.analyzeBill(params);
    
    // Format the analysis as readable text
    let content = `# Bill Analysis: ${analysis.basicInfo.billNumber}\n\n`;
    content += `## ${analysis.basicInfo.title}\n\n`;
    
    // Executive Summary
    content += `### Executive Summary\n`;
    content += `- **Status**: ${analysis.statusAnalysis.stage} (${analysis.statusAnalysis.currentStatus})\n`;
    content += `- **Passage Likelihood**: ${analysis.statusAnalysis.likelihood}\n`;
    content += `- **Significance**: ${analysis.overallAssessment.significance}\n`;
    content += `- **Political Feasibility**: ${analysis.overallAssessment.politicalFeasibility}\n`;
    content += `- **Controversy Level**: ${analysis.overallAssessment.controversyLevel}\n\n`;
    
    // Sponsor Information
    if (analysis.sponsorInfo) {
      content += `### Sponsor\n`;
      content += `${analysis.sponsorInfo.name} (${analysis.sponsorInfo.party}-${analysis.sponsorInfo.state})\n\n`;
    }
    
    // Support Analysis
    content += `### Support Analysis\n`;
    content += `- **Total Cosponsors**: ${analysis.supportAnalysis.totalCosponsors}\n`;
    content += `- **Party Breakdown**: ${analysis.supportAnalysis.democraticSupport} Democrats, ${analysis.supportAnalysis.republicanSupport} Republicans\n`;
    content += `- **Bipartisan Support**: ${analysis.supportAnalysis.bipartisanSupport ? 'Yes' : 'No'}\n`;
    content += `- **Support Strength**: ${analysis.supportAnalysis.supportStrength}\n`;
    content += `- **Support Trend**: ${analysis.supportAnalysis.supportTrend}\n\n`;
    
    // Key Insights
    if (analysis.insights.length > 0) {
      content += `### Key Insights\n`;
      analysis.insights.forEach((insight: string) => {
        content += `- ${insight}\n`;
      });
      content += '\n';
    }
    
    // Recommendations
    if (analysis.recommendations.length > 0) {
      content += `### Recommendations\n`;
      analysis.recommendations.forEach((rec: string) => {
        content += `- ${rec}\n`;
      });
      content += '\n';
    }
    
    // Timeline
    content += `### Timeline\n`;
    content += `- **Introduced**: ${analysis.basicInfo.introducedDate} (${analysis.statusAnalysis.daysInCongress} days ago)\n`;
    content += `- **Next Expected Action**: ${analysis.statusAnalysis.nextLikelyAction}\n\n`;
    
    // Key Milestones
    if (analysis.statusAnalysis.keyMilestones.length > 0) {
      content += `### Key Milestones\n`;
      analysis.statusAnalysis.keyMilestones.slice(0, 5).forEach((milestone: any) => {
        content += `- **${milestone.date}**: ${milestone.action}\n`;
      });
      content += '\n';
    }
    
    // Committee Activity
    content += `### Committee Activity\n`;
    content += `- **Primary Committee**: ${analysis.committeeAnalysis.primaryCommittee}\n`;
    content += `- **Status**: ${analysis.committeeAnalysis.committeeActivity}\n\n`;
    
    // Topics and Impact
    content += `### Topics and Impact\n`;
    content += `- **Key Topics**: ${analysis.contentAnalysis.keyTopics.join(', ') || 'General'}\n`;
    content += `- **Policy Areas**: ${analysis.contentAnalysis.policyAreas.join(', ') || 'Not specified'}\n`;
    content += `- **Complexity**: ${analysis.contentAnalysis.complexity}\n`;
    content += `- **Practical Impact**: ${analysis.overallAssessment.practicalImpact}\n`;
    content += `- **Media Attention**: ${analysis.overallAssessment.mediaAttention}\n\n`;
    
    // Related Legislation
    if (analysis.relatedAnalysis.relatedBills.length > 0) {
      content += `### Related Legislation\n`;
      content += `- **Related Bills**: ${analysis.relatedAnalysis.relatedBills.length}\n`;
      content += `- **Amendments**: ${analysis.relatedAnalysis.amendments}\n`;
      if (analysis.relatedAnalysis.companionBills.length > 0) {
        content += `- **Companion Bills**: ${analysis.relatedAnalysis.companionBills.map((b: any) => b.number).join(', ')}\n`;
      }
      content += '\n';
    }
    
    // Metadata
    content += `---\n`;
    content += `*Analysis generated at ${analysis.metadata.generatedAt}*\n`;
    content += `*Data completeness: ${analysis.metadata.dataCompleteness}%*\n`;
    
    return {
      content: [{ text: content, type: "text" }],
    };
    
  } catch (error) {
    return {
      content: [{ 
        text: `Failed to analyze bill: ${error instanceof Error ? error.message : String(error)}`, 
        type: "text" 
      }],
      isError: true
    };
  }
}