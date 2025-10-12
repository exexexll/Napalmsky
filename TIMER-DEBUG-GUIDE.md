# Timer & Cooldown Debug Guide

## 🔴 ISSUE SUMMARY

**Problem 1:** Video call timer doesn't show averaged duration and doesn't count down  
**Problem 2:** Cooldown status disappears after decline/cancel  
**Problem 3:** End call button doesn't work  

---

## ✅ FIXES APPLIED

### Fix #1: Cooldown Status Now Persists

**Changed:** When decline or timeout happens, status now shows 'cooldown' instead of 'declined'/'timeout'

```typescript
// BEFORE:
else if (reason === 'timeout') {
  setInviteStatuses(prev => ({ ...prev, [targetUserId]: 'timeout' }));
} else {
  setInviteStatuses(prev => ({ ...prev, [targetUserId]: 'declined' }));
}

// AFTER:
else if (reason === 'timeout') {
  setInviteStatuses(prev => ({ ...prev, [targetUserId]: 'cooldown' }));
  showToast('No response — 24h cooldown activated', 'info');
} else if (reason === 'user_declined') {
  setInviteStatuses(prev => ({ ...prev, [targetUserId]: 'cooldown' }));
  showToast('Declined — 24h cooldown activated', 'info');
}
```

**Result:** After decline/timeout, the card immediately shows cooldown status (orange timer icon)

---

### Fix #2: Camera Cleanup Improved

All camera streams now properly released with `setStream(null)` to fully release the device.

---

### Fix #3: End Call Logging

Added comprehensive console logging to trace the exact flow.

---

## 🧪 HOW TO TEST THE TIMER

### Step-by-Step Timer Test:

**1. Open Browser Console (F12) in BOTH windows**

**2. Window 1 (User A):**
   - Go to matchmaking
   - Find a mock user (Emma)
   - Click timer button, set to **500 seconds**
   - Click "Talk to her"
   - Watch console for: `[Matchmake] Sent invite to: mock-user-xxx`

**3. Window 2 (User B - as Emma):**
   - You should receive notification
   - Set timer to **300 seconds**
   - Click Accept
   - Watch console for: `[Matchmake] Accepted invite: xxx`

**4. CHECK CONSOLE IN BOTH WINDOWS:**

You should see:
```
[Matchmake] Call starting: { roomId: 'xxx', agreedSeconds: 400, isInitiator: true/false, peerUser: {...} }
```

**The agreedSeconds should be 400** (average of 500 and 300)

**5. When Room Page Loads, CHECK CONSOLE:**

```
[Room] URL Params: { 
  roomId: 'xxx',
  duration: '400',  ← THIS SHOULD BE 400
  agreedSeconds: 400,
  peerUserId: 'xxx',
  peerName: 'Emma',
  isInitiator: true
}

[Media] Requesting getUserMedia...
[Media] Got local stream with tracks: 2
[WebRTC] PeerConnection created
[WebRTC] Remote track received
[WebRTC] Connection state: connected
[Timer] Checking start conditions: {
  hasPC: true,
  connectionState: 'connected',
  remoteTrackReceived: true,
  timerStarted: false,
  agreedSeconds: 400  ← THIS SHOULD BE 400
}
[Timer] All conditions met - starting timer from 400 seconds
[Timer] Starting countdown from 400
```

**6. CHECK TIMER IN HEADER:**

Should show: **06:40** (400 seconds = 6 minutes 40 seconds)

Then it should count down: **06:39**, **06:38**, **06:37**...

---

## 🔴 IF TIMER STILL SHOWS 05:00 OR DOESN'T COUNT DOWN:

### Check These in Console:

1. **Is agreedSeconds correct in navigation?**
   Look for: `[Matchmake] Call starting: { agreedSeconds: 400 }`
   
   - If this shows **400** → Server calculated correctly ✅
   - If this shows **300** or **500** → Server bug ❌

2. **Is URL parameter correct?**
   Look for: `[Room] URL Params: { duration: '400' }`
   
   - If this shows **'400'** → Navigation correct ✅
   - If this shows **'0'** or **'300'** → URL parsing bug ❌

3. **Does timer actually start?**
   Look for: `[Timer] Starting countdown from 400`
   
   - If you see this → Timer started ✅
   - If you don't see this → Timer start condition not met ❌

4. **Is connection state correct?**
   Look for: `[Timer] Checking start conditions`
   
   - Check if all flags are true
   - If `connectionState` is not 'connected' → WebRTC issue
   - If `remoteTrackReceived` is false → Track issue

