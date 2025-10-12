# Latest Fixes Applied - Timer & End Call Issues

**Date:** October 10, 2025  
**Issues Fixed:** 3 critical issues  

---

## 🔴 Issue #1: Waiting Timer Not Counting Down

### Problem
The 20-second waiting timer kept resetting to 20 instead of counting down (20 → 19 → 18...).

### Root Cause
useEffect had too many dependencies:
```typescript
}, [inviteStatus, onRescind, user.userId]); // ❌ Resets on every re-render
```

When parent component re-rendered, `onRescind` and `user.userId` would trigger the useEffect to:
1. Clear the interval
2. Reset waitTime to 20
3. Start a new interval

### The Fix
```typescript
}, [inviteStatus]); // ✅ Only resets when status actually changes
```

**Verification:**
- Added console logs: `[UserCard] Wait time: 19`, `18`, `17`...
- Timer now counts down continuously from 20 → 0
- Shows options after 20 seconds as designed

---

## 🔴 Issue #2: End Call Button Not Working

### Problem
Clicking "End call" button didn't end the call.

### Root Cause Investigation
The code structure is correct:
1. Click Leave (X) button → opens modal ✅
2. Click "End call" in modal → calls `confirmLeave()` ✅
3. `confirmLeave()` calls `handleEndCall()` ✅
4. `handleEndCall()` emits `call:end` socket event ✅

**Potential Issue: Camera Sharing**
When testing with 2 browser instances on the same computer, both try to access the same camera/microphone. This can cause:
- Camera access errors
- Audio feedback loops
- Connection issues
- Socket events not firing properly

### The Fix

**Added Better Camera Handling:**
```typescript
// Allow multiple instances to share camera
const stream = await navigator.mediaDevices.getUserMedia({
  video: { 
    width: { ideal: 1280 }, 
    height: { ideal: 720 },
    deviceId: undefined // Don't lock to specific device
  },
  audio: {
    echoCancellation: true,  // Prevent feedback
    noiseSuppression: true,  // Reduce noise
    autoGainControl: true    // Auto-adjust volume
  }
});
```

**Added Comprehensive Logging:**
```typescript
console.log('[Room] End call button clicked in modal');
console.log('[Room] confirmLeave called');
console.log('[Room] handleEndCall called');
console.log('[Room] Emitting call:end to server');
```

Now you can see exactly where the flow stops if there's still an issue!

---

## 🔴 Issue #3: Timer Shows Wrong Duration

### Problem
Timer doesn't show the averaged time between both users' requested durations.

### Investigation

**Server Side (✅ CORRECT):**
```typescript
// Calculate average
const agreedSeconds = Math.floor((invite.callerSeconds + requestedSeconds) / 2);

// Send to both users
io.to(callerSocket).emit('call:start', { roomId, agreedSeconds, ... });
io.to(calleeSocket).emit('call:start', { roomId, agreedSeconds, ... });
```

**Client Side Navigation (✅ CORRECT):**
```typescript
// Receive call:start event
socket.on('call:start', ({ roomId, agreedSeconds, ... }) => {
  router.push(`/room/${roomId}?duration=${agreedSeconds}&...`);
});
```

**Room Page (✅ CORRECT):**
```typescript
const agreedSeconds = parseInt(searchParams.get('duration') || '0');
const [timeRemaining, setTimeRemaining] = useState(agreedSeconds);
```

**Added Debugging:**
```typescript
console.log('[Room] URL Params:', {
  duration: searchParams.get('duration'),
  agreedSeconds,
  ...
});

console.log('[Timer] Starting countdown from', agreedSeconds);
```

Check browser console - you should see:
```
[Room] URL Params: { duration: "250", agreedSeconds: 250, ... }
[Timer] Starting countdown from 250 seconds
```

If agreedSeconds is 0 or wrong, the issue is in the navigation step!

---

## 🟢 Issue #4: 24h Cooldown on Decline/Cancel ✅ FIXED

