# Quick Test Guide: Paywall System
**Time:** 5 minutes  
**Goal:** Test complete paywall flow without errors

---

## 🧹 **Step 0: Clean Slate (IMPORTANT!)**

The 401 errors you're seeing are from **old sessions** after server restart. Fix this:

### **Option A: Clear Browser Data (Recommended)**
```javascript
// In browser console (F12):
localStorage.clear();
sessionStorage.clear();
// Then refresh page (Cmd+R)
```

### **Option B: Use Incognito Window**
```
1. Open new incognito window
2. Go to http://localhost:3000
```

### **Option C: Hard Refresh**
```
Cmd+Shift+R (Mac)
Ctrl+Shift+R (Windows)
```

---

## 🧪 **Test Flow 1: Payment (Without Stripe - Mock)**

Since you don't have Stripe keys yet, test with **mock payment bypass**:

### **Temporary Fix: Auto-Mark as Paid**

Add this to `server/src/auth.ts` line 88 (temporary for testing):

```typescript
const user: User = {
  userId,
  name: name.trim(),
  gender,
  accountType: 'guest',
  createdAt: Date.now(),
  banStatus: 'none',
  // Paywall status
  paidStatus: 'paid', // ← TEMPORARILY force to 'paid' for testing
  inviteCodeUsed: codeUsed,
  // ...rest
};
```

This bypasses the paywall temporarily so you can test the rest of the app.

---

## 🧪 **Test Flow 2: With Stripe (Proper Testing)**

### **Quick Stripe Setup (5 minutes):**

1. **Get Test Keys:**
   ```
   Visit: https://dashboard.stripe.com/register
   Create account (free)
   Dashboard → Developers → API Keys
   Copy: "Secret key" (sk_test_xxx)
   ```

2. **Add to .env:**
   ```bash
   cd server
   echo "STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE" > .env
   echo "STRIPE_WEBHOOK_SECRET=whsec_xxx" >> .env
   ```

3. **Setup Webhook:**
   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe
   
   # Login
   stripe login
   
   # Start listener
   stripe listen --forward-to localhost:3001/payment/webhook
   
   # Copy webhook secret (whsec_xxx) to .env
   ```

4. **Restart Server:**
   ```bash
   cd server
   npm run dev
   ```

5. **Test Payment:**
   - Open: http://localhost:3000/onboarding
   - Create account
   - Get redirected to /paywall
   - Click "Pay $1.00"
   - Use card: **4242 4242 4242 4242**
   - Expiry: 12/34
   - CVC: 123
   - ZIP: 12345
   - ✅ Should see invite code!

---

## 🎯 **Test Flow 3: Invite Code**

### **Prerequisites:**
- Have one paid user OR use admin to generate code

### **Steps:**

1. **Get an Invite Code:**
   ```
   Method A: Pay $1, get your code from success page
   Method B: Go to /admin → QR Codes tab → Generate code
   ```

2. **Test Code:**
   - Open incognito window
   - Go to: `http://localhost:3000/onboarding?inviteCode=YOUR_CODE_HERE`
   - Enter name + gender
   - Should skip paywall ✅
   - Continue to app

3. **Verify Code Used:**
   - Check Settings page
   - Should show: "4/5 uses remaining"

---

## 🚫 **Common Issues & Fixes**

### **Issue: "Invalid or expired session"**

**Cause:** Old session from before server restart

**Fix:**
```javascript
localStorage.clear();
// Refresh page
```

---

### **Issue: "Cannot find module 'crypto-random-string'"**

**Cause:** Package not installed

**Fix:**
```bash
cd server
npm install crypto-random-string
npm run dev
```

---

### **Issue: "Webhook secret not configured"**

**Cause:** Missing STRIPE_WEBHOOK_SECRET in .env

**Fix:**
```bash
# Run Stripe listener:
stripe listen --forward-to localhost:3001/payment/webhook

# Copy secret (whsec_xxx) to server/.env
# Restart server
```

---

### **Issue: Paywall page not loading**

**Cause:** Missing /paywall route

**Fix:** Already created! Just navigate to:
```
http://localhost:3000/paywall
```

---

## 🎮 **Testing Checklist**

### **Without Stripe (Quick Test):**
```
[x] Create new account
[x] Temporarily set paidStatus='paid' in code
[x] Access /main successfully
[x] Test matchmaking
```

### **With Stripe (Full Test):**
```
[ ] Set up Stripe test keys
[ ] Start webhook listener
[ ] Create new account
[ ] See paywall page
[ ] Pay with 4242... card
[ ] See payment success
[ ] See invite code + QR
[ ] Access /main
[ ] Check settings for QR code
```

### **Invite Code Test:**
```
[ ] Get code from paid user
[ ] New incognito window
[ ] Sign up with code
[ ] Skip paywall
[ ] Access app
[ ] Verify code counter decrements
```

### **Admin QR Test:**
```
[ ] Go to /admin
[ ] Click QR Codes tab
[ ] Generate permanent code
[ ] Download QR image
[ ] Use code 3 times
[ ] Verify shows "UNLIMITED"
```

---

## 🔧 **Reset Everything (Fresh Start)**

If you want to start completely fresh:

```bash
# 1. Kill server
# (Ctrl+C in server terminal)

# 2. Clear browser
localStorage.clear();
sessionStorage.clear();

# 3. Restart server (clears in-memory data)
cd server && npm run dev

# 4. Fresh signup
# Visit: http://localhost:3000/onboarding
```

---

## ✅ **Expected Console Logs (Success)**

### **When Creating Account (With Invite Code):**
```
[Auth] Invite code detected: A7K9M2P5X8Q1W4E6
[Auth] ✅ User Test User verified via invite code: A7K9M2P5X8Q1W4E6
[InviteCode] Code A7K9M2P5X8Q1W4E6 used by Test User - 4 uses remaining
```

### **When Paying:**
```
[Payment] ✅ Payment successful for user fa6882f3
[Payment] Generated invite code B3M7N9K2Q5P8X1W4 for Test User (5 uses)
[InviteCode] Created user code: B3M7N9K2Q5P8X1W4 (5 uses)
```

### **When Accessing Protected Route:**
```
[Queue API] User fa6882f3 requesting queue
✓ No paywall error (has access)
```

---

## 🎯 **Quick Test Right Now**

**Clear your session and test fresh:**

1. Open browser console (F12)
2. Run: `localStorage.clear()`
3. Refresh page
4. Visit: `http://localhost:3000/onboarding`
5. Create account
6. Should see paywall page ✅

**No 401 errors after clearing localStorage!**

---

*Guide Created: October 10, 2025*  
*Purpose: Quick testing without errors*  
*Time Required: 5 minutes*

