# Cooldown System - Complete Documentation
**Updated:** October 10, 2025  
**Status:** ✅ Simplified - Only 3 cooldown scenarios

---

## 📊 **Complete Cooldown Policy (SIMPLIFIED)**

| Scenario | Cooldown Duration | Rationale | Status |
|----------|-------------------|-----------|--------|
| **Successful call** | 24 hours | Prevent immediate re-matching | ✅ Working |
| **User declines invite** | 24 hours | Respect explicit "no" from recipient | ✅ Working |
| **Caller cancels/rescinds** | **1 hour** | Prevent spam, allow retry | ✅ Working |
| ~~Invite times out~~ | ~~Removed~~ | User controls timing now | ❌ **REMOVED** |

**Key Change:** No auto-timeout! User has full control over when to give up waiting.

---

## 🔄 **All Possible Invite States & Outcomes**

### **State 1: WAITING (User has full control)**
**What's happening:** User A sent invite to User B, waiting for response

**Possible outcomes:**
1. ✅ **User B accepts** → Match starts, no cooldown until AFTER call ends (24h post-call)
2. ❌ **User B declines** → 24h cooldown (respect User B's choice)
3. 🚫 **User A cancels** (at any time) → 1h cooldown (User A gave up)
4. ⏳ **User A keeps waiting** → Can wait indefinitely until B responds

---

### **State 2: RESCIND/CANCEL (User A decides to give up)**
**What causes rescind:**
- User A clicks "Cancel Request" button (appears at 20 seconds, or can wait longer)
- User A realizes they picked wrong person
- User A wants to invite someone else instead
- User A gave up waiting for response

**Server logic:**
```typescript
// server/src/index.ts line 560-599
socket.on('call:rescind', ({ toUserId }: { toUserId: string }) => {
  // Find active invite from current user to target
  const invite = Array.from(store['activeInvites'].values()).find(
    inv => inv.fromUserId === currentUserId && inv.toUserId === toUserId
  );
  
  // Notify callee that invite was cancelled
  io.to(calleeSocket).emit('call:rescinded', { inviteId: invite.inviteId });
  
  // Set 1h cooldown
  const cooldownUntil = Date.now() + (60 * 60 * 1000);
  store.setCooldown(currentUserId, toUserId, cooldownUntil);
});
```

**Why 1 hour?**
- Prevents spam re-invites
- Allows same-day retry
- Shorter than decline (24h) since caller initiated the cancel
- Balances spam prevention with user flexibility

---

## 🎯 **Why Different Cooldown Durations?**

### **24 Hours (Longest) - Respect & Safety**
Used for:
- **Post-call:** You already talked, give it time before re-matching
- **Explicit decline:** User clearly said "no", respect that choice

**Purpose:** Prevent harassment, spam, unwanted repeat invites

---

### **1 Hour (Shorter) - Anti-Spam with Flexibility**
Used for:
- **Rescind:** Caller cancelled their own invite

**Purpose:**
- Prevent rapid-fire invite spam (can't spam someone every minute)
- Allow same-day retry if they change their mind
- Less punitive than decline (user is managing their own behavior)
- Gives recipient time before being re-invited

---

## 🚫 **Technical Flow: Rescind/Cancel Example**

### **Timeline of Events:**

```
T = 0s:
  [Client] User A clicks "Talk to her" on User B's card
  [Client] Emits: socket.emit('call:invite', { toUserId: B, requestedSeconds: 300 })
  [Server] Generates inviteId, creates invite
  [Server] Emits to User B: socket.emit('call:notify', { inviteId, fromUser: A, ... })
  [Client A] Status: 'waiting', countdown shows 20, 19, 18...

T = 20s:
  [Client A] Countdown reaches 0
  [Client A] Shows "No response yet..." message
  [Client A] Buttons appear: "Cancel Request" | "Keep Waiting"
  [Server] Invite still active (NO auto-timeout)
  [User B] Notification still showing

T = 35s:
  [Client A] User A decides to give up, clicks "Cancel Request"
  [Client] Emits: socket.emit('call:rescind', { toUserId: B })
  [Server] Finds active invite from A to B
  [Server] Emits to User B: socket.emit('call:rescinded', { inviteId })
  [Server] Sets cooldown: store.setCooldown(A, B, now + 1hour)
  [Server] Deletes invite
  [Client A] Immediately sets status to 'cooldown'
  [Client A] Shows toast: "Invite cancelled — 1h cooldown"
  [Client A] Button: "On cooldown (59m 59s)"
  [Client B] Incoming invite notification disappears
  [Client B] Shows toast: "Invite was cancelled"

T = 35s + 1h:
  [Server] Cooldown expires
  [Client A] Next queue refresh shows User B available
  [Client A] Button: "Talk to her" (can invite again)
```

---

## 🎮 **User Experience Examples**

### **Example 1: User Gives Up Waiting**
```
User A invites User B
User B is away from computer
20 seconds pass → UI shows "Cancel Request" | "Keep Waiting"
User A waits 40 more seconds (1 minute total)
User A clicks "Cancel Request"
Result: 1h cooldown

After 1 hour: User A can try again
```

### **Example 2: User Keeps Waiting**
```
User A invites User B
20 seconds pass → "Keep Waiting" appears
User A clicks "Keep Waiting" → timer resets to 20s
Another 20 seconds → "Keep Waiting" appears again
User A clicks "Keep Waiting" again
User B finally comes back and accepts!
Result: Match starts! No cooldown yet
```

### **Example 3: Spam Prevention**
```
User A invites User B
User B declines within 5 seconds
Result: 24h cooldown

User A cannot spam User B for 24 hours
User B is protected from harassment
```

### **Example 4: Successful Match**
```
User A invites User B
User B accepts
They have a 5-minute call
Call ends naturally
Result: 24h cooldown

Both users cannot re-match for 24 hours
Encourages meeting new people
```

---

## 🛡️ **Anti-Abuse Design**

### **Protection Against:**

1. **Invite Spam**
   - ✅ 15min cooldown on cancel prevents rapid-fire invites
   - ✅ 4h timeout cooldown prevents targeting AFK users repeatedly

2. **Harassment**
   - ✅ 24h cooldown on decline prevents ignoring "no"
   - ✅ Cooldown is bidirectional (neither can invite the other)

3. **Gaming the System**
   - ✅ Cannot bypass cooldown by cancelling quickly (still 15min)
   - ✅ Cannot reset by logging out (cooldown stored server-side)
   - ✅ Test mode only works in development (disabled in production)

---

## 📝 **Server-Side Cooldown Storage**

### **How it works:**

```typescript
// server/src/store.ts
private cooldowns = new Map<string, number>(); // "userId1|userId2" -> expiresAt

// Key generation (bidirectional)
private getCooldownKey(userId1: string, userId2: string): string {
  // Always same key regardless of order
  return userId1 < userId2 
    ? `${userId1}|${userId2}`
    : `${userId2}|${userId1}`;
}

// Setting cooldown
setCooldown(userA, userB, expiresAt): void {
  const key = this.getCooldownKey(userA, userB);
  this.cooldowns.set(key, expiresAt);
}

// Checking cooldown
hasCooldown(userA, userB): boolean {
  const key = this.getCooldownKey(userA, userB);
  const expires = this.cooldowns.get(key);
  return expires && expires > Date.now();
}
```

**Key features:**
- ✅ Bidirectional (if A → B has cooldown, B → A also has cooldown)
- ✅ Survives page refresh (stored on server)
- ✅ Automatically expires (checked on every hasCooldown call)
- ❌ Lost on server restart (in-memory storage)
- 🔜 Will persist to database in cloud migration

---

## 🧪 **Testing Each Scenario**

### **Test 1: Timeout (4h cooldown)**
```bash
# Steps:
1. Open two browsers (User A, User B)
2. User A sends invite to User B
3. User B: DO NOTHING for 20 seconds
4. User A should see: "No response — 4h cooldown activated"
5. User A button should show: "On cooldown"

# Expected console logs (User A):
[Matchmake] 📞 Sending invite...
[Matchmake] 📞 Invite declined - Reason: timeout
[Matchmake] ⏰ Setting cooldown status and showing toast
[UserCard] ✅ Clearing safety timeout

# Expected console logs (Server):
[Invite] fa6882f3 timed out after 20s
[Cooldown] Set 4h cooldown after timeout: userA ↔ userB
```

### **Test 2: Rescind (15min cooldown)**
```bash
# Steps:
1. Open two browsers (User A, User B)
2. User A sends invite to User B
3. User A clicks "Cancel" at 5 seconds
4. User A should see: "Invite cancelled — 15min cooldown"
5. User B notification should disappear
6. User B should see: "Invite was cancelled"

# Expected console logs (User A):
[Matchmake] 🚫 Rescinding invite to: fa6882f3
[Matchmake] ✅ Rescind sent, cooldown status set

# Expected console logs (User B):
[Matchmake] 🚫 Incoming invite was rescinded: xxx

# Expected console logs (Server):
[Rescind] User userA rescinding invite to userB
[Cooldown] Set 15min cooldown after rescind: userA ↔ userB
```

### **Test 3: Decline (24h cooldown)**
```bash
# Steps:
1. User A sends invite to User B
2. User B clicks "Decline"
3. User A should see: "Declined — 24h cooldown activated"

# Expected:
[Matchmake] Invite declined: user_declined
[Cooldown] Set 24h cooldown after decline
```

---

## 🔮 **Future Enhancements (Cloud Migration)**

### **Planned improvements:**

1. **Persistent Cooldowns**
   ```sql
   CREATE TABLE cooldowns (
     user_id_1 UUID,
     user_id_2 UUID,
     expires_at TIMESTAMP,
     reason VARCHAR(20), -- 'timeout', 'decline', 'rescind', 'post_call'
     created_at TIMESTAMP
   );
   ```

2. **Admin Override**
   - Admin panel to clear specific cooldowns
   - Bulk cooldown management
   - Cooldown history/analytics

3. **Configurable Durations**
   ```typescript
   // Environment variables
   COOLDOWN_POST_CALL=24h
   COOLDOWN_DECLINE=24h  
   COOLDOWN_TIMEOUT=4h
   COOLDOWN_RESCIND=15m
   ```

4. **User Notifications**
   - "You can now reconnect with [Name]" when cooldown expires
   - Cooldown countdown in UI
   - Reason shown to user ("declined", "timed out", etc.)

---

## 📋 **Summary: When Does Each Cooldown Trigger?**

| User Action | Server Event | Cooldown Set | Duration |
|-------------|--------------|--------------|----------|
| Send invite → Accept → Call ends | `call:accept` → `call:end` | After call ends | 24 hours |
| Send invite → Recipient declines | `call:decline` | Immediately | 24 hours |
| Send invite → Caller cancels | `call:rescind` | Immediately | 1 hour |

---

## ✅ **All Issues Fixed**

### **Before:**
- ❌ Auto-timeout at 20s with 24h cooldown (too harsh)
- ❌ Rescind: No cooldown (spam vulnerability)
- ❌ UI didn't update to cooldown status
- ❌ Blocking alert dialogs
- ❌ React duplicate key warnings

### **After (Today's fixes):**
- ✅ **Removed auto-timeout** - user controls when to give up
- ✅ **Rescind: 1h cooldown** (prevents spam, allows retry)
- ✅ **UI updates properly** (fixed inviteStatus priority)
- ✅ **Toast messages** show correct durations
- ✅ **No blocking alerts** (removed completely)
- ✅ **Deduplication** prevents React warnings
- ✅ **Comprehensive logging** for debugging

---

## 🎯 **Why This System Works**

1. **Fair to Users**
   - Timeout isn't punished as harshly as decline
   - Allows change of mind with short rescind cooldown
   - Respects explicit "no" with long decline cooldown

2. **Prevents Abuse**
   - All actions have consequences (no free spam)
   - Bidirectional cooldowns (can't circumvent)
   - Server-side enforcement (can't hack client)

3. **Good UX**
   - Clear feedback (toasts explain what happened)
   - Button shows cooldown status
   - Countdown timer shows time remaining

4. **Scalable**
   - Works with in-memory store (now)
   - Easy to migrate to database (later)
   - Environment-configurable durations

---

*Document created: October 10, 2025*  
*Last updated: After rescind cooldown implementation*  
*Status: All cooldown scenarios now covered*

