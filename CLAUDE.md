# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LegisMCP Server is an open-source MCP (Model Context Protocol) server that provides AI agents with real-time access to U.S. legislative data from Congress.gov. A Congress.gov API key is required for all usage.

**Two transport modes:**
- **stdio** — Local via `npx legismcp` or `node dist/stdio.js`
- **Streamable HTTP** — Remote via Cloudflare Worker at `/mcp`

## Project Structure

```
src/
  index.ts              # Cloudflare Worker entry + LegislativeMCP Durable Object + API key hashing
  stdio.ts              # Node.js stdio entry point (validates API key on startup)
  types.ts              # Env interface (includes D1 binding)
  tools/
    index.ts            # registerTools(server, congressApi)
    bills/              # getBill, listRecentBills
    analysis/           # billAnalysisTool, enhancedBillAnalysisTool
    trending/           # trendingBillsTool
    members/            # memberDetails, memberSearch
    subresource/        # subresourceTool
  services/
    CongressApiService.ts  # Congress.gov API client with rate limiting
    RateLimitService.ts    # Rate limiter
bin/
  legis-mcp.js          # npm CLI entry point (shebang)
migrations/
  001_api_keys.sql      # D1 table for API key hash tracking
```

## Development Commands

```bash
npm run dev              # Start Cloudflare Worker dev server (port 8788)
npm run build            # Build Node.js stdio version (tsc -p tsconfig.build.json)
npm run start:stdio      # Run stdio transport locally
npm run deploy           # Deploy to Cloudflare Workers
npm run type-check       # Generate CF types + TypeScript check
npm run cf-typegen       # Generate Cloudflare Workers types
```

## Environment Variables

Required:
- `CONGRESS_API_KEY` — Congress.gov API key (get one free at https://api.congress.gov/sign-up/)

For local dev, create `.dev.vars`:
```
CONGRESS_API_KEY=your-key-here
```

## Architecture

```
AI Agent -> MCP Server -> Congress.gov API
               |
          D1 (key hashes)
```

- `LegislativeMCP` extends `McpAgent<Env>` (Durable Object for Cloudflare)
- `registerTools(server, congressApi)` registers all 7 tools
- `CongressApiService` handles all Congress.gov API calls with built-in rate limiting
- **stdio**: Exits with error if `CONGRESS_API_KEY` env var is missing
- **HTTP**: Returns 401 if `X-Congress-API-Key` header is missing; hashes key (SHA-256) and upserts into D1 `api_keys` table

### MCP Tools
| Tool | Description |
|------|-------------|
| `analyze-bill` | Fetch comprehensive bill data from multiple endpoints |
| `list-recent-bills` | List recent bills with filtering |
| `get-bill` | Get detailed bill information |
| `trending-bills` | List recently active bills with sub-resource data |
| `member-details` | Get member info with sponsored/cosponsored legislation |
| `member-search` | Search for members with filtering |
| `subresource` | Access sub-resources (actions, amendments, cosponsors, etc.) |

## Build Configs

- `tsconfig.json` — Cloudflare Worker (used by wrangler)
- `tsconfig.build.json` — Node.js stdio build (outDir: dist, module: node16)

## Cloudflare Resources

- **Durable Objects**: `LegislativeMCP` (class) -> `MCP_OBJECT` (binding)
- **D1 Database**: `legis-db` -> `LEGIS_DB` (binding)
- **AI Binding**: Available as `AI` in env
- Dev port: 8788

## Adding a New Tool

1. Create handler file in `src/tools/<category>/`
2. Export: `TOOL_NAME`, `TOOL_DESCRIPTION`, `TOOL_PARAMS`, `handleToolName`
3. Import and register in `src/tools/index.ts`
4. Tool handler signature: `(args: any, congressApi: CongressApiService) => Promise<Result>`
