# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 14 application using App Router that provides a SaaS platform for accessing legislative data through the MCP (Model Context Protocol) server. The application integrates Auth0 for authentication and Stripe for subscription management.

## Key Technologies & Versions

- **Next.js**: 14.2.21 (App Router)
- **React**: 18
- **TypeScript**: 5 (non-strict mode)
- **Tailwind CSS**: 3.4.1
- **Auth0**: @auth0/nextjs-auth0 ^3.5.0
- **Stripe**: stripe ^17.6.0
- **Radix UI**: Component library
- **Lucide React**: Icons

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Type checking
npm run type-check
```

## Architecture Overview

### Application Structure
- **App Router**: All pages in `/src/app/` following Next.js 14 conventions
- **API Routes**: Located in `/src/app/api/` handling Auth0 callbacks, Stripe operations, and MCP proxy
- **Component Organization**: 
  - `/src/components/auth/` - Authentication-related components
  - `/src/components/dashboard/` - Dashboard and MCP tools interface
  - `/src/components/layout/` - Layout components (navbar, footer)
  - `/src/components/sections/` - Landing page sections
  - `/src/components/ui/` - Reusable UI components (mostly Radix-based)

### Key Integrations

1. **MCP Server Integration**
   - Proxy configuration in `next.config.js` forwarding `/api/mcp/*` to `http://localhost:3000`
   - Comprehensive MCP client in `/src/lib/mcp-client.ts`
   - Dashboard tools for legislative data queries

2. **Authentication (Auth0)**
   - Configured via `/src/lib/auth0-config.ts`
   - User profile enhancement with subscription data from Stripe
   - Protected routes using Auth0 middleware

3. **Payments (Stripe)**
   - Subscription tiers: Starter ($19), Professional ($49), Enterprise ($99)
   - Checkout flow in `/src/app/api/checkout/route.ts`
   - Webhook handling in `/src/app/api/webhooks/stripe/route.ts`

## Environment Variables

Required variables (see `environment.template`):
- `AUTH0_*` - Authentication configuration
- `STRIPE_*` - Payment processing
- `NEXT_PUBLIC_BASE_URL` - Application URL
- `MCP_SERVER_URL` - Legislative data server URL

## Common Development Tasks

### Adding New MCP Tools
1. Define the tool interface in `/src/components/dashboard/mcp-tools.tsx`
2. Add the tool component to the `toolComponents` map
3. Implement the tool logic using the MCP client from `/src/lib/mcp-client.ts`

### Creating New API Routes
Follow the App Router convention:
```typescript
// src/app/api/[route-name]/route.ts
import { withApiAuthRequired } from '@auth0/nextjs-auth0';

export const GET = withApiAuthRequired(async (req) => {
  // Implementation
});
```

### Adding UI Components
Use the existing UI components from `/src/components/ui/` which are built on Radix UI primitives. Import using the `@/` alias.

## Code Patterns

- **Error Handling**: Use try-catch blocks with meaningful error messages
- **Type Safety**: Define interfaces for all data structures
- **Component Structure**: Functional components with TypeScript
- **Styling**: Tailwind CSS with custom theme extensions
- **State Management**: React hooks and context where needed

## Security Considerations

- API routes are protected with Auth0's `withApiAuthRequired`
- Stripe webhook verification using signing secret
- Environment variables for sensitive configuration
- CORS headers configured for API routes