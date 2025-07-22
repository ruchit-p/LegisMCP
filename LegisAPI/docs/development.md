# LegisAPI Development Guide

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Wrangler CLI (`npm install -g wrangler`)
- Auth0 account with API configured
- (Optional) Congress.gov API key

## Local Development Setup

### 1. Install Dependencies

```bash
cd LegisAPI
npm install
```

### 2. Configure Environment

Create `.dev.vars` file in the LegisAPI directory:

```env
# Auth0 Configuration
AUTH0_DOMAIN=dev-xyz123.us.auth0.com
AUTH0_AUDIENCE=urn:legis-api

# Optional: Congress.gov API key for higher rate limits
CONGRESS_API_KEY=your-api-key-here

# Development mode
NODE_ENV=development
```

### 3. Database Setup

#### Create Local Database

```bash
# Create D1 database for local development
wrangler d1 create legis-db --local
```

#### Apply Schema

```bash
# Apply base schema
wrangler d1 execute legis-db --local --file=./schema.sql
```

#### Run Migrations

```bash
# Apply all migrations in order
for file in ./migrations/*.sql; do
  echo "Applying migration: $file"
  wrangler d1 execute legis-db --local --file="$file"
done
```

#### Verify Database

```bash
# Check tables were created
wrangler d1 execute legis-db --local --command="SELECT name FROM sqlite_master WHERE type='table'"

# Check user_subscription_details view
wrangler d1 execute legis-db --local --command="SELECT * FROM user_subscription_details LIMIT 1"
```

### 4. Start Development Server

```bash
npm run dev
# Server starts on http://localhost:8789
```

## Development Workflow

### Testing API Endpoints

#### 1. Get Test Token from Auth0

1. Go to Auth0 Dashboard → APIs → Your API
2. Click on "Test" tab
3. Copy the access token

#### 2. Test with cURL

```bash
# Health check (no auth needed)
curl http://localhost:8789/api/health

# Get user profile
curl http://localhost:8789/api/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search bills
curl "http://localhost:8789/api/bills?q=healthcare&limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get specific bill
curl http://localhost:8789/api/bills/118/hr/100 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Adding New Endpoints

1. Add route handler in `src/index.ts`:

```typescript
app.get('/api/new-endpoint', jwt, async (c) => {
  // Check required scope
  if (!hasScope(c, 'read:data')) {
    return c.json({ error: 'Insufficient scope' }, 403);
  }
  
  // Your logic here
  return c.json({ success: true, data: {} });
});
```

2. Add scope validation if needed
3. Update service layer in `src/services/`
4. Add TypeScript types in `src/types/`

### Database Operations

#### Query Examples

```typescript
// Get user by Auth0 ID
const user = await c.env.LEGIS_DB
  .prepare("SELECT * FROM users WHERE auth0_user_id = ?")
  .bind(auth0UserId)
  .first<User>();

// Update usage count
await c.env.LEGIS_DB
  .prepare("UPDATE users SET api_calls_count = api_calls_count + 1 WHERE id = ?")
  .bind(userId)
  .run();

// Log API usage
await c.env.LEGIS_DB
  .prepare(
    "INSERT INTO api_usage (user_id, endpoint, method, status_code, response_time_ms) VALUES (?, ?, ?, ?, ?)"
  )
  .bind(userId, endpoint, method, statusCode, responseTime)
  .run();
```

### Debugging

#### Enable Debug Logging

```typescript
// In your code
if (c.env.NODE_ENV === 'development') {
  console.log('Debug:', { 
    user: c.get('user'),
    payload: c.get('jwtPayload') 
  });
}
```

#### View Logs

```bash
# Tail logs in development
wrangler tail
```

#### Common Issues

1. **JWT Verification Fails**
   - Check Auth0 domain is correct
   - Verify audience matches
   - Ensure token hasn't expired

2. **Database Errors**
   - Check if migrations were applied
   - Verify table/column names
   - Check data types match

3. **Congress API Issues**
   - Check rate limits
   - Verify API key is valid
   - Check cache is working

### Type Generation

```bash
# Generate Cloudflare Worker types
npm run cf-typegen

# Run TypeScript checks
npm run type-check
```

## Best Practices

### Code Organization

```
src/
├── index.ts          # Main application entry
├── middlewares/      # JWT, rate limiting, etc.
├── services/         # Business logic
├── types/            # TypeScript definitions
└── utils/            # Helper functions
```

### Error Handling

```typescript
try {
  // Your code
} catch (error) {
  console.error('Operation failed:', error);
  
  // Log to analytics
  c.env.USAGE_ANALYTICS?.writeDataPoint({
    blobs: ['error', endpoint, error.message],
    indexes: [userId],
  });
  
  return c.json({ 
    success: false, 
    error: 'Operation failed' 
  }, 500);
}
```

### Performance Tips

1. **Use Caching**
   ```typescript
   const cached = await c.env.API_CACHE.get(cacheKey);
   if (cached) return c.json(JSON.parse(cached));
   ```

2. **Batch Database Operations**
   ```typescript
   const batch = db.batch();
   // Add multiple operations
   await batch.execute();
   ```

3. **Optimize Queries**
   - Use indexes effectively
   - Limit result sets
   - Avoid N+1 queries

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
# Start services
npm run dev

# Run integration tests
npm run test:integration
```

### Load Testing

```bash
# Using autocannon
npx autocannon -c 10 -d 30 \
  -H "Authorization: Bearer TOKEN" \
  http://localhost:8789/api/bills
```

## Monitoring

### Local Metrics

```bash
# View database metrics
wrangler d1 execute legis-db --local \
  --command="SELECT COUNT(*) as total_users FROM users"

# Check API usage
wrangler d1 execute legis-db --local \
  --command="SELECT endpoint, COUNT(*) as calls FROM api_usage GROUP BY endpoint"
```

### Performance Profiling

Add timing to critical paths:

```typescript
const start = Date.now();
// Your operation
const duration = Date.now() - start;
console.log(`Operation took ${duration}ms`);
```

## Runtime Types Migration

### Migration from @cloudflare/workers-types to Generated Runtime Types

#### What Changed

1. **Removed @cloudflare/workers-types dependency**
2. **Updated tsconfig.json**:
   - Changed from `"types": ["@cloudflare/workers-types/2023-07-01"]`
   - To `"types": ["./worker-configuration.d.ts", "node"]`
3. **Added @types/node** as dev dependency (required for nodejs_compat flag)
4. **Updated package.json scripts** to generate types before type checking:
   - `"type-check": "npm run cf-typegen && tsc --noEmit"`
5. **Removed worker-configuration.d.ts from .gitignore** (should be committed)
6. **Fixed imports**:
   - Removed all `import type { Env } from ...` statements
   - Env is now globally available from worker-configuration.d.ts

#### Benefits

- Types are now generated based on your exact Worker configuration
- Includes bindings from wrangler.jsonc (KV, D1, AI, etc.)
- Matches your compatibility date and flags
- No version mismatch between runtime and types

#### Usage

1. Run `npm run cf-typegen` (or `wrangler types`) after changing wrangler.jsonc
2. The Env interface is globally available - no imports needed
3. Commit worker-configuration.d.ts to version control

#### Commands

```bash
# Generate types
npm run cf-typegen

# Type check (includes type generation)
npm run type-check

# Manual generation
wrangler types
```