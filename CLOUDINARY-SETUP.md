# ✅ Cloudinary Setup Complete!

## 🎉 Code Changes Done

I've updated your codebase to use Cloudinary:
- ✅ Cloudinary SDK installed
- ✅ `server/src/media.ts` updated to upload to Cloudinary
- ✅ `next.config.js` updated to allow Cloudinary images
- ✅ Automatic fallback to local storage if Cloudinary not configured

---

## 🔑 Get Your Cloudinary Credentials (2 Minutes)

### Step 1: Sign Up

1. Go to: https://cloudinary.com/users/register/free
2. Sign up with your email (it's FREE - no credit card required)
3. Verify your email

### Step 2: Get Credentials

After logging in, you'll see your dashboard with:

```
Cloud name: your-cloud-name
API Key: 123456789012345
API Secret: abcdefghijklmnopqrstuvwx
```

**Copy these three values!**

---

## ⚙️ Add to Railway (1 Minute)

1. **Railway Dashboard** → Your project → Backend service
2. **Click:** Variables tab
3. **Add these 3 variables:**

```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwx
```

4. **Save** - Railway will auto-redeploy (~3 min)

---

## 🚀 Deploy Code Changes

```bash
cd /Users/hansonyan/Desktop/Napalmsky
git add server/src/media.ts next.config.js server/package.json server/package-lock.json
git commit -m "Add Cloudinary for persistent file storage"
git push origin master --force-with-lease
```

---

## ✅ How It Works

### Before (Railway Ephemeral):
```
Upload → /uploads/ folder → Container restarts → FILES DELETED → 404
```

### After (Cloudinary CDN):
```
Upload → Cloudinary CDN → Stored forever → Delivered globally → ✅ Works!
```

---

## 🎯 Benefits

- ✅ **Free tier:** 25GB storage, 25GB bandwidth/month
- ✅ **CDN:** Fast global delivery
- ✅ **Persistent:** Files never disappear
- ✅ **Automatic optimization:** Images/videos auto-compressed
- ✅ **Scalable:** Handles unlimited users
- ✅ **No Railway volume needed:** Saves $5/month

---

## 🧪 Test After Deploy

1. **Wait** for Railway redeploy (~3 min)
2. **Create new account** (or use `/refilm`)
3. **Upload selfie + video**
4. **Verify:** Console shows `[Upload] ✅ ... uploaded to Cloudinary`
5. **Check:** Images load with URLs like `https://res.cloudinary.com/...`
6. **Test persistence:** Redeploy Railway → Images still work!

---

## 📊 Cloudinary Dashboard

After uploading, check your Cloudinary dashboard:
- See all uploaded files
- View storage usage
- Monitor bandwidth
- Manage assets

---

## 🔄 Migration Notes

**Old users** with localhost URLs will need to re-upload:
1. Go to `/refilm` → Record new video
2. Go to `/settings` → Update profile picture (if available)

**New users** will automatically use Cloudinary from day 1!

---

## ⚠️ Important

Make sure to add the environment variables to Railway **BEFORE** testing uploads.

Without the variables:
- ❌ Falls back to local storage
- ❌ Files still disappear on redeploy

With the variables:
- ✅ Uses Cloudinary
- ✅ Files persist forever

---

## 🎉 Summary

1. **Sign up:** https://cloudinary.com/users/register/free
2. **Get credentials:** From dashboard
3. **Add to Railway:** 3 environment variables
4. **Push code:** `git push origin master --force-with-lease`
5. **Test:** Upload photo/video
6. **Done!** Files now persist forever

**Total time: 10 minutes** 🚀

