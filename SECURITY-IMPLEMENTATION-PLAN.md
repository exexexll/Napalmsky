# SECURITY IMPLEMENTATION PLAN

**Date:** October 18, 2025  
**Status:** Planning Phase

---

## REQUIREMENTS

### 1. Single Session Enforcement
- **Goal:** Prevent multiple simultaneous logins
- **Behavior:** New login invalidates old session
- **Notification:** Old session shows "You have been logged out"

### 2. QR Grace Period System
- **Goal:** Users must complete 4 successful video sessions before QR code unlocks
- **Tracking:** By userId in database
- **Storage:** Permanent SQL record
- **Optimization:** Efficient storage, no bloat

### 3. Security Audit
- **Check:** All vulnerabilities
- **Verify:** No bypass methods
- **Test:** Code integrity

---

## IMPLEMENTATION PLAN

### Phase 1: Database Schema Updates

**New table: `session_completions`**
```sql
CREATE TABLE session_completions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES users(user_id),
  room_id UUID NOT NULL,
  duration_seconds INTEGER NOT NULL,
  completed_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_user_id (user_id),
  INDEX idx_completed_at (completed_at)
);
```

**Update `users` table:**
```sql
ALTER TABLE users ADD COLUMN qr_unlocked BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN successful_sessions INTEGER DEFAULT 0;
```

**Update `sessions` table:**
```sql
ALTER TABLE sessions ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE sessions ADD COLUMN device_info TEXT;
```

### Phase 2: Single Session Enforcement

**Server-side (`server/src/auth.ts`):**
1. On login: Invalidate all existing sessions for user
2. Create new session
3. Emit socket event to old sessions: `session:invalidated`

**Client-side (`lib/session.ts` or component):**
1. Listen for `session:invalidated` event
2. Clear localStorage
3. Show modal: "You have been logged out"
4. Redirect to login

### Phase 3: QR Grace Period

**On call end (`server/src/room.ts`):**
1. Increment user's `successful_sessions` count
2. If count >= 4: Set `qr_unlocked = true`
3. Notify user via socket

**On settings/QR display:**
1. Check `qr_unlocked` status
2. If false: Show progress (X/4 sessions completed)
3. If true: Show QR code

### Phase 4: Security Audit

**Check for:**
- Session hijacking
- QR code bypass methods
- Database injection
- Race conditions
- Memory leaks

---

## VULNERABILITIES TO ADDRESS

1. **Session replay attacks** → Add device fingerprinting
2. **Concurrent session bypass** → Strict server-side validation
3. **QR count manipulation** → Server-side only, immutable
4. **Database bloat** → Auto-cleanup old records (90 days)

---

## FILES TO MODIFY

- `server/schema.sql` - Add new tables/columns
- `server/src/types.ts` - Add new interfaces
- `server/src/store.ts` - Add new methods
- `server/src/auth.ts` - Single session logic
- `server/src/room.ts` - Track completions
- `server/src/payment.ts` - QR unlock check
- `app/settings/page.tsx` - QR unlock UI
- `lib/session.ts` - Handle logout event

---

## TESTING CHECKLIST

- [ ] New login invalidates old session
- [ ] Old session gets logout notification
- [ ] QR code locked for new users
- [ ] QR unlocks after 4 sessions
- [ ] Database records persist
- [ ] No bypass methods work
- [ ] Performance is acceptable

---

**This is a major change. Proceed carefully.**

