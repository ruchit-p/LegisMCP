# Frontend Configuration Guide

## Environment Variables

### Auth.js (NextAuth) Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `AUTH0_SECRET` | Random string for JWT encryption (32+ chars) | `generate-with-openssl-rand-base64-32` |
| `APP_BASE_URL` | Application URL | `http://localhost:3000` |
| `AUTH0_ISSUER_BASE_URL` | Auth0 tenant URL | `https://dev-xyz.us.auth0.com` |
| `AUTH0_CLIENT_ID` | Auth0 application client ID | `abc123...` |
| `AUTH0_CLIENT_SECRET` | Auth0 application client secret | `xyz789...` |
| `AUTH0_AUDIENCE` | API identifier | `urn:legis-api` |
| `AUTH0_SCOPE` | Requested permissions | `openid email profile` |

### Stripe Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `pk_test_...` |
| `STRIPE_SECRET_KEY` | Stripe secret key (server-side) | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Webhook endpoint secret | `whsec_...` |

### Application Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_BASE_URL` | Frontend base URL | `http://localhost:3000` |
| `MCP_SERVER_URL` | MCP server endpoint | `http://localhost:8788` |
| `NEXT_PUBLIC_APP_NAME` | Application name | `LegisMCP` |

## Auth0 Setup

### 1. Create Application

1. Log in to Auth0 Dashboard
2. Navigate to Applications
3. Click "Create Application"
4. Choose:
   - **Name**: LegisMCP Frontend
   - **Type**: Regular Web Application
5. Click "Create"

### 2. Configure Application Settings

#### Basic Information
- **Application Logo**: Upload your logo
- **Application Type**: Regular Web Application
- **Token Endpoint Authentication**: None

#### Application URIs

**Allowed Callback URLs**:
```
http://localhost:3000/api/auth/callback/auth0
https://app.legismcp.com/api/auth/callback/auth0
```

**Allowed Logout URLs**:
```
http://localhost:3000
https://app.legismcp.com
```

**Allowed Web Origins**:
```
http://localhost:3000
https://app.legismcp.com
```

#### Advanced Settings

**Grant Types**:
- ✓ Authorization Code
- ✓ Refresh Token
- ✓ Implicit (for SPA compatibility)

**Refresh Token Behavior**:
- Rotation: Enabled
- Expiration: Absolute lifetime
- Lifetime: 2592000 seconds (30 days)

### 3. Configure API Authorization

1. Go to APIs in Auth0 Dashboard
2. Find your LegisAPI
3. Go to "Machine to Machine Applications"
4. Authorize the Frontend application
5. Select scopes:
   - `read:profile`
   - `read:bills`
   - `read:members`
   - `read:votes`
   - `read:committees`

### 4. Create Machine-to-Machine Application

For server-side API calls:

1. Create new Application
2. Choose "Machine to Machine"
3. Authorize for LegisAPI
4. Grant all necessary scopes
5. Use credentials for `AUTH0_M2M_CLIENT_ID` and `AUTH0_M2M_CLIENT_SECRET`

## Stripe Setup

### 1. Create Stripe Account

1. Sign up at https://stripe.com
2. Complete business verification
3. Enable test mode for development

### 2. Configure Products and Prices

#### Create Products

```bash
# Using Stripe CLI
stripe products create \
  --name="LegisMCP Developer" \
  --description="5,000 API calls/month"

stripe products create \
  --name="LegisMCP Professional" \
  --description="25,000 API calls/month"

stripe products create \
  --name="LegisMCP Enterprise" \
  --description="Unlimited API calls"
```

#### Create Prices

```bash
# Developer Plan - $19/month
stripe prices create \
  --product="prod_developer_id" \
  --unit-amount=1900 \
  --currency=usd \
  --recurring[interval]=month

# Professional Plan - $49/month
stripe prices create \
  --product="prod_professional_id" \
  --unit-amount=4900 \
  --currency=usd \
  --recurring[interval]=month

# Enterprise Plan - $199/month
stripe prices create \
  --product="prod_enterprise_id" \
  --unit-amount=19900 \
  --currency=usd \
  --recurring[interval]=month
```

