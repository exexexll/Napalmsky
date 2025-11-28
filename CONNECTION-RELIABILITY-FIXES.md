# Connection & Signaling Reliability Improvements

## Date: November 19, 2025

## Summary

Addressed issues with disconnection handling, call notification reliability, and WebRTC connection stability.

---

## Changes

### 1. Improved Reconnection & Disconnect Logic (`app/room/[roomId]/page.tsx`)

*   **Graceful Failure UI**: Updated `pc.onconnectionstatechange` to show a clear "Connection Lost" permission sheet instead of generic errors when reconnection fails after the grace period.
*   **Peer Notification**: Explicitly emits `connection:failed` to the peer with a clear reason when local connection fails.
*   **Timeout Handling**: Updated `initializeRoom` timeout (45s) to show a specific "Connection timed out" error message instead of just setting a flag.

### 2. Fixed Signaling Race Conditions (`server/src/index.ts` & `app/room/[roomId]/page.tsx`)

*   **Root Cause**: If the initiator created the WebRTC offer before the peer joined the socket room, the `rtc:offer` message (broadcast to room) would be lost. This resulted in the peer waiting indefinitely on a blank screen.
*   **Server Fix**: Added `socket.to(roomId).emit('room:user_joined', ...)` when a user joins a room.
*   **Frontend Fix**: Added a listener for `room:user_joined`. If the initiator receives this event and is not yet connected, they automatically generate and resend the offer.
    *   This ensures the offer always reaches the peer, even if they join late.

### 3. WebRTC Stability

*   **ICE Candidate Pooling**: Added `iceCandidatePoolSize: 10` to `RTCConfiguration`. This allows the browser to gather ICE candidates *before* the offer is created, significantly speeding up connection establishment.
*   **ICE Queueing**: Verified that ICE candidates arriving before remote description are properly queued (existing logic).

---

## Verification

1.  **Disconnect Scenario**:
    *   Disconnect internet.
    *   Grace period UI shows "Attempting to reconnect...".
    *   After 10s, UI shows "Connection Lost" sheet.
    *   Peer receives "Peer lost connection" notification.

2.  **Late Join Scenario**:
    *   Initiator joins, sends offer immediately.
    *   Peer joins 2 seconds later (misses original offer).
    *   Server emits `room:user_joined`.
    *   Initiator sees peer joined, resends offer.
    *   Peer receives offer, connection proceeds.

3.  **Location Permission**:
    *   Verified `UserCard.tsx` invite logic. Location failure in `MatchmakeOverlay` (before invite) prevents the invite. If invite sends, server validates online status.
    *   The fix for "User B shows nothing" is primarily the **Signaling Race Condition** fix above.

---

## Files Modified

*   `app/room/[roomId]/page.tsx`
*   `server/src/index.ts`

