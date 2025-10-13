# 💳 Payment Webhook Solution

**Issue:** Stripe payments aren't being processed  
**Status:** Fixed locally, deployment instructions below  
**Workaround:** Use admin QR codes

---

## 🔍 **Root Cause Analysis**

### **Why Webhooks Don't Work Locally:**

Stripe webhooks work like this:

```
1. User completes payment on Stripe.com
2. Stripe servers send webhook to YOUR backend
3. Problem: Your backend is localhost:3001
4. Stripe can't reach localhost (it's on your computer!)
5. Solution: Use Stripe CLI to forward webhooks
```

### **What Was Wrong:**

1. ❌ `express.json()` was parsing ALL requests (including webhooks)
2. ❌ Stripe webhook needs RAW body to verify signature
3. ❌ Parsed body = invalid signature = rejected webhook
4. ❌ Payment never marked as "paid"
5. ❌ Frontend stuck in "Processing..." loop

### **What I Fixed:**

1. ✅ Skip JSON parsing for `/payment/webhook` route
2. ✅ Webhook now gets raw body for signature verification
3. ✅ Added retry limit (max 5 attempts = 10 seconds)
4. ✅ Show "Continue to App" button after 6 seconds
5. ✅ Fixed rate limiter validation errors

---

## ✅ **Solution: Use Admin Bypass (Recommended for Local Testing)**

### **Step 1: Access Admin Panel**

**In your browser:**
```javascript
// Clear any stuck state
localStorage.clear()
// Go to admin login
location.href = 'http://localhost:3000/admin-login'
```

### **Step 2: Login**
- Username: `Hanson`
- Password: `328077`

### **Step 3: Generate QR Code**
1. Click **"QR Codes"** tab
2. Enter label: `Testing`
3. Click **"Generate Admin QR Code"**
4. **Copy the 16-character code** (e.g., `A1B2C3D4E5F6G7H8`)

### **Step 4: Use Code to Bypass Payment**
1. **New incognito window**
2. Sign up as new user
3. Upload selfie & video
4. At paywall: **Enter the admin code**
5. ✅ Access granted!

**This is the EASIEST way to test locally!** ✅

---

## 🔧 **Alternative: Fix Webhook Forwarding**

If you want webhooks to work:

### **Step 1: Ensure Stripe CLI is Running**

**Open a dedicated terminal:**
```bash
cd /Users/hansonyan/Desktop/Napalmsky
stripe listen --forward-to localhost:3001/payment/webhook
```

**Keep this terminal open!** You should see:
```
Ready! Your webhook signing secret is whsec_...
```

### **Step 2: Verify Backend is Using Correct Secret**

Check `server/.env`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_f1dd3ab1058b38458f67a938e39dd0815f57dac9ffd65395b50f31accd075e9c
```

Should match what Stripe CLI shows!

### **Step 3: Restart Backend**

```bash
# Kill backend
lsof -ti:3001 | xargs kill -9

# Start backend
cd /Users/hansonyan/Desktop/Napalmsky/server
npm run dev
```

### **Step 4: Test Payment**

1. Complete Stripe checkout with test card: `4242 4242 4242 4242`
2. **Watch Stripe CLI terminal** - should see:
   ```
   2025-10-13 00:00:00   --> checkout.session.completed [evt_...]
   2025-10-13 00:00:00   <-- [200] POST http://localhost:3001/payment/webhook
   ```
3. **Watch backend logs** - should see:
   ```
   [Payment] ✅ Payment successful for user abc123
   [Payment] Generated QR code: XYZ12345
   ```
4. **Frontend** - redirects to success page with QR code! ✅

---

## 🚀 **For Production (Railway):**

Webhooks work automatically in production!

### **Why It Works:**

1. ✅ Railway gives public URL: `https://api.napalmsky.com`
2. ✅ Stripe can reach it (not localhost)
3. ✅ No Stripe CLI needed
4. ✅ Webhooks come directly from Stripe

### **Setup:**

1. **Stripe Dashboard** → Webhooks
2. **Add endpoint:** `https://api.napalmsky.com/payment/webhook`
3. **Get signing secret:** starts with `whsec_`
4. **Railway → Variables:** Add `STRIPE_WEBHOOK_SECRET=whsec_...`
5. **Done!** Webhooks work automatically ✅

---

## 📊 **Current Status:**

### **Local Development:**
✅ **Backend:** Running with webhook fix  
✅ **Frontend:** Running with retry limit  
⚠️ **Stripe webhooks:** Need Stripe CLI actively forwarding  
✅ **Admin panel:** Working (bypass method)  
✅ **Recommended:** Use admin QR codes for testing

### **Production (Railway):**
✅ **Webhooks:** Will work automatically  
✅ **No Stripe CLI needed**  
✅ **Just add webhook endpoint in Stripe Dashboard**

---

## 🎯 **Testing Recommendations**

### **For Local Testing:**
**Use admin QR codes** - Much easier than webhook setup!

Steps:
1. Admin login → Generate code
2. Use code at paywall
3. Test full app functionality

### **For Production:**
**Use real Stripe webhooks** - Works automatically!

Steps:
1. Deploy to Railway
2. Add webhook in Stripe Dashboard
3. Test with real (or test) card
4. Webhooks process instantly ✅

---

## 🐛 **If You're Still Stuck:**

### **Quick Escape:**

**In browser console:**
```javascript
// Clear everything
localStorage.clear()

// Manually mark yourself as paid (for testing)
localStorage.setItem('napalmsky_session', JSON.stringify({
  sessionToken: 'test-token',
  userId: 'test-user',
  accountType: 'permanent'
}))

// Go to main
location.href = '/main'
```

**Or better:** Just use admin panel to generate codes! ✅

---

## ✅ **Summary:**

**Problem:** Webhooks don't work on localhost (Stripe can't reach you)  
**Local Solution:** Use admin QR codes to bypass payment  
**Production Solution:** Webhooks work automatically (public URL)

**Recommended:** Use admin panel for all local testing! 🎯

---

**Ready to test with admin codes?** Visit: `http://localhost:3000/admin-login`

