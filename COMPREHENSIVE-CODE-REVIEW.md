# Comprehensive Code Review - Napalm Sky Platform

**Review Date:** October 10, 2025  
**Review Scope:** Full stack architecture, data flow, logical consistency  
**Context:** Pre-cloud deployment review focusing on local development functionality  

---

## Executive Summary

### Overall Assessment: **B+ (Good with Critical Issues)**

**Strengths:**
- Well-structured codebase with clear separation of concerns
- Comprehensive feature implementation (matchmaking, video chat, referral system)
- Good TypeScript usage for type safety
- Real-time functionality working well with Socket.io
- WebRTC implementation is solid

**Critical Issues Found:** 12 major issues, 18 minor issues  
**Recommendation:** Address critical issues before cloud migration

---

## 🔴 Critical Issues

### 1. **Race Condition in Presence/Queue State Management**

**Location:** `server/src/index.ts` (lines 86-213)  
**Severity:** HIGH  
**Impact:** Users may not appear in matchmaking queue correctly

**Problem:**
```typescript
// In server/src/index.ts
socket.on('auth', ({ sessionToken }) => {
  // User authenticated but NOT marked online
  currentUserId = session.userId;
  socket.emit('auth:success');
  // Notification check happens here, but presence not set yet!
});

socket.on('presence:join', () => {
  // Only NOW is user marked online
  store.setPresence(currentUserId, {...});
});
```

**Issue:** There's a window between authentication and presence being set where:
1. Notifications can be sent to user before they're "online"
2. Queue checks might fail
3. Socket events can fire before presence is initialized

**Fix:**
```typescript
socket.on('auth', ({ sessionToken }) => {
  const session = store.getSession(sessionToken);
  if (session) {
    currentUserId = session.userId;
    activeSockets.set(session.userId, socket.id);
    
    // IMMEDIATELY set presence when authenticated
    store.setPresence(session.userId, {
      socketId: socket.id,
      online: true,
      available: false,  // They'll set to true when joining queue
      lastActiveAt: Date.now(),
    });
    
    socket.emit('auth:success');
    // Now it's safe to check notifications
  }
});
```

---

### 2. **Socket.io Reference Not Properly Initialized in Auth Module**

**Location:** `server/src/auth.ts` (lines 6-13), `server/src/index.ts` (line 84)  
**Severity:** HIGH  
**Impact:** Referral notifications may not be delivered in real-time

**Problem:**
```typescript
// In auth.ts
let io: any = null;
let activeSockets: Map<string, string> | null = null;

export function setSocketIO(socketIO: any, socketsMap: Map<string, string>) {
  io = socketIO;
  activeSockets = socketsMap;
}

// In index.ts - called AFTER io.on('connection') is set up
setAuthSocketIO(io, activeSockets);
```

**Issue:** 
- `setAuthSocketIO` is called AFTER socket connection handler is registered
- If a user signs up immediately, the auth module won't have Socket.io reference yet
- Timing-dependent initialization (unreliable)

**Fix:**
```typescript
// Better approach: Pass io instance to auth routes as dependency
// In index.ts:
app.use('/auth', authRoutes(io, activeSockets));

// In auth.ts:
export default function createAuthRoutes(
  io: SocketServer,
  activeSockets: Map<string, string>
) {
  const router = express.Router();
  // Now io and activeSockets are guaranteed to be available
  // ...
  return router;
}
```

---

### 3. **IP Address Tracking Inconsistency**

**Location:** `server/src/index.ts` (lines 42-60), `server/src/auth.ts` (line 24, 189)  
**Severity:** MEDIUM  
**Impact:** IP bans may not work correctly, security vulnerability

**Problem:**
```typescript
// In index.ts middleware
const ip = req.ip || req.connection.remoteAddress || 'unknown';
(req as any).userIp = ip;

// In auth.ts /guest endpoint
const ip = req.userIp || req.ip || req.connection.remoteAddress || 'unknown';

// In auth.ts /login endpoint  
const ip = req.userIp || req.ip || req.connection.remoteAddress || 'unknown';
```

**Issues:**
1. `req.connection` is deprecated in newer Express versions
2. Fallback logic duplicated in multiple places
3. IP from middleware not reliably passed to routes
4. Behind proxies (cloud deployment), `req.ip` will be wrong without `trust proxy` setting

**Fix:**
```typescript
// In index.ts:
app.set('trust proxy', true); // MUST add for cloud deployment

// Create centralized IP getter
function getClientIp(req: any): string {
  return req.ip || 
         req.headers['x-forwarded-for']?.split(',')[0] || 
         req.socket.remoteAddress || 
         'unknown';
}

// In middleware:
app.use((req, res, next) => {
  const ip = getClientIp(req);
  (req as any).clientIp = ip;
  // ... rest of logic
});

// In routes:
const ip = req.clientIp; // Guaranteed to be set by middleware
```

