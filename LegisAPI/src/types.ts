// The Env interface is now generated in worker-configuration.d.ts
// and is available globally, no need to redefine it here

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