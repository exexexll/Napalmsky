# Debugging Tools - Complete Guide

## 🛠️ New Debugging Features

I've added comprehensive debugging tools to help you understand exactly what's happening with the queue system.

---

## 🎯 How to Debug Queue Issues

### Step 1: Open Debug Panel

```
1. Go to matchmaking (click "Matchmake Now")
2. Look at top-right corner
3. Click "🔍 Debug Queue" button
4. Debug panel appears
```

### What You'll See:

```
🔍 Server Queue Debug
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Users: 8
Online: 7
Available: 6

User Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Emma (mock-use)     🟢 Online  ✅ Available
James (mock-use)    🟢 Online  ✅ Available
TestUser2 (ed454316) 🟢 Online  ✅ Available
UserYouTalkedTo     🟢 Online  ⏸️ Busy
```

---

## 📊 Understanding the Debug Panel

### Status Indicators:

| Color | Status | Meaning |
|-------|--------|---------|
| 🟢 Green Border | Online + Available | Can be matched with |
| 🟡 Yellow Border | Online + Busy | In a call or unavailable |
| ⚫ Gray Border | Offline | Not connected |

### Numbers Explained:

**Total Users:** All users in the system (including mock users)
**Online:** Users with active socket connections
**Available:** Users who are online AND in matchmaking queue

**Your reel count should match "Available" number (minus cooldowns)**

---

## 🔬 Debugging Process

### Test Scenario: Why can't I see my test user?

```
Step 1: Open Debug Panel
  - Click "🔍 Debug Queue"

Step 2: Check if test user is in the system
  - Look for their name in user list
  - If NOT there: User doesn't exist or session expired
  - If there: Continue to Step 3

Step 3: Check test user's status
  - Is it 🟢 Online? 
    - NO: They need to refresh or reconnect
    - YES: Continue to Step 4
  
  - Is it ✅ Available?
    - NO (⏸️ Busy): They're in a call or not in queue
    - YES: Continue to Step 5

Step 4: Check cooldown
  - Look at "Available" count
  - Is it higher than your reel count?
    - YES: Some users filtered by cooldown
    - Enable test mode to verify

Step 5: Enable Test Mode
  - Close debug panel
  - Click "🔒 Test Mode: OFF"
  - It changes to "🧪 Test Mode: ON"
  - Wait 2 seconds
  - User should appear!

Step 6: If STILL not appearing
  - Open debug panel again
  - Click "🔄 Refresh Debug Info"
  - Check server terminal logs
  - Look for errors
```

---

## 🔍 Server Terminal Logs

With the new extensive logging, you'll see:

### When Test Mode is ON:
```
[Queue API] ========================================
[Queue API] User ed454316 requesting queue
[Queue API] Test Mode: true
[Queue API] Total online & available (excluding self): 7
[Queue API] User IDs: mock-use, mock-use, mock-use, cdd602db, ...
[Queue API] ✅ Including Emma (mock-use)
[Queue API] ✅ Including James (mock-use)
[Queue API] ✅ Including TestUser2 (cdd602db)  ← Should see this!
[Queue API] Final result: 7 users after NO cooldown filter
[Queue API] Returning: Emma, James, Sam, Sofia, Alex, Taylor, TestUser2
[Queue API] ========================================
```

### When Test Mode is OFF (with cooldown):
```
[Queue API] ========================================
[Queue API] User ed454316 requesting queue
[Queue API] Test Mode: false
[Queue API] Total online & available (excluding self): 7
[Queue API] ✅ Including Emma (mock-use)
[Queue API] ✅ Including James (mock-use)
[Queue API] 🚫 Filtering out TestUser2 (24h cooldown)  ← Why you don't see them!
[Queue API] Final result: 6 users after  cooldown filter
[Queue API] Returning: Emma, James, Sam, Sofia, Alex, Taylor
[Queue API] ========================================
```

---

## 🎮 Step-by-Step Testing

### Test 1: Verify Queue Joining

