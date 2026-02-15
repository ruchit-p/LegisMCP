import { RateLimitService } from './RateLimitService.js';
import { 
  ApiError, 
  NotFoundError, 
  RateLimitError, 
  ValidationError,
  InvalidParameterError 
} from '../utils/errors.js';

// Types for API parameters
export interface BillResourceParams {
  congress: string;
  billType: string;
  billNumber: string;
}

export interface MemberResourceParams {
  memberId: string;
  congress?: string;
}

export interface CongressResourceParams {
  congress: string;
}

export interface CommitteeResourceParams {
  chamber: string;
  committeeCode: string;
  congress?: string;
}

export interface AmendmentResourceParams {
  congress: string;
  amendmentType: string;
  amendmentNumber: string;
}

export interface HouseVoteParams {
  congress: number;
  session?: number;  // 1 or 2
  limit?: number;
  offset?: number;
}

export interface HouseVoteDetailParams {
  congress: number;
  session: number;
  rollCallNumber: number;
}

export interface SearchParams {
  query?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  filters?: Record<string, string>;
}

export interface ApiResponse<T> {
  data: T;
  pagination?: {
    count: number;
    next?: string;
    previous?: string;
  };
}

// Configuration for supported query parameters per collection
const SUPPORTED_QUERY_PARAMS: Record<string, string[]> = {
  'bill': ['fromDateTime', 'toDateTime', 'sort', 'congress'],
  'amendment': ['fromDateTime', 'toDateTime', 'sort', 'congress'],
  'member': ['fromDateTime', 'toDateTime', 'currentMember', 'congress'],
  'committee': ['fromDateTime', 'toDateTime', 'chamber', 'congress'],
  'house-communication': ['fromDateTime', 'toDateTime', 'congress'],
  'senate-communication': ['fromDateTime', 'toDateTime', 'congress'],
  'nomination': ['fromDateTime', 'toDateTime', 'congress'],
  'treaty': ['fromDateTime', 'toDateTime', 'congress'],
  'house-requirement': ['fromDateTime', 'toDateTime', 'congress'],
  'senate-requirement': ['fromDateTime', 'toDateTime', 'congress']
};

// Collections that support filtering
const FILTER_SUPPORTED_COLLECTIONS = [
  'bill', 'amendment', 'member', 'committee', 'nomination', 'treaty'
];

// Collections that support sorting
const SORT_SUPPORTED_COLLECTIONS = [
  'bill', 'amendment', 'member', 'committee'
];

// Collections that support query search
const QUERY_SUPPORTED_COLLECTIONS = [
  'bill', 'amendment', 'member', 'committee', 'nomination'
];

/**
 * Comprehensive Congress.gov API Service for CloudFlare Workers
 * Provides a unified interface for accessing legislative data
 */
export class CongressApiService {
  private baseUrl: string;
  private apiKeys: string[];
  private keyIndex: number = 0;
  private keyCooldowns: Map<number, number> = new Map(); // index -> cooldown expiry timestamp
  private static readonly COOLDOWN_MS = 60_000; // 60s cooldown on 429
  private rateLimiter: RateLimitService;
  private timeout: number;

  constructor(
    baseUrl: string = 'https://api.congress.gov/v3',
    apiKey?: string,
    rateLimiter?: RateLimitService,
    timeout: number = 30000
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    // Support comma-separated keys for rotation
    this.apiKeys = apiKey
      ? apiKey.split(',').map(k => k.trim()).filter(Boolean)
      : [];
    this.rateLimiter = rateLimiter || new RateLimitService();
    this.timeout = timeout;
  }

