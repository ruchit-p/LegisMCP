import { Env } from '../types';

export interface Bill {
  billNumber: number;
  billType: string;
  congress: number;
  title: string;
  introducedDate: string;
  lastActionDate?: string;
  lastAction?: string;
  sponsor?: {
    bioguideId: string;
    fullName: string;
    state?: string;
    party?: string;
  };
  policyArea?: string;
  summary?: string;
  url?: string;
}

export interface Member {
  bioguideId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  party: string;
  state: string;
  chamber: 'house' | 'senate';
  district?: number;
  phoneNumber?: string;
  url?: string;
}

export interface Vote {
  congress: number;
  chamber: 'house' | 'senate';
  rollCall: number;
  date: string;
  question: string;
  result: string;
  totalYes: number;
  totalNo: number;
  totalNotVoting: number;
}

export interface Committee {
  code: string;
  name: string;
  chamber: 'house' | 'senate' | 'joint';
  parentCommittee?: string;
  subcommittees?: Committee[];
}

export class CongressServiceV2 {
  private env: Env;
  private baseUrl = 'https://api.congress.gov/v3';
  private currentApiKeyIndex = 0;

  constructor(env: Env) {
    this.env = env;
  }

  private async getApiKey(): Promise<string | null> {
    try {
      const apiKeysJson = await this.env.CONGRESS_KEYS.get('api_keys');
      
      if (apiKeysJson) {
        try {
          const apiKeys = JSON.parse(apiKeysJson) as string[];
          if (Array.isArray(apiKeys) && apiKeys.length > 0) {
            const key = apiKeys[this.currentApiKeyIndex % apiKeys.length];
            this.currentApiKeyIndex++;
            return key;
          }
        } catch (parseError) {
          console.error('Error parsing API keys:', parseError);
        }
      }
    } catch (kvError) {
      console.error('Error accessing KV storage:', kvError);
    }
    
    return null;
  }

