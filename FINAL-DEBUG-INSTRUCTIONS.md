# FINAL Debug Instructions - All Issues

**Status:** ✅ All fixes applied, comprehensive logging added  
**Servers:** ✅ Running with latest code  
**Cache:** ✅ Completely cleared  

---

## 🎯 ALL LOGGING NOW IN PLACE

Every single step of every flow now has detailed console logging. When you test, you will see EXACTLY what's happening.

---

## 📋 ISSUE #1: RECORDING TIMER JUMPING BY 2 SECONDS

### What I Fixed:
```typescript
// Added guard to prevent duplicate intervals
if (timerRef.current) {
  clearInterval(timerRef.current);
  timerRef.current = null;
}

timerRef.current = setInterval(() => {
  setRecordingTime(prev => prev + 1);
}, 1000);
```

### Why It Was Happening:
React Strict Mode in development runs effects twice, which could create 2 intervals.

### Test It:
1. Go to onboarding
2. Start video recording
3. Watch the timer: should count **0:00, 0:01, 0:02, 0:03...**
4. If still jumping: Check if there are 2 intervals running (browser dev tools → Performance tab)

---

## 📋 ISSUE #2: INVITE BROKEN

### What Logs You'll Now See:

**When User A sends invite:**

**Browser Console (User A):**
```
[Matchmake] 📞 Sending invite to user mock-use for 500s
[Matchmake] ✅ Invite event emitted to server
[UserCard] Starting wait timer for Emma
[UserCard] Wait time: 19
[UserCard] Wait time: 18
...
```

**Terminal (Server):**
```
[Invite] 📞 Received invite request from c2e90859 to mock-use for 500s
[Invite] c2e90859 → mock-use, invite: abc123
```

**Browser Console (User B - Emma):**
```
[Matchmake] Incoming invite: { inviteId: "abc123", fromUser: {...}, requestedSeconds: 500 }
```

### If You DON'T See These Logs:

**Missing: "[Matchmake] 📞 Sending invite"**
→ handleInvite never called (button click not working)

**Missing: "[Invite] 📞 Received invite request"**
→ Socket event didn't reach server (socket disconnected or currentUserId is null)

