# Authentication Documentation

## Overview

LegisMCP uses Auth0 for authentication, integrated through NextAuth.js (Auth.js). This guide covers both the Auth0 configuration and the NextAuth.js implementation.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js       │────▶│    LegisAPI     │────▶│ Congress.gov    │
│   Frontend      │     │  (Backend API)  │     │      API        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        └───────┬───────────────┘
                │
        ┌───────▼────────┐
        │     Auth0      │
        │  (Identity     │
        │   Provider)    │
        └────────────────┘
```

## Components

### 1. Next.js Frontend (legismcp.com)
- **Auth0 Application**: LegiUSA MCP Frontend
- **Client ID**: `eUovWUOrn6gy4vIXHsxuFEOsoogZcVXJ`
- **Type**: Regular Web Application
- **Purpose**: User authentication and obtaining access tokens

### 2. LegisAPI Backend (Cloudflare Worker)
- **Auth0 API**: LegislativeMCP API
- **Identifier**: `urn:legis-api`
- **Scopes**: 
  - `read:bills` - Read congressional bills
  - `read:members` - Read members of Congress
  - `read:votes` - Read congressional votes
  - `read:committees` - Read congressional committees

### 3. MCP Server (for AI agents)
- **Auth0 Application**: LegislativeMCP Server
- **Client ID**: `YOUR_AUTH0_CLIENT_ID`
- **Type**: Regular Web Application
- **Purpose**: OAuth flow for MCP clients

## Authentication Flow

### Frontend User Authentication:
1. User visits legismcp.com
2. Clicks "Sign In" → redirected to Auth0
3. User logs in with credentials
4. Auth0 redirects back with authorization code
5. Frontend exchanges code for tokens
6. Frontend stores user session (encrypted cookies)

### API Access:
1. Frontend needs to call LegisAPI
2. Uses access token from Auth0 session
3. Sends request with `Authorization: Bearer <token>`
4. LegisAPI validates token using Auth0 JWKS
5. Checks scopes and processes request

## Environment Variables

### Frontend (.env.local):
```env
# Auth0 Session Encryption
AUTH0_SECRET='[GENERATE-A-LONG-RANDOM-STRING]'

# Application URLs
AUTH0_BASE_URL='https://legismcp.com' # Use http://localhost:3000 for development
AUTH0_ISSUER_BASE_URL='https://your-tenant.us.auth0.com'

# Frontend Application Credentials
AUTH0_CLIENT_ID='eUovWUOrn6gy4vIXHsxuFEOsoogZcVXJ'
AUTH0_CLIENT_SECRET='ugn-BeHC_MvY-UXsI2UQoqQEcq7Mf04Qa-aLTd7VoO6LZoOdT2Y3nTI8LcwAkIiO'

# API Configuration
AUTH0_AUDIENCE='urn:legis-api'
AUTH0_SCOPE='openid profile email offline_access read:bills read:members read:votes read:committees'
```

### Backend (wrangler.toml):
```toml
[vars]
AUTH0_DOMAIN = "your-tenant.us.auth0.com"
AUTH0_AUDIENCE = "urn:legis-api"
```

## Setup Steps

### 1. Generate AUTH0_SECRET
```bash
node -e "console.log(crypto.randomBytes(32).toString('base64'))"
```

### 2. Configure Redirect URLs in Auth0
The application is already configured with:
- Callback URLs: 
  - `http://localhost:3000/api/auth/callback` (development)
  - `https://legismcp.com/api/auth/callback` (production)
  - `https://www.legismcp.com/api/auth/callback` (www subdomain)
- Logout URLs:
  - `http://localhost:3000` (development)
  - `https://legismcp.com` (production)
  - `https://www.legismcp.com` (www subdomain)

### 3. Create Machine-to-Machine Application (if needed)
If your frontend needs to make server-side API calls (e.g., from API routes), create an M2M application:
1. Go to Auth0 Dashboard > Applications
2. Create Application > Machine to Machine
3. Select the "LegislativeMCP API"
4. Grant necessary scopes
5. Use the credentials for server-side API calls

