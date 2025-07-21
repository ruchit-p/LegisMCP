// MARK: - Stripe Configuration
// Centralized Stripe plan configuration with type safety

export interface StripePlan {
  name: string;
  id: string;
  monthly: {
    priceId: string;
    amount: number;
  };
  yearly: {
    priceId: string;
    amount: number;
  };
  isEnterprise?: boolean;
  isFree?: boolean;
}

interface StripeConfig {
  plans: Record<string, StripePlan>;
  webhookEvents: string[];
}

// MARK: - Plan Configuration
export const STRIPE_CONFIG: StripeConfig = {
  plans: {
    free: {
      name: 'Free',
      id: 'free',
      isFree: true,
      monthly: {
        priceId: 'price_free',
        amount: 0
      },
      yearly: {
        priceId: 'price_free',
        amount: 0
      }
    },
    starter: {
      name: 'Developer',
      id: 'starter',
      monthly: {
        priceId: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID!,
        amount: 999 // $9.99
      },
      yearly: {
        priceId: process.env.STRIPE_STARTER_YEARLY_PRICE_ID!,
        amount: 799 // $7.99/month (20% off)
      }
    },
    professional: {
      name: 'Professional',
      id: 'professional',
      monthly: {
        priceId: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID!,
        amount: 2999 // $29.99
      },
      yearly: {
        priceId: process.env.STRIPE_PROFESSIONAL_YEARLY_PRICE_ID!,
        amount: 2399 // $23.99/month (20% off)
      }
    },
    enterprise: {
      name: 'Enterprise',
      id: 'enterprise',
      isEnterprise: true,
      monthly: {
        priceId: 'price_enterprise_contact_sales',
        amount: 0 // Contact sales
      },
      yearly: {
        priceId: 'price_enterprise_contact_sales',
        amount: 0 // Contact sales
      }
    }
  },
  webhookEvents: [
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_succeeded',
    'invoice.payment_failed'
  ]
};

// MARK: - Helper Functions

/**
 * Validate if a plan ID exists in configuration
 */
export function isValidPlan(planId: string): boolean {
  return planId in STRIPE_CONFIG.plans;
}

/**
 * Get plan configuration by ID
 */
export function getPlan(planId: string): StripePlan | null {
  return STRIPE_CONFIG.plans[planId] || null;
}

/**
 * Get price ID for a specific plan and billing frequency
 */
export function getPriceId(planId: string, billingFrequency: 'monthly' | 'yearly'): string | null {
  const plan = getPlan(planId);
  if (!plan) return null;
  
  return plan[billingFrequency].priceId;
}

/**
 * Validate billing frequency
 */
export function isValidBillingFrequency(frequency: string): frequency is 'monthly' | 'yearly' {
  return frequency === 'monthly' || frequency === 'yearly';
}

/**
 * Validate Stripe environment variables
 * Note: Enterprise plans use static price IDs since they're contact-sales only
 */
export function validateStripeConfig(): {
  isValid: boolean;
  missingVars: string[];
} {
  const requiredVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_STARTER_MONTHLY_PRICE_ID',
    'STRIPE_STARTER_YEARLY_PRICE_ID',
    'STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID',
    'STRIPE_PROFESSIONAL_YEARLY_PRICE_ID'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  return {
    isValid: missingVars.length === 0,
    missingVars
  };
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount / 100); // Convert cents to dollars
}

/**
 * Get all available plans
 */
export function getAllPlans(): StripePlan[] {
  return Object.values(STRIPE_CONFIG.plans);
}

/**
 * Get plans by type
 */
export function getPlansByType(type: 'paid' | 'free' | 'enterprise'): StripePlan[] {
  return getAllPlans().filter(plan => {
    switch (type) {
      case 'free':
        return plan.isFree;
      case 'enterprise':
        return plan.isEnterprise;
      case 'paid':
        return !plan.isFree && !plan.isEnterprise;
      default:
        return true;
    }
  });
} 