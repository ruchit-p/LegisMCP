# Database Consistency Analysis

## Database Architecture

### Primary Database: Cloudflare D1 (SQLite)
- **Location**: LegisAPI service only
- **Binding**: `LEGIS_DB` in wrangler.jsonc
- **Schema Files**: 
  - `schema.sql` (basic/original)
  - `schema-new.sql` (comprehensive/current?)

### Schema Comparison

#### Original Schema (`schema.sql`)
```sql
Tables:
- users (basic fields)
- api_usage (simple tracking)
```

#### New Schema (`schema-new.sql`)
```sql
Tables:
- plans (subscription tiers)
- users (enhanced with Stripe integration)
- api_usage (enhanced tracking)
- mcp_logs (MCP-specific tracking)
- auth_config (Auth0 configuration)
- stripe_webhook_logs
- payment_history
- user_subscription_details (view)
```

## Data Model Analysis

### User Model Inconsistencies

#### Auth0 User Data
```javascript
{
  sub: "auth0|xxxxx",        // User ID
  email: "user@example.com",
  name: "John Doe",
  email_verified: true,
  // ... other Auth0 claims
}
```

#### D1 Database User
```sql
users table:
- auth0_user_id (maps to sub)
- email
- name
- stripe_customer_id
- current_plan_id
- subscription_status
- api_calls_count
- api_calls_reset_at
```

#### Frontend User Representation
```typescript
// No consistent TypeScript interface found
// User data mixed from Auth0 session and API calls
```

#### MCP Server User
```typescript
interface UserProps {
  // Definition exists but minimal
  // Doesn't include subscription details
}
```

### Subscription Plan Models

#### Database Plans Table
```sql
plans:
- Free: 100 calls (one-time)
- Developer: 1,000 calls/month
- Professional: 10,000 calls/month
- Enterprise: Unlimited (-1)
```

#### Frontend Stripe Config
```typescript
plans: {
  free: { amount: 0 },
  starter: { amount: 999 },      // $9.99
  professional: { amount: 2999 }, // $29.99
  enterprise: { amount: 0 }
}
```

#### Inconsistency Found
- Database uses "Developer" vs Frontend uses "starter"
- Pricing mismatch: DB shows different pricing in schema comments

### Usage Tracking Models

#### API Usage Table
```sql
api_usage:
- user_id
- endpoint
- method
- status_code
- response_time_ms
- error_message
- ip_address
- user_agent
- timestamp
```

#### MCP Logs Table
```sql
mcp_logs:
- user_id
- tool_name
- request_data (JSON)
- response_data (JSON)
- status
- error_message
- response_time_ms
- tokens_used
- timestamp
```

#### Issue: No MCP Log Implementation
- Table exists in schema but no code writes to it
- MCP Server doesn't log tool usage
- Frontend usage logger doesn't persist to database

## Data Flow Issues

### 1. User Creation Flow
```
Auth0 Signup → Frontend → (Missing Link) → LegisAPI Database
                    ↓
            MCP OAuth Callback → Register User API → Database
```
**Problem**: Two separate paths for user creation

### 2. Subscription Update Flow
```
Stripe Webhook → Frontend → (No Implementation) → Database
```
**Problem**: No code to update database with Stripe data

### 3. Usage Tracking Flow
```
API Call → LegisAPI Middleware → api_usage table ✓
MCP Tool → MCP Server → (No Implementation) → mcp_logs table ✗
```
**Problem**: MCP usage not tracked

## Missing Database Operations

### 1. No Stripe Integration
- Frontend receives Stripe webhooks
- No API endpoints to update user subscriptions
- `stripe_customer_id` never populated
- `payment_history` table unused

### 2. No Usage Reset Mechanism
- `api_calls_reset_at` field exists
- No cron job or trigger to reset counts
- Monthly quotas won't reset automatically

### 3. No MCP Usage Recording
- `mcp_logs` table defined
- No code in MCP Server to write logs
- Can't track MCP-specific usage

### 4. No Auth Config Usage
- `auth_config` table pre-populated
- No code reads from this table
- Configuration still hardcoded

## Type Safety Issues

### 1. No Shared Types
- Each service defines its own user types
- No shared package for common models
- Risk of drift between services

### 2. JSON Fields Without Schema
- `features` in plans table
- `request_data` in mcp_logs
- `allowed_callback_urls` in auth_config
- No TypeScript types for JSON structures

### 3. Missing Validation
- No Zod or similar validation for database data
- Raw SQL queries without type checking
- Potential for runtime errors

## Data Integrity Concerns

### 1. Orphaned Records
- User can exist in Auth0 but not D1
- Stripe customer without corresponding user
- API usage without valid user_id

### 2. Inconsistent States
- User subscription in Stripe vs database
- API quota vs actual usage
- Plan limits vs enforcement

### 3. No Transactions
- Multi-step operations not atomic
- Partial updates possible
- No rollback mechanism

## Schema Migration Issues

### 1. Two Schema Files
- Unclear which is active
- No migration scripts
- Risk of schema mismatch

### 2. No Version Control
- No schema version tracking
- No migration history
- Difficult to update production

### 3. Pre-populated Data
- Plans inserted in schema file
- No seed data management
- Hard to update plan details

## Recommendations for Database Consistency

1. **Single Source of Truth**
   - Choose primary schema file
   - Remove or archive old schema
   - Document current state

2. **Implement Missing Integrations**
   - Stripe webhook → database updates
   - MCP usage → mcp_logs table
   - Usage reset mechanism

3. **Type Safety**
   - Create shared types package
   - Use Zod for validation
   - Type-safe database queries

4. **Data Integrity**
   - Add foreign key constraints
   - Implement transactions
   - Regular consistency checks

5. **Migration Strategy**
   - Use migration tool (Drizzle, Prisma)
   - Version control schemas
   - Automated deployments