## Testing the Integration

1. **Local Development**:
   ```bash
   npm run dev
   # Visit http://localhost:3000
   # Click "Sign In" to test Auth0 flow
   ```

2. **Check Token**:
   - After login, check browser DevTools > Application > Cookies
   - You should see `appSession` cookie (encrypted session)

3. **Test API Access**:
   - Visit dashboard after login
   - Check network tab for API calls
   - Verify `Authorization: Bearer` header is present

## Troubleshooting

### Common Issues:

1. **"Callback URL mismatch"**
   - Ensure your current URL matches one in Auth0 application settings
   - Check for trailing slashes or protocol mismatches

2. **"Audience is not configured"**
   - Add `AUTH0_AUDIENCE=urn:legis-api` to your .env.local

3. **"Insufficient scope"**
   - Ensure AUTH0_SCOPE includes all required scopes
   - User must consent to scopes during first login

4. **API returns 401 Unauthorized**
   - Check if token is expired
   - Verify audience matches between frontend and backend
   - Ensure scopes are included in token

## Security Best Practices

1. **Never commit .env.local** - Keep credentials secret
2. **Use different Auth0 tenants** for development/production
3. **Rotate client secrets** regularly
4. **Enable MFA** for Auth0 dashboard access
5. **Monitor Auth0 logs** for suspicious activity
6. **Use refresh token rotation** in production

## NextAuth.js Configuration

### Quick Setup Overview

The application uses **NextAuth.js with Auth0 provider** for authentication, providing:

- ✅ Server-side session management
- ✅ Automatic token handling
- ✅ Built-in CSRF protection
- ✅ Easy integration with Next.js API routes

### Required Environment Variables

#### NextAuth.js Core Variables

```bash
NEXTAUTH_SECRET=<generate-with-openssl-rand-hex-32>
NEXTAUTH_URL=https://your-app-name.vercel.app
```

#### Auth0 Application Credentials

```bash
AUTH0_ISSUER_BASE_URL=https://your-domain.auth0.com
AUTH0_CLIENT_ID=your_regular_web_app_client_id
AUTH0_CLIENT_SECRET=your_regular_web_app_client_secret
```

#### Auth0 Machine-to-Machine (for server operations)

```bash
AUTH0_M2M_CLIENT_ID=your_m2m_client_id
AUTH0_M2M_CLIENT_SECRET=your_m2m_client_secret
```

#### Public Auth0 Variables (for frontend)

```bash
NEXT_PUBLIC_AUTH0_DOMAIN=your-domain.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your_regular_web_app_client_id
NEXT_PUBLIC_AUTH0_AUDIENCE=urn:legis-api
```

### Implementation Details

#### Auth Configuration (`/src/lib/auth.ts`)

```typescript
import NextAuth from 'next-auth';
import Auth0Provider from 'next-auth/providers/auth0';

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Auth0Provider({
      clientId: process.env.AUTH0_CLIENT_ID!,
      clientSecret: process.env.AUTH0_CLIENT_SECRET!,
      issuer: process.env.AUTH0_ISSUER_BASE_URL!,
      authorization: {
        params: {
          audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
          scope: 'openid email profile offline_access read:bills read:members',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    },
  },
});
```

### Migration from Auth0 SDK

The application has been migrated from `@auth0/nextjs-auth0` to NextAuth.js for better compatibility with Next.js App Router and improved type safety.

#### Key Changes:

1. **Session Handling**: Sessions are now managed by NextAuth.js instead of Auth0 SDK
2. **API Routes**: Authentication endpoints moved from `/api/auth/[auth0]` to `/api/auth/[...nextauth]`
3. **Token Management**: Access tokens are stored in JWT and available in session
4. **Type Safety**: Full TypeScript support with extended session types

### Vercel Deployment

When deploying to Vercel:

1. Set all environment variables in Vercel dashboard
2. Update Auth0 application URLs to include Vercel domain
3. Generate `NEXTAUTH_SECRET` using: `openssl rand -hex 32`
4. Set `NEXTAUTH_URL` to your production URL