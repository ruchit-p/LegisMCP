import { D1Database } from '@cloudflare/workers-types';

export interface SessionData {
  session_token: string;
  user_id: string;
  expires: string;
  user_data: any;
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  token_expires_at?: string;
  ip_address?: string;
  user_agent?: string;
  csrf_token?: string;
  preferences?: any;
  security_info?: any;
  created_at: string;
  updated_at: string;
  last_accessed: string;
}

export interface AccountData {
  id: string;
  user_id: string;
  type: string;
  provider: string;
  provider_account_id: string;
  refresh_token?: string;
  access_token?: string;
  expires_at?: number;
  id_token?: string;
  scope?: string;
  session_state?: string;
  token_type?: string;
  created_at: string;
  updated_at: string;
}

export interface VerificationTokenData {
  token: string;
  identifier: string;
  expires: string;
  created_at: string;
}

export class SessionService {
  constructor(private db: D1Database) {}

  // Session Management
  async createSession(sessionData: Omit<SessionData, 'created_at' | 'updated_at' | 'last_accessed'>): Promise<SessionData> {
    const now = new Date().toISOString();
    
    const result = await this.db
      .prepare(`
        INSERT INTO sessions (
          session_token, user_id, expires, user_data, access_token, refresh_token, 
          id_token, token_expires_at, ip_address, user_agent, csrf_token, 
          preferences, security_info, created_at, updated_at, last_accessed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING *
      `)
      .bind(
        sessionData.session_token,
        sessionData.user_id,
        sessionData.expires,
        JSON.stringify(sessionData.user_data),
        sessionData.access_token || null,
        sessionData.refresh_token || null,
        sessionData.id_token || null,
        sessionData.token_expires_at || null,
        sessionData.ip_address || null,
        sessionData.user_agent || null,
        sessionData.csrf_token || null,
        JSON.stringify(sessionData.preferences || {}),
        JSON.stringify(sessionData.security_info || {}),
        now,
        now,
        now
      )
      .first<SessionData>();

    if (!result) {
      throw new Error('Failed to create session');
    }

    // Parse JSON fields
    return {
      ...result,
      user_data: JSON.parse(result.user_data as string),
      preferences: JSON.parse(result.preferences as string),
      security_info: JSON.parse(result.security_info as string)
    };
  }

  async getSession(sessionToken: string): Promise<SessionData | null> {
    const result = await this.db
      .prepare('SELECT * FROM sessions WHERE session_token = ?')
      .bind(sessionToken)
      .first<SessionData>();

    if (!result) {
      return null;
    }

    // Parse JSON fields
    return {
      ...result,
      user_data: JSON.parse(result.user_data as string),
      preferences: JSON.parse(result.preferences as string),
      security_info: JSON.parse(result.security_info as string)
    };
  }

  async updateSession(sessionToken: string, updates: Partial<SessionData>): Promise<SessionData | null> {
    const existing = await this.getSession(sessionToken);
    if (!existing) {
      return null;
    }

    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.expires) {
      updateFields.push('expires = ?');
      values.push(updates.expires);
    }
    if (updates.user_data) {
      updateFields.push('user_data = ?');
      values.push(JSON.stringify(updates.user_data));
    }
    if (updates.access_token !== undefined) {
      updateFields.push('access_token = ?');
      values.push(updates.access_token);
    }
    if (updates.refresh_token !== undefined) {
      updateFields.push('refresh_token = ?');
      values.push(updates.refresh_token);
    }
    if (updates.id_token !== undefined) {
      updateFields.push('id_token = ?');
      values.push(updates.id_token);
    }
    if (updates.token_expires_at !== undefined) {
      updateFields.push('token_expires_at = ?');
      values.push(updates.token_expires_at);
    }
    if (updates.preferences) {
      updateFields.push('preferences = ?');
      values.push(JSON.stringify(updates.preferences));
    }
    if (updates.security_info) {
      updateFields.push('security_info = ?');
      values.push(JSON.stringify(updates.security_info));
    }

    updateFields.push('last_accessed = ?');
    values.push(new Date().toISOString());

    values.push(sessionToken);

    await this.db
      .prepare(`UPDATE sessions SET ${updateFields.join(', ')} WHERE session_token = ?`)
      .bind(...values)
      .run();

