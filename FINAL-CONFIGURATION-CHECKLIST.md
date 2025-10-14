# ✅ Final Configuration Checklist - PostgreSQL + Cloudinary

## 🔍 **Complete Code Review: PASSED**

I've reviewed the entire codebase. Everything is correctly configured!

### ✅ Code Quality:
- ✅ All environment variables properly referenced
- ✅ No hardcoded URLs in production code
- ✅ PostgreSQL hybrid mode implemented correctly
- ✅ Cloudinary with graceful fallback
- ✅ Next.js Image component used for selfies
- ✅ HTML5 video tags for intro videos
- ✅ Both support Cloudinary URLs

### ✅ Files That Display Media:
1. `components/matchmake/UserCard.tsx` - Matchmaking reel
2. `components/IntroductionComplete.tsx` - Introduction screen
3. `app/refilm/page.tsx` - Profile editing
4. `app/room/[roomId]/page.tsx` - Video chat room
5. All use proper Image/video tags ✅

---

## ⚙️ **Railway Environment Variables (Copy & Paste)**

Go to Railway Dashboard → Your Project → Backend Service → Variables → Add these:

```env
# Core
NODE_ENV=production
PORT=3001

# CORS - CRITICAL! Add ALL your Vercel deployment URLs
ALLOWED_ORIGINS=https://napalmsky.vercel.app,https://napalmsky-329e.vercel.app,https://napalmsky-329e-rnvx91y5u-hansons-projects-5d96f823.vercel.app,https://napalmsky.com,https://www.napalmsky.com

# Database - PostgreSQL Connection
DATABASE_URL=postgresql://your_connection_string_here

# Cloudinary - CRITICAL for file uploads!
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key  
CLOUDINARY_API_SECRET=your_api_secret

# Stripe Payment
STRIPE_SECRET_KEY=sk_test_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# Optional - TURN Servers
CLOUDFLARE_API_TOKEN=your_token
CLOUDFLARE_TURN_KEY=your_key
```

---

## ⚙️ **Vercel Environment Variables (Copy & Paste)**

Go to Vercel Dashboard → Your Project → Settings → Environment Variables:

```env
# API Connection
NEXT_PUBLIC_API_BASE=https://napalmsky-production.up.railway.app

# Socket Connection - CRITICAL for matchmaking!
NEXT_PUBLIC_SOCKET_URL=https://napalmsky-production.up.railway.app

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
```

---

## 🎯 **What Each Variable Does**

### Railway:

**NODE_ENV**
- Sets production mode
- Enables security headers
- Disables verbose logging

**PORT**
- Railway assigns port automatically
- Default: 3001

**ALLOWED_ORIGINS**
- CORS whitelist
- Must include ALL Vercel URLs (production + previews)
- Socket.io also uses this

**DATABASE_URL**
- PostgreSQL connection string
- Format: `postgresql://user:pass@host:5432/dbname`
- If not set → Uses in-memory storage

**CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET**
- Cloudinary CDN credentials
- If not set → Uses local storage (ephemeral!)
- Get from: https://cloudinary.com/console

**STRIPE_SECRET_KEY**
- Server-side Stripe API key
- Format: `sk_test_...` (test mode) or `sk_live_...` (live mode)

**STRIPE_WEBHOOK_SECRET**
- Verifies webhook signatures
- Format: `whsec_...`
- Get from: Stripe Dashboard → Webhooks → Your endpoint → Signing secret

---

### Vercel:

**NEXT_PUBLIC_API_BASE**
- Backend API URL
- Used for all HTTP requests
- Must match Railway URL

**NEXT_PUBLIC_SOCKET_URL**
- WebSocket server URL
- Used for real-time connections
- Must match Railway URL
- **Missing this breaks matchmaking!**

**NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY**
- Client-side Stripe key
- Format: `pk_test_...` (test) or `pk_live_...` (live)
- Safe to expose in frontend

---

## 🔥 **Critical Missing Variables**

Based on your errors, these are NOT set:

