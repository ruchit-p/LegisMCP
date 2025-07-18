import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ 
        authenticated: false,
        message: 'No session found',
        timestamp: new Date().toISOString()
      });
    }
    
    return NextResponse.json({
      authenticated: true,
      sessionData: {
        hasAccessToken: !!session.accessToken,
        hasRefreshToken: !!session.refreshToken,
        hasIdToken: !!session.idToken,
        expiresAt: session.expiresAt,
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          auth0Id: session.user.auth0Id
        }
      },
      // Only include token in development for debugging
      ...(process.env.NODE_ENV === 'development' && {
        accessTokenPreview: session.accessToken ? `${session.accessToken.substring(0, 20)}...` : null
      }),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Auth debug error:', error);
    return NextResponse.json({ 
      authenticated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 