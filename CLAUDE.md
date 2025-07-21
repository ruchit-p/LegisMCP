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
npm run cf:preview   # Preview Cloudflare build
npm run cf:dev       # Cloudflare dev server
npm run setup-admin  # Setup admin user
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

````bash
cd LegisAPI
wrangler d1 create legis-db
wrangler d1 execute legis-db --file=./schema.sql

# Database migrations
wrangler d1 execute legis-db --file=./migrations/001_add_user_roles.sql
wrangler d1 execute legis-db --file=./migrations/002_add_subscription_billing_cycle.sql
wrangler d1 execute legis-db --file=./migrations/003_add_monitoring_events.sql
wrangler d1 execute legis-db --file=./migrations/004_add_sessions_table.sql

## Production API URL

**LegisAPI is deployed at**: `https://api.example.com`

## ✅ Recent Improvements Completed (Jan 16, 2025)

**Database Optimization & Cleanup:**
1. ✅ **Added missing `user_subscription_details` view** - This view was actively used by MCP endpoints but missing from the remote database. Now provides efficient subscription lookups with plan details, usage limits, and remaining calls.

2. ✅ **Cleaned up unused `api_usage_enhanced` table** - Removed unused table definition from schema.sql that was cluttering the codebase with zero references.

3. ✅ **Verified all database migrations current** - Confirmed all 4 migrations (user roles, billing cycles, monitoring events, sessions) are properly applied to remote database.

**Auth.js Migration Complete:**
4. ✅ **100% Complete Auth.js Migration** - Successfully migrated from Auth0 SDK to Auth.js (NextAuth) with:
   - ✅ Proper TypeScript typing for JWT callbacks and session handling
   - ✅ Extended session interface to include `stripeCustomerId`
   - ✅ Removed unused imports and cleaned up compatibility functions
   - ✅ All linting errors resolved (build passes with exit code 0)
   - ✅ Maintained backward compatibility with existing Auth0 setup
   - ✅ JWT strategy with proper token management
   - ✅ Session persistence and security maintained

**Production Readiness:**
- ✅ **TypeScript compilation** - All type errors resolved
- ✅ **ESLint validation** - All linting errors fixed
- ✅ **Build optimization** - Production build completes successfully
- ✅ **Database consistency** - All views, tables, and migrations synchronized

**Next Steps Available:**
- End-to-end authentication flow testing (optional)
- Custom D1 adapter implementation (future enhancement)
- Additional user role management features (if needed)

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
- **Payments**: Stripe for subscription management (Developer $9.99/mo, Professional $29.99/mo, Enterprise custom pricing)
- **Database**: Cloudflare D1 (SQLite) for user management and analytics
- **Storage**: Cloudflare KV for OAuth state and caching
- **Deployment**: Cloudflare Workers (backend), Cloudflare Pages (frontend)
- **MCP Protocol**: Model Context Protocol for AI agent integration
- **Runtime**: Durable Objects for session management and state
- **Analytics**: Cloudflare Analytics Engine for usage tracking
- **Scheduling**: Cron jobs for data maintenance and monitoring

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
````

### MCP Server (.dev.vars)

```bash
AUTH0_DOMAIN='<tenant>.auth0.com'
AUTH0_CLIENT_ID='<client-id>'
AUTH0_CLIENT_SECRET='<client-secret>'
AUTH0_AUDIENCE='urn:legis-api'
AUTH0_SCOPE='openid email profile offline_access read:bills read:members read:votes read:committees'
NODE_ENV='development'
API_BASE_URL='http://localhost:8789'  # For local development
# API_BASE_URL='https://api.example.com'  # For production
```

### LegisAPI (.dev.vars)

```bash
AUTH0_DOMAIN='<tenant>.auth0.com'
AUTH0_AUDIENCE='urn:legis-api'
CONGRESS_API_KEY='<optional-for-higher-rate-limits>'
```

