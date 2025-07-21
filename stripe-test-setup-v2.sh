#!/bin/bash

# Stripe Test Environment Setup Script for LegisMCP
# This script creates products and prices in Stripe test mode

echo "Setting up Stripe test products for LegisMCP..."
echo "============================================="
echo ""

# Create the main product
echo "Creating LegisMCP Subscription product..."
PRODUCT_JSON=$(stripe products create \
  --name="LegisMCP Subscription" \
  --description="Access to Legislative Data through MCP Tools" \
  --test)

PRODUCT_ID=$(echo "$PRODUCT_JSON" | grep -o '"id": "[^"]*' | head -1 | cut -d'"' -f4)
echo "Product created: $PRODUCT_ID"
echo ""

# Create Developer (Starter) prices
echo "Creating Developer Monthly plan ($9.99/month)..."
STARTER_MONTHLY_JSON=$(stripe prices create \
  --product=$PRODUCT_ID \
  --unit-amount=999 \
  --currency=usd \
  --recurring='{"interval":"month"}' \
  --nickname="Developer Monthly" \
  --test)
STARTER_MONTHLY=$(echo "$STARTER_MONTHLY_JSON" | grep -o '"id": "[^"]*' | head -1 | cut -d'"' -f4)
echo "Created: $STARTER_MONTHLY"

echo "Creating Developer Yearly plan ($99.99/year)..."
STARTER_YEARLY_JSON=$(stripe prices create \
  --product=$PRODUCT_ID \
  --unit-amount=9999 \
  --currency=usd \
  --recurring='{"interval":"year"}' \
  --nickname="Developer Yearly" \
  --test)
STARTER_YEARLY=$(echo "$STARTER_YEARLY_JSON" | grep -o '"id": "[^"]*' | head -1 | cut -d'"' -f4)
echo "Created: $STARTER_YEARLY"

# Create Professional prices
echo "Creating Professional Monthly plan ($29.99/month)..."
PROFESSIONAL_MONTHLY_JSON=$(stripe prices create \
  --product=$PRODUCT_ID \
  --unit-amount=2999 \
  --currency=usd \
  --recurring='{"interval":"month"}' \
  --nickname="Professional Monthly" \
  --test)
PROFESSIONAL_MONTHLY=$(echo "$PROFESSIONAL_MONTHLY_JSON" | grep -o '"id": "[^"]*' | head -1 | cut -d'"' -f4)
echo "Created: $PROFESSIONAL_MONTHLY"

echo "Creating Professional Yearly plan ($299.99/year)..."
PROFESSIONAL_YEARLY_JSON=$(stripe prices create \
  --product=$PRODUCT_ID \
  --unit-amount=29999 \
  --currency=usd \
  --recurring='{"interval":"year"}' \
  --nickname="Professional Yearly" \
  --test)
PROFESSIONAL_YEARLY=$(echo "$PROFESSIONAL_YEARLY_JSON" | grep -o '"id": "[^"]*' | head -1 | cut -d'"' -f4)
echo "Created: $PROFESSIONAL_YEARLY"

echo ""
echo "============================================="
echo "Stripe test products created successfully!"
echo "============================================="
echo ""
echo "Add these price IDs to your .env.local file:"
echo ""
echo "STRIPE_STARTER_MONTHLY_PRICE_ID='$STARTER_MONTHLY'"
echo "STRIPE_STARTER_YEARLY_PRICE_ID='$STARTER_YEARLY'"
echo "STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID='$PROFESSIONAL_MONTHLY'"
echo "STRIPE_PROFESSIONAL_YEARLY_PRICE_ID='$PROFESSIONAL_YEARLY'"
echo ""

# Write to a file for easy copying
cat > stripe-test-prices.txt << EOF
STRIPE_STARTER_MONTHLY_PRICE_ID='$STARTER_MONTHLY'
STRIPE_STARTER_YEARLY_PRICE_ID='$STARTER_YEARLY'
STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID='$PROFESSIONAL_MONTHLY'
STRIPE_PROFESSIONAL_YEARLY_PRICE_ID='$PROFESSIONAL_YEARLY'
EOF

echo "Price IDs also saved to: stripe-test-prices.txt"
echo "============================================="