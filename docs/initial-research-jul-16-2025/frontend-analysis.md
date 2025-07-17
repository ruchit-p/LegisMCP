# LegisMCP Frontend Analysis

## Overview
LegisMCP Frontend is a Next.js 14 application using App Router, providing a SaaS platform for accessing legislative data through the MCP server. It integrates Auth0 for authentication and Stripe for subscription management.

## Architecture

### Core Technologies
- **Next.js 14**: App Router pattern
- **React 18**: UI framework
- **TypeScript**: Type safety (non-strict mode)
- **Tailwind CSS**: Styling
- **Radix UI**: Component primitives
- **Auth0**: Authentication
- **Stripe**: Payment processing

### Key Components

#### Authentication (Auth0)
- **Configuration**: `src/lib/auth0.ts`
- **API Routes**: `src/app/api/auth/[...auth0]/route.ts`
- **Middleware**: `middleware.ts` - Protects authenticated routes
- **Session Management**: Server-side with Auth0 SDK

#### Payment Integration (Stripe)
- **Configuration**: `src/lib/stripe-config.ts`
- **Subscription Plans**:
  - Free: $0 (100 MCP calls one-time)
  - Developer: $9.99/mo or $99.99/yr (1,000 calls/mo)
  - Professional: $29.99/mo or $299.99/yr (10,000 calls/mo)
  - Enterprise: Custom pricing (unlimited)
- **Webhook Handler**: `src/app/api/webhooks/stripe/route.ts`
- **Checkout Flow**: `src/app/api/checkout/route.ts`

#### MCP Client Integration
- **Client Library**: `src/lib/mcp-client.ts`
  - EventSource/SSE for real-time communication
  - Session management with MCP Server
  - Tool invocation and result handling
  - Usage tracking and logging
- **Usage Logger**: `src/lib/mcp-usage-logger.ts`
- **Dashboard Tools**: `src/components/dashboard/mcp-tools.tsx`

## Data Flow

### Authentication Flow
1. User logs in via Auth0
2. Session cookie set by Next.js
3. Middleware protects routes
4. User profile enhanced with subscription data

### Payment Flow
1. User selects plan → Stripe checkout
2. Stripe webhook → Update user subscription
3. Frontend reads subscription from user profile
4. MCP access based on subscription tier

### MCP Connection Flow
1. Frontend creates MCP client with API key
2. Client connects to MCP Server via SSE
3. MCP Server authenticates with Auth0
4. Tools invoked through JSON-RPC protocol
5. Results displayed in dashboard

## API Routes Structure

### Public Routes
- `/api/auth/*` - Auth0 callbacks
- `/api/webhooks/stripe` - Stripe webhooks

### Protected Routes
- `/api/checkout` - Create Stripe checkout session
- `/api/billing/portal` - Access Stripe customer portal
- `/api/mcp/usage` - MCP usage statistics
- `/api/user/*` - User management endpoints

## Environment Configuration

### Required Variables
- **Auth0**:
  - `AUTH0_SECRET`: Session encryption
  - `AUTH0_BASE_URL`: Application URL
  - `AUTH0_ISSUER_BASE_URL`: Auth0 domain
  - `AUTH0_CLIENT_ID/SECRET`: Auth0 app credentials

- **Stripe**:
  - `STRIPE_SECRET_KEY`: Server-side API key
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Client-side key
  - `STRIPE_WEBHOOK_SECRET`: Webhook verification
  - `STRIPE_[PLAN]_[BILLING]_PRICE_ID`: Price IDs for each plan

- **MCP**:
  - `NEXT_PUBLIC_MCP_SERVER_URL`: MCP Server endpoint

## Dashboard Features

### Main Dashboard (`/dashboard`)
- **Overview Tab**: Subscription status, usage metrics
- **API Keys Tab**: Manage API keys for MCP access
- **Usage Tab**: Detailed usage analytics
- **Billing Tab**: Subscription management

### MCP Explorer (`/dashboard/mcp`)
- Connection testing
- Tool exploration
- Interactive tool execution
- Response visualization

## Security Implementation

1. **Authentication**:
   - Server-side session management
   - Middleware route protection
   - Secure httpOnly cookies

2. **API Security**:
   - Auth0 `withApiAuthRequired` wrapper
   - CORS headers configured
   - API key validation for MCP

3. **Payment Security**:
   - Stripe webhook signature verification
   - Server-side checkout session creation
   - No client-side price manipulation

## Potential Issues Found

1. **Configuration Error**:
   - `next.config.js` rewrites `/api/mcp/*` to port 8789 (LegisAPI)
   - Should be port 8788 (MCP Server)
   - This would cause MCP connections to fail

2. **Type Safety**:
   - TypeScript in non-strict mode
   - Some `any` types in MCP client
   - Missing type definitions for some API responses

3. **Error Handling**:
   - Limited error feedback in UI
   - MCP connection errors not clearly communicated
   - Missing retry logic for failed API calls

4. **Session Management**:
   - No visible session refresh mechanism
   - Unclear how Auth0 token expiry is handled
   - MCP session lifecycle not documented

5. **Usage Tracking**:
   - Usage logger implementation exists but integration unclear
   - No visible rate limiting in frontend
   - Usage reset mechanism not implemented

6. **Environment Variables**:
   - Many required variables
   - No validation on startup
   - Missing development defaults