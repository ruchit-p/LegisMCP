import { NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0/edge';
import Stripe from 'stripe';

// MARK: - Types
interface StripeSubscriptionResponse {
  id: string;
  cancel_at_period_end: boolean;
  current_period_end?: number;
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function POST() {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's Stripe customer ID from your backend
    // For now, we'll mock this
    const customerId = session.user.stripeCustomerId;
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    // Cancel at period end
    const updatedSubscription: Stripe.Subscription = await stripe.subscriptions.update(
      subscriptions.data[0].id,
      {
        cancel_at_period_end: true,
      }
    );

    return NextResponse.json({
      success: true,
      subscription: {
        id: updatedSubscription.id,
        cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
        currentPeriodEnd: (updatedSubscription as StripeSubscriptionResponse).current_period_end ? new Date((updatedSubscription as StripeSubscriptionResponse).current_period_end * 1000).toISOString() : null,
      },
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}