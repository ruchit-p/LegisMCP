import { Hono } from 'hono';
import { StripeService } from '../services/stripe';
import { MonitoringService } from '../services/monitoring';
import type { Env } from '../types';

export const webhookRoutes = new Hono<{ Bindings: Env }>();

// Stripe webhook endpoint - no JWT auth required
webhookRoutes.post('/stripe', async (c) => {
  try {
    // Get raw body for signature verification
    const rawBody = await c.req.text();
    const signature = c.req.header('stripe-signature');

    if (!signature) {
      return c.json({ error: 'Missing stripe-signature header' }, 400);
    }

    // Get Stripe webhook secret from environment
    const webhookSecret = c.env.STRIPE_WEBHOOK_SECRET;
    const stripeApiKey = c.env.STRIPE_API_KEY;

    if (!webhookSecret || !stripeApiKey) {
      console.error('Missing Stripe configuration');
      return c.json({ error: 'Webhook configuration error' }, 500);
    }

    const stripeService = new StripeService(c.env.DB, {
      webhookSecret,
      apiKey: stripeApiKey
    });

    // Verify webhook signature
    const isValid = await stripeService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      return c.json({ error: 'Invalid signature' }, 401);
    }

    // Parse the event
    const event = JSON.parse(rawBody);

    // Log the webhook event for monitoring
    console.log(`Stripe webhook received: ${event.type}, ID: ${event.id}`);
    
    // Initialize monitoring service
    const monitoringService = new MonitoringService(c.env.DB, c.env.ANALYTICS);
    
    // Log webhook event to monitoring
    await monitoringService.logWebhookEvent('stripe', event.type, true, {
      eventId: event.id,
      objectId: event.data?.object?.id || "unknown",
      livemode: event.livemode
    });

    // Handle the event
    await stripeService.handleWebhookEvent(event);

    // Log successful processing
    console.log(`Stripe webhook processed successfully: ${event.type}`);
    
    // Return 200 OK to acknowledge receipt
    return c.json({ 
      received: true, 
      eventType: event.type,
      eventId: event.id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Webhook error:', error);
    
    // Initialize monitoring service for error logging
    const monitoringService = new MonitoringService(c.env.DB, c.env.ANALYTICS);
    
    // Log webhook error to monitoring
    await monitoringService.logWebhookEvent('stripe', 'webhook_error', false, {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return 200 to prevent Stripe from retrying
    return c.json({ 
      error: 'Webhook processing failed', 
      received: true,
      timestamp: new Date().toISOString()
    });
  }
});

// Custom subscription update endpoint for frontend webhook forwarding
webhookRoutes.post('/stripe/subscription', async (c) => {
  try {
    const body = await c.req.json();
    const { auth0_user_id, subscription } = body;

    if (!auth0_user_id || !subscription) {
      return c.json({ error: 'Missing auth0_user_id or subscription data' }, 400);
    }

    console.log(`Processing subscription update for Auth0 user: ${auth0_user_id}`);

    // Import required services
    const { UserService } = await import('../services/user');
    const { PlansService } = await import('../services/plans');
    const { BillingCycleService } = await import('../services/billing-cycle');

    const userService = new UserService(c.env.DB);
    const plansService = new PlansService(c.env.DB);
    const billingCycleService = new BillingCycleService(c.env.DB);

    // Find user by Auth0 ID
    const user = await userService.getUserByAuth0Id(auth0_user_id);
    if (!user) {
      console.error(`User not found for Auth0 ID: ${auth0_user_id}`);
      
      // Try to create the user if they don't exist (they should have been created during registration)
      console.log(`Attempting to create user for Auth0 ID: ${auth0_user_id}`);
      return c.json({ error: 'User not found - user should be created during registration first' }, 404);
    }
    
    console.log(`Found user: ${user.email} (ID: ${user.id}) for Auth0 ID: ${auth0_user_id}`);

    // Handle subscription data
    if (subscription.subscription_id && subscription.plan) {
      // Find plan by slug
      const plan = await plansService.getPlanBySlug(subscription.plan);
      if (!plan) {
        console.error(`Plan not found: ${subscription.plan}`);
        return c.json({ error: 'Plan not found' }, 404);
      }

      // Update user subscription in database
      await c.env.DB.prepare(`
        UPDATE users 
        SET 
          current_plan_id = ?,
          subscription_status = ?,
          stripe_subscription_id = ?,
          stripe_customer_id = ?,
          mcp_calls_limit = ?,
          subscription_updated_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        plan.id,
        subscription.status || 'active',
        subscription.subscription_id,
        subscription.stripe_customer_id || user.stripe_customer_id,
        plan.mcp_calls_limit,
        user.id
      ).run();

      // Update billing cycle if we have period information
      if (subscription.current_period_start && subscription.current_period_end) {
        await billingCycleService.updateBillingCycle(user.id, {
          stripeSubscriptionId: subscription.subscription_id,
          currentPeriodStart: new Date(subscription.current_period_start),
          currentPeriodEnd: new Date(subscription.current_period_end),
          status: subscription.status || 'active'
        });
      }

      console.log(`Successfully updated subscription for user ${user.email} to plan ${plan.name}`);
    } else if (subscription.subscription_id === null) {
      // Handle subscription cancellation
      const freePlan = await plansService.getPlanBySlug('free');
      if (freePlan) {
        await c.env.DB.prepare(`
          UPDATE users 
          SET 
            current_plan_id = ?,
            subscription_status = 'free',
            stripe_subscription_id = NULL,
            subscription_ended_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(freePlan.id, user.id).run();

        console.log(`Cancelled subscription for user ${user.email}, downgraded to free plan`);
      }
    }

    return c.json({ 
      success: true, 
      message: 'Subscription updated successfully',
      userId: user.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Subscription update error:', error);
    return c.json({ 
      error: 'Failed to update subscription',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Health check endpoint for webhook monitoring
webhookRoutes.get('/health', async (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'LegisAPI Webhooks',
    endpoints: [
      'POST /webhooks/stripe - Stripe webhook handler'
    ]
  });
});

// Webhook monitoring endpoint (protected)
webhookRoutes.get('/monitoring', async (c) => {
  // This should be protected with admin authentication
  const adminToken = c.req.header('x-admin-token');
  const expectedToken = c.env.CRON_TOKEN; // Reuse cron token for admin access
  
  if (adminToken !== expectedToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    // Get recent webhook activity from database
    const recentActivity = await c.env.DB.prepare(`
      SELECT 
        'stripe_webhook' as event_type,
        'webhook_processed' as action,
        COUNT(*) as count,
        date(created_at) as date
      FROM payment_history 
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY date(created_at)
      ORDER BY date DESC
      LIMIT 7
    `).all();

    // Get subscription statistics
    const subscriptionStats = await c.env.DB.prepare(`
      SELECT 
        subscription_status,
        COUNT(*) as count
      FROM users 
      WHERE subscription_status IS NOT NULL
      GROUP BY subscription_status
    `).all();

    return c.json({
      success: true,
      data: {
        recentWebhookActivity: recentActivity.results,
        subscriptionStats: subscriptionStats.results,
        note: 'Full webhook logs available in Cloudflare Analytics Engine'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to retrieve monitoring data'
    }, 500);
  }
});