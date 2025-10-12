# Complete Debugging Checklist - All Issues

## 🎯 ALL FIXES APPLIED - COMPREHENSIVE LOGGING ADDED

###  What I Just Fixed:

1. ✅ Camera stream now stops in `stopVideoRecording()` in onboarding
2. ✅ Cooldown status now persists (shows 'cooldown' instead of 'declined')
3. ✅ Added extensive logging throughout timer flow
4. ✅ Added logging in end call flow
5. ✅ Server logs time averaging calculation

---

## 📋 STEP-BY-STEP DEBUGGING

### TEST 1: TIMER COUNTDOWN IN VIDEO CALL

**What to Test:** Does timer count down from averaged time?

**Steps:**
1. Open TWO browser windows (Chrome + Incognito, or Chrome + Firefox)
2. Press F12 in BOTH windows to open console
3. Sign up as different users in each window

**Window 1 (User A):**
4. Go to matchmaking
5. Click timer button on Emma's card
6. Set to **500 seconds**
7. Click "Talk to her"

**Window 2 (User B - mock user or second account):**
8. Receive notification
9. Click timer button
10. Set to **300 seconds**
11. Click Accept

---

### WHAT TO LOOK FOR IN CONSOLE:

**Step A: Server Calculation (Check Terminal)**
```
[Call] Averaging times: 500s (caller) + 300s (callee) = 400s (average)
[Call] Started room abc123 with 400s
```
✅ If you see this → Server calculated correctly  
❌ If you DON'T see this → Server didn't receive accept event

**Step B: Client Navigation (Check Browser Console in BOTH windows)**
```
[Matchmake] Call starting: { 
  roomId: "abc123", 
  agreedSeconds: 400,  ← SHOULD BE 400
  isInitiator: true/false,
  peerUser: { ... }
}
```
✅ If agreedSeconds = 400 → Navigation received correct value  
❌ If agreedSeconds is different → Socket event corrupted

**Step C: Room Page Load (Check Browser Console)**
```
[Room] URL Params: { 
  roomId: "abc123",
  duration: "400",  ← SHOULD BE "400" (string)
  agreedSeconds: 400,  ← SHOULD BE 400 (number)
  peerUserId: "xxx",
  peerName: "Emma",
  isInitiator: true
}
```
✅ If duration = "400" and agreedSeconds = 400 → URL parsing correct  
❌ If either is wrong → Navigation bug

**Step D: Timer Initialization**
```
[Timer] Checking start conditions: {
  hasPC: true,  ← MUST BE TRUE
  connectionState: "connected",  ← MUST BE "connected"
  remoteTrackReceived: true,  ← MUST BE TRUE
  timerStarted: false,  ← MUST BE FALSE
  agreedSeconds: 400  ← SHOULD BE 400
}
```
✅ If all conditions true → Timer should start  
❌ If any false → That's blocking the timer

**Step E: Timer Actually Starts**
```
[Timer] All conditions met - starting timer from 400 seconds
[Timer] ⏰ Starting countdown from 400 seconds
[Timer] Initial timeRemaining state: 400
[Timer] ✅ Interval created, ticking every 1000ms
```
✅ If you see ALL these logs → Timer started successfully  
❌ If missing → Timer never started

**Step F: Timer Ticking**
```
[Timer] ⏱️ Countdown: 390 seconds remaining
[Timer] ⏱️ Countdown: 380 seconds remaining
[Timer] ⏱️ Countdown: 370 seconds remaining
...
```
✅ If you see countdown → Timer is WORKING  
❌ If you don't see countdown → Interval not firing

**Step G: Visual Display**
- Look at header: Should show `06:40` initially (400 seconds)
- Should countdown: `06:39`, `06:38`, `06:37`...

---

### TEST 2: END CALL BUTTON

**Steps:**
1. While in a call (from Test 1 above)
2. Click the red X button in bottom right
3. Modal appears: "End this chat?"
4. Click the red "End call" button

**What to Look For in Console:**
```
[Room] End call button clicked in modal
[Room] confirmLeave called
[Room] handleEndCall called
[Room] Emitting call:end to server
```

**What to Look For in Terminal:**
```
[Call] Saved XXs call to history for both users
[Cooldown] Set 24h cooldown between user1 and user2
```

✅ If you see all these → End call is WORKING  
❌ If flow stops somewhere → That's where the bug is

---

### TEST 3: COOLDOWN ON DECLINE

**Steps:**
1. Window 1: Invite someone
2. Window 2: Click Decline

**What to Look For in Terminal:**
```
[Invite] abc123 declined by user
[Cooldown] Set 24h cooldown after decline: userA ↔ userB
```

**What to Look For in Window 1 Console:**
```
[Matchmake] Invite declined: user_declined
```

**What to Look For in Window 1 UI:**
- Toast message: "Declined — 24h cooldown activated"
- Card shows orange clock icon
- Status text: "Try again later (XX hours remaining)"

