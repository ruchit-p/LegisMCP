# MCP Tools Reference

## Overview

LegisMCP Server provides a comprehensive set of tools for AI agents to interact with U.S. legislative data. All tools follow the Model Context Protocol (MCP) specification.

## Tool Categories

### Authentication & User Management
- `whoami` - Get authenticated user information
- `get-usage-stats` - Track API usage and limits

### Bill Research & Analysis
- `analyze-bill` - Comprehensive bill analysis
- `list-recent-bills` - Recent legislation
- `get-bill` - Specific bill details
- `trending-bills` - Trending legislation
- `subresource` - Bill subresources (text, actions, etc.)

### Member Information
- `member-details` - Detailed member information
- `member-search` - Search members of Congress

### Advanced Search
- `congress-query` - Natural language queries
- `universal-search` - Cross-collection search

## Tool Specifications

### whoami

**Description**: Returns information about the authenticated user.

**Parameters**: None

**Response**:
```json
{
  "email": "user@example.com",
  "sub": "auth0|123456",
  "name": "John Doe",
  "plan": "developer",
  "api_calls_remaining": 3750
}
```

---

### analyze-bill

**Description**: Provides comprehensive analysis of a congressional bill including sponsor information, cosponsors, committees, likelihood of passage, and controversy assessment.

**Parameters**:
- `congress` (number, required): Congress number (e.g., 118)
- `type` (string, required): Bill type (hr, s, hjres, sjres, hconres, sconres, hres, sres)
- `number` (number, required): Bill number

**Example**:
```json
{
  "congress": 118,
  "type": "hr",
  "number": 1500
}
```

**Response**:
```json
{
  "bill": {
    "congress": 118,
    "type": "hr",
    "number": "1500",
    "title": "Infrastructure Investment Act",
    "summary": "...",
    "sponsor": {
      "bioguideId": "S001234",
      "name": "Rep. Smith, John",
      "party": "D",
      "state": "CA"
    },
    "cosponsors": {
      "count": 45,
      "byParty": {
        "D": 30,
        "R": 15
      }
    },
    "committees": [...],
    "actions": [...],
    "passageLikelihood": "moderate",
    "controversyLevel": "low"
  }
}
```

---

### list-recent-bills

**Description**: Lists recent bills sorted by introduction date with filtering options.

**Parameters**:
- `limit` (number, optional): Number of results (1-250, default: 20)
- `offset` (number, optional): Pagination offset (default: 0)
- `congress` (number, optional): Filter by congress number
- `chamber` (string, optional): Filter by chamber (house, senate, both)
- `type` (string, optional): Filter by bill type

**Example**:
```json
{
  "limit": 10,
  "chamber": "house",
  "congress": 118
}
```

---

### get-bill

**Description**: Retrieves detailed information about a specific bill.

**Parameters**:
- `congress` (number, required): Congress number
- `type` (string, required): Bill type
- `number` (number, required): Bill number
- `full` (boolean, optional): Include all details (default: false)

**Example**:
```json
{
  "congress": 118,
  "type": "s",
  "number": 500,
  "full": true
}
```

---

### trending-bills

**Description**: Analyzes and returns trending legislation based on activity, cosponsors, and momentum.

**Parameters**:
- `limit` (number, optional): Number of results (default: 10)
- `timeframe` (string, optional): Time period (week, month, session)
- `chamber` (string, optional): Filter by chamber

**Response includes**:
- Trending score
- Recent activity
- Momentum indicators
- Media mentions

---

### congress-query

**Description**: Natural language interface for complex congressional queries.

**Parameters**:
- `query` (string, required): Natural language query
- `options` (object, optional): Additional filters

**Examples**:
```json
{
  "query": "healthcare bills introduced this month with bipartisan support"
}

{
  "query": "all votes by Senator Smith on defense bills",
  "options": {
    "congress": 118
  }
}
```

---

### member-details

**Description**: Retrieves comprehensive information about a member of Congress.

**Parameters**:
- `bioguideId` (string, required): Member's bioguide identifier
- `includeVotes` (boolean, optional): Include recent votes
- `includeBills` (boolean, optional): Include sponsored bills

**Response**:
```json
{
  "member": {
    "bioguideId": "S001234",
    "name": "Smith, John A.",
    "state": "CA",
    "district": "12",
    "party": "D",
    "chamber": "house",
    "committees": [...],
    "leadership": "Minority Whip",
    "tenure": {
      "start": "2015-01-03",
      "terms": 5
    },
    "contact": {
      "phone": "202-225-1234",
      "website": "https://smith.house.gov"
    },
    "sponsoredBills": {
      "total": 145,
      "enacted": 3
    }
  }
}
```