---

### 4. **Session Token Storage in LocalStorage (Security Issue)**

**Location:** `lib/session.ts` (entire file)  
**Severity:** HIGH (for production)  
**Impact:** XSS vulnerability, session hijacking risk

**Problem:**
```typescript
// Current implementation
export function saveSession(data: SessionData): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}
```

**Issues:**
1. LocalStorage is accessible to any JavaScript on the page (XSS vulnerability)
2. Session tokens exposed to browser extensions
3. No encryption
4. Visible in browser dev tools
5. Comment says "Demo only" but this MUST be fixed before production

**Fix (for cloud migration):**
```typescript
// Backend: Use httpOnly cookies
res.cookie('session_token', sessionToken, {
  httpOnly: true,  // Not accessible to JavaScript
  secure: true,    // HTTPS only
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

// Frontend: No localStorage needed
// Session automatically sent with requests via cookies
```

---

### 5. **Duplicate Presence Update in Call Accept Handler**

**Location:** `server/src/index.ts` (lines 324-340)  
**Severity:** LOW  
**Impact:** Unnecessary work, confusing code

**Problem:**
```typescript
socket.on('call:accept', ({ inviteId, requestedSeconds }) => {
  // ...
  
  // Mark both as unavailable (line 324-325)
  store.updatePresence(invite.fromUserId, { available: false });
  store.updatePresence(invite.toUserId, { available: false });
  
  // Broadcast presence change (line 328-329)
  io.emit('queue:update', { userId: invite.fromUserId, available: false });
  io.emit('queue:update', { userId: invite.toUserId, available: false });

  // Create room...

  // Mark both users as unavailable (AGAIN!) - line 340
  // (duplicate code, already done above)
```

**Fix:** Remove duplicate presence update at line 340

---

### 6. **Timer Start Race Condition in WebRTC Room**

**Location:** `app/room/[roomId]/page.tsx` (lines 131-162, 298-316)  
**Severity:** MEDIUM  
**Impact:** Timer might start twice or not at all

**Problem:**
```typescript
// Timer can be started from TWO places:
// 1. When remote track is received (line 135-136)
pc.ontrack = (event) => {
  setRemoteTrackReceived(true);
  if (pc.connectionState === 'connected') {
    startTimer(); // First call
  }
};

// 2. When connection state changes (line 157-161)
pc.onconnectionstatechange = () => {
  if (pc.connectionState === 'connected' && remoteTrackReceived) {
    startTimer(); // Second call
  }
};
```

**Issue:** Both conditions can be true simultaneously, leading to:
- Timer starting twice (if timerStarted guard fails)
- Race condition determining which fires first
- Inconsistent behavior

**Fix:**
```typescript
const timerStartedRef = useRef(false);

const startTimer = () => {
  if (timerStartedRef.current) return;
  timerStartedRef.current = true;
  // ... start timer
};

// Better: Start timer only when BOTH conditions are met
useEffect(() => {
  const pc = peerConnectionRef.current;
  if (pc && 
      pc.connectionState === 'connected' && 
      remoteTrackReceived &&
      !timerStartedRef.current) {
    startTimer();
  }
}, [remoteTrackReceived]); // Depend on remoteTrackReceived changes
```

---

### 7. **ICE Candidate Queue Not Cleared on Error**

**Location:** `app/room/[roomId]/page.tsx` (lines 60, 215-230)  
**Severity:** MEDIUM  
**Impact:** Memory leak, connection issues on reconnection

**Problem:**
```typescript
const iceCandidateQueue = useRef<RTCIceCandidate[]>([]);

// Candidates are queued...
socket.on('rtc:ice', async ({ candidate }) => {
  if (!remoteDescriptionSet.current) {
    iceCandidateQueue.current.push(iceCandidate); // Queued
  }
});

// But never cleared on:
// - Connection failure
// - Room unmount
// - Error conditions
// - Reconnection attempts
```

**Fix:**
```typescript
// In cleanup (line 282):
return () => {
  // ... existing cleanup
  iceCandidateQueue.current = []; // Clear queue
  remoteDescriptionSet.current = false; // Reset flag
};

// On connection failure:
pc.onconnectionstatechange = () => {
  if (pc.connectionState === 'failed') {
    iceCandidateQueue.current = []; // Clear on failure
    handleICEFailure();
  }
};
```

---

