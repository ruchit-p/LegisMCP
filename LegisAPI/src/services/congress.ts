// Env type is now globally available from worker-configuration.d.ts

export interface CongressAPIConfig {
  apiKey?: string;
  baseUrl: string;
}

export interface Bill {
  congress: number;
  billType: string;
  billNumber: number;
  title: string;
  summary?: string;
  sponsor?: {
    bioguideId: string;
    fullName: string;
    party: string;
    state: string;
  };
  introducedDate: string;
  latestAction?: {
    actionDate: string;
    text: string;
  };
  url: string;
}

export interface Member {
  bioguideId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  party: string;
  state: string;
  district?: number;
  chamber: 'house' | 'senate';
  inOffice: boolean;
  nextElection?: string;
}

export interface Vote {
  rollCall: number;
  chamber: 'house' | 'senate';
  congress: number;
  session: number;
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

export class CongressService {
  private env: Env;
  private baseUrl = 'https://api.congress.gov/v3';
  private currentApiKeyIndex = 0;

  constructor(env: Env) {
    this.env = env;
  }

  private async getApiKey(): Promise<string | null> {
    try {
      // Try to get API keys from KV storage
      const apiKeysJson = await this.env.CONGRESS_KEYS.get('api_keys');
      console.log('API keys from KV:', apiKeysJson ? 'Found' : 'Not found');
      
      if (apiKeysJson) {
        try {
          const apiKeys = JSON.parse(apiKeysJson) as string[];
          if (Array.isArray(apiKeys) && apiKeys.length > 0) {
            // Rotate through available keys
            const key = apiKeys[this.currentApiKeyIndex % apiKeys.length];
            this.currentApiKeyIndex++;
            console.log('Using API key from KV (index:', this.currentApiKeyIndex - 1, ')');
            return key;
          } else {
            console.warn('API keys array is empty or invalid structure');
          }
        } catch (parseError) {
          console.error('Error parsing API keys JSON from KV storage:', parseError);
          console.error('Invalid JSON content:', apiKeysJson);
        }
      }
    } catch (kvError) {
      console.error('Error accessing KV storage for API keys:', kvError);
      // Check if it's a network/service error vs. permission error
      if (kvError instanceof Error) {
        console.error('KV Error details:', {
          name: kvError.name,
          message: kvError.message,
          stack: kvError.stack?.split('\n')[0] // Just first line of stack
        });
      }
    }

    // Fallback to environment variable
    const envKey = this.env.CONGRESS_API_KEY || null;
    console.log('Using API key from env:', envKey ? 'Found' : 'Not found');
    return envKey;
  }

  private async fetchFromCongress<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // Add query parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    // Add API key if available
    const apiKey = await this.getApiKey();
    if (apiKey) {
      url.searchParams.append('api_key', apiKey);
    }

    url.searchParams.append('format', 'json');

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'LegislativeMCP/1.0'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Congress API error: ${response.status} - ${errorText}`);
      throw new Error(`Congress API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async searchBills(query?: string, limit: number = 20, offset: number = 0): Promise<Bill[]> {
    const params: Record<string, string> = {
      limit: Math.min(limit, 250).toString(), // API max is 250
      offset: offset.toString()
    };

    // Note: Congress.gov API doesn't support text search via query parameter
    // We'll fetch recent bills and optionally filter client-side if a query is provided
    
    console.log('searchBills called with:', { query, limit, offset });
    
    const data = await this.fetchFromCongress<any>('/bill', params);
    
    // Handle different response structures
    let bills = data.bills || data.results || [];
    console.log('Bills received from API:', bills.length);
    
    // If a query is provided, filter bills client-side
    if (query) {
      const searchQuery = query.toLowerCase();
      bills = bills.filter((bill: any) => {
        const title = (bill.title || bill.short_title || bill.official_title || '').toLowerCase();
        const summary = (bill.summary?.text || '').toLowerCase();
        const sponsorName = (bill.sponsors?.[0]?.fullName || bill.sponsors?.[0]?.full_name || '').toLowerCase();
        
        return title.includes(searchQuery) || 
               summary.includes(searchQuery) || 
               sponsorName.includes(searchQuery);
      });
      console.log('Bills after filtering:', bills.length);
    }
    
    return bills.map((bill: any) => this.transformBill(bill));
  }

  async searchBillsByType(congress?: number, billType?: string, limit: number = 20, offset: number = 0): Promise<Bill[]> {
    const params: Record<string, string> = {
      limit: Math.min(limit, 250).toString(),
      offset: offset.toString()
    };

    // Build endpoint based on provided filters
    let endpoint = '/bill';
    if (congress) {
      endpoint += `/${congress}`;
      if (billType) {
        endpoint += `/${billType.toLowerCase()}`;
      }
    }

    try {
      const data = await this.fetchFromCongress<any>(endpoint, params);
      const bills = data.bills || data.results || [];
      return bills.map((bill: any) => this.transformBill(bill));
    } catch (error) {
      console.error('Error fetching bills by type:', error);
      return [];
    }
  }

