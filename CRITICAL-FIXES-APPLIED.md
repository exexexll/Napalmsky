# Critical Fixes Applied - October 2025

## 🔴 **Critical Bugs Fixed**

### 1. ✅ Payment Success Skipping Onboarding (FIXED)

**Problem:**
- User enters name → redirected to paywall → pays
- Payment success page redirects to `/main`
- **Result:** Selfie and video steps completely skipped
- Users end up in app with NO profile picture or video

**Root Cause:**
```typescript
// app/payment-success/page.tsx:142
router.push('/main')  // ← WRONG!
```

**Fix:**
```typescript
// Now redirects back to onboarding
router.push('/onboarding')
```

**Why This Works:**
- Onboarding page now detects existing session
- Checks if user has completed profile (selfie + video)
- If incomplete, resumes from correct step
- If complete, redirects to main app

---

### 2. ✅ Photo/Video Upload URLs Hardcoded (FIXED)

**Problem:**
- Media URLs hardcoded to `http://localhost:3001`
- Won't work on Railway deployment
- Files upload successfully but URLs are broken

**Root Cause:**
```typescript
// server/src/media.ts:89, 129
const selfieUrl = `http://localhost:3001/uploads/${req.file.filename}`;
const videoUrl = `http://localhost:3001/uploads/${req.file.filename}`;
```

**Fix:**
```typescript
// Now uses environment variable or request host
const apiBase = process.env.API_BASE || `${req.protocol}://${req.get('host')}`;
const selfieUrl = `${apiBase}/uploads/${req.file.filename}`;
const videoUrl = `${apiBase}/uploads/${req.file.filename}`;
```

**Railway Environment Variable:**
```
API_BASE=https://napalmsky-production.up.railway.app
```

---

### 3. ✅ Onboarding Progress Not Tracked (FIXED)

**Problem:**
- No way to track if user completed selfie/video
- Returning users forced to start from step 1 (name)
- Payment interruption loses progress

**Fix:**
Enhanced onboarding detection logic:

```typescript
// app/onboarding/page.tsx:62-92
if (existingSession) {
  fetch('/user/me')
    .then(data => {
      const hasCompletedProfile = data.selfieUrl && data.videoUrl;
      
      if (hasCompletedProfile) {
        // Profile complete - go to main
        router.push('/main');
      } else {
        // Resume from correct step
        if (!data.selfieUrl) {
          setStep('selfie');
        } else if (!data.videoUrl) {
          setStep('video');
        }
      }
    });
}
```

**Result:**
- Users returning from payment go directly to selfie step
- Users who closed browser mid-onboarding resume from where they left off
- Completed profiles skip onboarding entirely

---

### 4. ✅ Paywall Redirects Fixed

**Problem:**
- Paywall redirected to `/main` after payment/code
- Bypassed profile setup

**Fix:**
```typescript
// app/paywall/page.tsx:36, 71
// OLD: router.push('/main')
// NEW: router.push('/onboarding')
```

---

## 📊 **Complete User Flow (After Fixes)**

### Scenario 1: Normal Signup (No Payment Required - Has Invite Code)
```
/onboarding → Enter name → Selfie → Video → /main ✅
```

### Scenario 2: Signup Requiring Payment
```
/onboarding → Enter name → /paywall → Pay $0.50 
           ↓
/payment-success → Shows invite code
           ↓
Click "Continue to Profile Setup" → /onboarding 
           ↓
Detects existing session + no selfie → Selfie step
           ↓
Selfie → Video → /main ✅
```

### Scenario 3: User Closes Browser Mid-Onboarding
```
User completed: Name + Payment
User returns: Opens /onboarding
           ↓
Detects session → Fetches /user/me
           ↓
No selfie found → Resumes at selfie step ✅
```

### Scenario 4: User Closes Browser After Selfie
```
User completed: Name + Payment + Selfie
User returns: Opens /onboarding
           ↓
Detects session → Has selfie, no video
           ↓
Resumes at video step ✅
```

---

## 🗄️ **Database Usage**

### Current State: Hybrid Mode
```typescript
// server/src/store.ts:51
private useDatabase = !!process.env.DATABASE_URL;
```

**Behavior:**
- If `DATABASE_URL` is set → Uses PostgreSQL
- If not set → Falls back to in-memory storage
- Always keeps cache in memory for fast access

**Railway Setup:**
```bash
# Railway should have DATABASE_URL set
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

**Schema Already Exists:**
- `/Users/hansonyan/Desktop/Napalmsky/server/schema.sql`
- Complete PostgreSQL schema with all tables
- Run on Railway's PostgreSQL instance

---

## 🚀 **Deployment Checklist**

### Vercel (Frontend)

**Environment Variables:**
```
NEXT_PUBLIC_API_BASE=https://napalmsky-production.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://napalmsky-production.up.railway.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_PUBLISHABLE_KEY
```

**After Changes:**
1. Go to Vercel → Deployments
2. Click "Redeploy" on latest
3. Test onboarding flow

---

### Railway (Backend)

