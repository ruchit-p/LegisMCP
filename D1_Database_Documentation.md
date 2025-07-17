# LegisMCP D1 Database Documentation

## Overview

The LegisMCP platform uses a **Cloudflare D1 database** (`legis-db`) as its primary data store. D1 is a serverless SQLite database that provides high-performance, low-latency access to structured data. This document provides comprehensive documentation of the database schema, architecture, and usage patterns across all three platform components.

## Database Architecture

### Database Configuration
- **Database Type**: Cloudflare D1 (SQLite-based)
- **Database Name**: `legis-db`
- **Database ID**: `80f8112f-38fb-4220-86e6-17c611504f78`
- **Primary Service**: LegisAPI (exclusive direct access)
- **Location**: Cloudflare's global edge network

### Service Architecture & Database Access

```
┌─────────────────────┐    HTTP API     ┌─────────────────────┐    D1 Direct    ┌─────────────────────┐
│  LegisMCP Frontend  │ ────────────────> │   LegisMCP Server   │                 │      LegisAPI       │
│                     │                  │                     │                 │                     │
│ • React Components  │                  │ • MCP Tools         │                 │ • User Management   │
│ • Admin Dashboard   │                  │ • OAuth Proxy       │                 │ • Usage Tracking    │
│ • User Activity     │                  │ • Session Mgmt      │                 │ • Analytics         │
│ • Analytics Display │                  │ • No Direct DB      │                 │ • Billing           │
└─────────────────────┘                  └─────────────────────┘                 │ • Direct D1 Access  │
                                                   │                               └─────────────────────┘
                                                   │ HTTP API                                 │
                                                   └─────────────────────────────────────────┘
```

### Database Connection Pattern

1. **LegisAPI** - **EXCLUSIVE Direct Access**
   - Direct D1 database binding (`DB`)
   - All SQL operations and queries
   - Database migrations and schema updates
   - Primary data owner

2. **LegisMCP Server** - **No Direct Access**
   - HTTP API calls to LegisAPI
   - JWT authentication for API access
   - Stateless operations only

3. **LegisMCP Frontend** - **No Direct Access**
   - HTTP API calls to both LegisAPI and LegisMCP Server
   - Authentication via Auth0
   - Display and admin interface only

## Core Database Schema

### 1. Users Table
**Purpose**: Central user management and authentication
**Location**: `schema.sql:2-13`

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auth0_user_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'developer', 'professional', 'enterprise')),
    api_calls_count INTEGER DEFAULT 0,
    api_calls_limit INTEGER DEFAULT 100,
    -- Subscription fields (added in migrations)
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    current_plan_id INTEGER,
    subscription_status TEXT DEFAULT 'free',
    billing_cycle_start DATETIME,
    billing_cycle_end DATETIME,
    usage_reset_at DATETIME,
    mcp_calls_count INTEGER DEFAULT 0,
    mcp_calls_limit INTEGER DEFAULT 100,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (current_plan_id) REFERENCES plans(id)
);
```

**Key Fields**:
- `auth0_user_id`: Primary authentication identifier
- `role`: Access control (user, admin, super_admin)
- `plan`: Legacy plan field (replaced by current_plan_id)
- `api_calls_count`: Current API usage count
- `api_calls_limit`: Maximum API calls allowed
- `mcp_calls_count`: Current MCP tool usage count
- `mcp_calls_limit`: Maximum MCP tool calls allowed
- `stripe_customer_id`: Stripe customer reference
- `subscription_status`: Current subscription state

### 2. Plans Table
**Purpose**: Subscription plan definitions
**Location**: `migrations/002_add_subscription_billing_cycle.sql:5-22`

```sql
CREATE TABLE plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    billing_frequency TEXT NOT NULL CHECK (billing_frequency IN ('monthly', 'yearly', 'one_time')),
    stripe_price_id TEXT UNIQUE,
    stripe_product_id TEXT,
    amount INTEGER NOT NULL DEFAULT 0, -- Amount in cents
    currency TEXT NOT NULL DEFAULT 'usd',
    features TEXT NOT NULL DEFAULT '[]', -- JSON array
    highlighted_features TEXT NOT NULL DEFAULT '[]', -- JSON array
    description TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    mcp_calls_limit INTEGER NOT NULL DEFAULT 100,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Default Plans**:
