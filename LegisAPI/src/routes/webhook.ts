import { Hono } from 'hono';
import { StripeService } from '../services/stripe';
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

    // Handle the event
    await stripeService.handleWebhookEvent(event);

    // Return 200 OK to acknowledge receipt
    return c.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    // Return 200 to prevent Stripe from retrying
    return c.json({ error: 'Webhook processing failed', received: true });
  }
});