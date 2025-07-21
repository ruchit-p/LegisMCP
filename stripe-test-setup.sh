#!/bin/bash

# Stripe Test Environment Setup Script for LegisMCP
# This script creates products and prices in Stripe test mode

echo "Setting up Stripe test products for LegisMCP..."
echo "============================================="
echo ""

# Create the main product
echo "Creating LegisMCP Subscription product..."
PRODUCT_ID=$(stripe products create \
  --name="LegisMCP Subscription" \
  --description="Access to Legislative Data through MCP Tools" \
  --test \
  | grep -o '"id": "prod_[^"]*' | cut -d'"' -f4)

echo "Product created: $PRODUCT_ID"
echo ""

# Create Developer (Starter) prices
echo "Creating Developer plan prices..."
STARTER_MONTHLY=$(stripe prices create \
  --product=$PRODUCT_ID \
  --unit-amount=999 \
  --currency=usd \
  --recurring='{"interval":"month"}' \
  --nickname="Developer Monthly" \
  --test \
  | grep -o '"id": "price_[^"]*' | cut -d'"' -f4)

STARTER_YEARLY=$(stripe prices create \
  --product=$PRODUCT_ID \
  --unit-amount=9999 \
  --currency=usd \
  --recurring='{"interval":"year"}' \
  --nickname="Developer Yearly" \
  --test \
  | grep -o '"id": "price_[^"]*' | cut -d'"' -f4)

# Create Professional prices
echo "Creating Professional plan prices..."
PROFESSIONAL_MONTHLY=$(stripe prices create \
  --product=$PRODUCT_ID \
  --unit-amount=2999 \
  --currency=usd \
  --recurring='{"interval":"month"}' \
  --nickname="Professional Monthly" \
  --test \
  | grep -o '"id": "price_[^"]*' | cut -d'"' -f4)

PROFESSIONAL_YEARLY=$(stripe prices create \
  --product=$PRODUCT_ID \
  --unit-amount=29999 \
  --currency=usd \
  --recurring='{"interval":"year"}' \
  --nickname="Professional Yearly" \
  --test \
  | grep -o '"id": "price_[^"]*' | cut -d'"' -f4)

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
echo "============================================="

# Optionally update the .env.local file automatically
read -p "Do you want to automatically update your .env.local file? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    # Update the .env.local file
    sed -i.bak "s/STRIPE_STARTER_MONTHLY_PRICE_ID='price_...'/STRIPE_STARTER_MONTHLY_PRICE_ID='$STARTER_MONTHLY'/" /Users/ruchitpatel/Projects/LegisMCP/LegisMCP_Frontend/.env.local
    sed -i.bak "s/STRIPE_STARTER_YEARLY_PRICE_ID='price_...'/STRIPE_STARTER_YEARLY_PRICE_ID='$STARTER_YEARLY'/" /Users/ruchitpatel/Projects/LegisMCP/LegisMCP_Frontend/.env.local
    sed -i.bak "s/STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID='price_...'/STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID='$PROFESSIONAL_MONTHLY'/" /Users/ruchitpatel/Projects/LegisMCP/LegisMCP_Frontend/.env.local
    sed -i.bak "s/STRIPE_PROFESSIONAL_YEARLY_PRICE_ID='price_...'/STRIPE_PROFESSIONAL_YEARLY_PRICE_ID='$PROFESSIONAL_YEARLY'/" /Users/ruchitpatel/Projects/LegisMCP/LegisMCP_Frontend/.env.local
    
    echo "✅ .env.local file updated successfully!"
    echo "Backup saved as .env.local.bak"
fi