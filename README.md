# LegisMCP - Open-Source Legislative MCP Server

An open-source [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server that provides AI agents with real-time access to U.S. legislative data from [Congress.gov](https://congress.gov).

## Quick Start

A **Congress.gov API key is required**. Get a free one at [api.congress.gov/sign-up](https://api.congress.gov/sign-up/).

### Claude Desktop / Cursor / Windsurf

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "legismcp": {
      "command": "npx",
      "args": ["-y", "legismcp"],
      "env": {
        "CONGRESS_API_KEY": "your-api-key"
      }
    }
  }
}
```

That's it — no cloning or installing required.

### Remote Connection

Connect via the hosted endpoint — no local installation needed:

```json
{
  "mcpServers": {
    "legismcp": {
      "type": "http",
      "url": "https://mcp.legismcp.com/mcp",
      "headers": {
        "X-Congress-API-Key": "your-api-key"
      }
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `get-bill` | Get detailed information about a specific bill |
| `list-recent-bills` | List recent bills with filtering by congress, sort, and pagination |
| `analyze-bill` | Comprehensive analysis of a bill's content, impact, and implications |
| `trending-bills` | Get trending legislative activity by timeframe and category |
| `member-details` | Get details about a specific member of Congress by bioguide ID |
| `member-search` | Search for members by name, state, or party |
| `subresource` | Access bill sub-resources (actions, amendments, cosponsors, etc.) |

## Example Queries

Once connected, ask your AI agent:

- "What bills were introduced this week about healthcare?"
- "Show me the details of HR 1234 from the 118th Congress"
- "Who are the senators from California?"
- "What's trending in Congress right now?"
- "Analyze the CHIPS Act and its economic implications"

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CONGRESS_API_KEY` | **Yes** | Congress.gov API key ([get one free](https://api.congress.gov/sign-up/)) |

## Architecture

```
AI Agent <-> MCP Server <-> Congress.gov API
              (stdio)
```

- Runs as a local Node.js process, communicates via stdin/stdout
- Data source: [Congress.gov API](https://api.congress.gov/)

## License

MIT - See [LICENSE](../LICENSE)
