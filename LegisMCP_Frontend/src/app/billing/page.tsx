'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Check, 
  Loader2, 
  AlertCircle,
  ArrowRight,
  Gift,
  Zap,
  Shield,
  Building
} from 'lucide-react';
import { formatPrice, STRIPE_CONFIG } from '@/lib/stripe-config';

interface SubscriptionData {
  plan: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'free';
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  stripeCustomerId?: string;
}

const planDetails = {
  free: {
    name: 'Free',
    icon: Gift,
    color: 'text-green-600',
    features: ['100 MCP calls (one-time)', 'All Legislative tools', 'Community support']
  },
  starter: {
    name: 'Developer',
    icon: Zap,
    color: 'text-blue-600',
    features: ['1,000 MCP calls/month', 'Standard rate limiting', 'Email support']
  },
  professional: {
    name: 'Professional',
    icon: Shield,
    color: 'text-purple-600',
    features: ['10,000 MCP calls/month', 'Priority rate limiting', 'Priority support']
  },
  enterprise: {
    name: 'Enterprise',
    icon: Building,
    color: 'text-emerald-600',
    features: ['Unlimited MCP calls', 'No rate limiting', 'Dedicated support']
  }
};

export default function BillingPage() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const isLoadingUser = status === 'loading';
  const router = useRouter();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [billingFrequency, setBillingFrequency] = useState<'monthly' | 'yearly'>('monthly');
  const [isChangingPlan, setIsChangingPlan] = useState<string | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);

  useEffect(() => {
    if (user && !isLoadingUser) {
      loadSubscriptionData();
    }
  }, [user, isLoadingUser]);

  const loadSubscriptionData = async () => {
    try {
      const response = await fetch('/api/user/subscription');
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanChange = async (planId: string) => {
    if (planId === 'enterprise') {
      router.push('/contact/enterprise');
      return;
    }

    setIsChangingPlan(planId);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, billingFrequency }),
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error changing plan:', error);
    } finally {
      setIsChangingPlan(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) {
      return;
    }

    setIsCanceling(true);
    try {
      const response = await fetch('/api/user/subscription/cancel', {
        method: 'POST',
      });

      if (response.ok) {
        await loadSubscriptionData();
        alert('Your subscription has been canceled. You will retain access until the end of your billing period.');
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setIsCanceling(false);
    }
  };

  const handleManageBilling = async () => {
    router.push('/api/billing/portal');
  };

  if (isLoadingUser || isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/api/auth/login');
    return null;
  }

  const currentPlan = subscription?.plan || 'free';
  const currentPlanDetails = planDetails[currentPlan as keyof typeof planDetails];
  const CurrentIcon = currentPlanDetails.icon;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <div className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
            <p className="text-muted-foreground mt-2">
              Manage your subscription and billing preferences
            </p>
          </div>

          {/* Current Plan Overview */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CurrentIcon className={`h-5 w-5 ${currentPlanDetails.color}`} />
                  Current Plan
                </span>
                {subscription?.status && subscription.status !== 'free' && (
                  <Badge variant={subscription.status === 'active' ? 'default' : 'destructive'}>
                    {subscription.status}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-semibold">{currentPlanDetails.name}</h3>
                  <div className="mt-2 space-y-1">
                    {currentPlanDetails.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-green-500" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
                {subscription?.stripeCustomerId && (
                  <Button onClick={handleManageBilling} variant="outline">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Manage Billing
                  </Button>
                )}
              </div>

              {subscription?.currentPeriodEnd && (
                <Separator />
              )}
              
              <div className="space-y-2">
                {subscription?.currentPeriodEnd && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {subscription.cancelAtPeriodEnd ? 'Access until' : 'Next billing date'}
                    </span>
                    <span className="font-medium">
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  </div>
                )}
                
                {subscription?.cancelAtPeriodEnd && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your subscription is set to cancel at the end of the current billing period.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Plan Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Change Plan</CardTitle>
              <CardDescription>
                Choose a plan that fits your needs. You can change or cancel anytime.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Billing Toggle */}
              <div className="flex justify-center mb-8">
                <div className="inline-flex items-center space-x-1 bg-muted rounded-lg p-1">
                  <button
                    onClick={() => setBillingFrequency('monthly')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                      billingFrequency === 'monthly'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingFrequency('yearly')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                      billingFrequency === 'yearly'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Yearly
                    <Badge variant="secondary" className="text-xs">Save 20%</Badge>
                  </button>
                </div>
              </div>

              {/* Plans Grid */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {Object.entries(STRIPE_CONFIG.plans).map(([planId, plan]) => {
                  const details = planDetails[planId as keyof typeof planDetails];
                  const Icon = details.icon;
                  const isCurrentPlan = currentPlan === planId;
                  const yearlyPrice = plan.isFree ? 0 : plan.yearly.amount * 12;
                  const monthlyPrice = plan.monthly.amount;
                  const displayPrice = billingFrequency === 'monthly' ? monthlyPrice : yearlyPrice;

                  return (
                    <div
                      key={planId}
                      className={`relative rounded-lg border p-6 ${
                        isCurrentPlan ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      {isCurrentPlan && (
                        <Badge className="absolute -top-3 left-4" variant="default">
                          Current Plan
                        </Badge>
                      )}
                      
                      <div className="space-y-4">
                        <div>
                          <Icon className={`h-8 w-8 ${details.color} mb-2`} />
                          <h3 className="font-semibold text-lg">{plan.name}</h3>
                          {plan.isEnterprise ? (
                            <p className="text-2xl font-bold mt-2">Contact Sales</p>
                          ) : plan.isFree ? (
                            <p className="text-2xl font-bold mt-2">Free</p>
                          ) : (
                            <div className="mt-2">
                              <span className="text-2xl font-bold">
                                {formatPrice(displayPrice)}
                              </span>
                              <span className="text-muted-foreground text-sm">
                                /{billingFrequency === 'monthly' ? 'mo' : 'yr'}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <ul className="space-y-2 text-sm">
                          {details.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                        
                        <Button
                          onClick={() => handlePlanChange(planId)}
                          disabled={isCurrentPlan || isChangingPlan !== null}
                          variant={isCurrentPlan ? 'secondary' : 'default'}
                          className="w-full"
                        >
                          {isChangingPlan === planId ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : isCurrentPlan ? (
                            'Current Plan'
                          ) : plan.isEnterprise ? (
                            'Contact Sales'
                          ) : (
                            <>
                              Upgrade <ArrowRight className="h-4 w-4 ml-1" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cancel Subscription */}
              {subscription?.status === 'active' && !subscription.cancelAtPeriodEnd && currentPlan !== 'free' && (
                <div className="mt-8 pt-8 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Cancel Subscription</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        You&apos;ll retain access until the end of your billing period
                      </p>
                    </div>
                    <Button
                      onClick={handleCancelSubscription}
                      disabled={isCanceling}
                      variant="destructive"
                    >
                      {isCanceling ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Canceling...
                        </>
                      ) : (
                        'Cancel Subscription'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}