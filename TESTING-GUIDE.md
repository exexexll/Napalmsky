# 🧪 Testing Guide: Full Pipeline Flow

## Overview
This guide walks you through testing the complete Napalm Sky platform from matchmaking to video chat and back.

## Quick Start

### Method 1: Two Browser Windows (Recommended)

**Setup:**
1. **Window 1** (Regular browser): Your current session
2. **Window 2** (Incognito/Private mode): Second test user

**Steps:**

#### 1. Prepare Window 1 (Current User)
- ✅ Already logged in
- ✅ Profile complete (selfie + video uploaded)
- Navigate to: `http://localhost:3000/main`

#### 2. Setup Window 2 (Second User)
```
Open Incognito/Private Window (Cmd+Shift+N in Chrome/Mac)
Go to: http://localhost:3000
Create new guest account:
  - Name: "TestUser2"
  - Gender: Any
  - Upload selfie (capture or fake)
  - Upload video (capture or fake)
Navigate to: http://localhost:3000/main
```

#### 3. Start Matchmaking (Both Windows)
```
Window 1: Click "Matchmake Now"
Window 2: Click "Matchmake Now"
✅ You should see each other in the reel!
```

#### 4. Test Invite Flow
```
Window 1 (Initiator):
  1. Scroll to find TestUser2's card
  2. Click timer display → Set duration (default 300s is fine)
  3. Click "Talk to them" button
  4. ⏳ Enters 20-second waiting state
  
Window 2 (Recipient):
  1. 📬 Instant notification appears
  2. Shows initiator's name and requested duration
  3. Click "Accept" button
  
Both Windows:
  ✅ Redirected to /room/[roomId]
  ✅ Video chat room opens
```

#### 5. Video Chat Experience
```
Both windows should show:
  - Timer counting down (5:00 → 4:59 → ...)
  - Video feed placeholders/actual feeds
  - "End Call" button
  - Peer user's name
  
Test:
  ✓ Timer updates every second
  ✓ End call button works
  ✓ Chat ends when timer expires
```

#### 6. After Call Ends
```
Both windows:
  ✅ Redirected back to /main
  
Check history:
  Go to "Past Chats" page
  ✅ Call session logged with:
     - Partner's name
     - Duration
     - Timestamp
```

---

## Method 2: Solo Test with Mock Users

**Quick UI Testing (No Real Calls):**

```bash
1. Go to: http://localhost:3000/test-flow
2. Read the test scenarios
3. Click "Matchmake Now" from main page
4. Scroll through 6 pre-created mock users
5. Test UI interactions (timer, buttons, navigation)

Note: Mock users won't respond to invites (they're bots)
```

---

## Test Scenarios

### Scenario A: Happy Path (Full Flow)
```
✅ Setup → Matchmake → Invite → Accept → Call → End → History
Expected: ~2-3 minutes
Status: WORKING
```

### Scenario B: Invite Declined
```
Window 1: Send invite
Window 2: Click "Decline"
Expected: Instant "declined" notification in Window 1
Status: WORKING
```

### Scenario C: Invite Timeout
```
Window 1: Send invite
Window 2: Do nothing for 20 seconds
Expected: "No response" status in Window 1
Status: WORKING (Rescind popup pending)
```

### Scenario D: Call Timer Expires
```
Both: Complete call setup
Wait: Let timer hit 0:00
Expected: Both redirected to main page
Status: WORKING
```

### Scenario E: 24-Hour Cooldown
```
Complete one call with TestUser2
Try inviting TestUser2 again immediately
Expected: "Try again later (24h cooldown)" message
Status: WORKING
```

---

## Expected Behaviors

### ✅ Working Features

| Feature | Expected Behavior | Status |
|---------|-------------------|--------|
| **Matchmaking** | See online users in vertical reel | ✅ |
| **Timer Setup** | Click timer → modal → set duration | ✅ |
| **Invite (20s)** | Initiator waits max 20 seconds | ✅ |
| **Accept/Decline** | Instant notifications both sides | ✅ |
| **Video Room** | Timer counts down, peer info shown | ✅ |
| **End Call** | Return to main, logged in history | ✅ |
| **Cooldown** | 24h block after completing call | ✅ |
| **Profile Update** | Preview refreshes immediately | ✅ |
| **Media Upload** | Visible in matchmaking instantly | ✅ |

### ⚠️ Known Issues / TODOs

