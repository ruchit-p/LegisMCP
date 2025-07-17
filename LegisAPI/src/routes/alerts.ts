import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

type Bindings = {
  DB: D1Database
}

const alerts = new Hono<{ Bindings: Bindings }>()

// Validation schemas
const AlertQuerySchema = z.object({
  limit: z.string().optional().default('50'),
  offset: z.string().optional().default('0'),
  type: z.enum(['error', 'warning', 'info', 'success']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  component: z.string().optional(),
  resolved: z.enum(['true', 'false']).optional(),
  read: z.enum(['true', 'false']).optional(),
})

const CreateAlertSchema = z.object({
  alert_type: z.enum(['error', 'warning', 'info', 'success']),
  title: z.string().min(1),
  message: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  component: z.string().min(1),
  endpoint: z.string().optional(),
  error_code: z.string().optional(),
  affected_users_count: z.number().optional().default(0),
  metadata: z.record(z.any()).optional(),
})

const UpdateAlertSchema = z.object({
  is_resolved: z.boolean().optional(),
  is_read: z.boolean().optional(),
  resolved_by: z.string().optional(),
  resolution_notes: z.string().optional(),
})

const ErrorEventQuerySchema = z.object({
  limit: z.string().optional().default('50'),
  offset: z.string().optional().default('0'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  component: z.string().optional(),
  status: z.enum(['open', 'investigating', 'resolved']).optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
})

const CreateErrorEventSchema = z.object({
  event_type: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  message: z.string().min(1),
  component: z.string().min(1),
  endpoint: z.string().optional(),
  method: z.string().optional(),
  status_code: z.number().optional(),
  user_id: z.number().optional(),
  user_email: z.string().optional(),
  stack_trace: z.string().optional(),
  tags: z.string().optional(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  request_data: z.record(z.any()).optional(),
  response_data: z.record(z.any()).optional(),
  session_id: z.string().optional(),
  correlation_id: z.string().optional(),
})

// GET /api/alerts - Get system alerts
alerts.get('/', zValidator('query', AlertQuerySchema), async (c) => {
  try {
    const { limit, offset, type, severity, component, resolved, read } = c.req.valid('query')
    
    let query = `
      SELECT 
        id, alert_type, title, message, severity, component, endpoint, 
        error_code, affected_users_count, is_resolved, is_read, 
        resolved_at, resolved_by, resolution_notes, metadata,
        created_at, updated_at
      FROM system_alerts 
      WHERE 1=1
    `
    
    const params: any[] = []
    
    if (type) {
      query += ` AND alert_type = ?`
      params.push(type)
    }
    
    if (severity) {
      query += ` AND severity = ?`
      params.push(severity)
    }
    
    if (component) {
      query += ` AND component = ?`
      params.push(component)
    }
    
    if (resolved !== undefined) {
      query += ` AND is_resolved = ?`
      params.push(resolved === 'true' ? 1 : 0)
    }
    
    if (read !== undefined) {
      query += ` AND is_read = ?`
      params.push(read === 'true' ? 1 : 0)
    }
    
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
    params.push(parseInt(limit), parseInt(offset))
    
    const result = await c.env.DB.prepare(query).bind(...params).all()
    
    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM system_alerts WHERE 1=1`
    const countParams: any[] = []
    
    if (type) {
      countQuery += ` AND alert_type = ?`
      countParams.push(type)
    }
    
    if (severity) {
      countQuery += ` AND severity = ?`
      countParams.push(severity)
    }
    
    if (component) {
      countQuery += ` AND component = ?`
      countParams.push(component)
    }
    
    if (resolved !== undefined) {
      countQuery += ` AND is_resolved = ?`
      countParams.push(resolved === 'true' ? 1 : 0)
    }
    
    if (read !== undefined) {
      countQuery += ` AND is_read = ?`
      countParams.push(read === 'true' ? 1 : 0)
    }
    
    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first()
    
    return c.json({
      success: true,
      data: result.results?.map(alert => ({
        ...alert,
        metadata: alert.metadata ? JSON.parse(alert.metadata as string) : null
      })) || [],
      pagination: {
        total: countResult?.total || 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (countResult?.total || 0) > parseInt(offset) + parseInt(limit)
      }
    })
  } catch (error) {
    console.error('Error fetching alerts:', error)
    return c.json({ success: false, error: 'Failed to fetch alerts' }, 500)
  }
})

// POST /api/alerts - Create new alert
alerts.post('/', zValidator('json', CreateAlertSchema), async (c) => {
  try {
    const alertData = c.req.valid('json')
    
    const result = await c.env.DB.prepare(`
      INSERT INTO system_alerts (
        alert_type, title, message, severity, component, endpoint, 
        error_code, affected_users_count, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      alertData.alert_type,
      alertData.title,
      alertData.message,
      alertData.severity,
      alertData.component,
      alertData.endpoint || null,
      alertData.error_code || null,
      alertData.affected_users_count,
      alertData.metadata ? JSON.stringify(alertData.metadata) : null
    ).run()
    
    return c.json({
      success: true,
      data: { id: result.meta.last_row_id },
      message: 'Alert created successfully'
    }, 201)
  } catch (error) {
    console.error('Error creating alert:', error)
    return c.json({ success: false, error: 'Failed to create alert' }, 500)
  }
})

// PATCH /api/alerts/:id - Update alert
alerts.patch('/:id', zValidator('json', UpdateAlertSchema), async (c) => {
  try {
    const alertId = c.req.param('id')
    const updateData = c.req.valid('json')
    
    const setParts: string[] = []
    const params: any[] = []
    
    if (updateData.is_resolved !== undefined) {
      setParts.push('is_resolved = ?')
      params.push(updateData.is_resolved ? 1 : 0)
      
      if (updateData.is_resolved) {
        setParts.push('resolved_at = CURRENT_TIMESTAMP')
      }
    }
    
    if (updateData.is_read !== undefined) {
      setParts.push('is_read = ?')
      params.push(updateData.is_read ? 1 : 0)
    }
    
    if (updateData.resolved_by) {
      setParts.push('resolved_by = ?')
      params.push(updateData.resolved_by)
    }
    
    if (updateData.resolution_notes) {
      setParts.push('resolution_notes = ?')
      params.push(updateData.resolution_notes)
    }
    
    if (setParts.length === 0) {
      return c.json({ success: false, error: 'No valid fields to update' }, 400)
    }
    
    const query = `UPDATE system_alerts SET ${setParts.join(', ')} WHERE id = ?`
    params.push(alertId)
    
    const result = await c.env.DB.prepare(query).bind(...params).run()
    
    if (result.changes === 0) {
      return c.json({ success: false, error: 'Alert not found' }, 404)
    }
    
    return c.json({
      success: true,
      message: 'Alert updated successfully'
    })
  } catch (error) {
    console.error('Error updating alert:', error)
    return c.json({ success: false, error: 'Failed to update alert' }, 500)
  }
})

// GET /api/alerts/metrics - Get alert metrics
alerts.get('/metrics', async (c) => {
  try {
    const metricsQuery = `
      SELECT 
        COUNT(*) as total_alerts,
        COUNT(CASE WHEN is_resolved = 0 THEN 1 END) as unresolved_alerts,
        COUNT(CASE WHEN severity = 'critical' AND is_resolved = 0 THEN 1 END) as critical_alerts,
        COUNT(CASE WHEN severity = 'high' AND is_resolved = 0 THEN 1 END) as high_alerts,
        COUNT(CASE WHEN created_at >= datetime('now', '-24 hours') THEN 1 END) as alerts_last_24h,
        COUNT(CASE WHEN created_at >= datetime('now', '-1 hours') THEN 1 END) as alerts_last_hour
      FROM system_alerts
    `
    
    const result = await c.env.DB.prepare(metricsQuery).first()
    
    // Get alerts by component
    const componentQuery = `
      SELECT 
        component,
        COUNT(*) as alert_count,
        COUNT(CASE WHEN is_resolved = 0 THEN 1 END) as unresolved_count
      FROM system_alerts
      WHERE created_at >= datetime('now', '-24 hours')
      GROUP BY component
      ORDER BY alert_count DESC
    `
    
    const componentResult = await c.env.DB.prepare(componentQuery).all()
    
    return c.json({
      success: true,
      data: {
        overview: result,
        by_component: componentResult.results || []
      }
    })
  } catch (error) {
    console.error('Error fetching alert metrics:', error)
    return c.json({ success: false, error: 'Failed to fetch alert metrics' }, 500)
  }
})

// GET /api/alerts/error-events - Get error events
alerts.get('/error-events', zValidator('query', ErrorEventQuerySchema), async (c) => {
  try {
    const { limit, offset, severity, component, status, from_date, to_date } = c.req.valid('query')
    
    let query = `
      SELECT 
        id, event_type, severity, message, component, endpoint, method, 
        status_code, user_id, user_email, error_count, first_occurrence, 
        last_occurrence, status, assigned_to, resolution_notes, tags,
        created_at, updated_at
      FROM error_events 
      WHERE 1=1
    `
    
    const params: any[] = []
    
    if (severity) {
      query += ` AND severity = ?`
      params.push(severity)
    }
    
    if (component) {
      query += ` AND component = ?`
      params.push(component)
    }
    
    if (status) {
      query += ` AND status = ?`
      params.push(status)
    }
    
    if (from_date) {
      query += ` AND created_at >= ?`
      params.push(from_date)
    }
    
    if (to_date) {
      query += ` AND created_at <= ?`
      params.push(to_date)
    }
    
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
    params.push(parseInt(limit), parseInt(offset))
    
    const result = await c.env.DB.prepare(query).bind(...params).all()
    
    return c.json({
      success: true,
      data: result.results || []
    })
  } catch (error) {
    console.error('Error fetching error events:', error)
    return c.json({ success: false, error: 'Failed to fetch error events' }, 500)
  }
})

// POST /api/alerts/error-events - Create new error event
alerts.post('/error-events', zValidator('json', CreateErrorEventSchema), async (c) => {
  try {
    const errorData = c.req.valid('json')
    
    const result = await c.env.DB.prepare(`
      INSERT INTO error_events (
        event_type, severity, message, component, endpoint, method, 
        status_code, user_id, user_email, stack_trace, tags, ip_address,
        user_agent, request_data, response_data, session_id, correlation_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      errorData.event_type,
      errorData.severity,
      errorData.message,
      errorData.component,
      errorData.endpoint || null,
      errorData.method || null,
      errorData.status_code || null,
      errorData.user_id || null,
      errorData.user_email || null,
      errorData.stack_trace || null,
      errorData.tags || null,
      errorData.ip_address || null,
      errorData.user_agent || null,
      errorData.request_data ? JSON.stringify(errorData.request_data) : null,
      errorData.response_data ? JSON.stringify(errorData.response_data) : null,
      errorData.session_id || null,
      errorData.correlation_id || null
    ).run()
    
    return c.json({
      success: true,
      data: { id: result.meta.last_row_id },
      message: 'Error event created successfully'
    }, 201)
  } catch (error) {
    console.error('Error creating error event:', error)
    return c.json({ success: false, error: 'Failed to create error event' }, 500)
  }
})

export default alerts