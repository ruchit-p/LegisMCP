# OAuth2 Authentication Flow

## Overview

LegisMCP Server implements OAuth2 authorization code flow with PKCE (Proof Key for Code Exchange) for secure authentication through Auth0. This ensures that only authenticated users can access legislative data through AI agents.

## Flow Diagram

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐     ┌──────────────┐
│  AI Agent   │     │ LegisMCP Server │     │    Auth0    │     │   LegisAPI   │
└─────┬───────┘     └────────┬────────┘     └──────┬──────┘     └──────┬───────┘
      │                      │                      │                    │
      │ 1. Connect to MCP    │                      │                    │
      ├─────────────────────>│                      │                    │
      │                      │                      │                    │
      │ 2. Consent Request   │                      │                    │
      │<─────────────────────┤                      │                    │
      │                      │                      │                    │
      │ 3. User Consent      │                      │                    │
      ├─────────────────────>│                      │                    │
      │                      │                      │                    │
      │                      │ 4. Generate PKCE     │                    │
      │                      │    Store State       │                    │
      │                      ├──────────┐          │                    │
      │                      │          │          │                    │
      │                      │<─────────┘          │                    │
      │                      │                      │                    │
      │ 5. Redirect to Auth0 │                      │                    │
      │<─────────────────────┤                      │                    │
      │                      │                      │                    │
      │ 6. User Login        │                      │                    │
      ├──────────────────────┼─────────────────────>│                    │
      │                      │                      │                    │
      │ 7. Auth Code + State │                      │                    │
      │<─────────────────────┼──────────────────────┤                    │
      │                      │                      │                    │
      │ 8. Callback with Code│                      │                    │
      ├─────────────────────>│                      │                    │
      │                      │                      │                    │
      │                      │ 9. Verify State      │                    │
      │                      │    Exchange Code     │                    │
      │                      ├─────────────────────>│                    │
      │                      │                      │                    │
      │                      │ 10. Access Token     │                    │
      │                      │     Refresh Token    │                    │
      │                      │<────────────────────┤                    │
      │                      │                      │                    │
      │ 11. Session Created  │                      │                    │
      │<─────────────────────┤                      │                    │
      │                      │                      │                    │
      │ 12. MCP Tool Request │                      │                    │
      ├─────────────────────>│                      │                    │
      │                      │                      │                    │
      │                      │ 13. API Call w/Token │                    │
      │                      ├──────────────────────┼───────────────────>│
      │                      │                      │                    │
      │                      │ 14. API Response     │                    │
      │                      │<─────────────────────┼────────────────────┤
      │                      │                      │                    │
      │ 15. Tool Response    │                      │                    │
      │<─────────────────────┤                      │                    │
```

## Detailed Flow Steps

### 1. Initial Connection

When an AI agent connects to the MCP server:

```http
GET http://localhost:8788/mcp
```

The server checks for an existing session in Durable Objects.

### 2. Consent Screen

If no valid session exists, the server returns a consent request:

```json
{
  "consent": {
    "type": "oauth2",
    "url": "http://localhost:8788/consent?client_id=mcp-client-123",
    "scopes": ["read:bills", "read:members", "read:votes", "read:committees"]
  }
}
```

### 3. User Consent

The user approves the consent in their AI client interface.

### 4. PKCE Generation

The server generates PKCE parameters:

```typescript
// Generate code verifier
const codeVerifier = generateRandomString(128);

// Generate code challenge
const codeChallenge = await sha256(codeVerifier);

// Store in KV with state
const state = generateRandomString(32);
await env.OAUTH_KV.put(
  `oauth:${state}`,
  JSON.stringify({
    codeVerifier,
    clientId,
    timestamp: Date.now()
  }),
  { expirationTtl: 600 } // 10 minutes
);
```

### 5. Auth0 Redirect

Build authorization URL:

```typescript
const authUrl = new URL(`https://${AUTH0_DOMAIN}/authorize`);
authUrl.searchParams.append('client_id', AUTH0_CLIENT_ID);
authUrl.searchParams.append('response_type', 'code');
authUrl.searchParams.append('redirect_uri', `${baseUrl}/callback`);
authUrl.searchParams.append('scope', AUTH0_SCOPE);
authUrl.searchParams.append('audience', AUTH0_AUDIENCE);
authUrl.searchParams.append('state', state);
authUrl.searchParams.append('code_challenge', codeChallenge);
authUrl.searchParams.append('code_challenge_method', 'S256');
```

### 6-7. User Authentication

User logs in via Auth0 and approves permissions.

### 8. Callback Handling

```http
GET /callback?code=abc123&state=xyz789
```

### 9. State Verification & Token Exchange

```typescript
// Verify state
const storedData = await env.OAUTH_KV.get(`oauth:${state}`);
if (!storedData) {
  throw new Error('Invalid state');
}