  /**
   * Get the next available API key via round-robin, skipping cooled-down keys
   */
  private getNextKey(): string | undefined {
    if (this.apiKeys.length === 0) return undefined;

    const now = Date.now();
    const totalKeys = this.apiKeys.length;

    // Try each key starting from current index
    for (let i = 0; i < totalKeys; i++) {
      const idx = (this.keyIndex + i) % totalKeys;
      const cooldownExpiry = this.keyCooldowns.get(idx);

      if (!cooldownExpiry || now >= cooldownExpiry) {
        this.keyCooldowns.delete(idx);
        this.keyIndex = (idx + 1) % totalKeys;
        return this.apiKeys[idx];
      }
    }

    // All keys on cooldown — use the one that expires soonest
    let soonestIdx = 0;
    let soonestTime = Infinity;
    for (const [idx, expiry] of this.keyCooldowns) {
      if (expiry < soonestTime) {
        soonestTime = expiry;
        soonestIdx = idx;
      }
    }
    this.keyIndex = (soonestIdx + 1) % totalKeys;
    return this.apiKeys[soonestIdx];
  }

  /**
   * Mark the most recently used key as rate-limited
   */
  private cooldownCurrentKey(): void {
    if (this.apiKeys.length === 0) return;
    const usedIdx = (this.keyIndex - 1 + this.apiKeys.length) % this.apiKeys.length;
    this.keyCooldowns.set(usedIdx, Date.now() + CongressApiService.COOLDOWN_MS);
  }

