# 🔴 URGENT: Fix Upload URLs Still Using Localhost

## Problem

Your uploads are still generating `localhost:3001` URLs even after code changes:
```
❌ http://localhost:3001/uploads/selfie-xxx.jpg
❌ http://localhost:3001/uploads/video-xxx.webm
```

This causes mixed content errors and broken images.

---

## ✅ Quick Fix (2 Steps)

### Step 1: Add Environment Variable to Railway

1. Go to: https://railway.app/dashboard
2. Select your Napalmsky project
3. Click on your backend service
4. Go to **Variables** tab
5. **Add this variable:**
   ```
   Key: API_BASE
   Value: https://napalmsky-production.up.railway.app
   ```
6. Click **"Add"** or **"Save"**
7. Railway will auto-redeploy (~3 minutes)

---

### Step 2: Wait for Railway to Redeploy

Railway will automatically rebuild and redeploy your backend. Watch for:

1. **Railway Dashboard** → Your service → Check deployment status
2. When it shows **"Active"** with a green dot, it's ready
3. **Total time:** ~3-5 minutes

---

## 🧪 Test After Redeploy

1. Create a **NEW account** (or use incognito)
2. Complete onboarding with selfie + video
3. Go to `/refilm` or `/settings`
4. **Verify:** Image URLs now show:
   ```
   ✅ https://napalmsky-production.up.railway.app/uploads/selfie-xxx.jpg
   ✅ https://napalmsky-production.up.railway.app/uploads/video-xxx.webm
   ```
5. **Verify:** No mixed content errors
6. **Verify:** Images display correctly

---

## 🔍 Why This Happened

The code change I made uses this logic:
```typescript
const apiBase = process.env.API_BASE || `${req.protocol}://${req.get('host')}`;
```

**Without `API_BASE` set:**
- Falls back to request protocol + host
- Railway's internal routing might be detecting `localhost:3001`

**With `API_BASE` set:**
- Always uses the Railway URL
- Works correctly in production

---

## 📋 Alternative: Deploy Through Git

If the environment variable approach doesn't work immediately, you can also:

```bash
# Make sure API_BASE is in the code as a fallback
cd /Users/hansonyan/Desktop/Napalmsky
git push origin master --force-with-lease
```

Then Railway will auto-redeploy with the latest code.

---

## ⚠️ Note About Existing Users

Users who already uploaded files will still have localhost URLs in the database. They need to:
1. Go to `/refilm`
2. Re-record their intro video

This will update their media URLs to the correct Railway URLs.

---

## ✅ Expected Result

After adding `API_BASE` to Railway:

**Before:**
```
❌ http://localhost:3001/uploads/selfie-xxx.jpg (broken)
❌ Mixed content error
❌ Images don't load on HTTPS
```

**After:**
```
✅ https://napalmsky-production.up.railway.app/uploads/selfie-xxx.jpg
✅ No mixed content errors
✅ Images load correctly
```

---

## 🚀 Summary

**RIGHT NOW:** Add `API_BASE=https://napalmsky-production.up.railway.app` to Railway Variables

**IN 5 MINUTES:** Test with a new account - uploads should work!

That's it! 🎯

