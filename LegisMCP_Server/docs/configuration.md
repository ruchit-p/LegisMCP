# LegisMCP Server Configuration Guide

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `AUTH0_DOMAIN` | Your Auth0 tenant domain | `dev-xyz123.us.auth0.com` |
| `AUTH0_CLIENT_ID` | Auth0 application client ID | `AbCdEf123...` |
| `AUTH0_CLIENT_SECRET` | Auth0 application client secret | `XyZ789...` |
| `AUTH0_AUDIENCE` | API identifier from LegisAPI | `urn:legis-api` |
| `AUTH0_SCOPE` | OAuth scopes to request | See below |
| `API_BASE_URL` | LegisAPI endpoint | `https://api.example.com` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `SESSION_TIMEOUT` | Session duration in seconds | `3600` |
| `LOG_LEVEL` | Logging verbosity | `info` |

### OAuth Scopes

The `AUTH0_SCOPE` should include:

```
openid email profile offline_access read:bills read:members read:votes read:committees
```

- `openid email profile` - User identity
- `offline_access` - Refresh tokens
- `read:*` - API access scopes

## Auth0 Setup

### 1. Create Application

1. In Auth0 Dashboard, go to Applications
2. Click "Create Application"
3. Choose:
   - **Name**: LegisMCP Server
   - **Type**: Regular Web Application
4. Click "Create"

### 2. Configure Application

#### Settings Tab

- **Domain**: Note your Auth0 domain
- **Client ID**: Copy this value
- **Client Secret**: Copy this value (keep secure!)

#### Application URIs

**Allowed Callback URLs**:
```
http://localhost:8788/callback
https://mcp.example.com/callback
https://your-worker.workers.dev/callback
```

**Allowed Logout URLs**:
```
http://localhost:8788
https://mcp.example.com
https://your-worker.workers.dev
```

**Allowed Web Origins**:
```
http://localhost:8788
https://mcp.example.com
```

#### Advanced Settings

- **Grant Types**: Enable "Authorization Code" and "Refresh Token"
- **Refresh Token Rotation**: Enable
- **Refresh Token Expiration**: Absolute lifetime

### 3. API Authorization

1. Go to APIs in Auth0 Dashboard
2. Find your LegisAPI (created during LegisAPI setup)
3. Go to "Machine to Machine Applications"
4. Authorize your MCP Server application
5. Select all required scopes

## Cloudflare Configuration

### KV Namespace Setup

```bash
# Create KV namespace for OAuth state
wrangler kv:namespace create "OAUTH_KV"

# Output example:
# ✓ Created namespace with ID: abcd1234...
```

Update `wrangler.jsonc`:

```json
{
  "kv_namespaces": [
    {
      "binding": "OAUTH_KV",
      "id": "your-kv-namespace-id"
    }
  ]
}
```

### Durable Objects Setup

```json
{
  "durable_objects": {
    "bindings": [
      {
        "name": "AUTHENTICATED_MCP",
        "class_name": "AuthenticatedMCP"
      }
    ]
  }
}
```

### Compatibility Settings

```json
{
  "compatibility_date": "2024-12-02",
  "compatibility_flags": ["nodejs_compat"]
}
```

## Local Development

### 1. Create `.dev.vars`

```env
# Auth0 Configuration
AUTH0_DOMAIN=dev-xyz123.us.auth0.com
AUTH0_CLIENT_ID=your-dev-client-id
AUTH0_CLIENT_SECRET=your-dev-client-secret
AUTH0_AUDIENCE=urn:legis-api
AUTH0_SCOPE=openid email profile offline_access read:bills read:members read:votes read:committees

# Development Settings
NODE_ENV=development
API_BASE_URL=http://localhost:8789

# Optional
LOG_LEVEL=debug
SESSION_TIMEOUT=7200
```

### 2. Start Services

```bash
# Terminal 1: Start LegisAPI
cd ../LegisAPI && npm run dev

# Terminal 2: Start MCP Server
cd ../LegisMCP_Server && npm run dev
```

### 3. Test Connection

```bash
# Health check
curl http://localhost:8788/health

# MCP endpoint (will redirect to Auth0)
curl http://localhost:8788/mcp
```

## Production Configuration

### Set Secrets

```bash
# Set all required secrets
wrangler secret put AUTH0_DOMAIN
wrangler secret put AUTH0_CLIENT_ID
wrangler secret put AUTH0_CLIENT_SECRET
wrangler secret put AUTH0_AUDIENCE
wrangler secret put AUTH0_SCOPE
wrangler secret put API_BASE_URL
```

