# LegisMCP Integration Guide

## Overview

This guide covers how to integrate AI agents and applications with the LegisMCP Server using the Model Context Protocol (MCP).

## Supported Clients

### Official MCP Clients

- **MCP Inspector** - Testing and debugging
- **Claude Desktop** - Anthropic's AI assistant
- **Cloudflare AI Playground** - Web-based testing
- **Custom MCP Clients** - Using MCP SDK

### Integration Methods

1. **HTTP Transport** - Standard REST-like interface
2. **WebSocket Transport** - Real-time bidirectional communication
3. **SDK Integration** - Using official MCP libraries

## Quick Start Integration

### 1. Using MCP Inspector

```bash
# Install MCP Inspector
npm install -g @modelcontextprotocol/inspector

# Launch inspector
mcp-inspector

# Connect to LegisMCP
# Transport: HTTP
# URL: https://mcp.example.com/mcp
```

### 2. Using Claude Desktop

Add to Claude's configuration:

```json
{
  "servers": {
    "legismcp": {
      "command": "http",
      "args": ["https://mcp.example.com/mcp"]
    }
  }
}
```

### 3. Using Cloudflare AI Playground

1. Navigate to https://playground.ai.cloudflare.com/
2. Click "Add MCP Server" in bottom left
3. Enter URL: `https://mcp.example.com/mcp`
4. Complete OAuth authentication
5. Start using tools

## SDK Integration

### JavaScript/TypeScript

```typescript
import { MCPClient } from '@modelcontextprotocol/sdk';

// Initialize client
const client = new MCPClient({
  transport: 'http',
  endpoint: 'https://mcp.example.com/mcp'
});

// Handle OAuth flow
client.on('consent_required', async (consent) => {
  console.log('Please authenticate:', consent.url);
  // Open browser for user authentication
  await open(consent.url);
});

// Connect to server
await client.connect();

// List available tools
const tools = await client.listTools();
console.log('Available tools:', tools);

// Call a tool
const result = await client.callTool('analyze-bill', {
  congress: 118,
  type: 'hr',
  number: 1
});

console.log('Bill analysis:', result);
```

### Python

```python
import asyncio
from mcp import MCPClient

async def main():
    # Initialize client
    client = MCPClient(
        transport='http',
        endpoint='https://mcp.example.com/mcp'
    )
    
    # Handle OAuth
    @client.on('consent_required')
    async def handle_consent(consent):
        print(f'Please authenticate: {consent.url}')
        # Open browser for authentication
        import webbrowser
        webbrowser.open(consent.url)
    
    # Connect
    await client.connect()
    
    # Use tools
    result = await client.call_tool('member-search', {
        'state': 'CA',
        'chamber': 'senate'
    })
    
    print('Senators from California:', result)

asyncio.run(main())
```

## Authentication Flow

### 1. Initial Connection

```http
GET https://mcp.example.com/mcp
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {
    "protocolVersion": "0.1.0",
    "capabilities": {}
  },
  "id": 1
}
```

### 2. Consent Response

```json
{
  "jsonrpc": "2.0",
  "result": {
    "consent": {
      "type": "oauth2",
      "url": "https://mcp.example.com/consent?client_id=...",
      "scopes": ["read:bills", "read:members", "read:votes", "read:committees"]
    }
  },
  "id": 1
}
```

### 3. Post-Authentication

After user completes OAuth flow:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "protocolVersion": "0.1.0",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "LegisMCP",
      "version": "1.0.0"
    }
  },
  "id": 1
}
```

## Tool Usage Examples

### List Available Tools

```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 2
}
```

Response:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "tools": [
      {
        "name": "analyze-bill",
        "description": "Comprehensive bill analysis",
        "inputSchema": {
          "type": "object",
          "properties": {
            "congress": { "type": "number" },
            "type": { "type": "string" },
            "number": { "type": "number" }
          },
          "required": ["congress", "type", "number"]
        }
      }
      // ... more tools
    ]
  },
  "id": 2
}
```

### Call a Tool

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "congress-query",
    "arguments": {
      "query": "healthcare bills introduced this week"
    }
  },
  "id": 3
}
```

## Custom Client Implementation

### Basic HTTP Client

```typescript
class LegisMCPClient {
  private sessionId?: string;
  private baseUrl = 'https://mcp.example.com';
  
  async connect(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.sessionId && { 'X-Session-ID': this.sessionId })
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        params: { protocolVersion: '0.1.0' },
        id: 1
      })
    });
    
    const result = await response.json();
    
    if (result.result.consent) {
      // Handle OAuth flow
      await this.handleOAuth(result.result.consent);
    }
  }
  
  private async handleOAuth(consent: any): Promise<void> {
    // Open browser for authentication
    window.open(consent.url, '_blank');
    
    // Poll for completion or use callback
    // Store session ID when complete
  }
  
  async callTool(name: string, args: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': this.sessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name, arguments: args },
        id: Date.now()
      })
    });
    
    const result = await response.json();
    return result.result;
  }
}
```

### WebSocket Client

```typescript
class LegisMCPWebSocket {
  private ws?: WebSocket;
  private messageHandlers = new Map();
  
  async connect(): Promise<void> {
    this.ws = new WebSocket('wss://mcp.example.com/ws');
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const handler = this.messageHandlers.get(message.id);
      if (handler) {
        handler(message);
        this.messageHandlers.delete(message.id);
      }
    };
    
    await this.waitForOpen();
    
    // Initialize
    await this.sendRequest('initialize', {
      protocolVersion: '0.1.0'
    });
  }
  
  private sendRequest(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = Date.now();
      
      this.messageHandlers.set(id, (response) => {
        if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve(response.result);
        }
      });
      
      this.ws!.send(JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id
      }));
    });
  }
}
```

## Error Handling

### MCP Error Format

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32603,
    "message": "Rate limit exceeded",
    "data": {
      "type": "RATE_LIMIT",
      "retryAfter": 3600
    }
  },
  "id": 1
}
```