**Error: "[Invite] ❌ call:invite received but currentUserId is null"**
→ User not authenticated yet on socket (auth event didn't fire)

---

## 📋 ISSUE #3: TIMER NOT SHOWING AVERAGE / NOT COUNTING DOWN

### Complete Flow Logs:

**Step 1: User B Accepts (Browser Console User B):**
```
[Matchmake] 📞 Accepting invite abc123 with 300s
[Matchmake] ✅ Accept event sent to server
```

**Step 2: Server Calculates (Terminal):**
```
[Accept] 📞 Received accept for invite abc123 with 300s
[Accept] ✅ Invite found: c2e90859 → mock-use, caller requested 500s
[Call] Averaging times: 500s (caller) + 300s (callee) = 400s (average)
[Call] Started room xyz789 with 400s
```

**Step 3: Both Clients Navigate (Browser Console Both Windows):**
```
[Matchmake] Call starting: { 
  roomId: "xyz789", 
  agreedSeconds: 400,  ← CRITICAL: Should be 400
  isInitiator: true/false,
  peerUser: { userId: "...", name: "Emma" }
}
```

**Step 4: Room Page Loads (Browser Console Both Windows):**
```
[Room] URL Params: { 
  roomId: "xyz789",
  duration: "400",  ← Should be "400" string
  agreedSeconds: 400,  ← Should be 400 number
  peerUserId: "mock-use",
  peerName: "Emma",
  isInitiator: true
}
```

**Step 5: WebRTC Connects (Browser Console Both Windows):**
```
[Media] Requesting getUserMedia...
[Media] Got local stream with tracks: 2
[WebRTC] PeerConnection created
[WebRTC] Creating offer (initiator role)  ← OR "Waiting for offer (responder role)"
[WebRTC] Offer sent  ← OR "Received offer"
[WebRTC] Remote track received
[WebRTC] Connection state: connected
```

**Step 6: Timer Checks Conditions (Browser Console Both Windows):**
```
[Timer] Checking start conditions: {
  hasPC: true,
  connectionState: "connected",
  remoteTrackReceived: true,
  timerStarted: false,
  agreedSeconds: 400  ← Should be 400!
}
```

**Step 7: Timer Starts (Browser Console Both Windows):**
```
[Timer] All conditions met - starting timer from 400 seconds
[Timer] ⏰ Starting countdown from 400 seconds
[Timer] Initial timeRemaining state: 400
[Timer] ✅ Interval created, ticking every 1000ms
```

**Step 8: Timer Counts Down (Browser Console Both Windows):**
```
[Timer] ⏱️ Countdown: 390 seconds remaining
[Timer] ⏱️ Countdown: 380 seconds remaining
[Timer] ⏱️ Countdown: 370 seconds remaining
... (logs every 10 seconds)
```

**Step 9: Visual Display:**
- Header should show: **06:40** (400 seconds)
- Then: **06:39**, **06:38**, **06:37**...

---

## 📋 ISSUE #4: END CALL BUTTON

### Complete Flow Logs:

**Step 1: Click X Button (Browser Console):**
```
(Nothing logged - just opens modal)
```

**Step 2: Click "End call" in Modal (Browser Console):**
```
[Room] End call button clicked in modal
[Room] confirmLeave called
[Room] handleEndCall called
[Room] Emitting call:end to server
```

**Step 3: Server Processes (Terminal):**
```
[Call] Saved XXs call to history for both users
[Cooldown] Set 24h cooldown between c2e90859 and mock-use
```

**Step 4: Both Clients Redirected:**
- Should show "Session ended" screen
- History saved
- Can view in "Past Chats"

---

## 📋 ISSUE #5: COOLDOWN AFTER DECLINE

### Complete Flow Logs:

**Step 1: User A Sends Invite (Terminal):**
```
[Invite] 📞 Received invite request from userA to userB for 500s
[Invite] userA → userB, invite: abc123
```

**Step 2: User B Declines (Browser Console User B):**
```
[Matchmake] Declined invite: abc123
```

**Step 3: Server Sets Cooldown (Terminal):**
```
[Invite] abc123 declined by user
[Cooldown] Set 24h cooldown after decline: userA ↔ userB
```

**Step 4: User A Sees Cooldown (Browser Console User A):**
```
[Matchmake] Invite declined: user_declined
(Toast appears: "Declined — 24h cooldown activated")
```

**Step 5: Card Shows Cooldown Status:**
- Orange clock icon appears
- Text: "Try again later (23h 59m remaining)"
- "Talk to her" button disabled

---

## 🚨 WHAT TO DO IF SOMETHING IS STILL BROKEN

### Recording Timer Jumping:

1. **Check Console for Errors:**
   - Any errors when starting recording?
   - Check if getUserMedia fails

2. **Check Performance Tab:**
   - Open browser dev tools
   - Go to Performance tab
   - Record for 5 seconds while timer is running
   - Look for setInterval - should be ONE interval, not two

3. **If Still Jumping:**
   - Try in different browser (Firefox instead of Chrome)
   - This is likely React StrictMode in dev (won't happen in production)

### Invite Not Working:

**Look for these ERROR logs:**

```
[Invite] ❌ call:invite received but currentUserId is null
```
→ Socket auth didn't complete yet. Wait 1 second after opening matchmaking before inviting.

```
[Matchmake] ❌ Cannot send invite - socket not available
```
→ Socket disconnected. Check network tab for WebSocket connection.

```
[Accept] ❌ Invite not found
```
→ Invite expired (took too long to accept) or was already processed.

### Timer Not Working:

**Check WHICH log is missing:**

1. Missing `[Call] Averaging times`
   → Accept event never reached server

2. Missing `[Matchmake] Call starting`
   → Server didn't emit call:start event

3. Missing `[Room] URL Params`
   → Navigation didn't happen

4. agreedSeconds = 0 or NaN
   → URL parsing failed

5. Missing `[Timer] All conditions met`
   → One of the start conditions is false (check which one)

6. Timer starts but doesn't count
   → Interval being cleared or not firing

### End Call Not Working:

**Check WHICH log appears:**

1. See "[Room] End call button clicked" but nothing after
   → confirmLeave function not defined or broken

2. See "[Room] confirmLeave called" but nothing after
   → handleEndCall not being called

3. See "[Room] handleEndCall called" but no socket emit
   → socketRef.current is null

4. See "Emitting call:end" but no server log
   → Socket disconnected, server not receiving event

---

## ✅ SERVERS STATUS

✅ **Backend:** http://localhost:3001 (rebuilt from source)  
✅ **Frontend:** http://localhost:3000 (cache cleared)  
✅ **Mock Users:** 6 test users auto-created  
✅ **Logging:** Comprehensive at every step  

---

## 🧪 TESTING PROTOCOL

1. **Hard refresh BOTH browser windows:** Cmd+Shift+R
2. **Open console in BOTH windows:** F12
3. **Clear console:** Click clear button
4. **Run test flow**
5. **Copy ALL console logs**
6. **Share them** if something doesn't work

The logs will show EXACTLY which step is failing!

---

## 📊 EXPECTED VS ACTUAL

Share screenshots or paste the console logs showing:

1. **What you set:** "User A: 500s, User B: 300s"
2. **What server calculated:** Look for `[Call] Averaging times: ...`
3. **What navigation received:** Look for `[Matchmake] Call starting: { agreedSeconds: ... }`
4. **What room received:** Look for `[Room] URL Params: { duration: ..., agreedSeconds: ... }`
5. **What timer shows:** Header display (e.g., "05:00")
6. **Does it count down:** Watch header for 10 seconds

This will tell me EXACTLY what's wrong!

---

*All fixes compiled and running*  
*tsx watch: auto-reloading*  
*Comprehensive logging at every step*  
*Ready for precise debugging*  

**Hard refresh your browsers now (Cmd+Shift+R) and test with console open!** 🚀

