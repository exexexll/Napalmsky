# 🔍 Diagnose Payment Status Issues

## 🐛 **Problem:**

Users appear to have `available=false` and socket auth fails intermittently.

**Possible causes:**
1. User's `paidStatus` is 'unpaid' in database
2. Socket authentication timing issue
3. Paywall guard blocking API calls

---

## 🔍 **Check User Payment Status**

### Method 1: Check via Settings Page

1. Go to `/settings` on your app
2. Look for payment status display
3. Should show: "Access: Paid" or "Access: QR Verified"
4. If shows "Unpaid" → That's the problem!

---

### Method 2: Check via Browser Console

```javascript
// In browser console:
const session = JSON.parse(localStorage.getItem('napalmsky_session'));

// Fetch your user data
fetch('https://napalmsky-production.up.railway.app/user/me', {
  headers: { 'Authorization': `Bearer ${session.sessionToken}` }
})
.then(r => r.json())
.then(data => {
  console.log('User data:', data);
  console.log('Paid status:', data.paidStatus);
  console.log('My invite code:', data.myInviteCode);
});

// Fetch payment status
fetch('https://napalmsky-production.up.railway.app/payment/status', {
  headers: { 'Authorization': `Bearer ${session.sessionToken}` }
})
.then(r => r.json())
.then(data => {
  console.log('Payment status:', data);
  console.log('Paid status:', data.paidStatus);
});
```

**Expected output:**
```json
{
  "paidStatus": "paid"  // or "qr_verified"
}
```

**If you see:**
```json
{
  "paidStatus": "unpaid"  // ← PROBLEM!
}
```

---

### Method 3: Check Railway Database

If using PostgreSQL:

```sql
-- Connect to database
psql $DATABASE_URL

-- Check user's payment status
SELECT user_id, name, paid_status, paid_at, my_invite_code
FROM users
WHERE name LIKE '%your-name%';

-- Should show:
-- paid_status | paid_at | my_invite_code
-- paid        | timestamp | ABC123XYZ456 (16 chars)
```

If `paid_status` is NULL or 'unpaid' → That's why!

---

## 🔧 **Fix Incorrect Payment Status**

### If User Paid But Shows Unpaid:

**Cause:** Stripe webhook didn't process correctly

**Fix via Railway Console:**

```javascript
// In Railway shell or via API:
UPDATE users 
SET paid_status = 'paid',
    paid_at = NOW(),
    my_invite_code = 'GENERATE16CHARS1'
WHERE user_id = 'your-user-id';
```

---

### If User Used QR Code But Shows Unpaid:

**Cause:** Code validation failed or wasn't applied

**Fix:**
1. Get a valid invite code from settings or admin panel
2. Go to `/paywall`
3. Enter the code manually
4. Click "Verify Code"
5. Should mark you as 'qr_verified'

---

## 🐛 **Socket Auth Timing Issue**

Based on your logs, I see this pattern:

```
[Socket] Connected
[Socket] Authentication failed  ← Happens too fast!
```

**Root Cause:** Race condition in socket auth flow.

**Where it happens:**
```typescript
// lib/socket.ts:28-31
socket.on('connect', () => {
  socket?.emit('auth', { sessionToken });  // Emits auth
});

socket.on('auth:success', () => {
  console.log('[Socket] Authenticated');  // Should fire
});

socket.on('auth:failed', () => {
  console.error('[Socket] Authentication failed');  // Actually fires!
});
```

**Backend:**
```typescript
// server/src/index.ts:224
socket.on('auth', async ({ sessionToken }) => {
  const session = await store.getSession(sessionToken);
  if (session) {
    socket.emit('auth:success');
  } else {
    socket.emit('auth:failed');  // This is firing!
  }
});
```

**Why auth:failed fires:**
- Session token is invalid
- Session expired
- Database lookup failed
- Session doesn't exist in store

---

## ✅ **Solutions**

### Solution 1: Check Session Validity

```javascript
// In browser console:
const session = JSON.parse(localStorage.getItem('napalmsky_session'));

// Check if session exists on server
fetch('https://napalmsky-production.up.railway.app/user/me', {
  headers: { 'Authorization': `Bearer ${session.sessionToken}` }
})
.then(r => {
  if (r.ok) {
    console.log('✅ Session is valid');
  } else {
    console.log('❌ Session is INVALID - need to re-login');
    localStorage.removeItem('napalmsky_session');
    window.location.href = '/onboarding';
  }
});
```

### Solution 2: Clear and Recreate Session

If session is invalid:

```javascript
// Clear everything
localStorage.clear();
sessionStorage.clear();

// Go to onboarding
window.location.href = '/onboarding';

// Sign up again (or login if you made account permanent)
```

---

## 🔍 **Why This Happens**

### Scenario A: Server Restart
```
1. User signs up → session saved to memory
2. Server restarts → memory cleared
3. User's localStorage still has old sessionToken
4. User opens app → tries to auth
5. Server doesn't recognize token → auth:failed
```

**Fix:** Clear localStorage and re-signup

### Scenario B: Hybrid Database Mode
```
1. User signs up → session saved to memory
2. DATABASE_URL not set → only in memory
3. Container restarts → sessions lost
4. But users persist (if any were in DB)
5. Session tokens orphaned → auth fails
```

**Fix:** Set DATABASE_URL for session persistence

---

## 📊 **Debug Checklist**

Run these checks in order:

### 1. Check Payment Status
```javascript
fetch('/payment/status', { headers: { Authorization: 'Bearer ...' } })
// Should return: { paidStatus: 'paid' or 'qr_verified' }
```

### 2. Check Session Validity
```javascript
fetch('/user/me', { headers: { Authorization: 'Bearer ...' } })
// Should return: 200 OK with user data
```

### 3. Check Socket Connection
```javascript
// Browser console should show:
// [Socket] Connected: xxx
// [Socket] Authenticated  ← Should see this!
```

### 4. Check Queue Join
```javascript
// Backend logs should show:
// [Queue] xxx joined queue - online: true, available: true
// [Queue] ✅ Verified xxx is now available
```

---

## ✅ **Expected Behavior**

### Correct Flow:
```
1. Open matchmaking
2. Socket connects
3. Emits 'auth' with sessionToken
4. Server validates session
5. Server checks user exists
6. Server emits 'auth:success'
7. Client receives 'auth:success'
8. Client emits 'presence:join'
9. Client emits 'queue:join'
10. Server marks user as available
11. Client fetches queue (/room/queue API)
12. API checks requirePayment
13. Validates paidStatus === 'paid' or 'qr_verified'
14. Returns list of users
15. Matchmaking shows users
```

### If Auth Fails:
```
1-5. Same as above
6. Server emits 'auth:failed'  ← Problem!
7. Client logs error
8. Queue:join not called
9. User not marked as available
10. Queue shows 0 users
```

---

## 🚨 **Most Likely Cause**

Based on your logs showing "Authentication failed":

**Your session token is invalid or expired.**

**Fix:**
1. Clear localStorage
2. Sign up/login again
3. Complete onboarding
4. Try matchmaking

The new session will work correctly.

---

## 📝 **Long-Term Fix**

Add SESSION persistence to database:

**Railway Variables:**
```
DATABASE_URL=postgresql://connection-string
```

Then sessions survive server restarts!

---

See this guide for complete diagnostic steps.

