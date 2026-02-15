#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools/index.js";
import { CongressApiService } from "./services/CongressApiService.js";

async function main() {
  const apiKey = process.env.CONGRESS_API_KEY;

  if (!apiKey) {
    console.error(
      "Error: CONGRESS_API_KEY environment variable is required.\n\n" +
      "Get a free API key at: https://api.congress.gov/sign-up/\n\n" +
      "Then set it in your MCP client configuration:\n" +
      '  "env": { "CONGRESS_API_KEY": "your-key-here" }\n\n' +
      "Or run directly:\n" +
      "  CONGRESS_API_KEY=your-key npx legismcp"
    );
    process.exit(1);
  }

  const congressApi = new CongressApiService(undefined, apiKey);

  const server = new McpServer({
    name: "LegislativeMCP",
    version: "3.0.0",
  });

  registerTools(server, congressApi);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    await server.close();
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
