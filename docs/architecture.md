# LegisMCP Architecture Documentation

## System Overview

LegisMCP is a comprehensive legislative data platform built on modern cloud architecture, providing real-time access to U.S. congressional data through multiple interfaces.

```mermaid
graph TB
    subgraph "Client Layer"
        UI[Next.js Frontend<br/>legismcp.com]
        MCP[MCP Clients<br/>AI Agents]
    end
    
    subgraph "Edge Layer"
        CF[Cloudflare Edge Network]
    end
    
    subgraph "Application Layer"
        MCPSRV[LegisMCP Server<br/>MCP Protocol Handler]
        API[LegisAPI<br/>REST API Gateway]
    end
    
    subgraph "Data Layer"
        D1[(D1 Database<br/>User & Analytics)]
        KV[(KV Storage<br/>Cache & Sessions)]
        DO[Durable Objects<br/>Session State]
    end
    
    subgraph "External Services"
        AUTH[Auth0<br/>Identity Provider]
        STRIPE[Stripe<br/>Payments]
        CONGRESS[Congress.gov<br/>Data Source]
    end
    
    UI --> CF
    MCP --> CF
    CF --> MCPSRV
    CF --> API
    MCPSRV --> API
    API --> D1
    API --> KV
    MCPSRV --> DO
    MCPSRV --> KV
    UI --> AUTH
    MCPSRV --> AUTH
    UI --> STRIPE
    API --> CONGRESS
```

## Component Architecture

### 1. Frontend (Next.js 14)

**Technology Stack:**
- Framework: Next.js 14 with App Router
- Authentication: Auth.js (NextAuth) with Auth0
- Payments: Stripe Checkout & Customer Portal
- UI: Radix UI + Tailwind CSS
- Deployment: Vercel

**Key Features:**
- Server-side rendering for SEO
- JWT-based session management
- Real-time subscription status
- Progressive web app capabilities

### 2. LegisMCP Server (MCP Protocol)

**Technology Stack:**
- Runtime: Cloudflare Workers
- Protocol: Model Context Protocol (MCP)
- State: Durable Objects
- Cache: Workers KV
- Auth: OAuth2 with PKCE

**Architecture Diagram:**
```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant Server as MCP Server
    participant DO as Durable Object
    participant Auth as Auth0
    participant API as LegisAPI
    
    Client->>Server: Connect (HTTP SSE)
    Server->>Auth: OAuth Flow
    Auth-->>Client: Redirect to Auth0
    Client->>Auth: Authenticate
    Auth-->>Server: Auth Code
    Server->>Auth: Exchange for Token
    Server->>DO: Create Session
    DO-->>Server: Session ID
    Server-->>Client: Connected
    
    Client->>Server: Tool Request
    Server->>DO: Validate Session
    DO-->>Server: Session Valid
    Server->>API: API Call (JWT)
    API-->>Server: Data
    Server-->>Client: Tool Response
```

### 3. LegisAPI (REST Gateway)

**Technology Stack:**
- Runtime: Cloudflare Workers
- Framework: Hono.js
- Database: Cloudflare D1
- Cache: Workers KV
- Analytics: Cloudflare Analytics Engine

**API Flow:**
```mermaid
graph LR
    subgraph "Request Flow"
        REQ[Incoming Request] --> MW1[CORS Middleware]
        MW1 --> MW2[JWT Validation]
        MW2 --> MW3[Scope Check]
        MW3 --> MW4[Rate Limiting]
        MW4 --> ROUTE[Route Handler]
    end
    
    subgraph "Data Flow"
        ROUTE --> CACHE{Cache Hit?}
        CACHE -->|Yes| RESP[Response]
        CACHE -->|No| CONGRESS[Congress.gov API]
        CONGRESS --> TRANSFORM[Transform Data]
        TRANSFORM --> CACHE2[Update Cache]
        CACHE2 --> RESP
    end
    
    subgraph "Analytics"
        ROUTE --> LOG[Log Usage]
        LOG --> D1[D1 Database]
        LOG --> AE[Analytics Engine]
    end
```

## Data Architecture

### Database Schema (D1)