### Railway:
```
❌ CLOUDINARY_CLOUD_NAME - Not set → Files use local storage → 404 errors
❌ CLOUDINARY_API_KEY - Not set → Cloudinary won't work
❌ CLOUDINARY_API_SECRET - Not set → Can't authenticate uploads
```

### Vercel:
```
⚠️ NEXT_PUBLIC_SOCKET_URL - Not set → Socket defaults to API_BASE (might work but not ideal)
```

**Fix these first!**

---

## 📊 **Current System Behavior**

### Without Cloudinary (Current State):
```
Upload selfie
  ↓
Backend: "Cloudinary not configured, using local storage"
  ↓
Saves to: /app/server/uploads/selfie-xxx.jpg
  ↓
URL returned: https://napalmsky-production.up.railway.app/uploads/selfie-xxx.jpg
  ↓
File exists... for now ✅
  ↓
Railway redeploys → Container restarts
  ↓
File DELETED (ephemeral filesystem)
  ↓
User tries to view → 404 Not Found ❌
```

### With Cloudinary (After Fix):
```
Upload selfie
  ↓
Backend: "Uploading to Cloudinary..."
  ↓
Cloudinary stores file on CDN
  ↓
URL returned: https://res.cloudinary.com/your-cloud/image/upload/napalmsky/selfies/xxx.jpg
  ↓
File stored permanently ✅
  ↓
Railway redeploys → Container restarts
  ↓
File STILL EXISTS (Cloudinary CDN)
  ↓
User views anytime → Loads from CDN ✅
```

---

## 🚀 **Deployment Steps (Final)**

### 1. Get Cloudinary Credentials (3 min)
```
https://cloudinary.com/users/register/free
→ Sign up
→ Dashboard shows:
   Cloud name: your-cloud-name
   API Key: 123456789012345
   API Secret: abcdefghijklmnopqrstuvwx
→ Copy these!
```

### 2. Add to Railway (2 min)
```
Railway Dashboard
→ Your project
→ Backend service
→ Variables tab
→ Add 3 variables (cloud_name, api_key, api_secret)
→ Save
→ Auto-redeploys (~3 min)
```

### 3. Add Socket URL to Vercel (1 min)
```
Vercel Dashboard
→ Your project
→ Settings → Environment Variables
→ Add: NEXT_PUBLIC_SOCKET_URL=https://napalmsky-production.up.railway.app
→ Save
→ Redeploy (~2 min)
```

### 4. Push Code Changes (1 min)
```bash
cd /Users/hansonyan/Desktop/Napalmsky
git push origin master --force-with-lease
```

### 5. Test Everything (5 min)
```
New account → Upload selfie + video
→ Check: Console says "Cloudinary"
→ Check: URLs are res.cloudinary.com
→ Check: Images display correctly
→ Check: No 404 errors
→ Redeploy Railway → Images still work!
```

**Total time: 15 minutes to fully working system**

---

## 🎯 **Verification Commands**

### Check Railway Logs:
```
Look for:
✅ [Store] Using PostgreSQL storage
✅ [Store] ✅ PostgreSQL connection successful
✅ [Upload] Uploading selfie to Cloudinary...
✅ [Upload] ✅ Selfie uploaded to Cloudinary for user xxx

❌ [Upload] ⚠️  Using local storage (Cloudinary not configured)
```

If you see the ❌ line, Cloudinary variables aren't set!

### Check Browser Console:
```
✅ [Socket] Connected
✅ [Socket] Authenticated
✅ [Matchmake] Loading initial queue...
✅ No CORS errors
✅ No 404 errors on images
```

### Check Image URLs:
```
Right-click profile picture → Inspect → Check src:

✅ https://res.cloudinary.com/...  (Good!)
❌ http://localhost:3001/...       (Bad - old URL)
❌ https://napalmsky-...railway.../uploads/...  (Will 404 on redeploy)
```

---

## 📋 **Testing Matrix**

