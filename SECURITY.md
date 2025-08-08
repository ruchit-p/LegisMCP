## Security Policy

### Supported Versions

Security fixes are provided on the `main` branch.

### Reporting a Vulnerability

Please open a private issue or contact the maintainer. Do not disclose publicly until a fix is available.

### Secrets & Configuration

- No secrets in code or history. Use environment variables (Wrangler/Vercel/Cloudflare KV).
- Example placeholders only in docs: `your-tenant.us.auth0.com`, `pk_live_...`, `whsec_...`.

### Hardening Guidance

- Use Auth0 JWKS for JWT verification
- Validate CORS origins via configuration
- Verify Stripe webhooks with HMAC signature
- Rate limit and log errors


