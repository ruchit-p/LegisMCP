'use client';

import { useState } from 'react';
import { Check, Loader2, Star, Zap, Shield, Building, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/stripe-config';

const tiers = [
  {
    name: 'Free',
    id: 'free',
    price: { monthly: 0, yearly: 0 },
    description: 'Get started with 100 free MCP calls. No credit card required.',
    features: [
      '100 MCP calls (one-time)',
      'All Legislative tools',
      'Standard rate limiting',
      'Community support',
      'No expiration'
    ],
    highlighted: ['100 MCP calls (one-time)'],
    mostPopular: false,
    icon: Gift,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    isFree: true,
  },
  {
    name: 'Starter',
    id: 'starter',
    price: { monthly: 9.99, yearly: 7.99 },
    description: 'Perfect for getting real-time legislative data and building applications.',
    features: [
      '1,000 MCP calls per month',
      'Standard rate limiting',
      'All Legislative tools',
      'Email support',
      'Community access'
    ],
    highlighted: [],
    mostPopular: false,
    icon: Zap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    name: 'Professional',
    id: 'professional',
    price: { monthly: 29.99, yearly: 23.99 },
    description: 'Enhanced access for production applications and teams.',
    features: [
      '10,000 MCP calls per month',
      'Priority rate limiting',
      'All Legislative tools',
      'Advanced bill analysis',
      'Priority support',
      'Team collaboration'
    ],
    highlighted: ['All Legislative tools', 'Advanced bill analysis'],
    mostPopular: true,
    icon: Shield,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  {
    name: 'Enterprise',
    id: 'enterprise',
    price: { monthly: 0, yearly: 0 },
    description: 'Unlimited access for mission-critical applications.',
    features: [
      'Unlimited MCP calls',
      'No rate limiting',
      'Premium tools & features',
      'Real-time data feeds',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee'
    ],
    highlighted: ['Unlimited MCP calls', 'Custom integrations', 'SLA guarantee'],
    mostPopular: false,
    icon: Building,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    isEnterprise: true,
  },
];

export function PricingSection() {
  const [billingFrequency, setBillingFrequency] = useState<'monthly' | 'yearly'>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { user } = useUser();
  const router = useRouter();

  const handlePlanSelect = async (planId: string) => {
    // Handle enterprise plan differently
    if (planId === 'enterprise') {
      router.push('/contact/enterprise');
      return;
    }

    // Handle free plan
    if (planId === 'free') {
      if (!user) {
        // Redirect to signup for free plan
        router.push('/api/auth/login?screen_hint=signup');
      } else {
        // User already has account, redirect to dashboard
        router.push('/dashboard');
      }
      return;
    }

    if (!user) {
      // Redirect to login if not authenticated
      router.push('/api/auth/login?screen_hint=signup');
      return;
    }

    setLoadingPlan(planId);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          billingFrequency,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Sorry, there was an error processing your request. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <section id="pricing" className="py-24 sm:py-32 bg-gradient-to-b from-background to-muted/30">
      <div className="container">
        {/* Header */}
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary mb-6">
            <Star className="h-4 w-4" />
            Transparent Pricing
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Simple, transparent pricing for every team
          </h2>
          <p className="mt-6 text-xl leading-8 text-muted-foreground max-w-3xl mx-auto">
            Start with 100 free MCP calls, then choose the perfect plan for your Legislative AI applications. 
            All plans include access to our enterprise-grade MCP server.
          </p>
        </div>

        {/* Billing Frequency Toggle */}
        <div className="mx-auto mt-16 flex max-w-md items-center justify-center">
          <div className="relative flex bg-muted/50 backdrop-blur-sm rounded-2xl p-2 border border-border/50">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setBillingFrequency('monthly')}
                className={`relative px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  billingFrequency === 'monthly'
                    ? 'bg-background text-foreground shadow-lg shadow-primary/20 border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingFrequency('yearly')}
                className={`relative px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 ${
                  billingFrequency === 'yearly'
                    ? 'bg-background text-foreground shadow-lg shadow-primary/20 border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Yearly
                <span className="hidden sm:inline-flex items-center rounded-full bg-gradient-to-r from-green-500 to-emerald-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mx-auto mt-16 grid max-w-7xl grid-cols-1 items-stretch gap-8 lg:grid-cols-4 lg:gap-6 xl:gap-8">
          {tiers.map((tier) => {


            const isLoading = loadingPlan === tier.id;
            const Icon = tier.icon;

            return (
              <div
                key={tier.id}
                className={`relative flex flex-col ${
                  tier.mostPopular ? 'lg:scale-105 lg:z-10' : ''
                }`}
              >
                {/* Most Popular Badge */}
                {tier.mostPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <div className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-md">
                      <Star className="h-3 w-3 fill-current" />
                      Most Popular
                    </div>
                  </div>
                )}

                <div
                  className={`relative flex flex-col h-full rounded-2xl bg-background/95 backdrop-blur-sm p-6 shadow-lg border transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 ${
                    tier.mostPopular
                      ? 'border-primary/40 bg-gradient-to-br from-primary/3 to-background ring-1 ring-primary/20'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  {/* Plan Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`p-2.5 rounded-xl ${tier.bgColor} ${tier.borderColor} border`}>
                      <Icon className={`h-5 w-5 ${tier.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-foreground mb-1">{tier.name}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{tier.description}</p>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="mb-6">
                    {tier.isEnterprise ? (
                      <div className="mb-2">
                        <div className="text-3xl font-bold tracking-tight text-foreground">
                          Talk to Sales
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Custom pricing for your needs
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-4xl font-bold tracking-tight text-foreground">
                            {tier.isFree ? 'Free' : formatPrice((billingFrequency === 'yearly' ? tier.price.yearly : tier.price.monthly) * 100)}
                          </span>
                          {!tier.isFree && (
                            <span className="text-sm font-medium text-muted-foreground">
                              /month
                            </span>
                          )}
                        </div>
                        
                        {billingFrequency === 'yearly' && !tier.isFree && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm font-semibold text-green-600 dark:text-green-400">
                              <div className="h-2 w-2 rounded-full bg-green-500" />
                              Save 20% with annual billing
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* CTA Button */}
                  <div className="mb-6">
                    <Button
                      onClick={() => handlePlanSelect(tier.id)}
                      disabled={isLoading || (isLoading && loadingPlan !== tier.id)}
                      className={`w-full h-11 text-sm font-semibold rounded-xl transition-all duration-200 ${
                        tier.mostPopular
                          ? 'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg hover:shadow-xl border-0'
                          : 'bg-background border-2 border-border hover:border-primary text-foreground hover:bg-primary hover:text-primary-foreground shadow-sm hover:shadow-md'
                      }`}
                      size="lg"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Processing...
                        </div>
                      ) : tier.isEnterprise ? (
                        'Contact Sales'
                      ) : tier.isFree && !user ? (
                        'Start Free'
                      ) : tier.isFree && user ? (
                        'View Dashboard'
                      ) : user ? (
                        'Upgrade Now'
                      ) : (
                        'Start Free Trial'
                      )}
                    </Button>
                  </div>

                  {/* Features List */}
                  <div className="flex-1">
                    <ul role="list" className="space-y-3">
                      {tier.features.map((feature) => {
                        const isHighlighted = tier.highlighted.includes(feature);
                        return (
                          <li key={feature} className="flex items-start gap-2">
                            <Check 
                              className={`h-4 w-4 flex-none mt-0.5 ${
                                isHighlighted ? 'text-primary' : 'text-muted-foreground'
                              }`} 
                              aria-hidden="true" 
                            />
                            <span className={`text-xs leading-5 ${
                              isHighlighted 
                                ? 'text-foreground font-semibold' 
                                : 'text-muted-foreground'
                            }`}>
                              {feature}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mx-auto mt-16 max-w-2xl text-center">
          <p className="text-sm text-muted-foreground">
            Start with 100 free MCP calls. No credit card required. Upgrade anytime.
          </p>
          <div className="mt-4 flex justify-center items-center space-x-6 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>99.9% Uptime SLA</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span>SOC 2 Compliant</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="h-2 w-2 rounded-full bg-purple-500" />
              <span>Enterprise Support</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}