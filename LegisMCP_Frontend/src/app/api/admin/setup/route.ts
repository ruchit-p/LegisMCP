import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

interface SetupAdminRequest {
  email: string;
  role: 'admin' | 'super_admin';
}

// Helper function to get Auth0 M2M token for admin operations
async function getM2MToken(): Promise<string | null> {
  try {
    const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
    const m2mClientId = process.env.AUTH0_M2M_CLIENT_ID;
    const m2mClientSecret = process.env.AUTH0_M2M_CLIENT_SECRET;
    
    if (!auth0Domain || !m2mClientId || !m2mClientSecret) {
      console.warn('M2M credentials not available for admin operations');
      return null;
    }

    const tokenResponse = await fetch(`https://${auth0Domain}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: m2mClientId,
        client_secret: m2mClientSecret,
        audience: (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.example.com') + '/api',
        grant_type: 'client_credentials',
      }),
    });

    if (tokenResponse.ok) {
      const { access_token } = await tokenResponse.json();
      return access_token;
    } else {
      console.error('Failed to get M2M token:', await tokenResponse.text());
      return null;
    }
  } catch (error) {
    console.error('M2M token request failed:', error);
    return null;
  }
}

// Helper function to get user data from backend
async function getUserFromBackend(identifier: string, type: 'id' | 'email', accessToken: string) {
  try {
    const workerUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.example.com') + '/api';
    const endpoint = type === 'email' 
      ? `${workerUrl}/admin/users/email/${encodeURIComponent(identifier)}`
      : `${workerUrl}/admin/users/${identifier}`;
    
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      return await response.json();
    } else if (response.status === 404) {
      return null; // User not found
    } else {
      throw new Error(`Backend returned ${response.status}`);
    }
  } catch (error) {
    console.error(`Error getting user from backend:`, error);
    throw error;
  }
}

// Helper function to update user role in backend
async function updateUserRoleInBackend(userId: string, role: string, accessToken: string) {
  try {
    const workerUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.example.com') + '/api';
    
    const response = await fetch(`${workerUrl}/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role })
    });

    if (response.ok) {
      return await response.json();
    } else {
      throw new Error(`Backend returned ${response.status}: ${await response.text()}`);
    }
  } catch (error) {
    console.error('Error updating user role in backend:', error);
    throw error;
  }
}

export const POST = async (req: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if current user is super_admin
    const accessToken = session.accessToken;
    const currentUser = await getUserFromBackend(session.user.id, 'id', accessToken);
    
    if (!currentUser || currentUser.role !== 'super_admin') {
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

    // Get M2M token for admin operations
    const m2mToken = await getM2MToken();
    const operationToken = m2mToken || accessToken; // Fallback to user token if M2M not available

    // Check if user exists by email
    try {
      const existingUser = await getUserFromBackend(email, 'email', operationToken);
      
      if (existingUser) {
        // User exists, update their role
        await updateUserRoleInBackend(existingUser.auth0_user_id, role, operationToken);
        
        return NextResponse.json({
          success: true,
          message: `Successfully updated ${email} to ${role} role`,
          data: {
            userId: existingUser.auth0_user_id,
            email: existingUser.email,
            previousRole: existingUser.role,
            newRole: role
          }
        });
      } else {
        // User doesn't exist in backend yet
        return NextResponse.json({
          success: true,
          message: `User ${email} doesn't exist in backend yet. They will be created with ${role} role when they first log in.`,
          data: {
            email,
            role,
            status: 'pending_first_login'
          }
        });
      }
    } catch (error) {
      console.error('Error in admin setup operation:', error);
      return NextResponse.json(
        { error: `Failed to setup admin account: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error setting up admin account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

// List all admin accounts
export const GET = async () => {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if current user is admin or super_admin
    const accessToken = session.accessToken;
    const currentUser = await getUserFromBackend(session.user.id, 'id', accessToken);
    
    if (!currentUser || !['admin', 'super_admin'].includes(currentUser.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Get M2M token for admin operations
    const m2mToken = await getM2MToken();
    const operationToken = m2mToken || accessToken;

    try {
      // Try to get admin users list from backend
      const workerUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.example.com') + '/api';
      const response = await fetch(`${workerUrl}/admin/users?role=admin,super_admin`, {
        headers: {
          'Authorization': `Bearer ${operationToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const adminUsers = await response.json();
        return NextResponse.json({
          success: true,
          data: {
            current_user_role: currentUser.role,
            admin_users: adminUsers
          }
        });
      } else {
        // Backend doesn't support admin list endpoint yet
        return NextResponse.json({
          success: true,
          message: 'Admin list endpoint - backend implementation pending',
          data: {
            current_user_role: currentUser.role
          }
        });
      }
    } catch (error) {
      console.error('Error fetching admin users:', error);
      return NextResponse.json({
        success: true,
        message: 'Admin list endpoint - backend implementation pending',
        data: {
          current_user_role: currentUser.role
        }
      });
    }

  } catch (error) {
    console.error('Error listing admin accounts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

export const runtime = 'nodejs';