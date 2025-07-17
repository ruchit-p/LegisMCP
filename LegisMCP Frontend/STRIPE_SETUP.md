# Stripe Integration Setup Guide

This guide will help you properly configure Stripe integration for the LegislativeMCP Frontend.

## 🎯 Overview

The frontend includes a complete Stripe integration with:

- ✅ Subscription checkout flow
- ✅ Customer portal for subscription management
- ✅ Webhook handling for real-time updates
- ✅ Type-safe configuration management
- ✅ Comprehensive error handling

## 📋 Prerequisites

1. **Stripe Account**: Create an account at [stripe.com](https://stripe.com)
2. **Auth0 Account**: Required for user authentication
3. **Backend API**: Your Cloudflare Worker or backend API should be running

## 🔧 Step-by-Step Setup

### 1. Create Stripe Products and Prices

In your Stripe Dashboard, create the following products with their respective monthly and yearly prices:

#### Developer Plan ($9.99/month, $99.99/year)

```bash
# Create product
stripe products create \
  --name "Developer" \
  --description "Perfect for individual developers and small projects"

# Create monthly price
stripe prices create \
  --product prod_XXXXX \
  --unit-amount 999 \
  --currency usd \
  --recurring interval=month

# Create yearly price
stripe prices create \
  --product prod_XXXXX \
  --unit-amount 9999 \
  --currency usd \
  --recurring interval=year
```

#### Professional Plan ($29.99/month, $299.99/year)

```bash
# Create product
stripe products create \
  --name "Professional" \
  --description "Enhanced access for production applications and teams"

# Create monthly price
stripe prices create \
  --product prod_YYYYY \
  --unit-amount 2999 \
  --currency usd \
  --recurring interval=month

# Create yearly price
stripe prices create \
  --product prod_YYYYY \
  --unit-amount 29999 \
  --currency usd \
  --recurring interval=year
```

#### Enterprise Plan ($99.99/month, $999.99/year)

```bash
# Create product
stripe products create \
  --name "Enterprise" \
  --description "Unlimited access for mission-critical applications"

# Create monthly price
stripe prices create \
  --product prod_ZZZZZ \
  --unit-amount 9999 \
  --currency usd \
  --recurring interval=month

# Create yearly price
stripe prices create \
  --product prod_ZZZZZ \
  --unit-amount 99999 \
  --currency usd \
  --recurring interval=year
```

### 2. Set Up Webhook Endpoint

1. **Go to Stripe Dashboard** → Developers → Webhooks
2. **Click "Add endpoint"**
3. **Endpoint URL**: `https://your-domain.com/api/webhooks/stripe`
4. **Select events to send**:

   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

5. **Copy the webhook signing secret** (starts with `whsec_`)

### 3. Configure Environment Variables

Update your `.env.local` file with the following Stripe configuration:

```bash
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs (from step 1)
STRIPE_STARTER_MONTHLY_PRICE_ID=price_xxxxx_monthly
STRIPE_STARTER_YEARLY_PRICE_ID=price_xxxxx_yearly
STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID=price_yyyyy_monthly
STRIPE_PROFESSIONAL_YEARLY_PRICE_ID=price_yyyyy_yearly
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_zzzzz_monthly
STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_zzzzz_yearly
```

### 4. Configure Your Backend

Ensure your backend (Cloudflare Worker) has an endpoint to handle subscription updates:

```
POST /api/webhooks/stripe/subscription
```

This endpoint should:

- Accept Auth0 user ID and subscription data
- Update user subscription information in your database
- Return success status

## 🧪 Testing

### Test the Integration

1. **Start your development server**:

   ```bash
   npm run dev
   ```

2. **Use Stripe test cards**:

   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - 3D Secure: `4000 0025 0000 3155`

3. **Test webhook locally** using Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

### Verify Configuration

The app includes built-in configuration validation. Check the browser console for any missing environment variables.

## 🚀 Production Deployment

### 1. Switch to Live Keys

Replace test keys with live keys in your production environment:

```bash
# Production keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_live_xxxxx
```

### 2. Update Webhook URLs

Update your webhook endpoint URL in Stripe Dashboard to point to your production domain.

### 3. Update Price IDs

Use your production price IDs in the environment variables.

## 🔐 Security Best Practices

1. **Environment Variables**: Never commit `.env.local` to version control
2. **Webhook Verification**: Always verify webhook signatures (handled automatically)
3. **HTTPS Only**: Use HTTPS in production for all Stripe interactions
4. **Key Rotation**: Regularly rotate your Stripe API keys

## 🐛 Troubleshooting

### Common Issues

1. **Webhook signature verification failed**

   - Check `STRIPE_WEBHOOK_SECRET` is correctly set
   - Ensure webhook endpoint URL is accessible
   - Verify webhook events are configured correctly

2. **Price ID not found**

   - Verify all price IDs are correctly set in environment variables
   - Ensure prices exist in your Stripe account

3. **Authentication errors**
   - Check Auth0 integration is working
   - Verify user session management

### Debug Mode

Enable detailed logging by setting:

```bash
NODE_ENV=development
```

## 📚 Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Webhook Testing](https://stripe.com/docs/webhooks/test)
- [Next.js + Stripe Guide](https://stripe.com/docs/payments/checkout/how-checkout-works)

## 📞 Support

If you encounter issues:

1. Check the browser console for errors
2. Review server logs for webhook processing errors
3. Use Stripe Dashboard logs to debug payment issues
4. Contact support with specific error messages and steps to reproduce