```mermaid
erDiagram
    USERS ||--o{ API_USAGE : has
    USERS ||--o{ MCP_LOGS : generates
    USERS ||--o{ PAYMENT_HISTORY : makes
    USERS ||--|| USER_SETTINGS : has
    PLANS ||--o{ USERS : subscribes
    
    USERS {
        int id PK
        string auth0_user_id UK
        string email
        string role
        int current_plan_id FK
        int api_calls_count
        int api_calls_limit
        string stripe_customer_id
        datetime billing_cycle_start
        datetime billing_cycle_end
    }
    
    PLANS {
        int id PK
        string name
        decimal price_monthly
        decimal price_yearly
        int api_calls_limit
        int mcp_calls_limit
    }
    
    API_USAGE {
        int id PK
        int user_id FK
        string endpoint
        string method
        int status_code
        int response_time_ms
        datetime created_at
    }
```

### Caching Strategy

```mermaid
graph TD
    subgraph "Cache Layers"
        L1[Browser Cache<br/>Static Assets]
        L2[CDN Cache<br/>Cloudflare Edge]
        L3[KV Cache<br/>API Responses]
        L4[In-Memory<br/>Worker Cache]
    end
    
    subgraph "Cache Keys"
        K1[bills:search:query:limit]
        K2[bill:congress:type:number]
        K3[member:bioguideId]
        K4[committee:code]
    end
    
    subgraph "TTL Strategy"
        T1[Static: 1 year]
        T2[API: 5 minutes]
        T3[Search: 1 minute]
        T4[User: 30 seconds]
    end
```

## Security Architecture

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Auth0
    participant API
    participant DB
    
    User->>Frontend: Login Request
    Frontend->>Auth0: Redirect to Universal Login
    Auth0->>User: Login Form
    User->>Auth0: Credentials
    Auth0->>Auth0: Validate
    Auth0->>Frontend: Auth Code + State
    Frontend->>Auth0: Exchange Code for Tokens
    Auth0->>Frontend: ID Token + Access Token
    Frontend->>API: API Request + Access Token
    API->>Auth0: Validate Token (JWKS)
    Auth0->>API: Token Valid
    API->>DB: Get User Data
    DB->>API: User Info
    API->>Frontend: API Response
