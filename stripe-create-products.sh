#!/bin/bash

# Stripe Test Products Setup for LegisMCP
# Note: Make sure you're logged into Stripe CLI with test credentials

echo "Setting up Stripe test products for LegisMCP..."
echo "============================================="
echo ""

# Step 1: Create the product
echo "Step 1: Creating LegisMCP Subscription product..."
stripe products create \
  --name="LegisMCP Subscription" \
  --description="Access to Legislative Data through MCP Tools"

echo ""
echo "Copy the product ID from above (looks like prod_...)"
read -p "Enter the product ID: " PRODUCT_ID

echo ""
echo "Step 2: Creating price plans..."
echo ""

# Create Developer Monthly
echo "Creating Developer Monthly ($9.99/month)..."
stripe prices create \
  --unit-amount=999 \
  --currency=usd \
  --recurring[interval]=month \
  --product="$PRODUCT_ID" \
  --nickname="Developer Monthly"

echo ""
echo "Copy the price ID from above (looks like price_...)"
read -p "Enter Developer Monthly price ID: " STARTER_MONTHLY

# Create Developer Yearly
echo ""
echo "Creating Developer Yearly ($99.99/year)..."
stripe prices create \
  --unit-amount=9999 \
  --currency=usd \
  --recurring[interval]=year \
  --product="$PRODUCT_ID" \
  --nickname="Developer Yearly"

echo ""
echo "Copy the price ID from above (looks like price_...)"
read -p "Enter Developer Yearly price ID: " STARTER_YEARLY

# Create Professional Monthly
echo ""
echo "Creating Professional Monthly ($29.99/month)..."
stripe prices create \
  --unit-amount=2999 \
  --currency=usd \
  --recurring[interval]=month \
  --product="$PRODUCT_ID" \
  --nickname="Professional Monthly"

echo ""
echo "Copy the price ID from above (looks like price_...)"
read -p "Enter Professional Monthly price ID: " PROFESSIONAL_MONTHLY

# Create Professional Yearly
echo ""
echo "Creating Professional Yearly ($299.99/year)..."
stripe prices create \
  --unit-amount=29999 \
  --currency=usd \
  --recurring[interval]=year \
  --product="$PRODUCT_ID" \
  --nickname="Professional Yearly"

echo ""
echo "Copy the price ID from above (looks like price_...)"
read -p "Enter Professional Yearly price ID: " PROFESSIONAL_YEARLY

echo ""
echo "============================================="
echo "Configuration Summary:"
echo "============================================="
echo ""
echo "Add these to your .env.local file:"
echo ""
echo "STRIPE_STARTER_MONTHLY_PRICE_ID='$STARTER_MONTHLY'"
echo "STRIPE_STARTER_YEARLY_PRICE_ID='$STARTER_YEARLY'"
echo "STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID='$PROFESSIONAL_MONTHLY'"
echo "STRIPE_PROFESSIONAL_YEARLY_PRICE_ID='$PROFESSIONAL_YEARLY'"

# Save to file
cat > stripe-test-prices.txt << EOF
STRIPE_STARTER_MONTHLY_PRICE_ID='$STARTER_MONTHLY'
STRIPE_STARTER_YEARLY_PRICE_ID='$STARTER_YEARLY'
STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID='$PROFESSIONAL_MONTHLY'
STRIPE_PROFESSIONAL_YEARLY_PRICE_ID='$PROFESSIONAL_YEARLY'
EOF

echo ""
echo "Price IDs also saved to: stripe-test-prices.txt"
echo ""

# Update .env.local automatically
read -p "Update .env.local automatically? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    # Update the file
    sed -i '' "s/STRIPE_STARTER_MONTHLY_PRICE_ID='price_...'/STRIPE_STARTER_MONTHLY_PRICE_ID='$STARTER_MONTHLY'/" /Users/ruchitpatel/Projects/LegisMCP/LegisMCP_Frontend/.env.local
    sed -i '' "s/STRIPE_STARTER_YEARLY_PRICE_ID='price_...'/STRIPE_STARTER_YEARLY_PRICE_ID='$STARTER_YEARLY'/" /Users/ruchitpatel/Projects/LegisMCP/LegisMCP_Frontend/.env.local
    sed -i '' "s/STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID='price_...'/STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID='$PROFESSIONAL_MONTHLY'/" /Users/ruchitpatel/Projects/LegisMCP/LegisMCP_Frontend/.env.local
    sed -i '' "s/STRIPE_PROFESSIONAL_YEARLY_PRICE_ID='price_...'/STRIPE_PROFESSIONAL_YEARLY_PRICE_ID='$PROFESSIONAL_YEARLY'/" /Users/ruchitpatel/Projects/LegisMCP/LegisMCP_Frontend/.env.local
    
    echo "✅ .env.local updated successfully!"
fi