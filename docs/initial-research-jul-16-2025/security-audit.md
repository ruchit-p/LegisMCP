# Security Audit Report

## Executive Summary
The LegisMCP system implements multiple security layers but contains several critical vulnerabilities that need immediate attention.

## Authentication & Authorization

### LegisAPI Service

#### Strengths ✓
- Proper JWT verification using Auth0 JWKS
- Audience validation (`urn:legis-api`)
- Issuer validation
- Scope-based access control with `requireScope()`
- Bearer token parsing and validation

#### Vulnerabilities ⚠️
1. **Hardcoded Auth0 Domain**
   ```typescript
   auth0_domain: 'your-tenant.us.auth0.com' // Should use env var
   ```

2. **Missing Rate Limiting**
   - No rate limiting middleware
   - Only quota tracking, not enforcement
   - Vulnerable to API abuse

3. **No Request Validation**
   - Missing input sanitization
   - No parameter validation middleware
   - SQL injection possible in raw queries

### MCP Server

#### Strengths ✓
- PKCE implementation for OAuth
- CSRF protection with consent tokens
- Secure cookie settings (httpOnly, secure)
- Transaction state validation

#### Vulnerabilities ⚠️
1. **Secrets in Config Files**
   ```json
   // wrangler.jsonc
   "AUTH0_CLIENT_ID": "YOUR_AUTH0_CLIENT_ID",
   "AUTH0_DOMAIN": "your-tenant.us.auth0.com"
   ```

2. **Permissive Error Messages**
   - Detailed error messages could leak information
   - Stack traces potentially exposed

3. **Session Management Issues**
   - No session timeout configuration
   - Sessions persist indefinitely
   - No session revocation mechanism

### Frontend

#### Strengths ✓
- Server-side session management
- Middleware-based route protection
- Stripe webhook signature verification

#### Vulnerabilities ⚠️
1. **API Key Exposure**
   - API keys visible in dashboard
   - No key rotation mechanism
   - Keys stored in plain text

2. **Missing CSP Headers**
   - No Content Security Policy
   - Vulnerable to XSS attacks

## CORS Configuration

### LegisAPI
```typescript
app.use("*", cors()); // ⚠️ Allows all origins
```
**Risk**: Any website can call the API

### Frontend
```javascript
headers: [
  { key: 'Access-Control-Allow-Origin', value: '*' }, // ⚠️ Too permissive
]
```
**Risk**: Allows requests from any origin

### Recommendation
```typescript
cors({
  origin: ['https://example.com', 'http://localhost:3000'],
  credentials: true
})
```

## Access Control Issues

### 1. Missing Admin Verification
- Admin routes exist but no proper verification
- `is_admin` field in database but not checked
- Admin panel accessible without authorization

### 2. Quota Enforcement Gap
```typescript
// Usage tracked but not enforced
api_calls_count: user.api_calls_count + 1 // ⚠️ No blocking
```

### 3. Scope Validation Incomplete
- Scopes checked at endpoint level
- No middleware to validate all scopes
- Potential for scope bypass

## Data Security

### 1. Sensitive Data in Logs
- JWT tokens potentially logged
- User data in error messages
- API keys in request logs

### 2. No Encryption at Rest
- Database stores sensitive data in plain text
- API keys not encrypted
- No field-level encryption

### 3. Missing Data Sanitization
```typescript
// Direct SQL interpolation risk
`SELECT * FROM users WHERE email = '${email}'` // ⚠️ SQL injection
```

## Infrastructure Security

### 1. Environment Variables
- Secrets in configuration files
- No secret rotation
- Missing production/dev separation

### 2. Cloudflare Workers Limits
```json
"cpu_ms": 300000 // 5 minutes - very high
```
**Risk**: Long-running requests could be abused

### 3. Missing Security Headers
Required headers not set:
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security
- Content-Security-Policy

## API Security

### 1. No API Versioning
- Breaking changes affect all clients
- No deprecation strategy
- Difficult to maintain security patches

### 2. Missing Request Signing
- No HMAC or signature validation
- Replay attacks possible
- No timestamp validation

### 3. Webhook Security
```typescript
// Frontend Stripe webhook - Good ✓
const sig = headers.get('stripe-signature');
stripe.webhooks.constructEvent(body, sig, secret);

// But no IP allowlisting for webhooks
```

## Session Security

### 1. Multiple Session Layers
- Auth0 session in Frontend
- OAuth session in MCP Server
- No coordination between sessions
- Session fixation possible

### 2. Token Management
- No automatic token refresh
- Tokens might expire during use
- No graceful degradation

### 3. Cookie Security
```typescript
sameSite: c.env.NODE_ENV !== "development" ? "none" : "lax",
```
**Issue**: `SameSite=none` requires Secure flag

## Critical Vulnerabilities Summary

### High Severity 🔴
1. Hardcoded secrets in configuration files
2. Permissive CORS allowing any origin
3. Missing rate limiting on APIs
4. No input validation or sanitization
5. SQL injection vulnerabilities

### Medium Severity 🟡
1. Missing security headers
2. No API key rotation mechanism
3. Incomplete admin authorization
4. No request signing or replay protection
5. Long CPU timeout allowing abuse

### Low Severity 🟢
1. Detailed error messages
2. No API versioning
3. Missing audit logs
4. No secret rotation policy

## Recommendations

### Immediate Actions
1. Move all secrets to environment variables
2. Implement strict CORS policies
3. Add rate limiting middleware
4. Implement input validation with Zod
5. Use parameterized queries for database

### Short-term Improvements
1. Add security headers middleware
2. Implement API key rotation
3. Add admin role verification
4. Implement request signing
5. Reduce CPU timeout limits

### Long-term Enhancements
1. Implement field-level encryption
2. Add comprehensive audit logging
3. Implement API versioning
4. Add penetration testing
5. Implement security monitoring

## Security Checklist

- [ ] Remove hardcoded secrets
- [ ] Fix CORS configuration
- [ ] Add rate limiting
- [ ] Implement input validation
- [ ] Fix SQL injection risks
- [ ] Add security headers
- [ ] Implement key rotation
- [ ] Add admin authorization
- [ ] Implement request signing
- [ ] Add audit logging
- [ ] Encrypt sensitive data
- [ ] Add monitoring/alerting