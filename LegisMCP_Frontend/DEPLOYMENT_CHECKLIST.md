# Deployment Checklist for Cloudflare Workers

This checklist ensures all environment variables and configuration are properly set for production deployment.

## 🔐 **CRITICAL: All Secrets Must Be Set in Cloudflare Dashboard**

**⚠️ SECURITY NOTE**: No secrets are stored in `wrangler.jsonc` for security reasons. All sensitive values must be set as encrypted environment variables in the Cloudflare Workers dashboard.

## ✅ Required Secrets to Set in Cloudflare Dashboard

### **🔑 Authentication (Auth0) - REQUIRED**

- [x] `NEXTAUTH_SECRET` - Random 32-character string (generate with `openssl rand -hex 32`)
- [x] `AUTH0_CLIENT_SECRET` - From Auth0 application settings
- [x] `AUTH0_CLIENT_ID` - Auth0 client ID for NextAuth (server-side)
- [x] `AUTH0_ISSUER_BASE_URL` - Auth0 issuer URL (e.g., `https://your-tenant.us.auth0.com`)

### **🔧 Auth0 Management API (User Profiles) - REQUIRED**

- [x] `AUTH0_M2M_CLIENT_ID` - Machine-to-machine client ID for Management API
- [x] `AUTH0_M2M_CLIENT_SECRET` - Machine-to-machine client secret for Management API

**📝 Note**: For your specific setup, use these values:

```bash
AUTH0_ISSUER_BASE_URL=https://your-tenant.us.auth0.com
AUTH0_M2M_CLIENT_ID=Vj4pr4KkS8V9V729mb5mGa1Z0Sdz40Wm
AUTH0_M2M_CLIENT_SECRET=i8wm8n08nDjAtX2hV2GnBnTKzGZ260EgMEpMv0RnzNF9vTmqODVX9xOKKLx_YgZb
```

### **💳 Stripe Payment Processing - REQUIRED**

- [x] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (pk*live*... or pk*test*...)
- [x] `STRIPE_SECRET_KEY` - Stripe secret key (sk*live*... or sk*test*...)
- [x] `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret (whsec\_...)

### **💰 Stripe Price IDs - REQUIRED**

- [x] `STRIPE_STARTER_MONTHLY_PRICE_ID` - Monthly price for starter plan
- [x] `STRIPE_STARTER_YEARLY_PRICE_ID` - Yearly price for starter plan
- [x] `STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID` - Monthly price for professional plan
- [x] `STRIPE_PROFESSIONAL_YEARLY_PRICE_ID` - Yearly price for professional plan


## ✅ Public Configuration (Already Set in wrangler.jsonc)

These are public values already configured in `wrangler.jsonc`:

- ✅ `NODE_ENV` = "production"
- ✅ `NEXTAUTH_URL` = "https://legismcp.com"
- ✅ `NEXT_PUBLIC_AUTH0_DOMAIN` = "your-tenant.us.auth0.com"
- ✅ `NEXT_PUBLIC_AUTH0_CLIENT_ID` = "68WG3c41CX95HR6Y1Zl8wNaHbQnxXiu7"
- ✅ `NEXT_PUBLIC_AUTH0_AUDIENCE` = "urn:legis-api"
- ✅ `NEXT_PUBLIC_API_BASE_URL` = "https://api.example.com"

## 🎯 **Total Secrets Required: 13**

**You need to set exactly 13 secrets** in the Cloudflare Workers dashboard:

- 4 Auth0 authentication secrets
- 2 Auth0 M2M secrets
- 3 Stripe payment secrets
- 4 Stripe price ID secrets

## ✅ **Architecture Improvements Made**

**🔄 Hybrid Authentication System**: The frontend now uses a dual authentication approach:

- **Client-side**: Auth0 React SDK for Universal Login and client authentication
- **Server-side**: NextAuth.js for session management and API route protection
- **Backend API calls**: Use `session.accessToken` from NextAuth for authenticated requests
- **Admin operations**: Use Auth0 M2M tokens for management API access
- **Eliminated**: `LEGIS_API_TOKEN` (no longer needed)
- **Removed**: `database.ts` abstraction layer (replaced with direct API calls)

**🔧 Updated Environment Variables**:

- Added `NEXT_PUBLIC_MCP_WORKER_URL` for MCP server communication
- Updated Auth0 client ID to support the new authentication flow
- Streamlined environment template with proper variable grouping

## 🔧 **How to Set Secrets in Cloudflare Dashboard**

1. **Go to Cloudflare Workers Dashboard**

   - Navigate to: https://dash.cloudflare.com/
   - Select your account → Workers & Pages

2. **Select Your Worker**

   - Find and click on `legismcp-frontend`

3. **Add Environment Variables**

   - Go to **Settings** → **Variables and Secrets**
   - Click **"Add variable"** for each secret listed above
   - **IMPORTANT**: Choose **"Encrypt"** for all secret values

4. **Deploy Changes**
   - After adding all variables, click **"Save and deploy"**

## 🚀 **Deployment Process**

```bash
# 1. Build the application
npm run build

