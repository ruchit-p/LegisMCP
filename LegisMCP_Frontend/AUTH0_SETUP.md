# Auth0 Setup Guide for LegislativeMCP Frontend

## Overview

This guide walks you through setting up Auth0 authentication for the LegislativeMCP Next.js frontend application.

## Prerequisites

- Auth0 account and tenant
- Next.js application (already set up)
- Environment variables configured

## 1. Auth0 Application Configuration

### Create Auth0 Application

1. Go to your Auth0 Dashboard
2. Create a new **Single Page Application**
3. Configure the following settings:

#### Application Settings

- **Name**: LegislativeMCP Frontend
- **Application Type**: Single Page Application
- **Token Endpoint Authentication Method**: None

#### URLs Configuration

```bash
# Allowed Callback URLs
http://localhost:3000/api/auth/callback
https://your-production-domain.com/api/auth/callback

# Allowed Logout URLs
http://localhost:3000
https://your-production-domain.com

# Allowed Web Origins
http://localhost:3000
https://your-production-domain.com

# Allowed Origins (CORS)
http://localhost:3000
https://your-production-domain.com
```

## 2. Environment Variables Setup

### Create .env.local file

Copy the `environment.template` file to `.env.local`:

```bash
cp environment.template .env.local
```

### Fill in the required values:

```bash
# Generate a secure secret
AUTH0_SECRET=$(openssl rand -hex 32)

# Your Auth0 configuration
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://your-auth0-domain.auth0.com
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret

# Stripe configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key

# MCP Server URL
NEXT_PUBLIC_MCP_SERVER_URL=http://localhost:8080
```

## 3. Auth0 Routes Created

The following Auth0 routes have been automatically created:

### API Routes

- **`/api/auth/[...auth0]`** - Handles all Auth0 authentication flows
  - `GET /api/auth/login` - Initiates login flow
  - `GET /api/auth/logout` - Handles logout
  - `GET /api/auth/callback` - Auth0 callback handler
  - `GET /api/auth/me` - Returns current user info

### User Management Routes

- **`/api/user/profile`** - User profile management
  - `GET /api/user/profile` - Get user profile
  - `PUT /api/user/profile` - Update user profile

## 4. Components and Hooks

### Auth Components

- **`AuthButton`** - Smart authentication button with user dropdown
- **`LoginButton`** - Simple login button
- **`LogoutButton`** - Simple logout button
- **`UserProfile`** - User profile display component

### Custom Hooks

- **`useAuth0()`** - Main authentication hook
- **`useAuthGuard()`** - Route protection hook
- **`useUserProfile()`** - User profile management hook

## 5. Route Protection

### Middleware Setup

The following routes are automatically protected:

- `/dashboard/*` - Dashboard pages
- `/api/keys/*` - API key management
- `/api/usage/*` - Usage tracking

### Usage in Components

```typescript
// Protect a page component
import { useAuthGuard } from "@/hooks/use-auth0";

function DashboardPage() {
  useAuthGuard(); // Redirects to login if not authenticated
  return <div>Protected content</div>;
}

// Use authentication state
import { useAuth0 } from "@/hooks/use-auth0";

function MyComponent() {
  const { isAuthenticated, user, login, logout } = useAuth0();

  return (
    <div>
      {isAuthenticated ? (
        <div>Welcome, {user?.name}!</div>
      ) : (
        <button onClick={() => login()}>Login</button>
      )}
    </div>
  );
}
```

## 6. Testing the Setup

### 1. Start the Development Server

```bash
npm run dev
```

### 2. Test Authentication Flow

1. Navigate to `http://localhost:3000`
2. Click the login button
3. Complete the Auth0 login flow
4. Verify you're redirected back to the application
5. Check that protected routes work correctly

### 3. Test API Routes

```bash
# Test user profile (requires authentication)
curl -X GET http://localhost:3000/api/user/profile \
  -H "Cookie: appSession=your_session_cookie"

# Test API key creation (requires authentication)
curl -X POST http://localhost:3000/api/keys \
  -H "Content-Type: application/json" \
  -H "Cookie: appSession=your_session_cookie" \
  -d '{"name": "Test API Key"}'
```

## 7. Production Deployment

### Environment Variables

For production, update the following:

- `AUTH0_BASE_URL` - Your production domain
- `AUTH0_SECRET` - Generate a new secure secret
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Production Stripe key
- `NEXT_PUBLIC_MCP_SERVER_URL` - Production MCP server URL

### Auth0 Application Settings

Update your Auth0 application settings with production URLs:

- Callback URLs
- Logout URLs
- Web Origins
- CORS Origins

## 8. Security Considerations

1. **Environment Variables**: Never commit `.env.local` to version control
2. **Session Security**: Use a strong, unique `AUTH0_SECRET`
3. **HTTPS**: Always use HTTPS in production
4. **CORS**: Configure proper CORS settings in Auth0
5. **Rate Limiting**: Implement rate limiting for authentication endpoints

## 9. Troubleshooting

### Common Issues

1. **"Cannot find module 'next/server'"**: Run `npm install` to install dependencies
2. **"Unauthorized" errors**: Check environment variables and Auth0 configuration
3. **CORS errors**: Verify Auth0 application settings for allowed origins
4. **Session issues**: Ensure `AUTH0_SECRET` is set and secure

### Debug Mode

Enable debug mode for Auth0:

```bash
DEBUG=@auth0/nextjs-auth0*
```

## 10. Files Created

The following files have been created for Auth0 integration:

### Core Files

- `frontend/src/app/api/auth/[...auth0]/route.ts` - Auth0 API routes
- `frontend/src/app/api/user/profile/route.ts` - User profile API
- `frontend/middleware.ts` - Route protection middleware

### Utilities

- `frontend/src/lib/auth0.ts` - Auth0 utility functions
- `frontend/src/hooks/use-auth0.ts` - Custom React hooks

### Components

- `frontend/src/components/auth/auth-button.tsx` - Authentication UI components

### Configuration

- `frontend/AUTH0_SETUP.md` - This setup guide

## Next Steps

1. Configure your Auth0 application with the provided settings
2. Set up your `.env.local` file with proper credentials
3. Test the authentication flow
4. Integrate the auth components into your existing UI
5. Deploy to production with proper environment variables

The Auth0 integration is now complete and ready for use!
