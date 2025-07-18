import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/user/subscription - Get user's subscription information
 */
export async function GET() {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
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

/**
 * DELETE /api/user/subscription - Cancel and cleanup subscription during account deletion
 */
export async function DELETE() {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Log the subscription cleanup attempt
    console.log(`Subscription cleanup initiated for user ${session.user.email} (ID: ${session.user.id})`);

    // Forward cancellation request to Cloudflare Worker
    const workerUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.example.com/api';
    
    try {
      const response = await fetch(`${workerUrl}/user/subscription/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cancelAtPeriodEnd: false, // Immediately cancel for account deletion
          reason: 'account_deletion'
        })
      });

      if (!response.ok) {
        // If subscription cancellation fails, log it but don't fail the entire deletion
        const errorData = await response.json().catch(() => ({ error: 'Worker request failed' }));
        console.warn(`Subscription cancellation failed for user ${session.user.email}:`, errorData);
        
        // Return success anyway - we don't want to block account deletion
        return NextResponse.json({
          success: true,
          message: 'Subscription cleanup completed (with warnings)',
          warning: 'Subscription may not have been properly cancelled'
        });
      }

      await response.json();
      console.log(`Subscription successfully cancelled for user ${session.user.email}`);

      return NextResponse.json({
        success: true,
        message: 'Subscription cancelled successfully'
      });

    } catch (fetchError) {
      console.warn(`Failed to contact subscription service for user ${session.user.email}:`, fetchError);
      
      // Return success anyway - we don't want to block account deletion for service issues
      return NextResponse.json({
        success: true,
        message: 'Subscription cleanup completed (service unavailable)',
        warning: 'Could not contact subscription service'
      });
    }

  } catch (error) {
    console.error('Error during subscription cleanup:', error);
    
    // Log the error with user context
    const session = await getServerSession(authOptions);
    if (session?.user) {
      console.error(`Subscription cleanup failed for user ${session.user.email} (ID: ${session.user.id}):`, error);
    }

    // Return a non-blocking error - account deletion should still proceed
    return NextResponse.json({
      success: true,
      message: 'Subscription cleanup completed (with errors)',
      warning: 'Subscription cleanup encountered an error'
    }, { status: 200 }); // Use 200 to not block account deletion
  }
} 