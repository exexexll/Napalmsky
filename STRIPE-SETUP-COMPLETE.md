# 💳 Stripe Setup Guide for Napalm Sky

**Complete walkthrough for payment integration**

---

## 📋 Overview

Your Napalm Sky platform uses Stripe for:
- **$0.01 one-time payment** (paywall)
- **QR code generation** (4 friend invites after payment)
- **Webhook processing** (automatic verification)

**Time Required:** 20-30 minutes  
**Cost:** Free Stripe account + $0.30 per transaction

---

## Part 1: Create Stripe Account (5 minutes)

### Step 1.1: Sign Up

1. Go to: **https://stripe.com**
2. Click **"Sign up"** (top right)
3. Enter:
   - Email address
   - Full name
   - Country: **United States** (or your country)
   - Password
4. Click **"Create account"**
5. Verify your email (check inbox)

### Step 1.2: Business Information

Stripe will ask about your business:

**Business Type:**
- Choose: **"Individual"** or **"Sole proprietorship"**

**Business Details:**
- Business name: `Napalm Sky` (or your name)
- Industry: `Software as a Service (SaaS)`
- Website: `napalmsky.com` (or leave blank for now)
- Product description: `Speed dating video platform`

**Personal Information:**
- Legal name
- Date of birth
- Last 4 digits of SSN (US only, for tax purposes)
- Home address

**Bank Account (for payouts):**
- Routing number
- Account number
- Or: Connect via Plaid (instant verification)

**Note:** You can skip some steps and complete them later. Stripe gives you full test mode access immediately.

---

## Part 2: Get Your API Keys (2 minutes)

### Step 2.1: Access API Keys

1. Log into Stripe Dashboard: **https://dashboard.stripe.com**
2. Click **"Developers"** (top right)
3. Click **"API keys"** (left sidebar)

You'll see 4 keys:

### Step 2.2: Test Keys (for development)

Copy these first - you'll use them for testing:

**Publishable key (test):**
```
pk_test_51Abc123...
```
- Safe to expose in frontend code
- Starts with `pk_test_`

**Secret key (test):**
```
sk_test_51Abc123...
```
- NEVER expose publicly
- Keep secret in backend only
- Starts with `sk_test_`

### Step 2.3: Live Keys (for production)

**Don't use these yet!** Copy them for later:

**Publishable key (live):**
```
pk_live_51Abc123...
```

**Secret key (live):**
```
sk_live_51Abc123...
```

**⚠️ IMPORTANT:** Keep live keys secret! Don't commit to Git, don't share publicly.

---

## Part 3: Test Mode Setup (10 minutes)

### Step 3.1: Configure Backend Environment Variables

Open your project and create/edit the environment file:

**For Railway deployment:**
1. Go to Railway.app → Your project
2. Click on backend service
3. Click **"Variables"** tab
4. Add these:

```bash
# Stripe Test Keys (for development)
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_KEY_HERE  # We'll get this in Step 3.3
```

**For local testing:**
```bash
# Create server/.env file
cd /Users/hansonyan/Desktop/Napalmsky/server
touch .env

# Add to .env:
PORT=3001
NODE_ENV=development
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_KEY  # From Step 3.3
ALLOWED_ORIGINS=http://localhost:3000
```

### Step 3.2: Configure Frontend Environment Variables

**For Vercel deployment:**
1. Go to Vercel.com → Your project
2. **Settings** → **Environment Variables**
3. Add:

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
```

**For local testing:**
```bash
# Create .env.local in root directory
cd /Users/hansonyan/Desktop/Napalmsky
touch .env.local

# Add:
NEXT_PUBLIC_API_BASE=http://localhost:3001
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_KEY
```

### Step 3.3: Set Up Webhook (CRITICAL)

Webhooks tell your backend when a payment succeeds.

#### For Testing Locally (Stripe CLI):

1. **Install Stripe CLI:**
   ```bash
   # On Mac:
   brew install stripe/stripe-cli/stripe
   
   # On Windows:
   # Download from: https://github.com/stripe/stripe-cli/releases
   ```

2. **Login to Stripe:**
   ```bash
   stripe login
   # Opens browser to authorize
   ```

3. **Forward webhooks to localhost:**
   ```bash
   stripe listen --forward-to http://localhost:3001/payment/webhook
   
   # Output will show:
   # > Ready! Your webhook signing secret is whsec_abc123...
   # COPY THIS SECRET!
   ```

4. **Add to your server/.env:**
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_abc123...  # From above
   ```

5. **Keep this terminal open** while testing locally

