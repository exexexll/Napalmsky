# ✅ Stripe Webhook Endpoint Verification

## 🎯 **Correct Endpoint:**

```
https://napalmsky-production.up.railway.app/payment/webhook
```

**This is CORRECT!** ✅

---

## 🔍 **Verification:**

### **1. Backend Route Exists:**

**File:** `server/src/payment.ts`

```typescript
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  // Webhook handler
});
```

**Mounted at:** `/payment`

**Full path:** `/payment/webhook` ✅

---

### **2. Stripe Dashboard Configuration:**

**Go to:** https://dashboard.stripe.com/test/webhooks

**Add endpoint:**
```
URL: https://napalmsky-production.up.railway.app/payment/webhook
Events: checkout.session.completed
```

**Get signing secret:** Starts with `whsec_...`

**Add to Railway:**
```
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
```

---

### **3. Test Webhook:**

**In Stripe Dashboard:**
1. Click your webhook endpoint
2. Click "Send test webhook"
3. Select event: `checkout.session.completed`
4. Click "Send test webhook"

**Check Railway logs for:**
```
✅ [Payment] ✅ Payment successful for user...
```

---

### **4. Common Issues:**

**Issue A: 404 Not Found**
- Endpoint URL wrong
- Payment router not mounted
- Check: `app.use('/payment', paymentRouter)`

**Issue B: 401/403 Unauthorized**
- STRIPE_WEBHOOK_SECRET wrong
- Signature verification failing

**Issue C: 500 Internal Error**
- Webhook processing code has bugs
- Check Railway logs for errors

---

## ✅ **Current Configuration:**

**Endpoint:** ✅ Correct  
**Route:** ✅ Exists  
**Needs:**
- Webhook secret in Railway Variables
- Webhook URL in Stripe Dashboard

---

**Is your webhook configured in Stripe Dashboard? That's the missing piece!** 🔧

