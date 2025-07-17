import { NextResponse } from 'next/server';
import { withApiAuthRequired } from '@auth0/nextjs-auth0';
import { getSession } from '@auth0/nextjs-auth0';
import { db } from '@/lib/database';

export const GET = withApiAuthRequired(async () => {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.sub;
    const userEmail = session.user.email;

    // Try to get user from database first
    let userRole: 'user' | 'admin' | 'super_admin' = 'user';
    
    try {
      const dbUser = await db.getUserByAuth0Id(userId);
      
      if (dbUser.success && dbUser.data) {
        userRole = dbUser.data.role;
      } else {
        // If user doesn't exist in database, create them and use fallback role logic
        const fallbackRole = getUserRole(userEmail);
        
        const newUser = await db.createUser({
          auth0_user_id: userId,
          email: userEmail,
          name: session.user.name,
          role: fallbackRole,
          plan: 'free'
        });
        
        if (newUser.success && newUser.data) {
          userRole = newUser.data.role;
        } else {
          // Fallback to email-based role checking if database fails
          userRole = fallbackRole;
        }
      }
    } catch (error) {
      console.error('Database error, falling back to email-based role checking:', error);
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
});

// Mock function to determine user role
// Replace this with actual database query in production
function getUserRole(email: string): 'user' | 'admin' | 'super_admin' {
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