#### For Production (Railway/Vercel):

1. Go to Stripe Dashboard: **https://dashboard.stripe.com/webhooks**
2. Click **"Add endpoint"**
3. **Endpoint URL:**
   ```
   https://api.napalmsky.com/payment/webhook
   ```
   (Or use your Railway URL if DNS not set up yet)

4. **Events to send:** Select these:
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.succeeded`
   
   Or just select **"All events"** (easier)

5. Click **"Add endpoint"**

6. Click on the webhook you just created

7. Scroll to **"Signing secret"** section

8. Click **"Reveal"** and copy the secret (starts with `whsec_`)

9. Add to Railway:
   - Railway → Variables → `STRIPE_WEBHOOK_SECRET=whsec_...`

---

## Part 4: Test Payments (5 minutes)

### Step 4.1: Start Your App

**Local testing:**
```bash
# Terminal 1 - Frontend
cd /Users/hansonyan/Desktop/Napalmsky
npm run dev

# Terminal 2 - Backend  
cd server
npm run dev

# Terminal 3 - Stripe webhook forwarding
stripe listen --forward-to http://localhost:3001/payment/webhook
```

**Or use deployed version:**
- Just visit https://napalmsky.com

### Step 4.2: Test Full Payment Flow

1. **Visit your app:** http://localhost:3000 or https://napalmsky.com

2. **Sign up:**
   - Name: Test User
   - Gender: Any
   - Take selfie (use webcam)
   - Record video

3. **Paywall should appear:**
   - Shows: "Pay $0.01 to continue"
   - Click **"Pay with Stripe"**

4. **Stripe Checkout opens:**
   - Should redirect to Stripe hosted page
   - URL will be: `checkout.stripe.com/...`

5. **Use test card:**
   ```
   Card number: 4242 4242 4242 4242
   Expiration: Any future date (e.g., 12/25)
   CVC: Any 3 digits (e.g., 123)
   ZIP: Any 5 digits (e.g., 12345)
   Name: Test User
   ```

6. **Click "Pay $0.01"**

7. **Should redirect back to:**
   - `/payment-success?session_id=...`
   - Shows: "Payment successful! Here's your QR code"
   - Displays QR code with 4 uses remaining

8. **Verify in Stripe Dashboard:**
   - Go to: https://dashboard.stripe.com/test/payments
   - Should see $0.01 payment
   - Status: "Succeeded"

### Step 4.3: Test Webhook

**Check backend logs:**
```bash
# Should see:
[Payment] Webhook received: checkout.session.completed
[Payment] Payment successful for user: abc123
[Payment] Generated QR code: XXXXXXXX
[Payment] User can now access platform
```

**Check Stripe webhook logs:**
1. Dashboard → Developers → Webhooks
2. Click your webhook
3. Should show recent events with ✅ green checkmarks

### Step 4.4: Verify User Access

1. After payment, you should reach main dashboard
2. Click **"Matchmake"**
3. Should see available users (if any online)
4. No paywall should appear again

**Test QR code:**
1. Go to `/paywall` page
2. Should see your QR code
3. "Uses remaining: 4"
4. Copy the invite code

5. **Test invite code (new incognito window):**
   - Sign up as new user
   - At paywall, enter invite code
   - Should bypass payment
   - Uses remaining decreases to 3

---

## Part 5: Additional Test Cards

### Successful Payments

```bash
# Basic success
4242 4242 4242 4242

# 3D Secure authentication (extra popup)
4000 0027 6000 3184
```

### Declined Cards (for testing errors)

```bash
# Insufficient funds
4000 0000 0000 9995

# Card declined
4000 0000 0000 0002

