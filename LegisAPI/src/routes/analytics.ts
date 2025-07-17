import { Hono } from "hono";
import { HTTPException } from "../utils/http-exception";
import { z } from "zod";
import type { Env, JWTPayload } from "../types";
import { UserService } from "../services/user";

const analyticsRoutes = new Hono<{
  Bindings: Env;
  Variables: {
    jwtPayload?: JWTPayload;
    user?: any;
  };
}>();

// Event type validation schema
const eventTypeSchema = z.enum([
  'page_view',
  'button_click',
  'form_interaction',
  'search_query',
  'session_start',
  'session_end',
  'error',
  'feature_usage',
  'navigation',
  'scroll_depth',
  'time_on_page'
]);

// Base event schema
const baseEventSchema = z.object({
  event_type: eventTypeSchema,
  timestamp: z.number(),
  session_id: z.string(),
  user_id: z.string().optional(),
  page_url: z.string(),
  page_title: z.string(),
  referrer: z.string().optional(),
  user_agent: z.string(),
  viewport_size: z.object({
    width: z.number(),
    height: z.number()
  }).optional(),
  device_type: z.enum(['desktop', 'mobile', 'tablet']).optional(),
  data: z.record(z.any()) // Flexible data object
});

// Events batch schema
const eventsBatchSchema = z.object({
  events: z.array(baseEventSchema)
});

/**
 * Store user activity events in the database
 */
