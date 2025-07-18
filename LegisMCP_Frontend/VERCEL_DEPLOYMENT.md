# Vercel Deployment Guide

This guide provides step-by-step instructions for deploying the LegisMCP Frontend to Vercel after migrating from Cloudflare Workers.

## 🚀 Quick Deployment Steps

### 1. Pre-Deployment Checklist

✅ **Files Removed:**

- `open-next.config.ts` (Cloudflare OpenNext config)
- `wrangler.jsonc` (Cloudflare Workers config)

✅ **Files Updated:**

- `package.json` (removed Cloudflare scripts and dependencies)
- `next.config.js` (updated for Vercel compatibility)
- `environment.template` (updated for Vercel)

✅ **Files Added:**

- `vercel.json` (Vercel configuration)
- This deployment guide

### 2. Setup Vercel Account

1. **Create Vercel Account:** Go to [vercel.com](https://vercel.com) and sign up
2. **Connect GitHub:** Link your GitHub account to Vercel
3. **Import Project:** Click "New Project" and import your LegisMCP repository

### 3. Configure Environment Variables

In your Vercel dashboard, go to **Project Settings > Environment Variables** and add ALL the following variables:

#### Authentication Variables

```bash
NEXTAUTH_SECRET=your_long_secret_value_here
NEXTAUTH_URL=https://your-vercel-domain.vercel.app
AUTH0_ISSUER_BASE_URL=https://your-auth0-domain.auth0.com
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret
AUTH0_M2M_CLIENT_ID=your_m2m_client_id
AUTH0_M2M_CLIENT_SECRET=your_m2m_client_secret
```

#### Public Auth0 Variables

```bash
NEXT_PUBLIC_AUTH0_DOMAIN=your-auth0-domain.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your_auth0_client_id
NEXT_PUBLIC_AUTH0_AUDIENCE=urn:legis-api
```

#### Stripe Variables

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_key
STRIPE_SECRET_KEY=sk_live_your_stripe_secret
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_STARTER_MONTHLY_PRICE_ID=price_starter_monthly
STRIPE_STARTER_YEARLY_PRICE_ID=price_starter_yearly
STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID=price_professional_monthly
STRIPE_PROFESSIONAL_YEARLY_PRICE_ID=price_professional_yearly
```

#### Backend Service URLs

```bash
NEXT_PUBLIC_MCP_WORKER_URL=https://mcp.example.com
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api
```

### 4. Deploy to Vercel

1. **Initial Deployment:** Vercel will automatically deploy when you import the project
2. **Environment:** Set all environment variables for "Production" environment
3. **Custom Domain:** Configure your custom domain in Project Settings > Domains
4. **SSL:** Vercel automatically provides SSL certificates

### 5. Update External Services

#### Update Auth0 Configuration

1. Go to your Auth0 Dashboard
2. Navigate to Applications > Your App > Settings
3. Update **Allowed Callback URLs:**
   ```
   https://your-vercel-domain.vercel.app/api/auth/callback,
   https://your-custom-domain.com/api/auth/callback
   ```
4. Update **Allowed Logout URLs:**
   ```
   https://your-vercel-domain.vercel.app,
   https://your-custom-domain.com
   ```
5. Update **Allowed Web Origins:**
   ```
   https://your-vercel-domain.vercel.app,
   https://your-custom-domain.com
   ```

#### Update Backend CORS Settings

You'll need to update your Cloudflare Workers (LegisAPI and LegisMCP Server) to allow requests from your new Vercel domain:

1. In your `LegisAPI/src/index.ts`, update CORS headers to include:

   ```typescript
   'Access-Control-Allow-Origin': 'https://your-vercel-domain.vercel.app'
   ```

2. In your `LegisMCP_Server/src/index.ts`, update CORS to include your new domain

#### Update Stripe Webhook Endpoints

1. Go to Stripe Dashboard > Webhooks
2. Update webhook endpoints to point to your new Vercel domain:
   ```
   https://your-vercel-domain.vercel.app/api/webhooks/stripe
   ```

### 6. Testing Deployment

#### Test Core Functionality

- [ ] Homepage loads correctly
- [ ] Auth0 login/logout works
- [ ] User dashboard accessible
- [ ] MCP tools function properly
- [ ] Stripe payment flow works
- [ ] Admin panel (if applicable)

#### Test API Integrations

- [ ] `/api/mcp/*` routes proxy correctly to Cloudflare
- [ ] Authentication tokens pass through correctly
- [ ] Webhook endpoints receive data properly

### 7. DNS Configuration (Production)

1. **Add Custom Domain in Vercel:**

   - Go to Project Settings > Domains
   - Add your custom domain (e.g., `legismcp.com`)

2. **Update DNS Records:**

   - Point your domain's A record to Vercel's IP or use CNAME
   - Vercel will provide specific DNS instructions

3. **SSL Certificate:**
   - Vercel automatically provisions SSL certificates
   - May take a few minutes to activate

### 8. Monitoring and Troubleshooting

#### Vercel Dashboard Monitoring

- **Functions:** Monitor API route performance and errors
- **Analytics:** Track page views and performance
- **Logs:** Debug deployment and runtime issues

#### Common Issues and Solutions

**1. Environment Variables Not Loading**

```bash
# Check in Vercel dashboard that all variables are set for Production
# Redeploy after adding missing variables
```

**2. Auth0 Login Redirects Fail**

```bash
# Ensure callback URLs in Auth0 match your Vercel domain exactly
# Check NEXTAUTH_URL matches your deployed domain
```

**3. API Routes Return 500 Errors**

```bash
# Check Vercel function logs for specific errors
# Verify environment variables are accessible in API routes
```

**4. MCP Server Connection Fails**

```bash
# Verify NEXT_PUBLIC_MCP_WORKER_URL is correct
# Check that Cloudflare Workers allow CORS from new domain
```

**5. Stripe Webhooks Fail**

```bash
# Update webhook endpoints in Stripe dashboard
# Verify STRIPE_WEBHOOK_SECRET is correctly set
```

### 9. Performance Optimization

#### Vercel-Specific Optimizations

- **Edge Functions:** Utilize Vercel's edge runtime for faster API responses
- **Image Optimization:** Leverage Vercel's automatic image optimization
- **Analytics:** Enable Vercel Analytics for performance insights
- **Caching:** Configure appropriate cache headers for static assets

### 10. Security Considerations

- [ ] Verify all environment variables are marked as "Secret" in Vercel
- [ ] Ensure CORS policies are restrictive (not allowing `*` for all origins)
- [ ] Test that sensitive API endpoints require authentication
- [ ] Validate webhook signature verification works correctly

## 🎉 Deployment Complete!

Once all steps are completed:

1. **Test thoroughly** in production environment
2. **Monitor** for the first 24 hours for any issues
3. **Update documentation** with new URLs and deployment process
4. **Celebrate** 🎉 - you've successfully migrated to Vercel!

## Support and Resources

- **Vercel Documentation:** [docs.vercel.com](https://docs.vercel.com)
- **Next.js on Vercel:** [nextjs.org/docs/deployment](https://nextjs.org/docs/deployment)
- **Vercel CLI:** Install with `npm i -g vercel` for advanced deployment options

## Rollback Plan

If issues arise, you can quickly rollback:

1. **DNS:** Point domain back to Cloudflare Workers
2. **Auth0:** Revert callback URLs to Cloudflare domain
3. **Stripe:** Update webhook endpoints back to Cloudflare
4. **Monitor:** Ensure all services are operational

The Cloudflare Workers deployment remains intact as a backup.