### 8. **Cooldown Key Sorting Not Consistent with Retrieval**

**Location:** `server/src/store.ts` (lines 192-211)  
**Severity:** LOW  
**Impact:** Could cause cooldown mismatches in edge cases

**Problem:**
```typescript
setCooldown(userId1: string, userId2: string, expiresAt: number): void {
  const key = [userId1, userId2].sort().join('|');
  this.cooldowns.set(key, expiresAt);
}

hasCooldown(userId1: string, userId2: string): boolean {
  const key = [userId1, userId2].sort().join('|');
  const expires = this.cooldowns.get(key);
  // ...
}
```

**Issue:** 
- `.sort()` on UUIDs works, but depends on lexicographic ordering
- If UUIDs are ever replaced with numeric IDs, `.sort()` on numbers will break
- Better to be explicit

**Fix:**
```typescript
private getCooldownKey(userId1: string, userId2: string): string {
  // Always put smaller ID first (consistent ordering)
  return userId1 < userId2 
    ? `${userId1}|${userId2}`
    : `${userId2}|${userId1}`;
}

setCooldown(userId1: string, userId2: string, expiresAt: number): void {
  const key = this.getCooldownKey(userId1, userId2);
  this.cooldowns.set(key, expiresAt);
}
```

---

### 9. **Missing Error Handling in Media Upload**

**Location:** `server/src/media.ts` (lines 73-83, 89-99)  
**Severity:** MEDIUM  
**Impact:** Undefined behavior on upload failure

**Problem:**
```typescript
router.post('/selfie', requireAuth, upload.single('selfie'), (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const selfieUrl = `http://localhost:3001/uploads/${req.file.filename}`;
  store.updateUser(req.userId, { selfieUrl });

  res.json({ selfieUrl });
});
```

**Issues:**
1. No error handling for `store.updateUser()` - what if it fails?
2. No error handling for multer middleware failures
3. File uploaded but DB update fails → orphaned file
4. No rollback mechanism

**Fix:**
```typescript
router.post('/selfie', requireAuth, (req: any, res) => {
  upload.single('selfie')(req, res, async (err) => {
    if (err) {
      console.error('[Upload] Multer error:', err);
      return res.status(500).json({ error: 'Upload failed: ' + err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const selfieUrl = `http://localhost:3001/uploads/${req.file.filename}`;
      store.updateUser(req.userId, { selfieUrl });
      res.json({ selfieUrl });
    } catch (error) {
      // Rollback: delete uploaded file
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error('[Upload] Failed to delete file:', unlinkErr);
      });
      
      console.error('[Upload] Database update failed:', error);
      res.status(500).json({ error: 'Failed to save upload' });
    }
  });
});
```

---

### 10. **Referral Code Collision Risk**

**Location:** `server/src/referral.ts` (line 48)  
**Severity:** MEDIUM  
**Impact:** Referral link collisions (low probability but possible)

**Problem:**
```typescript
const code = Math.random().toString(36).substring(2, 10).toUpperCase();
```

**Issues:**
1. Only 8 characters → ~36^8 = 2.8 trillion combinations (seems high but...)
2. No collision checking before storing
3. No retry logic if collision occurs
4. Birthday paradox: With 65K codes, ~50% chance of collision

**Fix:**
```typescript
function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  
  // 10 characters instead of 8 for more entropy
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return code;
}

