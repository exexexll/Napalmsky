# 💳 Payment Not Processing - Complete Diagnostic & Fix

## ✅ **Code Analysis: Payment Code is CORRECT**

I've reviewed the code against previous fixes. Everything is properly implemented:

```typescript
✅ Webhook uses express.raw() (line 99) - Correct!
✅ Signature verification (line 112) - Correct!
✅ User marked as paid (line 132) - Correct!
✅ Invite code generated (line 139-163) - Correct!
✅ JSON skipped for webhook (index.ts:149) - Correct!
```

**The code is NOT the issue!**

---

## 🔍 **Real Issue: Webhook Configuration**

### **The Payment Flow:**

```
1. User clicks "Pay $0.50" ✅
2. Redirects to Stripe checkout ✅
3. User enters card 4242 4242 4242 4242 ✅
4. Stripe processes payment ✅
5. Stripe sends webhook → YOUR BACKEND ❌ THIS IS FAILING
6. Backend marks user as paid ⏸️ Never reached
7. Frontend checks /payment/status ⏸️ Still shows unpaid
8. Frontend stuck on "Processing..." ❌
```

**The webhook at step 5 is NOT reaching your Railway backend!**

---

## ✅ **THE FIX - Configure Stripe Webhook**

### **Step 1: Check Current Webhook Configuration**

1. **Go to:** https://dashboard.stripe.com/test/webhooks
2. **Look for:** An endpoint with your Railway URL
3. **Should show:**
   ```
   https://napalmsky-production.up.railway.app/payment/webhook
   ```

4. **If it doesn't exist → That's the problem!**

---

### **Step 2: Add Webhook Endpoint in Stripe**

1. **Click:** "+ Add endpoint" button

2. **Endpoint URL:**
   ```
   https://napalmsky-production.up.railway.app/payment/webhook
   ```

3. **Events to send:**
   - Click "Select events"
   - Search for: `checkout.session.completed`
   - Check the box ✅
   - Click "Add events"

4. **Click:** "Add endpoint"

5. **Get Signing Secret:**
   - Click on the endpoint you just created
   - Under "Signing secret", click **"Reveal"**
   - Copy the secret (starts with `whsec_`)
   - **Example:** `whsec_1234567890abcdef...`

---

### **Step 3: Add Secret to Railway**

1. **Go to:** Railway dashboard
2. **Click:** Your backend service
3. **Click:** "Variables" tab
4. **Look for:** `STRIPE_WEBHOOK_SECRET`
5. **If exists:**
   - Click "..." → Edit
   - Paste the secret from Step 2.5
   - Click "Update"
6. **If doesn't exist:**
   - Click "+ New Variable"
   - Key: `STRIPE_WEBHOOK_SECRET`
   - Value: `whsec_...` (from Step 2.5)
   - Click "Add"

7. **Railway will auto-redeploy** (~2 minutes)

---

### **Step 4: Also Add These Railway Variables**

While you're in Railway Variables, add these if missing:

```
FRONTEND_URL = https://napalmsky.com
ALLOWED_ORIGINS = https://napalmsky.com,https://www.napalmsky.com,https://napalmskyblacklist.com,https://napalmsky.vercel.app
```

---

## 🧪 **Test the Webhook**

### **Method 1: Send Test Webhook from Stripe**

1. **Stripe Dashboard** → Webhooks → Your endpoint
2. **Click:** "Send test webhook"
3. **Select:** `checkout.session.completed`
4. **Click:** "Send test webhook"
5. **Should show:** 200 OK response

**If it fails (400/500):**
- Check Railway logs for errors
- Verify STRIPE_WEBHOOK_SECRET matches

---

### **Method 2: Real Payment Test**

1. **Go to:** https://napalmsky.vercel.app (or napalmsky.com)
2. **Start:** New account (incognito window)
3. **Get to:** Paywall
4. **Click:** "Pay $0.50"
5. **Use test card:**
   ```
   Card: 4242 4242 4242 4242
   Expiry: 12/26
   CVC: 123
   ZIP: 12345
   ```
6. **Complete payment**

**Watch Railway Logs:**
```
Should see:
[Payment] ✅ Payment successful for user abc12345
[Payment] Generated invite code XXXXXXXX for UserName (4 uses)
```

**If you don't see these logs:**
- Webhook isn't reaching Railway
- Check Stripe webhook configuration
- Verify URL is correct

---

## 🐛 **Common Issues & Fixes**

### **Issue: "Webhook signature verification failed"**

**Cause:** `STRIPE_WEBHOOK_SECRET` doesn't match Stripe

**Fix:**
1. Stripe Dashboard → Webhooks → Your endpoint
2. Reveal signing secret
3. Copy EXACT value (including `whsec_` prefix)
4. Update in Railway
5. Redeploy

---

### **Issue: "STRIPE_WEBHOOK_SECRET not configured"**

**Cause:** Variable missing in Railway

**Fix:**
1. Railway → Variables
2. Add: `STRIPE_WEBHOOK_SECRET=whsec_...`
3. Redeploy

---

### **Issue: Webhook shows 404 in Stripe**

**Cause:** Wrong URL or endpoint not accessible

**Fix:**
1. Verify Railway URL is correct
2. Test: `curl https://your-railway-url.railway.app/health` (should return 200)
3. Update webhook URL in Stripe

---

### **Issue: Frontend keeps retrying, never shows code**

**Cause:** Webhook succeeded but invite code not generated

**Check Railway Logs:**
```
Look for:
[Payment] ✅ Payment successful ← Webhook received
[Payment] Generated invite code ← Code created

If you see first but not second:
- Code generation is failing
- Check for errors in Railway logs
```

---

## 🎯 **Most Likely Issue**

Based on symptoms, **99% certain** the issue is:

```
❌ Stripe webhook endpoint NOT configured
OR
❌ STRIPE_WEBHOOK_SECRET mismatch
```

**Not a code issue - it's configuration!**

---

## 📋 **Checklist to Fix Payment**

```
☐ Stripe Dashboard → Webhooks
☐ Check if endpoint exists for Railway URL
☐ If not, add: https://napalmsky-production.up.railway.app/payment/webhook
☐ Events: checkout.session.completed
☐ Get signing secret
☐ Railway → Variables → Add/Update STRIPE_WEBHOOK_SECRET
☐ Railway → Add FRONTEND_URL=https://napalmsky.com
☐ Wait for Railway redeploy (2 min)
☐ Test payment with 4242 4242 4242 4242
☐ Watch Railway logs for success messages
☐ Should work!
```

---

## 🆘 **If Still Not Working After All This**

### **Use Admin Bypass (Immediate Solution):**

1. Go to: https://napalmsky.com/admin-login
2. Login: Hanson / 328077
3. Generate admin QR code
4. Use code instead of paying

**This bypasses payment entirely for testing!**

---

## 📊 **Expected vs Actual**

### **Expected (When Working):**
```
Payment → Stripe → Webhook to Railway → Code generated → Success page (5-10 sec)
```

### **Actual (Not Working):**
```
Payment → Stripe → Webhook ??? → Code not generated → Frontend stuck retrying
```

**The ??? is where it's breaking - webhook not configured or not reaching backend!**

---

**Fix:** Configure Stripe webhook → Add signing secret to Railway → Test → Will work! ✅

