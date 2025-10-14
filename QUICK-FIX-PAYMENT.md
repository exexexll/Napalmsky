# 🚀 Quick Fix: Payment Not Working

## Status: Railway ✅ Online | Stripe Webhook ❌ Not Configured

Your backend is live, you just need to connect Stripe to it.

---

## 🎯 3-Minute Fix

### Step 1: Configure Stripe Webhook (2 minutes)

1. **Open Stripe Dashboard:**
   - Go to: https://dashboard.stripe.com/test/webhooks
   - Click **"Add endpoint"** button

2. **Enter Webhook Details:**
   ```
   Endpoint URL: https://napalmsky-production.up.railway.app/payment/webhook
   
   Listen to: ☑️ checkout.session.completed
   ```

3. **Save and Get Secret:**
   - Click **"Add endpoint"**
   - Click on the newly created endpoint
   - Under "Signing secret", click **"Reveal"**
   - Copy the secret (starts with `whsec_`)

### Step 2: Update Railway (1 minute)

1. **Go to Railway:**
   - https://railway.app/dashboard
   - Select your "Napalmsky" project
   - Click on your backend service

2. **Add Environment Variable:**
   - Click **"Variables"** tab
   - Find `STRIPE_WEBHOOK_SECRET` or click "New Variable"
   - Paste the secret from Step 1.3:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
   - Click **"Add"** or **"Update"**
   - Railway will automatically redeploy (takes ~2 minutes)

### Step 3: Test Payment (1 minute)

1. Go to your Vercel deployment
2. Navigate to `/onboarding`
3. Enter name and create account
4. Click **"Pay $0.50"**
5. Use test card:
   - **Card:** `4242 4242 4242 4242`
   - **Expiry:** `12/25`
   - **CVC:** `123`
6. Click "Pay"

**Expected:** Redirects to `/payment-success` showing your invite code + QR code!

---

## 🐛 If Still Not Working

### Check Railway Logs:

1. Railway Dashboard → Your project → Click "View Logs"
2. Make a test payment
3. Look for:
   ```
   ✅ [Payment] Payment successful for user xxx
   ✅ [Payment] Generated invite code XXXXXXXX
   ```

### Check Stripe Webhook Status:

1. Stripe Dashboard → Webhooks → Click your endpoint
2. Look at "Recent deliveries"
3. Should show **200** responses
4. If showing **400/500 errors**, click to see details:
   - **400:** Wrong webhook secret (fix in Railway variables)
   - **500:** Server error (check Railway logs)

---

## 📸 Visual Guide

### Stripe Dashboard - Add Endpoint:
```
┌─────────────────────────────────────────────────┐
│ Add endpoint                                    │
├─────────────────────────────────────────────────┤
│                                                 │
│ Endpoint URL:                                   │
│ ┌─────────────────────────────────────────────┐ │
│ │ https://napalmsky-production.up.railway.app │ │
│ │ /payment/webhook                            │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Events to send:                                 │
│ ☑️ checkout.session.completed                   │
│                                                 │
│              [Add endpoint] [Cancel]            │
└─────────────────────────────────────────────────┘
```

### Railway - Add Variable:
```
┌─────────────────────────────────────────────────┐
│ Variables                                       │
├─────────────────────────────────────────────────┤
│                                                 │
│ STRIPE_WEBHOOK_SECRET                           │
│ ┌─────────────────────────────────────────────┐ │
│ │ whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx    │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│              [Add]                              │
└─────────────────────────────────────────────────┘
```

---

## ✅ Success Indicators

### Frontend (after payment):
- ✅ Green checkmark
- ✅ "Payment Successful"
- ✅ 16-character invite code shown
- ✅ QR code image displayed
- ✅ "Copy Code" button works

### Railway Logs:
```
[Payment] ✅ Payment successful for user abc12345
[Payment] Generated invite code ABCD1234EFGH5678 for John (4 uses)
[QR] ✅ Successfully generated QR for code: ABCD1234EFGH5678
```

### Stripe Dashboard:
- Recent deliveries show **200 OK**
- Event type: `checkout.session.completed`
- Timestamp: matches your test time

---

## 🔧 Alternative: Manual Webhook Test

Want to test without making a payment?

1. Stripe Dashboard → Webhooks → Your endpoint
2. Click **"Send test webhook"**
3. Select `checkout.session.completed`
4. Click **"Send test webhook"**
5. Check Railway logs for response

This tests if the webhook URL is reachable.

---

## 📞 Quick Links

- **Stripe Webhooks:** https://dashboard.stripe.com/test/webhooks
- **Railway Dashboard:** https://railway.app/dashboard
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Test Cards:** https://stripe.com/docs/testing

---

## 🎓 What's Happening Behind the Scenes

```
User clicks "Pay"
    ↓
Stripe processes payment
    ↓
Stripe sends webhook to Railway:
    POST https://napalmsky-production.up.railway.app/payment/webhook
    ↓
Railway receives event, verifies signature with STRIPE_WEBHOOK_SECRET
    ↓
Railway marks user as paid
    ↓
Railway generates 16-char invite code (4 uses)
    ↓
Railway stores code in database
    ↓
User frontend polls /payment/status
    ↓
Gets back: { paidStatus: 'paid', myInviteCode: 'XXX...' }
    ↓
Shows success page!
```

**Key:** The `STRIPE_WEBHOOK_SECRET` is what allows Railway to verify the webhook is truly from Stripe (security).

---

## 🚨 Common Mistakes

❌ **Using local webhook secret on Railway**
   - Local dev uses: `whsec_f1dd3ab1058b38458f67a938e39dd0815f57dac9ffd65395b50f31accd075e9c`
   - Railway needs: NEW secret from Stripe Dashboard webhook

❌ **Wrong webhook URL**
   - Correct: `https://napalmsky-production.up.railway.app/payment/webhook`
   - Wrong: `http://` (no SSL), `/payments/webhook` (wrong path), `localhost` (not accessible)

❌ **Not waiting for Railway to redeploy**
   - After changing variables, Railway needs 1-2 minutes to redeploy
   - Check deployment status before testing

---

## 💰 Cost

- **Stripe Test Mode:** FREE (no real money)
- **Railway:** ~$5/month (500 hours free tier)
- **Vercel:** FREE (hobby tier)

Total cost to test: **$0**

---

That's it! Once the webhook is configured, payments will work instantly. 🎉

