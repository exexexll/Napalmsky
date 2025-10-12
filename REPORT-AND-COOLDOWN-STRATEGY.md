# Report Button & Cooldown Display Strategy

## Current State Analysis

### Existing Cooldown System
✅ **Already implemented:**
- 24h cooldown set when call ends (`server/src/index.ts:532`)
- Cooldown check filters users from queue (`server/src/room.ts:109`)
- User cards filtered out completely if cooldown exists

### Issues to Fix

1. **Report button not activating** - Need to debug
2. **Cooldown visibility** - Users with cooldown are hidden, should be visible with disabled button
3. **Reported users** - Need to hide completely from reel (but not affect user count)

---

## Implementation Plan

### 1. Fix Report Button
**Location:** `app/room/[roomId]/page.tsx`

**Current flow:**
- Button appears in "ended" view state
- Calls `handleReportUser()` which uses `reportUser()` API
- Should work but need to verify peerUserId is passed correctly

**Fix:**
- Ensure `peerUserId` is available in ended state
- Add error handling and logging
- Verify session token is valid

---

### 2. Cooldown Display on User Cards

**Problem:** Users with 24h cooldown are completely filtered out

**Solution:** Show them but disable interaction

**Backend changes needed:**
```typescript
// server/src/room.ts - GET /room/queue
// Instead of filtering out cooldown users, mark them
const users = onlineUsers.map(uid => {
  const user = store.getUser(uid);
  const hasCooldown = store.hasCooldown(req.userId, uid);
  
  return {
    ...user,
    cooldownStatus: hasCooldown ? {
      active: true,
      expiresAt: getCooldownExpiry(req.userId, uid)
    } : null
  };
});
```

**Frontend changes needed:**
```typescript
// components/matchmake/MatchmakeOverlay.tsx
// Pass cooldown status to UserCard
<UserCard
  user={user}
  inviteStatus={user.cooldownStatus?.active ? 'cooldown' : 'idle'}
  cooldownExpiry={user.cooldownStatus?.expiresAt}
/>

// components/matchmake/UserCard.tsx
// Show cooldown message with time remaining
if (inviteStatus === 'cooldown') {
  // Calculate hours/minutes remaining
  // Show "24h cooldown - Try again in Xh Ym"
  // Disable talk button
}
```

---

### 3. Hide Reported Users

**Flow:**
```
User A reports User B
↓
Store tracks: reporterHistory[UserA].add(UserB)
↓
When User A fetches queue:
  - Filter out User B entirely
  - User count shown (top right) = total available (before filter)
  - Actual cards shown = available - reported users
```

**Backend changes:**

**Store method (already exists):**
```typescript
// server/src/store.ts
hasReportedUser(reporterUserId: string, reportedUserId: string): boolean {
  const reportedUsers = this.reporterHistory.get(reporterUserId);
  return reportedUsers ? reportedUsers.has(reportedUserId) : false;
}
```

**Queue endpoint update:**
```typescript
// server/src/room.ts - GET /room/queue
const users = onlineUsers
  .map(uid => {
    // Check if current user reported this user
    if (store.hasReportedUser(req.userId, uid)) {
      console.log(`[Queue API] 🚫 Hiding ${uid} (reported by current user)`);
      return null; // Hide entirely
    }
    
    // Check cooldown
    const hasCooldown = store.hasCooldown(req.userId, uid);
    
    return {
      ...user,
      hasCooldown,
      cooldownExpiry: hasCooldown ? getCooldownExpiry(...) : null
    };
  })
  .filter(Boolean);
```

**User count (top right):**
```typescript
// components/matchmake/MatchmakeOverlay.tsx
// Show total available count BEFORE filtering reported users
<p className="text-xs text-white/90 drop-shadow">
  {totalAvailableCount} {totalAvailableCount === 1 ? 'person' : 'people'} online
</p>
```

---

## Detailed Changes Needed

### Backend Files

#### 1. `server/src/store.ts`
Add method to get cooldown expiry time:
```typescript
getCooldownExpiry(userId1: string, userId2: string): number | null {
  const key = [userId1, userId2].sort().join('|');
  return this.cooldowns.get(key) || null;
}
```

#### 2. `server/src/room.ts`
Update `/room/queue` endpoint:
- Don't filter cooldown users, mark them instead
- Filter out reported users entirely
- Return both `users` and `totalAvailable` count

