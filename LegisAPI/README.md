# LegisAPI - Legislative Data REST API

This is a protected REST API that interfaces with congress.gov to provide legislative data access. It is used by the LegisMCP server to provide AI agents with real-time legislative information.

> Note: This API is deployed to Cloudflare Workers and uses D1 for user management and analytics.

## Auth0 Configuration

In the Auth0 dashboard, create a new API in the APIs section.

<img src="../docs/create-api.jpg" width="500" alt="Create API">

Once the API is created, enable "Offline Access" so we can get a refresh token.

<img src="../docs/offline-access.jpg" width="500" alt="Enable Offline Access">

> Note: You can turn off the "Allow Skipping User Consent" if you want to force users to consent to the scopes.

And finally add the following API permissions:

- `read:bills`
- `read:members`
- `read:votes`
- `read:committees`

<img src="../docs/create-permissions.jpg" width="500" alt="Create Permissions">

That's it! You can now configure your local environment or deploy the API to Cloudflare.

## Development

Create a `.dev.vars` file in the root of the project with the following structure:

```
AUTH0_DOMAIN=yourtenant.us.auth0.com
AUTH0_AUDIENCE=urn:legis-api
CONGRESS_API_KEY=your-congress-api-key
```

The `AUTH0_DOMAIN` is the domain of the Auth0 tenant. The `AUTH0_AUDIENCE` is the audience of the API you created in the Auth0 tenant (eg: `urn:legis-api`). The `CONGRESS_API_KEY` is optional but recommended for higher rate limits with congress.gov.

### Testing the API

To test the API, you can use the following command:

```
npm run dev
```

This will start the worker on port 8789. In the Auth0 dashboard there is a **Test** tab in the API where you can get an `access_token` to call the API. Use this to call the API as follows:

```bash
# Health check (no auth required)
curl http://localhost:8789/api/health

# User profile (requires JWT)
curl --request GET \
  --url http://localhost:8789/api/me \
  --header 'Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6Im...'

# Search bills (requires JWT + read:bills scope)
curl --request GET \
  --url 'http://localhost:8789/api/bills?q=healthcare' \
  --header 'Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6Im...'
```

## Deploying the API

## Database Setup

1. Create a D1 database:
```bash
wrangler d1 create legis-db
```

2. Apply the database schema:
```bash
wrangler d1 execute legis-db --file=./schema.sql
```

3. Update the database ID in `wrangler.jsonc`

## Deploying the API

To deploy the API to Cloudflare, you will first need to set the following secrets:

```bash
wrangler secret put AUTH0_DOMAIN
wrangler secret put AUTH0_AUDIENCE
wrangler secret put CONGRESS_API_KEY
```

Once the secrets are set, you can deploy the API with the following command:

```bash
npm run deploy
```
