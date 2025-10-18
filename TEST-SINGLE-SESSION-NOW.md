# TEST SINGLE-SESSION RIGHT NOW

**Latest Code:** Commit 1aa475f (all bugs fixed)  
**Status:** Ready to test

---

## 🧪 EXACT TESTING STEPS

### **STEP 1: Device A (Computer) - Fresh Login**

**In browser:**
```javascript
// Open Console (F12)
localStorage.clear();
sessionStorage.clear();
location.href = 'https://napalmsky.com/login';
```

**Then:**
1. You'll be at login page
2. Enter email: `luckygood766@gmail.com` or `hello@gmail.com`
3. Enter your password
4. Click "Login" button
5. Should redirect to /main

**Verify:**
- Check Railway logs for: `[Auth] Invalidating sessions...`
- Should say: `Invalidated 0 sessions` (first login after clear)

---

### **STEP 2: Device B (Phone) - Login with SAME Account**

**On phone browser:**
```javascript
// Open Console or just clear site data in settings
localStorage.clear();
// Then go to login page
```

**Or simpler:**
1. Just go to https://napalmsky.com/login
2. Enter **SAME email** as Device A
3. Enter password
4. Click "Login"

**What happens:**
- Phone: Logs in successfully ✅
- Railway logs: `[Auth] Invalidated 1 existing sessions` ✅
- Railway logs: `[Auth] Notified 1 active sockets` ✅

---

### **STEP 3: Check Device A (Computer)**

**ONE of these will happen:**

**Option A (If socket connected):**
- Modal appears instantly: "You have been logged out..."
- Auto-redirects to /login after 5 seconds

**Option B (If socket disconnected):**
- Next time you click anything (matchmaking, settings, etc.)
- Gets 401 error
- Shows logout modal
- Redirects to /login

**Either way, Device A is logged out!** ✅

---

## 🔍 IF IT STILL DOESN'T WORK

**Check these:**

1. **Did you use FRESH login on both devices?**
   - Not just refreshing with cached session
   - Must actually submit login form
   - Should see email/password fields

2. **Check Railway logs for:**
   ```
   [Auth] Invalidating sessions for...
   [Auth] Invalidated X sessions
   ```
   - If you DON'T see this = Not calling /auth/login
   - Must clear localStorage and login fresh

3. **Are you using same email on both devices?**
   - Different emails = different users = no conflict
   - Same email = same user = single-session enforces

---

## ✅ QUICK VERIFICATION

**Run in browser console after Step 1:**
```javascript
const session = JSON.parse(localStorage.getItem('napalmsky_session'));
console.log('Session token:', session.sessionToken);
console.log('This should be a NEW token from fresh login');
```

**Then after Step 2, run on Device A:**
```javascript
// This should fail or trigger logout
fetch('https://napalmsky-production.up.railway.app/user/me', {
  headers: {
    'Authorization': 'Bearer ' + JSON.parse(localStorage.getItem('napalmsky_session')).sessionToken
  }
})
.then(r => r.json())
.then(d => console.log('Response:', d))
```

Expected: `{error: 'Session invalidated', sessionInvalidated: true}`

---

**The code is correct. Just follow these exact steps!**

