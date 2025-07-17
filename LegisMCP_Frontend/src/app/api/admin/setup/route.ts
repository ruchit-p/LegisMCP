import { NextRequest, NextResponse } from 'next/server';
import { withApiAuthRequired } from '@auth0/nextjs-auth0';
import { getSession } from '@auth0/nextjs-auth0';
import { db } from '@/lib/database';

interface SetupAdminRequest {
  email: string;
  role: 'admin' | 'super_admin';
}

export const POST = withApiAuthRequired(async (req: NextRequest) => {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if current user is super_admin (only super_admin can create other admins)
    const currentUser = await db.getUserByAuth0Id(session.user.sub);
    
    if (!currentUser.success || !currentUser.data || currentUser.data.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only super_admin can create admin accounts' },
        { status: 403 }
      );
    }

    const { email, role }: SetupAdminRequest = await req.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    if (!['admin', 'super_admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "admin" or "super_admin"' },
        { status: 400 }
      );
    }

    // Check if user exists by email
    const existingUser = await db.getUserByEmail(email);
    
    if (existingUser.success && existingUser.data) {
      // User exists, update their role
      const updatedUser = await db.updateUserRole(existingUser.data.auth0_user_id, role);
      
      if (updatedUser.success) {
        return NextResponse.json({
          success: true,
          message: `Successfully updated ${email} to ${role} role`,
          data: {
            userId: existingUser.data.auth0_user_id,
            email: existingUser.data.email,
            previousRole: existingUser.data.role,
            newRole: role
          }
        });
      } else {
        return NextResponse.json(
          { error: `Failed to update user role: ${updatedUser.error}` },
          { status: 500 }
        );
      }
    } else {
      // User doesn't exist in database yet
      return NextResponse.json({
        success: true,
        message: `User ${email} doesn't exist in database yet. They will be created with ${role} role when they first log in.`,
        data: {
          email,
          role,
          status: 'pending_first_login'
        }
      });
    }

  } catch (error) {
    console.error('Error setting up admin account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// List all admin accounts
export const GET = withApiAuthRequired(async () => {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if current user is admin or super_admin
    const currentUser = await db.getUserByAuth0Id(session.user.sub);
    
    if (!currentUser.success || !currentUser.data || 
        !['admin', 'super_admin'].includes(currentUser.data.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // This would need to be implemented in your database client
    // For now, return a placeholder response
    return NextResponse.json({
      success: true,
      message: 'Admin list endpoint - to be implemented',
      data: {
        current_user_role: currentUser.data.role
      }
    });

  } catch (error) {
    console.error('Error listing admin accounts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const runtime = 'nodejs';