    return await this.getSession(sessionToken);
  }

  async deleteSession(sessionToken: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM sessions WHERE session_token = ?')
      .bind(sessionToken)
      .run();

    return result.success;
  }

  async getUserSessions(userId: string): Promise<SessionData[]> {
    const results = await this.db
      .prepare('SELECT * FROM sessions WHERE user_id = ? ORDER BY last_accessed DESC')
      .bind(userId)
      .all<SessionData>();

    return results.results.map(result => ({
      ...result,
      user_data: JSON.parse(result.user_data as string),
      preferences: JSON.parse(result.preferences as string),
      security_info: JSON.parse(result.security_info as string)
    }));
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.db
      .prepare('DELETE FROM sessions WHERE expires < CURRENT_TIMESTAMP')
      .run();

    return (result as any).changes || 0;
  }

  // Account Management (for OAuth connections)
  async createAccount(accountData: Omit<AccountData, 'created_at' | 'updated_at'>): Promise<AccountData> {
    const now = new Date().toISOString();
    
    const result = await this.db
      .prepare(`
        INSERT INTO accounts (
          id, user_id, type, provider, provider_account_id, refresh_token, 
          access_token, expires_at, id_token, scope, session_state, token_type,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING *
      `)
      .bind(
        accountData.id,
        accountData.user_id,
        accountData.type,
        accountData.provider,
        accountData.provider_account_id,
        accountData.refresh_token || null,
        accountData.access_token || null,
        accountData.expires_at || null,
        accountData.id_token || null,
        accountData.scope || null,
        accountData.session_state || null,
        accountData.token_type || null,
        now,
        now
      )
      .first<AccountData>();

    if (!result) {
      throw new Error('Failed to create account');
    }

    return result;
  }

  async getAccount(provider: string, providerAccountId: string): Promise<AccountData | null> {
    return await this.db
      .prepare('SELECT * FROM accounts WHERE provider = ? AND provider_account_id = ?')
      .bind(provider, providerAccountId)
      .first<AccountData>();
  }

  async getUserAccounts(userId: string): Promise<AccountData[]> {
    const results = await this.db
      .prepare('SELECT * FROM accounts WHERE user_id = ?')
      .bind(userId)
      .all<AccountData>();

    return results.results;
  }

  async updateAccount(accountId: string, updates: Partial<AccountData>): Promise<AccountData | null> {
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.refresh_token !== undefined) {
      updateFields.push('refresh_token = ?');
      values.push(updates.refresh_token);
    }
    if (updates.access_token !== undefined) {
      updateFields.push('access_token = ?');
      values.push(updates.access_token);
    }
    if (updates.expires_at !== undefined) {
      updateFields.push('expires_at = ?');
      values.push(updates.expires_at);
    }
    if (updates.id_token !== undefined) {
      updateFields.push('id_token = ?');
      values.push(updates.id_token);
    }
    if (updates.scope !== undefined) {
      updateFields.push('scope = ?');
      values.push(updates.scope);
    }
    if (updates.session_state !== undefined) {
      updateFields.push('session_state = ?');
      values.push(updates.session_state);
    }
    if (updates.token_type !== undefined) {
      updateFields.push('token_type = ?');
      values.push(updates.token_type);
    }

    if (updateFields.length === 0) {
      return await this.db
        .prepare('SELECT * FROM accounts WHERE id = ?')
        .bind(accountId)
        .first<AccountData>();
    }

    values.push(accountId);

    await this.db
      .prepare(`UPDATE accounts SET ${updateFields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return await this.db
      .prepare('SELECT * FROM accounts WHERE id = ?')
      .bind(accountId)
      .first<AccountData>();
  }

  async deleteAccount(provider: string, providerAccountId: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM accounts WHERE provider = ? AND provider_account_id = ?')
      .bind(provider, providerAccountId)
      .run();

    return result.success;
  }

  // Verification Token Management
  async createVerificationToken(tokenData: Omit<VerificationTokenData, 'created_at'>): Promise<VerificationTokenData> {
    const now = new Date().toISOString();
    
    const result = await this.db
      .prepare(`
        INSERT INTO verification_tokens (token, identifier, expires, created_at)
        VALUES (?, ?, ?, ?)
        RETURNING *
      `)
      .bind(tokenData.token, tokenData.identifier, tokenData.expires, now)
      .first<VerificationTokenData>();

    if (!result) {
      throw new Error('Failed to create verification token');
    }

    return result;
  }

  async getVerificationToken(token: string): Promise<VerificationTokenData | null> {
    return await this.db
      .prepare('SELECT * FROM verification_tokens WHERE token = ?')
      .bind(token)
      .first<VerificationTokenData>();
  }

  async deleteVerificationToken(token: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM verification_tokens WHERE token = ?')
      .bind(token)
      .run();

    return result.success;
  }

  async cleanupExpiredVerificationTokens(): Promise<number> {
    const result = await this.db
      .prepare('DELETE FROM verification_tokens WHERE expires < CURRENT_TIMESTAMP')
      .run();

    return (result as any).changes || 0;
  }
}