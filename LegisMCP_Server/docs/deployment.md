# LegisMCP Server Deployment Guide

## Production URL

**LegisMCP Server is deployed at**: `https://mcp.example.com`

## Pre-Deployment Checklist

- [ ] Auth0 application configured for production
- [ ] LegisAPI deployed and accessible
- [ ] Environment variables documented
- [ ] KV namespace created
- [ ] Durable Objects configured
- [ ] Custom domain ready (optional)
- [ ] Monitoring setup planned

## Deployment Steps

### 1. Create KV Namespace

```bash
# Create production KV namespace
wrangler kv:namespace create "OAUTH_KV"

# Output example:
# ✓ Created namespace with ID: abc123def456...
```

Update `wrangler.jsonc` with the namespace ID:

```json
{
  "kv_namespaces": [
    {
      "binding": "OAUTH_KV",
      "id": "your-production-kv-id"
    }
  ]
}
```

### 2. Configure Auth0 for Production

#### Update Callback URLs

In Auth0 Dashboard → Applications → Your App → Settings:

**Allowed Callback URLs**:
```
https://mcp.example.com/callback
https://legis-mcp.your-subdomain.workers.dev/callback
```

**Allowed Logout URLs**:
```
https://mcp.example.com
https://legis-mcp.your-subdomain.workers.dev
```

**Allowed Web Origins**:
```
https://mcp.example.com
https://playground.ai.cloudflare.com
```

### 3. Set Production Secrets

```bash
# Auth0 Configuration
wrangler secret put AUTH0_DOMAIN
# Enter: yourtenant.us.auth0.com

wrangler secret put AUTH0_CLIENT_ID
# Enter: your-production-client-id

wrangler secret put AUTH0_CLIENT_SECRET
# Enter: your-production-client-secret

wrangler secret put AUTH0_AUDIENCE
# Enter: urn:legis-api

wrangler secret put AUTH0_SCOPE
# Enter: openid email profile offline_access read:bills read:members read:votes read:committees

# API Configuration
wrangler secret put API_BASE_URL
# Enter: https://api.example.com
```

### 4. Deploy to Cloudflare

```bash
# Deploy to production
npm run deploy

# Or with wrangler directly
wrangler deploy
```

### 5. Verify Deployment

```bash
# Check deployment status
curl https://legis-mcp.your-subdomain.workers.dev/health

# Test MCP endpoint (should redirect to Auth0)
curl https://legis-mcp.your-subdomain.workers.dev/mcp
```

## Custom Domain Setup

### 1. Add Custom Domain

1. Go to Cloudflare Dashboard → Workers & Pages
2. Select your worker (legis-mcp)
3. Go to "Settings" → "Domains & Routes"
4. Click "Add Custom Domain"
5. Enter: `mcp.example.com`

### 2. Configure DNS

```
Type: CNAME
Name: mcp
Content: legis-mcp.workers.dev
Proxy: Yes (Orange cloud)
```

### 3. Update CORS Settings

In `src/index.ts`, update allowed origins:

```typescript
const ALLOWED_ORIGINS = [
  'https://playground.ai.cloudflare.com',
  'https://claude.ai',
  'https://app.legismcp.com',
  // Add other production origins
];
```

## Security Configuration

### 1. Environment Validation

```typescript
// Add to worker initialization
function validateEnvironment(env: Env) {
  const required = [
    'AUTH0_DOMAIN',
    'AUTH0_CLIENT_ID',
    'AUTH0_CLIENT_SECRET',
    'AUTH0_AUDIENCE',
    'API_BASE_URL'
  ];
  
  for (const key of required) {
    if (!env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}
```

### 2. Rate Limiting

Implement rate limiting for OAuth endpoints:

```typescript
const rateLimiter = {
  consent: { requests: 10, window: 300 }, // 10 per 5 min
  callback: { requests: 5, window: 60 },   // 5 per minute
  token: { requests: 20, window: 300 }     // 20 per 5 min
};
```

### 3. Security Headers

```typescript
function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  headers.set('Content-Security-Policy', "default-src 'self'");
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
```

## Monitoring Setup

### 1. Enable Analytics

Add to `wrangler.jsonc`:

