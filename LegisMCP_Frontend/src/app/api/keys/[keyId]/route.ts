import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// MARK: - Individual API Key Routes

/**
 * DELETE /api/keys/[keyId] - Deactivate API key
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { keyId: string } }
) {
    try {
        // Get user session
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const keyId = params.keyId;

        // Validate keyId
        if (!keyId || typeof keyId !== 'string') {
            return NextResponse.json(
                { error: 'Invalid key ID' },
                { status: 400 }
            );
        }

        // Forward request to Cloudflare Worker
        const workerUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.example.com';
        const workerResponse = await fetch(`${workerUrl}/keys/${keyId}`, {
            method: 'DELETE',
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
        console.error('Failed to deactivate API key:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 