```

### Security Layers

1. **Network Security**
   - Cloudflare DDoS Protection
   - Rate Limiting per IP/User
   - CORS Policy Enforcement
   - TLS 1.3 Encryption

2. **Application Security**
   - JWT Token Validation
   - Scope-based Authorization
   - CSRF Protection
   - Input Sanitization

3. **Data Security**
   - Encrypted at Rest (D1)
   - Encrypted in Transit (TLS)
   - PII Isolation
   - Audit Logging

## Deployment Architecture

### Infrastructure as Code

```yaml
# Cloudflare Resources
Resources:
  Workers:
    - name: legis-api
      routes:
        - pattern: api.example.com/*
      bindings:
        - D1: legis-db
        - KV: CONGRESS_KEYS
        - AE: legis_analytics
    
    - name: legis-mcp
      routes:
        - pattern: mcp.example.com/*
      bindings:
        - DO: AuthenticatedMCP
        - KV: OAUTH_KV
        - AI: @cf/meta/llama-3.1-8b-instruct
  
  Databases:
    - name: legis-db
      migrations:
        - 001_initial_schema.sql
        - 002_add_user_roles.sql
        - 003_add_billing_cycle.sql
        - 004_add_monitoring.sql
```

### CI/CD Pipeline

```mermaid
graph LR
    subgraph "Development"
        DEV[Local Dev] --> TEST[Run Tests]
        TEST --> BUILD[Build]
    end
    
    subgraph "Staging"
        BUILD --> PREVIEW[Preview Deploy]
        PREVIEW --> E2E[E2E Tests]
    end
    
    subgraph "Production"
        E2E --> PROD[Production Deploy]
        PROD --> MONITOR[Monitoring]
    end
    
    subgraph "Rollback"
        MONITOR -->|Issues| ROLLBACK[Instant Rollback]
        ROLLBACK --> PREV[Previous Version]
    end
```

## Scalability & Performance

### Auto-Scaling Architecture

```mermaid
graph TD
    subgraph "Load Distribution"
        LB[Cloudflare Load Balancer]
        LB --> R1[Region 1]
        LB --> R2[Region 2]
        LB --> R3[Region 3]
    end
    
    subgraph "Worker Scaling"
        R1 --> W1[Worker Instances<br/>Auto-scale 0-1000]
        R2 --> W2[Worker Instances<br/>Auto-scale 0-1000]
        R3 --> W3[Worker Instances<br/>Auto-scale 0-1000]
    end
    
    subgraph "Resource Limits"
        CPU[CPU: 10-50ms]
        MEM[Memory: 128MB]
        REQ[Requests: 100k/day free]
    end
```

### Performance Optimizations

1. **Edge Computing**
   - 200+ global edge locations
   - <50ms response times globally
   - Automatic geo-routing

2. **Caching Strategy**
   - Multi-layer caching
   - Intelligent cache invalidation
   - Predictive prefetching

3. **Database Optimization**
   - Read replicas for queries
   - Connection pooling
   - Query optimization

## Monitoring & Observability

### Metrics Dashboard

```mermaid
graph TD
    subgraph "Business Metrics"
        B1[Active Users]
        B2[API Calls/Day]
        B3[Revenue/Month]
        B4[Churn Rate]
    end
    
    subgraph "Technical Metrics"
        T1[Response Time]
        T2[Error Rate]
        T3[Cache Hit Rate]
        T4[Worker CPU Time]
    end
    
    subgraph "Alerts"
        A1[Error Rate > 1%]
        A2[Response Time > 500ms]
        A3[Payment Failures]
        A4[Auth Failures > 5%]
    end
```

### Logging Architecture

- **Application Logs**: Cloudflare Logpush
- **Error Tracking**: Sentry Integration
- **Analytics**: Cloudflare Analytics Engine
- **Custom Metrics**: Prometheus Format

## Disaster Recovery

### Backup Strategy

1. **Database Backups**
   - Automated daily backups
   - Point-in-time recovery
   - Cross-region replication

2. **Code Backups**
   - Git version control
   - Automated deployments
   - Instant rollback capability

3. **Configuration Backups**
   - Environment variables in vault
   - Infrastructure as code
   - Documented runbooks

### Recovery Procedures

```mermaid
graph TD
    INCIDENT[Incident Detected] --> ASSESS{Assess Impact}
    ASSESS -->|Critical| FAILOVER[Activate Failover]
    ASSESS -->|Minor| FIX[Apply Fix]
    FAILOVER --> NOTIFY[Notify Users]
    FAILOVER --> RESTORE[Restore Service]
    FIX --> MONITOR[Monitor Fix]
    RESTORE --> VALIDATE[Validate Recovery]
    VALIDATE --> POSTMORTEM[Post-Mortem]
```

## Future Architecture

### Planned Enhancements

1. **GraphQL Gateway**
   - Unified data layer
   - Real-time subscriptions
   - Better mobile performance

2. **Event-Driven Architecture**
   - Webhook system
   - Real-time notifications
   - Event sourcing

3. **AI Integration**
   - Natural language queries
   - Predictive analytics
   - Automated insights

4. **Multi-Region Active-Active**
   - Global data replication
   - Regional failover
   - Improved latency

## Architecture Decision Records (ADRs)

### ADR-001: Cloudflare Workers for Backend

**Status**: Accepted  
**Context**: Need serverless, globally distributed backend  
**Decision**: Use Cloudflare Workers instead of traditional servers  
**Consequences**: 
- ✅ Global edge deployment
- ✅ Automatic scaling
- ✅ Cost-effective
- ❌ 128MB memory limit
- ❌ 10ms CPU limit

### ADR-002: MCP Protocol for AI Agents

**Status**: Accepted  
**Context**: Need standardized protocol for AI agent integration  
**Decision**: Implement Model Context Protocol (MCP)  
**Consequences**:
- ✅ Standard protocol
- ✅ Tool-based interface
- ✅ Secure authentication
- ❌ Limited client support
- ❌ Additional complexity

### ADR-003: D1 for User Database

**Status**: Accepted  
**Context**: Need SQL database integrated with Workers  
**Decision**: Use Cloudflare D1 instead of external database  
**Consequences**:
- ✅ No additional latency
- ✅ Automatic replication
- ✅ Cost included
- ❌ SQLite limitations
- ❌ Beta service

## Conclusion

The LegisMCP architecture is designed for:
- **Scalability**: Handle millions of requests
- **Performance**: Sub-100ms global response times
- **Security**: Multi-layer security approach
- **Reliability**: 99.9% uptime SLA
- **Maintainability**: Clear separation of concerns
- **Cost-Effectiveness**: Pay-per-use pricing model

This architecture provides a solid foundation for growth while maintaining flexibility for future enhancements.