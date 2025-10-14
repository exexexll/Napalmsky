# 🔧 QR Code URL Issue - Pointing to Backend

## 🐛 **The Problem**

QR codes are redirecting to Railway backend URL instead of Vercel frontend.

**Expected:** `https://napalmsky.vercel.app/onboarding?inviteCode=ABC123`  
**Actual:** `https://napalmsky-production.up.railway.app/onboarding?inviteCode=ABC123` (wrong!)

---

## 🔍 **Root Cause**

Looking at `server/src/payment.ts:430-432`:

```typescript
const frontendUrl = process.env.FRONTEND_URL || 
                    (req.headers.origin || `${req.protocol}://${req.get('host')}`).replace(':3001', ':3000');
const signupUrl = `${frontendUrl}/onboarding?inviteCode=${code}`;
```

**When FRONTEND_URL is NOT set:**
1. Falls back to `req.headers.origin`
2. If origin is missing (direct image access), uses `req.protocol + req.get('host')`
3. That gives: `https://napalmsky-production.up.railway.app`
4. Replaces `:3001` with `:3000` → `https://napalmsky-production.up.railway.app:3000`
5. Port 3000 doesn't exist on Railway!

**When accessing QR image directly:**
- No `origin` header
- Falls back to backend URL
- QR code points to wrong domain

---

## ✅ **Solution**

**CRITICAL:** You MUST set `FRONTEND_URL` on Railway!

### Railway Dashboard → Variables:

```env
FRONTEND_URL=https://napalmsky.vercel.app
```

**Or if you have custom domain:**
```env
FRONTEND_URL=https://napalmsky.com
```

**After adding:**
1. Railway will redeploy (~3 min)
2. Generate a NEW QR code (old ones still have wrong URL)
3. New QR codes will point to Vercel ✅

---

## 🧪 **Test After Fix**

### Step 1: Check Railway Logs

When generating QR code, should see:
```
[QR] Generating QR for URL: https://napalmsky.vercel.app/onboarding?inviteCode=ABC123
```

**NOT:**
```
[QR] Generating QR for URL: https://napalmsky-production.up.railway.app/onboarding?inviteCode=ABC123
```

### Step 2: Scan QR Code

1. Generate QR from `/settings` or admin panel
2. Scan with phone
3. **Should open:** `https://napalmsky.vercel.app/onboarding?inviteCode=...`
4. **Should NOT open:** Railway backend URL

---

## ⚠️ **Why This Variable is Critical**

### Without FRONTEND_URL:
```
QR Request → Railway endpoint
  ↓
req.headers.origin = undefined (direct image access)
  ↓
Fallback to req.get('host')
  ↓
Returns: napalmsky-production.up.railway.app
  ↓
QR contains: https://railway-backend.app/onboarding ❌
  ↓
User scans → Opens backend (404 or wrong page)
```

### With FRONTEND_URL:
```
QR Request → Railway endpoint
  ↓
Uses process.env.FRONTEND_URL
  ↓
Returns: https://napalmsky.vercel.app
  ↓
QR contains: https://vercel-frontend.app/onboarding ✅
  ↓
User scans → Opens frontend correctly!
```

---

## 🚨 **Action Required**

**RIGHT NOW:**
1. Go to Railway Dashboard
2. Your project → Backend service → Variables
3. Add: `FRONTEND_URL=https://napalmsky.vercel.app`
4. Save → Wait for redeploy (~3 min)
5. Generate NEW QR code
6. Test by scanning it

**Old QR codes will still be broken** - you need to generate new ones after setting the variable!

---

## 🔍 **How to Check If It's Set**

### Railway Dashboard:
Look for `FRONTEND_URL` in your variables list.

**If it exists:** Should show `https://napalmsky.vercel.app`  
**If it doesn't exist:** That's why QR codes are broken!

---

## 📝 **Summary**

**Issue:** QR codes point to backend instead of frontend  
**Cause:** `FRONTEND_URL` environment variable not set on Railway  
**Fix:** Add `FRONTEND_URL=https://napalmsky.vercel.app` to Railway  
**Impact:** All QR codes will work correctly after redeploy  

**This is one of the environment variables I mentioned earlier that you need to add!**

