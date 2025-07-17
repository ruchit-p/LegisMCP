# Cross-Service Integration Analysis

## System Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                 │     │                  │     │                 │
│  Frontend       │────▶│  MCP Server      │────▶│  LegisAPI       │
│  (Next.js)      │     │  (CF Workers)    │     │  (CF Workers)   │
│                 │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
    ┌────────┐            ┌──────────┐            ┌──────────┐
    │ Auth0  │            │ Durable  │            │    D1    │
    │        │            │ Objects  │            │ Database │
    └────────┘            └──────────┘            └──────────┘
```

## Authentication Flow Analysis

### 1. Frontend Authentication
- **Provider**: Auth0 via `@auth0/nextjs-auth0`
- **Session**: Server-side cookies
- **Protected Routes**: Middleware-based protection

### 2. MCP Server Authentication
- **OAuth Flow**: Custom OAuth2/OIDC implementation
- **Auth0 Integration**: Same tenant as Frontend
- **Session Management**: Durable Objects for state

### 3. LegisAPI Authentication
- **JWT Verification**: Auth0 JWKS validation
- **Audience**: `urn:legis-api`
- **Scope-based Access**: Fine-grained permissions

### Authentication Consistency Issues
1. **Different Auth0 Client IDs**:
   - Frontend: `eUovWUOrn6gy4vIXHsxuFEOsoogZcVXJ`
   - MCP Server: `YOUR_AUTH0_CLIENT_ID`
   - This is expected for different applications

2. **Token Flow Complexity**:
   - Frontend → Auth0 → Session Cookie
   - MCP Client → MCP Server OAuth → Auth0 Token
   - MCP Server → LegisAPI with JWT
   - Multiple authentication layers increase complexity

## Data Flow Analysis

### User Registration Flow
1. **Frontend**: User signs up via Auth0
2. **MCP Server**: On OAuth callback, registers user with LegisAPI
3. **LegisAPI**: Creates user record in D1 database
4. **Issue**: User might exist in Auth0 but not in D1 if registration fails

### API Request Flow
1. **Frontend**: User initiates MCP tool call
2. **MCP Client**: Sends request via SSE to MCP Server
3. **MCP Server**: Validates session, calls LegisAPI with JWT
4. **LegisAPI**: Verifies JWT, checks user quota, returns data
5. **Response**: Flows back through the chain

### Subscription Management Flow
1. **Frontend**: User purchases via Stripe
2. **Stripe Webhook**: Sent to Frontend
3. **Frontend**: Updates user subscription (where?)
4. **Issue**: No clear path to update D1 database with subscription

## Configuration Inconsistencies

### 1. Port Misconfiguration
- **Issue**: Frontend `next.config.js` proxies MCP to port 8789 (LegisAPI)
- **Should be**: Port 8788 (MCP Server)
- **Impact**: MCP connections would fail in production

### 2. API Base URL
- **MCP Server**: Points to production LegisAPI in wrangler.jsonc
- **Development**: Should use `http://localhost:8789`
- **Impact**: Local development would hit production API

### 3. Database Schema Mismatch
- **LegisAPI**: Has two schema files (schema.sql vs schema-new.sql)
- **Frontend**: No database interaction
- **MCP Server**: No database interaction
- **Issue**: Unclear which schema is active

## Security Analysis

### Strengths
1. **Multi-layer Authentication**: Each service validates tokens
2. **Scope-based Access**: Fine-grained permissions
3. **PKCE Implementation**: Secure OAuth flow
4. **JWT Verification**: Proper JWKS validation

### Weaknesses
1. **Hardcoded Secrets**: Auth0 credentials in wrangler.jsonc
2. **CORS Configuration**: Very permissive (`*` origin)
3. **Missing Rate Limiting**: No visible rate limiting in MCP Server
4. **Token Refresh**: Unclear implementation across services

## User Data Consistency

### User Records
- **Auth0**: Master user record
- **D1 Database**: Extended user data (subscription, usage)
- **Stripe**: Customer and subscription data
- **Issue**: No clear synchronization mechanism

### Usage Tracking
- **LegisAPI**: Tracks in `api_usage` table
- **MCP Server**: No direct tracking
- **Frontend**: Has usage logger but integration unclear
- **Issue**: MCP-specific usage not tracked properly

## Missing Integration Points

1. **Subscription Sync**:
   - Stripe webhooks received by Frontend
   - No clear path to update LegisAPI database
   - User subscription status might be out of sync

2. **Usage Reset**:
   - Database has `api_calls_reset_at` field
   - No visible cron job or trigger for resets
   - Monthly quotas might not reset properly

3. **MCP Usage Tracking**:
   - `mcp_logs` table exists in schema-new.sql
   - No implementation in MCP Server to log usage
   - Analytics incomplete without MCP tracking

4. **Error Propagation**:
   - Errors in LegisAPI might not surface properly
   - MCP Server error handling could mask issues
   - Frontend might show generic errors

## Critical Integration Issues

1. **User Registration Race Condition**:
   - User can authenticate but registration with LegisAPI might fail
   - No retry mechanism visible
   - User stuck in limbo state

2. **Subscription State Management**:
   - Three sources of truth (Auth0, Stripe, D1)
   - No clear master record
   - Potential for inconsistent states

3. **API Quota Enforcement**:
   - Tracked at LegisAPI level
   - MCP Server unaware of quotas
   - Frontend can't preemptively block calls

4. **Session Lifecycle**:
   - Frontend Auth0 session
   - MCP Server OAuth session
   - Token expiration handling unclear
   - Multiple session timeouts to manage