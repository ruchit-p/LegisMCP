import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { 
  validateStripeConfig, 
  isValidPlan, 
  isValidBillingFrequency, 
  getPriceId, 
  getPlan 
} from '@/lib/stripe-config';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

/**
 * POST /api/checkout - Create Stripe Checkout Session
 */
export async function POST(request: NextRequest) {
  try {
    // Validate Stripe configuration
    const configValidation = validateStripeConfig();
    if (!configValidation.isValid) {
      console.error('Missing Stripe configuration:', configValidation.missingVars);
      return NextResponse.json(
        { error: 'Stripe configuration incomplete' },
        { status: 500 }
      );
    }

    // Get user session
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { planId, billingFrequency } = body;

    // Validate plan and billing frequency
    if (!planId || !billingFrequency) {
      return NextResponse.json(
        { error: 'Plan ID and billing frequency are required' },
        { status: 400 }
      );
    }

    if (!isValidPlan(planId)) {
      return NextResponse.json(
        { error: 'Invalid plan ID' },
        { status: 400 }
      );
    }

    if (!isValidBillingFrequency(billingFrequency)) {
      return NextResponse.json(
        { error: 'Billing frequency must be monthly or yearly' },
        { status: 400 }
      );
    }

    const priceId = getPriceId(planId, billingFrequency);
    if (!priceId) {
      return NextResponse.json(
        { error: 'Price configuration not found' },
        { status: 500 }
      );
    }

    // Create Stripe Checkout Session
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'success_url': `${process.env.AUTH0_BASE_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}&success=true`,
        'cancel_url': `${process.env.AUTH0_BASE_URL}/?canceled=true`,
        'payment_method_types[0]': 'card',
        'mode': 'subscription',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'customer_email': session.user.email!,
        'client_reference_id': session.user.sub,
        'metadata[auth0_user_id]': session.user.sub,
        'metadata[plan_id]': planId,
        'metadata[billing_frequency]': billingFrequency,
        'subscription_data[metadata][auth0_user_id]': session.user.sub,
        'subscription_data[metadata][plan_id]': planId,
        'subscription_data[metadata][billing_frequency]': billingFrequency,
        'allow_promotion_codes': 'true',
        'billing_address_collection': 'required',
        'tax_id_collection[enabled]': 'true',
        'automatic_tax[enabled]': 'true',
      }),
    });

    if (!stripeResponse.ok) {
      const errorText = await stripeResponse.text();
      console.error('Stripe API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    const checkoutSession = await stripeResponse.json();

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id
    });

  } catch (error) {
    console.error('Checkout session creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/checkout - Retrieve checkout session details
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Retrieve session from Stripe
    const stripeResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      },
    });

    if (!stripeResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to retrieve checkout session' },
        { status: 404 }
      );
    }

    const session = await stripeResponse.json();

    return NextResponse.json({
      sessionId: session.id,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_email,
      metadata: session.metadata
    });

  } catch (error) {
    console.error('Checkout session retrieval error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 