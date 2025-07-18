import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserProfile, createAuth0ErrorResponse, Auth0Error } from '@/lib/auth0';

// MARK: - Auth0 Management API Integration
// Note: This would typically be in a backend service, but for demonstration
// we'll create a simplified version here. In production, consider moving
// this to a dedicated backend API that handles Auth0 Management operations.

interface Auth0ManagementConfig {
    domain: string;
    clientId: string;
    clientSecret: string;
}

interface UserUpdates {
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
    name?: string;
    nickname?: string;
    picture?: string;
    given_name?: string;
    family_name?: string;
}

class Auth0ManagementClient {
    private config: Auth0ManagementConfig;
    private accessToken: string | null = null;
    private tokenExpiry: number = 0;

    constructor() {
        this.config = {
            domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN!,
            clientId: process.env.AUTH0_M2M_CLIENT_ID!,
            clientSecret: process.env.AUTH0_M2M_CLIENT_SECRET!
        };
    }

    private async getAccessToken(): Promise<string> {
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        const response = await fetch(`https://${this.config.domain}/oauth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                audience: `https://${this.config.domain}/api/v2/`,
                grant_type: 'client_credentials'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get Auth0 Management API token');
        }

        const data = await response.json();
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer
        
        return this.accessToken;
    }

    async updateUser(userId: string, updates: UserUpdates) {
        const token = await this.getAccessToken();
        
        const response = await fetch(`https://${this.config.domain}/api/v2/users/${userId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update user profile');
        }

        return response.json();
    }
}

const managementClient = new Auth0ManagementClient();

// MARK: - User Profile API Routes

/**
 * GET /api/user/profile - Get current user profile
 */
export async function GET(request: NextRequest) {
    try {
        // Extract request metadata for logging
        const userAgent = request.headers.get('user-agent') || 'Unknown';
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown';
        
        // Get user session
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            const errorResponse = createAuth0ErrorResponse(Auth0Error.UNAUTHORIZED);
            return NextResponse.json(errorResponse, { status: errorResponse.statusCode });
        }

        // Get user profile
        const profile = await getUserProfile();
        if (!profile) {
            const errorResponse = createAuth0ErrorResponse(Auth0Error.INVALID_TOKEN);
            return NextResponse.json(errorResponse, { status: errorResponse.statusCode });
        }

        // Log profile access for audit purposes
        console.log(`Profile accessed by user ${session.user.email} from IP ${ip} with User-Agent: ${userAgent}`);

        return NextResponse.json({ 
            profile,
            success: true 
        });
    } catch (error) {
        console.error('Failed to get user profile:', error);
        return NextResponse.json(
            { error: 'Internal server error', success: false },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/user/profile - Update user profile using Auth0 Management API
 */
export async function PUT(request: NextRequest) {
    try {
        // Get user session
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            const errorResponse = createAuth0ErrorResponse(Auth0Error.UNAUTHORIZED);
            return NextResponse.json(errorResponse, { status: errorResponse.statusCode });
        }

        // Get request body
        const body = await request.json();
        const { name, nickname, given_name, family_name, picture, user_metadata } = body;

        // Validate input
        const updates: UserUpdates = {};
        
        if (name !== undefined) {
            if (typeof name !== 'string') {
                return NextResponse.json(
                    { error: 'Name must be a string', success: false },
                    { status: 400 }
                );
            }
            updates.name = name;
        }

        if (nickname !== undefined) {
            if (typeof nickname !== 'string') {
                return NextResponse.json(
                    { error: 'Nickname must be a string', success: false },
                    { status: 400 }
                );
            }
            updates.nickname = nickname;
        }

        if (given_name !== undefined) {
            if (typeof given_name !== 'string') {
                return NextResponse.json(
                    { error: 'Given name must be a string', success: false },
                    { status: 400 }
                );
            }
            updates.given_name = given_name;
        }

        if (family_name !== undefined) {
            if (typeof family_name !== 'string') {
                return NextResponse.json(
                    { error: 'Family name must be a string', success: false },
                    { status: 400 }
                );
            }
            updates.family_name = family_name;
        }

        if (picture !== undefined) {
            if (typeof picture !== 'string') {
                return NextResponse.json(
                    { error: 'Picture must be a string URL', success: false },
                    { status: 400 }
                );
            }
            // Validate URL
            try {
                new URL(picture);
                updates.picture = picture;
            } catch {
                return NextResponse.json(
                    { error: 'Picture must be a valid URL', success: false },
                    { status: 400 }
                );
            }
        }

        if (user_metadata !== undefined) {
            if (typeof user_metadata !== 'object' || user_metadata === null) {
                return NextResponse.json(
                    { error: 'User metadata must be an object', success: false },
                    { status: 400 }
                );
            }
            updates.user_metadata = user_metadata;
        }

        // If no updates provided, return current profile
        if (Object.keys(updates).length === 0) {
            const profile = await getUserProfile();
            return NextResponse.json({ 
                profile,
                success: true,
                message: 'No updates provided' 
            });
        }

        // Update user profile using Auth0 Management API
        const updatedUser = await managementClient.updateUser(session.user.id, updates);
        
        // Return updated profile
        return NextResponse.json({ 
            profile: {
                id: updatedUser.user_id,
                email: updatedUser.email,
                name: updatedUser.name,
                nickname: updatedUser.nickname,
                given_name: updatedUser.given_name,
                family_name: updatedUser.family_name,
                picture: updatedUser.picture,
                emailVerified: updatedUser.email_verified,
                updatedAt: updatedUser.updated_at,
                user_metadata: updatedUser.user_metadata
            },
            success: true,
            message: 'Profile updated successfully' 
        });
    } catch (error) {
        console.error('Failed to update user profile:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error', success: false },
            { status: 500 }
        );
    }
} 