```
Window 1: Your main account
Window 2: Incognito - create "TestUser2"

Window 2 Actions:
  1. Create account
  2. Complete onboarding
  3. Go to /main
  4. Click "Matchmake Now"

Server Logs (should show):
  ✅ [Presence] testuser2-id joined (online)
  ✅ [Store] Presence updated for testuser2: online=true, available=true
  ✅ [Queue] testuser2-id joined queue - online: true, available: true

Window 1 Actions:
  5. Click "🔍 Debug Queue"
  6. Look for TestUser2 in the list
  7. Should show: 🟢 Online ✅ Available

If you see this, the queue IS working! ✅
```

### Test 2: Verify Test Mode

```
Window 1: Still in matchmaking

Actions:
  1. Click "🔒 Test Mode: OFF"
  2. It changes to "🧪 Test Mode: ON"
  3. Toast: "Test mode ON (cooldown bypass) - Reloading..."
  4. Wait 2 seconds

Browser Console (should show):
  ✅ [Matchmake] Test mode turned ON - reloading queue to bypass cooldowns...
  ✅ [API] Queue loaded: 7 users available (TEST MODE - no cooldown filter)
  ✅ [Matchmake] Test mode queue loaded: 7 users

Server Logs (should show):
  ✅ [Queue API] Test Mode: true
  ✅ [Queue API] Final result: 7 users after NO cooldown filter
  ✅ [Queue API] Returning: Emma, James, ..., TestUser2

Result:
  - User count updates: "7 people online"
  - TestUser2 appears in reel
```

### Test 3: Auto-Refresh

```
Window 1: In matchmaking, note user count
Window 3: New incognito window - create "User C"

Window 3 Actions:
  1. Create account
  2. Go to /main → "Matchmake Now"

Window 1: Wait up to 5 seconds

Browser Console (should show):
  ✅ [Matchmake] Checking for new users... (every 5s)
  ✅ [API] Queue loaded: 8 users available
  ✅ [Matchmake] ✅ Adding 1 new users at bottom: [User C]

Result:
  - User count updates: "8 people online"
  - User C appears at bottom of reel
```

---

## 🐛 Common Issues & Solutions

### Issue 1: User count shows wrong number

**Diagnosis:**
```
Click "🔍 Debug Queue"
Compare:
  - Debug Panel "Available": X users
  - Your reel count: Y users
  - Difference: X - Y = users filtered by cooldown
```

**Solution:**
- Enable test mode to see all users
- OR match with other people (not the cooldown ones)

### Issue 2: Test mode doesn't work

**Diagnosis:**
```
Check server logs after clicking toggle:
Should see: [Queue API] Test Mode: true
If you see: [Queue API] Test Mode: false
  → Test mode not being passed
```

**Solution:**
- The fix I just applied uses testModeRef
- Should now work correctly
- Check browser console for "TEST MODE" messages

### Issue 3: Auto-refresh not adding users

**Diagnosis:**
```
Browser console every 5 seconds should show:
  [Matchmake] Checking for new users...
  [API] Queue loaded: X users available
  [Matchmake] Queue check - Total in queue: X users
  [Matchmake] Current reel has: Y users

If no logs:
  → Auto-refresh interval not running
If logs but no additions:
  → No new users joined (expected)
```

**Solution:**
- Verified working in code
- Create new user in another window to test
- Check server logs for "joined queue"

### Issue 4: User appears as "Busy" in debug

**Diagnosis:**
```
Debug Panel shows:
  TestUser2: 🟢 Online  ⏸️ Busy

This means:
  - available: false
  - Not in matchmaking queue
```

**Solution:**
- Window 2: Make sure you clicked "Matchmake Now"
- Window 2: Check that you're not in a call
- Window 2: Refresh page if needed

---

## 📋 Complete Test Checklist

### Pre-Test Setup:
- [ ] Server running (no errors in terminal)
- [ ] Window 1: Main account logged in
- [ ] Window 2: Test account logged in (incognito)

### Queue Joining Test:
- [ ] Window 2: Click "Matchmake Now"
- [ ] Server logs: "[Queue] user joined queue - online: true, available: true"
- [ ] Window 1: Click "🔍 Debug Queue"
- [ ] Debug shows test user as: 🟢 Online ✅ Available
- [ ] Result: ✅ Queue joining works

### Cooldown Test:
- [ ] Complete a call between Window 1 and Window 2
- [ ] Both return to matchmaking
- [ ] Window 1: Debug panel shows Window 2 user
- [ ] Window 1: Reel does NOT show Window 2 user
- [ ] Server logs: "🚫 Cooldown active"
- [ ] Result: ✅ Cooldown filtering works

