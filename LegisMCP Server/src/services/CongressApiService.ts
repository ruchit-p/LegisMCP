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
  private apiKey?: string;
  private rateLimiter: RateLimitService;
  private timeout: number;

  constructor(
    baseUrl: string = 'https://api.congress.gov/v3',
    apiKey?: string,
    rateLimiter?: RateLimitService,
    timeout: number = 30000
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
    this.rateLimiter = rateLimiter || new RateLimitService();
    this.timeout = timeout;
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
    
    // Add API key if available
    if (this.apiKey) {
      queryParams.append('api_key', this.apiKey);
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
      console.log(`Making request to: ${url.replace(/api_key=[^&]*/, 'api_key=***')}`);
      
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

    // Map collection names to API endpoints (handle pluralization)
    const collectionToEndpoint: Record<string, string> = {
      'member': '/members',
      'bill': '/bills',
      'committee': '/committees',
      'amendment': '/amendments',
      'nomination': '/nominations',
      'treaty': '/treaties',
      // Add other mappings as needed
    };
    
    const endpoint = collectionToEndpoint[collection] || `/${collection}`;
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