  private async fetchFromCongress<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error('No Congress.gov API key available');
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append('api_key', apiKey);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    console.log('Fetching from Congress.gov:', url.pathname);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Congress.gov API rate limit exceeded');
      }
      throw new Error(`Congress.gov API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get recent bills (NO TEXT SEARCH SUPPORT)
   * Returns bills sorted by date of latest action
   */
  async getRecentBills(limit: number = 20, offset: number = 0): Promise<Bill[]> {
    const params: Record<string, string> = {
      limit: Math.min(limit, 250).toString(),
      offset: offset.toString()
    };
    
    const data = await this.fetchFromCongress<any>('/bill', params);
    const bills = data.bills || [];
    
    return bills.map((bill: any) => this.transformBill(bill));
  }

  /**
   * Get bills by congress
   */
  async getBillsByCongress(congress: number, billType?: string, limit: number = 20, offset: number = 0): Promise<Bill[]> {
    const params: Record<string, string> = {
      limit: Math.min(limit, 250).toString(),
      offset: offset.toString()
    };
    
    let endpoint = `/bill/${congress}`;
    if (billType) {
      const validTypes = ['hr', 's', 'hjres', 'sjres', 'hconres', 'sconres', 'hres', 'sres'];
      const normalizedType = billType.toLowerCase();
      if (!validTypes.includes(normalizedType)) {
        throw new Error(`Invalid bill type: ${billType}. Valid types: ${validTypes.join(', ')}`);
      }
      endpoint += `/${normalizedType}`;
    }
    
    const data = await this.fetchFromCongress<any>(endpoint, params);
    const bills = data.bills || [];
    
    return bills.map((bill: any) => this.transformBill(bill));
  }

  /**
   * Get specific bill by congress, type, and number
   */
  async getBill(congress: number, billType: string, billNumber: number): Promise<Bill> {
    if (!congress || congress < 1) {
      throw new Error('Congress number is required and must be positive');
    }
    if (!billType) {
      throw new Error('Bill type is required (e.g., hr, s, hjres)');
    }
    if (!billNumber || billNumber < 1) {
      throw new Error('Bill number is required and must be positive');
    }
    
    const normalizedType = billType.toLowerCase();
    const endpoint = `/bill/${congress}/${normalizedType}/${billNumber}`;
    
    const data = await this.fetchFromCongress<any>(endpoint);
    
    if (!data.bill) {
      throw new Error('No bill data in response');
    }
    
    return this.transformBill(data.bill);
  }

  /**
   * Parse bill identifier from user input
   * Examples: "hr1", "s123", "hjres5", "HR 1234", "S.567"
   */
  parseBillIdentifier(input: string, defaultCongress?: number): { congress?: number; billType: string; billNumber: number } | null {
    const cleanInput = input.trim().toLowerCase();
    
    // Match patterns like "hr1", "s123", "hjres5"
    const simpleMatch = cleanInput.match(/^(hr|s|hjres|sjres|hconres|sconres|hres|sres)\s*(\d+)$/);
    if (simpleMatch) {
      return {
        congress: defaultCongress,
        billType: simpleMatch[1],
        billNumber: parseInt(simpleMatch[2])
      };
    }
    
    // Match patterns like "118 hr 1", "117 s 123"
    const withCongressMatch = cleanInput.match(/^(\d+)\s+(hr|s|hjres|sjres|hconres|sconres|hres|sres)\s*(\d+)$/);
    if (withCongressMatch) {
      return {
        congress: parseInt(withCongressMatch[1]),
        billType: withCongressMatch[2],
        billNumber: parseInt(withCongressMatch[3])
      };
    }
    
    // Match patterns like "H.R. 1234", "S. 567"
    const formalMatch = cleanInput.match(/^([hs])\.?\s*(?:j\.?\s*)?(?:con\.?\s*)?(?:res\.?)?\s*(\d+)$/);
    if (formalMatch) {
      const chamber = formalMatch[1];
      const number = parseInt(formalMatch[2]);
      
      let billType: string;
      if (cleanInput.includes('jres') || cleanInput.includes('j.res')) {
        billType = chamber === 'h' ? 'hjres' : 'sjres';
      } else if (cleanInput.includes('conres') || cleanInput.includes('con.res')) {
        billType = chamber === 'h' ? 'hconres' : 'sconres';
      } else if (cleanInput.includes('res')) {
        billType = chamber === 'h' ? 'hres' : 'sres';
      } else {
        billType = chamber === 'h' ? 'hr' : 's';
      }
      
      return {
        congress: defaultCongress,
        billType,
        billNumber: number
      };
    }
    
    return null;
  }

  // Bill sub-resource methods
  async getBillActions(congress: number, billType: string, billNumber: number): Promise<any> {
    if (!billType) throw new Error('Bill type is required');
    return await this.fetchFromCongress<any>(`/bill/${congress}/${billType.toLowerCase()}/${billNumber}/actions`);
  }

  async getBillAmendments(congress: number, billType: string, billNumber: number): Promise<any> {
    if (!billType) throw new Error('Bill type is required');
    return await this.fetchFromCongress<any>(`/bill/${congress}/${billType.toLowerCase()}/${billNumber}/amendments`);
  }

  async getBillCommittees(congress: number, billType: string, billNumber: number): Promise<any> {
    if (!billType) throw new Error('Bill type is required');
    return await this.fetchFromCongress<any>(`/bill/${congress}/${billType.toLowerCase()}/${billNumber}/committees`);
  }

  async getBillCosponsors(congress: number, billType: string, billNumber: number): Promise<any> {
    if (!billType) throw new Error('Bill type is required');
    return await this.fetchFromCongress<any>(`/bill/${congress}/${billType.toLowerCase()}/${billNumber}/cosponsors`);
  }

  async getBillRelatedBills(congress: number, billType: string, billNumber: number): Promise<any> {
    if (!billType) throw new Error('Bill type is required');
    return await this.fetchFromCongress<any>(`/bill/${congress}/${billType.toLowerCase()}/${billNumber}/relatedbills`);
  }

  async getBillSubjects(congress: number, billType: string, billNumber: number): Promise<any> {
    if (!billType) throw new Error('Bill type is required');
    return await this.fetchFromCongress<any>(`/bill/${congress}/${billType.toLowerCase()}/${billNumber}/subjects`);
  }

  async getBillSummaries(congress: number, billType: string, billNumber: number): Promise<any> {
    if (!billType) throw new Error('Bill type is required');
    return await this.fetchFromCongress<any>(`/bill/${congress}/${billType.toLowerCase()}/${billNumber}/summaries`);
  }

  async getBillText(congress: number, billType: string, billNumber: number): Promise<any> {
    if (!billType) throw new Error('Bill type is required');
    return await this.fetchFromCongress<any>(`/bill/${congress}/${billType.toLowerCase()}/${billNumber}/text`);
  }

  async getBillTitles(congress: number, billType: string, billNumber: number): Promise<any> {
    if (!billType) throw new Error('Bill type is required');
    return await this.fetchFromCongress<any>(`/bill/${congress}/${billType.toLowerCase()}/${billNumber}/titles`);
  }

  // Member methods
  async getMembers(limit: number = 20, offset: number = 0): Promise<Member[]> {
    const params: Record<string, string> = {
      limit: Math.min(limit, 250).toString(),
      offset: offset.toString()
    };
    
    const data = await this.fetchFromCongress<any>('/member', params);
    const members = data.members || [];
    
    return members.map((member: any) => this.transformMember(member));
  }

  async getMembersByCongress(congress: number, limit: number = 20, offset: number = 0): Promise<Member[]> {
    const params: Record<string, string> = {
      limit: Math.min(limit, 250).toString(),
      offset: offset.toString()
    };
    
    const data = await this.fetchFromCongress<any>(`/member/congress/${congress}`, params);
    const members = data.members || [];
    
    return members.map((member: any) => this.transformMember(member));
  }

  async getMembersByState(stateCode: string, district?: number): Promise<Member[]> {
    let endpoint = `/member/${stateCode.toUpperCase()}`;
    if (district) {
      endpoint += `/${district}`;
    }
    
    const data = await this.fetchFromCongress<any>(endpoint);
    const members = data.members || [];
    
    return members.map((member: any) => this.transformMember(member));
  }

  async getMember(bioguideId: string): Promise<Member> {
    const data = await this.fetchFromCongress<any>(`/member/${bioguideId}`);
    
    if (!data.member) {
      throw new Error('No member data in response');
    }
    
    return this.transformMember(data.member);
  }

  async getMemberSponsoredLegislation(bioguideId: string, limit: number = 20, offset: number = 0): Promise<Bill[]> {
    const params: Record<string, string> = {
      limit: Math.min(limit, 250).toString(),
      offset: offset.toString()
    };
    
    const data = await this.fetchFromCongress<any>(`/member/${bioguideId}/sponsored-legislation`, params);
    const bills = data.sponsoredLegislation || [];
    
    return bills.map((bill: any) => this.transformBill(bill));
  }

  // Committee methods
  async getCommittees(chamber?: string, congress?: number): Promise<Committee[]> {
    let endpoint = '/committee';
    if (congress && chamber) {
      endpoint = `/committee/${congress}/${chamber}`;
    } else if (chamber) {
      endpoint = `/committee/${chamber}`;
    }
    
    const data = await this.fetchFromCongress<any>(endpoint);
    const committees = data.committees || [];
    
    return committees.map((committee: any) => this.transformCommittee(committee));
  }

  async getCommittee(chamber: string, committeeCode: string): Promise<Committee> {
    const data = await this.fetchFromCongress<any>(`/committee/${chamber}/${committeeCode}`);
    
    if (!data.committee) {
      throw new Error('No committee data in response');
    }
    
    return this.transformCommittee(data.committee);
  }

  async getCommitteeBills(chamber: string, committeeCode: string, limit: number = 20, offset: number = 0): Promise<Bill[]> {
    const params: Record<string, string> = {
      limit: Math.min(limit, 250).toString(),
      offset: offset.toString()
    };
    
    const data = await this.fetchFromCongress<any>(`/committee/${chamber}/${committeeCode}/bills`, params);
    const bills = data.bills || [];
    
    return bills.map((bill: any) => this.transformBill(bill));
  }

  // House vote methods
  async getHouseVotes(congress: number, session?: number, limit: number = 20, offset: number = 0): Promise<Vote[]> {
    const params: Record<string, string> = {
      limit: Math.min(limit, 250).toString(),
      offset: offset.toString()
    };
    
    let endpoint = `/house-vote/${congress}`;
    if (session) {
      endpoint += `/${session}`;
    }
    
    const data = await this.fetchFromCongress<any>(endpoint, params);
    const votes = data.votes || [];
    
    return votes.map((vote: any) => this.transformVote(vote, 'house'));
  }

  // Senate vote methods
  async getSenateVotes(congress: number, session?: number, limit: number = 20, offset: number = 0): Promise<Vote[]> {
    const params: Record<string, string> = {
      limit: Math.min(limit, 250).toString(),
      offset: offset.toString()
    };
    
    let endpoint = `/senate-vote/${congress}`;
    if (session) {
      endpoint += `/${session}`;
    }
    
    const data = await this.fetchFromCongress<any>(endpoint, params);
    const votes = data.votes || [];
    
    return votes.map((vote: any) => this.transformVote(vote, 'senate'));
  }

  // Get recent votes from both chambers
  async getRecentVotes(chamber: string, limit: number = 20, offset: number = 0): Promise<Vote[]> {
    const currentCongress = 119; // 119th Congress (2025-2026)
    
    if (chamber.toLowerCase() === 'house') {
      return this.getHouseVotes(currentCongress, undefined, limit, offset);
    } else if (chamber.toLowerCase() === 'senate') {
      return this.getSenateVotes(currentCongress, undefined, limit, offset);
    } else {
      throw new Error('Invalid chamber. Must be "house" or "senate".');
    }
  }

  // Search members - simulated since Congress.gov doesn't support text search
  async searchMembers(chamber?: string, state?: string, limit: number = 20, offset: number = 0): Promise<Member[]> {
    console.error('DEPRECATED: searchMembers with text query is not supported by Congress.gov API');
    console.error('Use getMembers() or getMembersByCongress() instead');
    
    // If state is provided, try to get members by state
    if (state) {
      try {
        return await this.getMembersByState(state);
      } catch (error) {
        console.error('Error fetching members by state:', error);
      }
    }
    
    // Return recent members as fallback
    return this.getMembers(limit, offset);
  }

  // Transform methods
  private transformBill(data: any): Bill {
    // Handle sponsor - it might be an array or a single object
    let sponsor = undefined;
    if (data.sponsors?.[0]) {
      // Array of sponsors
      const s = data.sponsors[0];
      sponsor = {
        bioguideId: s.bioguideId,
        fullName: s.fullName || s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Unknown',
        state: s.state,
        party: s.party || s.partyName
      };
    } else if (data.sponsor) {
      // Single sponsor object
      const s = data.sponsor;
      sponsor = {
        bioguideId: s.bioguideId,
        fullName: s.fullName || s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Unknown',
        state: s.state,
        party: s.party || s.partyName
      };
    }

    return {
      billNumber: data.number || parseInt(data.billNumber),
      billType: data.type || data.billType,
      congress: data.congress || parseInt(data.congress),
      title: data.title || data.short_title || data.official_title || 'Untitled',
      introducedDate: data.introducedDate,
      lastActionDate: data.latestAction?.actionDate || data.updateDate,
      lastAction: data.latestAction?.text,
      sponsor: sponsor,
      policyArea: data.policyArea?.name,
      summary: data.summary?.text,
      url: data.url
    };
  }

  private transformMember(data: any): Member {
    return {
      bioguideId: data.bioguideId,
      fullName: `${data.firstName} ${data.lastName}`,
      firstName: data.firstName,
      lastName: data.lastName,
      party: data.partyName || data.party,
      state: data.state,
      chamber: data.chamber?.toLowerCase() || (data.terms?.[0]?.chamber?.toLowerCase()),
      district: data.district,
      phoneNumber: data.phoneNumber,
      url: data.url
    };
  }

  private transformCommittee(data: any): Committee {
    return {
      code: data.systemCode || data.code,
      name: data.name,
      chamber: data.chamber?.toLowerCase() || 'joint',
      parentCommittee: data.parent?.systemCode,
      subcommittees: data.subcommittees?.map((sub: any) => this.transformCommittee(sub))
    };
  }

  private transformVote(data: any, chamber: 'house' | 'senate'): Vote {
    return {
      congress: data.congress,
      chamber,
      rollCall: data.rollCall || data.number,
      date: data.date,
      question: data.question || data.description,
      result: data.result,
      totalYes: data.yeas || data.totalYes,
      totalNo: data.nays || data.totalNo,
      totalNotVoting: data.notVoting || data.totalNotVoting
    };
  }

  // DEPRECATED: Text search not supported by Congress.gov API
  async searchBills(query?: string, limit: number = 20, offset: number = 0): Promise<Bill[]> {
    console.error('DEPRECATED: searchBills with text query is not supported by Congress.gov API');
    console.error('Use getRecentBills() or getBillsByCongress() instead');
    
    if (query) {
      // Try to parse as bill identifier
      const parsed = this.parseBillIdentifier(query, 118); // Default to current congress
      if (parsed && parsed.congress) {
        try {
          const bill = await this.getBill(parsed.congress, parsed.billType, parsed.billNumber);
          return [bill];
        } catch (error) {
          console.error('Failed to fetch bill:', error);
        }
      }
    }
    
    // Return recent bills as fallback
    return this.getRecentBills(limit, offset);
  }
}