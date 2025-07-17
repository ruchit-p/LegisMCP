import type { D1Database, AnalyticsEngineDataset, KVNamespace } from '@cloudflare/workers-types';

export interface Env {
    AUTH0_DOMAIN: string;
    AUTH0_AUDIENCE: string;
    DB: D1Database;
    ANALYTICS: AnalyticsEngineDataset;
    CONGRESS_API_KEY?: string;
    CONGRESS_KEYS: KVNamespace;
    STRIPE_WEBHOOK_SECRET: string;
    STRIPE_API_KEY: string;
}

export interface JWTPayload {
    sub: string;
    email?: string;
    name?: string;
    aud?: string | string[];
    iss?: string;
    exp?: number;
    iat?: number;
    scope?: string;
}