async function storeUserActivityEvents(
  db: D1Database,
  events: z.infer<typeof baseEventSchema>[],
  userId?: number
) {
  const stmt = db.prepare(`
    INSERT INTO user_activity_events (
      user_id, session_id, event_type, event_data, page_url, page_title,
      referrer, user_agent, device_type, viewport_width, viewport_height, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Process events in batches to avoid overwhelming the database
  const batchSize = 50;
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    
    const queries = batch.map(event => {
      const timestamp = new Date(event.timestamp).toISOString();
      return stmt.bind(
        userId || null,
        event.session_id,
        event.event_type,
        JSON.stringify(event.data),
        event.page_url,
        event.page_title,
        event.referrer || null,
        event.user_agent,
        event.device_type || null,
        event.viewport_size?.width || null,
        event.viewport_size?.height || null,
        timestamp
      );
    });

    try {
      await db.batch(queries);
    } catch (error) {
      console.error('Error storing user activity events batch:', error);
      throw error;
    }
  }
}

/**
 * Write analytics data to Cloudflare Analytics Engine
 */
async function writeAnalyticsData(analytics: any, events: z.infer<typeof baseEventSchema>[], userId?: string) {
  if (!analytics) return;

  try {
    // Aggregate events by type for Analytics Engine
    const eventCounts = events.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Send aggregated data to Analytics Engine
    for (const [eventType, count] of Object.entries(eventCounts)) {
      analytics.writeDataPoint({
        blobs: [eventType, events[0].device_type || 'unknown', events[0].page_url],
        doubles: [count, events[0].timestamp],
        indexes: [userId || 'anonymous']
      });
    }
  } catch (error) {
    console.error('Error writing to Analytics Engine:', error);
    // Don't throw - analytics failures shouldn't break the API
  }
}

/**
 * POST /events - Store user activity events
 * Accepts batch of events for efficient processing
 */
analyticsRoutes.post("/events", async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = eventsBatchSchema.parse(body);
    
    console.log(`Received ${validatedData.events.length} analytics events`);
    
    // Get user information if authenticated
    let userId: number | undefined;
    const user = c.get("user");
    if (user?.id) {
      userId = user.id;
    }
    
    // Store events in database
    await storeUserActivityEvents(c.env.DB, validatedData.events, userId);
    
    // Write to Analytics Engine
    await writeAnalyticsData(c.env.ANALYTICS, validatedData.events, user?.auth0_user_id);
    
    console.log(`Successfully stored ${validatedData.events.length} analytics events`);
    
    return c.json({ 
      success: true, 
      events_processed: validatedData.events.length,
      message: "Events stored successfully"
    });
    
  } catch (error) {
    console.error("Error processing analytics events:", error);
    
    if (error instanceof z.ZodError) {
      return c.json({ 
        error: "Invalid event data format", 
        details: error.errors 
      }, 400);
    }
    
    throw new HTTPException(500, { 
      message: "Failed to process analytics events" 
    });
  }
});

/**
 * GET /events - Retrieve user activity events (admin only)
 */
analyticsRoutes.get("/events", async (c) => {
  try {
    const user = c.get("user");
    if (!user || user.plan !== 'enterprise') {
      throw new HTTPException(403, { message: "Access denied" });
    }
    
    const page = parseInt(c.req.query("page") || "1");
    const limit = Math.min(parseInt(c.req.query("limit") || "100"), 1000);
    const eventType = c.req.query("event_type");
    const sessionId = c.req.query("session_id");
    const startDate = c.req.query("start_date");
    const endDate = c.req.query("end_date");
    
    const offset = (page - 1) * limit;
    
    // Build query with filters
    let query = `
      SELECT 
        uae.*,
        u.email,
        u.name,
        u.plan
      FROM user_activity_events uae
      LEFT JOIN users u ON uae.user_id = u.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (eventType) {
      query += ` AND uae.event_type = ?`;
      params.push(eventType);
    }
    
    if (sessionId) {
      query += ` AND uae.session_id = ?`;
      params.push(sessionId);
    }
    
    if (startDate) {
      query += ` AND uae.timestamp >= ?`;
      params.push(startDate);
    }
    
    if (endDate) {
      query += ` AND uae.timestamp <= ?`;
      params.push(endDate);
    }
    
    query += ` ORDER BY uae.timestamp DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const events = await c.env.DB.prepare(query).bind(...params).all();
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM user_activity_events uae
      WHERE 1=1
    `;
    
    const countParams: any[] = [];
    
    if (eventType) {
      countQuery += ` AND uae.event_type = ?`;
      countParams.push(eventType);
    }
    
    if (sessionId) {
      countQuery += ` AND uae.session_id = ?`;
      countParams.push(sessionId);
    }
    
    if (startDate) {
      countQuery += ` AND uae.timestamp >= ?`;
      countParams.push(startDate);
    }
    
    if (endDate) {
      countQuery += ` AND uae.timestamp <= ?`;
      countParams.push(endDate);
    }
    
    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first();
    const total = (countResult as any)?.total || 0;
    
    return c.json({
      events: events.results,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error("Error retrieving analytics events:", error);
    throw new HTTPException(500, { 
      message: "Failed to retrieve analytics events" 
    });
  }
});

/**
 * GET /events/summary - Get analytics summary
 */
analyticsRoutes.get("/events/summary", async (c) => {
  try {
    const user = c.get("user");
    if (!user || user.plan !== 'enterprise') {
      throw new HTTPException(403, { message: "Access denied" });
    }
    
    const days = parseInt(c.req.query("days") || "30");
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get event counts by type
    const eventCounts = await c.env.DB.prepare(`
      SELECT 
        event_type,
        COUNT(*) as count
      FROM user_activity_events
      WHERE timestamp >= ?
      GROUP BY event_type
      ORDER BY count DESC
    `).bind(startDate.toISOString()).all();
    
    // Get daily activity
    const dailyActivity = await c.env.DB.prepare(`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as events,
        COUNT(DISTINCT session_id) as sessions
      FROM user_activity_events
      WHERE timestamp >= ?
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `).bind(startDate.toISOString()).all();
    
    // Get top pages
    const topPages = await c.env.DB.prepare(`
      SELECT 
        page_url,
        COUNT(*) as views
      FROM user_activity_events
      WHERE event_type = 'page_view' AND timestamp >= ?
      GROUP BY page_url
      ORDER BY views DESC
      LIMIT 10
    `).bind(startDate.toISOString()).all();
    
    // Get device distribution
    const deviceDistribution = await c.env.DB.prepare(`
      SELECT 
        device_type,
        COUNT(*) as count
      FROM user_activity_events
      WHERE timestamp >= ?
      GROUP BY device_type
      ORDER BY count DESC
    `).bind(startDate.toISOString()).all();
    
    // Get error events
    const errorEvents = await c.env.DB.prepare(`
      SELECT 
        event_data,
        COUNT(*) as count
      FROM user_activity_events
      WHERE event_type = 'error' AND timestamp >= ?
      GROUP BY event_data
      ORDER BY count DESC
      LIMIT 10
    `).bind(startDate.toISOString()).all();
    
    return c.json({
      period: {
        days,
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString()
      },
      event_counts: eventCounts.results,
      daily_activity: dailyActivity.results,
      top_pages: topPages.results,
      device_distribution: deviceDistribution.results,
      recent_errors: errorEvents.results
    });
    
  } catch (error) {
    console.error("Error generating analytics summary:", error);
    throw new HTTPException(500, { 
      message: "Failed to generate analytics summary" 
    });
  }
});

/**
 * GET /events/user/:userId - Get events for specific user (admin only)
 */
analyticsRoutes.get("/events/user/:userId", async (c) => {
  try {
    const user = c.get("user");
    if (!user || user.plan !== 'enterprise') {
      throw new HTTPException(403, { message: "Access denied" });
    }
    
    const { userId } = c.req.param();
    const limit = Math.min(parseInt(c.req.query("limit") || "100"), 1000);
    const eventType = c.req.query("event_type");
    
    let query = `
      SELECT 
        uae.*,
        u.email,
        u.name,
        u.plan
      FROM user_activity_events uae
      LEFT JOIN users u ON uae.user_id = u.id
      WHERE uae.user_id = ?
    `;
    
    const params: any[] = [userId];
    
    if (eventType) {
      query += ` AND uae.event_type = ?`;
      params.push(eventType);
    }
    
    query += ` ORDER BY uae.timestamp DESC LIMIT ?`;
    params.push(limit);
    
    const events = await c.env.DB.prepare(query).bind(...params).all();
    
    return c.json({
      user_id: userId,
      events: events.results
    });
    
  } catch (error) {
    console.error("Error retrieving user events:", error);
    throw new HTTPException(500, { 
      message: "Failed to retrieve user events" 
    });
  }
});

export { analyticsRoutes };