**Environment Variables:**
```
# Core
NODE_ENV=production
PORT=3001
API_BASE=https://napalmsky-production.up.railway.app

# CORS
ALLOWED_ORIGINS=https://napalmsky.vercel.app,https://napalmsky-329e.vercel.app,https://napalmsky-3z9e-jgl9yhb1i-hansons-projects-5d96f823.vercel.app,https://napalmsky.com,https://www.napalmsky.com

# Database
DATABASE_URL=postgresql://...  # Railway PostgreSQL

# Stripe
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# Admin (Optional)
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=[bcrypt hash]
```

**After Git Push:**
1. Railway auto-deploys
2. Check logs for errors
3. Test payment → onboarding flow

---

### Stripe (Webhook)

**Webhook Endpoint:**
```
https://napalmsky-production.up.railway.app/payment/webhook
```

**Events to Listen:**
- `checkout.session.completed`

**Steps:**
1. Stripe Dashboard → Webhooks → Add endpoint
2. Enter URL above
3. Select event
4. Copy signing secret
5. Add to Railway as `STRIPE_WEBHOOK_SECRET`

---

## 🧪 **Testing the Fixes**

### Test 1: Payment Flow
1. Go to Vercel deployment
2. Navigate to `/onboarding`
3. Enter name → Click Continue
4. Should redirect to `/paywall` (if no invite code)
5. Pay with test card: `4242 4242 4242 4242`
6. **Verify:** Redirects to `/payment-success`
7. **Verify:** Shows invite code
8. Click "Continue to Profile Setup"
9. **Verify:** Redirects to `/onboarding` (NOT `/main`)
10. **Verify:** Camera starts automatically (selfie step)
11. Take selfie
12. **Verify:** Advances to video step
13. Record video
14. **Verify:** Advances to permanent/introduction step
15. Skip or complete
16. **Verify:** Arrives at `/main` with full profile

### Test 2: Resume After Payment
1. Complete name + payment
2. Close browser (don't complete selfie)
3. Reopen → Go to `/onboarding`
4. **Verify:** Automatically resumes at selfie step
5. **Verify:** No need to re-enter name or pay again

### Test 3: Upload URLs
1. Complete onboarding flow
2. Go to `/settings`
3. **Verify:** Profile picture displays correctly
4. **Verify:** No broken image icons
5. Check console → **Verify:** Image URL points to Railway, not localhost

### Test 4: Matchmaking
1. Add `NEXT_PUBLIC_SOCKET_URL` to Vercel (from earlier instructions)
2. Redeploy Vercel
3. Open matchmaking
4. **Verify:** Console shows `[Socket] Authenticated`
5. **Verify:** Users appear in queue
6. **Verify:** Can initiate video calls

---

## 📝 **Code Changes Summary**

### Files Modified:
1. `app/payment-success/page.tsx` - Fixed redirect to `/onboarding`
2. `app/onboarding/page.tsx` - Added progress tracking and resume logic
3. `app/paywall/page.tsx` - Fixed redirect to `/onboarding`
4. `server/src/media.ts` - Dynamic API base URLs for uploads

### Lines Changed: ~50
### Critical Bugs Fixed: 4
### New Features Added: Onboarding resume functionality

---

## ⚠️ **Known Remaining Issues**

### 1. Socket Authentication (Easy Fix)
**Issue:** Vercel needs `NEXT_PUBLIC_SOCKET_URL`
**Fix:** Add environment variable (already documented)
**Impact:** Matchmaking won't work until fixed

### 2. File Storage (Production Consideration)
**Current:** Files stored in `/server/uploads/` directory
**Issue:** Railway ephemeral filesystem - files lost on redeploy
**Solution:** Migrate to S3/Cloudinary (later)
**Workaround:** Acceptable for testing, users re-upload after deploy

### 3. Database Connection Pooling
**Current:** Hybrid mode (memory + PostgreSQL)
**Optimization:** Full PostgreSQL mode with Redis cache
**Impact:** Minor performance improvement
**Priority:** Low (current setup works fine)

---

## 🎯 **Success Criteria**

### All Fixed: ✅
- [x] Payment doesn't skip onboarding
- [x] Photo/video upload works on Railway
- [x] Users can resume onboarding after interruption
- [x] Paywall redirects correctly

### Next: Add Socket URL to Vercel
- [ ] Add `NEXT_PUBLIC_SOCKET_URL` environment variable
- [ ] Redeploy Vercel
- [ ] Test matchmaking

### Future Improvements:
- [ ] Migrate uploads to S3/Cloudinary
- [ ] Add database migration scripts
- [ ] Implement Redis caching
- [ ] Add comprehensive error logging

---

## 📞 **Quick Reference**

**Git Commands:**
```bash
cd /Users/hansonyan/Desktop/Napalmsky
git add .
git commit -m "Fix: Payment skipping onboarding + media URLs"
git push origin master
```

**Vercel URL:** https://napalmsky.vercel.app (or your custom domain)
**Railway URL:** https://napalmsky-production.up.railway.app
**Stripe Dashboard:** https://dashboard.stripe.com/test/webhooks

---

## ✅ **Status: READY TO DEPLOY**

All critical bugs have been fixed. Deploy these changes to production and test the complete onboarding flow.

