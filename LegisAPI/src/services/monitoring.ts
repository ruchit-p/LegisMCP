import { D1Database, AnalyticsEngineDataset } from '@cloudflare/workers-types';

export interface MonitoringEvent {
  type: 'usage_reset' | 'subscription_change' | 'webhook_received' | 'error' | 'performance';
  category: string;
  action: string;
  label?: string;
  value?: number;
  userId?: number;
  metadata?: Record<string, any>;
}

export interface SystemMetrics {
  totalUsers: number;
  activeSubscriptions: number;
  usageResets: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  webhookEvents: {
    today: number;
    thisWeek: number;
    successRate: number;
  };
  errorRate: number;
  averageResponseTime: number;
}

export class MonitoringService {
  constructor(
    private db: D1Database,
    private analytics?: AnalyticsEngineDataset
  ) {}

  /**
   * Log a monitoring event
   */
  async logEvent(event: MonitoringEvent): Promise<void> {
    const timestamp = new Date().toISOString();
    
    try {
      // Log to Analytics Engine if available
      if (this.analytics) {
        await this.analytics.writeDataPoint({
          blobs: [
            event.type,
            event.category,
            event.action,
            event.label || '',
            event.metadata ? JSON.stringify(event.metadata) : ''
          ],
          doubles: [event.value || 1],
          indexes: [event.type, event.category, event.action]
        });
      }

      // Log to database for persistence
      await this.db.prepare(`
        INSERT INTO monitoring_events (
          event_type,
          category,
          action,
          label,
          value,
          user_id,
          metadata,
          timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        event.type,
        event.category,
        event.action,
        event.label || null,
        event.value || null,
        event.userId || null,
        event.metadata ? JSON.stringify(event.metadata) : null,
        timestamp
      ).run();

      console.log(`Monitoring event logged: ${event.type}/${event.category}/${event.action}`);

    } catch (error) {
      console.error('Failed to log monitoring event:', error);
    }
  }

  /**
   * Log usage reset event
   */
  async logUsageReset(userId: number, resetType: 'automatic' | 'manual' | 'subscription', metadata?: Record<string, any>): Promise<void> {
    await this.logEvent({
      type: 'usage_reset',
      category: 'billing',
      action: resetType,
      userId,
      value: 1,
      metadata
    });
  }

  /**
   * Log subscription change event
   */
  async logSubscriptionChange(userId: number, fromPlan: string, toPlan: string, metadata?: Record<string, any>): Promise<void> {
    await this.logEvent({
      type: 'subscription_change',
      category: 'billing',
      action: 'plan_change',
      label: `${fromPlan} -> ${toPlan}`,
      userId,
      value: 1,
      metadata
    });
  }

  /**
   * Log webhook event
   */
  async logWebhookEvent(webhookType: string, eventType: string, success: boolean, metadata?: Record<string, any>): Promise<void> {
    await this.logEvent({
      type: 'webhook_received',
      category: webhookType,
      action: success ? 'success' : 'error',
      label: eventType,
      value: success ? 1 : 0,
      metadata
    });
  }

  /**
   * Log error event
   */
  async logError(category: string, action: string, error: Error, userId?: number, metadata?: Record<string, any>): Promise<void> {
    await this.logEvent({
      type: 'error',
      category,
      action,
      label: error.message,
      userId,
      value: 1,
      metadata: {
        ...metadata,
        stack: error.stack,
        name: error.name
      }
    });
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      // Get total users
      const totalUsersResult = await this.db.prepare(`
        SELECT COUNT(*) as count FROM users
      `).first();
      const totalUsers = totalUsersResult?.count as number || 0;

      // Get active subscriptions
      const activeSubscriptionsResult = await this.db.prepare(`
        SELECT COUNT(*) as count FROM users 
        WHERE subscription_status = 'active'
      `).first();
      const activeSubscriptions = activeSubscriptionsResult?.count as number || 0;

      // Get usage reset stats
      const usageResetStats = await this.db.prepare(`
        SELECT 
          COUNT(CASE WHEN timestamp >= datetime('now', '-1 day') THEN 1 END) as today,
          COUNT(CASE WHEN timestamp >= datetime('now', '-7 days') THEN 1 END) as thisWeek,
          COUNT(CASE WHEN timestamp >= datetime('now', '-30 days') THEN 1 END) as thisMonth
        FROM monitoring_events 
        WHERE event_type = 'usage_reset'
      `).first();

      // Get webhook stats
      const webhookStats = await this.db.prepare(`
        SELECT 
          COUNT(CASE WHEN timestamp >= datetime('now', '-1 day') THEN 1 END) as today,
          COUNT(CASE WHEN timestamp >= datetime('now', '-7 days') THEN 1 END) as thisWeek,
          COUNT(CASE WHEN action = 'success' THEN 1 END) as successCount,
          COUNT(*) as totalCount
        FROM monitoring_events 
        WHERE event_type = 'webhook_received'
      `).first();

      // Get error rate
      const errorStats = await this.db.prepare(`
        SELECT 
          COUNT(CASE WHEN event_type = 'error' THEN 1 END) as errorCount,
          COUNT(*) as totalEvents
        FROM monitoring_events 
        WHERE timestamp >= datetime('now', '-1 day')
      `).first();

      // Calculate metrics
      const webhookSuccessRate = webhookStats?.totalCount ? 
        ((webhookStats.successCount as number) / (webhookStats.totalCount as number)) * 100 : 100;

      const errorRate = errorStats?.totalEvents ? 
        ((errorStats.errorCount as number) / (errorStats.totalEvents as number)) * 100 : 0;

      return {
        totalUsers,
        activeSubscriptions,
        usageResets: {
          today: usageResetStats?.today as number || 0,
          thisWeek: usageResetStats?.thisWeek as number || 0,
          thisMonth: usageResetStats?.thisMonth as number || 0
        },
        webhookEvents: {
          today: webhookStats?.today as number || 0,
          thisWeek: webhookStats?.thisWeek as number || 0,
          successRate: webhookSuccessRate
        },
        errorRate,
        averageResponseTime: 0 // Would need to implement response time tracking
      };

    } catch (error) {
      console.error('Failed to get system metrics:', error);
      throw error;
    }
  }

  /**
   * Get usage reset history
   */
  async getUsageResetHistory(days: number = 30): Promise<any[]> {
    try {
      const result = await this.db.prepare(`
        SELECT 
          date(timestamp) as date,
          COUNT(*) as resetCount,
          COUNT(DISTINCT user_id) as affectedUsers,
          action as resetType
        FROM monitoring_events 
        WHERE event_type = 'usage_reset'
          AND timestamp >= datetime('now', '-${days} days')
        GROUP BY date(timestamp), action
        ORDER BY date DESC
      `).all();

      return result.results;
    } catch (error) {
      console.error('Failed to get usage reset history:', error);
      throw error;
    }
  }

  /**
   * Get webhook event history
   */
  async getWebhookHistory(days: number = 7): Promise<any[]> {
    try {
      const result = await this.db.prepare(`
        SELECT 
          date(timestamp) as date,
          category as webhookType,
          action as status,
          COUNT(*) as eventCount
        FROM monitoring_events 
        WHERE event_type = 'webhook_received'
          AND timestamp >= datetime('now', '-${days} days')
        GROUP BY date(timestamp), category, action
        ORDER BY date DESC
      `).all();

      return result.results;
    } catch (error) {
      console.error('Failed to get webhook history:', error);
      throw error;
    }
  }

  /**
   * Get error summary
   */
  async getErrorSummary(days: number = 7): Promise<any[]> {
    try {
      const result = await this.db.prepare(`
        SELECT 
          category,
          action,
          label as errorMessage,
          COUNT(*) as errorCount,
          MAX(timestamp) as lastOccurrence
        FROM monitoring_events 
        WHERE event_type = 'error'
          AND timestamp >= datetime('now', '-${days} days')
        GROUP BY category, action, label
        ORDER BY errorCount DESC
        LIMIT 20
      `).all();

      return result.results;
    } catch (error) {
      console.error('Failed to get error summary:', error);
      throw error;
    }
  }

  /**
   * Clean up old monitoring events
   */
  async cleanupOldEvents(retentionDays: number = 90): Promise<number> {
    try {
      const result = await this.db.prepare(`
        DELETE FROM monitoring_events 
        WHERE timestamp < datetime('now', '-${retentionDays} days')
      `).run();

      console.log(`Cleaned up ${result.changes} old monitoring events`);
      return result.changes || 0;
    } catch (error) {
      console.error('Failed to cleanup old events:', error);
      throw error;
    }
  }
}