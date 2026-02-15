import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { BillAnalysisParams } from "./billAnalysisParams.js";
import { CongressApiService } from "../../services/CongressApiService.js";
import {
  NotFoundError,
} from "../../utils/errors.js";
import { getCurrentCongress } from "../../utils/congress.js";
import { findVotesInActions } from "../../utils/legislation.js";

export class EnhancedBillAnalysisTool {
  constructor(private congressApi: CongressApiService) {}

  async analyzeBill(params: BillAnalysisParams): Promise<any> {
    try {
      console.error('Starting enhanced bill analysis', { query: params.query });

      const bill = await this.findBill(params.query, params.congress);
      if (!bill) {
        throw new NotFoundError(`No bill found matching: ${params.query}`);
      }

      console.error('Found bill for analysis', {
        billNumber: bill.number || bill.billNumber,
        title: bill.title?.substring(0, 100)
      });

      const congress = bill.congress;
      const billType = bill.type || bill.billType;
      const billNumber = bill.number || bill.billNumber;
      const parentUri = `congress-gov:/bill/${congress}/${billType.toLowerCase()}/${billNumber}`;

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
        this.congressApi.getBillDetails({ congress: String(congress), billType, billNumber: String(billNumber) }),
        this.congressApi.getSubResource(parentUri, 'actions'),
        this.congressApi.getSubResource(parentUri, 'cosponsors'),
        this.congressApi.getSubResource(parentUri, 'committees'),
        params.includeRelated ? this.congressApi.getSubResource(parentUri, 'amendments') : Promise.resolve(null),
        params.includeRelated ? this.congressApi.getSubResource(parentUri, 'relatedbills') : Promise.resolve(null),
        this.congressApi.getSubResource(parentUri, 'subjects'),
        this.congressApi.getSubResource(parentUri, 'summaries'),
        params.includeText ? this.congressApi.getSubResource(parentUri, 'text') : Promise.resolve(null)
      ]);

      const billDetails = this.extractResult(billDetailsResult) || bill;
      const actions = this.extractResult(actionsResult);
      const cosponsors = this.extractResult(cosponsorsResult);
      const committees = this.extractResult(committeesResult);
      const amendments = this.extractResult(amendmentsResult);
      const relatedBills = this.extractResult(relatedBillsResult);
      const subjects = this.extractResult(subjectsResult);
      const summaries = this.extractResult(summariesResult);
      const text = this.extractResult(textResult);