- **Free**: 100 API calls/month, $0
- **Developer**: 5,000 API calls/month, $19/month
- **Professional**: 25,000 API calls/month, $49/month
- **Enterprise**: Unlimited API calls, $199/month

### 3. API Usage Tracking Tables

#### Basic API Usage
**Purpose**: Track API endpoint usage
**Location**: `schema.sql:16-25`

```sql
CREATE TABLE api_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### Enhanced API Usage
**Purpose**: Detailed API usage metrics
**Location**: `schema.sql:71-85`

```sql
CREATE TABLE api_usage_enhanced (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    error_message TEXT,
    ip_address TEXT,
    user_agent TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### MCP Tool Usage
**Purpose**: Track MCP tool calls
**Location**: `schema.sql:56-68`

```sql
CREATE TABLE mcp_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    tool_name TEXT NOT NULL,
    request_data JSON,
    response_data JSON,
    status TEXT CHECK (status IN ('success', 'error', 'timeout')),
    error_message TEXT,
    response_time_ms INTEGER,
    tokens_used INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 4. User Activity Tracking

#### User Activity Events
**Purpose**: Comprehensive user behavior tracking
**Location**: `schema.sql:34-53`

```sql
CREATE TABLE user_activity_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'page_view', 'button_click', 'form_interaction', 'search_query',
        'session_start', 'session_end', 'error', 'feature_usage',
        'navigation', 'scroll_depth', 'time_on_page'
    )),
    event_data JSON NOT NULL,
    page_url TEXT NOT NULL,
    page_title TEXT,
    referrer TEXT,
    user_agent TEXT,
    device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
    viewport_width INTEGER,
    viewport_height INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 5. Monitoring and Analytics

#### System Alerts
**Purpose**: System health monitoring and notifications
**Location**: `schema.sql:109-127`

```sql
CREATE TABLE system_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('error', 'warning', 'info', 'success')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    component TEXT NOT NULL, -- 'LegisAPI', 'MCP Server', 'Frontend'
    endpoint TEXT,
    error_code TEXT,
    affected_users_count INTEGER DEFAULT 0,
    is_resolved BOOLEAN DEFAULT 0,
    is_read BOOLEAN DEFAULT 0,
    resolved_at DATETIME,
    resolved_by TEXT,
    resolution_notes TEXT,
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Error Events
**Purpose**: Detailed error tracking and debugging
**Location**: `schema.sql:130-158`

```sql
CREATE TABLE error_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT NOT NULL,
    component TEXT NOT NULL,
    endpoint TEXT,
    method TEXT,
    status_code INTEGER,
    user_id INTEGER,
    user_email TEXT,
    stack_trace TEXT,
    error_count INTEGER DEFAULT 1,
    first_occurrence DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_occurrence DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved')),
    assigned_to TEXT,
    resolution_notes TEXT,
    tags TEXT,
    ip_address TEXT,
    user_agent TEXT,
    request_data JSON,
    response_data JSON,
    session_id TEXT,
    correlation_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### Error Metrics
**Purpose**: Aggregated error statistics
**Location**: `schema.sql:161-176`

```sql
CREATE TABLE error_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time_bucket DATETIME NOT NULL, -- hourly buckets
    component TEXT NOT NULL,
    endpoint TEXT,
    total_errors INTEGER DEFAULT 0,
    critical_errors INTEGER DEFAULT 0,
    high_errors INTEGER DEFAULT 0,
    medium_errors INTEGER DEFAULT 0,
    low_errors INTEGER DEFAULT 0,
    error_rate REAL DEFAULT 0.0,
    affected_users INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(time_bucket, component, endpoint)
);
```