```typescript
router.get('/queue', requireAuth, (req: any, res) => {
  const onlineUsers = store.getAllOnlineAvailable(req.userId);
  const testMode = req.query.testMode === 'true';
  const totalAvailable = onlineUsers.length; // Before any filtering
  
  const users = onlineUsers
    .map(uid => {
      const user = store.getUser(uid);
      
      // Hide if current user reported this user
      if (store.hasReportedUser(req.userId, uid)) {
        return null; // Don't show at all
      }
      
      // Check cooldown (show but mark as unavailable)
      const hasCooldown = !testMode && store.hasCooldown(req.userId, uid);
      const cooldownExpiry = hasCooldown 
        ? store.getCooldownExpiry(req.userId, uid) 
        : null;
      
      return {
        userId: user.userId,
        name: user.name,
        gender: user.gender,
        selfieUrl: user.selfieUrl,
        videoUrl: user.videoUrl,
        hasCooldown,
        cooldownExpiry,
      };
    })
    .filter(Boolean);

  res.json({ 
    users,
    totalAvailable // Total before reported user filter
  });
});
```

### Frontend Files

#### 1. `lib/matchmaking.ts`
Update type definitions:
```typescript
export interface ReelUser {
  userId: string;
  name: string;
  gender: 'female' | 'male' | 'nonbinary' | 'unspecified';
  selfieUrl?: string;
  videoUrl?: string;
  hasCooldown?: boolean;
  cooldownExpiry?: number | null;
}

export interface QueueResponse {
  users: ReelUser[];
  totalAvailable: number;
}
```

#### 2. `components/matchmake/MatchmakeOverlay.tsx`
- Store `totalAvailable` count separately
- Pass cooldown info to UserCard
- Set inviteStatus to 'cooldown' if user has cooldown

```typescript
const [totalAvailable, setTotalAvailable] = useState(0);

const loadInitialQueue = async () => {
  const queueData = await getQueue(session.sessionToken);
  setUsers(queueData.users);
  setTotalAvailable(queueData.totalAvailable); // Store total
};

// In render:
<p className="text-xs text-white/90">
  {totalAvailable} {totalAvailable === 1 ? 'person' : 'people'} online
</p>

<UserCard
  user={user}
  inviteStatus={user.hasCooldown ? 'cooldown' : inviteStatuses[user.userId]}
  cooldownExpiry={user.cooldownExpiry}
/>
```

#### 3. `components/matchmake/UserCard.tsx`
- Add `cooldownExpiry` prop
- Calculate time remaining
- Show cooldown message on button

```typescript
interface UserCardProps {
  ...existing props
  cooldownExpiry?: number | null;
}

// In component:
const getButtonText = () => {
  if (isSelf) return "That's you!";
  if (inviteStatus === 'waiting') return 'Waiting...';
  if (inviteStatus === 'cooldown') {
    if (cooldownExpiry) {
      const remaining = cooldownExpiry - Date.now();
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      return `24h cooldown (${hours}h ${minutes}m remaining)`;
    }
    return '24h cooldown';
  }
  return getPronounCTA();
};

<button
  onClick={() => !isSelf && !inviteStatus === 'cooldown' && onInvite(user.userId, seconds)}
  disabled={inviteStatus === 'waiting' || inviteStatus === 'cooldown' || seconds < 1 || isSelf}
  ...
>
  {getButtonText()}
</button>
```

#### 4. `app/room/[roomId]/page.tsx`
Fix report button:
- Ensure peerUserId is stored properly
- Add better error handling
- Log success/failure

---

## Testing Checklist

### Cooldown Display
- [ ] Complete a call with User B
- [ ] Return to matchmaking
- [ ] Verify User B appears in reel
- [ ] Verify User B's card shows cooldown message
- [ ] Verify "Talk to them" button is disabled
- [ ] Verify cooldown time displays correctly
- [ ] Verify other users without cooldown still work normally

### Report & Hide
- [ ] Complete a call with User C
- [ ] Report User C
- [ ] Return to matchmaking
- [ ] Verify User C does NOT appear in reel at all
- [ ] Verify user count (top right) still includes User C in total
- [ ] Verify User C is hidden permanently for this user
- [ ] Verify other users see User C normally (they didn't report)

### Report Button
- [ ] Complete a call
- [ ] Click "Report & Block User" button
- [ ] Modal appears with reason field
- [ ] Submit report
- [ ] See success message
- [ ] Verify can only report once

---

## Summary

**Changes Required:**
1. ✅ Backend: Add `getCooldownExpiry()` method to store
2. ✅ Backend: Update `/room/queue` to mark cooldown users (not filter)
3. ✅ Backend: Filter out reported users from queue
4. ✅ Backend: Return `totalAvailable` count
5. ✅ Frontend: Update matchmaking types
6. ✅ Frontend: Store and display `totalAvailable` count
7. ✅ Frontend: Pass cooldown status to UserCard
8. ✅ Frontend: Display cooldown time remaining on button
9. ✅ Frontend: Fix/verify report button functionality

**Key Principle:**
- **Cooldown users:** Show but disable with time remaining
- **Reported users:** Hide completely, but still count in total
- **User count:** Always shows total available (before reported filter)