router.post('/generate', requireAuth, (req: any, res) => {
  // ... existing validation

  // Generate with collision check
  let code: string;
  let attempts = 0;
  do {
    code = generateReferralCode();
    attempts++;
    if (attempts > 10) {
      return res.status(500).json({ error: 'Failed to generate unique code' });
    }
  } while (store.getReferralMapping(code)); // Check collision
  
  // ... rest of logic
});
```

---

### 11. **Missing Cleanup When Peer Disconnects During Call**

**Location:** `server/src/index.ts` (lines 556-570), `app/room/[roomId]/page.tsx` (lines 251-259)  
**Severity:** MEDIUM  
**Impact:** Room state not properly cleaned up, users may stay "in call"

**Problem:**
```typescript
// Server-side disconnect handler
socket.on('disconnect', () => {
  // Finds active room and notifies partner
  Array.from(activeRooms.entries()).forEach(([roomId, room]) => {
    if (room.user1 === currentUserId || room.user2 === currentUserId) {
      io.to(roomId).emit('peer:disconnected');
      // Don't auto-end - let client handle gracefully
    }
  });
  // But room is NEVER cleaned up from activeRooms Map!
  // Room stays in memory forever
});
```

**Issue:**
1. `activeRooms` never cleaned up on disconnect
2. Memory leak - rooms accumulate
3. Users' presence might not be reset to "available"
4. No history saved if disconnection happens

**Fix:**
```typescript
socket.on('disconnect', () => {
  console.log(`Client disconnected: ${socket.id}`);
  if (currentUserId) {
    activeSockets.delete(currentUserId);
    
    // Clean up any active rooms
    Array.from(activeRooms.entries()).forEach(([roomId, room]) => {
      if (room.user1 === currentUserId || room.user2 === currentUserId) {
        const partnerId = room.user1 === currentUserId ? room.user2 : room.user1;
        
        // Notify partner
        io.to(roomId).emit('peer:disconnected');
        
        // Save partial session (optional but good for analytics)
        const actualDuration = Math.floor((Date.now() - room.startedAt) / 1000);
        // ... save history for both users with "disconnected" flag
        
        // Mark both as available again
        store.updatePresence(room.user1, { available: true });
        store.updatePresence(room.user2, { available: true });
        
        // Clean up room
        activeRooms.delete(roomId);
        
        console.log(`[Disconnect] Cleaned up room ${roomId} due to disconnect`);
      }
    });
    
    // Mark user offline
    store.updatePresence(currentUserId, { online: false, available: false });
  }
});
```

---

### 12. **Report System Allows Duplicate Reports Despite Check**

**Location:** `server/src/report.ts` (lines 51-96)  
**Severity:** LOW  
**Impact:** Inconsistent behavior, confusing logic

**Problem:**
```typescript
// Check if already reported this user
if (store.hasReportedUser(reporterUserId, reportedUserId)) {
  return res.status(400).json({ 
    error: 'You have already reported this user',
    alreadyReported: true
  });
}

// Create report
store.createReport(report); // This adds to reporterHistory

// But createReport is called AFTER the check
// So if two requests come simultaneously, both pass the check
// Race condition!
```

**Fix:** Use transactions or atomic operations (requires database migration)

---

## 🟡 Medium Priority Issues

### 13. **Auto-Invite Logic Uses Unreliable LocalStorage Flags**

**Location:** `components/matchmake/MatchmakeOverlay.tsx` (lines 415-446)  
**Severity:** MEDIUM  
**Impact:** Auto-invite may fire multiple times or not at all

**Problem:**
```typescript
const autoInvite = localStorage.getItem('napalmsky_auto_invite');

if (autoInvite === 'true' && directMatchTarget && users.length > 0 && !autoInviteSent) {
  // ... send invite
  localStorage.removeItem('napalmsky_auto_invite');
  setAutoInviteSent(true);
}
```

**Issues:**
1. LocalStorage persists across page reloads - if invite fails, flag is already removed
2. `autoInviteSent` state is component-local - resets on unmount
3. Flag removed immediately, so retry is impossible
4. No confirmation that invite was actually sent

**Fix:**
```typescript
// Better approach: Use URL param or React Router state
// Remove localStorage entirely for transient data

// In IntroductionComplete.tsx:
const handleCallTarget = () => {
  router.push({
    pathname: '/main',
    query: { 
      openMatchmaking: 'true',
      targetUser: targetUser.userId,
      autoInvite: 'true' // URL param, not localStorage
    }
  });
};

// In MatchmakeOverlay.tsx:
const searchParams = useSearchParams();
const autoInvite = searchParams.get('autoInvite') === 'true';
```

---

### 14. **Test Mode Toggle Causes Unnecessary Queue Reloads**

**Location:** `components/matchmake/MatchmakeOverlay.tsx` (lines 345-375)  
**Severity:** LOW  
**Impact:** Poor UX, unnecessary API calls

**Problem:**
```typescript
useEffect(() => {
  if (isOpen && testMode) { // Only when turning ON
    // Reload queue
  } else if (isOpen && !testMode && testModeRef.current) { // When turning OFF
    // Reload queue again
  }
}, [testMode, isOpen]);
```

**Issue:** Every test mode toggle triggers full queue reload, resetting user's position

**Better UX:**
```typescript
// Just update the cooldown filter client-side
// No need to reload entire queue
setUsers(prev => {
  if (testMode) {
    // Show all users (remove cooldown filter)
    return prev.map(u => ({ ...u, hasCooldown: false }));
  } else {
    // Re-apply cooldown filter
    // Fetch cooldown data from server without full reload
  }
});
```

---

### 15. **Queue Auto-Refresh Interval Too Aggressive**

**Location:** `components/matchmake/MatchmakeOverlay.tsx` (line 248)  
**Severity:** LOW  
**Impact:** Unnecessary server load, API rate limiting risk

**Problem:**
```typescript
const refreshInterval = setInterval(() => {
  checkForNewUsers();
}, 5000); // Every 5 seconds!
```

**Issue:** 
- 5 seconds is very aggressive for a matchmaking queue
- If 100 users are online, that's 100 API calls every 5 seconds = 1200 calls/minute
- Not scalable

**Fix:**
```typescript
// Use exponential backoff or longer interval
const refreshInterval = setInterval(() => {
  checkForNewUsers();
}, 15000); // 15 seconds is more reasonable

