# Admin Account Setup Guide

This guide explains how to set up admin accounts for the LegisMCP Frontend application using the database-based role system.

## Prerequisites

1. **Auth0 Account**: You need an Auth0 account with the application configured
2. **Database Access**: The LegisAPI database must be running and accessible
3. **Environment Variables**: Ensure all required environment variables are set

## Setup Methods

### Method 1: Using the Admin Setup UI (Recommended)

1. **Log in as Super Admin**: First, you need at least one super admin account
2. **Access Admin Dashboard**: Navigate to `/admin/dashboard`
3. **Go to Settings Tab**: Click on the Settings tab in the admin dashboard
4. **Use Admin Setup Component**: Use the admin setup form to create new admin accounts

### Method 2: Using the Command Line Script

```bash
# Navigate to the frontend directory
cd LegisMCP_Frontend

# Install dependencies if not already installed
npm install

# Run the setup script
npm run setup-admin <email> <role>

# Examples:
npm run setup-admin admin@yourdomain.com admin
npm run setup-admin superuser@yourdomain.com super_admin
```

### Method 3: Using the API Endpoint

```bash
# POST request to create admin account
curl -X POST http://localhost:3000/api/admin/setup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-auth-token>" \
  -d '{
    "email": "admin@yourdomain.com",
    "role": "admin"
  }'
```

## Initial Super Admin Setup

For the very first super admin, you'll need to use the email-based fallback system:

1. **Update the Role Route**: Edit `/src/app/api/user/role/route.ts`
2. **Add Your Email**: Add your email to the `adminEmails` array or `adminDomains` array
3. **Set as Super Admin**: Temporarily modify the `getUserRole` function to return `'super_admin'` for your email
4. **Log In**: Sign up/log in with your Auth0 account using that email
5. **Create Other Admins**: Use the admin setup UI to create other admin accounts
6. **Remove Fallback**: Once you have proper admin accounts, remove the hardcoded email from the fallback system

### Example Initial Setup

```typescript
// In /src/app/api/user/role/route.ts
function getUserRole(email: string): 'user' | 'admin' | 'super_admin' {
  // Temporary super admin for initial setup
  if (email === 'your-email@yourdomain.com') {
    return 'super_admin';
  }
  
  // Regular admin emails
  const adminEmails = [
    'admin@legismcp.com',
    'admin@yourdomain.com'
  ];
  
  const adminDomains = [
    '@legismcp.com',
    '@yourdomain.com'  // Your domain
  ];
  
  // Check specific admin emails
  if (adminEmails.includes(email)) {
    return 'admin';
  }
  
  // Check admin domains
  if (adminDomains.some(domain => email.endsWith(domain))) {
    return 'admin';
  }
  
  return 'user';
}
```

## Role Hierarchy

- **User**: Standard user with basic access
- **Admin**: Access to admin dashboard, user management, and analytics
- **Super Admin**: Full system access including creating other admins

## Environment Variables

Make sure these environment variables are configured:

```env
# LegisAPI connection
LEGIS_API_URL=http://localhost:8789
LEGIS_API_TOKEN=your-api-token

# Auth0 configuration
AUTH0_SECRET=your-auth0-secret
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
```

## Database Schema

The user roles are stored in the `users` table:

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auth0_user_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
    plan TEXT DEFAULT 'free',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Testing Admin Access

1. **Create Admin Account**: Use one of the methods above
2. **Log Out**: Sign out of your current session
3. **Log In as Admin**: Sign in with the admin email
4. **Access Admin Dashboard**: Navigate to `/admin/dashboard`
5. **Verify Permissions**: Ensure you can access all admin features

## Security Considerations

- **Super Admin Limit**: Only create super admin accounts for trusted users
- **Regular Audits**: Periodically review admin accounts and remove unused ones
- **Email Verification**: Ensure admin emails are verified in Auth0
- **Access Logs**: Monitor admin access through the usage analytics

## Troubleshooting

### Common Issues

1. **"Access Denied" Error**: 
   - Check that the user's role is correctly set in the database
   - Verify Auth0 user ID matches the database entry
   - Ensure environment variables are correctly configured

2. **Database Connection Issues**:
   - Verify `LEGIS_API_URL` and `LEGIS_API_TOKEN` are set
   - Check that the LegisAPI server is running
   - Ensure database schema is up to date

3. **Auth0 Integration Issues**:
   - Verify Auth0 configuration
   - Check callback URLs are correctly set
   - Ensure user is properly authenticated

### Debug Steps

1. **Check User Role API**: Visit `/api/user/role` to see current user's role
2. **Inspect Database**: Check the `users` table for the user's entry
3. **Review Logs**: Check browser console and server logs for errors
4. **Test with Fallback**: Temporarily use email-based fallback for testing

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the console logs for error messages
3. Verify all environment variables are correctly set
4. Test the database connection independently