## Available MCP Servers

This project has access to multiple MCP servers that provide comprehensive tooling for various development and research tasks:

### 1. Legislative MCP Server (`LegislativeMCP`)

Core legislative research and analysis tools:

- `analyze-bill` - Comprehensive bill analysis including sponsor/cosponsor data, passage likelihood, and controversy assessment
- `list-recent-bills` - Recent bills sorted by date with filtering options
- `get-bill` - Get detailed bill information by congress/type/number
- `trending-bills` - Trending legislation analysis based on activity and momentum
- `congress-query` - Natural language congressional research tool
- `member-details` - Detailed member information including legislative metrics and committee memberships
- `member-search` - Search members of Congress with comprehensive filtering
- `universal-search` - Cross-collection search across all legislative data
- `subresource` - Access subresource data (actions, cosponsors, committees, etc.)
- `whoami` - Returns authenticated user information
- `get-usage-stats` - Get API usage statistics

### 2. Firecrawl MCP Server (`firecrawl-mcp`)

Advanced web scraping and research capabilities:

- `firecrawl_scrape` - Single URL content extraction with advanced options
- `firecrawl_map` - Website URL discovery and mapping
- `firecrawl_crawl` - Multi-page crawling with depth control
- `firecrawl_search` - Web search with content extraction
- `firecrawl_extract` - Structured data extraction using LLM
- `firecrawl_deep_research` - Comprehensive research tool with intelligent crawling
- `firecrawl_generate_llmstxt` - Generate standardized llms.txt files

### 3. Stripe MCP Server (`stripe`)

Complete payment and subscription management:

- **Customer Management**: `create_customer`, `list_customers`
- **Product/Pricing**: `create_product`, `list_products`, `create_price`, `list_prices`
- **Payment Processing**: `create_payment_link`, `create_invoice`, `finalize_invoice`
- **Subscription Management**: `list_subscriptions`, `cancel_subscription`, `update_subscription`
- **Billing Operations**: `retrieve_balance`, `create_refund`, `list_payment_intents`
- **Promotions**: `create_coupon`, `list_coupons`
- **Dispute Management**: `update_dispute`, `list_disputes`
- **Documentation**: `search_stripe_documentation`

### 4. Auth0 MCP Server (`auth0`)

Identity and access management:

- **Application Management**: `create_application`, `list_applications`, `get_application`, `update_application`
- **Resource Servers**: `create_resource_server`, `list_resource_servers`, `get_resource_server`, `update_resource_server`
- **Actions**: `create_action`, `list_actions`, `get_action`, `update_action`, `deploy_action`
- **Logs**: `list_logs`, `get_log` for monitoring and debugging
- **Forms**: `create_form`, `list_forms`, `get_form`, `update_form`

### 5. Cloudflare MCP Servers

Cloud infrastructure management and monitoring:

#### Worker Bindings (`cloudflare-worker-bindings`)

- **Account Management**: `accounts_list`, `set_active_account`
- **KV Storage**: `kv_namespaces_list`, `kv_namespace_create`, `kv_namespace_get`, `kv_namespace_update`, `kv_namespace_delete`
- **Workers**: `workers_list`, `workers_get_worker`, `workers_get_worker_code`
- **R2 Storage**: `r2_buckets_list`, `r2_bucket_create`, `r2_bucket_get`, `r2_bucket_delete`
- **D1 Database**: `d1_databases_list`, `d1_database_create`, `d1_database_get`, `d1_database_delete`, `d1_database_query`
- **Hyperdrive**: `hyperdrive_configs_list`, `hyperdrive_config_get`, `hyperdrive_config_edit`, `hyperdrive_config_delete`
- **Documentation**: `search_cloudflare_documentation`, `migrate_pages_to_workers_guide`

#### Observability (`cloudflare-observability`)