### Domain Configuration

For custom domain (e.g., `mcp.example.com`):

1. Add to Cloudflare DNS:
   ```
   Type: CNAME
   Name: mcp
   Content: legis-mcp.workers.dev
   Proxy: Yes
   ```

2. Configure in Workers:
   - Go to Workers & Pages
   - Select your worker
   - Settings → Domains & Routes
   - Add custom domain

### CORS Configuration

Update allowed origins for production:

```typescript
const allowedOrigins = [
  'https://playground.ai.cloudflare.com',
  'https://claude.ai',
  'https://your-app.com'
];
```

## Security Best Practices

### 1. Secret Management

- Never commit secrets to version control
- Use `wrangler secret` for production
- Rotate secrets regularly
- Use different secrets for dev/prod

### 2. Callback URL Security

- Only add exact URLs needed
- Remove unused callback URLs
- Use HTTPS in production
- Validate redirect URIs

### 3. Token Security

- Store tokens in KV with expiration
- Implement token refresh logic
- Clear tokens on logout
- Use secure session cookies

## Troubleshooting

### Common Issues

1. **"Invalid callback URL" error**
   - Check Auth0 application settings
   - Ensure URL matches exactly
   - Include protocol and port

2. **"KV namespace not found"**
   - Run `wrangler kv:namespace list`
   - Update namespace ID in wrangler.jsonc
   - Ensure binding name matches

3. **"Unauthorized" from LegisAPI**
   - Verify AUTH0_AUDIENCE matches
   - Check token has required scopes
   - Ensure API_BASE_URL is correct

4. **Session persistence issues**
   - Check Durable Objects configuration
   - Verify KV namespace is bound
   - Check session timeout settings

### Debug Mode

Enable detailed logging:

```typescript
if (env.LOG_LEVEL === 'debug') {
  console.log('OAuth State:', state);
  console.log('Token Response:', tokenResponse);
  console.log('User Claims:', claims);
}
```

### Testing Auth Flow

1. Use browser developer tools
2. Check Network tab for redirects
3. Verify cookies are set
4. Check KV for stored state

## Performance Optimization

### 1. Token Caching

```typescript
// Cache tokens in KV with TTL
await env.OAUTH_KV.put(
  `token:${userId}`,
  JSON.stringify(tokens),
  { expirationTtl: 3600 }
);
```

### 2. Connection Pooling

Reuse HTTP clients:

```typescript
const client = new HttpClient({
  baseURL: env.API_BASE_URL,
  timeout: 30000
});
```

### 3. Optimize Durable Objects

- Minimize storage operations
- Batch updates when possible
- Use transactional storage API

## Monitoring

### Metrics to Track

- OAuth success/failure rates
- Session duration
- API call latency
- Token refresh frequency
- Error rates by type

### Alerting

Set up alerts for:

- Authentication failures > 5%
- API errors > 1%
- Session creation failures
- Token refresh failures
- KV operation errors

## Production Configuration

### Service URLs

- **Production**: https://mcp.example.com (or https://legis-mcp.ruchit.workers.dev)
- **Development**: http://localhost:8788

### Production Environment Variables

```bash
AUTH0_DOMAIN="your-tenant.us.auth0.com"
AUTH0_CLIENT_ID="YOUR_AUTH0_CLIENT_ID"
AUTH0_CLIENT_SECRET="[SECRET]"  # Set via wrangler secret
AUTH0_AUDIENCE="urn:legis-api"
AUTH0_SCOPE="openid email profile offline_access read:bills read:members read:votes read:committees"
API_BASE_URL="https://api.example.com"
```

### Auth0 Application Settings

- **Domain**: your-tenant.us.auth0.com
- **Client ID**: YOUR_AUTH0_CLIENT_ID
- **Application Type**: Regular Web Application
- **Grant Types**: Authorization Code, Refresh Token
- **Allowed Callback URLs**: 
  - http://localhost:3000/callback (development)
  - Dynamic based on MCP client

### Production Deployment Commands

```bash
# Deploy to production
wrangler deploy

# Set production secret
wrangler secret put AUTH0_CLIENT_SECRET

# Verify deployment
curl https://mcp.example.com/health
```

### MCP Client Configuration

When connecting MCP clients to production:

```json
{
  "transport": "http",
  "url": "https://mcp.example.com/mcp"
}
```