### Error Codes

| Code | Type | Description |
|------|------|-------------|
| -32700 | Parse error | Invalid JSON |
| -32600 | Invalid request | Invalid request format |
| -32601 | Method not found | Unknown method |
| -32602 | Invalid params | Invalid parameters |
| -32603 | Internal error | Server error |
| -32000 | Authentication required | No valid session |
| -32001 | Insufficient scope | Missing required permissions |
| -32002 | Rate limit exceeded | Too many requests |

### Error Handling Example

```typescript
try {
  const result = await client.callTool('get-bill', params);
} catch (error) {
  if (error.code === -32000) {
    // Re-authenticate
    await client.reconnect();
  } else if (error.code === -32002) {
    // Rate limited - wait and retry
    await sleep(error.data.retryAfter * 1000);
    return retry();
  } else {
    console.error('Tool error:', error.message);
  }
}
```

## Best Practices

### 1. Session Management

```typescript
// Store session tokens securely
const storage = {
  setSession(id: string, data: any) {
    // Use secure storage in production
    localStorage.setItem(`mcp_session_${id}`, JSON.stringify(data));
  },
  
  getSession(id: string) {
    const data = localStorage.getItem(`mcp_session_${id}`);
    return data ? JSON.parse(data) : null;
  }
};
```

### 2. Request Batching

```typescript
// Batch multiple tool calls
const batchRequest = {
  jsonrpc: '2.0',
  method: 'batch',
  params: [
    { method: 'tools/call', params: { name: 'get-bill', arguments: {...} } },
    { method: 'tools/call', params: { name: 'member-details', arguments: {...} } }
  ],
  id: 1
};
```

### 3. Caching

```typescript
class CachedMCPClient extends MCPClient {
  private cache = new Map();
  
  async callTool(name: string, args: any): Promise<any> {
    const cacheKey = `${name}:${JSON.stringify(args)}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached.expires > Date.now()) {
        return cached.data;
      }
    }
    
    const result = await super.callTool(name, args);
    
    this.cache.set(cacheKey, {
      data: result,
      expires: Date.now() + 300000 // 5 minutes
    });
    
    return result;
  }
}
```

### 4. Retry Logic

```typescript
async function callWithRetry(
  fn: () => Promise<any>,
  maxRetries = 3,
  backoff = 1000
): Promise<any> {
  try {
    return await fn();
  } catch (error) {
    if (maxRetries > 0 && isRetryable(error)) {
      await sleep(backoff);
      return callWithRetry(fn, maxRetries - 1, backoff * 2);
    }
    throw error;
  }
}

function isRetryable(error: any): boolean {
  return [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND'
  ].includes(error.code) || error.status >= 500;
}
```

## Testing Integration

### Unit Testing

```typescript
import { MockMCPServer } from '@mcp/testing';

describe('LegisMCP Integration', () => {
  let server: MockMCPServer;
  let client: MCPClient;
  
  beforeEach(() => {
    server = new MockMCPServer();
    client = new MCPClient({ endpoint: server.url });
  });
  
  it('should analyze bills', async () => {
    server.mockTool('analyze-bill', {
      bill: { congress: 118, type: 'hr', number: 1 }
    });
    
    const result = await client.callTool('analyze-bill', {
      congress: 118,
      type: 'hr',
      number: 1
    });
    
    expect(result.bill).toBeDefined();
  });
});
```

### Integration Testing

```typescript
// Test against real server
const TEST_CONFIG = {
  endpoint: 'https://mcp-staging.legismcp.com/mcp',
  testToken: process.env.TEST_AUTH_TOKEN
};

describe('Live Integration', () => {
  it('should connect and list tools', async () => {
    const client = new MCPClient(TEST_CONFIG);
    await client.connect();
    
    const tools = await client.listTools();
    expect(tools.length).toBeGreaterThan(0);
  });
});
```

## Monitoring and Analytics

### Client-Side Metrics

```typescript
class MetricsMCPClient extends MCPClient {
  private metrics = {
    calls: 0,
    errors: 0,
    latency: []
  };
  
  async callTool(name: string, args: any): Promise<any> {
    const start = Date.now();
    this.metrics.calls++;
    
    try {
      const result = await super.callTool(name, args);
      this.metrics.latency.push(Date.now() - start);
      return result;
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      avgLatency: this.metrics.latency.reduce((a, b) => a + b, 0) / this.metrics.latency.length
    };
  }
}
```

### Server Communication

The server provides metrics through the `get-usage-stats` tool:

```typescript
const usage = await client.callTool('get-usage-stats', {
  period: 'month'
});

console.log('API calls used:', usage.api_calls.used);
console.log('Remaining:', usage.api_calls.remaining);
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check server URL
   - Verify network connectivity
   - Check CORS if browser-based

2. **Authentication Loops**
   - Clear stored sessions
   - Check OAuth callback handling
   - Verify client registration

3. **Tool Not Found**
   - List available tools first
   - Check tool name spelling
   - Verify required scopes

4. **Rate Limiting**
   - Implement exponential backoff
   - Cache responses
   - Check usage statistics

### Debug Mode

```typescript
// Enable debug logging
const client = new MCPClient({
  endpoint: 'https://mcp.example.com/mcp',
  debug: true,
  onRequest: (req) => console.log('Request:', req),
  onResponse: (res) => console.log('Response:', res)
});
```

## Support

- Documentation: https://docs.example.com
- GitHub Issues: https://github.com/yourusername/legismcp/issues
- Email: contact@example.com