```json
{
  "analytics_engine_datasets": [
    {
      "binding": "MCP_ANALYTICS"
    }
  ]
}
```

### 2. Track Key Metrics

```typescript
// OAuth flow metrics
env.MCP_ANALYTICS?.writeDataPoint({
  blobs: ['oauth', 'start', state],
  doubles: [1],
  indexes: [clientId]
});

// Tool usage metrics
env.MCP_ANALYTICS?.writeDataPoint({
  blobs: ['tool', toolName, userId],
  doubles: [responseTime],
  indexes: [toolName]
});

// Error tracking
env.MCP_ANALYTICS?.writeDataPoint({
  blobs: ['error', error.code, error.message],
  doubles: [1],
  indexes: ['error']
});
```

### 3. Set Up Alerts

1. Go to Cloudflare Dashboard → Workers → Your Worker
2. Click "Analytics" tab
3. Configure alerts for:
   - Error rate > 5%
   - OAuth failures > 10/hour
   - Response time > 2000ms
   - Request volume anomalies

### 4. Logging Strategy

```typescript
// Production logging
function log(level: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...data
  };
  
  console.log(JSON.stringify(logEntry));
}

// Usage
log('info', 'OAuth flow started', { clientId, state });
log('error', 'Token exchange failed', { error: error.message });
```

## Performance Optimization

### 1. Durable Object Configuration

```typescript
// Optimize DO storage
class AuthenticatedMCP {
  async alarm() {
    // Clean up expired sessions
    const sessions = await this.state.storage.list();
    const now = Date.now();
    
    for (const [key, value] of sessions) {
      if (value.expiresAt < now) {
        await this.state.storage.delete(key);
      }
    }
  }
}
```

### 2. KV Optimization

```typescript
// Use efficient key patterns
const kvKey = `oauth:${state}`; // Good
const kvKey = `oauth-state-${Date.now()}-${Math.random()}`; // Bad

// Batch operations
const batch = [
  env.OAUTH_KV.put(key1, value1),
  env.OAUTH_KV.put(key2, value2),
  env.OAUTH_KV.delete(key3)
];
await Promise.all(batch);
```

### 3. Response Caching

```typescript
// Cache static responses
const cachedResponse = new Response(body, {
  headers: {
    'Cache-Control': 'public, max-age=3600',
    'CDN-Cache-Control': 'max-age=7200'
  }
});
```

## Rollback Procedures

### 1. Quick Rollback

```bash
# List recent deployments
wrangler deployments list

# Rollback to specific version
wrangler rollback [deployment-id]

# Verify rollback
curl https://mcp.example.com/health
```

### 2. Emergency Procedures

```bash
# Disable worker temporarily
wrangler dispatch-namespace disable

# Clear KV namespace (use with caution)
wrangler kv:namespace flush --namespace-id=<id>

# Re-enable worker
wrangler dispatch-namespace enable
```

## Testing Production

### 1. Smoke Tests

```bash
# Health check
curl https://mcp.example.com/health

# OAuth initiation (should redirect)
curl -I https://mcp.example.com/consent?client_id=test

# MCP endpoint (requires auth)
curl https://mcp.example.com/mcp
```

### 2. Integration Testing

#### Using MCP Inspector

1. Connect to production URL: `https://mcp.example.com/mcp`
2. Complete OAuth flow
3. Test each tool
4. Verify responses

#### Using Cloudflare AI Playground

1. Go to https://playground.ai.cloudflare.com/
2. Add MCP server: `https://mcp.example.com/mcp`
3. Authenticate when prompted
4. Test tool interactions

### 3. Load Testing

```bash
# Basic load test
npx autocannon \
  -c 10 \
  -d 30 \
  https://mcp.example.com/health

# OAuth flow test (requires setup)
npx k6 run load-test.js
```

## Maintenance

### Regular Tasks

#### Daily
- Monitor error rates
- Check OAuth success rates
- Review response times

#### Weekly
- Review analytics dashboards
- Check KV storage usage
- Audit failed authentications

#### Monthly
- Rotate secrets if needed
- Review and optimize slow queries
- Update dependencies
- Performance profiling

### Maintenance Mode

