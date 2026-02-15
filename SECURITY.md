## Security Policy

### Supported Versions

Security fixes are provided on the `main` branch.

### Reporting a Vulnerability

Please open a private issue or contact the maintainer. Do not disclose publicly until a fix is available.

### Secrets & Configuration

- No secrets in code or history. Use environment variables (Wrangler/Vercel).
- Congress.gov API keys are passed as environment variables or request headers.
- The hosted service stores only SHA-256 hashes of API keys — never raw keys.

### Hardening Guidance

- Validate CORS origins via configuration
- Rate limit and log errors
- Keep dependencies up to date
