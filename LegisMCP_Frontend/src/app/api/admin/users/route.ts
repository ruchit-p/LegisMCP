import { NextRequest, NextResponse } from 'next/server';
import { withApiAuthRequired } from '@auth0/nextjs-auth0';
import { getSession } from '@auth0/nextjs-auth0';

// Helper function to check if user is admin
async function isUserAdmin(): Promise<boolean> {
  try {
    const session = await getSession();
    if (!session?.user) return false;

    const userEmail = session.user.email;
    
    // Mock admin check - replace with actual database query
    const adminEmails = [
      'admin@legismcp.com',
      'admin@example.com',
      'your-admin-email@example.com'
    ];
    
    const adminDomains = [
      '@legismcp.com'
    ];
    
    return adminEmails.includes(userEmail) || 
           adminDomains.some(domain => userEmail.endsWith(domain));
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

export const GET = withApiAuthRequired(async (req: NextRequest) => {
  try {
    // Check if user is admin
    const isAdmin = await isUserAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const role = searchParams.get('role') || 'all';

    // Mock users data - replace with actual database query
    const mockUsers = [
      {
        id: 1,
        auth0_user_id: 'auth0|user1',
        email: 'john@example.com',
        name: 'John Doe',
        role: 'user',
        plan: 'professional',
        api_calls_count: 1245,
        api_calls_limit: 10000,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-07T10:30:00Z'
      },
      {
        id: 2,
        auth0_user_id: 'auth0|user2',
        email: 'jane@example.com',
        name: 'Jane Smith',
        role: 'user',
        plan: 'starter',
        api_calls_count: 567,
        api_calls_limit: 1000,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-07T09:15:00Z'
      },
      {
        id: 3,
        auth0_user_id: 'auth0|admin1',
        email: 'admin@legismcp.com',
        name: 'Admin User',
        role: 'admin',
        plan: 'enterprise',
        api_calls_count: 2345,
        api_calls_limit: 50000,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-07T10:45:00Z'
      }
    ];

    // Filter by role if specified
    let filteredUsers = mockUsers;
    if (role !== 'all') {
      filteredUsers = mockUsers.filter(user => user.role === role);
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      data: {
        users: paginatedUsers,
        pagination: {
          page,
          limit,
          total: filteredUsers.length,
          totalPages: Math.ceil(filteredUsers.length / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const runtime = 'nodejs';