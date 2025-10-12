# Quick Test: QR Code System
**Run this test RIGHT NOW to verify QR works!**

---

## 🧹 **Step 1: Clear Browser (IMPORTANT)**

```javascript
// Open browser console (F12), paste this:
localStorage.clear();
sessionStorage.clear();
// Then close console and refresh page
```

---

## 🧪 **Step 2: Test Admin QR Generation**

1. **Go to:** http://localhost:3000/admin
2. **Click:** "QR Codes" tab
3. **Type label:** "Test Event"
4. **Click:** "Generate" button
5. **Watch for:**
   - Should NOT see "Failed to generate QR code" alert
   - Should reload and show new code in list
   - QR image should load (black/white pattern, not "Error")

**Expected in Browser:**
- Alert: "QR Code generated: XXXXXXXXXXXXXX"
- New code appears in list
- QR image loads successfully

**Expected in Server Console:**
```
[Admin] Generated permanent invite code: XXXXXXXXXXXXXX by UserName
[InviteCode] Created admin code: XXXXXXXXXXXXXX (unlimited uses)
```

---

## 🔍 **Step 3: Verify QR Image Works**

**Test the QR endpoint directly:**

1. Copy the generated code (e.g., `B9M7K3P8X2Q6W1E5`)
2. Visit in browser: `http://localhost:3001/payment/qr/B9M7K3P8X2Q6W1E5`
3. **Should see:** QR code PNG image (black/white squares)
4. **Should NOT see:** Error message or broken image

**Expected Server Logs:**
```
[QR] Generating QR for URL: http://localhost:3000/onboarding?inviteCode=B9M7K3P8X2Q6W1E5
[QR] ✅ Successfully generated QR for code: B9M7K3P8X2Q6W1E5
```

---

## ✅ **If QR Works:**

You should see:
- ✅ QR code image displays in admin panel
- ✅ Right-click → "Open image in new tab" shows PNG
- ✅ Download button works
- ✅ No errors in console

**Next:** Test the full flow (payment → QR → friend signup)

---

## ❌ **If QR Still Fails:**

**Check Server Terminal for exact error:**
```bash
# Look for lines starting with:
[QR] Failed to generate QR code: <error message>

# Common errors:
# 1. "Cannot find module 'qrcode'"
#    → Run: cd server && npm install qrcode
#
# 2. "toBuffer is not a function"
#    → Check qrcode package version
#
# 3. Other error
#    → Copy the full error and let me know
```

---

## 🎯 **What Got Fixed**

1. ✅ **Removed crypto-random-string** (was causing crash)
2. ✅ **Using Node.js crypto** (built-in, more reliable)
3. ✅ **QR generation via toBuffer** (direct PNG output)
4. ✅ **Better error handling** (logs actual errors)

---

**Test now and let me know what happens!**