### Test Mode Test:
- [ ] Window 1: Click "🔒 Test Mode: OFF"
- [ ] Changes to "🧪 Test Mode: ON"
- [ ] Toast shows "Test mode ON..."
- [ ] Wait 2 seconds
- [ ] Server logs: "[Queue API] Test Mode: true"
- [ ] Server logs: "Final result: X users after NO cooldown filter"
- [ ] Window 2 user appears in reel
- [ ] User count increases
- [ ] Result: ✅ Test mode bypass works

### Auto-Refresh Test:
- [ ] Window 1: In matchmaking
- [ ] Browser console: "[Matchmake] Checking for new users..." every 5s
- [ ] Window 3: Create new user, join matchmaking
- [ ] Window 1: Within 5s, new user appears at bottom
- [ ] User count increases
- [ ] Result: ✅ Auto-refresh works

---

## 🚨 What to Watch in Server Logs

### Good Patterns:
```
✅ [Store] Presence updated for xxx: online=true, available=true
✅ [Queue] xxx joined queue - online: true, available: true
✅ [Store] getAllOnlineAvailable: X users
✅ [Queue API] Test Mode: true (when test mode enabled)
✅ [Queue API] Returning X users
✅ [Queue] xxx marked available again (after call)
```

### Problem Patterns:
```
❌ [Store] Cannot update presence for xxx - not found
❌ [Queue] xxx joined queue - online: false, available: false
❌ [Queue API] Test Mode: false (when test mode should be ON)
❌ [Queue API] Returning 0 users (when users exist)
❌ [Store] getAllOnlineAvailable: 0 users (when users exist)
```

---

## 💡 Key Insights

### 1. Queue System is Multi-Layered

```
Layer 1: Presence System
  - Tracks online/offline status
  - Tracks available/busy status
  - getAllOnlineAvailable() gets this data

Layer 2: Cooldown System
  - 24h lockout after calls
  - Filters users from queue
  - Bypassed in test mode

Layer 3: Client Reel
  - Displays filtered users
  - Auto-refreshes every 5s
  - Adds new users at bottom
```

### 2. User Count Reflects YOUR View

The number shown is not "total online users" but "users YOU can see":
- Total online: 7
- Filtered by cooldown: -1
- Your count: 6

This is correct behavior!

### 3. Test Mode is Essential for Testing

Without test mode:
- Can't re-match with same person
- Must create 3+ accounts
- Slower testing cycle

With test mode:
- Can match repeatedly
- Cooldowns bypassed
- Faster testing

---

## 🎯 Recommended Testing Flow

### Quick Debug (1 minute):

```
1. Open matchmaking
2. Click "🔍 Debug Queue"
3. Note "Available" count
4. Close debug
5. Compare with your reel count
6. Difference = cooldown filtered users
7. Click test mode toggle
8. Wait 2 seconds
9. User count should match "Available" now! ✅
```

### Full Pipeline Test (5 minutes):

```
1. Window 1: Enable test mode
2. Window 2: Create account, join matchmaking
3. Window 1: Click debug - verify Window 2 shows as available
4. Window 1: Should see Window 2 in reel within 5s
5. Complete a call
6. Both return to matchmaking
7. Window 1: Keep test mode ON
8. Window 1: Should STILL see Window 2 (cooldown bypassed)
9. Window 1: Turn test mode OFF
10. Window 1: Window 2 disappears (cooldown active)
11. Window 1: Debug shows Window 2 still available
12. Window 1: But reel doesn't show them ✅

This proves everything is working correctly!
```

---

## 📝 Interpreting Results

### Scenario A: Debug shows user, reel doesn't

**Cause:** 24h cooldown filtering

**Verification:**
- Server logs: "🚫 Cooldown active"
- Debug: User shows as available
- Reel: User not visible

**Solution:** Enable test mode

### Scenario B: Debug shows "Busy", reel doesn't

**Cause:** User not in matchmaking queue

**Verification:**
- Debug: User shows ⏸️ Busy
- Server: No "joined queue" log for that user

**Solution:** Other window needs to click "Matchmake Now"

### Scenario C: Debug doesn't show user at all

