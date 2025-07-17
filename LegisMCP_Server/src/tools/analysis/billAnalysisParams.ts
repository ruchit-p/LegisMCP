import { z } from 'zod';

export const TOOL_NAME = "analyze-bill";

export const TOOL_DESCRIPTION = `Performs comprehensive analysis of a congressional bill including:
- Basic information and current status
- Sponsor and cosponsor analysis with bipartisan support assessment
- Committee activity and timeline analysis
- Passage likelihood prediction based on multiple factors
- Related bills and amendments
- Subject and policy area classification
- Controversy level and media attention assessment

IMPORTANT: You must provide a specific bill identifier (e.g., "HR 1", "S 2345", "118 HR 5").
Text search is NOT supported due to Congress.gov API limitations.`;

// Define the parameters schema
export const TOOL_PARAMS = {
  query: z.string().min(1).describe(
    "REQUIRED: Bill identifier (e.g., 'HR 1', 'S 2345', 'H.R. 5', 'SJRES 10'). " +
    "Supports various formats: 'HR1', 'H.R. 1', 'hr 1', 'S.2345', 'S 2345', '119 HR 1', etc. " +
    "NOTE: Text search (e.g., 'climate change') is NOT supported by Congress.gov API."
  ),
  congress: z.number().int().min(100).max(150).optional().describe(
    "OPTIONAL: Congress number (e.g., 119 for 119th Congress). " +
    "If omitted, defaults to current congress (119). Required if not included in query."
  ),
  includeText: z.boolean().default(false).describe(
    "OPTIONAL: Include links to full bill text (may be large). Default: false. " +
    "Set to true if you need to analyze the actual legislative language."
  ),
  includeVotes: z.boolean().default(true).describe(
    "OPTIONAL: Include voting analysis if available. Default: true. " +
    "Provides insights into voting patterns and bipartisan support."
  ),
  includeRelated: z.boolean().default(true).describe(
    "OPTIONAL: Include related bills and amendments analysis. Default: true. " +
    "Helps understand the bill's context within broader legislative efforts."
  )
};

// Export the type for the parameters
export type BillAnalysisParams = z.infer<z.ZodObject<typeof TOOL_PARAMS>>;