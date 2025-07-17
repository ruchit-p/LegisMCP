import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ 
        authenticated: false,
        message: 'No session found' 
      });
    }
    
    return NextResponse.json({
      authenticated: true,
      user: {
        email: session.user.email,
        name: session.user.name,
        id: session.user.id,
      }
    });
  } catch (error) {
    console.error('Auth test error:', error);
    return NextResponse.json({ 
      authenticated: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}