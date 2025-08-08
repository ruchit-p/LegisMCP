# LegisAPI Deployment Guide

## Production URL

**LegisAPI is deployed at**: `https://api.example.com`

## Pre-Deployment Checklist

- [ ] All environment variables documented
- [ ] Database schema is up to date
- [ ] All migrations have been tested locally
- [ ] Auth0 production configuration ready
- [ ] Cloudflare account with Workers enabled
- [ ] Custom domain configured (optional)
- [ ] Monitoring and alerts configured

## Deployment Steps

### 1. Database Setup

#### Create Production Database

```bash
# Create production D1 database
wrangler d1 create legis-db

# Note the database_id from output
# Update wrangler.jsonc with the new database_id
```

#### Update wrangler.jsonc

```json
{
  "d1_databases": [
    {
      "binding": "LEGIS_DB",
      "database_name": "legis-db",
      "database_id": "YOUR-DATABASE-ID-HERE"
    }
  ]
}
```

#### Apply Schema and Migrations

```bash
# Apply base schema
wrangler d1 execute legis-db --file=./schema.sql

# Apply all migrations in order
for file in ./migrations/*.sql; do
  echo "Applying migration: $file"
  wrangler d1 execute legis-db --file="$file"
done

# Verify database structure
wrangler d1 execute legis-db \
  --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

### 2. Set Production Secrets

```bash
# Auth0 configuration
wrangler secret put AUTH0_DOMAIN
# Enter: yourtenant.us.auth0.com

wrangler secret put AUTH0_AUDIENCE  
# Enter: urn:legis-api

# Optional: Congress.gov API key
wrangler secret put CONGRESS_API_KEY
# Enter: your-api-key
```

### 3. Configure KV Namespace (if not exists)

```bash
# Create KV namespace for caching
wrangler kv:namespace create "API_CACHE"

# Update wrangler.jsonc with the namespace ID
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
# Check health endpoint
curl https://api.example.com/api/health

# Test with Auth0 token
curl https://api.example.com/api/me \
  -H "Authorization: Bearer YOUR_PRODUCTION_TOKEN"
```

## Custom Domain Setup

### 1. Add Custom Domain in Cloudflare

1. Go to Workers & Pages in Cloudflare dashboard
2. Select your worker (legis-api)
3. Go to "Settings" → "Domains & Routes"
4. Add custom domain: `api.example.com`

### 2. Configure DNS

```
Type: CNAME
Name: api
Content: legis-api.workers.dev
Proxy: Yes (Orange cloud)
```

### 3. Update CORS Settings

In `src/index.ts`, update CORS for production:

```typescript
app.use('*', cors({
  origin: [
    'https://app.example.com',
    'https://example.com',
    // Add other allowed origins
  ],
  credentials: true,
}));
```

## Monitoring Setup

### 1. Enable Analytics

In wrangler.jsonc:

```json
{
  "analytics_engine_datasets": [
    {
      "binding": "USAGE_ANALYTICS"
    }
  ]
}
```

### 2. Set Up Alerts

1. Go to Cloudflare dashboard → Workers → Your worker
2. Click on "Analytics" tab
3. Set up alerts for:
   - Error rate > 5%
   - Response time > 1000ms
   - Request volume anomalies

### 3. Log Aggregation

```bash
# Stream logs to external service
wrangler tail --format json | \
  curl -X POST https://your-log-service.com/ingest \
    -H "Content-Type: application/json" \
    -d @-
```

## Security Hardening

### 1. Rate Limiting

Ensure rate limiting is properly configured:

```typescript
// In middleware
const rateLimit = {
  free: { requests: 10, window: 3600 },
  developer: { requests: 100, window: 3600 },
  professional: { requests: 500, window: 3600 },
  enterprise: { requests: 2000, window: 3600 }
};
```

### 2. Security Headers

```typescript
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Strict-Transport-Security', 'max-age=31536000');
});
```

### 3. Input Validation

Ensure all inputs are validated:

```typescript
import { z } from 'zod';

const billQuerySchema = z.object({
  q: z.string().optional(),
  limit: z.number().min(1).max(250).default(20),
  offset: z.number().min(0).default(0)
});
```

## Rollback Procedure

### 1. Quick Rollback

```bash
# List deployments
wrangler deployments list