### 6. Billing and Subscription Management

#### Payment History
**Purpose**: Track payment transactions
**Location**: `migrations/002_add_subscription_billing_cycle.sql:39-48`

```sql
CREATE TABLE payment_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    stripe_invoice_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### Monitoring Events
**Purpose**: System operation monitoring
**Location**: `migrations/003_add_monitoring_events.sql:5-16`

```sql
CREATE TABLE monitoring_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL CHECK (event_type IN ('usage_reset', 'subscription_change', 'webhook_received', 'error', 'performance')),
    category TEXT NOT NULL,
    action TEXT NOT NULL,
    label TEXT,
    value REAL,
    user_id INTEGER,
    metadata TEXT, -- JSON string
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Database Migration System

### Migration Files

1. **001_add_user_roles.sql**
   - Adds role-based access control
   - Updates existing users to 'user' role
   - Creates role index

2. **002_add_subscription_billing_cycle.sql**
   - Adds subscription management tables
   - Integrates Stripe payment processing
   - Creates default plan structure
   - Adds billing cycle fields to users

3. **003_add_monitoring_events.sql**
   - Adds comprehensive monitoring system
   - Creates system health metrics
   - Implements automated metric updates

### Migration Commands

```bash
# Initial schema setup
wrangler d1 execute legis-db --file=./schema.sql

# Apply migrations
wrangler d1 execute legis-db --file=./migrations/001_add_user_roles.sql
wrangler d1 execute legis-db --file=./migrations/002_add_subscription_billing_cycle.sql
wrangler d1 execute legis-db --file=./migrations/003_add_monitoring_events.sql
```

## Performance Optimizations

### Database Indexes

**Core Indexes**:
```sql
-- Users table
CREATE INDEX idx_users_auth0_id ON users(auth0_user_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX idx_users_subscription_status ON users(subscription_status);

-- API Usage
CREATE INDEX idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX idx_api_usage_timestamp ON api_usage(timestamp);
CREATE INDEX idx_api_usage_enhanced_user_id ON api_usage_enhanced(user_id);
CREATE INDEX idx_api_usage_enhanced_endpoint ON api_usage_enhanced(endpoint);

-- MCP Logs
CREATE INDEX idx_mcp_logs_user_id ON mcp_logs(user_id);
CREATE INDEX idx_mcp_logs_tool_name ON mcp_logs(tool_name);
CREATE INDEX idx_mcp_logs_timestamp ON mcp_logs(timestamp);
CREATE INDEX idx_mcp_logs_status ON mcp_logs(status);

-- Activity Events
CREATE INDEX idx_user_activity_events_user_id ON user_activity_events(user_id);
CREATE INDEX idx_user_activity_events_session_id ON user_activity_events(session_id);
CREATE INDEX idx_user_activity_events_event_type ON user_activity_events(event_type);
CREATE INDEX idx_user_activity_events_timestamp ON user_activity_events(timestamp);

-- Monitoring
CREATE INDEX idx_system_alerts_created_at ON system_alerts(created_at);
CREATE INDEX idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX idx_error_events_created_at ON error_events(created_at);
CREATE INDEX idx_error_events_component ON error_events(component);
```

### Database Triggers

**Automatic Timestamp Updates**:
```sql
CREATE TRIGGER update_users_updated_at 
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_system_alerts_updated_at 
AFTER UPDATE ON system_alerts
BEGIN
    UPDATE system_alerts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
```

**Automated Metric Updates**:
```sql
CREATE TRIGGER update_system_health_on_monitoring_event
AFTER INSERT ON monitoring_events
BEGIN
    -- Update usage reset metrics
    UPDATE system_health_metrics 
    SET metric_value = (
        SELECT COUNT(*) FROM monitoring_events 
        WHERE event_type = 'usage_reset' 
        AND timestamp >= datetime('now', '-1 day')
    )
    WHERE metric_name = 'usage_resets_today';
END;
```

