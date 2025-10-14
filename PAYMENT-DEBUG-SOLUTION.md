# Payment Not Working - Complete Fix Guide

## 🔍 Root Cause Analysis

Based on the minified code and server configuration, here are the issues:

### Issue 1: Webhook Cannot Reach Localhost
- **Problem:** Stripe webhooks need a public URL to send events to
- **Current:** Your server is at `localhost:3001` which Stripe cannot reach
- **Solution:** Use Stripe CLI to forward webhooks locally

### Issue 2: Frontend Hardcoded to Production URL
- **Problem:** Your built frontend is pointing to `https://napalmsky-production.up.railway.app`
- **Current:** Local dev server is at `http://localhost:3001`
- **Solution:** Set environment variable and rebuild

### Issue 3: Payment Flow Timing
- **Problem:** Frontend retries only 5 times (10 seconds total)
- **Issue:** Webhook might take longer to process in development
- **Solution:** Increase retry count or implement better status checking

---

## ✅ Complete Fix (Choose Your Path)

### Path A: Local Development Fix (Testing Payments Locally)

#### Step 1: Install Stripe CLI
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Or download from: https://stripe.com/docs/stripe-cli
```

#### Step 2: Login to Stripe
```bash
stripe login
```
This will open your browser to authenticate.

#### Step 3: Start Webhook Forwarding
```bash
# In a new terminal window
cd /Users/hansonyan/Desktop/Napalmsky/server
stripe listen --forward-to localhost:3001/payment/webhook
```

**IMPORTANT:** This will output a webhook signing secret like:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxx
```

#### Step 4: Update Your .env with the NEW Secret
```bash
cd /Users/hansonyan/Desktop/Napalmsky/server
nano .env
```

Replace the `STRIPE_WEBHOOK_SECRET` with the one from Step 3:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx  # ← NEW ONE from stripe listen
```

#### Step 5: Set Frontend Environment Variable
```bash
cd /Users/hansonyan/Desktop/Napalmsky
echo "NEXT_PUBLIC_API_BASE=http://localhost:3001" > .env.local
```

#### Step 6: Restart Everything
```bash
# Terminal 1: Backend
cd /Users/hansonyan/Desktop/Napalmsky/server
npm run dev

# Terminal 2: Stripe CLI
stripe listen --forward-to localhost:3001/payment/webhook

# Terminal 3: Frontend
cd /Users/hansonyan/Desktop/Napalmsky
npm run dev
```

#### Step 7: Test Payment Flow
1. Go to `http://localhost:3000/onboarding`
2. Complete signup
3. Click "Pay $0.50" (uses test card)
4. Use test card: `4242 4242 4242 4242`, any future date, any CVC
5. Watch Terminal 2 - you should see webhook events!
6. Should redirect to `/payment-success` with invite code

---

### Path B: Use Production/Deployed Environment

