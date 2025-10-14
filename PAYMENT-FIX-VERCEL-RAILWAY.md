# Payment Fix for Vercel + Railway Setup

## 🎯 Current Setup
- **Frontend:** Vercel (Next.js)
- **Backend:** Railway (https://napalmsky-production.up.railway.app)
- **Issue:** Payment webhooks not processing correctly

## 🔍 Root Cause

From the minified code, your frontend IS correctly pointing to Railway:
```
https://napalmsky-production.up.railway.app
```

The problem is likely one of these:

1. **Stripe webhook is not configured to point to Railway**
2. **STRIPE_WEBHOOK_SECRET mismatch between Stripe dashboard and Railway**
3. **Webhook endpoint not receiving events**

---

## ✅ Complete Fix (Step by Step)

### Step 1: Configure Stripe Webhook for Railway

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/test/webhooks)

2. Click **"Add endpoint"**

3. Enter your Railway backend URL:
   ```
   https://napalmsky-production.up.railway.app/payment/webhook
   ```

4. Select events to listen for:
   - ✅ `checkout.session.completed`

5. Click **"Add endpoint"**

6. **IMPORTANT:** Click on the newly created webhook, then click **"Reveal"** under "Signing secret"

7. Copy the webhook signing secret (starts with `whsec_`)

---

### Step 2: Update Railway Environment Variables

1. Go to [Railway Dashboard](https://railway.app/dashboard)

2. Select your Napalmsky project

3. Click on your backend service

4. Go to **Variables** tab

5. Find `STRIPE_WEBHOOK_SECRET` and update it with the secret from Step 1.6:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

6. Click **"Save"** - Railway will automatically redeploy

---

### Step 3: Verify Railway Configuration

Make sure these environment variables are set in Railway:

```env
# Required
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# Optional but recommended
NODE_ENV=production
PORT=3001
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,https://napalmsky.com
```

---

### Step 4: Verify Vercel Configuration

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)

2. Select your Napalmsky project

3. Go to **Settings → Environment Variables**

4. Verify these are set:
   ```env
   NEXT_PUBLIC_API_BASE=https://napalmsky-production.up.railway.app
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_PUBLISHABLE_KEY
   ```

5. If you changed anything, redeploy:
   - Go to **Deployments** tab
   - Click **"Redeploy"** on the latest deployment

---

### Step 5: Test Payment Flow

1. Go to your Vercel URL (e.g., `https://napalmsky.vercel.app`)

2. Navigate to `/onboarding`

3. Complete the signup process

4. Click **"Pay $0.50"**

5. Use Stripe test card:
   - **Card:** `4242 4242 4242 4242`
   - **Expiry:** Any future date (e.g., `12/25`)
   - **CVC:** Any 3 digits (e.g., `123`)

6. Complete payment

7. Should redirect to `/payment-success` with:
   - ✅ Green checkmark
   - ✅ Your invite code
   - ✅ QR code image

---

## 🧪 Testing the Webhook

### Method 1: Stripe Dashboard Test
1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click on your Railway webhook endpoint
3. Click **"Send test webhook"**
4. Select `checkout.session.completed`
5. Click **"Send test webhook"**
6. Check the response - should show **200 OK**

### Method 2: Check Railway Logs
1. Go to Railway Dashboard → Your project
2. Click **"View Logs"**
3. Make a test payment
4. Look for these log messages:
   ```
   [Payment] ✅ Payment successful for user abc12345
   [Payment] Generated invite code ABCD1234EFGH5678 for User (4 uses)
   ```

---

## 🐛 Troubleshooting

### Issue: "Payment not processed yet, retrying..."

**Symptoms:** Frontend keeps retrying, never shows invite code

**Causes & Fixes:**

1. **Webhook not configured**
   - Fix: Complete Step 1 above
   - Verify: Check Stripe Dashboard → Webhooks → should show 200 responses

2. **Wrong webhook secret**
   - Fix: Copy exact secret from Stripe Dashboard
   - Update Railway environment variable
   - Redeploy

3. **Railway not receiving webhook**
   - Test: Send test webhook from Stripe Dashboard
   - Check Railway logs for incoming requests
   - Verify URL is correct: `https://napalmsky-production.up.railway.app/payment/webhook`

4. **CORS blocking webhook**
   - Not applicable - webhooks are server-to-server
   - But check ALLOWED_ORIGINS includes your Vercel domain

---

### Issue: "Webhook signature verification failed"

**Cause:** `STRIPE_WEBHOOK_SECRET` in Railway doesn't match Stripe Dashboard

**Fix:**
1. Go to Stripe Dashboard → Webhooks
2. Click your endpoint
3. Reveal signing secret
4. Copy EXACT value
5. Update in Railway (including `whsec_` prefix)
6. Redeploy Railway

---

### Issue: No invite code showing even after payment

