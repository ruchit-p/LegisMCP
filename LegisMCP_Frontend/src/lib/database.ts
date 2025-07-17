// Database connection utility for accessing LegisAPI database
// This is a simplified version - in production, you'd use a proper database client

export interface User {
  id: number;
  auth0_user_id: string;
  email: string;
  name?: string;
  role: 'user' | 'admin' | 'super_admin';
  plan: 'free' | 'developer' | 'professional' | 'enterprise';
  api_calls_count: number;
  api_calls_limit: number;
  created_at: string;
  updated_at: string;
}

export interface DatabaseResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class DatabaseClient {
  private baseUrl: string;

  constructor() {
    // In production, this would be your LegisAPI endpoint
    this.baseUrl = process.env.LEGIS_API_URL || 'http://localhost:8789';
  }

  async getUserByAuth0Id(auth0UserId: string): Promise<DatabaseResponse<User>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/users/${auth0UserId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.LEGIS_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Database error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getUserByEmail(email: string): Promise<DatabaseResponse<User>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/users/email/${encodeURIComponent(email)}`, {
        headers: {
          'Authorization': `Bearer ${process.env.LEGIS_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Database error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async createUser(userData: Partial<User>): Promise<DatabaseResponse<User>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.LEGIS_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Database error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async updateUserRole(userId: string, role: 'user' | 'admin' | 'super_admin'): Promise<DatabaseResponse<User>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${process.env.LEGIS_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Database error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const db = new DatabaseClient();