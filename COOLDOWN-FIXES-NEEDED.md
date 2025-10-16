# 🔒 Cooldown System Fixes Needed

## 🐛 Current Issues Found

### Issue #1: Escape Waiting Screen (NO COOLDOWN!)
```
Current Behavior:
1. User A sends invite to User B
2. Waiting screen shows with 20s countdown
3. User A clicks X button (close matchmaking)
4. Overlay closes
5. NO COOLDOWN SET! ❌
6. User A can immediately invite User B again!

Expected Behavior:
- Clicking X should call rescind
- Sets 1h cooldown
- Prevents spam invites
```

### Issue #2: Timeout on Waiting (INCORRECT COOLDOWN?)
```
Current Behavior (from server code):
- CalleeNotification auto-declines after 20s timeout
- Backend: onDecline sets 24h cooldown
- But should it be 1h like rescind?

Question: What's correct?
- Timeout (no response): 1h or 24h?
- Active decline: 24h? (currently)
```

### Issue #3: Page Close During Waiting
```
Current Behavior:
- User A waiting for response
- User A closes browser tab
- Socket disconnects
- Backend sees disconnect
- NO invite cleanup? 
- Invite just expires?

Expected: Should set cooldown on disconnect while waiting
```

---

## 🎯 Cooldown Classification (From Server Code)

### Current Implementation:

#### 1h Cooldown (Mild):
```typescript
// server/src/index.ts line 735-736
// When: Caller rescind (cancels own invite)
const cooldownUntil = Date.now() + (60 * 60 * 1000); // 1 hour
await store.setCooldown(currentUserId, toUserId, cooldownUntil);
```

#### 24h Cooldown (Severe):
```typescript
// server/src/index.ts line 685-686
// When: Callee declines (rejects invite)
const cooldownUntil = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
await store.setCooldown(invite.fromUserId, invite.toUserId, cooldownUntil);

// server/src/index.ts line 899-900
// When: Call completes successfully
const cooldownUntil = Date.now() + (24 * 60 * 60 * 1000);
await store.setCooldown(room.user1, room.user2, cooldownUntil);

// server/src/index.ts line 1022-1023
// When: Disconnect during call
const cooldownUntil = Date.now() + (24 * 60 * 60 * 1000);
await store.setCooldown(room.user1, room.user2, cooldownUntil);
```

---

## ✅ Proposed Logic

### Cooldown Tiers:

#### 1h Cooldown (Caller Initiated):
- ✅ Caller rescind (cancel own invite)
- ✅ Caller closes matchmaking while waiting
- ✅ Caller timeout waiting for response
- **Reason:** Caller changed mind, mild penalty

#### 24h Cooldown (Mutual/Completed):
- ✅ Callee declines (active rejection)
- ✅ Call completes successfully
- ✅ Disconnect during active call
- **Reason:** Real interaction happened, longer cooldown prevents spam

---

## 🔧 Fixes Needed

### Fix #1: Track Active Invite in MatchmakeOverlay
```typescript
// In MatchmakeOverlay.tsx
const [activeOutgoingInvite, setActiveOutgoingInvite] = useState<{
  toUserId: string;
  inviteId: string;
} | null>(null);

// When sending invite:
socket.emit('call:invite', { toUserId, requestedSeconds });
setActiveOutgoingInvite({ toUserId, inviteId: /* from response */ });

// When closing overlay:
const handleClose = () => {
  if (activeOutgoingInvite) {
    // Rescind active invite before closing
    socket.emit('call:rescind', { toUserId: activeOutgoingInvite.toUserId });
    setActiveOutgoingInvite(null);
  }
  onClose();
};
```

### Fix #2: Timeout Should Set Cooldown
```
Current: Auto-decline calls onDecline → 24h cooldown
Question: Should timeout be 1h instead?

Option A: Keep 24h (recipient ignored you)
Option B: Change to 1h (no response isn't as bad as active decline)

I think: Keep 24h (current behavior)
```

### Fix #3: Prevent X Button During Waiting
```typescript
// Simpler approach: Disable X button while waiting
{inviteStatus !== 'waiting' && (
  <button onClick={onClose} className="...">
    <X />
  </button>
)}

// Or show warning:
const handleClose = () => {
  if (activeOutgoingInvite) {
    if (confirm('Cancel your call request? This will set a 1h cooldown.')) {
      rescind and close
    }
  } else {
    onClose();
  }
};
```

---

## 📱 UI Overlap Issues

### Issue: Buttons Overlapping (from screenshot)
```
Problem: Z-index issues, buttons in different layers overlapping
Need to check: UserCard.tsx layer structure
```

### Issue: Mobile Layout
```
Current: Same layout for desktop and mobile
Needed: 
- Smaller padding on mobile
- Larger touch targets
- Different button positioning
- Already have some: isMobile detection exists!
```

---

## 🚀 Recommended Approach

### Priority 1 (Critical):
1. Add rescind on overlay close while waiting
2. Verify timeout cooldown is set
3. Test all cooldown scenarios

### Priority 2 (Important):
4. Fix UI overlaps (z-index)
5. Improve mobile layout

### Priority 3 (Nice to have):
6. Add confirmation dialog for closing while waiting
7. Show cooldown warning before actions

Want me to implement these fixes?

