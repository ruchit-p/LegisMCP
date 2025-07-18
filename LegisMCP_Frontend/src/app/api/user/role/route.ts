import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const GET = async () => {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    const accessToken = session.accessToken;

    // Try to get user profile from backend API
    let userRole: 'user' | 'admin' = 'user';
    
    try {
      // Use the same backend API pattern as other routes
      const workerUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.example.com') + '/api';
      
      const response = await fetch(`${workerUrl}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        // Backend should return user data with role
        userRole = userData.role || getUserRole(userEmail);
      } else if (response.status === 404) {
        // User doesn't exist in backend, use fallback role logic
        userRole = getUserRole(userEmail);
        
        // Optionally create user in backend (if backend supports it)
        try {
          await fetch(`${workerUrl}/user/profile`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              auth0_user_id: userId,
              email: userEmail,
              name: session.user.name,
              role: userRole,
              plan: 'free'
            })
          });
        } catch (createError) {
          console.warn('Failed to create user in backend:', createError);
        }
      } else {
        // Backend error, fall back to email-based role checking
        console.warn(`Backend returned ${response.status}, using fallback role logic`);
        userRole = getUserRole(userEmail);
      }
    } catch (error) {
      console.error('Backend API error, falling back to email-based role checking:', error);
      userRole = getUserRole(userEmail);
    }

    return NextResponse.json({
      success: true,
      data: {
        userId,
        email: userEmail,
        role: userRole
      }
    });

  } catch (error) {
    console.error('Error fetching user role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

// Mock function to determine user role
// Replace this with actual database query in production
function getUserRole(email: string): 'user' | 'admin' {
  // Check if user is admin based on email domain or specific emails
  const adminEmails = [
    'admin@legismcp.com',
    'admin@example.com',
    'your-admin-email@example.com'
  ];
  
  const adminDomains = [
    '@legismcp.com'
  ];
  
  // Check specific admin emails
  if (adminEmails.includes(email)) {
    return 'admin';
  }
  
  // Check admin domains
  if (adminDomains.some(domain => email.endsWith(domain))) {
    return 'admin';
  }
  
  // Default to user role
  return 'user';
}

export const runtime = 'nodejs';