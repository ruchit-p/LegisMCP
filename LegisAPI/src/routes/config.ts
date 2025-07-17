import { Hono } from 'hono';
import { PlansService } from '../services/plans';
import { AuthConfigService } from '../services/auth-config';
import type { Env } from '../types';

export const configRoutes = new Hono<{ Bindings: Env }>();

// Get all active plans
configRoutes.get('/plans', async (c) => {
  try {
    const plansService = new PlansService(c.env.DB);
    const plans = await plansService.getPlansForDisplay();
    
    return c.json({
      success: true,
      plans
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return c.json({ error: 'Failed to fetch plans' }, 500);
  }
});

// Get Auth0 configuration (public fields only)
configRoutes.post('/auth/config', async (c) => {
  try {
    const { clientSecret } = await c.req.json();
    
    if (!clientSecret) {
      return c.json({ error: 'Client secret is required' }, 400);
    }
    
    const authConfigService = new AuthConfigService(c.env.DB);
    
    // Validate client secret
    const isValid = await authConfigService.validateClientSecret('frontend', clientSecret);
    if (!isValid) {
      return c.json({ error: 'Invalid client secret' }, 401);
    }
    
    // Get public configuration
    const config = await authConfigService.getPublicConfig('frontend');
    if (!config) {
      return c.json({ error: 'Configuration not found' }, 404);
    }
    
    return c.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Error fetching auth config:', error);
    return c.json({ error: 'Failed to fetch configuration' }, 500);
  }
});

// Get plan details by slug
configRoutes.get('/plans/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    const plansService = new PlansService(c.env.DB);
    const plan = await plansService.getPlanBySlug(slug);
    
    if (!plan) {
      return c.json({ error: 'Plan not found' }, 404);
    }
    
    return c.json({
      success: true,
      plan
    });
  } catch (error) {
    console.error('Error fetching plan:', error);
    return c.json({ error: 'Failed to fetch plan' }, 500);
  }
});