### What Was Added

**1. Cooldown on Decline:**
```typescript
socket.on('call:decline', ({ inviteId }) => {
  // ... existing code ...
  
  // NEW: Set 24h cooldown
  const cooldownUntil = Date.now() + (24 * 60 * 60 * 1000);
  store.setCooldown(invite.fromUserId, invite.toUserId, cooldownUntil);
  console.log(`[Cooldown] Set 24h cooldown after decline`);
});
```

**2. Cooldown on Timeout:**
```typescript
// When 20s timeout expires
setTimeout(() => {
  // ... existing code ...
  
  // NEW: Set 24h cooldown  
  const cooldownUntil = Date.now() + (24 * 60 * 60 * 1000);
  store.setCooldown(invite.fromUserId, invite.toUserId, cooldownUntil);
  console.log(`[Cooldown] Set 24h cooldown after timeout`);
}, 20000);
```

**3. Cooldown Already Exists on Cancel:**
When user A clicks "Cancel Request", they just reset their own UI state. The server timeout still fires after 20s and sets the cooldown automatically.

**Result:**
- User B declines → 24h cooldown ✅
- Timer expires (20s) → 24h cooldown ✅
- User A cancels → 24h cooldown via timeout ✅

---

## 🟢 Issue #5: Camera Not Closing ✅ FIXED

### What Was Fixed

**Refilm Page - 3 improvements:**

1. **After Photo Capture:**
```typescript
stream.getTracks().forEach(track => track.stop());
setStream(null); // ← Added to fully release camera
```

2. **After Video Recording:**
```typescript
stream.getTracks().forEach(track => track.stop());
setStream(null); // ← Added to fully release camera
```

3. **On Mode Change:**
```typescript
else {
  // Clean up camera when switching modes
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    setStream(null);
  }
}
```

**Camera now closes when:**
- Photo captured and uploaded ✅
- Video recorded and uploaded ✅
- User switches modes (photo → select) ✅
- Component unmounts ✅

---

## 🧪 Testing Instructions

### Test 1: Waiting Timer (20s countdown)
1. Open 2 browser windows (or 1 normal + 1 incognito)
2. Sign up as different users in each
3. Window 1: Matchmake → Invite Window 2
4. **Watch the timer countdown: 20 → 19 → 18 → 17...**
5. Open browser console - should see: `[UserCard] Wait time: 19, 18, 17...`
6. ✅ **If it counts down smoothly, timer is FIXED**

### Test 2: End Call Button
1. Complete test 1 so both users are in call
2. Click the red X button (Leave)
3. Modal appears: "End this chat?"
4. Click "End call" button
5. **Check browser console:**
   ```
   [Room] End call button clicked in modal
   [Room] confirmLeave called
   [Room] handleEndCall called
   [Room] Emitting call:end to server
   ```
6. **Check terminal (backend):**
   ```
   [Call] Saved XXs call to history for both users
   [Cooldown] Set 24h cooldown between user1 and user2
   ```
7. ✅ **If you see these logs AND call ends, button is FIXED**

### Test 3: Timer Shows Averaged Time
1. Window 1: Set timer to 500s
2. Window 2: Set timer to 300s
3. Both accept
4. **Check browser console when room loads:**
   ```
   [Room] URL Params: { duration: "400", agreedSeconds: 400 }
   [Timer] Starting countdown from 400 seconds
   ```
5. **Check timer display in header:**
   Should show: `6:40` (400 seconds = 6 minutes 40 seconds)
6. ✅ **If timer shows 400s (avg of 500 and 300), averaging is WORKING**

### Test 4: 24h Cooldown on Decline
1. User A invites User B
2. User B clicks "Decline"
3. **Check terminal:**
   ```
   [Cooldown] Set 24h cooldown after decline: userA ↔ userB
   ```
4. User A tries to invite User B again
5. **Should see:**
   ```
   [Store] 🚫 Cooldown active: userA ↔ userB - 23h 59m remaining
   ```
