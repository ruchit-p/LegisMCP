# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LegisMCP is a comprehensive legislative data platform that provides real-time access to U.S. legislative data from congress.gov through three integrated components:

1. **LegisAPI** - Protected REST API interfacing with congress.gov (Cloudflare Workers + D1)
2. **LegisMCP Server** - Model Context Protocol (MCP) server for AI agents (Cloudflare Workers + Durable Objects)
3. **LegisMCP Frontend** - Full-featured SaaS platform (Next.js 14 + Auth0 + Stripe)

## Development Commands

### Frontend (Next.js)
```bash
cd LegisMCP_Frontend
npm install
npm run dev          # Start on http://localhost:3000
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # TypeScript checking
npm run cf:build     # Build for Cloudflare deployment
npm run cf:deploy    # Deploy to Cloudflare Pages
```

### MCP Server
```bash
cd LegisMCP_Server
npm install
npm run dev          # Start on port 8788
npm run deploy       # Deploy to Cloudflare Workers
npm run type-check   # TypeScript checking
npm run cf-typegen   # Generate Cloudflare types
```

### LegisAPI
```bash
cd LegisAPI
npm install
npm run dev          # Start on port 8789
npm run deploy       # Deploy to Cloudflare Workers
npm run type-check   # TypeScript checking
npm run cf-typegen   # Generate Cloudflare types
```

### Database Setup (LegisAPI)
```bash
cd LegisAPI
wrangler d1 create legis-db
wrangler d1 execute legis-db --file=./schema.sql
```

## High-Level Architecture

### System Flow
1. **Frontend** (Next.js) → User authentication via Auth0 → Subscription via Stripe
2. **Frontend** → API calls to **MCP Server** (localhost:8788/mcp)
3. **MCP Server** → OAuth flow with Auth0 → Authenticated session
4. **MCP Server** → API calls to **LegisAPI** with JWT
5. **LegisAPI** → Verifies JWT → Fetches from congress.gov → Returns data
6. **LegisAPI** → Tracks usage in D1 database → Analytics

### Key Technologies
- **Authentication**: Auth0 (OIDC/OAuth2) across all components
- **Payments**: Stripe for subscription management
- **Database**: Cloudflare D1 (SQLite) for user management
- **Storage**: Cloudflare KV for OAuth state
- **Deployment**: Cloudflare Workers (backend), Vercel/Netlify (frontend)
- **MCP Protocol**: Model Context Protocol for AI agent integration

### Security Architecture
- JWT verification with Auth0 JWKS
- PKCE (Proof Key for Code Exchange) for OAuth
- Scope-based API access control (read:bills, read:members, etc.)
- Tiered user access (developer, professional, enterprise)
- CSRF protection with consent tokens

## Environment Configuration

### Frontend (.env.local)
```bash
AUTH0_SECRET='<generated-secret>'
APP_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://<tenant>.auth0.com'
AUTH0_CLIENT_ID='<client-id>'
AUTH0_CLIENT_SECRET='<client-secret>'
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY='pk_test_...'
NEXT_PUBLIC_BASE_URL='http://localhost:3000'
MCP_SERVER_URL='http://localhost:8788'
```

### MCP Server (.dev.vars)
```bash
AUTH0_DOMAIN='<tenant>.auth0.com'
AUTH0_CLIENT_ID='<client-id>'
AUTH0_CLIENT_SECRET='<client-secret>'
AUTH0_AUDIENCE='urn:legis-api'
AUTH0_SCOPE='openid email profile offline_access read:bills read:members read:votes read:committees'
NODE_ENV='development'
API_BASE_URL='http://localhost:8789'
```

### LegisAPI (.dev.vars)
```bash
AUTH0_DOMAIN='<tenant>.auth0.com'
AUTH0_AUDIENCE='urn:legis-api'
CONGRESS_API_KEY='<optional-for-higher-rate-limits>'
```

## MCP Tools Available

The MCP Server provides these tools for AI agents:
- `whoami` - Returns authenticated user information
- `search-bills` - Search congressional bills with filters
- `get-bill` - Get detailed bill information
- `search-members` - Search members of Congress
- `get-member` - Get detailed member information
- `get-recent-votes` - Get recent House/Senate votes
- `get-committees` - Get congressional committees
- `get-usage-stats` - Get API usage statistics

## Testing Procedures

### Local Development Testing
1. Start all three services in separate terminals:
   ```bash
   # Terminal 1 - LegisAPI
   cd LegisAPI && npm run dev
   
   # Terminal 2 - MCP Server
   cd LegisMCP_Server && npm run dev
   
   # Terminal 3 - Frontend
   cd LegisMCP_Frontend && npm run dev
   ```

2. Test MCP Server with MCP Inspector:
   - Use Streamable HTTP transport: `http://localhost:8788/mcp`
   - Follow OAuth flow for authentication

3. Test API endpoints:
   ```bash
   # Get Auth0 test token from Auth0 dashboard API Test tab
   curl http://localhost:8789/api/bills?q=healthcare \
     -H "Authorization: Bearer <token>"
   ```

## Common Development Tasks

### Adding New MCP Tools
1. Create tool implementation in `LegisMCP_Server/src/tools/`
2. Register tool in `LegisMCP_Server/src/tools/index.ts`
3. Update frontend `mcp-tools.tsx` to expose new tool in UI

### Modifying API Endpoints
1. Update route handler in `LegisAPI/src/index.ts`
2. Add scope validation in JWT middleware if needed
3. Update corresponding service in `LegisAPI/src/services/`
4. Update MCP tool to use new endpoint

### Updating Frontend Components
1. Components use Radix UI primitives - check existing patterns
2. Follow component structure in `LegisMCP_Frontend/src/components/`
3. Use Tailwind CSS for styling
4. Import components using `@/` alias

### Database Schema Changes
1. Update `LegisAPI/schema.sql`
2. Run migration: `wrangler d1 execute legis-db --file=./schema.sql`
3. Update database ID in `LegisAPI/wrangler.jsonc` if recreated

## Deployment Checklist

### Cloudflare Workers (MCP Server & LegisAPI)
```bash
# Set secrets for each service
wrangler secret put AUTH0_DOMAIN
wrangler secret put AUTH0_CLIENT_ID
wrangler secret put AUTH0_CLIENT_SECRET
wrangler secret put AUTH0_AUDIENCE
wrangler secret put CONGRESS_API_KEY  # LegisAPI only

# Deploy
npm run deploy
```

### Frontend Deployment
1. Set environment variables in hosting platform
2. Update Auth0 callback URLs for production domain
3. Configure Stripe webhook endpoints
4. Update API URLs to point to deployed services

## Code Patterns

### Error Handling
- Use try-catch with meaningful error messages
- Return appropriate HTTP status codes
- Log errors to Analytics Engine (Cloudflare Workers)

### TypeScript Usage
- Define interfaces for all data structures
- Use strict null checks
- Avoid `any` types

### API Response Format
```typescript
{
  success: boolean,
  data?: any,
  error?: string,
  metadata?: {
    page: number,
    limit: number,
    total: number
  }
}
```

### Component Structure
```typescript
// Functional component with TypeScript
interface ComponentProps {
  // Props definition
}

export function Component({ prop1, prop2 }: ComponentProps) {
  // Implementation
}
```

## Development Memory

- Always use `cd` with double quotes or backticks to handle directories with spaces or special characters
- When changing directories, verify the path is correct by printing the current directory with `pwd`
- Use tab completion or escape spaces in directory names to ensure accurate navigation