| Feature | Without Cloudinary | With Cloudinary |
|---------|-------------------|-----------------|
| Upload | ✅ Works | ✅ Works |
| View immediately | ✅ Works | ✅ Works |
| View after redeploy | ❌ 404 Error | ✅ Works |
| CDN delivery | ❌ No | ✅ Yes (fast!) |
| Auto-optimization | ❌ No | ✅ Yes |
| Storage limit | ⚠️ Server disk | ✅ 25GB free |
| Bandwidth limit | ⚠️ Railway | ✅ 25GB/month |
| Cost | $0 | $0 (free tier) |

**Winner:** Cloudinary 🏆

---

## ⚠️ **Important Notes**

### CORS Origins:
Vercel creates new preview URLs for each deployment:
- `napalmsky-329e-rnvx91y5u-hansons-projects-5d96f823.vercel.app`
- `napalmsky-abc123-hansons-projects.vercel.app`
- etc.

**Solution:** Use wildcard in ALLOWED_ORIGINS:
```
https://napalmsky.vercel.app,https://napalmsky-*.vercel.app
```

Or manually add each new preview URL as they appear.

### Database URL:
If using Railway's PostgreSQL plugin:
- Auto-creates `DATABASE_URL` variable
- No manual setup needed
- Just add the plugin and run schema

If using external PostgreSQL:
- Get connection string
- Add as `DATABASE_URL`
- Run schema manually

---

## ✅ **Final Checklist Before Go-Live**

### Code:
- [x] All fixes committed
- [x] Cloudinary implemented
- [x] PostgreSQL ready
- [x] Rate limiter fixed
- [x] Next.js config updated
- [ ] Push to GitHub

### Railway:
- [ ] CLOUDINARY_CLOUD_NAME set
- [ ] CLOUDINARY_API_KEY set
- [ ] CLOUDINARY_API_SECRET set
- [ ] DATABASE_URL set (optional but recommended)
- [ ] ALLOWED_ORIGINS includes all Vercel URLs
- [ ] STRIPE_WEBHOOK_SECRET matches Stripe dashboard
- [ ] Service deployed and running

### Vercel:
- [ ] NEXT_PUBLIC_SOCKET_URL set
- [ ] All 3 variables present
- [ ] Deployed with latest code

### Stripe:
- [ ] Webhook endpoint created
- [ ] Webhook secret copied to Railway
- [ ] Test webhook sends successfully

### Cloudinary:
- [ ] Account created
- [ ] Credentials copied
- [ ] Credentials added to Railway
- [ ] Test upload appears in dashboard

### Testing:
- [ ] New account signup works
- [ ] Payment processes correctly
- [ ] Selfie uploads to Cloudinary
- [ ] Video uploads to Cloudinary
- [ ] Images load without 404
- [ ] Matchmaking connects (socket auth)
- [ ] Video calls work
- [ ] Timer counts down correctly

---

## 🚨 **Do These NOW (In Order)**

### 1. Sign Up for Cloudinary (3 min)
https://cloudinary.com/users/register/free

### 2. Copy Credentials from Dashboard
```
Cloud name: _______________________
API Key: __________________________
API Secret: _______________________
```

### 3. Add to Railway Variables (2 min)
Paste the 3 values above

### 4. Add Socket URL to Vercel (1 min)
`NEXT_PUBLIC_SOCKET_URL=https://napalmsky-production.up.railway.app`

### 5. Push Code (1 min)
```bash
git push origin master --force-with-lease
```

### 6. Wait for Deploys (5 min)
- Railway: ~3 minutes
- Vercel: ~2 minutes

### 7. Test (2 min)
- Create account
- Upload media
- Verify Cloudinary in console
- Check images load

**Total: 14 minutes to fully working system! 🎉**

---

## 📝 **Summary**

**Code Status:** ✅ 100% Ready (4 commits prepared)  
**Infrastructure Status:** ⏳ Waiting for environment variables  
**Blockers:** Cloudinary credentials not added to Railway  

**Once you add those 3 Cloudinary variables, everything will work!**

---

See `COMPLETE-CONFIGURATION-REVIEW.md` for detailed technical review.

**Action Required:** Add Cloudinary credentials to Railway NOW! 🚀

