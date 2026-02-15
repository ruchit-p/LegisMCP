import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { CongressApiService } from "../../services/CongressApiService.js";
import { ValidationError } from "../../utils/errors.js";

/**
 * Zod schema for subresource parameters
 */
export const subresourceParamsSchema = z.object({
  parentUri: z.string().min(1).describe("Parent resource URI (e.g., 'congress-gov:/bill/118/hr/1')"),
  subresource: z.string().min(1).describe("Subresource name (e.g., 'actions', 'cosponsors', 'committees')"),
  limit: z.number().min(1).max(100).optional().default(20).describe("Maximum number of results to return"),
  offset: z.number().min(0).optional().default(0).describe("Number of results to skip"),
  format: z.enum(["detailed", "summary", "raw"]).optional().default("detailed").describe("Output format: 'raw' returns API response unchanged, 'detailed' and 'summary' return items with count")
});

export type SubresourceParams = z.infer<typeof subresourceParamsSchema>;

/**
 * Subresource tool — fetches sub-resource data and returns raw items
 */
export class SubresourceTool {
  constructor(private congressApi: CongressApiService) {}

  /**
   * Get subresource data
   */
  async getSubresource(params: SubresourceParams): Promise<any> {
    try {
      console.error('Fetching subresource', {
        parentUri: params.parentUri,
        subresource: params.subresource
      });

      // Validate parent URI
      const cleanUri = params.parentUri.replace(/^congress-gov:\/\/?/, '');
      if (!cleanUri || cleanUri.split('/').length < 1) {
        throw new ValidationError(`Invalid parent URI format: ${params.parentUri}`);
      }

      // Fetch subresource data using CongressApiService
      const subresourceData = await this.congressApi.getSubResource(
        params.parentUri,
        params.subresource,
        { limit: params.limit, offset: params.offset }
      );

      // Parse parent URI for context
      const parentInfo = this.parseParentUri(params.parentUri);

      // Format the data
      const format = params.format || 'detailed';
      let data;
      if (format === 'raw') {
        data = subresourceData;
      } else {
        const items = this.extractItems(subresourceData, params.subresource);
        data = { count: items.length, items };
      }

      return {
        parentResource: parentInfo,
        subresource: params.subresource,
        data,
        metadata: {
          fetchedAt: new Date().toISOString(),
          format,
          pagination: {
            limit: params.limit,
            offset: params.offset
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
      const cleanUri = uri.replace(/^congress-gov:\/\/?/, '');
      const parts = cleanUri.split('/');

      if (parts.length < 1) return null;

      const collection = parts[0];
      const resourceInfo: any = {
        collection,
        path: `/${cleanUri}`,
        identifiers: {}
      };

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

  private extractItems(data: any, subresource: string): any[] {
    if (!data) return [];

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

    if (Array.isArray(data[propertyName])) {
      return data[propertyName];
    }

    if (data[propertyName] && Array.isArray(data[propertyName][propertyName])) {
      return data[propertyName][propertyName];
    }

    if (Array.isArray(data)) {
      return data;
    }

    if (subresource === 'subjects' && data.subjects) {
      return [data.subjects];
    }

    return [];
  }
}

/**
 * Handle subresource tool execution
 */
export async function handleSubresource(
  params: SubresourceParams,
  congressApi: CongressApiService
): Promise<CallToolResult> {
  try {
    const tool = new SubresourceTool(congressApi);
    const result = await tool.getSubresource(params);

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    console.error('Error in handleSubresource:', error);

    return {
      content: [{
        type: "text" as const,
        text: `Failed to get subresource: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

// Export constants for tool registration
export const TOOL_NAME = "subresource";
export const TOOL_DESCRIPTION = `Get detailed subresource data for a legislative resource.

Supports all legislative subresources including:
- Bill subresources: actions, cosponsors, committees, subjects, text, amendments, summaries
- Member subresources: sponsored-legislation, cosponsored-legislation, committees
- Committee subresources: bills, reports, members

Output formats:
- detailed: Items array with count (default)
- summary: Items array with count
- raw: Unprocessed API response

Examples:
- Get bill actions: parentUri = "congress-gov:/bill/118/hr/1", subresource = "actions"
- Get member committees: parentUri = "congress-gov:/member/P000197", subresource = "committees"
- Raw format: parentUri = "congress-gov:/bill/118/hr/1", subresource = "cosponsors", format = "raw"
- With pagination: parentUri = "congress-gov:/bill/118/hr/1", subresource = "actions", limit = 50, offset = 0`;

export const TOOL_PARAMS = {
  parentUri: z.string().min(1).describe("Parent resource URI (e.g., 'congress-gov:/bill/118/hr/1')"),
  subresource: z.string().min(1).describe("Subresource name (e.g., 'actions', 'cosponsors', 'committees')"),
  limit: z.number().min(1).max(100).optional().default(20).describe("Maximum number of results to return"),
  offset: z.number().min(0).optional().default(0).describe("Number of results to skip"),
  format: z.enum(["detailed", "summary", "raw"]).optional().default("detailed").describe("Output format: 'raw' returns API response unchanged, 'detailed' and 'summary' return items with count")
};