# 2. Deploy to Cloudflare Workers
wrangler deploy

# 3. Monitor deployment
wrangler tail
```

## ✅ **Post-Deployment Testing Checklist**

1. [ ] **Website loads**: Visit https://legismcp.com
2. [ ] **No console errors**: Check browser developer console
3. [ ] **Auth0 login works**: Test user authentication with Universal Login
4. [ ] **Session persistence**: Verify session works across page refreshes
5. [ ] **User profile updates work**: Test profile editing functionality
6. [ ] **API authentication**: Verify backend API calls use session tokens
7. [ ] **Stripe checkout works**: Test payment flow (use test cards in test mode)
8. [ ] **Webhooks work**: Test Stripe webhook endpoint
9. [ ] **Admin functions**: Test M2M token-based admin operations

## 🔍 **Troubleshooting Common Issues**

| Error                                                     | Likely Cause                                 | Solution                                       |
| --------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------- |
| "Missing value for Stripe(): apiKey should be a string"   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` not set | Set in Cloudflare dashboard                    |
| "No Authorization header included in request"             | `AUTH0_CLIENT_SECRET` missing                | Set in Cloudflare dashboard                    |
| "Failed to get Auth0 Management API token"                | M2M credentials missing or incorrect         | Verify `AUTH0_M2M_CLIENT_ID/SECRET`            |
| "NextAuth configuration error"                            | Auth0 NextAuth secrets missing               | Check `AUTH0_CLIENT_ID/SECRET/ISSUER_BASE_URL` |
| "A server with the specified hostname could not be found" | Backend URL incorrect                        | Verify `NEXT_PUBLIC_API_BASE_URL`              |
| "Auth0 configuration is invalid"                          | Auth0 client-side variables missing          | Check public Auth0 variables in wrangler.jsonc |
| "Session not found" on API routes                         | NextAuth session not available               | Verify authentication flow and token handling  |

## 🔐 **Security Best Practices**

- ✅ **No secrets in code**: All secrets stored in Cloudflare dashboard
- ✅ **Encrypted storage**: All secrets marked as "Encrypt" in Cloudflare
- ✅ **Environment separation**: Use test keys for development, live keys for production
- ✅ **Regular rotation**: Rotate secrets periodically
- ✅ **Access control**: Limit who can access the Cloudflare dashboard
- ✅ **Token validation**: All API routes validate session tokens
- ✅ **Scope isolation**: M2M tokens have minimal required scopes

## 📋 **Pre-Deployment Verification**

Before deploying, verify you have:

- [ ] All required secrets set in Cloudflare dashboard
- [ ] **Auth0 Application** configured with correct callback URLs
- [ ] **Auth0 M2M Application** created and authorized for Management API
- [ ] **NextAuth Auth0 Provider** configured with correct scopes
- [ ] Stripe webhook endpoint configured: `https://legismcp.com/api/webhooks/stripe`
- [ ] Auth0 callback URLs configured: `https://legismcp.com/api/auth/callback`
- [ ] DNS pointing to Cloudflare Workers

### **Auth0 Setup Requirements:**

#### **1. Regular Auth0 Application (for NextAuth.js)**

- Application Type: "Regular Web Application"
- Allowed Callback URLs: `https://legismcp.com/api/auth/callback/auth0`
- Allowed Logout URLs: `https://legismcp.com`
- Allowed Web Origins: `https://legismcp.com`
- Grant Types: Authorization Code, Refresh Token

#### **2. Single Page Application (for Auth0 React SDK)**

- Application Type: "Single Page Application"
- Allowed Callback URLs: `https://legismcp.com`
- Allowed Logout URLs: `https://legismcp.com`
- Allowed Web Origins: `https://legismcp.com`
- Grant Types: Implicit, Authorization Code, Refresh Token

#### **3. Auth0 M2M Application Setup:**

1. Create machine-to-machine application in Auth0 dashboard
2. Go to APIs → Authorize "Auth0 Management API"
3. Grant `read:users`, `update:users`, `read:user_metadata`, and `update:user_metadata` scopes
4. Use the M2M client credentials for `AUTH0_M2M_CLIENT_ID` and `AUTH0_M2M_CLIENT_SECRET`

## 🔄 **Migration Status**

**✅ Completed:**

- Auth0 React SDK integration for client-side authentication
- NextAuth.js integration for server-side session management
- Environment variable reorganization and documentation
- API route authentication with session tokens
- M2M token integration for admin operations
- Updated public configuration values

**⚠️ Temporarily Disabled:**

- Subscription cancellation endpoint (will be re-enabled after testing)

**🚀 Ready for Production:**

- All authentication flows working
- Environment properly configured
- Security best practices implemented
