/**
 * MCP Usage Logger
 * Logs MCP tool calls to the Cloudflare Worker for usage tracking
 */

interface MCPLogEntry {
  tool_name: string;
  request_data?: Record<string, unknown>;
  response_data?: Record<string, unknown>;
  status: 'success' | 'error' | 'timeout';
  error_message?: string;
  response_time_ms?: number;
  tokens_used?: number;
}

export class MCPUsageLogger {
  private static instance: MCPUsageLogger | null = null;
  private workerUrl: string;
  private accessToken: string | null = null;

  private constructor() {
    this.workerUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_WORKER_URL || 
                     process.env.CLOUDFLARE_WORKER_URL || 
                     'https://api.example.com';
  }

  /**
   * Get the singleton instance of MCPUsageLogger
   */
  public static getInstance(): MCPUsageLogger {
    if (!MCPUsageLogger.instance) {
      MCPUsageLogger.instance = new MCPUsageLogger();
    }
    return MCPUsageLogger.instance;
  }

  /**
   * Set the access token for authentication
   */
  public setAccessToken(token: string) {
    this.accessToken = token;
  }

  /**
   * Log an MCP tool call to the backend
   */
  public async logToolCall(entry: MCPLogEntry): Promise<void> {
    if (!this.accessToken) {
      console.warn('MCPUsageLogger: No access token set, skipping log');
      return;
    }

    try {
      const response = await fetch(`${this.workerUrl}/api/mcp/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify(entry)
      });

      if (!response.ok) {
        console.error('Failed to log MCP usage:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Error logging MCP usage:', error);
      // Don't throw - logging failures shouldn't break the application
    }
  }

  /**
   * Helper method to log a successful tool call
   */
  public async logSuccess(
    toolName: string, 
    requestData: Record<string, unknown>, 
    responseData: Record<string, unknown>, 
    responseTimeMs: number,
    tokensUsed?: number
  ): Promise<void> {
    await this.logToolCall({
      tool_name: toolName,
      request_data: requestData,
      response_data: responseData,
      status: 'success',
      response_time_ms: responseTimeMs,
      tokens_used: tokensUsed
    });
  }

  /**
   * Helper method to log a failed tool call
   */
  public async logError(
    toolName: string, 
    requestData: Record<string, unknown>, 
    errorMessage: string, 
    responseTimeMs?: number
  ): Promise<void> {
    await this.logToolCall({
      tool_name: toolName,
      request_data: requestData,
      status: 'error',
      error_message: errorMessage,
      response_time_ms: responseTimeMs
    });
  }

  /**
   * Helper method to log a timeout
   */
  public async logTimeout(
    toolName: string, 
    requestData: Record<string, unknown>, 
    responseTimeMs: number
  ): Promise<void> {
    await this.logToolCall({
      tool_name: toolName,
      request_data: requestData,
      status: 'timeout',
      response_time_ms: responseTimeMs
    });
  }
}

// Export singleton instance getter
export const getMCPUsageLogger = () => MCPUsageLogger.getInstance();