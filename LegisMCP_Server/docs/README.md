# LegisMCP Server Documentation

## Overview

LegisMCP Server is a Model Context Protocol (MCP) server that provides AI agents with authenticated access to real-time U.S. legislative data. It acts as a secure bridge between AI systems and the LegisAPI, handling OAuth2 authentication through Auth0.

**Production URL**: `https://mcp.example.com`

## Table of Contents

1. [Configuration](./configuration.md) - Auth0 and environment setup
2. [MCP Tools Reference](./mcp-tools.md) - Available tools and usage
3. [OAuth Flow](./oauth-flow.md) - Authentication process
4. [Development Guide](./development.md) - Local development setup
5. [Deployment Guide](./deployment.md) - Production deployment
6. [Integration Guide](./integration.md) - Connecting AI agents

## Key Features

- **OAuth2 Authentication**: Secure user authentication via Auth0
- **MCP Protocol**: Standard protocol for AI agent integration
- **Session Management**: Durable Objects for persistent sessions
- **Tool Registry**: Comprehensive legislative research tools
- **Rate Limiting**: User-based rate limits via LegisAPI
- **Error Handling**: Graceful error responses for AI agents

## Architecture

```
AI Agent → MCP Client → LegisMCP Server → OAuth2 Flow → LegisAPI
                              ↓
                        Durable Objects
                        (Session State)
```

## Quick Start

1. Clone and install:
```bash
cd LegisMCP_Server
npm install
```

2. Configure `.dev.vars`:
```env
AUTH0_DOMAIN=yourdomain.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_AUDIENCE=urn:legis-api
AUTH0_SCOPE=openid email profile offline_access read:bills read:members read:votes read:committees
NODE_ENV=development
API_BASE_URL=http://localhost:8789
```

3. Set up KV namespace:
```bash
wrangler kv:namespace create "OAUTH_KV"
# Update wrangler.jsonc with the namespace ID
```

4. Start server:
```bash
npm run dev  # Runs on port 8788
```

## Testing with MCP Inspector

1. Install [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
2. Connect using:
   - Transport: HTTP
   - URL: `http://localhost:8788/mcp`
3. Complete OAuth flow when prompted
4. Test available tools

## Available Tools

| Tool | Description | Required Scope |
|------|-------------|----------------|
| `whoami` | Get authenticated user info | None |
| `analyze-bill` | Comprehensive bill analysis | `read:bills` |
| `list-recent-bills` | Get recent legislation | `read:bills` |
| `get-bill` | Get specific bill details | `read:bills` |
| `trending-bills` | Trending legislation analysis | `read:bills` |
| `congress-query` | Natural language queries | Multiple |
| `member-details` | Get member information | `read:members` |
| `member-search` | Search members | `read:members` |
| `universal-search` | Cross-collection search | Multiple |
| `subresource` | Access bill subresources | `read:bills` |
| `get-usage-stats` | API usage statistics | None |

## Security

- OAuth2 with PKCE for secure authentication
- JWT tokens for API access
- Scope-based permission model
- CSRF protection
- Secure session storage in KV

For detailed information, see the individual documentation pages.