**Cause:** Code generation failing on backend

**Fix:**
1. Check Railway logs for errors:
   ```
   [Payment] No userId in webhook payload
   [CodeGen] Error generating code
   ```

2. If you see errors, the payment succeeded but code generation failed
3. Users can still access the app, but won't have invite codes
4. Fix the error and they can request a code via support

---

### Issue: Frontend shows old cached build

**Cause:** Vercel caching old build with wrong API URL

**Fix:**
1. Vercel Dashboard → Your project
2. Settings → Environment Variables
3. Verify `NEXT_PUBLIC_API_BASE` is correct
4. Go to Deployments
5. Click latest deployment → Click **"Redeploy"**
6. Clear browser cache or use incognito mode

---

## 📊 Monitoring Production Payments

### Railway Logs to Watch:
```
[Payment] ✅ Payment successful for user abc12345
[Payment] Generated invite code ABCD1234EFGH5678
[QR] ✅ Successfully generated QR for code: ABCD1234EFGH5678
```

### Stripe Dashboard:
- Webhooks → Your endpoint → Should show successful deliveries (200 status)
- Payments → Should show test payments with $0.50

### Database Check (if using):
- Users should have:
  - `paidStatus: 'paid'`
  - `myInviteCode: 'XXXXXXXXXXXXXXXX'`
  - `paidAt: [timestamp]`

---

## 🚀 Going Live (Production Checklist)

When ready to accept real payments:

### 1. Switch to Live Stripe Keys

**Railway Variables:**
```env
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx  # NEW ONE for live mode
```

**Vercel Variables:**
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxx
```

### 2. Create Live Webhook in Stripe
1. Switch to **Live mode** in Stripe Dashboard
2. Go to Webhooks → Add endpoint
3. URL: `https://napalmsky-production.up.railway.app/payment/webhook`
4. Events: `checkout.session.completed`
5. Copy the NEW webhook secret
6. Update Railway's `STRIPE_WEBHOOK_SECRET`

### 3. Update Price (Optional)
If you want to charge more than $0.50:

Edit `/Users/hansonyan/Desktop/Napalmsky/server/src/payment.ts`:
```typescript
const PRICE_AMOUNT = 100; // $1.00 in cents
```

Redeploy Railway.

### 4. Test with Real Card
1. Make a real payment (will charge real money!)
2. Verify webhook processes correctly
3. **Immediately refund** from Stripe Dashboard
4. Once confirmed working, you're live!

---

## 🔐 Security Notes

- ✅ Webhook signature verification is enabled (good!)
- ✅ Rate limiting is enabled for `/payment/*` routes
- ✅ Session tokens required for all payment operations
- ⚠️ Test keys are safe to commit (no real money)
- ⚠️ **NEVER commit live keys to git**

---

## 📞 Quick Reference

**Stripe Dashboard:**
- Test mode: https://dashboard.stripe.com/test/webhooks
- Live mode: https://dashboard.stripe.com/webhooks

**Railway:**
- Dashboard: https://railway.app/dashboard
- Your project: [Find it in dashboard]

**Vercel:**
- Dashboard: https://vercel.com/dashboard
- Your project: [Find it in dashboard]

**Test Cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- More: https://stripe.com/docs/testing

---

## 🎯 Expected Timeline

Once webhook is configured correctly:

1. User clicks "Pay $0.50" → **Instant**
2. Stripe checkout page → **Instant**
3. User enters card → **2-3 seconds**
4. Stripe processes payment → **1-2 seconds**
5. Webhook fired to Railway → **< 1 second**
6. Railway processes webhook → **< 1 second**
7. Code generated → **< 1 second**
8. Frontend fetches status → **< 1 second**
9. Success page shows → **Done!**

**Total:** 5-10 seconds from click to success page

If it's taking longer or timing out, the webhook is not reaching Railway.

---

## 🆘 Still Not Working?

Run this diagnostic:

1. **Check Webhook Status:**
   - Stripe Dashboard → Webhooks → Click your endpoint
   - Look at "Recent deliveries"
   - Should show 200 responses
   - If 400/500 errors, click to see details

2. **Check Railway Logs:**
   ```
   Look for:
   [Payment] ✅ = Working
   [Payment] ⚠️ = Warnings
   [Payment] ❌ = Errors
   ```

3. **Test Webhook Manually:**
   - Stripe Dashboard → Send test webhook
   - Check if Railway receives it

4. **Check Environment Variables:**
   - Railway: Verify STRIPE_WEBHOOK_SECRET is set
   - Vercel: Verify NEXT_PUBLIC_API_BASE points to Railway

If all else fails, the issue might be with Railway's networking. Check:
- Railway service is deployed and running
- Railway domain is accessible: `curl https://napalmsky-production.up.railway.app/health`
- No rate limiting blocking Stripe's IP ranges

