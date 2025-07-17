import { Context, Next } from 'hono';
import { HTTPException } from '../utils/http-exception';
import { BillingCycleService } from '../services/billing-cycle';

export interface UsageTrackingConfig {
  skipTrackingForPaths?: string[];
  skipTrackingForMethods?: string[];
}

/**
 * Middleware to track API usage and enforce limits based on subscription plans
 */
export const usageTracker = (config: UsageTrackingConfig = {}) => {
  return async (c: Context, next: Next) => {
    const { skipTrackingForPaths = [], skipTrackingForMethods = [] } = config;
    
    // Skip tracking for certain paths/methods
    const path = c.req.path;
    const method = c.req.method;
    
    if (skipTrackingForPaths.some(p => path.includes(p)) || 
        skipTrackingForMethods.includes(method)) {
      await next();
      return;
    }

    // Get user from context (set by JWT middleware)
    const user = c.get('user');
    if (!user || !user.id) {
      await next();
      return;
    }

    const db = c.env.DB;
    const billingCycleService = new BillingCycleService(db);

    // Check and reset usage if billing cycle has rolled over
    const billingInfo = await billingCycleService.checkAndResetUsage(user.id);
    
    if (billingInfo && billingInfo.shouldResetUsage) {
      console.log(`Usage reset for user ${user.id} - ${billingInfo.planSlug}`);
    }

    // Get current usage status
    const usageStatus = await billingCycleService.getUserUsageStatus(user.id);
    
    if (!usageStatus) {
      throw new HTTPException(500, { message: 'Unable to retrieve usage information' });
    }

    // Check if user has usage remaining
    if (!usageStatus.hasUsageLeft) {
      throw new HTTPException(429, { 
        message: 'API usage limit exceeded for current billing cycle',
        res: new Response(JSON.stringify({
          error: 'Usage limit exceeded',
          message: `You have used ${usageStatus.currentUsage} of ${usageStatus.limit} API calls for this billing cycle.`,
          currentUsage: usageStatus.currentUsage,
          limit: usageStatus.limit,
          percentUsed: usageStatus.percentUsed,
          billingCycleEnd: usageStatus.billingCycleEnd,
          daysUntilReset: usageStatus.daysUntilReset,
          planSlug: usageStatus.planSlug,
          upgradeUrl: '/billing'
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-Usage-Limit': usageStatus.limit.toString(),
            'X-Usage-Current': usageStatus.currentUsage.toString(),
            'X-Usage-Remaining': Math.max(0, usageStatus.limit - usageStatus.currentUsage).toString(),
            'X-Billing-Cycle-End': usageStatus.billingCycleEnd?.toISOString() || '',
            'X-Plan-Slug': usageStatus.planSlug
          }
        })
      });
    }

    // Track the API call
    const startTime = Date.now();
    
    try {
      await next();
    } catch (error) {
      // Still track the call even if it fails
      const endTime = Date.now();
      await trackApiCall(db, user.id, path, method, 500, endTime - startTime);
      throw error;
    }

    // Track successful call
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const statusCode = c.res.status;
    
    await trackApiCall(db, user.id, path, method, statusCode, responseTime);

    // Add usage headers to response
    c.header('X-Usage-Limit', usageStatus.limit.toString());
    c.header('X-Usage-Current', (usageStatus.currentUsage + 1).toString());
    c.header('X-Usage-Remaining', Math.max(0, usageStatus.limit - usageStatus.currentUsage - 1).toString());
    c.header('X-Billing-Cycle-End', usageStatus.billingCycleEnd?.toISOString() || '');
    c.header('X-Plan-Slug', usageStatus.planSlug);
  };
};

/**
 * Track API call in database
 */
async function trackApiCall(
  db: any,
  userId: number,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTime: number
): Promise<void> {
  try {
    // Increment user's API call count
    await db.prepare(`
      UPDATE users 
      SET 
        api_calls_count = api_calls_count + 1,
        mcp_calls_count = mcp_calls_count + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(userId).run();

    // Log the API call
    await db.prepare(`
      INSERT INTO api_usage (
        user_id,
        endpoint,
        method,
        status_code,
        response_time_ms,
        timestamp
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(userId, endpoint, method, statusCode, responseTime).run();

  } catch (error) {
    console.error('Failed to track API call:', error);
  }
}

/**
 * Middleware specifically for MCP tools usage tracking
 */
export const mcpUsageTracker = () => {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    if (!user || !user.id) {
      await next();
      return;
    }

    const db = c.env.DB;
    const billingCycleService = new BillingCycleService(db);

    // Check and reset usage if needed
    await billingCycleService.checkAndResetUsage(user.id);

    // Get current usage status
    const usageStatus = await billingCycleService.getUserUsageStatus(user.id);
    
    if (!usageStatus || !usageStatus.hasUsageLeft) {
      throw new HTTPException(429, { 
        message: 'MCP usage limit exceeded for current billing cycle'
      });
    }

    await next();

    // Track MCP tool usage
    const toolName = c.get('toolName') || 'unknown';
    try {
      await db.prepare(`
        INSERT INTO mcp_logs (
          user_id,
          tool_name,
          status,
          response_time_ms,
          timestamp
        ) VALUES (?, ?, 'success', ?, CURRENT_TIMESTAMP)
      `).bind(user.id, toolName, 0).run();

      // Update MCP call count
      await db.prepare(`
        UPDATE users 
        SET 
          mcp_calls_count = mcp_calls_count + 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(user.id).run();

    } catch (error) {
      console.error('Failed to track MCP usage:', error);
    }
  };
};