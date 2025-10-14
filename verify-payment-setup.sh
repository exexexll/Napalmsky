#!/bin/bash

# Payment System Verification Script for Vercel + Railway
# Run this to diagnose payment issues

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     NAPALM SKY - Payment System Diagnostic Tool          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check Railway Backend
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Checking Railway Backend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RAILWAY_URL="https://napalmsky-production.up.railway.app"

# Health check
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "${RAILWAY_URL}/health" 2>/dev/null)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Railway backend is online${NC}"
    echo "   Response: $BODY"
else
    echo -e "${RED}❌ Railway backend is not responding (HTTP $HTTP_CODE)${NC}"
    echo "   Expected: 200, Got: $HTTP_CODE"
    echo "   This is critical - fix deployment first!"
fi

echo ""

# 2. Check Webhook Endpoint
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Checking Webhook Endpoint..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

WEBHOOK_RESPONSE=$(curl -s -X POST -w "\n%{http_code}" "${RAILWAY_URL}/payment/webhook" 2>/dev/null)
WEBHOOK_CODE=$(echo "$WEBHOOK_RESPONSE" | tail -n1)

if [ "$WEBHOOK_CODE" = "400" ] || [ "$WEBHOOK_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Webhook endpoint exists${NC}"
    echo "   URL: ${RAILWAY_URL}/payment/webhook"
    echo "   Status: $WEBHOOK_CODE (400 is expected without signature)"
else
    echo -e "${RED}❌ Webhook endpoint not found (HTTP $WEBHOOK_CODE)${NC}"
fi

echo ""

# 3. Check Stripe Configuration
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Checking Local Stripe Configuration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "server/.env" ]; then
    echo -e "${GREEN}✅ server/.env file exists${NC}"
    
    # Check for Stripe keys
    if grep -q "STRIPE_SECRET_KEY=sk_test_" server/.env; then
        echo -e "${GREEN}✅ STRIPE_SECRET_KEY configured (test mode)${NC}"
        STRIPE_KEY=$(grep "STRIPE_SECRET_KEY" server/.env | cut -d'=' -f2 | cut -c1-20)
        echo "   Key: ${STRIPE_KEY}..."
    else
        echo -e "${RED}❌ STRIPE_SECRET_KEY not found or invalid${NC}"
    fi
    
    if grep -q "STRIPE_WEBHOOK_SECRET=whsec_" server/.env; then
        echo -e "${GREEN}✅ STRIPE_WEBHOOK_SECRET configured${NC}"
        WEBHOOK_SECRET=$(grep "STRIPE_WEBHOOK_SECRET" server/.env | cut -d'=' -f2 | cut -c1-15)
        echo "   Secret: ${WEBHOOK_SECRET}..."
        echo -e "${YELLOW}⚠️  NOTE: This is your LOCAL webhook secret${NC}"
        echo "   Railway needs a DIFFERENT secret from Stripe Dashboard"
    else
        echo -e "${RED}❌ STRIPE_WEBHOOK_SECRET not found${NC}"
    fi
else
    echo -e "${RED}❌ server/.env file not found${NC}"
fi

echo ""

# 4. Check Frontend Configuration
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Checking Frontend Configuration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f ".env.local" ]; then
    echo -e "${GREEN}✅ .env.local file exists${NC}"
    
    if grep -q "NEXT_PUBLIC_API_BASE=https://napalmsky-production.up.railway.app" .env.local; then
        echo -e "${GREEN}✅ API_BASE points to Railway (production)${NC}"
    elif grep -q "NEXT_PUBLIC_API_BASE=http://localhost:3001" .env.local; then
        echo -e "${YELLOW}⚠️  API_BASE points to localhost (development)${NC}"
        echo "   For Vercel deployment, this should point to Railway"
    else
        echo -e "${RED}❌ NEXT_PUBLIC_API_BASE not configured correctly${NC}"
    fi
    
    if grep -q "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_" .env.local; then
        echo -e "${GREEN}✅ Stripe publishable key configured${NC}"
    else
        echo -e "${RED}❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not found${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  .env.local not found (okay if using Vercel env vars)${NC}"
fi

echo ""

# 5. Instructions
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Next Steps"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "For Vercel + Railway Setup:"
echo ""
echo "1. Configure Stripe Webhook:"
echo "   • Go to: https://dashboard.stripe.com/test/webhooks"
echo "   • Click 'Add endpoint'"
echo "   • URL: ${RAILWAY_URL}/payment/webhook"
echo "   • Events: checkout.session.completed"
echo "   • Copy the webhook signing secret (whsec_...)"
echo ""
echo "2. Update Railway Environment:"
echo "   • Go to: https://railway.app/dashboard"
echo "   • Select your project"
echo "   • Variables → Add/Update:"
echo "     STRIPE_WEBHOOK_SECRET=whsec_[from_step_1]"
echo ""
echo "3. Verify Vercel Environment:"
echo "   • Go to: https://vercel.com/dashboard"
echo "   • Settings → Environment Variables:"
echo "     NEXT_PUBLIC_API_BASE=${RAILWAY_URL}"
echo "     NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_..."
echo ""
echo "4. Test Payment:"
echo "   • Go to your Vercel deployment"
echo "   • Navigate to /onboarding"
echo "   • Use test card: 4242 4242 4242 4242"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📚 Full Guide: PAYMENT-FIX-VERCEL-RAILWAY.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

