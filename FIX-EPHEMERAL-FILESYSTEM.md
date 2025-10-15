# 🔴 Critical: Railway Ephemeral Filesystem Issue

## Problem

Images upload successfully but return **404 errors** when trying to load them.

**Root Cause:** Railway uses ephemeral filesystem - files in `/server/uploads/` are **deleted on redeploy or container restart**.

---

## ✅ **Solution 1: Railway Persistent Volume (Quickest)**

### Steps:

1. **Go to Railway Dashboard:**
   - https://railway.app/dashboard
   - Select your Napalmsky project
   - Click your backend service

2. **Add Volume:**
   - Click "Volumes" tab (or "+ New" → "Volume")
   - **Name:** `uploads`
   - **Mount Path:** `/app/server/uploads`
   - **Size:** 1 GB (plenty for testing)

3. **Save & Wait:**
   - Railway will redeploy (~3 min)
   - Files will now persist across deploys!

### Pros:
- ✅ Quick setup (5 minutes)
- ✅ No code changes needed
- ✅ Works with existing upload logic

### Cons:
- ⚠️ Costs $5-10/month for volume
- ⚠️ Not ideal for scaling (single server only)

---

## ✅ **Solution 2: Cloudinary (Best Long-Term)**

Free tier: 25GB storage, 25GB bandwidth/month

### Step 1: Sign Up

1. Go to: https://cloudinary.com/users/register/free
2. Sign up (free tier is plenty)
3. Get your credentials:
   - Cloud name
   - API Key
   - API Secret

### Step 2: Install Cloudinary

```bash
cd /Users/hansonyan/Desktop/Napalmsky/server
npm install cloudinary
```

### Step 3: Update server/src/media.ts

Replace the file upload logic with Cloudinary:

```typescript
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload selfie to Cloudinary
router.post('/selfie', requireAuth, upload.single('selfie'), async (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'napalmsky/selfies',
      resource_type: 'image',
      format: 'jpg',
    });

    const selfieUrl = result.secure_url;
    await store.updateUser(req.userId, { selfieUrl });

    // Delete local temp file
    fs.unlinkSync(req.file.path);

    console.log(`[Upload] ✅ Selfie uploaded to Cloudinary for user ${req.userId.substring(0, 8)}`);
    res.json({ selfieUrl });
  } catch (error: any) {
    console.error('[Upload] Cloudinary upload failed:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});
```

### Step 4: Add Environment Variables to Railway

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Step 5: Update next.config.js

```javascript
remotePatterns: [
  {
    protocol: 'https',
    hostname: 'res.cloudinary.com',
    pathname: '/**',
  },
]
```

### Pros:
- ✅ Free tier (25GB)
- ✅ CDN included (fast global delivery)
- ✅ Automatic image optimization
- ✅ Scales infinitely
- ✅ No server storage needed

### Cons:
- Takes 30 minutes to implement
- Requires code changes

---

## ✅ **Solution 3: AWS S3 (Enterprise)**

Similar to Cloudinary but more complex setup. Use if you need AWS integration.

---

## 🎯 **Recommendation**

### **For Right Now (Next 10 Minutes):**
Use **Railway Persistent Volume** - quickest fix

### **For Production (Next Week):**
Migrate to **Cloudinary** - better scaling, CDN, free tier

---

## 📝 **Why This Happened**

Railway containers are **stateless** by design:
- Every deploy creates a new container
- Old container (with uploads) is destroyed
- New container has empty `/uploads/` folder
- Result: All uploaded files disappear

**This is why cloud platforms use S3/Cloudinary!**

---

## ⏱️ **Quick Fix Timeline**

### Option 1: Railway Volume
1. Add volume (2 min)
2. Wait for redeploy (3 min)
3. Test uploads (1 min)
**Total: 6 minutes**

### Option 2: Cloudinary
1. Sign up (5 min)
2. Install package (1 min)
3. Update code (15 min)
4. Deploy (5 min)
5. Test (2 min)
**Total: 28 minutes**

---

## 🚨 **Current Impact**

Users can upload photos/videos, but:
- ❌ Images disappear on redeploy
- ❌ 404 errors when trying to view
- ❌ Users think upload failed
- ❌ Have to re-upload after every deploy

**Fix this ASAP - it breaks core functionality!**

---

## ✅ **Expected After Fix**

With persistent storage:
- ✅ Upload once, works forever
- ✅ Images persist across deploys
- ✅ No 404 errors
- ✅ Profile pictures always visible
- ✅ Intro videos always playable

---

**Choose Option 1 for quick fix, Option 2 for production-ready solution.**

