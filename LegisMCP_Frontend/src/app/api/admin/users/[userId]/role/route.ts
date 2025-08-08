import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Helper function to check if user is admin
async function isUserAdmin(): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return false;

    const userEmail = session.user.email;
    
    // Mock admin check - replace with actual database query
    const adminEmails = [
      'admin@example.com',
      'your-admin-email@example.com'
    ];
    
    const adminDomains: string[] = [];
    
    return adminEmails.includes(userEmail) || 
           adminDomains.some(domain => userEmail.endsWith(domain));
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

export const PUT = async (req: NextRequest, { params }: { params: { userId: string } }) => {
  try {
    // Check if user is admin
    const isAdmin = await isUserAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { userId } = params;
    const body = await req.json();
    const { role } = body;

    // Validate role
    const validRoles = ['user', 'admin', 'super_admin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: user, admin, super_admin' },
        { status: 400 }
      );
    }

    // Get current user session to prevent self-demotion
    const session = await getServerSession(authOptions);
    if (session?.user?.id === userId && role === 'user') {
      return NextResponse.json(
        { error: 'Cannot demote yourself from admin role' },
        { status: 400 }
      );
    }

    // Mock update - replace with actual database update
    console.log(`Updating user ${userId} role to ${role}`);
    
    // In production, this would be a database update like:
    // await updateUserRole(userId, role);
    
    // Mock success response
    return NextResponse.json({
      success: true,
      message: `User role updated to ${role}`,
      data: {
        userId,
        role,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

export const runtime = 'nodejs';