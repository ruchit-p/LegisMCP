import type { Env } from '../../worker-configuration';

export class ApiKeyService {
  constructor(private env: Env) {}

  async getApiKeys(): Promise<string[]> {
    try {
      const apiKeysJson = await this.env.CONGRESS_KEYS.get('api_keys');
      if (!apiKeysJson) {
        console.log('No API keys found in KV storage');
        return [];
      }
      
      try {
        const apiKeys = JSON.parse(apiKeysJson) as string[];
        if (!Array.isArray(apiKeys)) {
          console.error('API keys data is not an array:', typeof apiKeys);
          return [];
        }
        return apiKeys;
      } catch (parseError) {
        console.error('Error parsing API keys JSON:', parseError);
        console.error('Invalid JSON content:', apiKeysJson);
        return [];
      }
    } catch (kvError) {
      console.error('Error accessing KV storage in getApiKeys:', kvError);
      return [];
    }
  }

  async addApiKey(key: string): Promise<void> {
    try {
      const apiKeys = await this.getApiKeys();
      if (!apiKeys.includes(key)) {
        apiKeys.push(key);
        try {
          await this.env.CONGRESS_KEYS.put('api_keys', JSON.stringify(apiKeys));
          console.log('Successfully added API key to KV storage');
        } catch (putError) {
          console.error('Error storing API keys to KV:', putError);
          throw new Error(`Failed to store API key: ${putError instanceof Error ? putError.message : 'Unknown error'}`);
        }
      } else {
        console.log('API key already exists, skipping addition');
      }
    } catch (error) {
      console.error('Error in addApiKey:', error);
      throw error;
    }
  }

  async removeApiKey(key: string): Promise<void> {
    try {
      const apiKeys = await this.getApiKeys();
      const filtered = apiKeys.filter(k => k !== key);
      
      if (filtered.length === apiKeys.length) {
        console.log('API key not found, nothing to remove');
        return;
      }
      
      try {
        await this.env.CONGRESS_KEYS.put('api_keys', JSON.stringify(filtered));
        console.log('Successfully removed API key from KV storage');
      } catch (putError) {
        console.error('Error updating API keys in KV:', putError);
        throw new Error(`Failed to remove API key: ${putError instanceof Error ? putError.message : 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error in removeApiKey:', error);
      throw error;
    }
  }

  async rotateApiKeys(keys: string[]): Promise<void> {
    try {
      if (!Array.isArray(keys)) {
        throw new Error('Keys parameter must be an array');
      }
      
      await this.env.CONGRESS_KEYS.put('api_keys', JSON.stringify(keys));
      console.log(`Successfully rotated API keys (${keys.length} keys)`);
    } catch (error) {
      console.error('Error in rotateApiKeys:', error);
      throw new Error(`Failed to rotate API keys: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getApiKeyStats(): Promise<any> {
    try {
      const stats = await this.env.CONGRESS_KEYS.get('api_key_stats');
      if (!stats) {
        console.log('No API key stats found in KV storage');
        return {};
      }
      
      try {
        const parsedStats = JSON.parse(stats);
        return parsedStats;
      } catch (parseError) {
        console.error('Error parsing API key stats JSON:', parseError);
        console.error('Invalid JSON content:', stats);
        return {};
      }
    } catch (kvError) {
      console.error('Error accessing KV storage for API key stats:', kvError);
      return {};
    }
  }

  async updateApiKeyStats(key: string, used: boolean): Promise<void> {
    try {
      const stats = await this.getApiKeyStats();
      
      if (!stats[key]) {
        stats[key] = { usage: 0, lastUsed: null, errors: 0 };
      }
      
      if (used) {
        stats[key].usage++;
        stats[key].lastUsed = new Date().toISOString();
      } else {
        stats[key].errors++;
      }
      
      try {
        await this.env.CONGRESS_KEYS.put('api_key_stats', JSON.stringify(stats));
        console.log(`Successfully updated stats for API key: ${key.substring(0, 8)}...`);
      } catch (putError) {
        console.error('Error storing API key stats to KV:', putError);
        throw new Error(`Failed to update API key stats: ${putError instanceof Error ? putError.message : 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error in updateApiKeyStats:', error);
      throw error;
    }
  }
}