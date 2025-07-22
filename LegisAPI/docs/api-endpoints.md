# LegisAPI Endpoints Reference

## Base URL

- **Development**: `http://localhost:8789`
- **Production**: `https://api.example.com`

## Authentication

All endpoints except `/api/health` require JWT authentication:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

## Response Format

All responses follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "metadata": {
    "timestamp": "2025-01-21T...",
    "requestId": "..."
  }
}
```

Error responses:

```json
{
  "success": false,
  "data": null,
  "error": "Error message",
  "metadata": { ... }
}
```

## Endpoints

### Health Check

```http
GET /api/health
```

No authentication required. Returns service status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-21T12:00:00Z"
}
```

---

### User Profile

```http
GET /api/me
```

**Required Scope**: None (any valid JWT)

Returns authenticated user information with subscription details.

**Response:**
```json
{
  "success": true,
  "data": {
    "auth0_user_id": "auth0|123",
    "email": "user@example.com",
    "plan": "developer",
    "api_calls_count": 1250,
    "api_calls_limit": 5000,
    "subscription_status": "active",
    "billing_cycle_end": "2025-02-01T00:00:00Z"
  }
}
```

---

### Bills

#### Search Bills

```http
GET /api/bills?q=healthcare&limit=20&offset=0
```

**Required Scope**: `read:bills`

**Query Parameters:**
- `q` (optional): Search query
- `limit` (optional): Results per page (default: 20, max: 250)
- `offset` (optional): Pagination offset (default: 0)
- `sort` (optional): Sort order (default: "date")

**Response:**
```json
{
  "success": true,
  "data": {
    "bills": [
      {
        "bill_id": "118-hr-100",
        "bill_type": "hr",
        "number": "100",
        "congress": 118,
        "title": "Healthcare Reform Act",
        "short_title": "HRA 2025",
        "sponsor": { ... },
        "introduced_date": "2025-01-15",
        "latest_action": { ... }
      }
    ],
    "pagination": {
      "count": 150,
      "offset": 0,
      "limit": 20,
      "total": 150
    }
  }
}
```

#### Get Specific Bill

```http
GET /api/bills/{congress}/{type}/{number}
```

**Required Scope**: `read:bills`

**Path Parameters:**
- `congress`: Congress number (e.g., 118)
- `type`: Bill type (hr, s, hjres, sjres)
- `number`: Bill number

**Example:**
```http
GET /api/bills/118/hr/100
```

#### Get Bill Subresources

```http
GET /api/bills/{congress}/{type}/{number}/{subresource}
```

**Required Scope**: `read:bills`

**Available Subresources:**
- `actions` - Legislative actions
- `amendments` - Bill amendments
- `committees` - Committee referrals
- `cosponsors` - Cosponsor list
- `relatedbills` - Related legislation
- `subjects` - Subject tags
- `summaries` - Bill summaries
- `text` - Full text versions
- `titles` - All title variations

---

### Members

#### Search Members

```http
GET /api/members?q=smith&state=CA&limit=20
```

**Required Scope**: `read:members`

**Query Parameters:**
- `q` (optional): Search query (name)
- `state` (optional): State code (e.g., "CA")
- `party` (optional): Party affiliation ("D", "R", "I")
- `chamber` (optional): "house" or "senate"
- `limit` (optional): Results per page (default: 20)
- `offset` (optional): Pagination offset

#### Get Specific Member

```http
GET /api/members/{bioguideId}
```

**Required Scope**: `read:members`

**Path Parameters:**
- `bioguideId`: Member's bioguide identifier

**Response includes:**
- Personal information
- Current position
- Committee assignments
- Sponsored legislation count
- Contact information

---

### Committees

#### List Committees

```http
GET /api/committees?chamber=house&limit=20
```

**Required Scope**: `read:committees`

**Query Parameters:**
- `chamber` (optional): "house", "senate", or "joint"
- `limit` (optional): Results per page
- `offset` (optional): Pagination offset

#### Get Specific Committee

```http
GET /api/committees/{chamber}/{code}
```

**Required Scope**: `read:committees`

---

### Votes

#### Recent Votes

```http
GET /api/votes?chamber=house&limit=20
```

**Required Scope**: `read:votes`

**Query Parameters:**
- `chamber` (optional): "house" or "senate"
- `year` (optional): Filter by year
- `limit` (optional): Results per page
- `offset` (optional): Pagination offset

---

### Administrative

#### Usage Statistics

```http
GET /api/admin/usage?user_id={userId}
```

**Required Scope**: `read:admin`

Returns API usage statistics for a specific user.

#### System Health

```http
GET /api/admin/health
```

**Required Scope**: `read:admin`

Returns detailed system health metrics.

---

## Rate Limits

Rate limits are enforced per user based on subscription tier:

| Plan | API Calls/Month | Rate Limit |
|------|----------------|------------|
| Free | 100 | 10/hour |
| Developer | 5,000 | 100/hour |
| Professional | 25,000 | 500/hour |
| Enterprise | Unlimited | 2000/hour |

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Error Codes

| Status | Description |
|--------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing JWT |
| 403 | Forbidden - Insufficient scope |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable - Congress.gov down |

## Caching

Responses are cached for performance:

- Bill data: 1 hour
- Member data: 24 hours
- Committee data: 24 hours
- Vote data: 15 minutes

Cache headers:
```http
Cache-Control: public, max-age=3600
ETag: "unique-hash"
```

## Pagination

All list endpoints support pagination:

```http
?limit=50&offset=100
```

Pagination metadata is included in responses:

```json
"pagination": {
  "count": 50,
  "offset": 100,
  "limit": 50,
  "total": 1250,
  "next": "/api/bills?limit=50&offset=150",
  "previous": "/api/bills?limit=50&offset=50"
}
```