'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Calendar, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

interface Subscription {
  id: string;
  status: string;
  planName: string;
  billingFrequency: 'monthly' | 'yearly';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  amount: number;
  currency: string;
}

interface SubscriptionManagerProps {
  onSubscriptionUpdate?: () => void;
}

export function SubscriptionManager({ onSubscriptionUpdate }: SubscriptionManagerProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    loadSubscription();
    
    // Check for successful checkout
    const sessionId = searchParams.get('session_id');
    const success = searchParams.get('success');
    
    if (sessionId && success === 'true') {
      // Show success message and refresh subscription data
      setTimeout(() => {
        loadSubscription();
      }, 2000); // Give webhook time to process
    }
  }, [searchParams]);

  const loadSubscription = async () => {
    try {
      const response = await fetch('/api/user/subscription');
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsUpdating(true);
    try {
      // Create Stripe customer portal session
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        throw new Error('Failed to create billing portal session');
      }
    } catch (error) {
      console.error('Error creating billing portal session:', error);
      alert('Failed to open billing portal. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Trial</Badge>;
      case 'past_due':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Past Due</Badge>;
      case 'canceled':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Canceled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-32 bg-muted rounded"></div>
            <div className="h-4 w-48 bg-muted rounded"></div>
            <div className="h-4 w-40 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show success message if just returned from checkout
  const showSuccessMessage = searchParams.get('success') === 'true';

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription
          </CardTitle>
          <CardDescription>
            No active subscription found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showSuccessMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Payment successful!</span>
              </div>
              <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                Your subscription is being activated. This may take a few moments.
              </p>
            </div>
          )}
          <p className="text-muted-foreground mb-4">
            You don't have an active subscription. Choose a plan to get started with full access to our Legislative data API.
          </p>
          <Button asChild>
            <a href="/#pricing">Choose a Plan</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription
          </div>
          {getStatusBadge(subscription.status)}
        </CardTitle>
        <CardDescription>
          Manage your subscription and billing information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {showSuccessMessage && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Welcome to {subscription.planName}!</span>
            </div>
            <p className="mt-1 text-sm text-green-700 dark:text-green-300">
              Your subscription is now active. You have full access to all features.
            </p>
          </div>
        )}

        {subscription.cancelAtPeriodEnd && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Subscription ending soon</span>
            </div>
            <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
              Your subscription will end on {formatDate(subscription.currentPeriodEnd)}.
            </p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="font-medium text-foreground">Plan</h4>
            <p className="text-muted-foreground">
              {subscription.planName} ({subscription.billingFrequency})
            </p>
          </div>

          <div>
            <h4 className="font-medium text-foreground">Amount</h4>
            <p className="text-muted-foreground">
              {formatAmount(subscription.amount, subscription.currency)} per {subscription.billingFrequency === 'yearly' ? 'year' : 'month'}
            </p>
          </div>

          <div>
            <h4 className="font-medium text-foreground">Current Period</h4>
            <p className="text-muted-foreground text-sm">
              {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
            </p>
          </div>

          <div>
            <h4 className="font-medium text-foreground">Next Billing</h4>
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <Calendar className="h-4 w-4" />
              {subscription.cancelAtPeriodEnd ? 'Subscription ends' : 'Renews'} on {formatDate(subscription.currentPeriodEnd)}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button 
            onClick={handleManageSubscription}
            disabled={isUpdating}
            className="w-full sm:w-auto"
          >
            {isUpdating ? (
              'Opening...'
            ) : (
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Manage Subscription
              </div>
            )}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Update payment method, billing address, download invoices, or cancel subscription.
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 