## Data Flow Between Services

### 1. User Authentication Flow

```
Frontend → Auth0 → JWT Token → LegisMCP Server → LegisAPI → D1 Database
```

1. User authenticates with Auth0
2. Frontend receives JWT token
3. Frontend calls LegisMCP Server with token
4. LegisMCP Server validates token and calls LegisAPI
5. LegisAPI verifies JWT and queries D1 database
6. Response flows back through the chain

### 2. API Usage Tracking

```
MCP Tool Call → LegisMCP Server → LegisAPI → D1 Database (Usage Tables)
```

1. User calls MCP tool through frontend
2. LegisMCP Server processes request
3. LegisMCP Server calls LegisAPI with JWT
4. LegisAPI logs usage to D1 database
5. LegisAPI returns data + usage info
6. Response includes updated usage counts

### 3. Admin Dashboard Data

```
Frontend → LegisAPI → D1 Database → Aggregated Analytics
```

1. Admin accesses dashboard in frontend
2. Frontend calls LegisAPI admin endpoints
3. LegisAPI queries multiple tables for analytics
4. Complex JOIN queries aggregate data
5. Formatted response sent to frontend
6. Dashboard displays real-time metrics

### 4. Billing Cycle Management

```
Stripe Webhook → LegisAPI → D1 Database → Usage Reset
```

1. Stripe sends webhook on subscription events
2. LegisAPI processes webhook
3. Updates subscription status in D1
4. Triggers usage reset if needed
5. Logs monitoring events
6. Updates system health metrics

## Security and Access Control

### Authentication
- **Auth0 Integration**: Primary authentication provider
- **JWT Tokens**: Secure API access between services
- **Scope-based Access**: Different data access levels

### Authorization
- **Role-based Access**: user, admin, super_admin roles
- **Plan-based Limits**: API call limits by subscription plan
- **Endpoint Protection**: Admin-only database operations

### Data Protection
- **No Direct Frontend Access**: Database only accessible via LegisAPI
- **Prepared Statements**: SQL injection prevention
- **Data Validation**: CHECK constraints and triggers
- **Audit Logging**: Comprehensive activity tracking

## Cloudflare Integration

### D1 Database Features
- **Global Edge Distribution**: Low-latency access worldwide
- **Automatic Backups**: Built-in data protection
- **Serverless Architecture**: No infrastructure management
- **Cost Optimization**: Pay-per-use pricing model

### Analytics Engine Integration
```typescript
// LegisAPI analytics integration
if (env.ANALYTICS) {
  env.ANALYTICS.writeDataPoint({
    blobs: [user.plan, method, endpoint],
    doubles: [responseTime, statusCode],
    indexes: [user.auth0_user_id]
  });
}
```

### KV Storage Integration
- **OAuth State**: Temporary authentication state
- **Session Management**: User session data
- **Cache Layer**: API response caching

## Common Database Operations

### User Management
```typescript
// Create user (LegisAPI/src/services/user.ts)
async findOrCreateUser(auth0UserId: string, email: string, name?: string) {
  const existingUser = await this.db
    .prepare('SELECT * FROM users WHERE auth0_user_id = ?')
    .bind(auth0UserId)
    .first<User>();
    
  if (!existingUser) {
    const result = await this.db
      .prepare('INSERT INTO users (auth0_user_id, email, name) VALUES (?, ?, ?)')
      .bind(auth0UserId, email, name || null)
      .run();
  }
}
```

### Usage Tracking
```typescript
// Track API usage (LegisAPI/src/services/user.ts)
async trackApiUsage(userId: number, endpoint: string, method: string, statusCode: number, responseTime: number) {
  await this.db
    .prepare('INSERT INTO api_usage (user_id, endpoint, method, status_code, response_time_ms) VALUES (?, ?, ?, ?, ?)')
    .bind(userId, endpoint, method, statusCode, responseTime)
    .run();
    
  await this.db
    .prepare('UPDATE users SET api_calls_count = api_calls_count + 1 WHERE id = ?')
    .bind(userId)
    .run();
}
```