| Issue | Description | Priority |
|-------|-------------|----------|
| **Rescind Popup** | After 20s timeout, no rescind option yet | Medium |
| **Referral System** | Link generation not implemented | Low |
| **WebRTC Quality** | May have connection issues (STUN/TURN needed) | Medium |
| **Persistence** | In-memory store resets on restart | Low |

---

## Debugging Tips

### Console Logs
```javascript
// Check socket connection
[Matchmake] Session found: {userId, accountType}
[Matchmake] Loading initial reel...
[Matchmake] Incoming invite: {inviteId, fromUser}
[Matchmake] Invite declined: reason
[Matchmake] Call starting: {roomId, agreedSeconds}
```

### Network Tab
```
Socket.io connections:
  - ws://localhost:3001
  - Should show "101 Switching Protocols"

API calls:
  - POST /auth/guest (onboarding)
  - POST /media/selfie (profile)
  - POST /media/video (profile)
  - GET /room/reel (matchmaking)
  - GET /user/me (profile preview)
```

### Common Issues

**Issue: Can't see other user in reel**
```
Solution: Make sure both users clicked "Matchmake Now"
Check: Socket.io connection in Network tab
Verify: Both users are online (green dot)
```

**Issue: Invite not received**
```
Solution: Check console for socket errors
Verify: Both users have active socket connections
Check: No browser notification blocking
```

**Issue: Video not loading**
```
Solution: Check camera/mic permissions
Verify: HTTP (not HTTPS) allows media access
Check: Upload URLs use http://localhost:3001
```

**Issue: Images/Videos 404**
```
Solution: Server restart required (fixes applied)
Verify: next.config.js has remotePatterns set
Check: Upload URLs start with http://localhost:3001
```

---

## Performance Testing

### Load Test
```
1. Open 5+ browser tabs (incognito)
2. Create 5+ users simultaneously
3. All users matchmake together
4. Test UI responsiveness
Expected: Smooth scrolling, no lag
```

### Stress Test
```
1. Rapid invite/decline cycles
2. Multiple simultaneous calls
3. Quick navigation between pages
Expected: No crashes, proper state management
```

---

## Test Coverage Checklist

### Core Flow
- [ ] Onboarding (guest account)
- [ ] Profile upload (selfie + video)
- [ ] Main dashboard loads
- [ ] Matchmaking overlay opens
- [ ] See users in reel
- [ ] Set timer duration
- [ ] Send invite
- [ ] Receive invite
- [ ] Accept invite
- [ ] Enter video room
- [ ] Timer counts down
- [ ] End call manually
- [ ] Check history

### Edge Cases
- [ ] Decline invite
- [ ] Invite timeout (20s)
- [ ] Call timer expires
- [ ] 24h cooldown triggers
- [ ] Network disconnect during call
- [ ] Rapid invite spam
- [ ] Browser back button during call
- [ ] Refresh during matchmaking

### UI/UX
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility
- [ ] Mobile responsive design
- [ ] Animations smooth (60fps)
- [ ] Loading states clear
- [ ] Error messages helpful
- [ ] Button states (hover/active/disabled)
- [ ] Focus management

---

## Automated Testing (Future)

```bash
# Unit tests (Jest + React Testing Library)
npm run test

# E2E tests (Playwright)
npm run test:e2e

# Visual regression tests (Chromatic)
npm run test:visual
```

---

## Quick Test Commands

```bash
# Start dev servers
npm run dev

# In separate terminal - tail server logs
tail -f /tmp/napalmsky-server.log

# Check socket connections
lsof -i :3001

# Clean restart (clear cache)
rm -rf .next node_modules/.cache
npm run dev
```

---

## Test Data Reset

**Reset In-Memory Store:**
```bash
# Restart server to clear all data
pkill -f node
npm run dev
```

**Clear Browser Data:**
```
1. Open DevTools (F12)
2. Application tab
3. Clear storage → localStorage
4. Refresh page
```

---

## Support

**Issues?**
- Check console logs
- Review Network tab
- See terminal output
- Open issue on GitHub

**Questions?**
- Read ARCHITECTURE.md
- Check QUICKSTART.md
- Review inline code comments

---

## Next Steps

After testing the full pipeline:

1. ✅ Verify all features work
2. ✅ Note any bugs/issues
3. ⏳ Implement pending TODOs:
   - Rescind/wait popup
   - Referral system
   - Persistent storage
4. 🚀 Deploy to production
5. 📊 Monitor real user behavior

---

**Happy Testing! 🎉**

For more details, visit: `http://localhost:3000/test-flow`
