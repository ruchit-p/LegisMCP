# Production Configuration Reference

## Service URLs

### Frontend
- **Production**: https://legismcp.com (or your custom domain)
- **Development**: http://localhost:3000

### LegisMCP Server (MCP)
- **Production**: https://legis-mcp.ruchit.workers.dev
- **Development**: http://localhost:8788

### LegisAPI
- **Production**: https://api.example.com
- **Worker URL**: https://legis-api.ruchit.workers.dev
- **Development**: http://localhost:8789

## Custom Domain Configuration

### api.example.com → LegisAPI
1. In Cloudflare Dashboard:
   - DNS: CNAME record pointing to `legis-api.ruchit.workers.dev`
   - Workers Routes: Route `api.example.com/*` to worker `legis-api`
   - SSL/TLS: Full (strict) mode

## Environment Variables

### Production Environment Variables

#### LegisMCP Server
```bash
AUTH0_DOMAIN="your-tenant.us.auth0.com"
AUTH0_CLIENT_ID="YOUR_AUTH0_CLIENT_ID"
AUTH0_CLIENT_SECRET="[SECRET]"  # Set via wrangler secret
AUTH0_AUDIENCE="urn:legis-api"
AUTH0_SCOPE="openid email profile offline_access read:bills read:members read:votes read:committees"
API_BASE_URL="https://api.example.com"
```

#### LegisAPI
```bash
AUTH0_DOMAIN="your-tenant.us.auth0.com"  # Set via wrangler secret
AUTH0_AUDIENCE="urn:legis-api"        # Set via wrangler secret
CONGRESS_API_KEY="[SECRET]"            # Set via wrangler secret (optional)
```

## Auth0 Configuration

### Application Settings
- **Domain**: your-tenant.us.auth0.com
- **Client ID**: YOUR_AUTH0_CLIENT_ID
- **Application Type**: Regular Web Application
- **Token Endpoint Authentication Method**: Post

### Callback URLs
```
https://legis-mcp.ruchit.workers.dev/callback
https://legismcp.com/api/auth/callback/auth0
http://localhost:8788/callback
http://localhost:3000/api/auth/callback/auth0
```

### API Settings
- **Identifier**: urn:legis-api
- **Signing Algorithm**: RS256
- **Enable RBAC**: Yes
- **Add Permissions in Access Token**: Yes

### Scopes
- `read:bills`
- `read:members`
- `read:votes`
- `read:committees`

## Database Configuration

### D1 Database
- **Name**: legis-db
- **ID**: 80f8112f-38fb-4220-86e6-17c611504f78
- **Region**: Global (Cloudflare managed)

### KV Namespaces
- **OAuth State Storage**: oauth-state (ID: f71e0ba711544eb3a1e509b580ba70ad)
- **Congress Keys Cache**: congress-keys (ID: 569f409f4e204cc09968956060c2fc24)

### Analytics Engine
- **Dataset**: legis_analytics
- **Binding**: ANALYTICS

## Deployment Commands

### Deploy All Services
```bash
# Deploy LegisAPI
cd LegisAPI
npm run deploy

# Deploy LegisMCP Server
cd ../LegisMCP_Server
npm run deploy

# Deploy Frontend
cd ../LegisMCP_Frontend
npm run cf:deploy
```

### Set Production Secrets
```bash
# LegisAPI
cd LegisAPI
wrangler secret put AUTH0_DOMAIN
wrangler secret put AUTH0_AUDIENCE
wrangler secret put CONGRESS_API_KEY

# LegisMCP Server
cd ../LegisMCP_Server
wrangler secret put AUTH0_CLIENT_SECRET
```

## Monitoring

### Cloudflare Dashboard
- Workers Analytics: Monitor request counts, errors, CPU time
- D1 Analytics: Database queries, performance
- KV Analytics: Cache hit rates

### Logs
```bash
# Tail worker logs
wrangler tail --format pretty

# Filter for errors
wrangler tail --format pretty --status error
```

## Troubleshooting

### Common Issues

1. **Auth0 Token Errors**
   - Verify Auth0 domain and audience match across services
   - Check JWT expiration settings
   - Ensure scopes are properly configured

2. **API Connection Issues**
   - Verify api.example.com DNS is properly configured
   - Check SSL/TLS settings in Cloudflare
   - Ensure Worker routes are configured

3. **Database Issues**
   - Check D1 binding in wrangler.jsonc
   - Verify migrations have been applied
   - Monitor D1 analytics for errors

### Health Check Endpoints
- LegisAPI: `GET https://api.example.com/health`
- MCP Server: `GET https://legis-mcp.ruchit.workers.dev/health`

## Security Checklist

- [ ] All secrets set via `wrangler secret put` (never in code)
- [ ] Auth0 production keys configured
- [ ] CORS settings restrictive to allowed origins
- [ ] Rate limiting configured
- [ ] SSL/TLS Full (strict) mode enabled
- [ ] Database access restricted to LegisAPI only
- [ ] Monitoring alerts configured