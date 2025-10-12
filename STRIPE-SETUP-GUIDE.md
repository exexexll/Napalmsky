# Stripe Setup Guide - Quick Start
**For:** Napalm Sky $1 Paywall  
**Time Required:** 10 minutes  
**Difficulty:** Easy

---

## 🚀 **Quick Setup (Development)**

### **Step 1: Get Stripe Test Keys (2 minutes)**

1. Go to https://dashboard.stripe.com/register
2. Create account (or login)
3. Dashboard → Developers → API Keys
4. Copy **"Secret key"** (starts with `sk_test_`)
5. Copy **"Publishable key"** (starts with `pk_test_`)

### **Step 2: Create .env File (1 minute)**

Create `/server/.env`:
```bash
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### **Step 3: Setup Webhook (5 minutes)**

**Option A: Stripe CLI (Recommended for Development)**
```bash
# Install
brew install stripe/stripe-cli/stripe

# Login (opens browser)
stripe login

# Forward webhooks to localhost
stripe listen --forward-to localhost:3001/payment/webhook

# Terminal will show:
# > Ready! Your webhook signing secret is whsec_xxxxx
# Copy this secret to your .env file
```

**Option B: ngrok (Alternative)**
```bash
# Install ngrok
brew install ngrok

# Expose local server
ngrok http 3001

# Copy HTTPS URL (e.g., https://abc123.ngrok-free.app)
# Go to Stripe Dashboard → Webhooks → Add endpoint
# Endpoint URL: https://abc123.ngrok-free.app/payment/webhook
# Events: checkout.session.completed
# Copy webhook secret to .env
```

### **Step 4: Test Payment (2 minutes)**

1. Restart your server (to load .env)
   ```bash
   cd server
   npm run dev
   ```

2. In another terminal (if using Stripe CLI):
   ```bash
   stripe listen --forward-to localhost:3001/payment/webhook
   ```

3. Open app: http://localhost:3000/onboarding

4. Create account → redirect to paywall

5. Click "Pay $1.00"

6. Use test card:
   ```
   Card: 4242 4242 4242 4242
   Expiry: 12/34 (any future date)
   CVC: 123 (any 3 digits)
   ZIP: 12345 (any postal code)
   ```

7. ✅ Payment should succeed → See your invite code!

---

## 🧪 **Test Cards**

| Card Number | Result | Use Case |
|-------------|--------|----------|
| `4242 4242 4242 4242` | ✅ Success | Normal payment |
| `4000 0000 0000 9995` | ❌ Decline (insufficient funds) | Test error handling |
| `4000 0000 0000 0002` | ❌ Decline (generic) | Test failure |
| `4000 0027 6000 3184` | 🔐 Requires 3D Secure | Test authentication |

All cards:
- Any future expiry (e.g., 12/34)
- Any 3-digit CVC
- Any postal code

---

## 📋 **Environment Variables Reference**

### **Server (.env)**
```bash
# Stripe (Required for payment)
STRIPE_SECRET_KEY=sk_test_51xxxxx          # From Stripe Dashboard
STRIPE_WEBHOOK_SECRET=whsec_xxxxx          # From webhook setup

# Database (Optional - using in-memory for now)
DATABASE_URL=postgresql://localhost/napalmsky

# Server Config
PORT=3001
NODE_ENV=development
```

### **Client (.env.local)**
```bash
# Stripe Public Key (for Stripe.js)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxx

# API Base URL
NEXT_PUBLIC_API_BASE=http://localhost:3001

# App URL (for webhook redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🔍 **Troubleshooting**

### **Problem: "Webhook secret not configured"**

**Solution:**
```bash
# Check server/.env has:
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Restart server after adding
```

### **Problem: "Payment succeeds but user not marked as paid"**

**Solution:**
```bash
# Check webhook is running:
stripe listen --forward-to localhost:3001/payment/webhook

# Check server logs for:
# [Payment] ✅ Payment successful for user xxx
# [Payment] Generated invite code xxx for UserName

# If not seeing logs: webhook not reaching server
```

### **Problem: "Invalid signature" on webhook"**

**Solution:**
```bash
# Webhook secret mismatch
# Get correct secret from:
stripe listen --forward-to localhost:3001/payment/webhook

# Or from Stripe Dashboard → Webhooks → endpoint → "Signing secret"
```

### **Problem: "Cannot find module 'stripe'"**

**Solution:**
```bash
cd server
npm install stripe qrcode @types/qrcode crypto-random-string
```

---

## 🎯 **Quick Test Flow**

### **Test Complete Paywall Flow (5 minutes):**

1. **Kill server, clear data:**
   ```bash
   # Server restarts = in-memory store cleared
   # Users will need to re-signup
   ```

2. **Start server with webhook listener:**
   ```bash
   # Terminal 1:
   cd server && npm run dev
   
   # Terminal 2:
   stripe listen --forward-to localhost:3001/payment/webhook
   ```