### 3. Configure Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint:
   - **URL**: `https://app.legismcp.com/api/webhooks/stripe`
   - **Events**:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

3. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 4. Configure Customer Portal

1. Go to Settings → Billing → Customer Portal
2. Enable:
   - Customers can update payment methods
   - Customers can update billing addresses
   - Customers can cancel subscriptions
   - Customers can switch plans

## Local Development Setup

### 1. Create `.env.local`

```bash
cp .env.local.example .env.local
```

Edit with your values:

```env
# Auth.js Configuration
AUTH0_SECRET='generate-random-string-32-chars'
APP_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://dev-xyz.us.auth0.com'
AUTH0_CLIENT_ID='your-client-id'
AUTH0_CLIENT_SECRET='your-client-secret'
AUTH0_AUDIENCE='urn:legis-api'
AUTH0_SCOPE='openid email profile'

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY='pk_test_...'
STRIPE_SECRET_KEY='sk_test_...'
STRIPE_WEBHOOK_SECRET='whsec_...'

# Price IDs
NEXT_PUBLIC_STRIPE_PRICE_DEVELOPER='price_developer_id'
NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL='price_professional_id'
NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE='price_enterprise_id'

# Application
NEXT_PUBLIC_BASE_URL='http://localhost:3000'
MCP_SERVER_URL='http://localhost:8788'
```

### 2. Verify Services

```bash
# Check Auth0
curl https://YOUR_DOMAIN.auth0.com/.well-known/openid-configuration

# Check Stripe
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Production Configuration

### Environment Variables

Set in your hosting platform:

```env
# Production URLs
APP_BASE_URL='https://app.legismcp.com'
NEXT_PUBLIC_BASE_URL='https://app.legismcp.com'
MCP_SERVER_URL='https://mcp.example.com'

# Use production Stripe keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY='pk_live_...'
STRIPE_SECRET_KEY='sk_live_...'
```

### Security Checklist

- [ ] Generate strong `AUTH0_SECRET`
- [ ] Use HTTPS for all URLs
- [ ] Verify Auth0 callback URLs
- [ ] Test Stripe webhooks
- [ ] Enable CORS appropriately
- [ ] Set secure headers
- [ ] Configure CSP policy

## Vercel Deployment

### Environment Variables

1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add all variables from `.env.local`
3. Set appropriate values for production

### Build Settings

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

## Cloudflare Pages Deployment

### Build Configuration

- **Build command**: `npm run cf:build`
- **Build output directory**: `.vercel/output/static`
- **Node version**: 18

### Environment Variables

Add all variables in Cloudflare Pages settings.

## Troubleshooting

### Common Issues

1. **Auth0 Login Loop**
   - Verify callback URLs match exactly
   - Check `AUTH0_SECRET` is set
   - Clear browser cookies

2. **Stripe Webhook Failures**
   - Verify webhook secret
   - Check endpoint URL
   - Use Stripe CLI for testing

3. **Environment Variable Not Found**
   - Restart dev server after changes
   - Check variable naming (NEXT_PUBLIC_ prefix)
   - Verify `.env.local` location

4. **CORS Errors**
   - Update Auth0 web origins
   - Check API CORS settings
   - Verify proxy configuration

### Debug Mode

Enable debug logging:

```env
# .env.local
NEXTAUTH_DEBUG=true
NEXT_PUBLIC_DEBUG=true
```

### Testing Configuration

```typescript
// pages/api/test-config.ts
export default function handler(req, res) {
  res.json({
    auth0: {
      domain: process.env.AUTH0_ISSUER_BASE_URL,
      clientId: process.env.AUTH0_CLIENT_ID,
      hasSecret: !!process.env.AUTH0_CLIENT_SECRET
    },
    stripe: {
      hasPublishableKey: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      hasSecretKey: !!process.env.STRIPE_SECRET_KEY
    },
    app: {
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
      mcpUrl: process.env.MCP_SERVER_URL
    }
  });
}
```