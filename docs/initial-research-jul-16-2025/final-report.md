# LegisMCP System Integration Report
## Comprehensive Analysis - July 16, 2025

## Executive Summary

The LegisMCP system consists of three interconnected services providing legislative data access through a SaaS platform. While the architecture is well-designed with modern technologies (Cloudflare Workers, Auth0, Stripe), several critical issues need immediate attention to ensure proper functionality, security, and data consistency.

### Key Findings
- **Critical**: Configuration errors prevent services from connecting properly
- **High Priority**: Security vulnerabilities expose sensitive data
- **Important**: Database inconsistencies risk data integrity
- **Moderate**: Missing integrations leave features incomplete

## System Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Frontend       │────▶│  MCP Server      │────▶│  LegisAPI       │
│  Next.js 14     │     │  CF Workers      │     │  CF Workers     │
│  Auth0 + Stripe │     │  OAuth + MCP     │     │  JWT + D1       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Critical Issues Requiring Immediate Fix

### 1. Port Configuration Error 🔴
**Location**: Frontend `next.config.js` line 18
```javascript
destination: `${process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'http://localhost:8789'}/:path*`
```
**Issue**: Points to LegisAPI (8789) instead of MCP Server (8788)
**Fix**: Change to `http://localhost:8788`
**Impact**: MCP connections fail completely

### 2. Hardcoded Secrets 🔴
**Locations**: 
- LegisAPI `src/index.ts`: Auth0 domain hardcoded
- MCP Server `wrangler.jsonc`: Client ID/secret in config
**Fix**: Move all secrets to environment variables
**Impact**: Security vulnerability

### 3. Database Schema Confusion 🔴
**Issue**: Two schema files exist (`schema.sql` and `schema-new.sql`)
**Fix**: Delete old schema, rename `schema-new.sql` to `schema.sql`
**Impact**: Unclear which schema is active, risk of data corruption

## High Priority Issues

### 4. Missing Stripe Integration 🟡
**Issue**: Stripe webhooks received but not processed to database
**Missing Implementation**:
```typescript
// Frontend needs endpoint like:
app.post('/api/webhooks/stripe', async (req) => {
  // Verify webhook
  // Update user subscription in LegisAPI
  await fetch(`${LEGIS_API}/api/users/${userId}/subscription`, {
    method: 'PUT',
    body: JSON.stringify({ planId, status })
  });
});
```

### 5. No Usage Reset Mechanism 🟡
**Issue**: Monthly quotas never reset
**Solution**: Implement cron job or Cloudflare scheduled worker
```typescript
// Add to LegisAPI
export async function scheduled(event: ScheduledEvent, env: Env) {
  // Reset usage counts monthly
  await env.DB.prepare(`
    UPDATE users 
    SET api_calls_count = 0, 
        api_calls_reset_at = datetime('now', '+1 month')
    WHERE subscription_status = 'active'
    AND api_calls_reset_at <= datetime('now')
  `).run();
}
```

### 6. MCP Usage Not Tracked 🟡
**Issue**: `mcp_logs` table exists but never used
**Fix**: Add logging to MCP Server tools
```typescript
// In each tool handler:
await logMCPUsage(env.DB, {
  userId,
  toolName,
  requestData,
  responseData,
  status: 'success'
});
```

## Security Vulnerabilities

### 7. Permissive CORS 🔴
**All Services**: Using `cors()` or `*` origin
**Fix**:
```typescript
cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
})
```

### 8. Missing Rate Limiting 🟡
**Issue**: No rate limiting on any service
**Solution**: Add middleware to all services
```typescript
import { rateLimiter } from '@cloudflare/workers-rate-limiter';
// Configure per endpoint/user limits
```

### 9. No Input Validation 🟡
**Issue**: Direct SQL queries without validation
**Fix**: Use Zod schemas for all inputs
```typescript
const billQuerySchema = z.object({
  congress: z.number().min(100).max(150),
  type: z.enum(['hr', 's', 'hjres', ...]),
  number: z.number().positive()
});
```

## Data Consistency Issues

### 10. User Registration Race Condition 🟡
**Issue**: User can authenticate but not exist in database
**Fix**: Implement proper user sync
```typescript
// Add to Frontend Auth0 callback
const user = await ensureUserExists(session.user);
```

### 11. Subscription State Mismatch 🟡
**Issue**: Three sources of truth (Auth0, Stripe, D1)
**Solution**: D1 as single source, sync others
```typescript
// Regular sync job
async function syncSubscriptions() {
  // Fetch from Stripe
  // Update D1
  // Update Auth0 metadata
}
```

## Recommended Implementation Order

### Phase 1: Critical Fixes (Week 1)
1. Fix port configuration in Frontend
2. Move secrets to environment variables
3. Consolidate database schemas
4. Fix CORS configuration

### Phase 2: Core Features (Week 2)
1. Implement Stripe webhook processing
2. Add usage reset mechanism
3. Implement MCP usage logging
4. Add input validation

### Phase 3: Security Hardening (Week 3)
1. Add rate limiting
2. Implement security headers
3. Add API key rotation
4. Enhance error handling

### Phase 4: Polish & Optimization (Week 4)
1. Add comprehensive logging
2. Implement monitoring
3. Add automated tests
4. Performance optimization

## Configuration Checklist

### Environment Variables Needed
```bash
# LegisAPI
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=urn:legis-api
CONGRESS_API_KEY=<optional>

# MCP Server
AUTH0_CLIENT_SECRET=<secret>
API_BASE_URL=http://localhost:8789  # dev
API_BASE_URL=https://legis-api.domain.com  # prod

# Frontend
STRIPE_WEBHOOK_SECRET=<secret>
LEGIS_API_URL=<backend-url>
```

### Deployment Steps
1. Update all environment variables
2. Deploy LegisAPI with new schema
3. Deploy MCP Server with fixes
4. Deploy Frontend with correct configuration
5. Run database migrations
6. Test full flow end-to-end

## Testing Recommendations

### Integration Tests
```bash
# Test full auth flow
Frontend login → MCP OAuth → LegisAPI register

# Test subscription flow  
Stripe checkout → Webhook → Database update → API access

# Test usage flow
API call → Usage tracking → Quota enforcement → Reset
```

### Security Tests
- Penetration testing
- OWASP compliance check
- Auth0 security audit
- Stripe integration review

## Monitoring Setup

### Key Metrics
1. API response times
2. Authentication success rate
3. Subscription conversion rate
4. Error rates by endpoint
5. Usage patterns by plan

### Alerts
- Failed authentications > 10/min
- API errors > 5%
- Database connection failures
- Stripe webhook failures
- Usage quota exceeded

## Conclusion

The LegisMCP system has a solid architectural foundation but requires immediate attention to critical configuration and integration issues. Following the recommended implementation order will ensure:

1. **Functional System**: Services properly connected
2. **Secure Platform**: Vulnerabilities addressed
3. **Consistent Data**: Single source of truth
4. **Complete Features**: All integrations working

With these fixes implemented, the platform will be ready for production use with proper security, reliability, and scalability.

## Next Steps

1. **Immediate**: Fix port configuration (5 minutes)
2. **Today**: Move secrets to env vars (1 hour)
3. **This Week**: Implement Phase 1 fixes
4. **This Month**: Complete all phases

The system shows great promise - with these issues resolved, it will provide a robust platform for legislative data access through AI agents.