✅ If all these appear → Cooldown is WORKING  
❌ If status disappears → There's a state update clearing it

---

## 🔴 COMMON PROBLEMS & WHAT THEY MEAN

### Problem: Timer Shows 05:00 Always

**Likely Cause:** `agreedSeconds` is being parsed as 300 or defaulting to 300

**Check:**
- Console log: `[Room] URL Params`
- Look at the `duration` value
- If it's "0" or null → Navigation didn't pass parameter
- If it's "300" → One user's time, not averaged

**Debug Server:**
Look for: `[Call] Averaging times: Xs + Ys = Zs`
- If you don't see this log → Accept event never fired
- If you see wrong values → Check what users actually set

---

### Problem: Timer Shows Correct Time But Doesn't Count Down

**Likely Cause:** Timer never started OR interval is being cleared

**Check:**
1. Look for: `[Timer] ⏰ Starting countdown from X`
   - If missing → Check start conditions
   - If present → Check for `[Timer] ⏱️ Countdown: X`

2. If start log exists but no countdown logs:
   - Interval not firing
   - Interval being cleared immediately
   - React re-render issue

**Possible Fix:** Check if there's another useEffect clearing timerRef

---

### Problem: End Call Does Nothing

**Likely Cause:** Camera sharing conflict on same computer

**Two instances accessing same camera causes:**
- getUserMedia fails on second instance
- WebRTC connection never establishes
- Socket events might not fire properly
- Timer might not start

**Solution:**
- Use different browsers (Chrome + Firefox)
- Or use different devices (computer + phone)
- Check for camera permission errors in console

---

### Problem: Cooldown Disappears

**This Should Be FIXED Now:**
- Changed status from 'declined' → 'cooldown'
- Changed status from 'timeout' → 'cooldown'
- Toast message confirms cooldown set

**If still disappearing:**
- Check if `checkForNewUsers()` is fetching fresh data
- Check if user data includes cooldown flag
- Look for state updates that might be resetting inviteStatuses

---

## 🚨 CRITICAL CHECKS

### Is tsx watch actually running?
```bash
ps aux | grep "tsx watch"
```
Should show a process. If not, server isn't using latest code!

### Is Next.js dev server running?
```bash
ps aux | grep "next dev"
```
Should show a process. If not, frontend isn't running!

### Check server health:
```bash
curl http://localhost:3001/health
```
Should return: `{"status":"ok","timestamp":...}`

### Check if dist/ is fresh:
```bash
ls -la server/dist/index.js
```
Check timestamp - should be recent (within last minute)

---

## 📊 EXACT CONSOLE OUTPUT YOU SHOULD SEE

### Complete Successful Flow:

```
// Window 1 (User A - Inviter):
[Matchmake] Sent invite to: mock-user-emma
[UserCard] Starting wait timer for Emma
[UserCard] Wait time: 19
[UserCard] Wait time: 18
...
[Matchmake] Call starting: { roomId: "abc", agreedSeconds: 400, isInitiator: true }

// Navigates to /room/abc

[Room] URL Params: { duration: "400", agreedSeconds: 400, ... }
[Media] Requesting getUserMedia...
[Media] Got local stream with tracks: 2
[WebRTC] PeerConnection created
[WebRTC] Creating offer (initiator role)
[WebRTC] Offer sent
[WebRTC] Received answer
[WebRTC] Remote track received
[WebRTC] Connection state: connected
[Timer] Checking start conditions: { ... all true, agreedSeconds: 400 }
[Timer] All conditions met - starting timer from 400 seconds
[Timer] ⏰ Starting countdown from 400 seconds
[Timer] Initial timeRemaining state: 400
[Timer] ✅ Interval created
[Timer] ⏱️ Countdown: 390 seconds remaining
[Timer] ⏱️ Countdown: 380 seconds remaining
...

// Click End Call:
[Room] End call button clicked in modal
[Room] confirmLeave called
[Room] handleEndCall called
[Room] Emitting call:end to server
```

### Terminal (Backend):
```
[Invite] userA → userB, invite: abc123
[Call] Averaging times: 500s (caller) + 300s (callee) = 400s (average)
[Call] Started room xyz with 400s
[WebRTC] Connection established
[Call] Saved 250s call to history for both users
[Cooldown] Set 24h cooldown between userA and userB
```

---

## ✅ WHAT TO DO NOW

1. **Hard refresh BOTH browser windows:** Cmd+Shift+R
2. **Open console in BOTH windows:** F12
3. **Run the test flow above**
4. **Copy and paste the EXACT console logs you see**
5. **Copy and paste the EXACT terminal logs you see**
6. **Tell me which step fails**

This comprehensive logging will show EXACTLY where each issue is!

---

*Servers running with latest code*  
*tsx watch: auto-reloading on file changes*  
*All fixes applied and compiled*  
*Ready for comprehensive debugging*

