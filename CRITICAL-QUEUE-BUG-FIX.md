# 🔴 CRITICAL BUG: Queue Not Joining

## 🐛 **The Problem**

Users show as `available=false` even though they're in matchmaking:

```
[Store]   049d2edb: online=true, available=FALSE ← Not in queue!
[Queue API] User 4a5dee0b requesting queue
[Queue API] Total online & available (excluding self): 0 users
```

---

## 🔍 **Root Cause**

The socket pre-authenticates successfully but **never emits `auth:success`**!

### Backend (server/src/index.ts:205-273):
```typescript
io.on('connection', (socket) => {
  let currentUserId = (socket as any).userId || null;  // Pre-authenticated!
  
  if (currentUserId) {
    // User is ALREADY authenticated by middleware
    store.setPresence(currentUserId, { online: true, available: false });
    console.log('User pre-authenticated');
    // ❌ NEVER emits 'auth:success'!
  }
  
  socket.on('auth', async ({ sessionToken }) => {
    // This handles post-authentication
    if (session) {
      socket.emit('auth:success');  // ← Only emits here!
    }
  });
});
```

### Frontend (components/matchmake/MatchmakeOverlay.tsx:238):
```typescript
socket.on('auth:success', handleAuth);  // ← WAITING FOR THIS

const handleAuth = () => {
  socket.emit('presence:join');
  socket.emit('queue:join');  // ← NEVER CALLED!
};
```

**Result:** Pre-authenticated users never join the queue!

---

## ✅ **The Fix**

Backend needs to emit `auth:success` for pre-authenticated users:

```typescript
// server/src/index.ts
if (currentUserId) {
  activeSockets.set(currentUserId, socket.id);
  store.setPresence(currentUserId, {
    socketId: socket.id,
    online: true,
    available: false,
    lastActiveAt: Date.now(),
  });
  
  // ✅ EMIT auth:success for pre-authenticated users!
  socket.emit('auth:success');
  
  console.log('User pre-authenticated and auth:success emitted');
}
```

This triggers the frontend's `handleAuth()` which joins the queue!

---

## 📊 **Expected Flow After Fix**

```
1. User opens matchmaking
   ↓
2. Socket connects with token in handshake
   ↓
3. Backend middleware pre-authenticates
   ↓
4. Backend sets currentUserId
   ↓
5. Backend emits 'auth:success' ✅ NEW!
   ↓
6. Frontend receives 'auth:success'
   ↓
7. Frontend calls handleAuth()
   ↓
8. Emits 'presence:join' and 'queue:join'
   ↓
9. Backend marks user as available=true ✅
   ↓
10. Other users see them in queue! ✅
```

---

Let me implement this fix now.

