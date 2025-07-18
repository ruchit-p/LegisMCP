import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// MARK: - GET /api/api-key-feedback

/**
 * Get API key feedback statistics
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.accessToken) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Call the LegisAPI backend
        const response = await fetch(`${process.env.LEGIS_API_URL}/api/api-key-feedback/stats`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${session.accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('LegisAPI feedback stats error:', errorText);
            return NextResponse.json(
                { error: 'Failed to fetch feedback statistics' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching API key feedback stats:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// MARK: - POST /api/api-key-feedback

/**
 * Submit API key feedback (thumbs up/down)
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.accessToken) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const body = await request.json();
        
        // Validate request body
        if (typeof body.thumbs_up !== 'boolean') {
            return NextResponse.json(
                { error: 'Invalid request: thumbs_up must be a boolean' },
                { status: 400 }
            );
        }

        // Call the LegisAPI backend
        const response = await fetch(`${process.env.LEGIS_API_URL}/api/api-key-feedback`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('LegisAPI feedback submission error:', errorData);
            
            // Forward specific error messages
            if (response.status === 409) {
                return NextResponse.json(
                    { error: errorData.message || 'You have already provided feedback for this feature' },
                    { status: 409 }
                );
            }
            
            return NextResponse.json(
                { error: errorData.message || 'Failed to submit feedback' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error submitting API key feedback:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 