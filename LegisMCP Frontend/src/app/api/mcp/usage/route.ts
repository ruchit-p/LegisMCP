import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0/edge';

// Fetch real MCP usage data from Cloudflare Worker
const getMCPUsageData = async (accessToken: string) => {
  try {
    // Use the Cloudflare Worker URL from env or default
    const workerUrl = process.env.CLOUDFLARE_WORKER_URL || 'https://legis-api.dyanstyplatforms.workers.dev';
    
    // Fetch user data and MCP logs from Cloudflare Worker using the Auth0 access token
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    };
    
    // Get user's subscription details and usage
    const userResponse = await fetch(`${workerUrl}/api/user/profile`, {
      headers,
      method: 'GET'
    });
    
    if (!userResponse.ok) {
      console.error('User profile response:', userResponse.status, await userResponse.text());
      throw new Error('Failed to fetch user data');
    }
    
    const userData = await userResponse.json();
    
    // Get MCP usage logs
    const usageResponse = await fetch(`${workerUrl}/api/mcp/logs?days=30&limit=20`, {
      headers,
      method: 'GET'
    });
    
    if (!usageResponse.ok) {
      console.error('MCP logs response:', usageResponse.status, await usageResponse.text());
      throw new Error('Failed to fetch usage logs');
    }
    
    const usageLogs = await usageResponse.json();
    
    // Map the data to our expected format
    const plan = userData.plan_slug || 'free';
    const planLimits = {
      free: 100,
      starter: 1000,
      professional: 10000,
      enterprise: -1 // unlimited
    };
    
    const limit = userData.mcp_calls_limit || planLimits[plan as keyof typeof planLimits] || 100;
    const isUnlimited = limit === -1;
    
    // Calculate reset date based on subscription period
    let resetDate = null;
    if (userData.subscription_period_end && !isUnlimited) {
      resetDate = userData.subscription_period_end;
    } else if (userData.api_calls_reset_at) {
      resetDate = userData.api_calls_reset_at;
    }
    
    // Transform MCP logs to our format
    const usage = (usageLogs.logs || []).map((log: any) => ({
      id: `call_${log.id}`,
      timestamp: log.timestamp,
      tool: log.tool_name,
      status: log.status as 'success' | 'error',
      responseTime: log.response_time_ms || 0,
      error: log.error_message
    }));
    
    return {
      plan: userData.plan_name || 'Free',
      callsUsed: userData.api_calls_count || 0,
      callsLimit: isUnlimited ? Infinity : limit,
      isUnlimited,
      resetDate,
      usage,
      // Additional stats from the API response
      stats: usageLogs.stats,
      topTools: usageLogs.topTools
    };
  } catch (error) {
    console.error('Error fetching MCP usage data:', error);
    
    // Return default data on error
    return {
      plan: 'free',
      callsUsed: 0,
      callsLimit: 100,
      isUnlimited: false,
      resetDate: null,
      usage: []
    };
  }
};

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request as any, new NextResponse());
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the access token from the session
    // The access token is needed to authenticate with the Cloudflare Worker API
    const accessToken = session.accessToken;
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token found' },
        { status: 401 }
      );
    }
    
    const usageData = await getMCPUsageData(accessToken);

    return NextResponse.json(usageData);
  } catch (error) {
    console.error('Error fetching MCP usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}