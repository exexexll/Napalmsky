# QR VERIFICATION PIPELINE - COMPLETE TRACE

## STEP 1: User Signs Up With Invite Code

**File:** `server/src/auth.ts` Line 24
**Endpoint:** POST /auth/guest

### Code Flow:
```typescript
Line 43: if (inviteCode) {
Line 52:   const result = store.useInviteCode(sanitizedCode, userId, name)
Line 62:   codeVerified = true

Line 119:  paidStatus: codeVerified ? 'qr_grace_period' : 'unpaid',  
Line 124:  qrUnlocked: false,
Line 125:  successfulSessions: 0,
```

### Database Write:
**File:** `server/src/store.ts` Line 117
```typescript
INSERT INTO users (..., paid_status, qr_unlocked, successful_sessions)
VALUES (..., $10, $20, $21)
// $10 = 'qr_grace_period'
// $20 = false
// $21 = 0
```

**✅ VERIFIED:** User created with grace period status

---

## STEP 2: User Completes Video Call (30s+)

**File:** `server/src/index.ts` Line 828
**Socket Event:** call:end

### Code Flow:
```typescript
Line 838: const actualDuration = Math.floor((Date.now() - room.startedAt) / 1000);

Line 843: if (actualDuration >= 30) {
Line 844:   await store.trackSessionCompletion(room.user1, room.user2, roomId, actualDuration);
Line 845:   await store.trackSessionCompletion(room.user2, room.user1, roomId, actualDuration);
```

**✅ VERIFIED:** trackSessionCompletion called for both users

---

## STEP 3: Track Session Completion

**File:** `server/src/store.ts` Line 1228
**Method:** trackSessionCompletion()

### Code Flow:
```typescript
Line 1232: if (durationSeconds < 30) return;  // Guard

Line 1240: await query(
             `INSERT INTO session_completions (user_id, partner_id, room_id, duration_seconds)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (user_id, room_id) DO NOTHING`
           );

Line 1248: const countResult = await query(
             `SELECT COUNT(*) as count FROM session_completions WHERE user_id = $1`
           );

Line 1253: const totalSessions = parseInt(countResult.rows[0]?.count || '0');

Line 1257: await query(
             `UPDATE users SET successful_sessions = $1 WHERE user_id = $2`,
             [totalSessions, userId]
           );
```

**✅ VERIFIED:** Completion recorded, count updated

---

## STEP 4: Check If QR Should Unlock

**File:** `server/src/store.ts` Line 1262
**Still in trackSessionCompletion()**

### Code Flow:
```typescript
Line 1263: if (totalSessions >= 4) {
Line 1264:   const userResult = await query(
               `SELECT qr_unlocked FROM users WHERE user_id = $1`
             );

Line 1269:   if (userResult.rows[0] && !userResult.rows[0].qr_unlocked) {
Line 1270:     await query(
                 `UPDATE users SET qr_unlocked = TRUE, qr_unlocked_at = NOW(), paid_status = 'qr_verified'
                  WHERE user_id = $1`
               );

Line 1279:     const user = await this.getUser(userId);
Line 1280:     if (user) {
Line 1281:       user.qrUnlocked = true;
Line 1282:       user.successfulSessions = totalSessions;
Line 1283:       user.qrUnlockedAt = Date.now();
Line 1285:       user.paidStatus = 'qr_verified';
```

**✅ VERIFIED:** QR unlocks after 4 sessions

---

## STEP 5: Notify User via Socket

**File:** `server/src/index.ts` Line 848
**Back in call:end handler**

### Code Flow:
```typescript
Line 848: const user1Status = await store.getQrUnlockStatus(room.user1);
Line 849: const user2Status = await store.getQrUnlockStatus(room.user2);

Line 851: if (user1Status.unlocked && user1Status.sessionsCompleted === 4) {
Line 854:   io.to(user1Socket).emit('qr:unlocked', {
             message: '🎉 Congratulations! You\'ve unlocked your QR code!',
             sessionsCompleted: 4,
           });
```

**✅ VERIFIED:** Socket event emitted

---

## STEP 6: Frontend Gets Status

**File:** `server/src/payment.ts` Line 330
**Endpoint:** GET /payment/status

### Code Flow:
```typescript
Line 338: const result = await query('SELECT * FROM users WHERE user_id = $1');

Line 350: qrUnlocked: row.qr_unlocked || false,
Line 351: successfulSessions: row.successful_sessions || 0,
Line 352: qrUnlockedAt: row.qr_unlocked_at,

Line 390: qrUnlocked: user.qrUnlocked || false,
Line 391: successfulSessions: user.successfulSessions || 0,
Line 392: qrUnlockedAt: user.qrUnlockedAt,
```

**✅ VERIFIED:** Response includes QR fields

---

## STEP 7: Settings Page Displays Status

**File:** `app/settings/page.tsx` Line 175

### Code Flow:
```typescript
Line 39: .then(data => setPaymentStatus(data))

// If in grace period and NOT unlocked:
Line 175: {paymentStatus.paidStatus === 'qr_grace_period' && !paymentStatus.qrUnlocked && (
Line 180:   {paymentStatus.successfulSessions || 0} / 4 sessions
Line 185:   Complete {4 - (paymentStatus.successfulSessions || 0)} more calls

// If unlocked OR paid:
Line 199: {(paidStatus === 'paid' || (paidStatus === 'qr_verified' && qrUnlocked) || (paidStatus === 'qr_grace_period' && qrUnlocked)) && myInviteCode && (
Line 211:   {paymentStatus.myInviteCode}  // Shows QR code
```

**✅ VERIFIED:** UI shows progress and QR when unlocked

---

## 🔍 POTENTIAL ISSUES FOUND

### Issue #1: getQrUnlockStatus Logic ⚠️

**File:** `server/src/store.ts` Line 1314

```typescript
async getQrUnlockStatus(userId: string): Promise<{ unlocked: boolean; sessionsCompleted: number; sessionsNeeded: number }> {
  const user = await this.getUser(userId);
  
  return {
    unlocked: user?.qrUnlocked || false,
    sessionsCompleted: user?.successfulSessions || 0,
    sessionsNeeded: 4,
  };
}
```

**Problem:** This reads from cache, which might be stale!

**Fix Needed:** Should query database directly for most accurate count.

---

### Issue #2: Notification Check ⚠️

**File:** `server/src/index.ts` Line 851

```typescript
if (user1Status.unlocked && user1Status.sessionsCompleted === 4)
```

**Problem:** This ONLY fires when sessionsCompleted === EXACTLY 4.
If user already had 4+ sessions, it won't notify again.

**This is OK** - notification should only fire once on 4th unlock.

---

### Issue #3: Memory Cache Invalidation ⚠️

After updating successful_sessions in database, the in-memory cache might still have old value.

**Location:** After Line 1257 in store.ts

**Should invalidate cache** to force fresh read.

---

## 🔧 CRITICAL FIXES NEEDED

Let me fix these issues...

