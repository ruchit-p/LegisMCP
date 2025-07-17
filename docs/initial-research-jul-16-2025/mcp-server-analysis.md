# LegisMCP Server Analysis

## Overview
LegisMCP Server is a Model Context Protocol (MCP) server built on Cloudflare Workers with Durable Objects, providing AI agents with authenticated access to legislative data through OAuth2/OIDC flow.

## Architecture

### Core Components
1. **AuthenticatedMCP Class** (Durable Object)
   - Extends McpAgent from `@cloudflare/mcp-agent`
   - Manages stateful MCP sessions
   - Handles tool registration and execution

2. **OAuth Provider**
   - Uses `@cloudflare/workers-oauth-provider`
   - Implements full OAuth2/OIDC flow with Auth0
   - PKCE (Proof Key for Code Exchange) for security
   - Custom consent screen with CSRF protection

3. **MCP Transport**
   - Streamable HTTP transport at `/mcp` endpoint
   - OAuth-authenticated sessions
   - Session management via Durable Objects

## Authentication Flow

### OAuth Implementation (`src/auth.ts`)
1. **Authorization Endpoint** (`/authorize`)
   - Generates PKCE code verifier/challenge
   - Creates transaction state for CSRF protection
   - Shows consent screen before Auth0 redirect
   - Stores auth request in secure httpOnly cookie

2. **Callback Endpoint** (`/callback`)
   - Handles Auth0 callback with authorization code
   - Validates CSRF token from consent form
   - Exchanges code for tokens using PKCE
   - Registers user with LegisAPI backend

3. **Token Exchange** (`/token`)
   - Exchanges authorization code for access/refresh tokens
   - Validates PKCE code verifier
   - Returns tokens to MCP client

### Auth0 Configuration
- Domain: `your-tenant.us.auth0.com`
- Client ID: `YOUR_AUTH0_CLIENT_ID`
- Audience: `urn:legis-api`
- Scopes: `openid email profile offline_access read:bills read:members read:votes read:committees`

## API Integration

### Connection to LegisAPI
- Base URL: `https://legis-api.ruchit.workers.dev` (prod) / `http://localhost:8789` (dev)
- All MCP tools make authenticated calls to LegisAPI
- Access token passed in Authorization header
- No direct congress.gov API calls

### CongressApiService
- Initially designed for congress.gov direct access
- Currently used by MCP tools but configured to call LegisAPI endpoints
- Includes rate limiting and error handling
- Comprehensive parameter validation

## MCP Tools Implementation

### Tool Categories
1. **Bills**
   - `search-bills`: List recent bills with filters
   - `get-bill`: Get specific bill details

2. **Members**
   - `search-members`: Search members of Congress
   - `get-member`: Get member details

3. **Votes**
   - `get-recent-votes`: Recent House/Senate votes

4. **Committees**
   - `get-committees`: List committees by chamber

5. **Analysis** (AI-powered)
   - `analyze-bill`: AI analysis of bill content
   - `enhanced-bill-analysis`: Advanced AI analysis

6. **Utility**
   - `whoami`: User authentication status
   - `get-usage-stats`: API usage statistics

### Tool Registration Pattern
- Tools defined with name, description, and Zod schema
- Handlers receive args, API base URL, and access token
- All tools check for authentication before execution
- Consistent error handling across tools

## Security Features

1. **PKCE Implementation**
   - Code verifier/challenge for OAuth flow
   - Prevents authorization code interception

2. **CSRF Protection**
   - Consent token validation
   - Transaction state tracking
   - Secure httpOnly cookies

3. **Token Management**
   - Access tokens for API calls
   - Refresh token support
   - Token expiration handling

4. **Session Isolation**
   - Durable Objects provide session isolation
   - Each MCP connection has its own session
   - No cross-session data leakage

## Configuration

### Environment Variables
- `AUTH0_DOMAIN`: Auth0 tenant
- `AUTH0_CLIENT_ID`: OAuth client ID
- `AUTH0_CLIENT_SECRET`: OAuth client secret
- `AUTH0_AUDIENCE`: API identifier
- `AUTH0_SCOPE`: Requested permissions
- `API_BASE_URL`: LegisAPI endpoint
- `NODE_ENV`: Environment setting

### Cloudflare Resources
- **Durable Objects**: AuthenticatedMCP binding
- **KV Namespace**: OAUTH_KV for state storage
- **AI Binding**: For analysis tools
- **CPU Limit**: 300,000ms

## Potential Issues Found

1. **CongressApiService Confusion**
   - Service designed for congress.gov but used for LegisAPI
   - May cause confusion about actual data source
   - Parameter validation might not match LegisAPI expectations

2. **Hard-coded Auth0 Values**
   - Auth0 domain and client ID in wrangler.jsonc
   - Should use secrets for production

3. **Error Handling**
   - Some tools lack detailed error messages
   - Rate limiting errors not clearly communicated

4. **Token Refresh**
   - Refresh token support exists but implementation unclear
   - No automatic token refresh visible

5. **Usage Tracking**
   - Tools don't directly track MCP usage
   - Relies on LegisAPI for usage metrics