import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpHandler } from "agents/mcp";
import type { Env } from "./types";
import { registerTools } from "./tools/index.js";
import { CongressApiService } from "./services/CongressApiService.js";

/**
 * Creates a fresh McpServer with tools registered for the given API key.
 * A new server is created per request to prevent response leakage between clients.
 */
function createServer(apiKey: string): McpServer {
	const server = new McpServer({
		name: "LegislativeMCPv3",
		version: "3.0.0",
	});
	const congressApi = new CongressApiService(undefined, apiKey);
	registerTools(server, congressApi);
	return server;
}

async function hashApiKey(key: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(key);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function encryptApiKey(
	key: string,
	encryptionKey: string
): Promise<string> {
	const encoder = new TextEncoder();
	// Derive a 256-bit key from the encryption key string
	const rawKey = await crypto.subtle.digest(
		"SHA-256",
		encoder.encode(encryptionKey)
	);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		rawKey,
		{ name: "AES-GCM" },
		false,
		["encrypt"]
	);
	const ciphertext = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		cryptoKey,
		encoder.encode(key)
	);
	const ivB64 = btoa(String.fromCharCode(...iv));
	const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
	return `${ivB64}:${ctB64}`;
}

const CORS_OPTIONS = {
	origin: "*",
	methods: "GET, POST, OPTIONS, DELETE",
	headers: "Content-Type, Accept, X-Congress-API-Key, mcp-session-id",
};

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		const url = new URL(request.url);

		// Non-MCP routes → info JSON
		if (url.pathname !== "/mcp") {
			return new Response(
				JSON.stringify({
					name: "LegislativeMCPv3",
					version: "3.0.0",
					description:
						"Open-source MCP server for U.S. legislative data from Congress.gov",
					endpoints: { mcp: "/mcp" },
					headers: {
						"X-Congress-API-Key":
							"Required. Your Congress.gov API key (get one free at https://api.congress.gov/sign-up/).",
					},
					source: "https://github.com/ruchit-p/LegisMCP",
				}),
				{ headers: { "Content-Type": "application/json" } }
			);
		}

		// OPTIONS /mcp → CORS preflight (no key check — browsers don't send custom headers in preflights)
		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: {
					"Access-Control-Allow-Origin": CORS_OPTIONS.origin,
					"Access-Control-Allow-Methods": CORS_OPTIONS.methods,
					"Access-Control-Allow-Headers": CORS_OPTIONS.headers,
				},
			});
		}

		// POST /mcp → require API key
		if (request.method === "POST") {
			const apiKey = request.headers.get("X-Congress-API-Key");

			if (!apiKey) {
				return new Response(
					JSON.stringify({
						error: "Missing X-Congress-API-Key header",
						message:
							"A Congress.gov API key is required. Get a free key at https://api.congress.gov/sign-up/",
					}),
					{
						status: 401,
						headers: { "Content-Type": "application/json" },
					}
				);
			}

			// Hash + encrypt key, upsert to D1 (non-blocking)
			try {
				const keyHash = await hashApiKey(apiKey);
				const encryptedKey = env.ENCRYPTION_KEY
					? await encryptApiKey(apiKey, env.ENCRYPTION_KEY)
					: "";
				await env.LEGIS_DB.prepare(
					`INSERT INTO api_keys (key_hash, encrypted_key) VALUES (?, ?)
					 ON CONFLICT(key_hash) DO UPDATE SET last_used = datetime('now'), encrypted_key = ?`
				)
					.bind(keyHash, encryptedKey, encryptedKey)
					.run();
			} catch {
				// Non-blocking: don't fail the request if D1 is unavailable
			}

			const server = createServer(apiKey);
			const handler = createMcpHandler(server, {
				corsOptions: CORS_OPTIONS,
			});
			return handler(request, env, ctx);
		}

		// All other methods on /mcp → pass to handler (returns 405 for GET/DELETE in stateless mode)
		const server = createServer(env.CONGRESS_API_KEY || "");
		const handler = createMcpHandler(server, {
			corsOptions: CORS_OPTIONS,
		});
		return handler(request, env, ctx);
	},
};
