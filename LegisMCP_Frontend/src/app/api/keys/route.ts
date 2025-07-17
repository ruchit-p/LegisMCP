import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// MARK: - API Key Management Routes

/**
 * GET /api/keys - List user's API keys (proxy to Cloudflare Worker)
 */
export async function GET() {
    try {
        // Get user session
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get access token from session
        const { accessToken } = session;
        
        // Proxy request to Cloudflare Worker
        const workerUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.example.com') + '/user/keys';
        const response = await fetch(workerUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
            return NextResponse.json(errorData, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to get API keys:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/keys - Create new API key (proxy to Cloudflare Worker)
 */
export async function POST(request: NextRequest) {
    try {
        // Get user session
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get access token from session
        const { accessToken } = session;
        const body = await request.json();

        // Proxy request to Cloudflare Worker
        const workerUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.example.com') + '/user/keys';
        const response = await fetch(workerUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
            return NextResponse.json(errorData, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to create API key:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 