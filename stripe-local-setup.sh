#!/bin/bash

# Stripe CLI Local Webhook Setup for LegisMCP

echo "Starting Stripe webhook forwarding for LegisMCP..."
echo "================================================="
echo ""
echo "This will forward Stripe webhooks to: http://localhost:8789/api/webhooks/stripe"
echo ""
echo "IMPORTANT: Copy the webhook signing secret (whsec_...) displayed below"
echo "and add it to your LegisAPI/.dev.vars file as STRIPE_WEBHOOK_SECRET"
echo ""
echo "================================================="
echo ""

# Start webhook forwarding with the specific events we need
stripe listen \
  --forward-to localhost:8789/api/webhooks/stripe \
  --events customer.created,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_succeeded,invoice.payment_failed

# Note: You can also use --forward-to without --events to forward ALL events for testing