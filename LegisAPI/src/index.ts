import { Hono } from "hono";
import { cors } from "hono/cors";
import type { JWTHeaderParameters } from "jose";
import { jwt, requireScope } from "./middlewares/jwt";
import { analytics } from "./middlewares/analytics";
import { rateLimiters } from "./middlewares/rateLimiter";
import { CongressServiceV2 } from "./services/congress-v2";
import { UserService } from "./services/user";
import { ApiKeyService } from "./services/apikey";
import { HTTPException } from "./utils/http-exception";
import type { Env, JWTPayload } from "./types";
import { configRoutes } from "./routes/config";
import { adminRoutes } from "./routes/admin";
import { webhookRoutes } from "./routes/webhook";
import { mcpRoutes } from "./routes/mcp";
import { analyticsRoutes } from "./routes/analytics";
import alertsRoutes from "./routes/alerts";
import { monitoringRoutes } from "./routes/monitoring";
import { sessionRoutes } from "./routes/session";

const app = new Hono<{
	Bindings: Env;
	Variables: {
		jwtPayload: JWTPayload;
		jwtProtectedHeader: JWTHeaderParameters;
		user: any;
	};
}>();

app.use("*", cors());

// Apply general rate limiting to all routes
app.use("*", rateLimiters.general);

// Health check (no auth required)
app.get("/api/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// Health check alias (no auth required)
app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// Webhook routes (no auth required)
app.route('/api/webhooks', webhookRoutes);

// Public configuration routes (no auth required)
app.route('/api/config', configRoutes);

// Session routes (for Auth.js integration - no auth required)
app.route('/api/sessions', sessionRoutes);

// Apply JWT auth to all other routes
app.use("/api/*", async (c, next) => {
	return jwt({
		auth0_domain: c.env.AUTH0_DOMAIN,
		auth0_audience: c.env.AUTH0_AUDIENCE
	})(c, next);
});

// Apply authenticated rate limiting (higher limits for authenticated users)
app.use("/api/*", rateLimiters.authenticated);

app.post("/api/users/register", async (c) => {
	const claims = c.var.jwtPayload as JWTPayload;
	const userService = new UserService(c.env.DB);

	try {
		const user = await userService.findOrCreateUser(
			claims.sub!,
			claims.email as string,
			claims.name as string
		);
		return c.json({ user });
	} catch (error) {
		throw new HTTPException(500, { message: "Failed to register user" });
	}
});

app.use("/api/*", analytics());

app.get("/api/me", async (c) => {
	const user = c.get("user");
	const claims = c.var.jwtPayload as JWTPayload;
	const checkBillingCycle = c.req.query("check_billing_cycle") === "true";
	
	// Basic user info response
	const userInfo = {
		...claims,
		plan: user.plan,
		api_calls_count: user.api_calls_count,
		api_calls_limit: user.api_calls_limit,
		mcp_calls_count: user.mcp_calls_count || 0,
		mcp_calls_limit: user.mcp_calls_limit || user.api_calls_limit,
	};
	
	// If billing cycle check is requested, include billing cycle info
	if (checkBillingCycle) {
		const { BillingCycleService } = await import("./services/billing-cycle");
		const billingCycleService = new BillingCycleService(c.env.DB);
		
		// Check and reset usage if needed
		await billingCycleService.checkAndResetUsage(user.id);
		
		// Get current usage status
		const usageStatus = await billingCycleService.getUserUsageStatus(user.id);
		
		if (usageStatus) {
			(userInfo as any).mcp_calls_count = usageStatus.currentUsage;
			(userInfo as any).mcp_calls_limit = usageStatus.limit;
			(userInfo as any).billing_cycle_end = usageStatus.billingCycleEnd;
			(userInfo as any).days_until_reset = usageStatus.daysUntilReset;
			(userInfo as any).plan = usageStatus.planSlug;
			(userInfo as any).has_usage_left = usageStatus.hasUsageLeft;
			(userInfo as any).usage_percent = usageStatus.percentUsed;
		}
	}
	
	return c.json(userInfo);
});

// Scheduled task to reset usage for all users (can be called by cron)
app.post("/api/admin/reset-usage", async (c) => {
	// This endpoint should be secured with a special token/key
	const cronToken = c.req.header("x-cron-token");
	const expectedToken = (c.env as any).CRON_TOKEN || "default-cron-token";
	
	if (cronToken !== expectedToken) {
		return c.json({ error: "Unauthorized" }, 401);
	}
	
	const { BillingCycleService } = await import("./services/billing-cycle");
	const { MonitoringService } = await import("./services/monitoring");
	
	const billingCycleService = new BillingCycleService(c.env.DB, c.env.ANALYTICS);
	const monitoringService = new MonitoringService(c.env.DB, c.env.ANALYTICS);
	
	const resetCount = await billingCycleService.resetUsageForAllUsers();
	
	// Log the manual reset operation
	await monitoringService.logEvent({
		type: 'usage_reset',
		category: 'billing',
		action: 'manual_reset',
		value: resetCount,
		metadata: {
			resetCount,
			triggerType: 'cron_endpoint',
			timestamp: new Date().toISOString()
		}
	});
	
	return c.json({
		message: `Usage reset for ${resetCount} users`,
		resetCount,
		timestamp: new Date().toISOString()
	});
});

app.get("/api/usage", async (c) => {
	const user = c.get("user");
	const userService = new UserService(c.env.DB);
	const days = parseInt(c.req.query("days") || "30");

	const stats = await userService.getUsageStats(user.id, days);
	return c.json({ stats });
});

app.get("/api/user/profile", async (c) => {
	const user = c.get("user");
	
	try {
		// Get full user details including plan information
		const userDetails = await c.env.DB.prepare(`
			SELECT 
				u.*,
				p.name as plan_name,
				p.slug as plan_slug,
				p.billing_frequency,
				p.amount as plan_amount,
				p.mcp_calls_limit,
				CASE 
					WHEN p.mcp_calls_limit = -1 THEN 'Unlimited'
					WHEN u.api_calls_count >= p.mcp_calls_limit THEN 'Limit Reached'
					ELSE CAST(p.mcp_calls_limit - u.api_calls_count AS TEXT) || ' remaining'
				END as calls_remaining
			FROM users u
			LEFT JOIN plans p ON u.current_plan_id = p.id
			WHERE u.id = ?
		`).bind(user.id).first();

		if (!userDetails) {
			throw new HTTPException(404, { message: "User details not found" });
		}

		return c.json(userDetails);
	} catch (error) {
		console.error("Error fetching user profile:", error);
		throw new HTTPException(500, { message: "Failed to fetch user profile" });
	}
});

app.get("/api/bills", requireScope("read:bills"), async (c) => {
	console.log("Bills endpoint called");
	
	const congressService = new CongressServiceV2(c.env);
	const query = c.req.query("q") || c.req.query("query") || undefined;
	const limit = parseInt(c.req.query("limit") || "20");
	const offset = parseInt(c.req.query("offset") || "0");
	const congress = c.req.query("congress") ? parseInt(c.req.query("congress")!) : undefined;
	const billType = c.req.query("type") || undefined;

	// If query is provided, try to parse it as a bill identifier
	if (query) {
		const parsed = congressService.parseBillIdentifier(query, congress || 119);
		if (parsed) {
			try {
				// Try to get the specific bill
				const billCongress = parsed.congress || congress || 119;
				const bill = await congressService.getBill(billCongress, parsed.billType, parsed.billNumber);
				return c.json({ bills: [bill] });
			} catch (error) {
				console.warn('Failed to fetch specific bill:', error);
				// Fall through to list bills
			}
		} else {
			// Query is not a bill identifier
			console.warn('Text search not supported. Query will be ignored:', query);
		}
	}

	// Return bills based on filters
	if (congress) {
		const bills = await congressService.getBillsByCongress(congress, billType, limit, offset);
		return c.json({ bills });
	} else {
		// Return recent bills
		const bills = await congressService.getRecentBills(limit, offset);
		return c.json({ bills });
	}
});

app.get("/api/bills/:congress/:type/:number", requireScope("read:bills"), async (c) => {
	console.log("Get bill endpoint called");
	console.log("Environment check - CONGRESS_KEYS available:", !!c.env.CONGRESS_KEYS);
	
	const congressService = new CongressServiceV2(c.env);
	const { congress, type, number } = c.req.param();

	const bill = await congressService.getBill(
		parseInt(congress),
		type,
		parseInt(number)
	);
	return c.json({ bill });
});

// Sub-resource endpoints for bills
app.get("/api/bills/:congress/:type/:number/actions", requireScope("read:bills"), async (c) => {
	const congressService = new CongressServiceV2(c.env);
	const { congress, type, number } = c.req.param();
	
	try {
		const actions = await congressService.getBillActions(
			parseInt(congress),
			type,
			parseInt(number)
		);
		return c.json({ actions });
	} catch (error) {
		console.error("Error fetching bill actions:", error);
		throw new HTTPException(500, { message: "Failed to fetch bill actions" });
	}
});

app.get("/api/bills/:congress/:type/:number/text", requireScope("read:bills"), async (c) => {
	const congressService = new CongressServiceV2(c.env);
	const { congress, type, number } = c.req.param();
	
	try {
		const text = await congressService.getBillText(
			parseInt(congress),
			type,
			parseInt(number)
		);
		return c.json({ text });
	} catch (error) {
		console.error("Error fetching bill text:", error);
		throw new HTTPException(500, { message: "Failed to fetch bill text" });
	}
});

app.get("/api/bills/:congress/:type/:number/cosponsors", requireScope("read:bills"), async (c) => {
	const congressService = new CongressServiceV2(c.env);
	const { congress, type, number } = c.req.param();
	
	try {
		const cosponsors = await congressService.getBillCosponsors(
			parseInt(congress),
			type,
			parseInt(number)
		);
		return c.json({ cosponsors });
	} catch (error) {
		console.error("Error fetching bill cosponsors:", error);
		throw new HTTPException(500, { message: "Failed to fetch bill cosponsors" });
	}
});

app.get("/api/bills/:congress/:type/:number/committees", requireScope("read:bills"), async (c) => {
	const congressService = new CongressServiceV2(c.env);
	const { congress, type, number } = c.req.param();
	
	try {
		const committees = await congressService.getBillCommittees(
			parseInt(congress),
			type,
			parseInt(number)
		);
		return c.json({ committees });
	} catch (error) {
		console.error("Error fetching bill committees:", error);
		throw new HTTPException(500, { message: "Failed to fetch bill committees" });
	}
});

app.get("/api/bills/:congress/:type/:number/amendments", requireScope("read:bills"), async (c) => {
	const congressService = new CongressServiceV2(c.env);
	const { congress, type, number } = c.req.param();
	
	try {
		const amendments = await congressService.getBillAmendments(
			parseInt(congress),
			type,
			parseInt(number)
		);
		return c.json({ amendments });
	} catch (error) {
		console.error("Error fetching bill amendments:", error);
		throw new HTTPException(500, { message: "Failed to fetch bill amendments" });
	}
});

app.get("/api/bills/:congress/:type/:number/relatedbills", requireScope("read:bills"), async (c) => {
	const congressService = new CongressServiceV2(c.env);
	const { congress, type, number } = c.req.param();
	
	try {
		const relatedBills = await congressService.getBillRelatedBills(
			parseInt(congress),
			type,
			parseInt(number)
		);
		return c.json({ relatedBills });
	} catch (error) {
		console.error("Error fetching related bills:", error);
		throw new HTTPException(500, { message: "Failed to fetch related bills" });
	}
});

app.get("/api/bills/:congress/:type/:number/subjects", requireScope("read:bills"), async (c) => {
	const congressService = new CongressServiceV2(c.env);
	const { congress, type, number } = c.req.param();
	
	try {
		const subjects = await congressService.getBillSubjects(
			parseInt(congress),
			type,
			parseInt(number)
		);
		return c.json({ subjects });
	} catch (error) {
		console.error("Error fetching bill subjects:", error);
		throw new HTTPException(500, { message: "Failed to fetch bill subjects" });
	}
});

app.get("/api/bills/:congress/:type/:number/summaries", requireScope("read:bills"), async (c) => {
	const congressService = new CongressServiceV2(c.env);
	const { congress, type, number } = c.req.param();
	
	try {
		const summaries = await congressService.getBillSummaries(
			parseInt(congress),
			type,
			parseInt(number)
		);
		return c.json({ summaries });
	} catch (error) {
		console.error("Error fetching bill summaries:", error);
		throw new HTTPException(500, { message: "Failed to fetch bill summaries" });
	}
});

app.get("/api/members", requireScope("read:members"), async (c) => {
	const congressService = new CongressServiceV2(c.env);
	const chamber = c.req.query("chamber") as "house" | "senate" | undefined;
	const state = c.req.query("state");

	try {
		const members = await congressService.searchMembers(chamber, state);
		return c.json({ members });
	} catch (error) {
		throw new HTTPException(500, { message: "Failed to fetch members" });
	}
});

app.get("/api/members/:bioguideId", requireScope("read:members"), async (c) => {
	const congressService = new CongressServiceV2(c.env);
	const { bioguideId } = c.req.param();

	try {
		const member = await congressService.getMember(bioguideId);
		return c.json({ member });
	} catch (error) {
		throw new HTTPException(404, { message: "Member not found" });
	}
});

app.get("/api/votes/:chamber", requireScope("read:votes"), async (c) => {
	const congressService = new CongressServiceV2(c.env);
	const chamber = c.req.param("chamber") as "house" | "senate";
	const limit = parseInt(c.req.query("limit") || "20");

	try {
		const votes = await congressService.getRecentVotes(chamber, limit);
		// Return a message if no votes are available
		if (votes.length === 0) {
			return c.json({ 
				votes: [],
				message: "Vote data is currently limited in the Congress.gov API v3. Roll call votes are being added progressively starting with the 118th Congress (2023)."
			});
		}
		return c.json({ votes });
	} catch (error) {
		console.error("Error fetching votes:", error);
		throw new HTTPException(503, { 
			message: "Vote endpoints are currently in beta. Please check back later or use bill action votes instead." 
		});
	}
});

app.get("/api/committees", requireScope("read:committees"), async (c) => {
	const congressService = new CongressServiceV2(c.env);
	const chamber = c.req.query("chamber") as "house" | "senate" | "joint" | undefined;

	try {
		const committees = await congressService.getCommittees(chamber);
		return c.json({ committees });
	} catch (error) {
		throw new HTTPException(500, { message: "Failed to fetch committees" });
	}
});

// Admin endpoints for API key management
app.post("/api/admin/keys", requireScope("admin:keys"), async (c) => {
	const apiKeyService = new ApiKeyService(c.env);
	const body = await c.req.json<{ key: string }>();

	try {
		await apiKeyService.addApiKey(body.key);
		return c.json({ success: true });
	} catch (error) {
		throw new HTTPException(500, { message: "Failed to add API key" });
	}
});

app.get("/api/admin/keys", requireScope("admin:keys"), async (c) => {
	const apiKeyService = new ApiKeyService(c.env);

	try {
		const keys = await apiKeyService.getApiKeys();
		const stats = await apiKeyService.getApiKeyStats();
		return c.json({ keys: keys.map(k => k.substring(0, 8) + "..."), stats });
	} catch (error) {
		throw new HTTPException(500, { message: "Failed to fetch API keys" });
	}
});

app.delete("/api/admin/keys/:key", requireScope("admin:keys"), async (c) => {
	const apiKeyService = new ApiKeyService(c.env);
	const { key } = c.req.param();

	try {
		await apiKeyService.removeApiKey(key);
		return c.json({ success: true });
	} catch (error) {
		throw new HTTPException(500, { message: "Failed to remove API key" });
	}
});

// Admin routes (requires admin privileges)
app.route('/api/admin', adminRoutes);

// MCP routes (authenticated users)
app.route('/api/mcp', mcpRoutes);

// Analytics routes (authenticated users, some admin-only)
app.route('/api/analytics', analyticsRoutes);

// Alerts routes (authenticated users, some admin-only)
app.route('/api/alerts', alertsRoutes);

// Monitoring routes (admin-only)
app.route('/api/monitoring', monitoringRoutes);

app.onError((err, c) => {
	console.error("Error details:", err);
	console.error("Error stack:", err.stack);
	if (err instanceof HTTPException) {
		return c.json({ error: err.message }, err.status as any);
	}
	console.error("Unhandled error:", err);
	return c.json({ error: "Internal server error" }, 500 as any);
});

// Scheduled event handler for daily usage reset
export async function scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
	console.log('Running scheduled usage reset at:', new Date().toISOString());
	
	try {
		const { BillingCycleService } = await import("./services/billing-cycle");
		const { MonitoringService } = await import("./services/monitoring");
		
		const billingCycleService = new BillingCycleService(env.DB, env.ANALYTICS);
		const monitoringService = new MonitoringService(env.DB, env.ANALYTICS);
		
		// Reset usage for all users whose billing cycle has ended
		const resetCount = await billingCycleService.resetUsageForAllUsers();
		
		// Log the scheduled operation
		await monitoringService.logEvent({
			type: 'usage_reset',
			category: 'billing',
			action: 'scheduled_reset',
			value: resetCount,
			metadata: {
				resetCount,
				triggerType: 'scheduled_event',
				timestamp: new Date().toISOString()
			}
		});
		
		console.log(`Scheduled usage reset completed: ${resetCount} users reset`);
		
		// Return success response
		return new Response(JSON.stringify({
			success: true,
			message: `Usage reset for ${resetCount} users`,
			resetCount,
			timestamp: new Date().toISOString()
		}), {
			headers: { 'Content-Type': 'application/json' }
		});
		
	} catch (error) {
		console.error('Scheduled usage reset failed:', error);
		
		// Log error to monitoring
		const { MonitoringService } = await import("./services/monitoring");
		const monitoringService = new MonitoringService(env.DB, env.ANALYTICS);
		
		await monitoringService.logError('billing', 'scheduled_reset_failed', 
			error instanceof Error ? error : new Error('Unknown error'), undefined, {
			triggerType: 'scheduled_event',
			timestamp: new Date().toISOString()
		});
		
		return new Response(JSON.stringify({
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
			timestamp: new Date().toISOString()
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

export default {
	fetch: app.fetch,
	scheduled
};