```typescript
// Add maintenance mode check
if (env.MAINTENANCE_MODE === 'true') {
  return new Response('Service under maintenance', {
    status: 503,
    headers: {
      'Retry-After': '3600'
    }
  });
}
```

## Troubleshooting Production

### Debug Production Issues

```bash
# Tail production logs
wrangler tail --env production

# Filter for errors
wrangler tail --search "ERROR"

# Track specific user
wrangler tail --search "user@example.com"
```

### Common Production Issues

1. **OAuth failures spike**
   - Check Auth0 service status
   - Verify callback URLs
   - Check rate limits
   - Review recent deployments

2. **Durable Object errors**
   - Check DO class initialization
   - Verify storage operations
   - Monitor memory usage
   - Check for evictions

3. **API connection issues**
   - Verify API_BASE_URL
   - Check LegisAPI health
   - Review network policies
   - Check SSL certificates

4. **Performance degradation**
   - Check KV operation latency
   - Monitor external API response times
   - Review Durable Object performance
   - Check for memory leaks

### Emergency Contacts

- Cloudflare Support: https://support.cloudflare.com
- Auth0 Support: https://support.auth0.com
- Status Pages:
  - Cloudflare: https://www.cloudflarestatus.com/
  - Auth0: https://status.auth0.com/

## Cost Management

### Monitor Usage

- Workers requests: 100,000 free/day
- KV operations: 100,000 free/day
- Durable Objects: 1M requests free/month
- Analytics Engine: 100M events free/month

### Optimization Tips

1. Batch KV operations
2. Use appropriate cache TTLs
3. Minimize Durable Object writes
4. Implement request coalescing

## Backup and Recovery

### Session Backup

```bash
# Export active sessions
wrangler kv:key list --namespace-id=<id> > sessions-backup.json

# Backup Durable Object state
# (Implement export endpoint in DO)
curl https://mcp.example.com/admin/export-sessions \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Disaster Recovery

1. **KV Namespace Corrupted**
   - Create new namespace
   - Update wrangler.jsonc
   - Redeploy worker
   - Users will need to re-authenticate

2. **Durable Object Issues**
   - DO state is automatically replicated
   - In case of issues, reset DO state
   - Users will need new sessions

3. **Complete Recovery**
   ```bash
   # Create new resources
   wrangler kv:namespace create "OAUTH_KV"
   
   # Update configuration
   # Redeploy
   wrangler deploy
   
   # Verify
   curl https://mcp.example.com/health
   ```

## Deployment Verification

### Code Fixes Applied
- ✅ LegisAPI route handlers - removed double-wrapping
- ✅ Transform methods in congress-v2.ts - handle Congress.gov data correctly
- ✅ Backward compatibility in subresourceTool.ts
- ✅ Safe property access in enhancedBillAnalysisTool.ts
- ✅ Name handling in memberSearch.ts
- ✅ NLP improvements in congressQueryTool.ts
- ✅ Subjects data structure in trendingBillsTool.ts

### Configuration Status
- ✅ **Durable Objects**: `AuthenticatedMCP` configured
- ✅ **KV Namespace**: `OAUTH_KV` (ID: f71e0ba711544eb3a1e509b580ba70ad)
- ✅ **AI Binding**: Configured
- ✅ **Auth0 Domain**: your-tenant.us.auth0.com
- ✅ **Auth0 Client ID**: YOUR_AUTH0_CLIENT_ID
- ✅ **API Base URL**: https://api.example.com

### Required Secrets Checklist
- [ ] `AUTH0_CLIENT_SECRET` - Your Auth0 application client secret

### Setting Secrets Commands

```bash
# Set secret for production
wrangler secret put AUTH0_CLIENT_SECRET
```

### Verification Steps

1. **Test health endpoint**:
   ```bash
   curl https://mcp.example.com/health
   ```

2. **Test MCP endpoint with inspector**:
   - Use MCP Inspector with URL: https://mcp.example.com/mcp
   - Follow OAuth flow for authentication
   - Test available tools

3. **Check worker logs**:
   ```bash
   wrangler tail
   ```

4. **Monitor KV state**:
   ```bash
   wrangler kv:key list --namespace-id=f71e0ba711544eb3a1e509b580ba70ad
   ```