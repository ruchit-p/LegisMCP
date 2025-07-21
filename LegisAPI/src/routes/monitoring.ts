import { Hono } from 'hono';
import { MonitoringService } from '../services/monitoring';


export const monitoringRoutes = new Hono<{ Bindings: Env }>();

// Middleware for admin authentication
const requireAdminAuth = async (c: any, next: any) => {
  const adminToken = c.req.header('x-admin-token');
  const expectedToken = c.env.CRON_TOKEN;
  
  if (!adminToken || adminToken !== expectedToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  await next();
};

// Apply admin auth to all monitoring routes
monitoringRoutes.use('/*', requireAdminAuth);

// System metrics dashboard
monitoringRoutes.get('/metrics', async (c) => {
  try {
    const monitoringService = new MonitoringService(c.env.DB, c.env.ANALYTICS);
    const metrics = await monitoringService.getSystemMetrics();
    
    return c.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get metrics'
    }, 500);
  }
});

// Usage reset history
monitoringRoutes.get('/usage-resets', async (c) => {
  try {
    const days = parseInt(c.req.query('days') || '30');
    const monitoringService = new MonitoringService(c.env.DB, c.env.ANALYTICS);
    const history = await monitoringService.getUsageResetHistory(days);
    
    return c.json({
      success: true,
      data: history,
      period: `${days} days`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get usage reset history'
    }, 500);
  }
});

// Webhook event history
monitoringRoutes.get('/webhooks', async (c) => {
  try {
    const days = parseInt(c.req.query('days') || '7');
    const monitoringService = new MonitoringService(c.env.DB, c.env.ANALYTICS);
    const history = await monitoringService.getWebhookHistory(days);
    
    return c.json({
      success: true,
      data: history,
      period: `${days} days`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get webhook history'
    }, 500);
  }
});

// Error summary
monitoringRoutes.get('/errors', async (c) => {
  try {
    const days = parseInt(c.req.query('days') || '7');
    const monitoringService = new MonitoringService(c.env.DB, c.env.ANALYTICS);
    const errors = await monitoringService.getErrorSummary(days);
    
    return c.json({
      success: true,
      data: errors,
      period: `${days} days`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get error summary'
    }, 500);
  }
});

// System health check
monitoringRoutes.get('/health', async (c) => {
  try {
    const monitoringService = new MonitoringService(c.env.DB, c.env.ANALYTICS);
    const metrics = await monitoringService.getSystemMetrics();
    
    // Determine health status based on metrics
    const healthStatus = {
      status: 'healthy',
      checks: {
        database: { status: 'healthy', message: 'Database connection successful' },
        errorRate: { 
          status: metrics.errorRate < 5 ? 'healthy' : metrics.errorRate < 20 ? 'warning' : 'critical',
          value: metrics.errorRate,
          message: `Error rate: ${metrics.errorRate.toFixed(2)}%`
        },
        webhookSuccess: {
          status: metrics.webhookEvents.successRate > 95 ? 'healthy' : 
                  metrics.webhookEvents.successRate > 80 ? 'warning' : 'critical',
          value: metrics.webhookEvents.successRate,
          message: `Webhook success rate: ${metrics.webhookEvents.successRate.toFixed(2)}%`
        },
        usageResets: {
          status: 'healthy',
          value: metrics.usageResets.today,
          message: `Usage resets today: ${metrics.usageResets.today}`
        }
      }
    };
    
    // Overall health status
    const hasWarnings = Object.values(healthStatus.checks).some(check => check.status === 'warning');
    const hasCritical = Object.values(healthStatus.checks).some(check => check.status === 'critical');
    
    if (hasCritical) {
      healthStatus.status = 'critical';
    } else if (hasWarnings) {
      healthStatus.status = 'warning';
    }
    
    return c.json({
      success: true,
      health: healthStatus,
      metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return c.json({
      success: false,
      health: {
        status: 'critical',
        error: error instanceof Error ? error.message : 'Health check failed'
      },
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Manual usage reset trigger (for testing)
monitoringRoutes.post('/reset-usage', async (c) => {
  try {
    const { BillingCycleService } = await import('../services/billing-cycle');
    const billingCycleService = new BillingCycleService(c.env.DB);
    const monitoringService = new MonitoringService(c.env.DB, c.env.ANALYTICS);
    
    // Perform manual usage reset
    const resetCount = await billingCycleService.resetUsageForAllUsers();
    
    // Log the manual reset
    await monitoringService.logUsageReset(0, 'manual', {
      resetCount,
      triggeredBy: 'admin_dashboard'
    });
    
    return c.json({
      success: true,
      message: `Manual usage reset completed for ${resetCount} users`,
      resetCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Manual reset failed'
    }, 500);
  }
});

// Cleanup old monitoring events
monitoringRoutes.post('/cleanup', async (c) => {
  try {
    const retentionDays = parseInt(c.req.query('retention_days') || '90');
    const monitoringService = new MonitoringService(c.env.DB, c.env.ANALYTICS);
    
    const cleanedCount = await monitoringService.cleanupOldEvents(retentionDays);
    
    return c.json({
      success: true,
      message: `Cleaned up ${cleanedCount} old monitoring events`,
      cleanedCount,
      retentionDays,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Cleanup failed'
    }, 500);
  }
});

// Get monitoring dashboard data (combined endpoint)
monitoringRoutes.get('/dashboard', async (c) => {
  try {
    const monitoringService = new MonitoringService(c.env.DB, c.env.ANALYTICS);
    
    const [metrics, usageResets, webhooks, errors] = await Promise.all([
      monitoringService.getSystemMetrics(),
      monitoringService.getUsageResetHistory(7),
      monitoringService.getWebhookHistory(7),
      monitoringService.getErrorSummary(7)
    ]);
    
    return c.json({
      success: true,
      dashboard: {
        metrics,
        recentUsageResets: usageResets.slice(0, 5),
        recentWebhooks: webhooks.slice(0, 5),
        topErrors: errors.slice(0, 5)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get dashboard data'
    }, 500);
  }
});