---

## 🔴 COMMON ISSUES & SOLUTIONS

### Issue: Timer Shows 05:00 Instead of Average

**Possible Causes:**
1. Server not calculating average correctly
2. URL parameter not being passed
3. agreedSeconds parsing as 0, defaults to some value

**Debug:**
- Check console for `[Room] URL Params`
- If duration is '0' or null, the navigation is broken
- If duration is correct but agreedSeconds is wrong, parsing is broken

### Issue: Timer Not Counting Down

**Possible Causes:**
1. Timer never starts (check for start condition logs)
2. Timer starts but state not updating
3. Component re-renders clearing the interval

**Debug:**
- Look for: `[Timer] Starting countdown from X`
- If you don't see this, timer never started
- Check `[Timer] Checking start conditions` - see what's false

### Issue: Cooldown Not Showing After Decline

**This is NOW FIXED:**
- Decline → shows 'cooldown' immediately
- Timeout → shows 'cooldown' immediately
- Toast message appears confirming 24h cooldown

---

## 🧪 COOLDOWN TEST

### Test Scenario:

**1. User A invites User B (Emma)**
   - Console: `[Invite] userA → userB, invite: xxx`

**2. User B declines**
   - Terminal should show:
     ```
     [Invite] xxx declined by user
     [Cooldown] Set 24h cooldown after decline: userA ↔ userB
     ```

**3. User A should see:**
   - Toast: "Declined — 24h cooldown activated"
   - Card shows orange timer icon
   - Cannot click "Talk to her" button (disabled)

**4. Try inviting again (if button works):**
   - Terminal: `[Store] 🚫 Cooldown active: userA ↔ userB - 23h 59m remaining`
   - Client: Gets 'cooldown' error immediately
   - Shows cooldown screen

---

## 🎯 EXPECTED TERMINAL LOGS

### When Invite Sent:
```
[Invite] 73876ac9 → mock-user-1, invite: abc123
```

### When User Declines:
```
[Invite] abc123 declined by user
[Cooldown] Set 24h cooldown after decline: 73876ac9 ↔ mock-user-1
```

### When Invite Times Out:
```
[Invite] abc123 timed out after 20s
[Cooldown] Set 24h cooldown after timeout: 73876ac9 ↔ mock-user-1
```

### When Call Starts:
```
[Call] Started room xyz789 with 400s
```

### When Checking Cooldown on Next Invite:
```
[Store] 🚫 Cooldown active: 73876ac9 ↔ mock-user-1 - 23h 59m remaining
```

---

## 🚨 CRITICAL: Is tsx watch running?

The server needs to be running the LATEST compiled code. Check:

```bash
# Check if tsx watch is running
ps aux | grep "tsx watch"

# If not running, restart:
pkill -9 node
cd /Users/hansonyan/Desktop/Napalmsky && npm run dev
```

---

## ✅ COMPLETE TEST CHECKLIST

- [ ] Open 2 browser windows
- [ ] Open console in both (F12)
- [ ] Window 1: Set timer to 500s, invite Window 2
- [ ] Window 2: Set timer to 300s, accept
- [ ] Console shows: `agreedSeconds: 400` ✓
- [ ] Room loads with timer showing `06:40` ✓
- [ ] Timer counts down: `06:39`, `06:38`... ✓
- [ ] Click End Call button
- [ ] Console shows: `[Room] End call button clicked` ✓
- [ ] Call ends and saves to history ✓

**Cooldown Test:**
- [ ] User A invites User B
- [ ] User B declines
- [ ] Toast appears: "Declined — 24h cooldown activated" ✓
- [ ] User A's card shows orange cooldown status ✓
- [ ] Terminal shows: `[Cooldown] Set 24h cooldown after decline` ✓

---

## 📊 WHAT TO SHARE IF STILL BROKEN

If timer still doesn't work, copy and paste these console logs:

1. From matchmaking when accepting:
   ```
   [Matchmake] Call starting: { ... }
   ```

2. From room page when loading:
   ```
   [Room] URL Params: { ... }
   [Timer] Checking start conditions: { ... }
   [Timer] Starting countdown from X
   ```

3. From terminal when call starts:
   ```
   [Call] Started room xxx with Xs
   ```

This will show exactly where the issue is!

---

*Servers restarted with all fixes*  
*Hard refresh browser: Cmd+Shift+R*  
*Open console in both windows to see debug logs*

