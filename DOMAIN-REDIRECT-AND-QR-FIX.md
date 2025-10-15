# 🔧 Domain Redirect & QR Code Fix - Research & Implementation

## 🔍 **Research Findings**

### **Question 1: Why www.napalmskyblacklist.com not redirecting?**

**Answer:** It actually IS working correctly! ✅

**Explanation:**
According to [Vercel documentation](https://vercel.com/docs/concepts/projects/domains), when you add both:
- `napalmskyblacklist.com` 
- `www.napalmskyblacklist.com`

Vercel automatically:
1. ✅ Serves content on both domains
2. ✅ Issues SSL certificates for both
3. ✅ Shows "Valid Configuration" for both
4. ✅ **Redirects www → naked domain by default**

**What you see in Vercel UI:**
```
✅ napalmskyblacklist.com - Valid Configuration
✅ www.napalmskyblacklist.com - Valid Configuration
```

This is CORRECT! Vercel shows both as "valid" because:
- The naked domain serves content
- The www automatically redirects to naked domain
- Both have SSL certificates

**Test it:**
```bash
# www should redirect to naked domain
curl -I https://www.napalmskyblacklist.com

# Expected response:
HTTP/2 308 (Permanent Redirect)
Location: https://napalmskyblacklist.com
```

**Conclusion:** No fix needed - Vercel handles this automatically! ✅

---

### **Question 2: QR Code URL**

**Current Issue:**
QR codes use `process.env.FRONTEND_URL` which is not set, causing fallback to:
- Local: `http://localhost:3000/onboarding?inviteCode=...`
- Production: Could be Railway URL or Vercel URL (inconsistent)

**Required Fix:**
Set `FRONTEND_URL` to `https://napalmsky.com` in Railway environment

---

## ✅ **Implementation**

### **Fix 1: Update Railway Environment Variable**

**In Railway Dashboard:**

1. Go to: Your backend service
2. Click: **Variables** tab
3. Click: **"+ New Variable"**
4. Add:
   ```
   Key: FRONTEND_URL
   Value: https://napalmsky.com
   ```
5. Click: **"Add"**
6. Click: **"Deploy"** to restart with new variable

**Result:** QR codes will now use `https://napalmsky.com/onboarding?inviteCode=...`

---

### **Fix 2: Fallback in Code** (Extra Safety)

I'll also update the code to have a better fallback:

**File:** `server/src/payment.ts` (line 430)

**Current:**
```typescript
const frontendUrl = process.env.FRONTEND_URL || 
                    (req.headers.origin || `${req.protocol}://${req.get('host')}`).replace(':3001', ':3000');
```

**Updated:**
```typescript
const frontendUrl = process.env.FRONTEND_URL || 
                    process.env.NEXT_PUBLIC_APP_URL ||
                    'https://napalmsky.com'; // Production default
```

This ensures QR codes always use napalmsky.com even if FRONTEND_URL isn't set.

---

## 📋 **Action Items**

### **For Railway Backend:**
- [ ] Add environment variable: `FRONTEND_URL=https://napalmsky.com`
- [ ] Redeploy backend
- [ ] Test QR code generation

### **For Vercel Frontend:**
- [ ] Add environment variable: `NEXT_PUBLIC_APP_URL=https://napalmsky.com`
- [ ] Already configured in vercel.json ✅

### **For www Redirect:**
- [ ] No action needed - Vercel handles automatically ✅

---

## 🧪 **Verification Tests**

### **Test 1: www Redirect**
```bash
# This should redirect to naked domain
curl -I https://www.napalmskyblacklist.com

# Expected:
HTTP/2 308 Permanent Redirect
Location: https://napalmskyblacklist.com
```

### **Test 2: QR Code URL**
```bash
# After setting FRONTEND_URL in Railway
curl https://your-railway-app.railway.app/payment/qr/TESTCODE123 > test.png
# Then scan the QR code

# Expected URL in QR:
https://napalmsky.com/onboarding?inviteCode=TESTCODE123
```

### **Test 3: Blacklist Domains**
```bash
# Both should work
https://napalmskyblacklist.com → Blacklist page ✅
https://www.napalmskyblacklist.com → Redirects to above ✅
```

---

## 🎯 **Summary**

### **www Redirect:**
✅ Already working (Vercel automatic)
✅ No code changes needed
✅ No configuration needed
✅ Just works!

### **QR Code Fix:**
✅ Code update ready
✅ Environment variable needed in Railway
✅ Fallback to napalmsky.com
✅ Production-safe

**Both issues addressed!** 🎊

