import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * POST /api/webhooks/stripe - Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    console.error('Missing Stripe configuration');
    return NextResponse.json({ error: 'Webhook configuration error' }, { status: 500 });
  }

  try {
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('Missing Stripe signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify webhook signature using crypto
    let event;
    try {
      // Extract timestamp and signatures from header
      const elements = signature.split(',');
      const timestamp = elements.find(el => el.startsWith('t='))?.split('=')[1];
      const v1Signature = elements.find(el => el.startsWith('v1='))?.split('=')[1];

      if (!timestamp || !v1Signature) {
        throw new Error('Invalid signature format');
      }

      // Create expected signature
      const payload = timestamp + '.' + body;
      const expectedSignature = crypto
        .createHmac('sha256', STRIPE_WEBHOOK_SECRET)
        .update(payload, 'utf8')
        .digest('hex');

      // Compare signatures
      if (expectedSignature !== v1Signature) {
        throw new Error('Signature mismatch');
      }

      // Check timestamp tolerance (5 minutes)
      const currentTime = Math.floor(Date.now() / 1000);
      const webhookTime = parseInt(timestamp);
      if (currentTime - webhookTime > 300) {
        throw new Error('Timestamp too old');
      }

      event = JSON.parse(body);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle successful checkout session
 */
async function handleCheckoutSessionCompleted(session: any) {
  try {
    const auth0UserId = session.metadata?.auth0_user_id;
    const planId = session.metadata?.plan_id;
    const billingFrequency = session.metadata?.billing_frequency;

    if (!auth0UserId) {
      console.error('No Auth0 user ID in checkout session metadata');
      return;
    }

    // Get the subscription from Stripe
    const subscriptionId = session.subscription;
    if (subscriptionId) {
      const stripeResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        },
      });

      if (stripeResponse.ok) {
        const subscription = await stripeResponse.json();
        
        // Update user in backend (Cloudflare Worker)
        await updateUserSubscription(auth0UserId, {
          stripe_customer_id: session.customer,
          subscription_id: subscription.id,
          status: subscription.status,
          plan: planId,
          billing_frequency: billingFrequency,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          amount: subscription.items.data[0]?.price?.unit_amount || 0,
          currency: subscription.items.data[0]?.price?.currency || 'usd',
        });
      }
    }
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

/**
 * Handle subscription changes
 */
async function handleSubscriptionChange(subscription: any) {
  try {
    const auth0UserId = subscription.metadata?.auth0_user_id;
    
    if (!auth0UserId) {
      console.error('No Auth0 user ID in subscription metadata');
      return;
    }

    await updateUserSubscription(auth0UserId, {
      subscription_id: subscription.id,
      status: subscription.status,
      plan: subscription.metadata?.plan_id,
      billing_frequency: subscription.metadata?.billing_frequency,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      amount: subscription.items.data[0]?.price?.unit_amount || 0,
      currency: subscription.items.data[0]?.price?.currency || 'usd',
    });
  } catch (error) {
    console.error('Error handling subscription change:', error);
  }
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDeleted(subscription: any) {
  try {
    const auth0UserId = subscription.metadata?.auth0_user_id;
    
    if (!auth0UserId) {
      console.error('No Auth0 user ID in subscription metadata');
      return;
    }

    await updateUserSubscription(auth0UserId, {
      subscription_id: null,
      status: 'canceled',
      plan: null,
      billing_frequency: null,
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      amount: 0,
      currency: 'usd',
    });
  } catch (error) {
    console.error('Error handling subscription deletion:', error);
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice: any) {
  try {
    console.log('Payment succeeded for invoice:', invoice.id);
    // Additional logic for successful payments if needed
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: any) {
  try {
    console.log('Payment failed for invoice:', invoice.id);
    // Additional logic for failed payments (notifications, retries, etc.)
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

/**
 * Update user subscription in backend
 */
async function updateUserSubscription(auth0UserId: string, subscriptionData: any) {
  try {
    const workerUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://mcp-congress-gov.your-subdomain.workers.dev/api';
    
    // Get M2M token for Auth0 Management API
    const tokenResponse = await fetch(`${process.env.AUTH0_ISSUER_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.AUTH0_M2M_CLIENT_ID,
        client_secret: process.env.AUTH0_M2M_CLIENT_SECRET,
        audience: `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/`,
        grant_type: 'client_credentials',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get M2M token');
    }

    const { access_token } = await tokenResponse.json();

    // Update user in backend worker
    const updateResponse = await fetch(`${workerUrl}/webhooks/stripe/subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`,
      },
      body: JSON.stringify({
        auth0_user_id: auth0UserId,
        subscription: subscriptionData,
      }),
    });

    if (!updateResponse.ok) {
      throw new Error(`Failed to update user subscription: ${updateResponse.statusText}`);
    }

    console.log('Successfully updated user subscription for:', auth0UserId);
  } catch (error) {
    console.error('Error updating user subscription:', error);
    throw error;
  }
} 