  /**
   * Make authenticated API request with rate limiting
   */
  private async makeRequest<T>(
    endpoint: string,
    params: Record<string, any> = {}
  ): Promise<ApiResponse<T>> {
    // Check rate limit before making request
    if (!this.rateLimiter.canMakeRequest()) {
      const resetTime = this.rateLimiter.getResetTime();
      throw new RateLimitError(
        `Rate limit exceeded. Resets at ${resetTime?.toISOString()}`
      );
    }

    // Build query parameters
    const queryParams = new URLSearchParams();

    // Pick next API key via round-robin rotation
    const currentKey = this.getNextKey();
    if (currentKey) {
      queryParams.append('api_key', currentKey);
    }
    
    // Add format parameter
    queryParams.append('format', 'json');
    
    // Add other parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const url = `${this.baseUrl}${endpoint}?${queryParams.toString()}`;
    
    try {
      console.error(`Making request to: ${url.replace(/api_key=[^&]*/, 'api_key=***')}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LegislativeMCP/1.0'
        },
        // CloudFlare Workers doesn't support timeout in fetch options
        // We rely on the Workers runtime timeout
      });

      // Record successful request for rate limiting
      this.rateLimiter.recordRequest();

      // Handle HTTP errors
      if (!response.ok) {
        const errorText = await response.text();
        
        if (response.status === 429) {
          this.cooldownCurrentKey();
          throw new RateLimitError('API rate limit exceeded');
        }
        
        if (response.status === 404) {
          throw new NotFoundError(`Resource not found: ${endpoint}`);
        }
        
        if (response.status === 400) {
          throw new ValidationError(`Invalid request: ${errorText}`);
        }
        
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorText
        );
      }

      const data = await response.json() as any;
      
      // Handle API-level errors (some APIs return 200 with error messages)
      if (data.error) {
        if (data.error.toLowerCase().includes('not found')) {
          throw new NotFoundError(data.error);
        }
        throw new ApiError(data.error, response.status);
      }

      return {
        data: data as T,
        pagination: data.pagination
      };

    } catch (error) {
      console.error('API request failed:', {
        url: url.replace(/api_key=[^&]*/, 'api_key=***'),
        error: error instanceof Error ? error.message : String(error)
      });

      // Re-throw known errors
      if (error instanceof ApiError || 
          error instanceof NotFoundError || 
          error instanceof RateLimitError || 
          error instanceof ValidationError) {
        throw error;
      }

      // Handle fetch errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ApiError('Network error occurred', 0, error.message);
      }

      // Generic error fallback
      throw new ApiError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        0,
        error
      );
    }
  }

  /**
   * Get specific bill details
   */
  async getBillDetails(params: BillResourceParams): Promise<any> {
    const { congress, billType, billNumber } = params;
    const endpoint = `/bill/${congress}/${billType}/${billNumber}`;
    const response = await this.makeRequest(endpoint);
    return response.data;
  }

  /**
   * Get specific member details
   */
  async getMemberDetails(params: MemberResourceParams): Promise<any> {
    const { memberId, congress } = params;
    const endpoint = congress ? 
      `/member/${memberId}/${congress}` : 
      `/member/${memberId}`;
    const response = await this.makeRequest(endpoint);
    return response.data;
  }

  /**
   * Get congress details
   */
  async getCongressDetails(params: CongressResourceParams): Promise<any> {
    const { congress } = params;
    const endpoint = `/congress/${congress}`;
    const response = await this.makeRequest(endpoint);
    return response.data;
  }

  /**
   * Get committee details
   */
  async getCommitteeDetails(params: CommitteeResourceParams): Promise<any> {
    const { chamber, committeeCode, congress } = params;
    const endpoint = congress ? 
      `/committee/${chamber}/${committeeCode}/${congress}` :
      `/committee/${chamber}/${committeeCode}`;
    const response = await this.makeRequest(endpoint);
    return response.data;
  }

  /**
   * Get amendment details
   */
  async getAmendmentDetails(params: AmendmentResourceParams): Promise<any> {
    const { congress, amendmentType, amendmentNumber } = params;
    const endpoint = `/amendment/${congress}/${amendmentType}/${amendmentNumber}`;
    const response = await this.makeRequest(endpoint);
    return response.data;
  }

  /**
   * List House roll call votes for a congress/session (beta, 118th Congress+)
   */
  async getHouseVotes(params: HouseVoteParams): Promise<any> {
    let endpoint = `/house-vote/${params.congress}`;
    if (params.session) {
      endpoint += `/${params.session}`;
    }
    const requestParams: Record<string, any> = {};
    if (params.limit) requestParams.limit = params.limit;
    if (params.offset) requestParams.offset = params.offset;
    const response = await this.makeRequest(endpoint, requestParams);
    return response.data;
  }

  /**
   * Get details of a specific House roll call vote
   */
  async getHouseVoteDetail(params: HouseVoteDetailParams): Promise<any> {
    const endpoint = `/house-vote/${params.congress}/${params.session}/${params.rollCallNumber}`;
    const response = await this.makeRequest(endpoint);
    return response.data;
  }

  /**
   * Search across collections with comprehensive parameter support
   */
  async searchCollection(
    collection: string,
    params: SearchParams = {}
  ): Promise<any> {
    const { query, limit = 20, offset = 0, sort, filters = {} } = params;

    // Validate collection
    if (!SUPPORTED_QUERY_PARAMS[collection]) {
      throw new InvalidParameterError(
        `Collection '${collection}' is not supported. Supported collections: ${Object.keys(SUPPORTED_QUERY_PARAMS).join(', ')}`
      );
    }

    // Build request parameters
    const requestParams: Record<string, any> = {
      limit,
      offset
    };

    // Add query if supported
    if (query && QUERY_SUPPORTED_COLLECTIONS.includes(collection)) {
      requestParams.query = query;
    } else if (query) {
      console.warn(`Query search not supported for collection: ${collection}`);
    }

    // Add sort if supported
    if (sort && SORT_SUPPORTED_COLLECTIONS.includes(collection)) {
      requestParams.sort = sort;
    } else if (sort) {
      console.warn(`Sorting not supported for collection: ${collection}`);
    }

    // Add filters if supported
    if (FILTER_SUPPORTED_COLLECTIONS.includes(collection)) {
      const supportedParams = SUPPORTED_QUERY_PARAMS[collection];
      Object.entries(filters).forEach(([key, value]) => {
        if (supportedParams.includes(key)) {
          requestParams[key] = value;
        } else {
          console.warn(`Filter parameter '${key}' not supported for collection: ${collection}`);
        }
      });
    }

    // Congress.gov API uses path segments for congress and billType filtering, not query params
    let endpoint = `/${collection}`;
    if (filters.congress) {
      endpoint += `/${filters.congress}`;
      delete requestParams.congress;
    }
    if (collection === 'bill' && filters.billType) {
      // billType requires congress in the path: /bill/{congress}/{type}
      endpoint += `/${filters.billType}`;
      delete requestParams.billType;
    }
    const response = await this.makeRequest(endpoint, requestParams);
    return response.data;
  }

  /**
   * Get sub-resource data (e.g., bill actions, cosponsors, etc.)
   */
  async getSubResource(
    parentUri: string,
    subResource: string,
    params: { limit?: number; offset?: number } = {}
  ): Promise<any> {
    // Parse the parent URI to extract collection and identifiers
    const parsedUri = this.parseCongressUri(parentUri);
    if (!parsedUri) {
      throw new InvalidParameterError(`Invalid parent URI format: ${parentUri}`);
    }

    // Build the sub-resource endpoint
    const endpoint = `${parsedUri.path}/${subResource}`;
    
    const requestParams = {
      limit: params.limit || 20,
      offset: params.offset || 0
    };

    const response = await this.makeRequest(endpoint, requestParams);
    return response.data;
  }

  /**
   * Parse congress-gov:// URI format
   */
  private parseCongressUri(uri: string): { collection: string; path: string } | null {
    try {
      // Handle both congress-gov:// and congress-gov:/ formats
      const cleanUri = uri.replace(/^congress-gov:\/\/?/, '');
      const parts = cleanUri.split('/');
      
      if (parts.length < 1) {
        return null;
      }

      const collection = parts[0];
      const path = `/${cleanUri}`;

      return { collection, path };
    } catch (error) {
      console.error('Error parsing congress URI:', error);
      return null;
    }
  }

  /**
   * Get supported collections
   */
  getSupportedCollections(): string[] {
    return Object.keys(SUPPORTED_QUERY_PARAMS);
  }

  /**
   * Get supported parameters for a collection
   */
  getSupportedParameters(collection: string): string[] {
    return SUPPORTED_QUERY_PARAMS[collection] || [];
  }

  /**
   * Check if collection supports query search
   */
  supportsQuerySearch(collection: string): boolean {
    return QUERY_SUPPORTED_COLLECTIONS.includes(collection);
  }

  /**
   * Check if collection supports sorting
   */
  supportsSorting(collection: string): boolean {
    return SORT_SUPPORTED_COLLECTIONS.includes(collection);
  }

  /**
   * Check if collection supports filtering
   */
  supportsFiltering(collection: string): boolean {
    return FILTER_SUPPORTED_COLLECTIONS.includes(collection);
  }

  // MARK: - Committee Methods

  /**
   * List committees with optional chamber and congress filtering
   * @param params.chamber - Optional chamber filter (house, senate, joint)
   * @param params.congress - Optional congress number
   * @param params.limit - Max results (default 20)
   * @param params.offset - Pagination offset (default 0)
   */
  async getCommitteeList(params: {
    chamber?: string;
    congress?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<any> {
    let endpoint = '/committee';
    if (params.chamber) {
      endpoint += `/${params.chamber}`;
    }
    const requestParams: Record<string, any> = {
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
    };
    if (params.congress) requestParams.congress = params.congress;
    const response = await this.makeRequest(endpoint, requestParams);
    return response.data;
  }

  /**
   * Get detailed information for a specific committee
   * @param params.chamber - Committee chamber (house, senate, joint)
   * @param params.committeeCode - Committee system code (e.g., "hspw00")
   */
  async getCommitteeDetail(params: {
    chamber: string;
    committeeCode: string;
  }): Promise<any> {
    const endpoint = `/committee/${params.chamber}/${params.committeeCode}`;
    const response = await this.makeRequest(endpoint);
    return response.data;
  }

  // MARK: - Nomination Methods

  /**
   * List presidential nominations for a congress
   * @param params.congress - Congress number
   * @param params.limit - Max results (default 20)
   * @param params.offset - Pagination offset (default 0)
   */
  async getNominations(params: {
    congress: number;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    const endpoint = `/nomination/${params.congress}`;
    const requestParams: Record<string, any> = {
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
    };
    const response = await this.makeRequest(endpoint, requestParams);
    return response.data;
  }

  /**
   * Get detailed information for a specific nomination
   * @param params.congress - Congress number
   * @param params.nominationNumber - Nomination number
   */
  async getNominationDetail(params: {
    congress: number;
    nominationNumber: number;
  }): Promise<any> {
    const endpoint = `/nomination/${params.congress}/${params.nominationNumber}`;
    const response = await this.makeRequest(endpoint);
    return response.data;
  }

  // MARK: - Hearing Methods

  /**
   * List congressional hearings with optional chamber filtering
   * @param params.congress - Congress number
   * @param params.chamber - Optional chamber filter (house, senate)
   * @param params.limit - Max results (default 20)
   * @param params.offset - Pagination offset (default 0)
   */
  async getHearings(params: {
    congress: number;
    chamber?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    let endpoint = `/hearing/${params.congress}`;
    if (params.chamber) {
      endpoint += `/${params.chamber}`;
    }
    const requestParams: Record<string, any> = {
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
    };
    const response = await this.makeRequest(endpoint, requestParams);
    return response.data;
  }

  /**
   * Get detailed information for a specific hearing
   * @param params.congress - Congress number
   * @param params.chamber - Chamber (house, senate)
   * @param params.jacketNumber - Hearing jacket number
   */
  async getHearingDetail(params: {
    congress: number;
    chamber: string;
    jacketNumber: number;
  }): Promise<any> {
    const endpoint = `/hearing/${params.congress}/${params.chamber}/${params.jacketNumber}`;
    const response = await this.makeRequest(endpoint);
    return response.data;
  }

  // MARK: - Summaries Methods

  /**
   * Get recently published CRS bill summaries
   * @param params.congress - Optional congress number filter
   * @param params.billType - Optional bill type filter (hr, s, hjres, etc.)
   * @param params.fromDateTime - Start of date range (ISO 8601)
   * @param params.toDateTime - End of date range (ISO 8601)
   * @param params.limit - Max results (default 20)
   * @param params.offset - Pagination offset (default 0)
   */
  async getSummaries(params: {
    congress?: number;
    billType?: string;
    fromDateTime?: string;
    toDateTime?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<any> {
    let endpoint = '/summaries';
    if (params.congress) {
      endpoint += `/${params.congress}`;
      if (params.billType) {
        endpoint += `/${params.billType}`;
      }
    }
    const requestParams: Record<string, any> = {
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
    };
    if (params.fromDateTime) requestParams.fromDateTime = params.fromDateTime;
    if (params.toDateTime) requestParams.toDateTime = params.toDateTime;
    const response = await this.makeRequest(endpoint, requestParams);
    return response.data;
  }

  // MARK: - Congressional Record Methods

  /**
   * List daily Congressional Record issues
   * @param params.limit - Max results (default 20)
   * @param params.offset - Pagination offset (default 0)
   */
  async getDailyCongressionalRecord(params: {
    limit?: number;
    offset?: number;
  } = {}): Promise<any> {
    const endpoint = '/daily-congressional-record';
    const requestParams: Record<string, any> = {
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
    };
    const response = await this.makeRequest(endpoint, requestParams);
    return response.data;
  }

  /**
   * Get a specific Congressional Record issue with sections
   * @param params.volumeNumber - Volume number
   * @param params.issueNumber - Issue number
   */
  async getCongressionalRecordIssue(params: {
    volumeNumber: number;
    issueNumber: number;
  }): Promise<any> {
    const endpoint = `/daily-congressional-record/${params.volumeNumber}/${params.issueNumber}`;
    const response = await this.makeRequest(endpoint);
    return response.data;
  }

  /**
   * Get articles for a specific Congressional Record issue
   * @param params.volumeNumber - Volume number
   * @param params.issueNumber - Issue number
   */
  async getCongressionalRecordArticles(params: {
    volumeNumber: number;
    issueNumber: number;
  }): Promise<any> {
    const endpoint = `/daily-congressional-record/${params.volumeNumber}/${params.issueNumber}/articles`;
    const response = await this.makeRequest(endpoint);
    return response.data;
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): { canMakeRequest: boolean; resetTime?: Date } {
    return {
      canMakeRequest: this.rateLimiter.canMakeRequest(),
      resetTime: this.rateLimiter.getResetTime() || undefined
    };
  }
}

// Export default instance creator
export function createCongressApiService(
  baseUrl?: string,
  apiKey?: string,
  rateLimiter?: RateLimitService,
  timeout?: number
): CongressApiService {
  return new CongressApiService(baseUrl, apiKey, rateLimiter, timeout);
}