---

### member-search

**Description**: Searches for members of Congress with various filters.

**Parameters**:
- `query` (string, optional): Name search
- `state` (string, optional): State code (e.g., "CA")
- `party` (string, optional): Party (D, R, I)
- `chamber` (string, optional): house or senate
- `committee` (string, optional): Committee membership
- `limit` (number, optional): Results limit

**Example**:
```json
{
  "state": "TX",
  "chamber": "senate",
  "party": "R"
}
```

---

### universal-search

**Description**: Searches across all legislative collections (bills, members, committees, votes).

**Parameters**:
- `query` (string, required): Search query
- `collections` (array, optional): Limit to specific collections
- `limit` (number, optional): Results per collection

**Example**:
```json
{
  "query": "climate change",
  "collections": ["bills", "members"],
  "limit": 5
}
```

---

### subresource

**Description**: Accesses detailed subresources for a bill.

**Parameters**:
- `congress` (number, required): Congress number
- `type` (string, required): Bill type
- `number` (number, required): Bill number
- `subresource` (string, required): Type of subresource

**Available Subresources**:
- `actions` - Legislative actions taken
- `amendments` - Proposed amendments
- `committees` - Committee assignments
- `cosponsors` - List of cosponsors
- `relatedbills` - Related legislation
- `subjects` - Subject classifications
- `summaries` - CRS summaries
- `text` - Full text versions
- `titles` - All title variations

---

### get-usage-stats

**Description**: Returns API usage statistics for the authenticated user.

**Parameters**:
- `period` (string, optional): Time period (day, week, month)

**Response**:
```json
{
  "usage": {
    "plan": "developer",
    "period": "month",
    "api_calls": {
      "used": 1250,
      "limit": 5000,
      "remaining": 3750
    },
    "mcp_calls": {
      "used": 450,
      "limit": 5000,
      "remaining": 4550
    },
    "reset_date": "2025-02-01T00:00:00Z",
    "top_endpoints": [
      {
        "endpoint": "/api/bills",
        "calls": 500
      }
    ]
  }
}
```

## Error Handling

All tools return errors in a consistent format:

```json
{
  "error": {
    "code": "INSUFFICIENT_SCOPE",
    "message": "This tool requires the 'read:bills' scope",
    "details": {
      "required_scope": "read:bills",
      "user_scopes": ["read:members"]
    }
  }
}
```

### Common Error Codes

- `AUTHENTICATION_REQUIRED` - User not authenticated
- `INSUFFICIENT_SCOPE` - Missing required scope
- `RATE_LIMIT_EXCEEDED` - API rate limit hit
- `INVALID_PARAMETERS` - Invalid tool parameters
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `API_ERROR` - Upstream API error
- `INTERNAL_ERROR` - Server error

## Best Practices

### 1. Efficient Queries

- Use specific tools rather than universal search when possible
- Limit results to what you need
- Cache results when appropriate

### 2. Parameter Validation

- Always provide required parameters
- Use correct data types
- Validate congress numbers (typically 100-118+)

### 3. Error Recovery

- Handle rate limits gracefully
- Retry on transient errors
- Provide meaningful feedback to users

### 4. Scope Management

- Request only needed scopes
- Check tool requirements
- Handle scope errors gracefully

## Rate Limits

Rate limits are enforced at the API level:

- **Free**: 100 calls/month
- **Developer**: 5,000 calls/month
- **Professional**: 25,000 calls/month
- **Enterprise**: Unlimited

## Integration Examples

### Python MCP Client

```python
import mcp

client = mcp.Client("http://localhost:8788/mcp")
await client.authenticate()  # OAuth flow

# Get recent bills
result = await client.call_tool(
    "list-recent-bills",
    {"limit": 5, "chamber": "house"}
)
```

### JavaScript/TypeScript

```typescript
import { MCPClient } from '@modelcontextprotocol/sdk';

const client = new MCPClient({
  url: 'https://mcp.example.com/mcp'
});

// Analyze a bill
const analysis = await client.callTool('analyze-bill', {
  congress: 118,
  type: 'hr',
  number: 1
});
```

## Tool Development

To add new tools:

1. Define tool schema in `src/tools/schemas/`
2. Implement handler in `src/tools/handlers/`
3. Register in tool registry
4. Add scope requirements
5. Update documentation

Example tool definition:

```typescript
export const newToolSchema = {
  name: 'new-tool',
  description: 'Description of what the tool does',
  inputSchema: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: 'Parameter description' }
    },
    required: ['param1']
  }
};
```