// Exchange code for tokens
const tokenResponse = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    client_id: AUTH0_CLIENT_ID,
    client_secret: AUTH0_CLIENT_SECRET,
    code: authCode,
    redirect_uri: `${baseUrl}/callback`,
    code_verifier: codeVerifier
  })
});
```

### 10-11. Session Creation

Store tokens and create MCP session:

```typescript
// Store in Durable Object
await this.state.storage.put('auth', {
  accessToken: tokens.access_token,
  refreshToken: tokens.refresh_token,
  expiresAt: Date.now() + (tokens.expires_in * 1000),
  userInfo: decodedToken
});
```

### 12-15. Tool Execution

With valid session, tools can make authenticated API calls:

```typescript
const response = await fetch(`${API_BASE_URL}/api/bills`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

## Security Features

### PKCE (RFC 7636)

Prevents authorization code interception:

```typescript
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64url(array);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64url(new Uint8Array(digest));
}
```

### State Parameter

Prevents CSRF attacks:

```typescript
// Generate unique state
const state = crypto.randomUUID();

// Verify on callback
if (callbackState !== storedState) {
  throw new Error('State mismatch - possible CSRF attack');
}
```

### Token Storage

- Access tokens: Stored in Durable Object state
- Refresh tokens: Encrypted in KV storage
- Session cookies: HttpOnly, Secure, SameSite=Lax

## Token Management

### Token Refresh

Automatic refresh when access token expires:

```typescript
async function refreshAccessToken(refreshToken: string) {
  const response = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: AUTH0_CLIENT_ID,
      client_secret: AUTH0_CLIENT_SECRET,
      refresh_token: refreshToken
    })
  });
  
  return await response.json();
}
```

### Token Validation

```typescript
function isTokenExpired(expiresAt: number): boolean {
  // Add 5-minute buffer
  return Date.now() >= (expiresAt - 300000);
}
```

## Session Management

### Session Lifecycle

1. **Creation**: On successful OAuth callback
2. **Validation**: On each MCP request
3. **Refresh**: When access token expires
4. **Termination**: On logout or timeout

### Durable Object Storage

```typescript
class AuthenticatedMCP {
  async getSession(): Promise<Session | null> {
    const auth = await this.state.storage.get('auth');
    if (!auth) return null;
    
    if (isTokenExpired(auth.expiresAt)) {
      // Refresh token
      const newTokens = await refreshAccessToken(auth.refreshToken);
      // Update storage
      await this.updateTokens(newTokens);
    }
    
    return auth;
  }
}
```

## Error Handling

### OAuth Errors

```typescript
try {
  // OAuth operations
} catch (error) {
  if (error.error === 'invalid_grant') {
    // Refresh token expired - require re-authentication
    return requireNewAuth();
  } else if (error.error === 'insufficient_scope') {
    // Missing required scope
    return scopeError(error.scope);
  }
  // Generic error
  throw error;
}
```

### Common Error Codes

- `invalid_request` - Malformed request
- `invalid_client` - Client authentication failed
- `invalid_grant` - Invalid authorization code or refresh token
- `unauthorized_client` - Client not authorized
- `unsupported_grant_type` - Invalid grant type
- `invalid_scope` - Requested scope is invalid

## Logout Flow

### 1. Clear Session

```typescript
async function logout(sessionId: string) {
  // Clear Durable Object
  await durableObject.clearSession();
  
  // Clear KV storage
  await env.OAUTH_KV.delete(`session:${sessionId}`);
  
  // Revoke refresh token
  await revokeToken(refreshToken);
}
```

### 2. Token Revocation

```typescript
async function revokeToken(token: string) {
  await fetch(`https://${AUTH0_DOMAIN}/oauth/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: AUTH0_CLIENT_ID,
      client_secret: AUTH0_CLIENT_SECRET,
      token: token
    })
  });
}
```

## Best Practices

### 1. Security

- Always use PKCE for public clients
- Validate state parameter
- Use secure random generators
- Store tokens encrypted
- Implement token rotation

### 2. Performance

- Cache JWKS for token validation
- Preemptively refresh expiring tokens
- Use connection pooling for Auth0 calls
- Implement exponential backoff

### 3. User Experience

- Clear error messages
- Smooth redirect flow
- Progress indicators
- Remember user preferences
- Graceful degradation

## Testing OAuth Flow

### Manual Testing

1. Start MCP server locally
2. Connect with MCP Inspector
3. Complete OAuth flow
4. Verify token storage
5. Test token refresh
6. Test logout

### Automated Testing

```typescript
// Mock Auth0 responses
const mockAuth0 = {
  '/oauth/token': {
    access_token: 'mock-token',
    refresh_token: 'mock-refresh',
    expires_in: 3600
  }
};

// Test flow
describe('OAuth Flow', () => {
  it('should complete authorization', async () => {
    // Test implementation
  });
});
```

## Troubleshooting

### Debug Logging

```typescript
if (env.NODE_ENV === 'development') {
  console.log('OAuth State:', {
    state,
    codeVerifier: codeVerifier.substring(0, 10) + '...',
    timestamp: new Date().toISOString()
  });
}
```

### Common Issues

1. **State Mismatch**
   - Check KV expiration
   - Verify callback URL
   - Check for multiple redirects

2. **Token Exchange Fails**
   - Verify client secret
   - Check PKCE parameters
   - Validate redirect URI

3. **Session Lost**
   - Check Durable Object state
   - Verify session timeout
   - Check for DO eviction