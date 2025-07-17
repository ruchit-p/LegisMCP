import { D1Database, AnalyticsEngineDataset } from '@cloudflare/workers-types';
import { MonitoringService } from './monitoring';

export interface BillingCycleInfo {
  userId: number;
  planSlug: string;
  billingFrequency: 'monthly' | 'yearly' | 'one_time';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  usageResetAt: Date;
  mcpCallsCount: number;
  mcpCallsLimit: number;
  shouldResetUsage: boolean;
}

export class BillingCycleService {
  private monitoringService: MonitoringService;
  
  constructor(private db: D1Database, private analytics?: AnalyticsEngineDataset) {
    this.monitoringService = new MonitoringService(db, analytics);
  }

  /**
   * Check if user's usage should be reset based on billing cycle
   */
  async checkAndResetUsage(userId: number): Promise<BillingCycleInfo | null> {
    const user = await this.getUserBillingInfo(userId);
    if (!user) return null;

    const billingInfo = this.calculateBillingCycle(user);
    
    if (billingInfo.shouldResetUsage) {
      await this.resetUserUsage(userId, billingInfo);
      await this.monitoringService.logUsageReset(userId, 'automatic', {
        planSlug: billingInfo.planSlug,
        resetType: 'billing_cycle_check'
      });
    }

    return billingInfo;
  }

  /**
   * Reset usage for all users who have exceeded their billing cycle
   */
  async resetUsageForAllUsers(): Promise<number> {
    const usersToReset = await this.db.prepare(`
      SELECT u.id, u.billing_cycle_end, u.usage_reset_at, p.slug, p.billing_frequency
      FROM users u
      JOIN plans p ON u.current_plan_id = p.id
      WHERE u.subscription_status = 'active'
        AND u.billing_cycle_end IS NOT NULL
        AND u.billing_cycle_end <= CURRENT_TIMESTAMP
        AND (u.usage_reset_at IS NULL OR u.usage_reset_at < u.billing_cycle_end)
    `).all();

    let resetCount = 0;
    
    for (const user of usersToReset.results) {
      const billingInfo = this.calculateBillingCycle(user);
      if (billingInfo.shouldResetUsage) {
        await this.resetUserUsage(user.id as number, billingInfo);
        await this.monitoringService.logUsageReset(user.id as number, 'automatic', {
          planSlug: billingInfo.planSlug,
          resetType: 'bulk_reset'
        });
        resetCount++;
      }
    }

    // Log bulk reset operation
    await this.monitoringService.logEvent({
      type: 'usage_reset',
      category: 'billing',
      action: 'bulk_reset_completed',
      value: resetCount,
      metadata: {
        totalUsersReset: resetCount,
        resetType: 'scheduled'
      }
    });

    return resetCount;
  }

  /**
   * Update user's billing cycle when subscription changes
   */
  async updateBillingCycle(
    userId: number,
    subscriptionData: {
      stripeSubscriptionId: string;
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
      status: string;
    }
  ): Promise<void> {
    await this.db.prepare(`
      UPDATE users 
      SET 
        stripe_subscription_id = ?,
        billing_cycle_start = ?,
        billing_cycle_end = ?,
        subscription_status = ?,
        subscription_updated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      subscriptionData.stripeSubscriptionId,
      subscriptionData.currentPeriodStart.toISOString(),
      subscriptionData.currentPeriodEnd.toISOString(),
      subscriptionData.status,
      userId
    ).run();
  }

  /**
   * Handle successful payment - reset usage if new billing cycle
   */
  async handleSuccessfulPayment(
    userId: number,
    invoiceData: {
      invoiceId: string;
      periodStart: Date;
      periodEnd: Date;
      amount: number;
      currency: string;
    }
  ): Promise<void> {
    // Update billing cycle
    await this.db.prepare(`
      UPDATE users 
      SET 
        billing_cycle_start = ?,
        billing_cycle_end = ?,
        subscription_status = 'active',
        subscription_updated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      invoiceData.periodStart.toISOString(),
      invoiceData.periodEnd.toISOString(),
      userId
    ).run();

    // Reset usage for the new billing cycle
    const user = await this.getUserBillingInfo(userId);
    if (user) {
      const billingInfo = this.calculateBillingCycle(user);
      await this.resetUserUsage(userId, billingInfo);
      await this.monitoringService.logUsageReset(userId, 'subscription', {
        planSlug: billingInfo.planSlug,
        resetType: 'payment_successful',
        invoiceId: invoiceData.invoiceId,
        amount: invoiceData.amount,
        currency: invoiceData.currency
      });
    }
  }

