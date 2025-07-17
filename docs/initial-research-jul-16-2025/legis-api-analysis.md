# LegisAPI Analysis

## Overview
LegisAPI is a protected REST API built on Cloudflare Workers with D1 database, serving as the backend for legislative data access from congress.gov.

## Database Schema Analysis

### Current State
- **Two schema files exist**: 
  - `schema.sql` - Basic schema (appears to be outdated)
  - `schema-new.sql` - Comprehensive schema (appears to be current)

### Key Tables in schema-new.sql:
1. **users** - User management with Stripe integration
   - auth0_user_id (unique identifier from Auth0)
   - stripe_customer_id (Stripe customer reference)
   - current_plan_id (foreign key to plans)
   - subscription_status (free, active, canceled, past_due, trialing)
   - api_calls_count & api_calls_reset_at (usage tracking)

2. **plans** - Subscription tiers
   - Pre-populated with: Free, Developer (monthly/yearly), Professional (monthly/yearly), Enterprise
   - mcp_calls_limit (-1 for unlimited)
   - stripe_price_id & stripe_product_id

3. **api_usage** - Detailed API call tracking
   - User, endpoint, method, status, response time
   - IP address and user agent tracking

4. **mcp_logs** - MCP tool usage tracking
   - Tool name, request/response data, status
   - Tokens used (for AI usage tracking)

5. **auth_config** - Auth0 configuration
   - Pre-configured with production Auth0 tenant details

6. **stripe_webhook_logs** & **payment_history** - Payment tracking

## Authentication Implementation

### JWT Middleware (`src/middlewares/jwt.ts`)
- Uses Auth0 JWKS for token verification
- Validates audience: `urn:legis-api`
- Validates issuer: `https://your-tenant.us.auth0.com/`
- Extracts JWT payload and makes it available to handlers
- Implements `requireScope()` for endpoint protection

### Auth0 Configuration
- Domain: `your-tenant.us.auth0.com`
- Audience: `urn:legis-api`
- Scopes: `openid email profile offline_access read:bills read:members read:votes read:committees`

## API Endpoints Structure

### Public Endpoints (No Auth)
- `/api/health` - Health check
- `/api/webhooks/*` - Stripe webhooks
- `/api/config/*` - Public configuration

### Protected Endpoints (JWT Required)
- `/api/users/register` - User registration
- `/api/me` - Current user info
- `/api/usage` - Usage statistics
- `/api/user/profile` - Detailed user profile

### Scoped Endpoints
All legislative data endpoints require specific scopes:
- `/api/bills/*` - Requires `read:bills`
- `/api/members/*` - Requires `read:members`
- `/api/votes/*` - Requires `read:votes`
- `/api/committees/*` - Requires `read:committees`

## Service Architecture
- **CongressServiceV2** - Handles congress.gov API integration
- **UserService** - User management and database operations
- **ApiKeyService** - API key management (for congress.gov)
- **StripeService** - Payment processing
- **PlansService** - Subscription management

## Security Features
1. **JWT Authentication** with Auth0 JWKS validation
2. **Scope-based authorization** for API endpoints
3. **CORS enabled** for cross-origin requests
4. **Analytics middleware** for request tracking
5. **Rate limiting** based on subscription plan

## Potential Issues Found
1. **Schema Confusion**: Two schema files exist - needs clarification on which is active
2. **Hard-coded Auth0 Domain**: Auth0 domain is hardcoded in index.ts instead of using environment variable
3. **Missing Error Handling**: Some endpoints lack comprehensive error handling
4. **No Request Validation**: Missing input validation middleware
5. **Usage Tracking**: API calls are tracked but reset mechanism is unclear