- **Worker Monitoring**: `query_worker_observability`, `observability_keys`, `observability_values`
- **Account Management**: `accounts_list`, `set_active_account`
- **Worker Information**: `workers_list`, `workers_get_worker`, `workers_get_worker_code`
- **Documentation**: `search_cloudflare_documentation`

### 6. Browser Automation

#### Playwright (`playwright`)

Full browser automation and testing:

- **Navigation**: `browser_navigate`, `browser_navigate_back`, `browser_navigate_forward`
- **Interaction**: `browser_click`, `browser_type`, `browser_hover`, `browser_drag`, `browser_select_option`
- **Inspection**: `browser_snapshot`, `browser_take_screenshot`, `browser_console_messages`
- **Tab Management**: `browser_tab_list`, `browser_tab_new`, `browser_tab_select`, `browser_tab_close`
- **Testing**: `browser_generate_playwright_test`, `browser_wait_for`
- **Utilities**: `browser_press_key`, `browser_file_upload`, `browser_pdf_save`

#### Browserbase (`browserbase`)

Cloud browser sessions:

- **Session Management**: `browserbase_session_create`, `browserbase_session_close`
- **Context Management**: `browserbase_context_create`, `browserbase_context_delete`
- **Navigation**: `browserbase_navigate`, `browserbase_navigate_back`, `browserbase_navigate_forward`
- **Interaction**: `browserbase_click`, `browserbase_type`, `browserbase_hover`, `browserbase_drag`
- **Inspection**: `browserbase_snapshot`, `browserbase_take_screenshot`, `browserbase_get_text`
- **Utilities**: `browserbase_press_key`, `browserbase_select_option`, `browserbase_wait`, `browserbase_resize`

### 7. Sequential Thinking (`sequential-thinking`)

Dynamic problem-solving framework:

- `sequentialthinking` - Structured thinking process with revision capabilities for complex problem analysis

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

## Cloudflare Resource Bindings

### D1 Databases

- `legis-db` - Main database for user management and analytics
- Migrations stored in `LegisAPI/migrations/`

### KV Namespaces

- `oauth-state` - OAuth state storage
- `user-sessions` - User session management
- `api-cache` - API response caching

### Analytics Engine

- `usage-analytics` - API usage tracking
- `error-analytics` - Error monitoring
- `performance-metrics` - Performance tracking

### Durable Objects

- `SessionManager` - MCP session state management
- `RateLimiter` - Rate limiting enforcement

### AI Bindings

- `@cf/meta/llama-3.1-8b-instruct` - AI model for analysis features

## Troubleshooting

### Common Issues

#### Port Conflicts

```bash
# Check if ports 3000, 8788, 8789 are available
lsof -i :3000 -i :8788 -i :8789
# Kill processes if needed
kill -9 <PID>
```

#### Authentication Failures

- Verify Auth0 configuration in environment variables
- Check JWT token expiration and refresh
- Ensure callback URLs match environment

#### Database Connection Issues

```bash
# Test D1 connection
wrangler d1 execute legis-db --command="SELECT 1"
# Reset database if needed
wrangler d1 execute legis-db --file=./schema.sql
```

#### Deployment Problems

- Check wrangler.jsonc compatibility flags
- Verify all secrets are set: `wrangler secret list`
- Check Cloudflare bindings in dashboard

### Development Tips

- Use `wrangler tail` to monitor logs during development
- Test MCP tools with MCP Inspector: `http://localhost:8788/mcp`
- Use `npm run type-check` before deployment
- Monitor usage with Analytics Engine queries

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

## D1 Database Architecture

### Database Overview

The LegisMCP platform uses a **centralized Cloudflare D1 database** (`legis-db`) with clear separation of concerns:

1. **LegisAPI** - Has **exclusive direct access** to the D1 database
2. **LegisMCP Server** - Makes HTTP API calls to LegisAPI (no direct DB access)
3. **LegisMCP Frontend** - Makes HTTP API calls to both services (no direct DB access)

