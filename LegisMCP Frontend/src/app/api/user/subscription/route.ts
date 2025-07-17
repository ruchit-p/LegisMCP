import { NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';

/**
 * GET /api/user/subscription - Get user's subscription information
 */
export async function GET() {
  try {
    // Get user session
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Forward request to Cloudflare Worker
    const workerUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.example.com/api';
    const response = await fetch(`${workerUrl}/user/profile`, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Worker request failed' }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const userData = await response.json();
    
    // Transform the subscription data for the frontend
    const subscription = userData.subscription ? {
      id: userData.subscription.id || 'unknown',
      status: userData.subscription.status,
      planName: userData.subscription.plan || 'Unknown',
      billingFrequency: userData.subscription.billing_frequency || 'monthly',
      currentPeriodStart: userData.subscription.current_period_start,
      currentPeriodEnd: userData.subscription.current_period_end,
      cancelAtPeriodEnd: userData.subscription.cancel_at_period_end || false,
      amount: userData.subscription.amount || 0,
      currency: userData.subscription.currency || 'usd'
    } : null;

    return NextResponse.json({
      subscription
    });

  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 