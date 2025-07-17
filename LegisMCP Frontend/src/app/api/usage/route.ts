import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';

// MARK: - Usage Tracking Routes

/**
 * GET /api/usage - Get user's usage statistics
 */
export async function GET(request: NextRequest) {
    try {
        // Get user session
        const session = await getSession();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const days = searchParams.get('days') || '30';
        
        // Validate days parameter
        const daysNumber = parseInt(days);
        if (isNaN(daysNumber) || daysNumber < 1 || daysNumber > 365) {
            return NextResponse.json(
                { error: 'Days must be between 1 and 365' },
                { status: 400 }
            );
        }

        // Forward request to Cloudflare Worker
        const workerUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://mcp-congress-gov.your-subdomain.workers.dev/api';
        const workerResponse = await fetch(`${workerUrl}/usage?days=${days}`, {
            headers: {
                'Authorization': `Bearer ${session.accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!workerResponse.ok) {
            const errorData = await workerResponse.json().catch(() => ({ error: 'Worker request failed' }));
            return NextResponse.json(errorData, { status: workerResponse.status });
        }

        const data = await workerResponse.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Failed to get usage stats:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 