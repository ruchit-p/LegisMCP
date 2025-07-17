import { NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

/**
 * POST /api/billing/portal - Create Stripe Customer Portal Session
 */
export async function POST() {
  try {
    if (!STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe configuration not available' },
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

    // Get user's Stripe customer ID from the Cloudflare Worker
    const workerUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.example.com/api';
    const userResponse = await fetch(`${workerUrl}/user/profile`, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    const userData = await userResponse.json();
    const customerId = userData.stripe_customer_id;

    if (!customerId) {
      return NextResponse.json(
        { error: 'No customer ID found. Please subscribe to a plan first.' },
        { status: 400 }
      );
    }

    // Create Stripe Customer Portal Session
    const stripeResponse = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'customer': customerId,
        'return_url': `${process.env.AUTH0_BASE_URL}/dashboard`,
      }),
    });

    if (!stripeResponse.ok) {
      const errorText = await stripeResponse.text();
      console.error('Stripe Customer Portal error:', errorText);
      return NextResponse.json(
        { error: 'Failed to create billing portal session' },
        { status: 500 }
      );
    }

    const portalSession = await stripeResponse.json();

    return NextResponse.json({
      url: portalSession.url
    });

  } catch (error) {
    console.error('Billing portal creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 