### Database Configuration

- **Database Type**: Cloudflare D1 (SQLite-based)
- **Database Name**: `legis-db`
- **Database ID**: `80f8112f-38fb-4220-86e6-17c611504f78`
- **Primary Service**: LegisAPI (exclusive direct access)
- **Location**: Cloudflare's global edge network

### Data Flow Pattern

```
Frontend → Auth0 (JWT) → LegisMCP Server → LegisAPI → D1 Database
```

All database operations flow through LegisAPI, ensuring data consistency, security, and maintainability.

### Core Database Tables

#### Users Table

Central user management with Auth0 integration:

- `id` - Primary key
- `auth0_user_id` - Auth0 authentication identifier
- `email` - User email address
- `role` - Access control (user, admin, super_admin)
- `plan` - Legacy plan field (replaced by current_plan_id)
- `api_calls_count` - Current API usage count
- `api_calls_limit` - Maximum API calls allowed
- `mcp_calls_count` - Current MCP tool usage count
- `mcp_calls_limit` - Maximum MCP tool calls allowed
- `stripe_customer_id` - Stripe customer reference
- `subscription_status` - Current subscription state
- `billing_cycle_start/end` - Subscription billing periods

#### Plans Table

Subscription plan definitions:

- **Free**: 100 MCP calls (one-time), $0
- **Developer**: 1,000 MCP calls/month, $9.99/month ($7.99/month yearly)
- **Professional**: 10,000 MCP calls/month, $29.99/month ($23.99/month yearly)
- **Enterprise**: Unlimited MCP calls, Contact Sales

#### Tracking Tables

- `api_usage` & `api_usage_enhanced` - API usage tracking
- `mcp_logs` - MCP tool usage logging
- `user_activity_events` - User behavior tracking
- `system_alerts` - System health alerts
- `error_events` - Error tracking and debugging
- `monitoring_events` - System operation monitoring
- `payment_history` - Stripe payment tracking

### Database Operations

#### Common Patterns

```typescript
// User lookup (LegisAPI/src/services/user.ts)
const existingUser = await this.db
  .prepare("SELECT * FROM users WHERE auth0_user_id = ?")
  .bind(auth0UserId)
  .first<User>();

// Usage tracking
await this.db
  .prepare(
    "INSERT INTO api_usage (user_id, endpoint, method, status_code, response_time_ms) VALUES (?, ?, ?, ?, ?)"
  )
  .bind(userId, endpoint, method, statusCode, responseTime)
  .run();
```

#### Performance Optimizations

- Strategic indexing on frequently queried fields
- Prepared statements for SQL injection prevention
- Automated triggers for timestamp updates
- Composite indexes for complex queries

### Database Security

- **Auth0 Integration**: Primary authentication provider
- **JWT Tokens**: Secure API access between services
- **Role-based Access**: user, admin, super_admin roles
- **Plan-based Limits**: API call limits by subscription
- **Audit Logging**: Comprehensive activity tracking

### Database Monitoring

- **System Health Metrics**: Error rates, response times, usage patterns
- **Automated Alerts**: Based on predefined thresholds
- **Error Tracking**: Comprehensive error logging
- **Performance Monitoring**: Response time tracking

### Database Development

```bash
# Local development
wrangler d1 execute legis-db --local --file=./schema.sql

# Test database queries
wrangler d1 execute legis-db --command="SELECT COUNT(*) FROM users"

# Check system health
wrangler d1 execute legis-db --command="SELECT * FROM system_health_metrics ORDER BY timestamp DESC LIMIT 10"
```

For comprehensive database documentation, see `D1_Database_Documentation.md`.

## Development Memory

- Always use `cd` with double quotes or backticks to handle directories with spaces or special characters
- When changing directories, verify the path is correct by printing the current directory with `pwd`
- Use tab completion or escape spaces in directory names to ensure accurate navigation