  async getBill(congress: number, billType: string, billNumber: number): Promise<Bill> {
    console.log('getBill called with:', { congress, billType, billNumber });
    const endpoint = `/bill/${congress}/${billType.toLowerCase()}/${billNumber}`;
    console.log('Fetching from endpoint:', endpoint);
    
    const data = await this.fetchFromCongress<any>(endpoint);
    console.log('Bill data received:', data ? 'Yes' : 'No');
    
    if (!data.bill) {
      throw new Error('No bill data in response');
    }
    
    return this.transformBill(data.bill);
  }

  async getBillText(congress: number, billType: string, billNumber: number): Promise<any> {
    return await this.fetchFromCongress<any>(`/bill/${congress}/${billType.toLowerCase()}/${billNumber}/text`);
  }

  async getBillActions(congress: number, billType: string, billNumber: number): Promise<any> {
    return await this.fetchFromCongress<any>(`/bill/${congress}/${billType.toLowerCase()}/${billNumber}/actions`);
  }

  async getBillCosponsors(congress: number, billType: string, billNumber: number): Promise<any> {
    return await this.fetchFromCongress<any>(`/bill/${congress}/${billType.toLowerCase()}/${billNumber}/cosponsors`);
  }

  async getBillCommittees(congress: number, billType: string, billNumber: number): Promise<any> {
    return await this.fetchFromCongress<any>(`/bill/${congress}/${billType.toLowerCase()}/${billNumber}/committees`);
  }

  async getBillAmendments(congress: number, billType: string, billNumber: number): Promise<any> {
    return await this.fetchFromCongress<any>(`/bill/${congress}/${billType.toLowerCase()}/${billNumber}/amendments`);
  }

  async getBillRelatedBills(congress: number, billType: string, billNumber: number): Promise<any> {
    return await this.fetchFromCongress<any>(`/bill/${congress}/${billType.toLowerCase()}/${billNumber}/relatedbills`);
  }

  async getBillSubjects(congress: number, billType: string, billNumber: number): Promise<any> {
    return await this.fetchFromCongress<any>(`/bill/${congress}/${billType.toLowerCase()}/${billNumber}/subjects`);
  }

  async getBillSummaries(congress: number, billType: string, billNumber: number): Promise<any> {
    return await this.fetchFromCongress<any>(`/bill/${congress}/${billType.toLowerCase()}/${billNumber}/summaries`);
  }

  async searchMembers(chamber?: 'house' | 'senate', state?: string, limit: number = 20): Promise<Member[]> {
    // Use the current congress (119th)
    const congress = 119;
    
    // Build endpoint based on filters
    let endpoint = '/member';
    const params: Record<string, string> = {
      limit: Math.min(limit, 250).toString(),
      currentMember: 'true' // Get only current members by default
    };
    
    // If we have specific filters, use the congress endpoint
    if (chamber || state) {
      endpoint = `/member/congress/${congress}`;
      
      // Note: The API doesn't support direct chamber filtering at the list level
      // We'll need to filter the results client-side if chamber is specified
    }
    
    if (state) {
      // For state filtering, we need to use a different endpoint pattern
      // But the API doesn't support state-only filtering without district
      // We'll fetch all members and filter client-side
    }

    try {
      const data = await this.fetchFromCongress<any>(endpoint, params);
      let members = data.members || [];
      
      // Apply client-side filters
      if (chamber) {
        members = members.filter((m: any) => {
          const memberChamber = (m.terms?.[0]?.chamber || '').toLowerCase();
          return memberChamber === chamber;
        });
      }
      
      if (state) {
        const upperState = state.toUpperCase();
        members = members.filter((m: any) => m.state === upperState);
      }
      
      return members.map((member: any) => this.transformMember(member));
    } catch (error) {
      console.error('Error fetching members:', error);
      throw error;
    }
  }

  async getMember(bioguideId: string): Promise<Member> {
    const data = await this.fetchFromCongress<any>(`/member/${bioguideId}`);
    return this.transformMember(data.member);
  }

  async getMemberSponsorship(bioguideId: string): Promise<any> {
    return await this.fetchFromCongress<any>(`/member/${bioguideId}/sponsored-legislation`);
  }

