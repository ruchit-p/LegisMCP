import { D1Database } from '@cloudflare/workers-types';

export interface User {
  id: number;
  auth0_user_id: string;
  email: string;
  name: string | null;
  plan: 'free' | 'developer' | 'professional' | 'enterprise';
  api_calls_count: number;
  api_calls_limit: number;
  created_at: string;
  updated_at: string;
}

export class UserService {
  constructor(private db: D1Database) {}

  async findOrCreateUser(auth0UserId: string, email: string, name?: string): Promise<User> {
    const existingUser = await this.db
      .prepare('SELECT * FROM users WHERE auth0_user_id = ?')
      .bind(auth0UserId)
      .first<User>();

    if (existingUser) {
      return existingUser;
    }

    const result = await this.db
      .prepare(
        'INSERT INTO users (auth0_user_id, email, name) VALUES (?, ?, ?) RETURNING *'
      )
      .bind(auth0UserId, email, name || null)
      .first<User>();

    if (!result) {
      throw new Error('Failed to create user');
    }

    return result;
  }

  async getUserById(userId: number): Promise<User | null> {
    return await this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first<User>();
  }

  async getUserByAuth0Id(auth0UserId: string): Promise<User | null> {
    return await this.db
      .prepare('SELECT * FROM users WHERE auth0_user_id = ?')
      .bind(auth0UserId)
      .first<User>();
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | null> {
    return await this.db
      .prepare('SELECT * FROM users WHERE stripe_customer_id = ?')
      .bind(stripeCustomerId)
      .first<User>();
  }

  async checkApiLimit(userId: number): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user) return false;

    // For unlimited plans (enterprise), api_calls_limit is -1
    if (user.api_calls_limit === -1) return true;
    
    return user.api_calls_count < user.api_calls_limit;
  }

  async incrementApiCalls(userId: number): Promise<void> {
    await this.db
      .prepare('UPDATE users SET api_calls_count = api_calls_count + 1 WHERE id = ?')
      .bind(userId)
      .run();
  }

  async recordApiUsage(
    userId: number,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTimeMs: number
  ): Promise<void> {
    // Log the values to debug the D1_TYPE_ERROR
    console.log('recordApiUsage called with:', {
      userId,
      endpoint,
      method,
      statusCode,
      responseTimeMs,
      types: {
        userId: typeof userId,
        endpoint: typeof endpoint,
        method: typeof method,
        statusCode: typeof statusCode,
        responseTimeMs: typeof responseTimeMs
      }
    });

    // Ensure all values are defined
    if (userId === undefined || userId === null) {
      throw new Error('userId is undefined or null');
    }
    if (endpoint === undefined || endpoint === null) {
      throw new Error('endpoint is undefined or null');
    }
    if (method === undefined || method === null) {
      throw new Error('method is undefined or null');
    }

    await this.db
      .prepare(
        'INSERT INTO api_usage (user_id, endpoint, method, status_code, response_time_ms) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(userId, endpoint, method, statusCode || null, responseTimeMs || null)
      .run();

    await this.incrementApiCalls(userId);
  }

  async getUsageStats(userId: number, days: number = 30): Promise<any> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const stats = await this.db
      .prepare(
        `SELECT 
          COUNT(*) as total_calls,
          AVG(response_time_ms) as avg_response_time,
          endpoint,
          method
        FROM api_usage 
        WHERE user_id = ? AND timestamp >= ?
        GROUP BY endpoint, method
        ORDER BY total_calls DESC`
      )
      .bind(userId, since.toISOString())
      .all();

    return stats.results;
  }

  async updateUserPlan(userId: number, plan: 'free' | 'developer' | 'professional' | 'enterprise'): Promise<void> {
    const limits = {
      free: 100,
      developer: 1000,
      professional: 10000,
      enterprise: -1 // unlimited
    };

    await this.db
      .prepare('UPDATE users SET plan = ?, api_calls_limit = ? WHERE id = ?')
      .bind(plan, limits[plan], userId)
      .run();
  }
}