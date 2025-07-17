import { D1Database } from '@cloudflare/workers-types';

export interface AuthConfig {
  id: number;
  config_name: string;
  auth0_domain: string;
  auth0_client_id: string;
  auth0_audience: string | null;
  auth0_scope: string | null;
  allowed_callback_urls: string[];
  allowed_logout_urls: string[];
  allowed_origins: string[];
  is_active: boolean;
}

export class AuthConfigService {
  constructor(private db: D1Database) {}

  async getConfig(configName: string): Promise<AuthConfig | null> {
    const result = await this.db
      .prepare('SELECT * FROM auth_config WHERE config_name = ? AND is_active = 1')
      .bind(configName)
      .first<AuthConfig>();
    
    if (!result) return null;
    
    return {
      ...result,
      allowed_callback_urls: typeof result.allowed_callback_urls === 'string' 
        ? JSON.parse(result.allowed_callback_urls) 
        : result.allowed_callback_urls || [],
      allowed_logout_urls: typeof result.allowed_logout_urls === 'string' 
        ? JSON.parse(result.allowed_logout_urls) 
        : result.allowed_logout_urls || [],
      allowed_origins: typeof result.allowed_origins === 'string' 
        ? JSON.parse(result.allowed_origins) 
        : result.allowed_origins || []
    };
  }

  async getPublicConfig(configName: string): Promise<{
    auth0_domain: string;
    auth0_client_id: string;
    auth0_audience: string | null;
    auth0_scope: string | null;
  } | null> {
    const config = await this.getConfig(configName);
    if (!config) return null;
    
    // Return only public fields (no URLs that might contain sensitive info)
    return {
      auth0_domain: config.auth0_domain,
      auth0_client_id: config.auth0_client_id,
      auth0_audience: config.auth0_audience,
      auth0_scope: config.auth0_scope
    };
  }

  async validateClientSecret(configName: string, clientSecret: string): Promise<boolean> {
    // In production, you would validate the client secret here
    // For now, we'll check if it matches the expected format
    // The actual validation should happen against Auth0
    
    if (!clientSecret || clientSecret.length < 32) {
      return false;
    }
    
    const config = await this.getConfig(configName);
    return config !== null;
  }
}