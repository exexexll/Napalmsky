# 🔍 Timer Averaging - Complete Flow Trace

## 📊 **The Flow (Should Be Working)**

### Step 1: User A Invites (300 seconds)
```typescript
// components/matchmake/UserCard.tsx
socketRef.current.emit('call:invite', {
  toUserId: userB_id,
  requestedSeconds: 300  // ← User A's time
});
```

### Step 2: Server Receives Invite
```typescript
// server/src/index.ts:383
socket.on('call:invite', async ({ toUserId, requestedSeconds }) => {
  // requestedSeconds = 300
  
  store.createInvite({
    inviteId,
    fromUserId: currentUserId,  // User A
    toUserId,  // User B
    createdAt: Date.now(),
    callerSeconds: 300  // ← Stored as callerSeconds
  });
});
```

### Step 3: User B Receives Invite
```typescript
// User B's browser receives:
socket.on('call:notify', (invite) => {
  // invite.requestedSeconds = 300
  // Shows notification with timer slider
});
```

### Step 4: User B Accepts (200 seconds)
```typescript
// components/matchmake/CalleeNotification.tsx
socketRef.current.emit('call:accept', {
  inviteId: invite.inviteId,
  requestedSeconds: 200  // ← User B's time
});
```

### Step 5: Server Calculates Average
```typescript
// server/src/index.ts:482-507
socket.on('call:accept', async ({ inviteId, requestedSeconds }) => {
  const invite = store.getInvite(inviteId);
  
  // invite.callerSeconds = 300 (User A)
  // requestedSeconds = 200 (User B)
  
  const agreedSeconds = Math.floor((300 + 200) / 2);  // = 250
  
  console.log(`[Call] Averaging times: 300s (caller) + 200s (callee) = 250s (average)`);
});
```

### Step 6: Server Emits to Both Users
```typescript
// server/src/index.ts:534-555
io.to(callerSocket).emit('call:start', {
  roomId,
  agreedSeconds: 250,  // ← Averaged value
  isInitiator: true,
  peerUser: { userId: userB, name: 'Bob' }
});

io.to(calleeSocket).emit('call:start', {
  roomId,
  agreedSeconds: 250,  // ← Same averaged value
  isInitiator: false,
  peerUser: { userId: userA, name: 'Alice' }
});
```

### Step 7: Both Clients Navigate
```typescript
// components/matchmake/MatchmakeOverlay.tsx:322-328
socket.on('call:start', ({ roomId, agreedSeconds, isInitiator, peerUser }) => {
  console.log('[Matchmake] Call starting:', { 
    roomId, 
    agreedSeconds: 250,  // ← Should log 250
    isInitiator, 
    peerUser 
  });
  
  router.push(`/room/${roomId}?duration=250&peerId=${peerUser.userId}&...`);
  //                              ↑
  //                         Should be 250!
});
```

### Step 8: Room Page Reads URL
```typescript
// app/room/[roomId]/page.tsx:28
const agreedSeconds = parseInt(searchParams.get('duration') || '0');
// agreedSeconds = 250

console.log('[Room] URL Params:', {
  duration: '250',  // ← Should be '250'
  agreedSeconds: 250  // ← Should be 250
});
```

### Step 9: Initialize Timer State
```typescript
// app/room/[roomId]/page.tsx:44
const [timeRemaining, setTimeRemaining] = useState(agreedSeconds);
// timeRemaining = 250
```

### Step 10: Timer Starts
```typescript
// app/room/[roomId]/page.tsx:350-371
console.log('[Timer] ⏰ Starting countdown from', agreedSeconds, 'seconds');
// Should log: "Starting countdown from 250 seconds"

timerRef.current = setInterval(() => {
  setTimeRemaining(prev => prev - 1);
  // 250 → 249 → 248 → ... → 1 → 0
}, 1000);
```

### Step 11: Display in Header
```typescript
// app/room/[roomId]/page.tsx:712
<div className="...">
  {formatTime(timeRemaining)}  // Shows: 4:10 (250 sec)
</div>

// formatTime(250) = "04:10"
// formatTime(249) = "04:09"
// etc.
```

---

## 🐛 **If Timer is NOT Averaging:**

### Diagnostic Questions:

1. **What timer value do you see in the header?**
   - Is it the caller's original time (300 = 5:00)?
   - Is it the callee's time (200 = 3:20)?
   - Is it something else?

2. **Check browser console - what does it log?**
   Look for:
   ```
   [Call] Averaging times: Xs (caller) + Ys (callee) = Zs (average)
   [Matchmake] Call starting: { agreedSeconds: Z }
   [Room] URL Params: { duration: 'Z', agreedSeconds: Z }
   [Timer] Starting countdown from Z seconds
   ```
   
   Tell me what X, Y, and Z actually are!

3. **Which user are you?**
   - Are you the caller (sent invite)?
   - Are you the callee (accepted invite)?
   - Do both users see different timers?

---

## 🔍 **Possible Issues**

### Issue A: Server Not Averaging

**Check backend logs for:**
```
[Call] Averaging times: 300s (caller) + 200s (callee) = 250s (average)
```

**If you see this:** Server is working ✅  
**If you DON'T see this:** Server not receiving accept event ❌

---

### Issue B: Frontend Navigation Wrong

**Check browser console for:**
```
[Matchmake] Call starting: { agreedSeconds: 250 }
```

**If agreedSeconds is 250:** Navigation is correct ✅  
**If agreedSeconds is 300 or 200:** Socket event has wrong value ❌

---

### Issue C: URL Parameter Wrong

**Check browser console for:**
```
[Room] URL Params: { duration: '250', agreedSeconds: 250 }
```

**If duration is '250':** URL is correct ✅  
**If duration is '0' or wrong:** URL building is broken ❌

---

### Issue D: Timer Displays Wrong Value

**Check what the header actually shows:**
- 5:00 (300 sec) = Caller's time, not averaged
- 3:20 (200 sec) = Callee's time, not averaged  
- 4:10 (250 sec) = Averaged correctly ✅

---

## 🧪 **Test This for Me**

1. Open two browser windows (or one window + one incognito)
2. Both users join matchmaking
3. User A invites User B with **300 seconds**
4. User B adjusts timer to **200 seconds** before accepting
5. User B clicks Accept

**Then tell me:**
- What does User A's timer show? ___:___
- What does User B's timer show? ___:___
- What do backend logs say? (Copy the "[Call] Averaging times" line)
- What do browser consoles say? (Copy the "[Room] URL Params" line from BOTH windows)

With this info, I can pinpoint the exact issue!

---

## 💡 **My Hypothesis**

The code looks 100% correct for averaging. My guesses:

1. **Both users using same timer** - One user's slider not being sent
2. **Callee not adjusting timer** - Accepting with default value
3. **Browser console not showing averaging** - Client-side issue
4. **Timer displaying wrong but counting correctly** - Display bug

**I need your test results to confirm!**