**Cause:** User not connected or logged out

**Verification:**
- Debug: User not in list
- Server: No presence entry

**Solution:** Other window needs to login/refresh

### Scenario D: Everything shows correctly but count is different

**Cause:** This is EXPECTED

**Explanation:**
```
Debug "Available": 7 users total in queue
Your reel: 6 users visible to you
Difference: 1 user filtered by cooldown

This is correct behavior! ✅
```

---

## 🎮 Interactive Testing Guide

### Test Right Now:

```
1. Open http://localhost:3000/main
2. Click "Matchmake Now"
3. Look at user count (probably "6 people online")
4. Click "🔍 Debug Queue"
5. Check "Available" number (probably 6)
6. If they match: ✅ No cooldowns active
7. If different: Enable test mode, check again
8. Click "🔄 Refresh Debug Info" to update
9. Open another window, create user, join matchmaking
10. Click "🔄 Refresh Debug Info"
11. Available count should increase
12. Close debug, wait 5s
13. New user appears in reel ✅
```

---

## 🔧 All Fixes Applied

### Fixed in This Session:

1. ✅ Auto-refresh now adds users at bottom (no reordering)
2. ✅ Test mode properly uses ref to avoid stale closures
3. ✅ Test mode toggle immediately reloads queue
4. ✅ Comprehensive server-side logging (detailed)
5. ✅ Debug panel shows exact server state
6. ✅ Queue endpoint with cooldown bypass
7. ✅ Presence state visibility
8. ✅ User count reflects correct filtered state

---

## 📊 Expected Console Output

### Client (Browser):

```javascript
// When opening matchmaking:
[Matchmake] Session found: {userId, accountType}
[Matchmake] Loading initial queue...
[API] Queue loaded: 6 users available (PRODUCTION MODE)
[Matchmake] Initial queue loaded: 6 users (PRODUCTION MODE)

// Every 5 seconds:
[Matchmake] Checking for new users...
[API] Queue loaded: 6 users available
[Matchmake] Queue check - Total in queue: 6 users
[Matchmake] Current reel has: 6 users
[Matchmake] No new users to add (all 6 already in reel)

// When test mode enabled:
[Matchmake] Test mode turned ON - reloading queue to bypass cooldowns...
[API] Queue loaded: 7 users available (TEST MODE - no cooldown filter)
[Matchmake] Test mode queue loaded: 7 users

// When new user joins:
[Matchmake] User became available, checking for additions: user-id
[API] Queue loaded: 7 users available
[Matchmake] ✅ Adding 1 new users at bottom: [User C]
```

### Server (Terminal):

```
// When user joins queue:
[Presence] user-id joined (online)
[Store] Presence updated for user-id: online=true, available=true
[Queue] user-id joined queue - online: true, available: true

// When queue requested:
[Store] getAllOnlineAvailable: 7 users (excluding requester-id)
[Queue API] ========================================
[Queue API] User requester requesting queue
[Queue API] Test Mode: false
[Queue API] Total online & available (excluding self): 7
[Queue API] User IDs: mock-1, mock-2, user-b, user-c, ...
[Queue API] ✅ Including Emma (mock-1)
[Queue API] 🚫 Filtering out TestUser2 (24h cooldown)
[Queue API] Final result: 6 users after cooldown filter
[Queue API] Returning: Emma, James, Sam, Sofia, Alex, Taylor
[Queue API] ========================================

// When user becomes available after call:
[Queue] user-id marked available again
queue:update sent
```

---

## ✅ Success Criteria

Your system is working correctly if:

1. ✅ Debug panel shows accurate user states
2. ✅ Server logs show presence updates
3. ✅ Test mode toggle shows more users
4. ✅ Auto-refresh logs appear every 5s
5. ✅ New users appear within 5s
6. ✅ User count matches available count (minus cooldowns)

---

## 🚀 Next Steps

1. **Open matchmaking now**
2. **Click "🔍 Debug Queue"**
3. **See exactly what's in the queue**
4. **Enable test mode if needed**
5. **Watch server logs for detailed flow**

**Everything is instrumented - you can now see exactly what's happening!** 🎉

---

*All debugging tools are now active and ready to use.*
*Check the debug panel and server logs for complete visibility.*