# Expired card
4000 0000 0000 0069
```

**Full list:** https://stripe.com/docs/testing

---

## Part 6: Go Live with Real Payments (5 minutes)

### ⚠️ Before Going Live Checklist:

- [ ] Stripe account fully verified (business info, bank account)
- [ ] Tested payment flow in test mode (works perfectly)
- [ ] Webhook configured for production URL
- [ ] SSL certificate active (https://)
- [ ] Terms of Service page created
- [ ] Privacy Policy page created
- [ ] Refund policy decided

### Step 6.1: Activate Live Mode

1. Go to Stripe Dashboard: https://dashboard.stripe.com
2. Top left: Toggle **"Test mode"** to **OFF**
3. Stripe will prompt you to complete verification (if not done)

### Step 6.2: Replace with Live Keys

**Update Railway variables:**
```bash
# REPLACE test keys with live keys:
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
# Keep webhook secret from production webhook (starts with whsec_)
```

**Update Vercel variables:**
```bash
# REPLACE test key with live key:
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY
```

### Step 6.3: Redeploy

**Railway:**
- Variables → Save → Auto-redeploys

**Vercel:**
- Deployments → Click "..." → Redeploy

**Wait 2-3 minutes for deployment**

### Step 6.4: Test with Real Card

1. Visit https://napalmsky.com
2. Sign up with real account
3. At paywall, click "Pay $0.01"
4. **Use a REAL card** (you'll be charged $0.01)
5. Verify payment completes
6. Check Stripe Dashboard (live mode) for payment

**Note:** You can refund yourself:
- Dashboard → Payments → Click payment → Refund

---

## Part 7: Stripe Dashboard Tour

### Key Pages to Bookmark

**Payments:**
- https://dashboard.stripe.com/payments
- See all transactions
- Issue refunds
- Export data

**Customers:**
- https://dashboard.stripe.com/customers
- See who paid
- View payment history per customer

**Webhooks:**
- https://dashboard.stripe.com/webhooks
- Monitor webhook delivery
- Debug failed events
- Resend events

**Logs:**
- https://dashboard.stripe.com/logs
- See all API requests
- Debug errors
- Check request/response details

**Reports:**
- https://dashboard.stripe.com/reports/balance
- Revenue analytics
- Payout schedule
- Tax documents

---

## Part 8: Monitoring & Maintenance

### Daily Checks (First Week)

- [ ] Check payments page: any failures?
- [ ] Webhook logs: all events succeeded?
- [ ] User complaints about payment?

### Weekly Checks

- [ ] Review total revenue
- [ ] Check refund requests
- [ ] Verify webhook is still working
- [ ] Update API keys if expired (they don't expire, but good to check)

### Monthly Tasks

- [ ] Review Stripe fees ($0.30 + 2.9% per transaction)
- [ ] Check for failed/disputed payments
- [ ] Export payment data for accounting
- [ ] Reconcile payouts with bank account

---

## Part 9: Common Issues & Fixes

### Issue: "Stripe is not defined"

**Cause:** Frontend can't load Stripe.js

**Fix:**
```typescript
// In your payment component, verify:
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);
```

**Check:** Environment variable is set in Vercel

### Issue: "Invalid API Key"

**Cause:** Wrong key or not set

**Check:**
1. Key starts with `sk_test_` (test) or `sk_live_` (live)
2. Key is set in Railway variables
3. No spaces before/after key
4. Backend redeployed after adding key

### Issue: "Webhook signature verification failed"

**Cause:** Wrong webhook secret or Stripe sent to wrong endpoint

**Fix:**
1. Check webhook URL is correct: `https://api.napalmsky.com/payment/webhook`
2. Verify `STRIPE_WEBHOOK_SECRET` matches webhook secret in dashboard
3. Check webhook secret starts with `whsec_`
4. In code, verify you're using `express.raw()` middleware:
   ```typescript
   // In server/src/index.ts or payment.ts
   router.post('/webhook', 
     express.raw({ type: 'application/json' }), 
     webhookHandler
   );
   ```

### Issue: "Payment succeeds but user not verified"

**Cause:** Webhook not reaching backend or failing

**Debug:**
1. Stripe Dashboard → Webhooks → Your webhook
2. Click on it → View recent events
3. If shows ❌ red X, webhook failed
4. Click event → See error message
5. Fix error in backend code
6. Resend event (button at top)

**Common fixes:**
- Database not saving user update
- Wrong user ID in webhook
- Session not found

### Issue: "Checkout page doesn't load"

**Cause:** Stripe checkout session creation failed

**Check backend logs:**
```bash
# Railway: View logs
# Look for:
[Payment] Failed to create checkout: ...
```

**Common causes:**
- Invalid API key
- Price amount wrong (must be in cents: 1 = $0.01)
- Invalid success/cancel URLs

### Issue: "QR code not generating after payment"

**Cause:** QR code generation logic not running

**Check:**
1. Webhook received? (Stripe dashboard)
2. Backend logs show QR generation?
3. Database updated with `paidStatus='paid'`?

**Fix:**
```bash
# Check user in database:
psql $DATABASE_URL
SELECT user_id, name, paid_status, my_invite_code FROM users WHERE email='test@example.com';

# Should show:
# paid_status = 'paid'
# my_invite_code = 'XXXXXXXX' (8 characters)
```

---

## Part 10: Security Best Practices

### ✅ DO:

