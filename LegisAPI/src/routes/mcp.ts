import { Hono } from 'hono';
import { jwt } from '../middlewares/jwt';
import { analytics } from '../middlewares/analytics';
import { HTTPException } from '../utils/http-exception';
import type { Env } from '../types';

export const mcpRoutes = new Hono<{ Bindings: Env }>();

// Apply JWT and analytics middleware to all MCP routes
mcpRoutes.use('/*', jwt());
mcpRoutes.use('/*', analytics());

// Get MCP usage logs for the authenticated user
mcpRoutes.get('/logs', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'User not found' });
    }

    const days = parseInt(c.req.query('days') || '30');
    const limit = parseInt(c.req.query('limit') || '100');
    const offset = parseInt(c.req.query('offset') || '0');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Query MCP logs from the database
    const query = `
      SELECT 
        id,
        tool_name,
        status,
        response_time_ms,
        error_message,
        timestamp,
        tokens_used
      FROM mcp_logs
      WHERE user_id = ?
        AND timestamp >= ?
        AND timestamp <= ?
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `;

    const { results: logs } = await c.env.DB.prepare(query)
      .bind(user.id, startDate.toISOString(), endDate.toISOString(), limit, offset)
      .all();

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM mcp_logs
      WHERE user_id = ?
        AND timestamp >= ?
        AND timestamp <= ?
    `;

    const countResult = await c.env.DB.prepare(countQuery)
      .bind(user.id, startDate.toISOString(), endDate.toISOString())
      .first();

    const total = countResult?.total || 0;

    // Get usage summary statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_calls,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_calls,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_calls,
        AVG(response_time_ms) as avg_response_time,
        SUM(tokens_used) as total_tokens,
        MIN(timestamp) as first_call,
        MAX(timestamp) as last_call
      FROM mcp_logs
      WHERE user_id = ?
        AND timestamp >= ?
        AND timestamp <= ?
    `;

    const stats = await c.env.DB.prepare(statsQuery)
      .bind(user.id, startDate.toISOString(), endDate.toISOString())
      .first();

    // Get most used tools
    const toolsQuery = `
      SELECT 
        tool_name,
        COUNT(*) as usage_count,
        AVG(response_time_ms) as avg_response_time,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count
      FROM mcp_logs
      WHERE user_id = ?
        AND timestamp >= ?
        AND timestamp <= ?
      GROUP BY tool_name
      ORDER BY usage_count DESC
      LIMIT 10
    `;

    const { results: topTools } = await c.env.DB.prepare(toolsQuery)
      .bind(user.id, startDate.toISOString(), endDate.toISOString())
      .all();

    return c.json({
      logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      stats: {
        totalCalls: stats?.total_calls || 0,
        successfulCalls: stats?.successful_calls || 0,
        failedCalls: stats?.failed_calls || 0,
        avgResponseTime: stats?.avg_response_time || 0,
        totalTokens: stats?.total_tokens || 0,
        firstCall: stats?.first_call,
        lastCall: stats?.last_call,
        successRate: stats?.total_calls > 0 
          ? ((stats?.successful_calls || 0) / stats.total_calls * 100).toFixed(2) + '%'
          : '0%'
      },
      topTools,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days
      }
    });
  } catch (error) {
    console.error('Error fetching MCP logs:', error);
    throw new HTTPException(500, { 
      message: 'Failed to fetch MCP logs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Record a new MCP tool call
mcpRoutes.post('/logs', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'User not found' });
    }

    const body = await c.req.json();
    const {
      tool_name,
      request_data,
      response_data,
      status,
      error_message,
      response_time_ms,
      tokens_used
    } = body;

    // Validate required fields
    if (!tool_name || !status) {
      throw new HTTPException(400, { 
        message: 'Missing required fields: tool_name and status are required' 
      });
    }

    // Validate status
    if (!['success', 'error', 'timeout'].includes(status)) {
      throw new HTTPException(400, { 
        message: 'Invalid status. Must be one of: success, error, timeout' 
      });
    }

    // Insert the log entry
    const result = await c.env.DB.prepare(`
      INSERT INTO mcp_logs (
        user_id,
        tool_name,
        request_data,
        response_data,
        status,
        error_message,
        response_time_ms,
        tokens_used
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id, timestamp
    `)
      .bind(
        user.id,
        tool_name,
        request_data ? JSON.stringify(request_data) : null,
        response_data ? JSON.stringify(response_data) : null,
        status,
        error_message || null,
        response_time_ms || null,
        tokens_used || null
      )
      .first();

    if (!result) {
      throw new HTTPException(500, { message: 'Failed to create log entry' });
    }

    // Increment user's MCP call count for successful calls only
    if (status === 'success') {
      try {
        await c.env.DB.prepare(`
          UPDATE users 
          SET 
            mcp_calls_count = mcp_calls_count + 1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(user.id).run();
      } catch (updateError) {
        console.error('Failed to update user MCP call count:', updateError);
        // Don't fail the request if count update fails
      }
    }

    // Also track in Analytics Engine if available
    if (c.env.ANALYTICS) {
      c.env.ANALYTICS.writeDataPoint({
        blobs: [tool_name, status, user.plan || 'free'],
        doubles: [response_time_ms || 0, tokens_used || 0],
        indexes: [user.auth0_user_id]
      });
    }

    return c.json({
      success: true,
      log: {
        id: result.id,
        timestamp: result.timestamp
      }
    }, 201);
  } catch (error) {
    console.error('Error recording MCP log:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { 
      message: 'Failed to record MCP log',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get MCP usage summary for the user's dashboard
mcpRoutes.get('/usage-summary', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'User not found' });
    }

    // Get user's current plan details from the view
    const userDetails = await c.env.DB.prepare(`
      SELECT * FROM user_subscription_details WHERE id = ?
    `).bind(user.id).first();

    if (!userDetails) {
      throw new HTTPException(404, { message: 'User details not found' });
    }

    // Get current billing period usage
    let periodStart = new Date();
    periodStart.setDate(1); // First day of current month
    periodStart.setHours(0, 0, 0, 0);

    const periodUsageQuery = `
      SELECT COUNT(*) as period_calls
      FROM mcp_logs
      WHERE user_id = ?
        AND timestamp >= ?
    `;

    const periodUsage = await c.env.DB.prepare(periodUsageQuery)
      .bind(user.id, periodStart.toISOString())
      .first();

    return c.json({
      user: {
        id: userDetails.id,
        email: userDetails.email,
        name: userDetails.name,
        plan_name: userDetails.plan_name,
        plan_slug: userDetails.plan_slug,
        subscription_status: userDetails.subscription_status,
        subscription_period_end: userDetails.subscription_period_end,
        mcp_calls_count: userDetails.mcp_calls_count,
        mcp_calls_limit: userDetails.mcp_calls_limit,
        calls_remaining: userDetails.calls_remaining,
        billing_frequency: userDetails.billing_frequency
      },
      usage: {
        currentPeriodCalls: periodUsage?.period_calls || 0,
        totalCalls: userDetails.mcp_calls_count || 0,
        limit: userDetails.mcp_calls_limit === -1 ? Infinity : userDetails.mcp_calls_limit,
        isUnlimited: userDetails.mcp_calls_limit === -1,
        percentageUsed: userDetails.mcp_calls_limit === -1 
          ? 0 
          : Math.round((userDetails.mcp_calls_count || 0) / userDetails.mcp_calls_limit * 100)
      },
      billingPeriod: {
        start: periodStart.toISOString(),
        end: userDetails.subscription_period_end
      }
    });
  } catch (error) {
    console.error('Error fetching usage summary:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { 
      message: 'Failed to fetch usage summary',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});