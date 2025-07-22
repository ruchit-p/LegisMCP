import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { plan = 'developer' } = body;

    // Call the LegisAPI webhook endpoint directly
    const workerUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8789') + '/api';
    
    const updateResponse = await fetch(`${workerUrl}/webhooks/stripe/subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth0_user_id: session.user.id,
        subscription: {
          subscription_id: `test_sub_${Date.now()}`,
          stripe_customer_id: `test_cus_${Date.now()}`,
          status: 'active',
          plan: plan,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      }),
    });

    const result = await updateResponse.json();

    if (!updateResponse.ok) {
      return NextResponse.json({ 
        error: 'Failed to update subscription', 
        details: result 
      }, { status: updateResponse.status });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Test subscription update sent',
      result 
    });

  } catch (error) {
    console.error('Test subscription update error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}