### Analytics Queries
```typescript
// Get user analytics (LegisAPI/src/routes/admin.ts)
const query = `
  SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.api_calls_count,
    u.api_calls_limit,
    p.name as plan_name,
    COUNT(au.id) as total_api_calls
  FROM users u
  LEFT JOIN plans p ON u.current_plan_id = p.id
  LEFT JOIN api_usage au ON u.id = au.user_id
  WHERE u.role IN ('user', 'admin')
  GROUP BY u.id
  ORDER BY u.created_at DESC
`;
```

## Monitoring and Observability

### System Health Metrics
- **Error Rates**: Track error percentages by component
- **Response Times**: Monitor API performance
- **Usage Patterns**: Analyze user behavior
- **Resource Utilization**: Database and API load

### Alert System
- **Automated Alerts**: Based on predefined thresholds
- **Error Tracking**: Comprehensive error logging
- **Performance Monitoring**: Response time tracking
- **Usage Monitoring**: API call patterns and limits

### Scheduled Operations
```typescript
// Automated usage reset (LegisAPI/src/index.ts)
export async function scheduled(event: ScheduledEvent, env: Env) {
  const billingCycleService = new BillingCycleService(env.DB, env.ANALYTICS);
  const resetCount = await billingCycleService.resetUsageForAllUsers();
  
  // Log monitoring event
  await monitoringService.logEvent({
    event_type: 'usage_reset',
    category: 'billing',
    action: 'automatic',
    value: resetCount
  });
}
```

## Development and Testing

### Local Development
```bash
# Start D1 database locally
wrangler d1 execute legis-db --local --file=./schema.sql

# Run LegisAPI with local database
npm run dev

# Test database queries
wrangler d1 execute legis-db --local --command="SELECT COUNT(*) FROM users"
```

### Database Queries and Debugging
```bash
# Check database structure
wrangler d1 execute legis-db --command="SELECT name FROM sqlite_master WHERE type='table'"

# View user data
wrangler d1 execute legis-db --command="SELECT * FROM users LIMIT 10"

# Check API usage
wrangler d1 execute legis-db --command="SELECT endpoint, COUNT(*) FROM api_usage GROUP BY endpoint"

# Monitor system health
wrangler d1 execute legis-db --command="SELECT * FROM system_health_metrics ORDER BY timestamp DESC LIMIT 10"
```

## Best Practices

### Database Design
- **Normalized Schema**: Proper relationships and constraints
- **Performance Indexing**: Strategic index placement
- **Data Integrity**: Foreign key constraints and triggers
- **Audit Trails**: Comprehensive logging and monitoring

### Security
- **Access Control**: Role-based permissions
- **Data Validation**: Input sanitization and validation
- **Encryption**: Sensitive data protection
- **Audit Logging**: Track all database operations

### Performance
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Use indexes and prepared statements
- **Caching Strategy**: Cache frequently accessed data
- **Monitoring**: Track performance metrics

### Scalability
- **Horizontal Scaling**: Cloudflare's global edge distribution
- **Vertical Scaling**: D1's automatic scaling capabilities
- **Load Balancing**: Distributed across Cloudflare's network
- **Cost Optimization**: Pay-per-use pricing model

## Conclusion

The LegisMCP D1 database serves as the foundation for a comprehensive legislative data platform, providing:

1. **Centralized Data Management**: Single source of truth for all platform data
2. **Scalable Architecture**: Serverless, globally distributed database
3. **Comprehensive Analytics**: Detailed usage tracking and monitoring
4. **Security & Compliance**: Role-based access and audit logging
5. **Performance Optimization**: Strategic indexing and query optimization
6. **Operational Excellence**: Automated monitoring and alerting

The clean separation of concerns between services ensures maintainability, scalability, and security while providing a robust foundation for the platform's continued growth and evolution.