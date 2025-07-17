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