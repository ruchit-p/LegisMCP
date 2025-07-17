# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LegislativeMCP is an AI-powered legislative data access system that provides real-time access to U.S. legislative data from congress.gov through a Model Context Protocol (MCP) server with Auth0 authentication, deployed on Cloudflare Workers.

## Project Structure

The repository contains two main components:

### 1. LegisMCP Auth0 OIDC Server (`LegisMCP-auth0-oidc/`)
- **Purpose**: MCP server with Auth0 authentication that provides legislative data tools for AI agents
- **Key Files**:
  - `src/index.ts`: Main entry point with `AuthenticatedMCP` class and OAuth setup
  - `src/services/legis.ts`: Legislative API service integration
  - `src/tools/`: MCP tool implementations (bills, members, votes, committees)
  - `src/utils/`: Utility functions and MCP helpers
  - `wrangler.jsonc`: Cloudflare Workers configuration

### 2. LegisAPI (`LegisAPI/`)
- **Purpose**: Protected REST API that interfaces with congress.gov
- **Key Files**:
  - `src/index.ts`: Hono-based API with JWT middleware
  - `src/middlewares/jwt.ts`: Auth0 JWT verification middleware
  - `src/services/congress-v2.ts`: Congress.gov API integration with caching
  - `schema.sql`: D1 database schema for user management and analytics
  - `wrangler.jsonc`: Cloudflare Workers configuration

## Development Commands

### Both Projects
```bash
npm run dev          # Start local development server
npm run deploy       # Deploy to Cloudflare Workers
npm run type-check   # TypeScript type checking
npm run cf-typegen   # Generate Cloudflare Workers types
```

### Development Ports
- LegisAPI: Port 8789
- LegisMCP: Port 8788

### Database Setup (LegisAPI)
```bash
wrangler d1 create legis-db
wrangler d1 execute legis-db --file=./schema.sql
```

## Testing

### Integration Testing
```bash
./test-integration.sh  # Tests both services together
```

### Local Testing
1. Start LegisAPI: `cd LegisAPI && npm run dev`
2. Start LegisMCP: `cd LegisMCP-auth0-oidc && npm run dev`
3. Use MCP Inspector with Streamable HTTP transport: `http://localhost:8788/mcp`

## Configuration Requirements

### Environment Variables (LegisMCP)
- `AUTH0_DOMAIN`: Auth0 tenant domain
- `AUTH0_CLIENT_ID`: Auth0 application client ID
- `AUTH0_CLIENT_SECRET`: Auth0 application client secret
- `AUTH0_AUDIENCE`: API identifier (e.g., "urn:legis-api")
- `AUTH0_SCOPE`: Requested scopes (e.g., "openid email profile offline_access read:bills read:members read:votes read:committees")
- `NODE_ENV`: Environment ("development" for local)
- `API_BASE_URL`: LegisAPI base URL

### Environment Variables (LegisAPI)
- `AUTH0_DOMAIN`: Auth0 tenant domain
- `AUTH0_AUDIENCE`: API identifier
- `CONGRESS_API_KEY`: Congress.gov API key (optional)

### Cloudflare Resources
- **D1 Database**: User management and API usage tracking (`LEGIS_DB`)
- **KV Namespace**: OAuth state storage (`OAUTH_KV`)
- **Durable Objects**: `AuthenticatedMCP` class for MCP session management
- **Analytics Engine**: Usage tracking (`LEGIS_ANALYTICS`)
- **AI Binding**: Available for AI operations

## Architecture Notes

### OAuth Flow
1. Client requests authorization → consent screen
2. User consent → redirect to Auth0
3. Auth0 callback → token exchange
4. MCP session established with Auth0 tokens

### MCP Tools Implementation
- `whoami`: Returns user claims from Auth0 token
- `search-bills`: Search congressional bills
- `get-bill`: Get specific bill details
- `search-members`: Search members of Congress
- `get-member`: Get specific member details
- `get-recent-votes`: Get recent votes from House or Senate
- `get-committees`: Get congressional committees
- `get-usage-stats`: Get API usage statistics

### Security Features
- PKCE (Proof Key for Code Exchange) for OAuth
- CSRF protection with consent tokens
- JWT verification with Auth0 JWKS
- Scope-based API access control
- User tracking with tiered access plans (developer, professional, enterprise)

### Database Schema
- `users` table: Tracks Auth0 users, plans, and API quotas
- `api_usage` table: Logs all API calls for analytics
- Includes indexes for performance and triggers for timestamps

## Deployment Considerations

1. Set Cloudflare Workers secrets using `wrangler secret put`
2. Update Auth0 callback URLs for deployed environments
3. Configure KV namespace and D1 database IDs in wrangler.jsonc
4. Ensure proper CORS settings for cross-origin requests
5. Set up Analytics Engine bindings for usage tracking