# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LegisMCP is a legislative data platform with three components:
1. **LegisAPI** - REST API for congress.gov data (Cloudflare Workers + D1)
2. **LegisMCP Server** - MCP protocol server for AI agents (Workers + Durable Objects)
3. **LegisMCP Frontend** - SaaS platform (Next.js 14 + Auth0 + Stripe)

## Quick Start

```bash
# Start all services (separate terminals)
cd LegisAPI && npm run dev          # Port 8789
cd LegisMCP_Server && npm run dev    # Port 8788
cd LegisMCP_Frontend && npm run dev  # Port 3000
```

## Key URLs

**Production:**
- API: `https://api.example.com`
- MCP: `https://mcp.example.com`
- Frontend: `https://legismcp.com`

**Documentation:**
- `/docs/` - Architecture
- `/LegisAPI/docs/` - API docs
- `/LegisMCP_Server/docs/` - MCP docs
- `/LegisMCP_Frontend/docs/` - Frontend docs

## Essential Commands

```bash
# Type checking & linting
npm run type-check
npm run lint

# Cloudflare deployment
npm run deploy
wrangler secret put <SECRET_NAME>

# Database operations
wrangler d1 execute legis-db --command="SELECT COUNT(*) FROM users"
wrangler d1 execute legis-db --file=./migrations/001_xyz.sql

# Debugging
wrangler tail
wrangler kv:key list --namespace-id=<id>
```

## Architecture Summary

```
Frontend → Auth0 → MCP Server → LegisAPI → Congress.gov
                                    ↓
                              D1 Database (users, analytics)
```

**Tech Stack:**
- Auth: Auth0 (JWT with scopes: read:bills, read:members, etc.)
- Payments: Stripe ($9.99 Developer, $29.99 Professional)
- Database: D1 (SQLite) - LegisAPI has exclusive access
- Cache: KV Storage (5-min TTL)
- State: Durable Objects (MCP sessions)

## Critical Information

### Environment Variables

**Frontend (.env.local):**
```bash
AUTH0_SECRET='<32-char-secret>'
AUTH0_ISSUER_BASE_URL='https://<tenant>.auth0.com'
AUTH0_CLIENT_ID='<client-id>'
AUTH0_CLIENT_SECRET='<client-secret>'
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY='pk_test_...'
```

**MCP Server (.dev.vars):**
```bash
AUTH0_DOMAIN='<tenant>.auth0.com'
AUTH0_CLIENT_ID='<mcp-client-id>'
AUTH0_CLIENT_SECRET='<secret>'
API_BASE_URL='https://api.example.com'
```

**LegisAPI (.dev.vars):**
```bash
AUTH0_DOMAIN='<tenant>.auth0.com'
AUTH0_AUDIENCE='urn:legis-api'
CONGRESS_API_KEY='<optional>'
```

### Database Info
- **Name**: legis-db
- **ID**: 80f8112f-38fb-4220-86e6-17c611504f78
- **Access**: Only through LegisAPI
- **Plans**: Free (100), Developer (1K/mo), Professional (10K/mo), Enterprise (unlimited)

### Common Tasks

**Add MCP Tool:**
1. Create in `LegisMCP_Server/src/tools/`
2. Register in `tools/index.ts`
3. Update frontend `mcp-tools.tsx`

**Add API Endpoint:**
1. Update `LegisAPI/src/index.ts`
2. Add scope validation
3. Update service in `src/services/`

**Database Changes:**
1. Update `LegisAPI/schema.sql`
2. Create migration file
3. Run: `wrangler d1 execute legis-db --file=./migrations/new.sql`

## Important Notes

### Security
- Never commit secrets (use `.env.local` or `wrangler secret`)
- Always validate JWTs
- Sanitize all inputs
- Use prepared statements for SQL

### Performance
- Worker limits: 10ms CPU, 128MB memory
- Default pagination: 20 items
- Cache API responses in KV (5 min)
- Use indexes for database queries

### Common Issues
1. **Runtime types**: Run `npm run cf-typegen` after changing wrangler.jsonc
2. **Auth failures**: Check Auth0 scopes and callback URLs
3. **Database errors**: Verify migrations and D1 binding
4. **Stripe webhooks**: Use CLI for local testing
5. **CORS issues**: Check allowed origins in workers

### Recent Changes
- **Jan 2025**: Migrated from Auth0 SDK to Auth.js (NextAuth)
- **Jan 2025**: Fixed Congress.gov API double-wrapping issue
- **Jan 2025**: Added user_subscription_details view to database

## Quick Debug

```bash
# Check logs
wrangler tail

# Test API
curl http://localhost:8789/api/bills?q=healthcare \
  -H "Authorization: Bearer <token>"

# Clear cache
rm -rf .wrangler/state
```

## Development Workflow

1. Branch: `feature/description` or `fix/issue`
2. Test locally with all services
3. Run type-check and lint
4. Update docs if needed
5. Deploy to staging first

## Key Patterns

```typescript
// API Response
{
  success: boolean,
  data?: any,
  error?: string,
  metadata?: { page, limit, total }
}

// Error Handling
try {
  // operation
} catch (error) {
  console.error('[Service] Error:', error);
  return c.json({ success: false, error: error.message }, 500);
}

// Database Query
const user = await c.env.LEGIS_DB
  .prepare("SELECT * FROM users WHERE auth0_user_id = ?")
  .bind(auth0UserId)
  .first<User>();
```