  async getRecentVotes(chamber: 'house' | 'senate', limit: number = 20): Promise<Vote[]> {
    // The vote endpoints are not yet fully available in v3 API
    // For now, we'll return an empty array or throw a more informative error
    console.warn('Vote endpoints are currently in beta and may not be available for all data');
    
    // Try the potential endpoint patterns based on documentation
    try {
      // Try nomination votes endpoint which might exist
      const endpoint = `/nomination`;
      const data = await this.fetchFromCongress<any>(endpoint, {
        limit: Math.min(limit, 250).toString()
      });
      
      // If we get nominations with votes, transform them
      if (data.nominations) {
        const votesFromNominations: Vote[] = [];
        for (const nomination of data.nominations) {
          if (nomination.actions) {
            for (const action of nomination.actions) {
              if (action.recordedVotes) {
                for (const vote of action.recordedVotes) {
                  votesFromNominations.push(this.transformVote({
                    ...vote,
                    chamber: vote.chamber || chamber,
                    congress: nomination.congress || 119
                  }));
                }
              }
            }
          }
        }
        return votesFromNominations;
      }
    } catch (error) {
      console.log('Nomination endpoint not available or no votes found');
    }
    
    // Return empty array for now since vote endpoints are not fully available
    return [];
  }

  async getVoteDetails(congress: number, chamber: 'house' | 'senate', rollCall: number): Promise<any> {
    // Vote detail endpoints are not yet available in v3 API
    throw new Error('Vote detail endpoints are currently not available in the Congress.gov API v3');
  }

  async getCommittees(chamber?: 'house' | 'senate' | 'joint', limit: number = 250): Promise<Committee[]> {
    const congress = 119; // Current congress (119th)
    const endpoint = chamber ? `/committee/${congress}/${chamber}` : `/committee/${congress}`;
    const data = await this.fetchFromCongress<any>(endpoint, {
      limit: limit.toString()
    });

    return data.committees?.map((committee: any) => this.transformCommittee(committee)) || [];
  }

  async getCommitteeDetails(chamber: string, committeeCode: string): Promise<any> {
    const congress = 119;
    return await this.fetchFromCongress<any>(`/committee/${congress}/${chamber}/${committeeCode}`);
  }

  private transformBill(bill: any): Bill {
    try {
      return {
        congress: bill.congress || 119,
        billType: bill.type || bill.billType || bill.bill_type || 'unknown',
        billNumber: bill.number || bill.billNumber || bill.bill_number || 0,
        title: bill.title || bill.short_title || bill.official_title || 'No title available',
        summary: bill.summary?.text || bill.summaries?.[0]?.text || bill.summary,
        sponsor: bill.sponsors?.[0] ? {
          bioguideId: bill.sponsors[0].bioguideId || bill.sponsors[0].bioguide_id,
          fullName: bill.sponsors[0].fullName || bill.sponsors[0].full_name || `${bill.sponsors[0].firstName || ''} ${bill.sponsors[0].lastName || ''}`.trim(),
          party: bill.sponsors[0].party || bill.sponsors[0].party_name || '',
          state: bill.sponsors[0].state || ''
        } : undefined,
        introducedDate: bill.introducedDate || bill.introduced_date || '',
        latestAction: bill.latestAction || bill.latest_action ? {
          actionDate: bill.latestAction?.actionDate || bill.latest_action?.action_date || '',
          text: bill.latestAction?.text || bill.latest_action?.text || ''
        } : undefined,
        url: bill.url || `https://www.congress.gov/bill/${bill.congress || 118}/${bill.type || bill.billType || 'h'}/${bill.number || bill.billNumber || 0}`
      };
    } catch (error) {
      console.error('Error transforming bill:', error, bill);
      return {
        congress: 119,
        billType: 'unknown',
        billNumber: 0,
        title: 'Error processing bill',
        introducedDate: '',
        url: ''
      };
    }
  }

  private transformMember(member: any): Member {
    return {
      bioguideId: member.bioguideId,
      fullName: member.name || member.fullName || `${member.firstName} ${member.lastName}`,
      firstName: member.firstName,
      lastName: member.lastName,
      party: member.partyName || member.party,
      state: member.state,
      district: member.district,
      chamber: (member.terms?.[0]?.chamber || member.chamber || '').toLowerCase() as 'house' | 'senate',
      inOffice: member.inOffice !== false,
      nextElection: member.nextElection
    };
  }

  private transformVote(vote: any): Vote {
    return {
      rollCall: vote.rollCall || vote.number,
      chamber: (vote.chamber || '').toLowerCase() as 'house' | 'senate',
      congress: vote.congress || 119,
      session: vote.session || 1,
      date: vote.date,
      question: vote.question || vote.description || 'No description available',
      result: vote.result,
      totalYes: vote.yesCount || vote.totalYes || 0,
      totalNo: vote.noCount || vote.totalNo || 0,
      totalNotVoting: vote.notVotingCount || vote.totalNotVoting || 0
    };
  }

  private transformCommittee(committee: any): Committee {
    return {
      code: committee.systemCode || committee.code,
      name: committee.name,
      chamber: (committee.chamber || '').toLowerCase() as 'house' | 'senate' | 'joint',
      parentCommittee: committee.parent?.systemCode,
      subcommittees: committee.subcommittees?.map((sub: any) => this.transformCommittee(sub))
    };
  }
}