- ✅ Use environment variables for keys (never hardcode)
- ✅ Keep secret keys secret (never commit to Git)
- ✅ Verify webhook signatures (code already does this)
- ✅ Use HTTPS in production (Railway/Vercel auto-provide)
- ✅ Validate amounts server-side (code already does this)
- ✅ Log all payment events (code already does this)

### ❌ DON'T:

- ❌ Expose secret keys in frontend code
- ❌ Trust payment amounts from frontend (always set server-side)
- ❌ Skip webhook signature verification
- ❌ Store card numbers (Stripe handles this)
- ❌ Process payments without HTTPS
- ❌ Ignore failed webhook events

---

## Part 11: Pricing Changes (Optional)

Your current pricing: **$0.01** one-time payment

### To Change Price:

**Option 1: Change in code (requires redeploy)**

Edit `server/src/payment.ts`:
```typescript
// Line ~15
const PRICE_AMOUNT = 1; // $0.01 in cents

// Change to:
const PRICE_AMOUNT = 99; // $0.99 in cents
const PRICE_AMOUNT = 499; // $4.99 in cents
```

Redeploy backend.

**Option 2: Use Stripe Products (advanced)**

Create product in Stripe Dashboard:
1. Products → Add product
2. Name: "Napalm Sky Access"
3. Price: $0.99
4. Copy Price ID: `price_abc123`

Update code to use Price ID instead of hardcoded amount.

---

## Part 12: Stripe Fees Breakdown

### Per Transaction:

```
$0.01 payment:
- Customer pays: $0.01
- Stripe fee: $0.30 + 2.9% = $0.30
- You receive: -$0.29 (you lose money!)

$0.99 payment:
- Customer pays: $0.99
- Stripe fee: $0.30 + $0.03 = $0.33
- You receive: $0.66

$4.99 payment:
- Customer pays: $4.99
- Stripe fee: $0.30 + $0.14 = $0.44
- You receive: $4.55
```

**💡 Tip:** At $0.01, you lose money on Stripe fees. Consider raising to $0.99 minimum to be profitable per transaction.

### Monthly Costs:

No monthly fees! Only pay per transaction.

### Payout Schedule:

- Default: Every 2 days (rolling basis)
- Minimum payout: $1.00
- Goes to your bank account

---

## Part 13: Testing Checklist

Before going live, test these scenarios:

### Successful Payment Flow
- [ ] User signs up
- [ ] Clicks "Pay $0.01"
- [ ] Completes payment
- [ ] Redirected to success page
- [ ] QR code generated (4 uses)
- [ ] User can access matchmaking
- [ ] Database shows `paid_status='paid'`

### Invite Code Flow
- [ ] User 1 pays and gets QR code
- [ ] User 2 signs up
- [ ] User 2 enters invite code at paywall
- [ ] User 2 bypasses payment
- [ ] User 1's code shows 3 uses remaining
- [ ] Both users can access platform

### Error Handling
- [ ] Test with declined card (4000 0000 0000 0002)
- [ ] Shows error message
- [ ] User can retry
- [ ] Payment eventually succeeds

### Webhook Reliability
- [ ] Complete payment
- [ ] Check Stripe webhook logs (all green ✅)
- [ ] Check backend logs (webhook processed)
- [ ] User verified within 5 seconds

---

## 📞 Stripe Support Resources

**Dashboard:** https://dashboard.stripe.com  
**Documentation:** https://stripe.com/docs  
**API Reference:** https://stripe.com/docs/api  
**Support:** https://support.stripe.com (chat/email)  
**Status Page:** https://status.stripe.com  
**Community:** https://stackoverflow.com/questions/tagged/stripe-payments

**Testing Cards:** https://stripe.com/docs/testing  
**Webhook Testing:** https://stripe.com/docs/webhooks/test

---

## ✅ Setup Complete!

You should now have:

- ✅ Stripe account created
- ✅ Test keys configured (frontend + backend)
- ✅ Live keys ready (not active yet)
- ✅ Webhook endpoint configured
- ✅ Test payment completed successfully
- ✅ QR code generation working
- ✅ Invite codes working

**Next steps:**
1. Follow deployment guide: `QUICK-DEPLOY-CHECKLIST.md`
2. Deploy to Railway + Vercel
3. Test with real card (once live)
4. Start accepting real payments! 💰

---

**Questions about Stripe setup?** Check this guide or Stripe's excellent docs: https://stripe.com/docs

**Ready to deploy?** Follow: `QUICK-DEPLOY-CHECKLIST.md`

