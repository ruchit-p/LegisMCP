# LegisAPI Documentation

## Overview

LegisAPI is a protected REST API service that interfaces with congress.gov to provide legislative data access. It serves as the backbone for the LegisMCP platform, handling authentication, rate limiting, usage tracking, and data retrieval.

**Production URL**: `https://api.example.com`

## Table of Contents

1. [Configuration](./configuration.md) - Environment setup and Auth0 configuration
2. [API Endpoints](./api-endpoints.md) - Complete API reference
3. [Database Schema](./database-schema.md) - D1 database structure
4. [Congress API Integration](./congress-api-docs.md) - Congress.gov API details
5. [Cron Jobs](./cron.md) - Scheduled tasks and maintenance
6. [Development Guide](./development.md) - Local development setup
7. [Deployment Guide](./deployment.md) - Production deployment

## Key Features

- **JWT Authentication**: Auth0 integration with scope-based access control
- **Rate Limiting**: Per-user API call limits based on subscription tier
- **Usage Tracking**: Comprehensive analytics with D1 database
- **Caching**: KV-based caching for congress.gov responses
- **Error Handling**: Structured error responses with proper HTTP codes
- **CORS Support**: Configurable cross-origin resource sharing

## Architecture

```
Client Request → JWT Verification → Rate Limit Check → Congress.gov API → Cache → Response
                      ↓                    ↓
                  Auth0 JWKS          D1 Database
                                   (Usage Tracking)
```

## Quick Start

1. Clone the repository and install dependencies:
```bash
cd LegisAPI
npm install
```

2. Create `.dev.vars` file:
```env
AUTH0_DOMAIN=yourtenant.us.auth0.com
AUTH0_AUDIENCE=urn:legis-api
CONGRESS_API_KEY=your-optional-key
```

3. Set up the database:
```bash
wrangler d1 create legis-db
wrangler d1 execute legis-db --file=./schema.sql

# Run migrations
for file in ./migrations/*.sql; do
  wrangler d1 execute legis-db --file="$file"
done
```

4. Start development server:
```bash
npm run dev  # Runs on port 8789
```

## Testing

Get a test token from Auth0 dashboard (APIs → Your API → Test tab):

```bash
# Health check (no auth required)
curl http://localhost:8789/api/health

# User profile (requires JWT)
curl http://localhost:8789/api/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search bills (requires read:bills scope)
curl "http://localhost:8789/api/bills?q=healthcare" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Security

- All endpoints except `/api/health` require JWT authentication
- Scopes are enforced per endpoint (read:bills, read:members, etc.)
- User tracking with subscription-based rate limits
- CSRF protection via Auth0 token validation

For detailed information, see the individual documentation pages.