If your app is deployed to Railway (https://napalmsky-production.up.railway.app):

#### Step 1: Configure Production Webhook
1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. URL: `https://napalmsky-production.up.railway.app/payment/webhook`
4. Events to send: `checkout.session.completed`
5. Copy the signing secret

#### Step 2: Update Railway Environment
1. Go to Railway dashboard
2. Find your project
3. Variables → Add:
   - `STRIPE_WEBHOOK_SECRET` = (secret from Step 1)

#### Step 3: Redeploy
Railway should auto-redeploy. If not, trigger a manual deploy.

#### Step 4: Test on Production
1. Go to your deployed URL
2. Complete payment flow
3. Check Railway logs for webhook events

---

## 🧪 Quick Test Script

Run this to verify your setup:

```bash
#!/bin/bash
echo "=== Payment System Health Check ==="

# Check if server is running
echo "1. Checking server..."
curl -s http://localhost:3001/health || echo "❌ Server not running"

# Check Stripe keys
echo "2. Checking Stripe configuration..."
if [ -f server/.env ]; then
  if grep -q "STRIPE_SECRET_KEY=sk_test_" server/.env; then
    echo "✅ Stripe secret key configured"
  else
    echo "❌ Stripe secret key missing or invalid"
  fi
  
  if grep -q "STRIPE_WEBHOOK_SECRET=whsec_" server/.env; then
    echo "✅ Webhook secret configured"
  else
    echo "❌ Webhook secret missing"
  fi
else
  echo "❌ .env file not found"
fi

# Check if Stripe CLI is listening
echo "3. Checking Stripe CLI..."
if lsof -ti:4242 > /dev/null; then
  echo "✅ Stripe CLI might be running"
else
  echo "⚠️  Stripe CLI not detected - run 'stripe listen'"
fi

echo ""
echo "=== Next Steps ==="
echo "1. Start server: cd server && npm run dev"
echo "2. Start Stripe: stripe listen --forward-to localhost:3001/payment/webhook"
echo "3. Start frontend: npm run dev"
echo "4. Test: http://localhost:3000/onboarding"
```

Save as `check-payment.sh` and run:
```bash
chmod +x check-payment.sh
./check-payment.sh
```

---

## 🐛 Common Errors & Fixes

### Error: "Webhook signature verification failed"
**Cause:** Wrong `STRIPE_WEBHOOK_SECRET`  
**Fix:** Copy the exact secret from `stripe listen` output

### Error: "Payment not processed yet, retrying..."
**Cause:** Webhook not reaching server  
**Fix:** Make sure `stripe listen` is running

### Error: "No invite code showing"
**Cause:** Webhook processed but code not generated  
**Fix:** Check server logs for errors in code generation

### Error: Frontend shows production URL
**Cause:** Built frontend cached  
**Fix:** Delete `.next` folder and restart: `rm -rf .next && npm run dev`

---

## 📊 Monitoring Payment Flow

Watch these terminals simultaneously:

**Terminal 1 - Backend Logs:**
```
[Payment] ✅ Payment successful for user abc12345
[Payment] Generated invite code ABCD1234EFGH5678 for John (4 uses)
```

**Terminal 2 - Stripe CLI:**
```
checkout.session.completed  [200] POST http://localhost:3001/payment/webhook
```

**Terminal 3 - Browser Console:**
```
Payment not processed yet, retrying... (1/5)
✓ Payment verified!
```

---

## 🎯 Expected Flow (When Working)

1. User clicks "Pay $0.50"
2. Redirected to Stripe checkout
3. Enters test card: `4242 4242 4242 4242`
4. Stripe redirects to `/payment-success?session_id=cs_test_xxx`
5. Frontend waits 2 seconds
6. Stripe webhook fires → Server marks user as paid + generates code
7. Frontend fetches status → Gets `paidStatus: 'paid'` + `myInviteCode`
8. Shows success page with QR code

**Total time:** ~3-5 seconds

---

## 🚀 Production Checklist

Before deploying payment to production:

- [ ] Switch to live Stripe keys (`sk_live_...`)
- [ ] Configure webhook in Stripe dashboard (not CLI)
- [ ] Set `STRIPE_WEBHOOK_SECRET` in Railway/production
- [ ] Test with real card (refund immediately)
- [ ] Monitor Railway logs for webhook events
- [ ] Verify QR code generation works
- [ ] Test invite code redemption flow
- [ ] Check database persistence (if using)

---

## 💡 Pro Tips

1. **Always keep `stripe listen` running during local dev**
2. **Check server logs** - they show exactly what's happening
3. **Use test cards** from: https://stripe.com/docs/testing
4. **Clear browser cache** if seeing old build
5. **Check Railway logs** in production, not local logs

---

## Need Help?

1. Check server logs: Look for `[Payment]` messages
2. Check Stripe CLI: Should show webhook events
3. Check browser console: Look for API errors
4. Check Railway logs: For production debugging

Common log messages:
- ✅ `Payment successful for user` = Webhook worked
- ✅ `Generated invite code` = Code created
- ❌ `Webhook signature verification failed` = Wrong secret
- ❌ `STRIPE_WEBHOOK_SECRET not configured` = Missing env var