      return this.processAnalysis({
        bill: billDetails.bill || billDetails,
        actions,
        cosponsors,
        committees,
        amendments,
        relatedBills,
        subjects,
        summaries,
        text
      });

    } catch (error) {
      console.error('Error in enhanced bill analysis', { error: (error as Error).message, query: params.query });
      throw error;
    }
  }

  private processAnalysis(data: any): any {
    const { bill, actions, cosponsors, committees, amendments, relatedBills, subjects, summaries } = data;

    const billType = (bill.type || bill.billType || '').toUpperCase();
    const billNum = bill.number || bill.billNumber;
    const actionsData = actions?.actions || [];
    const cosponsorsData = cosponsors?.cosponsors || [];
    const committeesData = committees?.committees || [];
    const subjectsData = subjects?.subjects || {};
    const summariesData = summaries?.summaries || [];
    const amendmentsData = amendments?.amendments || [];
    const relatedBillsData = relatedBills?.relatedBills || [];

    const sponsor = (bill.sponsors && bill.sponsors.length > 0) ? {
      name: bill.sponsors[0].firstName && bill.sponsors[0].lastName
        ? `${bill.sponsors[0].firstName} ${bill.sponsors[0].lastName}`
        : bill.sponsors[0].fullName || 'Unknown',
      party: bill.sponsors[0].party,
      state: bill.sponsors[0].state,
      district: bill.sponsors[0].district,
      bioguideId: bill.sponsors[0].bioguideId
    } : null;

    const latestAction = bill.latestAction || actionsData[0];

    const dems = cosponsorsData.filter((c: any) => c.party === 'D' || c.party === 'Democratic').length;
    const reps = cosponsorsData.filter((c: any) => c.party === 'R' || c.party === 'Republican').length;

    return {
      bill: {
        number: `${billType} ${billNum}`,
        congress: bill.congress,
        title: bill.title,
        introducedDate: bill.introducedDate,
        lastActionDate: latestAction?.actionDate || bill.updateDate,
        originChamber: bill.originChamber || this.inferChamber(bill.type || bill.billType),
        url: bill.url || `https://www.congress.gov/bill/${bill.congress}/${(bill.type || bill.billType || '').toLowerCase()}/${billNum}`
      },
      sponsor,
      status: {
        currentStatus: latestAction?.text || 'Unknown',
        lastActionDate: latestAction?.actionDate || bill.updateDate
      },
      support: {
        totalCosponsors: cosponsorsData.length,
        partyBreakdown: { democratic: dems, republican: reps, other: cosponsorsData.length - dems - reps },
        topCosponsors: cosponsorsData.slice(0, 5).map((c: any) => ({
          name: c.firstName && c.lastName ? `${c.firstName} ${c.lastName}` : c.fullName,
          party: c.party,
          state: c.state,
          sponsorshipDate: c.sponsorshipDate
        }))
      },
      committees: committeesData.map((c: any) => ({
        name: c.name,
        chamber: c.chamber,
        activities: c.activities || []
      })),
      content: {
        summary: summariesData[0]?.text || null,
        subjects: subjectsData.legislativeSubjects?.map((s: any) => s.name) || [],
        policyAreas: subjectsData.policyArea?.name ? [subjectsData.policyArea.name] : []
      },
      related: {
        relatedBills: relatedBillsData.map((rb: any) => ({
          number: rb.number || `${rb.type} ${rb.billNumber}`,
          title: rb.title,
          relationship: rb.relationshipDetails?.[0]?.type || rb.type
        })),
        amendmentCount: amendmentsData.length,
        companionBills: this.findCompanionBills(relatedBillsData)
      },
      votes: (() => {
        const recorded = findVotesInActions(actionsData);
        const chambers = [...new Set(recorded.map((v: any) => v.chamber).filter(Boolean))];
        return {
          recorded,
          totalVotes: recorded.length,
          chambers,
        };
      })(),
      actions: actionsData,
      metadata: {
        dataCompleteness: this.calculateDataCompleteness(data),
        fetchedAt: new Date().toISOString()
      }
    };
  }

  private async findBill(query: string, congress?: number): Promise<any> {
    const cleanQuery = query.trim();

    const parsed = this.parseBillIdentifier(cleanQuery, congress);
    if (!parsed) {
      throw new NotFoundError(
        `Could not parse bill identifier: "${cleanQuery}". ` +
        `Please provide a structured bill identifier like "HR 1", "S 2345", or "119 HR 5". ` +
        `Text search is not supported by the Congress.gov API.`
      );
    }

    const data = await this.congressApi.getBillDetails({
      congress: parsed.congress,
      billType: parsed.billType,
      billNumber: parsed.billNumber,
    });
    const bill = data.bill || data;
    if (bill) return bill;

    throw new NotFoundError(`Bill not found: ${cleanQuery}`);
  }

  private parseBillIdentifier(query: string, defaultCongress?: number): { congress: string; billType: string; billNumber: string } | null {
    const normalized = query.replace(/\./g, '').replace(/\s+/g, ' ').trim().toLowerCase();

    const match = normalized.match(
      /^(?:(\d{2,3})\s+)?(hr|s|hjres|sjres|hconres|sconres|hres|sres)[\s]?(\d+)$/
    );
    if (!match) return null;

    const congressNum = match[1] || (defaultCongress ? String(defaultCongress) : String(getCurrentCongress()));
    const billType = match[2];
    const billNumber = match[3];

    return { congress: congressNum, billType, billNumber };
  }

  private extractResult(result: PromiseSettledResult<any>): any {
    if (result.status === 'fulfilled') return result.value;
    console.warn('Promise rejected:', result.reason);
    return null;
  }

  private inferChamber(billType: string): string {
    if (!billType) return 'Unknown';
    const t = billType.toLowerCase();
    if (t.startsWith('h')) return 'House';
    if (t.startsWith('s')) return 'Senate';
    return 'Unknown';
  }

  private findCompanionBills(relatedBills: any[]): any[] {
    return relatedBills.filter(rb =>
      rb.relationshipDetails?.[0]?.type === 'companion' || rb.type === 'companion'
    );
  }

  private calculateDataCompleteness(data: any): number {
    const components = ['bill', 'actions', 'cosponsors', 'committees', 'amendments', 'relatedBills', 'subjects', 'summaries'];
    const available = components.filter(key => data[key] !== null).length;
    return Math.round((available / components.length) * 100);
  }
}

export async function handleEnhancedBillAnalysis(
  params: BillAnalysisParams,
  congressApi: CongressApiService
): Promise<CallToolResult> {
  const tool = new EnhancedBillAnalysisTool(congressApi);

  try {
    const analysis = await tool.analyzeBill(params);
    return { content: [{ type: "text", text: JSON.stringify(analysis, null, 2) }] };
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
