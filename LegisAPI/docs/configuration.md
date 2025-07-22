# LegisAPI Configuration Guide

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `AUTH0_DOMAIN` | Your Auth0 tenant domain | `yourtenant.us.auth0.com` |
| `AUTH0_AUDIENCE` | API identifier in Auth0 | `urn:legis-api` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CONGRESS_API_KEY` | Congress.gov API key for higher rate limits | None |
| `NODE_ENV` | Environment mode | `development` |

## Auth0 Setup

### 1. Create API in Auth0 Dashboard

1. Navigate to APIs section in Auth0 dashboard
2. Click "Create API"
3. Set the following:
   - **Name**: LegisAPI
   - **Identifier**: `urn:legis-api` (this becomes AUTH0_AUDIENCE)
   - **Signing Algorithm**: RS256

### 2. Enable Offline Access

1. In your API settings, go to the "Settings" tab
2. Scroll to "Allow Offline Access"
3. Toggle it ON
4. Save changes

This enables refresh tokens for long-lived sessions.

### 3. Configure Permissions (Scopes)

Add the following permissions in the "Permissions" tab:

- `read:bills` - Access bill information
- `read:members` - Access member information
- `read:votes` - Access voting records
- `read:committees` - Access committee data
- `read:admin` - Admin access (optional)

### 4. Machine-to-Machine Application

For testing and admin access:

1. Go to Applications → Create Application
2. Choose "Machine to Machine"
3. Authorize it for your API
4. Grant necessary scopes

## Cloudflare Configuration

### Bindings Required

```toml
# wrangler.jsonc
{
  "name": "legis-api",
  "compatibility_date": "2024-12-02",
  "compatibility_flags": ["nodejs_compat"],
  
  "d1_databases": [
    {
      "binding": "LEGIS_DB",
      "database_name": "legis-db",
      "database_id": "your-database-id"
    }
  ],
  
  "kv_namespaces": [
    {
      "binding": "API_CACHE",
      "id": "your-kv-namespace-id"
    }
  ],
  
  "analytics_engine_datasets": [
    {
      "binding": "USAGE_ANALYTICS"
    }
  ]
}
```

### Secret Management

```bash
# Set production secrets
wrangler secret put AUTH0_DOMAIN
wrangler secret put AUTH0_AUDIENCE
wrangler secret put CONGRESS_API_KEY
```

## Local Development

### 1. Create `.dev.vars` file:

```env
AUTH0_DOMAIN=dev-xyz123.us.auth0.com
AUTH0_AUDIENCE=urn:legis-api
CONGRESS_API_KEY=optional-key-for-higher-limits
```

### 2. Local Database Setup:

```bash
# Create local D1 database
wrangler d1 create legis-db --local

# Apply schema
wrangler d1 execute legis-db --local --file=./schema.sql

# Apply migrations
for file in ./migrations/*.sql; do
  wrangler d1 execute legis-db --local --file="$file"
done
```

### 3. Start Development Server:

```bash
npm run dev  # Starts on port 8789
```

## Production Configuration

### Domain Setup

1. Configure custom domain in Cloudflare:
   - Add route: `api.example.com/*`
   - Point to your worker

2. Update CORS settings in code if needed

### Monitoring

1. Enable Cloudflare Analytics
2. Set up error alerts
3. Configure usage dashboards

### Security Checklist

- [ ] Auth0 domain is correct
- [ ] API audience matches Auth0 configuration
- [ ] All secrets are set via wrangler
- [ ] Database has proper indexes
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Error logging is configured

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check JWT token expiration
   - Verify Auth0 domain and audience
   - Ensure scopes are granted

2. **Database Connection Failed**
   - Verify D1 database ID in wrangler.jsonc
   - Check if migrations were applied
   - Ensure database binding name matches

3. **Congress API Rate Limits**
   - Add CONGRESS_API_KEY for higher limits
   - Check cache configuration
   - Monitor usage patterns

## Production Configuration

### Service URLs

- **Production API**: https://api.example.com
- **Worker URL**: https://legis-api.ruchit.workers.dev
- **Development**: http://localhost:8789

### Custom Domain Configuration

#### api.example.com → LegisAPI

1. **In Cloudflare Dashboard**:
   - DNS: CNAME record pointing to `legis-api.ruchit.workers.dev`
   - Workers Routes: Route `api.example.com/*` to worker `legis-api`
   - SSL/TLS: Full (strict) mode

### Production Environment Variables

```bash
# Set via wrangler secret
AUTH0_DOMAIN="your-tenant.us.auth0.com"
AUTH0_AUDIENCE="urn:legis-api"
CONGRESS_API_KEY="[SECRET]"  # Optional for higher rate limits
```

### Auth0 Configuration

- **Domain**: your-tenant.us.auth0.com
- **API Identifier**: urn:legis-api
- **Scopes**:
  - read:bills
  - read:members
  - read:votes
  - read:committees

### Production Deployment Commands

```bash
# Deploy to production
wrangler deploy

# Set production secrets
wrangler secret put AUTH0_DOMAIN
wrangler secret put AUTH0_AUDIENCE
wrangler secret put CONGRESS_API_KEY

# Verify deployment
curl https://api.example.com/health
```