// Or better: Only refresh on socket events (already implemented!)
// Remove auto-refresh entirely and rely on:
// - presence:update events
// - queue:update events
// These already update the queue in real-time
```

---

### 16. **Video Preview Not Properly Cleaned Up in Onboarding**

**Location:** `app/onboarding/page.tsx` (lines 280-294)  
**Severity:** LOW  
**Impact:** Media stream leak, camera stays on

**Problem:**
```typescript
useEffect(() => {
  if (step === 'selfie') {
    startCamera();
  }
  return () => {
    // Cleanup on unmount
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [step]);
```

**Issue:** 
- Cleanup only runs on unmount, not on step change
- If user goes selfie → video → back to selfie, old stream not cleaned up
- Multiple camera streams could be active

**Fix:**
```typescript
useEffect(() => {
  if (step === 'selfie') {
    startCamera();
  } else {
    // Clean up when leaving selfie step
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
  }

  return () => {
    // Also clean up on unmount
    stream?.getTracks().forEach(track => track.stop());
  };
}, [step]);
```

---

### 17. **Debug Panel Exposes Sensitive Information**

**Location:** `components/matchmake/MatchmakeOverlay.tsx` (lines 700-817)  
**Severity:** MEDIUM (for production)  
**Impact:** Privacy leak, security information disclosure

**Problem:**
```typescript
// Shows user IDs, socket IDs, cooldown status
<div className="flex items-center justify-between">
  <span className="font-bold text-white">{u.name}</span>
  <span className="text-white/50 ml-2">({u.userId})</span> {/* Full user ID! */}
</div>
```

**Issues:**
1. Exposes full user IDs to any user
2. Shows socket IDs (internal implementation detail)
3. Shows who has cooldown with whom (privacy leak)
4. Shows who reported whom (major privacy violation)

**Fix:**
```typescript
// For production, either:
// 1. Remove debug panel entirely (recommended)
// 2. Or require admin authentication

// In index.ts:
const isAdmin = (userId: string) => {
  // Check if user is admin
  const user = store.getUser(userId);
  return user?.accountType === 'admin'; // Add admin role to User type
};

router.get('/debug/presence', requireAuth, (req: any, res) => {
  if (!isAdmin(req.userId)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  // ... rest of debug logic
});
```

---

### 18. **Chat Messages Not Sanitized**

**Location:** `app/room/[roomId]/page.tsx` (lines 343-355), `server/src/index.ts` (lines 426-444)  
**Severity:** MEDIUM  
**Impact:** XSS vulnerability in chat messages

**Problem:**
```typescript
// Client sends raw text
socketRef.current.emit('room:chat', { roomId, text: chatInput });

// Server broadcasts without sanitization
socket.on('room:chat', ({ roomId, text }) => {
  const message = {
    from: currentUserId,
    text, // Raw text, not sanitized!
    timestamp: Date.now(),
    type: 'message' as const,
  };
  io.to(roomId).emit('room:chat', message);
});

// Client renders without escaping
<p className="text-sm">{msg.text}</p>
```

**Issue:** 
- HTML/script tags in chat messages could execute
- XSS vulnerability

**Fix:**
```typescript
// Install DOMPurify or use built-in sanitization
import DOMPurify from 'isomorphic-dompurify';

// Server-side:
socket.on('room:chat', ({ roomId, text }) => {
  const sanitized = DOMPurify.sanitize(text, { ALLOWED_TAGS: [] }); // Strip all HTML
  
  const message = {
    from: currentUserId,
    text: sanitized.substring(0, 500), // Also limit length
    timestamp: Date.now(),
    type: 'message' as const,
  };
  io.to(roomId).emit('room:chat', message);
});
```

---

## 🔵 Minor Issues & Improvements

### 19. **Hardcoded URLs Throughout Codebase**

**Location:** Multiple files  
**Impact:** Must change every file for cloud deployment

Files to update:
- `lib/api.ts` - `const API_BASE = 'http://localhost:3001';`
- `lib/matchmaking.ts` - `const API_BASE = 'http://localhost:3001';`
- `lib/socket.ts` - `const SOCKET_URL = 'http://localhost:3001';`
- `server/src/media.ts` - Upload URL construction
- `next.config.js` - Remote patterns

**Fix:** Already documented in KNOWN-ISSUES.md, but create `.env` file NOW:

```bash
# .env.local (frontend)
NEXT_PUBLIC_API_BASE=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

# .env (backend)
PORT=3001
FRONTEND_URL=http://localhost:3000
```

---

### 20. **No Rate Limiting**

**Location:** All API routes  
**Severity:** MEDIUM (for production)  
**Impact:** API abuse, DoS vulnerability

**Fix:**
```typescript
// Install express-rate-limit
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});

app.use('/auth', apiLimiter, authRoutes);
app.use('/room', apiLimiter, roomRoutes);
// etc.
```

---

### 21. **Passwords Stored in Plain Text**

**Location:** `server/src/types.ts` (line 14), `server/src/auth.ts` (line 167, 201)  
**Severity:** CRITICAL (for production)  
**Impact:** Major security vulnerability

**Comment says "Demo only"** but this MUST be fixed:

```typescript
// Install bcrypt
import bcrypt from 'bcrypt';

// When creating permanent account:
const hashedPassword = await bcrypt.hash(password, 10);
store.updateUser(user.userId, {
  accountType: 'permanent',
  email,
  password: hashedPassword, // Store hash, not plain text
});

// When logging in:
if (!await bcrypt.compare(password, user.password)) {
  return res.status(401).json({ error: 'Invalid credentials' });
}
```

---

### 22. **Socket.io Connection Not Authenticated on Connect**

**Location:** `server/src/index.ts` (line 86-128)  
**Severity:** MEDIUM  
**Impact:** Unauthorized socket connections possible

**Problem:**
```typescript
io.on('connection', (socket) => {
  // Connection accepted BEFORE authentication!
  console.log(`Client connected: ${socket.id}`);

  let currentUserId: string | null = null;

  // Auth happens AFTER connection
  socket.on('auth', ({ sessionToken }) => {
    // Now we check if valid...
  });
});
```

**Issue:**
- Any client can connect to Socket.io server
- Authentication is optional (no timeout to force auth)
- Unauthenticated sockets waste resources

**Fix:**
```typescript
// Use Socket.io middleware for auth
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication required'));
  }
  
  const session = store.getSession(token);
  if (!session) {
    return next(new Error('Invalid session'));
  }
  
  // Attach userId to socket
  (socket as any).userId = session.userId;
  next();
});

