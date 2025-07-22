# LegisMCP Server Development Guide

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Wrangler CLI (`npm install -g wrangler`)
- Auth0 account with application configured
- LegisAPI running locally or deployed
- MCP Inspector for testing

## Local Development Setup

### 1. Install Dependencies

```bash
cd LegisMCP_Server
npm install
```

### 2. Configure Environment

Create `.dev.vars` file:

```env
# Auth0 Configuration
AUTH0_DOMAIN=dev-xyz123.us.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_AUDIENCE=urn:legis-api
AUTH0_SCOPE=openid email profile offline_access read:bills read:members read:votes read:committees

# Development Settings
NODE_ENV=development
API_BASE_URL=http://localhost:8789

# Optional Debug Settings
LOG_LEVEL=debug
SESSION_TIMEOUT=7200
```

### 3. Set Up KV Namespace

```bash
# Create local KV namespace
wrangler kv:namespace create "OAUTH_KV" --preview

# Note the ID and update wrangler.jsonc
```

Update `wrangler.jsonc`:

```json
{
  "kv_namespaces": [
    {
      "binding": "OAUTH_KV",
      "id": "your-kv-namespace-id",
      "preview_id": "your-preview-kv-id"
    }
  ]
}
```

### 4. Configure Durable Objects

Ensure `wrangler.jsonc` includes:

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

### 5. Start Development Server

```bash
# Start LegisAPI first (in another terminal)
cd ../LegisAPI && npm run dev

# Start MCP Server
npm run dev
# Server starts on http://localhost:8788
```

## Development Workflow

### Testing with MCP Inspector

1. Install MCP Inspector:
```bash
npm install -g @modelcontextprotocol/inspector
```

2. Launch Inspector:
```bash
mcp-inspector
```

3. Connect to server:
   - Transport: HTTP
   - URL: `http://localhost:8788/mcp`

4. Complete OAuth flow when prompted

5. Test available tools

### Adding New Tools

#### 1. Define Tool Schema

Create `src/tools/schemas/new-tool.ts`:

```typescript
import { z } from 'zod';

export const newToolSchema = {
  name: 'new-tool',
  description: 'Description of what the tool does',
  inputSchema: z.object({
    param1: z.string().describe('Parameter description'),
    param2: z.number().optional().describe('Optional parameter')
  })
};
```

#### 2. Implement Tool Handler

Create `src/tools/handlers/new-tool.ts`:

```typescript
import { ToolHandler } from '../types';
import { newToolSchema } from '../schemas/new-tool';

export const newToolHandler: ToolHandler = {
  schema: newToolSchema,
  requiredScope: 'read:bills',
  
  async execute(params, context) {
    const { apiClient, user } = context;
    
    // Validate parameters
    const validated = newToolSchema.inputSchema.parse(params);
    
    // Make API call
    const response = await apiClient.get('/api/endpoint', {
      params: validated
    });
    
    // Process and return data
    return {
      success: true,
      data: response.data
    };
  }
};
```

#### 3. Register Tool

Update `src/tools/index.ts`:

```typescript
import { newToolHandler } from './handlers/new-tool';

export const tools = {
  // ... existing tools
  'new-tool': newToolHandler
};
```

### Debugging

#### Enable Debug Logging

Set `LOG_LEVEL=debug` in `.dev.vars`

```typescript
function debug(message: string, data?: any) {
  if (env.LOG_LEVEL === 'debug') {
    console.log(`[DEBUG] ${message}`, data);
  }
}
```

#### Common Debug Points

```typescript
// OAuth flow
debug('OAuth state generated', { state, timestamp });
debug('Token exchange response', { status: response.status });

// Tool execution
debug('Tool called', { tool: toolName, params });
debug('API response', { endpoint, status, duration });

// Session management
debug('Session created', { userId, expiresAt });
debug('Session validated', { isValid, remainingTime });
```

#### Using Wrangler Tail

```bash
# Stream logs
wrangler tail

# Filter logs
wrangler tail --search "ERROR"
wrangler tail --search "user@example.com"
```

### Error Handling

#### Tool Error Response

```typescript
try {
  // Tool logic
} catch (error) {
  if (error.response?.status === 401) {
    throw new MCPError('Authentication expired', 'AUTH_EXPIRED');
  } else if (error.response?.status === 429) {
    throw new MCPError('Rate limit exceeded', 'RATE_LIMIT');
  }
  
  // Log unexpected errors
  console.error('Tool execution failed:', error);
  throw new MCPError('Internal error', 'INTERNAL_ERROR');
}
```

#### Graceful Degradation

