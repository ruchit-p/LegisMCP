import { D1Database } from '@cloudflare/workers-types';

export interface Plan {
  id: number;
  name: string;
  slug: string;
  billing_frequency: 'monthly' | 'yearly' | 'one_time';
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  amount: number;
  currency: string;
  features: string[];
  highlighted_features: string[];
  description: string;
  is_active: boolean;
  display_order: number;
  mcp_calls_limit: number;
}

export class PlansService {
  constructor(private db: D1Database) {}

  async getAllPlans(activeOnly = true): Promise<Plan[]> {
    const query = activeOnly
      ? 'SELECT * FROM plans WHERE is_active = 1 ORDER BY display_order'
      : 'SELECT * FROM plans ORDER BY display_order';
    
    const result = await this.db.prepare(query).all<Plan>();
    
    // Parse JSON fields
    return result.results.map(plan => ({
      ...plan,
      features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features,
      highlighted_features: typeof plan.highlighted_features === 'string' 
        ? JSON.parse(plan.highlighted_features) 
        : plan.highlighted_features || []
    }));
  }

  async getPlanBySlug(slug: string): Promise<Plan | null> {
    const result = await this.db
      .prepare('SELECT * FROM plans WHERE slug = ? AND is_active = 1')
      .bind(slug)
      .first<Plan>();
    
    if (!result) return null;
    
    return {
      ...result,
      features: typeof result.features === 'string' ? JSON.parse(result.features) : result.features,
      highlighted_features: typeof result.highlighted_features === 'string' 
        ? JSON.parse(result.highlighted_features) 
        : result.highlighted_features || []
    };
  }

  async getPlanById(id: number): Promise<Plan | null> {
    const result = await this.db
      .prepare('SELECT * FROM plans WHERE id = ?')
      .bind(id)
      .first<Plan>();
    
    if (!result) return null;
    
    return {
      ...result,
      features: typeof result.features === 'string' ? JSON.parse(result.features) : result.features,
      highlighted_features: typeof result.highlighted_features === 'string' 
        ? JSON.parse(result.highlighted_features) 
        : result.highlighted_features || []
    };
  }

  async getPlanByStripePrice(stripePriceId: string): Promise<Plan | null> {
    const result = await this.db
      .prepare('SELECT * FROM plans WHERE stripe_price_id = ? AND is_active = 1')
      .bind(stripePriceId)
      .first<Plan>();
    
    if (!result) return null;
    
    return {
      ...result,
      features: typeof result.features === 'string' ? JSON.parse(result.features) : result.features,
      highlighted_features: typeof result.highlighted_features === 'string' 
        ? JSON.parse(result.highlighted_features) 
        : result.highlighted_features || []
    };
  }

  async getPlansForDisplay(): Promise<{
    monthly: Plan[];
    yearly: Plan[];
  }> {
    const allPlans = await this.getAllPlans();
    
    return {
      monthly: allPlans.filter(p => p.billing_frequency === 'monthly' || p.billing_frequency === 'one_time'),
      yearly: allPlans.filter(p => p.billing_frequency === 'yearly')
    };
  }
}