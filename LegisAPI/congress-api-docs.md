# Congress.gov API Documentation

This document provides a comprehensive reference for the Congress.gov API endpoints used by the LegisAPI service.

## Overview

The Congress.gov API provides structured access to Congressional data. All endpoints require an API key from api.data.gov.

**Base URL**: `https://api.congress.gov/v3`

**Authentication**: API key must be provided via `api_key` query parameter or `X-API-Key` header.

## Key Concepts

1. **No Text Search**: The Congress.gov API does NOT support text-based search queries. All filtering is done via structured parameters (congress number, bill type, etc.).

2. **Pagination**: Most list endpoints support pagination via `limit` (max 250) and `offset` parameters.

3. **Response Format**: All responses are JSON with a consistent structure containing the data array and pagination info.

## Bill Endpoints

### List Bills

#### GET `/bill`
Returns a list of bills sorted by date of latest action.

**Parameters**:
- `limit` (optional): Number of results to return (max 250, default 20)
- `offset` (optional): Number of results to skip (for pagination)

#### GET `/bill/{congress}`
Returns bills filtered by congress number.

**Path Parameters**:
- `congress`: Congress number (e.g., 118)

#### GET `/bill/{congress}/{billType}`
Returns bills filtered by congress and type.

**Path Parameters**:
- `congress`: Congress number
- `billType`: Bill type (hr, s, hjres, sjres, hconres, sconres, hres, sres)

### Get Specific Bill

#### GET `/bill/{congress}/{billType}/{billNumber}`
Returns detailed information for a specific bill.

**Path Parameters**:
- `congress`: Congress number
- `billType`: Bill type
- `billNumber`: Bill number

**Example**: `/bill/118/hr/1234`

### Bill Sub-resources

#### GET `/bill/{congress}/{billType}/{billNumber}/actions`
Returns actions taken on the bill.

#### GET `/bill/{congress}/{billType}/{billNumber}/amendments`
Returns amendments to the bill.

#### GET `/bill/{congress}/{billType}/{billNumber}/committees`
Returns committees associated with the bill.

#### GET `/bill/{congress}/{billType}/{billNumber}/cosponsors`
Returns bill cosponsors.

#### GET `/bill/{congress}/{billType}/{billNumber}/relatedbills`
Returns related bills.

#### GET `/bill/{congress}/{billType}/{billNumber}/subjects`
Returns legislative subjects.

#### GET `/bill/{congress}/{billType}/{billNumber}/summaries`
Returns bill summaries.

#### GET `/bill/{congress}/{billType}/{billNumber}/text`
Returns text versions of the bill.

#### GET `/bill/{congress}/{billType}/{billNumber}/titles`
Returns bill titles.

## Member Endpoints

### List Members

#### GET `/member`
Returns a list of all congressional members.

#### GET `/member/congress/{congress}`
Returns members for a specific congress.

#### GET `/member/{stateCode}`
Returns members from a specific state.

#### GET `/member/{stateCode}/{district}`
Returns House members from a specific district.

### Get Specific Member

#### GET `/member/{bioguideId}`
Returns detailed information for a specific member.

**Path Parameters**:
- `bioguideId`: Member's bioguide identifier

### Member Activities

#### GET `/member/{bioguideId}/sponsored-legislation`
Returns legislation sponsored by the member.

#### GET `/member/{bioguideId}/cosponsored-legislation`
Returns legislation cosponsored by the member.

## Committee Endpoints

### List Committees

#### GET `/committee`
Returns all congressional committees.

#### GET `/committee/{chamber}`
Returns committees for a specific chamber.

**Path Parameters**:
- `chamber`: house, senate, or joint

#### GET `/committee/{congress}/{chamber}`
Returns committees for a specific congress and chamber.

### Get Specific Committee

#### GET `/committee/{chamber}/{committeeCode}`
Returns detailed committee information.

### Committee Activities

#### GET `/committee/{chamber}/{committeeCode}/bills`
Returns bills referred to the committee.

#### GET `/committee/{chamber}/{committeeCode}/reports`
Returns committee reports.

## Vote Endpoints (Beta)

### House Votes

#### GET `/house-vote/{congress}`
Returns House roll call votes for a congress.

#### GET `/house-vote/{congress}/{session}/{voteNumber}`
Returns details for a specific vote.

## Important Implementation Notes

### 1. Bill Identification
Bills must be identified with three components:
- Congress number (required)
- Bill type (required)
- Bill number (required)

### 2. No Search Capability
The API does not support:
- Text search across bills
- Keyword search
- Content search

To find bills by topic, you must:
1. Get a list of recent bills
2. Filter client-side by title/summary
3. Or maintain a local database for search

### 3. Rate Limiting
- API keys have rate limits
- Implement retry logic with exponential backoff
- Cache responses when possible

### 4. Error Handling
Common error responses:
- 400: Bad request (invalid parameters)
- 401: Unauthorized (invalid API key)
- 404: Resource not found
- 429: Rate limit exceeded
- 500: Server error

### 5. Response Structure
Typical response format:
```json
{
  "bills": [ /* array of bill objects */ ],
  "pagination": {
    "count": 20,
    "next": "https://api.congress.gov/v3/bill?offset=20"
  }
}
```

## Usage Examples

### Get Recent Bills
```
GET /bill?limit=10
```

### Get Bills from 118th Congress
```
GET /bill/118?limit=50
```

### Get Specific Bill (H.R. 1 from 118th Congress)
```
GET /bill/118/hr/1
```

### Get Bill with All Details
To get comprehensive bill information, make multiple requests:
1. `/bill/118/hr/1` - Basic info
2. `/bill/118/hr/1/actions` - Actions
3. `/bill/118/hr/1/cosponsors` - Cosponsors
4. `/bill/118/hr/1/committees` - Committees
5. `/bill/118/hr/1/summaries` - Summaries
6. `/bill/118/hr/1/text` - Text versions

## Migration Guide

### Old Approach (Not Supported)
```javascript
// ❌ Text search not supported
searchBills("climate change")

// ❌ Query parameter search not supported
/api/bills?q=healthcare
```

### New Approach (Correct)
```javascript
// ✅ Get bills by congress
GET /bill/118

// ✅ Get specific bill
GET /bill/118/hr/1234

// ✅ Filter by type
GET /bill/118/hr
```

## Tool Design Recommendations

Based on API capabilities, tools should be:

1. **get-bill**: Get specific bill by congress/type/number
2. **list-recent-bills**: Get recently updated bills
3. **list-bills-by-congress**: Get bills from specific congress
4. **get-member**: Get member by bioguide ID
5. **list-members-by-state**: Get members from a state
6. **get-committee-bills**: Get bills in a committee

Tools should NOT attempt:
- Text search across bills
- Keyword search
- Content-based filtering

## API Key Management

Store API keys in Cloudflare KV:
```javascript
// Store multiple keys for rotation
await env.CONGRESS_KEYS.put('api_keys', JSON.stringify([
  'key1',
  'key2',
  'key3'
]));
```

Rotate keys to avoid rate limits:
```javascript
const keys = JSON.parse(await env.CONGRESS_KEYS.get('api_keys'));
const key = keys[requestCount % keys.length];
```