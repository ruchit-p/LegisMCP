import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { UserService } from '../services/user';
import { PlansService } from '../services/plans';
import type { Env, JWTPayload } from '../types';

export const adminRoutes = new Hono<{ Bindings: Env }>();

// JWT middleware for all admin routes
adminRoutes.use('/*', jwt({
  secret: async (c) => {
    // Same JWT verification as other routes
    const response = await fetch(`https://${c.env.AUTH0_DOMAIN}/.well-known/jwks.json`);
    const jwks = await response.json();
    return jwks.keys[0]; // In production, match by kid
  }
}));

// Admin check middleware
adminRoutes.use('/*', async (c, next) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const userService = new UserService(c.env.DB);
  
  // Find user by Auth0 ID
  const user = await userService.getUserByAuth0Id(payload.sub);
  if (!user || !user.is_admin) {
    return c.json({ error: 'Unauthorized - Admin access required' }, 403);
  }
  
  // Store user in context for later use
  c.set('adminUser', user);
  await next();
});

// Get admin dashboard stats
adminRoutes.get('/stats', async (c) => {
  try {
    const db = c.env.DB;
    
    // Get user statistics
    const totalUsers = await db.prepare('SELECT COUNT(*) as count FROM users').first();
    const activeUsers = await db.prepare(
      "SELECT COUNT(*) as count FROM users WHERE subscription_status = 'active'"
    ).first();
    
    // Get revenue (sum of active subscriptions)
    const revenue = await db.prepare(`
      SELECT SUM(p.amount) as total 
      FROM users u 
      JOIN plans p ON u.current_plan_id = p.id 
      WHERE u.subscription_status = 'active'
    `).first();
    
    // Get API calls in last 30 days
    const apiCalls = await db.prepare(`
      SELECT COUNT(*) as count 
      FROM api_usage 
      WHERE timestamp > datetime('now', '-30 days')
    `).first();
    
    return c.json({
      totalUsers: totalUsers?.count || 0,
      activeUsers: activeUsers?.count || 0,
      totalRevenue: revenue?.total || 0,
      totalApiCalls: apiCalls?.count || 0
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return c.json({ error: 'Failed to fetch statistics' }, 500);
  }
});

// Get users with filtering and pagination
adminRoutes.get('/users', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = 20;
    const offset = (page - 1) * limit;
    
    const search = c.req.query('search') || '';
    const planFilter = c.req.query('plan') || 'all';
    const statusFilter = c.req.query('status') || 'all';
    
    let query = `
      SELECT 
        u.*,
        p.name as plan_name,
        p.slug as plan_slug,
        p.mcp_calls_limit,
        CASE 
          WHEN p.mcp_calls_limit = -1 THEN 'Unlimited'
          WHEN u.api_calls_count >= p.mcp_calls_limit THEN 'Limit Reached'
          ELSE CAST(p.mcp_calls_limit - u.api_calls_count AS TEXT) || ' remaining'
        END as calls_remaining,
        (SELECT MAX(timestamp) FROM api_usage WHERE user_id = u.id) as last_active
      FROM users u
      LEFT JOIN plans p ON u.current_plan_id = p.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (search) {
      query += ` AND (u.email LIKE ? OR u.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (planFilter !== 'all') {
      query += ` AND p.slug = ?`;
      params.push(planFilter);
    }
    
    if (statusFilter !== 'all') {
      query += ` AND u.subscription_status = ?`;
      params.push(statusFilter);
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM (${query})`;
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first();
    const totalCount = countResult?.count || 0;
    
    // Get paginated results
    query += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const users = await c.env.DB.prepare(query).bind(...params).all();
    
    return c.json({
      users: users.results,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      totalCount
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

// Update user plan
adminRoutes.put('/users/:userId/plan', async (c) => {
  try {
    const userId = parseInt(c.req.param('userId'));
    const { planSlug } = await c.req.json();
    
    const plansService = new PlansService(c.env.DB);
    const plan = await plansService.getPlanBySlug(planSlug);
    
    if (!plan) {
      return c.json({ error: 'Plan not found' }, 404);
    }
    
    // Update user plan
    await c.env.DB.prepare(`
      UPDATE users 
      SET current_plan_id = ?, 
          subscription_status = CASE WHEN ? = 'free' THEN 'free' ELSE subscription_status END
      WHERE id = ?
    `).bind(plan.id, planSlug, userId).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating user plan:', error);
    return c.json({ error: 'Failed to update plan' }, 500);
  }
});

// Get MCP logs
adminRoutes.get('/mcp-logs', async (c) => {
  try {
    const search = c.req.query('search') || '';
    const toolFilter = c.req.query('tool') || 'all';
    const statusFilter = c.req.query('status') || 'all';
    
    let query = `
      SELECT 
        l.*,
        u.email as user_email,
        u.name as user_name
      FROM mcp_logs l
      JOIN users u ON l.user_id = u.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (search) {
      query += ` AND (u.email LIKE ? OR u.name LIKE ? OR l.error_message LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (toolFilter !== 'all') {
      query += ` AND l.tool_name = ?`;
      params.push(toolFilter);
    }
    
    if (statusFilter !== 'all') {
      query += ` AND l.status = ?`;
      params.push(statusFilter);
    }
    
    query += ` ORDER BY l.timestamp DESC LIMIT 100`;
    
    const logs = await c.env.DB.prepare(query).bind(...params).all();
    
    // Get unique tools for filter
    const toolsResult = await c.env.DB.prepare(
      'SELECT DISTINCT tool_name FROM mcp_logs ORDER BY tool_name'
    ).all();
    
    return c.json({
      logs: logs.results.map(log => ({
        ...log,
        request_data: log.request_data ? JSON.parse(log.request_data as string) : null,
        response_data: log.response_data ? JSON.parse(log.response_data as string) : null
      })),
      tools: toolsResult.results.map(r => r.tool_name)
    });
  } catch (error) {
    console.error('Error fetching MCP logs:', error);
    return c.json({ error: 'Failed to fetch logs' }, 500);
  }
});

// Get analytics data
adminRoutes.get('/analytics', async (c) => {
  try {
    const range = c.req.query('range') || '7d';
    
    // Calculate date range
    let dateFilter = '';
    switch (range) {
      case '24h':
        dateFilter = "datetime('now', '-1 day')";
        break;
      case '7d':
        dateFilter = "datetime('now', '-7 days')";
        break;
      case '30d':
        dateFilter = "datetime('now', '-30 days')";
        break;
      case '90d':
        dateFilter = "datetime('now', '-90 days')";
        break;
      default:
        dateFilter = "datetime('now', '-7 days')";
    }
    
    // Total calls and unique users
    const overview = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_calls,
        COUNT(DISTINCT user_id) as unique_users,
        AVG(response_time_ms) as avg_response_time,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_rate
      FROM mcp_logs
      WHERE timestamp > ${dateFilter}
    `).first();
    
    // Top tools
    const topTools = await c.env.DB.prepare(`
      SELECT tool_name as tool, COUNT(*) as count
      FROM mcp_logs
      WHERE timestamp > ${dateFilter}
      GROUP BY tool_name
      ORDER BY count DESC
      LIMIT 10
    `).all();
    
    // Top users
    const topUsers = await c.env.DB.prepare(`
      SELECT 
        u.email,
        u.name,
        p.name as plan,
        COUNT(l.id) as count
      FROM mcp_logs l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN plans p ON u.current_plan_id = p.id
      WHERE l.timestamp > ${dateFilter}
      GROUP BY u.id
      ORDER BY count DESC
      LIMIT 10
    `).all();
    
    // Plan distribution
    const planDistribution = await c.env.DB.prepare(`
      SELECT 
        p.slug as plan,
        COUNT(DISTINCT u.id) as users,
        COUNT(l.id) as calls
      FROM users u
      LEFT JOIN plans p ON u.current_plan_id = p.id
      LEFT JOIN mcp_logs l ON u.id = l.user_id AND l.timestamp > ${dateFilter}
      GROUP BY p.slug
    `).all();
    
    return c.json({
      totalCalls: overview?.total_calls || 0,
      uniqueUsers: overview?.unique_users || 0,
      avgResponseTime: overview?.avg_response_time || 0,
      successRate: overview?.success_rate || 0,
      topTools: topTools.results,
      topUsers: topUsers.results,
      planDistribution: planDistribution.results
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return c.json({ error: 'Failed to fetch analytics' }, 500);
  }
});