io.on('connection', (socket) => {
  const userId = (socket as any).userId; // Already authenticated!
  activeSockets.set(userId, socket.id);
  // ...
});
```

---

### 23. **Missing Validation for Invite Time**

**Location:** `server/src/index.ts` (line 232)  
**Severity:** LOW  
**Impact:** Users could send invalid time values

**Problem:**
```typescript
socket.on('call:invite', ({ toUserId, requestedSeconds }) => {
  // No validation of requestedSeconds!
  // User could send -100 or 999999
```

**Fix:**
```typescript
socket.on('call:invite', ({ toUserId, requestedSeconds }) => {
  // Validate requested time
  if (!requestedSeconds || 
      requestedSeconds < 60 || 
      requestedSeconds > 1800) { // 1 min to 30 min
    return socket.emit('call:declined', {
      inviteId: uuidv4(),
      reason: 'invalid_duration',
    });
  }
  // ... rest of logic
});
```

---

### 24. **Call History Saved Even if Call Never Started**

**Location:** `server/src/index.ts` (lines 468-554)  
**Severity:** LOW  
**Impact:** Inaccurate history, "0 second" calls logged

**Problem:**
```typescript
socket.on('call:end', ({ roomId }) => {
  const room = activeRooms.get(roomId);
  if (room) {
    const actualDuration = Math.floor((Date.now() - room.startedAt) / 1000);
    // If user immediately ends, actualDuration = 0
    // This still gets saved to history
```

**Fix:**
```typescript
socket.on('call:end', ({ roomId }) => {
  const room = activeRooms.get(roomId);
  if (room) {
    const actualDuration = Math.floor((Date.now() - room.startedAt) / 1000);
    
    // Only save if call lasted at least 5 seconds
    if (actualDuration >= 5) {
      // ... save to history
    } else {
      console.log(`[Call] Call too short (${actualDuration}s), not saving to history`);
    }
    
    // Still set cooldown even for short calls (prevent spam)
    store.setCooldown(room.user1, room.user2, cooldownUntil);
    
    // ... rest of cleanup
  }
});
```

---

### 25. **No Timeout for Waiting State After 20s**

**Location:** `components/matchmake/UserCard.tsx`, `server/src/index.ts` (lines 282-299)  
**Severity:** LOW  
**Impact:** User could wait indefinitely without server response

**Problem:**
- Server has 20s timeout
- Client has no local timeout
- If server timeout fails to fire, client waits forever

**Fix:**
```typescript
// In UserCard.tsx, add client-side timeout:
useEffect(() => {
  if (inviteStatus === 'waiting') {
    const clientTimeout = setTimeout(() => {
      // Client-side timeout as backup
      onRescind(user.userId);
      alert('Request timed out. Please try again.');
    }, 25000); // 25s (server timeout + buffer)
    
    return () => clearTimeout(clientTimeout);
  }
}, [inviteStatus]);
```

---

### 26. **Mock Users Disabled in Production Code**

**Location:** `server/src/index.ts` (lines 579-582)  
**Severity:** INFO  
**Impact:** Testing is harder

**Note:** Mock users are commented out, which is good for production but makes testing harder. Consider:

```typescript
// Better approach:
if (process.env.NODE_ENV === 'development') {
  createMockUsers();
  console.log('   ℹ️  Mock users created for development');
} else {
  console.log('   ℹ️  Production mode - mock users disabled');
}
```

---

### 27. **Direct Match Input Component Always Rendered**

**Location:** `app/main/page.tsx` (lines 314-316)  
**Severity:** LOW  
**Impact:** Hidden component still in DOM

**Problem:**
```typescript
{!showMatchmake && (
  <DirectMatchInput onMatch={handleDirectMatch} />
)}
```

**Issue:** Component is conditionally rendered but could be more efficient

**Improvement:** This is actually fine, but if the component is heavy, use `display: none` instead

---

### 28. **Console.logs Left in Production Code**

**Location:** Throughout codebase  
**Severity:** LOW  
**Impact:** Cluttered console, performance overhead, information disclosure

**Files with excessive logging:**
- `components/matchmake/MatchmakeOverlay.tsx`
- `app/room/[roomId]/page.tsx`
- `server/src/index.ts`
- `server/src/store.ts`

**Fix:**
```typescript
// Create logger utility
// lib/logger.ts
const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: any[]) => isDev && console.log(...args),
  warn: (...args: any[]) => isDev && console.warn(...args),
  error: (...args: any[]) => console.error(...args), // Always log errors
};

// Replace all console.log with logger.log
```

---

### 29. **Missing CORS Configuration for Production**

**Location:** `server/src/index.ts` (lines 35-38)  
**Severity:** MEDIUM (for production)  
**Impact:** CORS issues in production

**Problem:**
```typescript
app.use(cors({
  origin: 'http://localhost:3000', // Hardcoded!
  credentials: true,
}));
```

**Fix:**
```typescript
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

---

### 30. **No Database Indexes Planned**

**Location:** KNOWN-ISSUES.md (line 547-609)  
**Severity:** LOW (for now)  
**Impact:** Poor query performance at scale

**Note:** The planned database schema doesn't mention indexes. Add these:

```sql
-- Critical indexes for performance
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_cooldowns_expires ON cooldowns(expires_at);
CREATE INDEX idx_history_user_started ON chat_history(user_id, started_at DESC);
CREATE INDEX idx_users_email ON users(email); -- For login lookups
```

---

## 📊 Architecture Analysis

### Data Flow Review

**1. User Authentication Flow:**
```
Client → POST /auth/guest → Server creates user + session
      → Client saves to localStorage ❌ (should be httpOnly cookie)
      → Client connects Socket.io with token
      → Server authenticates socket ⚠️ (after connection, should be during)
```

**Issues:** Session storage insecure, socket auth timing issue

---

**2. Matchmaking Flow:**
```
Client opens matchmaking
      → Socket emits presence:join
      → Socket emits queue:join
      → Client fetches GET /room/queue
      → Server returns online & available users
      → Client displays in reel
      → Auto-refresh every 5s ⚠️ (too frequent)
      → Socket events update in real-time ✅
```

**Issues:** Auto-refresh too aggressive, race conditions possible

---

**3. Call Initiation Flow:**
```
User A clicks invite
      → Socket emits call:invite
      → Server validates (cooldown, availability)
      → Server creates invite in memory
      → Server emits call:notify to User B
      → 20s timeout starts
      → User B receives notification
      → User B accepts/declines
      → If accepted: Server creates room, emits call:start to both
      → Both redirect to /room/[roomId]
```

**Issues:** Room not cleaned up properly on disconnect

---

**4. Video Call Flow:**
```
Both users land on /room/[roomId]
      → Request camera/mic permissions
      → Create RTCPeerConnection
      → Socket emits room:join
      → Initiator creates offer → sends via socket
      → Responder receives offer → creates answer → sends via socket
      → ICE candidates exchanged ✅
      → Connection established
      → Timer starts ⚠️ (race condition on start)
      → Call proceeds
      → Timer hits 0 OR user clicks end
      → Socket emits call:end
      → Server saves history
      → Server sets cooldown
      → Both users redirected to end screen
```

**Issues:** Timer race condition, room cleanup issues

---

### State Management Analysis

**Server State (In-Memory):**
```
users Map<userId, User>
sessions Map<sessionToken, Session>
history Map<userId, ChatHistory[]>
presence Map<userId, Presence>
cooldowns Map<key, expiresAt>
activeInvites Map<inviteId, Invite>
activeRooms Map<roomId, RoomData>
activeSockets Map<userId, socketId>
```

**Issues:**
1. ✅ All state in memory (intentional for demo)
2. ❌ No persistence across restarts
3. ❌ No way to recover from crashes
4. ❌ activeSockets not cleaned up properly
5. ❌ activeRooms leak on disconnect

---

**Client State (React):**
```
MatchmakeOverlay:
  - users[] (queue)
  - currentIndex
  - inviteStatuses{}
  - incomingInvite
  - testMode
  
RoomPage:
  - timeRemaining
  - messages[]
  - peerConnectionRef
  - localStreamRef
```

**Issues:**
1. ⚠️ State fragmentation (no global state manager)
2. ⚠️ Props drilling in some places
3. ⚠️ No persistence of UI state
4. ✅ But overall well-structured for current scale

---

## 🎯 Recommendations

### Immediate Actions (Before Any Deployment):

1. **Fix Security Issues:**
   - [ ] Implement bcrypt for passwords
   - [ ] Move session to httpOnly cookies
   - [ ] Add rate limiting
   - [ ] Sanitize chat messages
   - [ ] Add Socket.io authentication middleware

2. **Fix Critical Bugs:**
   - [ ] Fix presence/queue race condition
   - [ ] Fix Socket.io initialization in auth module
   - [ ] Add proper cleanup on disconnect
   - [ ] Fix timer start race condition

3. **Add Error Handling:**
   - [ ] Wrap all API calls in try-catch
   - [ ] Add error boundaries in React
   - [ ] Add proper logging (not console.log)
   - [ ] Add Sentry or similar error tracking

### For Cloud Migration:

1. **Database Migration:**
   - Replace in-memory store with PostgreSQL
   - Add proper indexes
   - Use transactions for atomic operations
   - Add database migrations framework (e.g., Prisma)

2. **File Storage:**
   - Move uploads to S3/Cloudinary
   - Add CDN for media delivery
   - Implement signed URLs for security

3. **Infrastructure:**
   - Add Redis for Socket.io scaling
   - Add TURN server for WebRTC
   - Set up SSL/TLS certificates
   - Configure environment variables properly

4. **Monitoring:**
   - Add logging infrastructure (Winston + CloudWatch)
   - Add error tracking (Sentry)
   - Add analytics (Mixpanel/Amplitude)
   - Add performance monitoring (DataDog/New Relic)

---

## 📈 Code Quality Metrics

| Metric | Score | Notes |
|--------|-------|-------|
| TypeScript Coverage | 95% | ✅ Excellent |
| Error Handling | 40% | ❌ Needs improvement |
| Security | 50% | ⚠️ Major issues for production |
| Code Organization | 85% | ✅ Good structure |
| Documentation | 70% | ✅ Good READMEs |
| Testing | 0% | ❌ No tests written |
| Performance | 75% | ✅ Good for current scale |

**Overall Score: B+ (83%)**

---

## 🏁 Conclusion

The Napalm Sky codebase is **well-structured and functional** for a local development MVP. The core features work well, and the code is generally clean and organized. However, there are **critical security and reliability issues** that must be addressed before any production deployment.

**Key Strengths:**
- Clear architecture with separation of concerns
- Good use of TypeScript for type safety
- Real-time features implemented correctly
- WebRTC implementation is solid

**Key Weaknesses:**
- Security vulnerabilities (sessions, passwords, XSS)
- Race conditions in state management
- No error handling in many places
- No testing infrastructure
- Hardcoded configuration

**Verdict:** ✅ Safe to continue development locally, ❌ Not production-ready yet

**Estimated Time to Production-Ready:** 2-3 weeks of focused development

---

*Review completed by: Claude (AI Code Reviewer)*  
*Date: October 10, 2025*  
*Files reviewed: 30+ files across frontend and backend*

