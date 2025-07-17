import OAuthProvider, { type OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { Hono } from "hono";
import { authorize, callback, confirmConsent, tokenExchangeCallback } from "./auth";
import type { UserProps } from "./types";
import { registerTools } from "./tools/index.js";

export class AuthenticatedMCP extends McpAgent<Env, Record<string, never>, UserProps> {
	server = new McpServer({
		name: "LegislativeMCP",
		version: "2.0.0", // Updated version to reflect new capabilities
	}) as any; // Type assertion to fix compatibility issue

	async init() {
		// Register all tools using the modular system
		await registerTools(this.server, this.env, this.props);
	}
}

// Initialize the Hono app with the routes for the OAuth Provider.
const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>();
app.get("/authorize", authorize);
app.post("/authorize/consent", confirmConsent);
app.get("/callback", callback);

export default new OAuthProvider({
	// Use Streamable HTTP transport
	apiHandlers: {
		'/mcp': AuthenticatedMCP.serve('/mcp') as any, // Streamable HTTP transport
	},
	authorizeEndpoint: "/authorize",
	clientRegistrationEndpoint: "/register",
	defaultHandler: app as any,
	tokenEndpoint: "/token",
	tokenExchangeCallback,
});