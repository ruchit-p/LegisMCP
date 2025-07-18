import { NextResponse } from 'next/server';
// import { getServerSession } from 'next-auth/next';
// import { authOptions } from '@/lib/auth';
// import Stripe from 'stripe';

// Temporarily disabled for Auth0 testing
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: '2023-10-16',
// });

/**
 * POST /api/user/subscription/cancel - Cancel user subscription
 */
export async function POST() {
  try {
    // Temporarily disabled - returning not implemented
    return NextResponse.json(
      { 
        error: 'TEMPORARILY_DISABLED',
        message: 'Subscription cancellation is temporarily disabled during Auth0 migration' 
      },
      { status: 501 }
    );

    // TODO: Re-implement with Auth0
    // const session = await getServerSession(authOptions);
    // if (!session?.user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}