3. **Test payment:**
   - Go to http://localhost:3000/onboarding
   - Create account: Name="Test User", Gender="Male"
   - Should redirect to /paywall
   - Click "Pay $1.00"
   - Use card: 4242 4242 4242 4242
   - Complete payment
   - Should redirect to /payment-success
   - See invite code + QR image
   - Click "Continue to App"
   - Should access /main successfully ✅

4. **Test invite code:**
   - Copy your invite code from success page
   - Open incognito window
   - Go to http://localhost:3000/onboarding
   - Enter name + gender
   - Get redirected to paywall
   - Paste invite code
   - Click "Verify Code"
   - Should skip payment and access app ✅

5. **Test admin QR:**
   - Go to http://localhost:3000/admin
   - Click "QR Codes" tab
   - Enter label: "Test Event"
   - Click "Generate"
   - Download QR code
   - Scan with phone (or open link)
   - Signup should work
   - Code shows "UNLIMITED" ✅

---

## 🎓 **Understanding the Flow**

### **What Happens When You Pay:**

```mermaid
User clicks "Pay $1.00"
   ↓
POST /payment/create-checkout
   ↓
Stripe.checkout.sessions.create({
  amount: 100,
  metadata: { userId: xxx }
})
   ↓
Returns checkout URL
   ↓
User redirected to Stripe hosted page
   ↓
User enters card details
   ↓
Stripe processes payment
   ↓
Stripe calls webhook: POST /payment/webhook
   ↓
Server verifies signature
   ↓
Server updates user:
  - paidStatus = 'paid'
  - paidAt = now
  - paymentId = intent_xxx
   ↓
Server generates invite code:
  - code = random 16-char
  - type = 'user'
  - maxUses = 5
  - usesRemaining = 5
   ↓
User redirected to /payment-success
   ↓
Shows code + QR + "Continue to App"
```

---

## 🔐 **Security Deep Dive**

### **How Rate Limiting Prevents Brute Force:**

```
Attacker tries to guess codes:

Attempt 1: AAAAAAAAAAAAAAAA → Invalid (4 attempts left)
Attempt 2: AAAAAAAAAAAAAAAB → Invalid (3 attempts left)
Attempt 3: AAAAAAAAAAAAAAAC → Invalid (2 attempts left)
Attempt 4: AAAAAAAAAAAAAAAD → Invalid (1 attempt left)
Attempt 5: AAAAAAAAAAAAAAAE → Invalid (0 attempts left)
Attempt 6: AAAAAAAAAAAAAAAF → 429 Too Many Attempts

Wait 1 hour...

Attempt 7: AAAAAAAAAAAAAAAG → Invalid (4 attempts left)
...

With 36^16 combinations and 5 attempts/hour:
Time to brute force = 36^16 / 5 / 24 / 365 = billions of years
```

**Conclusion:** ✅ Impossible to brute force

### **How Webhook Signature Prevents Fake Payments:**

```
Attacker tries to fake payment:

POST /payment/webhook
Headers: {}
Body: { "userId": "attacker", "paid": true }

↓

Server checks signature:
const sig = req.headers['stripe-signature']; // undefined

stripe.webhooks.constructEvent(body, sig, secret);
↓
Throws error: "No signatures found"
↓
Returns 400 Bad Request
↓
Payment NOT processed
```

**Attacker tries with fake signature:**

```
Headers: { 'stripe-signature': 'fake_signature' }

↓

stripe.webhooks.constructEvent(body, sig, secret);
↓
Verifies HMAC-SHA256 signature
↓
Signature invalid (only Stripe knows the secret)
↓
Throws error: "Signature verification failed"
↓
Payment NOT processed
```

**Conclusion:** ✅ Only Stripe can trigger payment confirmations

---

## 💡 **Pro Tips**

### **For Development:**

1. **Use Stripe CLI** for instant webhook testing
   - No need for ngrok
   - Sees webhooks in real-time
   - Great for debugging

2. **Keep webhook terminal open** while testing payments
   - See webhook events instantly
   - Debug payload issues
   - Confirm signature verification

3. **Use test mode** for all development
   - No real charges
   - Unlimited test payments
   - Same features as production

### **For Production:**

1. **Monitor webhooks** in Stripe Dashboard
   - Webhooks → Your endpoint
   - See success/failure rate
   - Debug failed webhooks

2. **Set up alerts** for:
   - Failed webhook deliveries
   - Chargebacks
   - Unusual payment patterns

3. **Log everything**:
   - Every payment attempt
   - Every code validation
   - Every rate limit hit

---

## 🎉 **You're Ready!**

Run this command to test everything:

```bash
# Terminal 1: Start server
cd /Users/hansonyan/Desktop/Napalmsky/server && npm run dev

# Terminal 2: Start webhook listener
stripe listen --forward-to localhost:3001/payment/webhook

# Terminal 3: Start client
cd /Users/hansonyan/Desktop/Napalmsky && npm run dev

# Then: Open http://localhost:3000 and test!
```

**Quick Test:**
1. Sign up → redirects to paywall ✅
2. Pay with 4242... card ✅
3. See invite code ✅
4. Access /main successfully ✅

**You're done!** 🎉

---

*Guide Created: October 10, 2025*  
*Last Updated: After full implementation*  
*Tested: Pending Stripe keys*

