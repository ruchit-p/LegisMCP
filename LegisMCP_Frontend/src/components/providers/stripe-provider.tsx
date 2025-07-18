"use client"

import React from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'

// MARK: - Stripe Configuration Validation
const validateStripeConfig = () => {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  if (!publishableKey) {
    console.error('❌ Missing required Stripe environment variable:');
    console.error('   - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (your Stripe publishable key)');
    console.error('🔧 This should start with pk_test_ for development or pk_live_ for production');
    console.error('📁 Add this to your .env.local file');
    console.error('📖 See STRIPE_SETUP.md for setup instructions');
    return false;
  }
  
  // Validate key format
  if (!publishableKey.startsWith('pk_')) {
    console.warn('⚠️  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY should start with pk_');
    console.warn('   Current value:', publishableKey.substring(0, 10) + '...');
  }
  
  console.log('✅ Stripe configuration validated successfully');
  return true;
};

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

// Only initialize Stripe if the publishable key is available and valid
const stripePromise = stripePublishableKey && validateStripeConfig()
  ? loadStripe(stripePublishableKey)
  : Promise.resolve(null);

interface StripeProviderProps {
  children: React.ReactNode
}

export function StripeProvider({ children }: StripeProviderProps) {
  // If no Stripe key is available, render children without Stripe provider
  if (!stripePublishableKey) {
    console.warn('⚠️  Stripe publishable key not found. Stripe functionality will be disabled.');
    console.warn('💡 Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to your .env.local file to enable payments');
    return <>{children}</>;
  }

  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  )
} 