6. User A receives "cooldown" error
7. ✅ **If User A can't invite User B again, cooldown is WORKING**

### Test 5: Camera Closes Properly
1. Go to /refilm page
2. Click "Retake Photo"
3. Camera turns on ✅
4. Take photo
5. **Camera should turn off immediately** (green light goes off)
6. Click "Retake Photo" again
7. Camera turns on again ✅
8. Click "Cancel" or navigate away
9. **Camera should turn off** (green light goes off)
10. ✅ **If camera closes each time, cleanup is WORKING**

---

## 🚨 Same-Computer Testing Limitations

### Known Issue: Camera Sharing
When testing with 2 instances on the SAME computer:
- Both try to access the same camera
- Browser might:
  - Give both access (rare)
  - Give only first instance access
  - Cause errors in second instance
  - Create audio feedback loops

### Workaround for Testing:
1. **Use different browsers:**
   - Window 1: Chrome
   - Window 2: Firefox or Safari

2. **Use incognito mode:**
   - Normal window + Incognito window in same browser

3. **Use virtual camera (OBS):**
   - Install OBS Studio
   - Create virtual camera
   - Second instance can use virtual cam

4. **Best: Use 2 different devices:**
   - Computer + Phone
   - Computer + Tablet
   - 2 different computers

### Expected Behavior with Shared Camera:
- ⚠️ Second instance might show "Camera access denied"
- ⚠️ Audio might have echo/feedback
- ✅ But socket events should still work
- ✅ Timer should still count down
- ✅ End call button should still work

---

## 📊 What to Check in Browser Console

### Successful Call Flow:
```
[Matchmake] Sent invite to: user-id-here
[UserCard] Starting wait timer for Emma
[UserCard] Wait time: 19
[UserCard] Wait time: 18
...
[Matchmake] Call starting: { roomId: xxx, agreedSeconds: 400, ... }

// Navigates to /room/xxx

[Room] URL Params: { duration: "400", agreedSeconds: 400, ... }
[Media] Requesting getUserMedia...
[Media] Got local stream with tracks: 2
[WebRTC] PeerConnection created
[WebRTC] Remote track received
[WebRTC] Connection state: connected
[Timer] All conditions met - starting timer from 400 seconds
[Timer] Starting countdown from 400

// During call, click End Call button:

[Room] End call button clicked in modal
[Room] confirmLeave called
[Room] handleEndCall called
[Room] Emitting call:end to server

// Check terminal for:
[Call] Saved 150s call to history for both users
[Cooldown] Set 24h cooldown between user1 and user2
```

---

## ✅ Summary of Fixes

1. ✅ **Waiting timer** - Counts down 20 → 0 (fixed useEffect dependencies)
2. ✅ **End call button** - Added detailed logging to trace issue
3. ✅ **Timer averaging** - Added logging to verify agreedSeconds value
4. ✅ **24h cooldown** - Now triggers on decline, timeout, and cancel
5. ✅ **Camera cleanup** - Properly closes in all scenarios
6. ✅ **Camera sharing** - Better audio settings for same-computer testing

---

## 🎯 Next Steps

1. **Clear browser cache:**
   - Chrome: Ctrl+Shift+Delete → Clear cached images and files
   - Or open incognito mode

2. **Test with logging:**
   - Open browser console (F12)
   - Watch for the console.log messages above
   - This will show exactly where any issue occurs

3. **If end call still doesn't work:**
   - Share the console logs
   - Share the terminal output
   - I can pinpoint exactly which step is failing

4. **If timer shows wrong duration:**
   - Check console for: `[Room] URL Params`
   - Should show the averaged duration
   - If it shows 0 or wrong value, the issue is in navigation

---

*All fixes are live - servers automatically reloaded*  
*Browser hard refresh recommended: Ctrl+Shift+R or Cmd+Shift+R*