  /**
   * Get user's current billing information
   */
  private async getUserBillingInfo(userId: number): Promise<any> {
    const result = await this.db.prepare(`
      SELECT 
        u.id,
        u.stripe_customer_id,
        u.stripe_subscription_id,
        u.subscription_status,
        u.billing_cycle_start,
        u.billing_cycle_end,
        u.usage_reset_at,
        u.mcp_calls_count,
        u.mcp_calls_limit,
        p.slug,
        p.billing_frequency,
        p.mcp_calls_limit as plan_limit
      FROM users u
      LEFT JOIN plans p ON u.current_plan_id = p.id
      WHERE u.id = ?
    `).bind(userId).first();

    return result;
  }

  /**
   * Calculate billing cycle information
   */
  private calculateBillingCycle(user: any): BillingCycleInfo {
    const now = new Date();
    const billingCycleStart = user.billing_cycle_start ? new Date(user.billing_cycle_start) : now;
    const billingCycleEnd = user.billing_cycle_end ? new Date(user.billing_cycle_end) : now;
    const usageResetAt = user.usage_reset_at ? new Date(user.usage_reset_at) : new Date(0);

    // For free users, reset monthly
    if (user.slug === 'free' || !user.billing_cycle_end) {
      const monthlyReset = new Date(now);
      monthlyReset.setDate(1); // First day of current month
      monthlyReset.setHours(0, 0, 0, 0);
      
      const nextMonthlyReset = new Date(monthlyReset);
      nextMonthlyReset.setMonth(nextMonthlyReset.getMonth() + 1);

      return {
        userId: user.id,
        planSlug: user.slug || 'free',
        billingFrequency: 'monthly',
        currentPeriodStart: monthlyReset,
        currentPeriodEnd: nextMonthlyReset,
        usageResetAt: usageResetAt,
        mcpCallsCount: user.mcp_calls_count || 0,
        mcpCallsLimit: user.plan_limit || 100,
        shouldResetUsage: usageResetAt < monthlyReset
      };
    }

    // For subscription users, use billing cycle
    const shouldResetUsage = now >= billingCycleEnd && usageResetAt < billingCycleEnd;

    return {
      userId: user.id,
      planSlug: user.slug,
      billingFrequency: user.billing_frequency,
      currentPeriodStart: billingCycleStart,
      currentPeriodEnd: billingCycleEnd,
      usageResetAt: usageResetAt,
      mcpCallsCount: user.mcp_calls_count || 0,
      mcpCallsLimit: user.plan_limit || 100,
      shouldResetUsage
    };
  }

  /**
   * Reset user's usage counters
   */
  private async resetUserUsage(userId: number, billingInfo: BillingCycleInfo): Promise<void> {
    await this.db.prepare(`
      UPDATE users 
      SET 
        mcp_calls_count = 0,
        api_calls_count = 0,
        usage_reset_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(userId).run();

    // Log the usage reset
    await this.db.prepare(`
      INSERT INTO api_usage (user_id, endpoint, method, status_code, response_time_ms, timestamp)
      VALUES (?, '/system/usage-reset', 'POST', 200, 0, CURRENT_TIMESTAMP)
    `).bind(userId).run();

    console.log(`Reset usage for user ${userId} - Plan: ${billingInfo.planSlug}, Limit: ${billingInfo.mcpCallsLimit}`);
  }

  /**
   * Get user's current usage status with billing cycle info
   */
  async getUserUsageStatus(userId: number): Promise<{
    currentUsage: number;
    limit: number;
    percentUsed: number;
    billingCycleEnd: Date | null;
    daysUntilReset: number;
    planSlug: string;
    hasUsageLeft: boolean;
  } | null> {
    const user = await this.getUserBillingInfo(userId);
    if (!user) return null;

    const billingInfo = this.calculateBillingCycle(user);
    const now = new Date();
    const daysUntilReset = billingInfo.currentPeriodEnd > now 
      ? Math.ceil((billingInfo.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const currentUsage = user.mcp_calls_count || 0;
    const limit = billingInfo.mcpCallsLimit;
    const percentUsed = limit > 0 ? (currentUsage / limit) * 100 : 0;
    const hasUsageLeft = limit === -1 || currentUsage < limit; // -1 means unlimited

    return {
      currentUsage,
      limit,
      percentUsed,
      billingCycleEnd: billingInfo.currentPeriodEnd,
      daysUntilReset,
      planSlug: billingInfo.planSlug,
      hasUsageLeft
    };
  }
}