```typescript
// Fallback for API errors
if (!apiResponse.ok) {
  return {
    success: false,
    error: 'Service temporarily unavailable',
    fallback: getCachedData(cacheKey)
  };
}
```

### Performance Optimization

#### 1. Connection Pooling

```typescript
// Reuse HTTP client
const httpClient = new HttpClient({
  baseURL: env.API_BASE_URL,
  timeout: 30000,
  keepAlive: true
});
```

#### 2. Response Caching

```typescript
// Cache frequently accessed data
const cacheKey = `bill:${congress}:${type}:${number}`;
const cached = await env.OAUTH_KV.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

// Fetch and cache
const data = await fetchBillData();
await env.OAUTH_KV.put(cacheKey, JSON.stringify(data), {
  expirationTtl: 3600 // 1 hour
});
```

#### 3. Parallel Requests

```typescript
// Fetch multiple resources concurrently
const [bills, members, committees] = await Promise.all([
  apiClient.get('/api/bills'),
  apiClient.get('/api/members'),
  apiClient.get('/api/committees')
]);
```

### Testing

#### Unit Tests

```typescript
// src/tools/handlers/__tests__/analyze-bill.test.ts
import { analyzeBillHandler } from '../analyze-bill';

describe('analyze-bill tool', () => {
  it('should analyze bill correctly', async () => {
    const mockContext = {
      apiClient: createMockApiClient(),
      user: { id: 'test-user' }
    };
    
    const result = await analyzeBillHandler.execute(
      { congress: 118, type: 'hr', number: 1 },
      mockContext
    );
    
    expect(result.success).toBe(true);
    expect(result.data.bill).toBeDefined();
  });
});
```

#### Integration Tests

```typescript
// Run with both services
npm run test:integration
```

### Local OAuth Testing

#### 1. Mock OAuth Flow

For rapid development without Auth0:

```typescript
if (env.NODE_ENV === 'development' && env.MOCK_AUTH) {
  return mockAuthResponse();
}
```

#### 2. Test Different User Scenarios

```typescript
// Test different subscription tiers
const testUsers = [
  { plan: 'free', limit: 100 },
  { plan: 'developer', limit: 5000 },
  { plan: 'professional', limit: 25000 }
];
```

## Development Best Practices

### 1. Code Organization

```
src/
├── index.ts              # Main entry point
├── durable-objects/      # Durable Object classes
├── handlers/             # HTTP route handlers
├── tools/                # MCP tools
│   ├── schemas/         # Tool schemas
│   ├── handlers/        # Tool implementations
│   └── index.ts         # Tool registry
├── services/             # External service clients
├── utils/                # Utility functions
└── types/                # TypeScript types
```

### 2. Type Safety

```typescript
// Use strict types
interface ToolContext {
  apiClient: ApiClient;
  user: AuthenticatedUser;
  env: Env;
}

// Validate at boundaries
const params = toolSchema.parse(input);
```

### 3. Error Messages

Provide clear, actionable error messages:

```typescript
throw new Error(
  `Bill not found: ${congress}/${type}/${number}. ` +
  `Please check the bill identifier and try again.`
);
```

### 4. Documentation

```typescript
/**
 * Analyzes a congressional bill and provides insights
 * @param params - Bill identifier (congress, type, number)
 * @returns Comprehensive bill analysis including sponsor data
 */
export async function analyzeBill(params: BillParams): Promise<BillAnalysis> {
  // Implementation
}
```

## Monitoring Development

### Local Metrics

```typescript
// Track tool usage
const metrics = {
  toolCalls: new Map<string, number>(),
  apiLatency: [],
  errors: []
};

// Log metrics periodically
setInterval(() => {
  console.log('Metrics:', metrics);
}, 60000);
```

### Performance Profiling

```typescript
const start = performance.now();
// Operation
const duration = performance.now() - start;
console.log(`Operation took ${duration}ms`);
```

## Troubleshooting

### Common Development Issues

1. **OAuth redirect fails**
   - Check callback URL in Auth0
   - Verify localhost port
   - Clear browser cookies

2. **KV namespace errors**
   - Run `wrangler kv:namespace list`
   - Check preview_id for local dev
   - Verify binding names

3. **Durable Object not found**
   - Check class export
   - Verify wrangler.jsonc config
   - Restart dev server

4. **API connection refused**
   - Ensure LegisAPI is running
   - Check API_BASE_URL
   - Verify port numbers

### Debug Commands

```bash
# Check worker configuration
wrangler whoami

# List KV namespaces
wrangler kv:namespace list

# View KV contents
wrangler kv:key list --namespace-id=<id>

# Clear local state
rm -rf .wrangler/state
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