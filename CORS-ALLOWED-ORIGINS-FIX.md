# 🎯 CRITICAL: CORS ALLOWED_ORIGINS Must Include All Domains!

## ❌ **Possible Issue**

If Railway's `ALLOWED_ORIGINS` only has:
```
https://napalmsky.com,https://www.napalmsky.com
```

**But you're testing on:**
```
https://napalmsky.vercel.app
https://napalmsky-jn0bpi9st-hansons-projects-5d96f823.vercel.app
https://napalmsky-329e.vercel.app
```

**CORS will BLOCK requests from Vercel domains!**

---

## ✅ **THE FIX**

**In Railway → Variables → ALLOWED_ORIGINS should be:**

```
https://napalmsky.com,https://www.napalmsky.com,https://napalmskyblacklist.com,https://www.napalmskyblacklist.com,https://napalmsky.vercel.app,https://napalmsky-jn0bpi9st-hansons-projects-5d96f823.vercel.app,https://napalmsky-329e.vercel.app,https://napalmsky-329e-rnvx91y5u-hansons-projects-5d96f823.vercel.app
```

**OR just allow all Vercel preview URLs with wildcard:**

Actually, you can't use wildcards in CORS. But you can set:

```
https://napalmsky.com,https://www.napalmsky.com,https://napalmskyblacklist.com,https://napalmsky.vercel.app,https://napalmsky-329e.vercel.app
```

**And add more Vercel URLs as needed.**

---

## 🔍 **Check Current ALLOWED_ORIGINS**

**Go to Railway → Variables → Find:**
```
ALLOWED_ORIGINS = ?
```

**Should include ALL these:**
- napalmsky.com ✅
- www.napalmsky.com ✅
- napalmsky.vercel.app ✅ ← PROBABLY MISSING!
- napalmsky-329e.vercel.app ✅ ← PROBABLY MISSING!
- Preview URLs ✅ ← PROBABLY MISSING!

**If Vercel URLs are missing:**
- Requests from Vercel get CORS blocked
- Payment API calls fail
- QR code requests fail
- That's your issue!

---

## ✅ **Quick Test**

**In browser Console:**
```javascript
fetch('https://napalmsky-production.up.railway.app/health')
  .then(r => r.json())
  .then(console.log)
  .catch(e => console.error('CORS error?', e))
```

**If you get CORS error:**
- ALLOWED_ORIGINS doesn't include current domain
- Add it!

**If you get JSON response:**
- CORS is OK
- Issue is elsewhere

---

**Check Railway ALLOWED_ORIGINS and add all Vercel URLs!** 🔑