# Rollback to previous version
wrangler rollback [deployment-id]
```

### 2. Database Rollback

Keep migration rollback scripts:

```sql
-- rollback/005_rollback_api_key_feedback.sql
DROP TABLE IF EXISTS api_key_feedback;
```

## Performance Optimization

### 1. Enable Caching

```typescript
// Cache responses in KV
const cacheKey = `bill:${congress}:${type}:${number}`;
await c.env.API_CACHE.put(cacheKey, JSON.stringify(data), {
  expirationTtl: 3600 // 1 hour
});
```

### 2. Enable Compression

Cloudflare automatically compresses responses, but ensure:

```typescript
c.header('Content-Type', 'application/json');
```

### 3. Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_users_auth0 ON users(auth0_user_id);
CREATE INDEX idx_api_usage_user ON api_usage(user_id, created_at);
```

## Troubleshooting

### Common Deployment Issues

1. **"Database not found" error**
   - Check database_id in wrangler.jsonc
   - Ensure database was created in correct account

2. **"Secret not found" error**
   - List secrets: `wrangler secret list`
   - Re-add missing secrets

3. **CORS errors**
   - Update allowed origins in cors() middleware
   - Check preflight handling

4. **502 Gateway errors**
   - Check worker logs: `wrangler tail`
   - Verify all bindings are correct
   - Check for initialization errors

### Debug Production Issues

```bash
# Tail production logs
wrangler tail

# Filter for errors
wrangler tail --status error

# Check specific user
wrangler tail --search "user@example.com"
```

## Maintenance

### Regular Tasks

1. **Weekly**
   - Review error logs
   - Check API usage patterns
   - Monitor response times

2. **Monthly**
   - Review and optimize slow queries
   - Update dependencies
   - Check for security updates

3. **Quarterly**
   - Review and update rate limits
   - Audit user permissions
   - Performance profiling

### Database Maintenance

```bash
# Vacuum database (compact)
wrangler d1 execute legis-db --command="VACUUM"

# Analyze query performance
wrangler d1 execute legis-db --command="ANALYZE"

# Check database size
wrangler d1 execute legis-db \
  --command="SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()"
```

## Disaster Recovery

### Backup Strategy

1. **Automated Backups**
   ```bash
   # Export database
   wrangler d1 export legis-db --output backup.sql
   ```

2. **Store Backups**
   - Upload to R2 or external storage
   - Keep 30 days of daily backups
   - Keep 12 months of monthly backups

### Recovery Procedure

1. Create new database
2. Import backup
3. Update wrangler.jsonc with new ID
4. Redeploy worker
5. Verify functionality

## Cost Optimization

1. **Monitor Usage**
   - Check Workers dashboard for request counts
   - Review D1 operations count
   - Monitor KV operations

2. **Optimize Queries**
   - Batch operations where possible
   - Use efficient SQL queries
   - Implement proper caching

3. **Set Budgets**
   - Configure spending alerts
   - Monitor cost trends
   - Review usage monthly

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
- ✅ **D1 Database**: `legis-db` (ID: 80f8112f-38fb-4220-86e6-17c611504f78)
- ✅ **KV Namespace**: `CONGRESS_KEYS` (ID: 569f409f4e204cc09968956060c2fc24)
- ✅ **Analytics Engine**: `legis_analytics`
- ✅ **Cron Trigger**: Daily at midnight (0 0 * * *)

### Required Secrets Checklist
- [ ] `AUTH0_DOMAIN` - Your Auth0 domain
- [ ] `AUTH0_AUDIENCE` - Should be "urn:legis-api"
- [ ] `STRIPE_API_KEY` - Your Stripe API key (if using billing features)
- [ ] `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret (if using billing features)
- [ ] `CONGRESS_API_KEY` - Optional but recommended for higher rate limits

### Setting Secrets Commands

```bash
# Set secrets for production
wrangler secret put AUTH0_DOMAIN
wrangler secret put AUTH0_AUDIENCE
wrangler secret put STRIPE_API_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put CONGRESS_API_KEY
```

### Verification Steps

1. **Test API endpoints**:
   ```bash
   # Health check
   curl https://api.example.com/health
   
   # Test with Auth0 token
   curl https://api.example.com/api/bills?q=healthcare \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. **Check worker logs**:
   ```bash
   wrangler tail
   ```

3. **Monitor database**:
   ```bash
   wrangler d1 execute legis-db \
     --command="SELECT COUNT(*) FROM users"
   ```