# 🔧 Connection Timing & State Management Fixes

## 🔍 **Two Issues Identified:**

### **Issue 1: First Connection Fails, Retry Works**

**What this means:**
- WebRTC setup is correct ✅
- TURN servers working ✅
- But timing is off on first attempt ❌
- Retry gives more time → works ✅

**Root causes:**
1. **ICE gathering not complete** before offer sent
2. **Safari needs more time** to initialize
3. **TURN connection** needs warmup period
4. **Network handshake** takes longer on first attempt

---

### **Issue 2: Server Thinks Users Disconnected During Call**

**Symptoms:**
- Both users still on call
- Server logs show "disconnected"
- Might affect call end, history, cooldowns

**Root causes:**
1. **Socket.io ping/pong timeout**
2. **Multiple socket connections** causing state confusion
3. **Network interruption** triggering false disconnect
4. **Socket reconnection** not handled properly

---

## ✅ **Fixes to Apply:**

### **Fix 1: Increase ICE Gathering Time (Safari)**

Currently:
```typescript
if (isSafari) {
  await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds
}
```

**Increase to 3-4 seconds for mobile:**
```typescript
if (isSafari && isMobile) {
  await new Promise(resolve => setTimeout(resolve, 4000)); // 4 seconds for mobile
} else if (isSafari) {
  await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds for desktop
}
```

**Why:** Mobile Safari on 5G needs more time to:
- Discover network interfaces
- Contact TURN servers
- Gather relay candidates
- Complete initial handshake

---

### **Fix 2: Add ICE Gathering State Check**

**Wait for ICE gathering to complete:**
```typescript
// Wait for ICE gathering to reach 'complete' state
const waitForICEGathering = new Promise((resolve) => {
  if (pc.iceGatheringState === 'complete') {
    resolve();
  }
  
  pc.addEventListener('icegatheringstatechange', () => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
    }
  });
  
  // Timeout after 5 seconds
  setTimeout(resolve, 5000);
});

await waitForICEGathering;
console.log('[WebRTC] ICE gathering complete, creating offer...');
```

**Why:** Ensures offer includes ALL ICE candidates, not just initial ones

---

### **Fix 3: Prevent False Socket Disconnects**

**Socket.io configuration needs:**
```typescript
// lib/socket.ts
socket = io(SOCKET_URL, {
  autoConnect: true,
  auth: { token: sessionToken },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,  // More attempts
  reconnectionDelay: 1000,
  timeout: 20000,
  // NEW: Increase ping timeout
  pingTimeout: 60000,  // 60 seconds (was 20s default)
  pingInterval: 25000, // Check connection every 25s
});
```

**Why:** 
- Default ping timeout too short for mobile networks
- 5G can have packet loss
- Need longer timeout to avoid false disconnects

---

### **Fix 4: Handle Socket Reconnection During Call**

**When socket reconnects during call:**
```typescript
socket.on('reconnect', () => {
  console.log('[Socket] Reconnected during call');
  // Re-join the room
  if (roomId) {
    socket.emit('room:join', { roomId });
  }
});
```

**Why:** If socket temporarily disconnects and reconnects, need to rejoin room

---

### **Fix 5: Distinguish Real vs Temporary Disconnects**

**Don't mark offline immediately:**
```typescript
socket.on('disconnect', async (reason) => {
  console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
  
  // If reason is 'transport close' or 'ping timeout', might reconnect
  if (reason === 'transport close' || reason === 'ping timeout') {
    console.log('[Disconnect] Temporary disconnect, waiting for reconnection...');
    
    // Wait 5 seconds before marking offline
    setTimeout(() => {
      // Check if still disconnected
      const stillDisconnected = !activeSockets.has(currentUserId);
      if (stillDisconnected) {
        // Mark offline
        store.updatePresence(currentUserId, { online: false, available: false });
      }
    }, 5000);
  } else {
    // Immediate offline for intentional disconnects
    store.updatePresence(currentUserId, { online: false, available: false });
  }
});
```

**Why:** Prevents marking users offline during temporary network blips

---

## 📊 **Why Retry Works:**

**First Attempt:**
```
1. Camera/mic permission granted
2. Fetch TURN credentials (1-2s)
3. Create PeerConnection immediately
4. Safari: ICE gathering starts
5. Offer created TOO EARLY (candidates incomplete)
6. Sent to peer with partial candidates
7. Connection fails - missing relay candidates ❌
```

**After Retry (Refresh):**
```
1. Camera/mic already permitted (faster)
2. TURN credentials cached
3. Create PeerConnection
4. Safari: ICE gathering
5. User waits a bit before trying again
6. More time = complete candidate gathering
7. Offer includes all candidates (including TURN relay)
8. Connection succeeds! ✅
```

---

## ✅ **Solution: Pre-warm ICE Gathering**

**Add this before creating offer:**

```typescript
// Wait for at least ONE relay candidate before proceeding
const hasRelayCandidate = new Promise((resolve) => {
  let foundRelay = false;
  
  const checkCandidates = (event: RTCPeerConnectionIceEvent) => {
    if (event.candidate?.type === 'relay') {
      foundRelay = true;
      console.log('[WebRTC] ✅ Relay candidate found!');
      resolve(true);
    }
  };
  
  pc.addEventListener('icecandidate', checkCandidates);
  
  // Timeout after 5 seconds even if no relay
  setTimeout(() => {
    if (!foundRelay) {
      console.warn('[WebRTC] No relay candidate after 5s, proceeding anyway');
    }
    resolve(false);
  }, 5000);
});

await hasRelayCandidate;
console.log('[WebRTC] Ready to create offer');
```

**This ensures TURN relay candidates are included in the offer!**

---

Let me implement all these fixes:

<function_calls>
<invoke name="search_replace">
<parameter name="file_path">/Users/hansonyan/Desktop/Napalmsky/lib/socket.ts
