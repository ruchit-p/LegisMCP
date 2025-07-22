# LegisAPI Fixes for Congress.gov API Integration

## Problem Summary
The LegisAPI service is double-wrapping responses from Congress.gov API, causing structure mismatches in the MCP tools.

## Congress.gov API Response Formats (Actual)

Based on testing with the API key, here are the actual response formats:

### Bill Details
```json
{
  "bill": {
    "congress": 118,
    "number": "1",
    "billType": "hr",
    "title": "...",
    "introducedDate": "2023-03-14",
    "latestAction": {
      "actionDate": "2023-03-30",
      "actionTime": "11:47:06",
      "text": "..."
    },
    "policyArea": {
      "name": "Energy"
    },
    "actions": {
      "count": 93,
      "url": "https://api.congress.gov/v3/bill/118/hr/1/actions?format=json"
    },
    "cosponsors": {
      "count": 49,
      "url": "..."
    }
  }
}
```

### Actions
```json
{
  "actions": [
    {
      "actionCode": "H38900",
      "actionDate": "2023-03-30",
      "actionTime": "11:47:06",
      "text": "The Clerk was authorized...",
      "type": "Floor",
      "sourceSystem": {
        "code": 2,
        "name": "House floor actions"
      }
    }
  ]
}
```

### Cosponsors
```json
{
  "cosponsors": [
    {
      "bioguideId": "M001159",
      "district": 5,
      "firstName": "Cathy",
      "lastName": "Rodgers",
      "middleName": "McMorris",
      "fullName": "Rep. McMorris Rodgers, Cathy [R-WA-5]",
      "party": "R",
      "state": "WA",
      "sponsorshipDate": "2023-03-14",
      "isOriginalCosponsor": true
    }
  ]
}
```

### Subjects
```json
{
  "subjects": {
    "legislativeSubjects": [
      {
        "name": "Administrative law and regulatory procedures",
        "updateDate": "2023-03-17T18:05:41Z"
      }
    ],
    "policyArea": {
      "name": "Energy"
    }
  },
  "pagination": {
    "count": 53,
    "next": "..."
  }
}
```

### Members
```json
{
  "members": [
    {
      "bioguideId": "C000488",
      "name": "Clay, William (Bill)",
      "partyName": "Democratic",
      "state": "Missouri",
      "district": 1,
      "terms": {
        "item": [...]
      }
    }
  ],
  "pagination": {
    "count": 2598,
    "next": "..."
  }
}
```

## Required Fixes

### 1. Fix Route Handlers in index.ts

The main issue is that route handlers are wrapping the already-wrapped responses:

```typescript
// CURRENT (INCORRECT):
app.get("/api/bills/:congress/:type/:number/actions", requireScope("read:bills"), async (c) => {
  const actions = await congressService.getBillActions(...);
  return c.json({ actions }); // This creates { actions: { actions: [...] } }
});

// FIXED:
app.get("/api/bills/:congress/:type/:number/actions", requireScope("read:bills"), async (c) => {
  const response = await congressService.getBillActions(...);
  return c.json(response); // Pass through the original structure
});
```

### 2. Update All Subresource Routes

Apply the same fix to all subresource endpoints:
- `/api/bills/:congress/:type/:number/actions` - line 267
- `/api/bills/:congress/:type/:number/cosponsors` - line 301
- `/api/bills/:congress/:type/:number/committees` - line 318
- `/api/bills/:congress/:type/:number/subjects` - line 369
- `/api/bills/:congress/:type/:number/amendments` - line 335
- `/api/bills/:congress/:type/:number/relatedbills` - line 352
- `/api/bills/:congress/:type/:number/summaries` - line 386
- `/api/bills/:congress/:type/:number/text` - line 284

### 3. Fix Transform Methods in congress-v2.ts

Update the transform methods to handle the actual Congress.gov response formats:

```typescript
private transformBill(data: any): Bill {
  // Handle the actual structure where billNumber might be a string
  return {
    billNumber: parseInt(data.number || data.billNumber),
    billType: data.type || data.billType,
    congress: data.congress || parseInt(data.congress),
    title: data.title || data.short_title || data.official_title || 'Untitled',
    introducedDate: data.introducedDate,
    lastActionDate: data.latestAction?.actionDate || data.updateDate,
    lastAction: data.latestAction?.text,
    sponsor: this.extractSponsor(data),
    policyArea: data.policyArea?.name,
    summary: data.summary?.text,
    url: data.url
  };
}

private transformMember(data: any): Member {
  // Handle both fullName formats
  const fullName = data.fullName || data.name || 
                   `${data.firstName || ''} ${data.lastName || ''}`.trim();
  
  return {
    bioguideId: data.bioguideId,
    fullName: fullName,
    firstName: data.firstName || data.name?.split(' ')[0] || '',
    lastName: data.lastName || data.name?.split(' ').slice(-1)[0] || '',
    party: data.party || data.partyName?.charAt(0) || '',
    state: data.state,
    chamber: this.extractChamber(data),
    district: data.district,
    phoneNumber: data.phoneNumber,
    url: data.url
  };
}

private extractChamber(data: any): 'house' | 'senate' {
  // Check multiple sources for chamber info
  if (data.chamber) return data.chamber.toLowerCase();
  if (data.terms?.item?.[0]?.chamber) {
    const chamber = data.terms.item[0].chamber.toLowerCase();
    return chamber.includes('house') ? 'house' : 'senate';
  }
  return 'house'; // default
}
```

### 4. Update MCP Tools to Handle Both Formats

For backward compatibility, update MCP tools to handle both the current (incorrect) and fixed formats:

```typescript
// In subresourceTool.ts
private extractItems(data: any, subresource: string): any[] {
  if (!data) return [];
  
  // Handle both formats during transition
  // New format: data.actions is the array
  if (Array.isArray(data[subresource])) {
    return data[subresource];
  }
  
  // Old format: data.actions.actions is the array (double-wrapped)
  if (data[subresource] && Array.isArray(data[subresource][subresource])) {
    return data[subresource][subresource];
  }
  
  // Direct array
  if (Array.isArray(data)) {
    return data;
  }
  
  // Special handling for subjects which has a different structure
  if (subresource === 'subjects' && data.subjects) {
    return [data.subjects]; // Wrap in array for consistent handling
  }
  
  return [];
}
```

## Implementation Steps

1. **Update LegisAPI route handlers** - Remove the extra wrapping
2. **Fix transform methods** - Handle actual Congress.gov formats
3. **Update MCP tools** - Add backward compatibility
4. **Test thoroughly** - Verify all endpoints work correctly

## Benefits

- Eliminates double-wrapping issue
- Maintains Congress.gov API structure
- Reduces confusion about data formats
- Improves maintainability