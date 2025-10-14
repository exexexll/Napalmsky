# 🔍 Verify Backend Data Persistence - Complete Guide

## 📊 **How to Check if Data is Being Saved Correctly**

---

## Method 1: Check Railway Logs (Quick)

### What to Look For:

**Good Signs (PostgreSQL Working):**
```
✅ [Store] Using PostgreSQL storage
✅ [Store] ✅ PostgreSQL connection successful: 2025-10-14...
✅ [Store] User created in database: abc12345
✅ [Store] User updated in database: abc12345
✅ [Database] Query executed: { duration: '5ms', rows: 1 }
```

**Bad Signs (Only Memory):**
```
❌ [Store] Using in-memory storage
❌ [Store] ❌ PostgreSQL connection failed
❌ [Store] ⚠️ Falling back to in-memory storage
```

**Mixed (Partial Failure):**
```
✅ [Store] Using PostgreSQL storage
✅ [Store] ✅ PostgreSQL connection successful
❌ [Store] Failed to create user in database: [error]
⚠️ [Store] Continuing with memory-only storage for this user
```

---

## Method 2: Direct Database Queries (Best)

### Connect to PostgreSQL:

```bash
# Option A: Railway CLI
railway login
railway link
railway run psql $DATABASE_URL

# Option B: Direct connection (get URL from Railway Variables)
psql "postgresql://postgres:password@region.railway.app:5432/railway"
```

---

### Check 1: Verify All Tables Exist

```sql
-- List all tables
\dt

-- Expected output:
--  users
--  sessions
--  chat_history
--  cooldowns
--  invite_codes
--  reports
--  ban_records
--  ip_bans
--  referral_notifications
--  audit_log

-- If any are missing → Schema not fully applied!
```

---

### Check 2: Count Records in Each Table

```sql
-- Users
SELECT COUNT(*) as total_users FROM users;
-- Should match number of signups

-- Sessions
SELECT COUNT(*) as active_sessions FROM sessions WHERE expires_at > NOW();
-- Should match number of logged-in users

-- Chat History
SELECT COUNT(*) as total_chats FROM chat_history;
-- Should match number of completed calls

-- Cooldowns
SELECT COUNT(*) as active_cooldowns FROM cooldowns WHERE expires_at > NOW();
-- Should match number of recent user pairs

-- Invite Codes
SELECT COUNT(*) as total_codes FROM invite_codes WHERE is_active = TRUE;
-- Should match number of paid users + admin codes

-- Reports
SELECT COUNT(*) as total_reports FROM reports;
-- Should match number of user reports submitted
```

**If all show 0:** Data not being saved! Check connection.

---

### Check 3: Inspect Recent Data

```sql
-- Recent users (last 10 signups)
SELECT user_id, name, gender, paid_status, selfie_url IS NOT NULL as has_selfie, 
       video_url IS NOT NULL as has_video, created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- Expected: Should show users you created

-- Recent sessions (active ones)
SELECT session_token, user_id, ip_address, created_at, expires_at
FROM sessions
WHERE expires_at > NOW()
ORDER BY created_at DESC
LIMIT 10;

-- Expected: Should show current sessions

-- Recent chat history
SELECT session_id, user_id, partner_id, partner_name, duration, started_at
FROM chat_history
ORDER BY started_at DESC
LIMIT 10;

-- Expected: Should show recent video calls
```

---

### Check 4: Verify Data Integrity

```sql
-- Check for users without required fields
SELECT user_id, name, 
       selfie_url IS NULL as missing_selfie,
       video_url IS NULL as missing_video,
       paid_status
FROM users
WHERE paid_status IN ('paid', 'qr_verified')
ORDER BY created_at DESC
LIMIT 20;

-- Expected: All paid users should have selfie + video

-- Check for orphaned sessions (user deleted but session remains)
SELECT s.session_token, s.user_id, s.created_at
FROM sessions s
LEFT JOIN users u ON s.user_id = u.user_id
WHERE u.user_id IS NULL;

-- Expected: Should be empty (no orphaned sessions)

-- Check invite code usage
SELECT code, type, max_uses, uses_remaining, 
       JSONB_ARRAY_LENGTH(used_by) as actual_uses,
       is_active, created_by_name
FROM invite_codes
WHERE is_active = TRUE
ORDER BY created_at DESC;

-- Expected: uses_remaining should decrease as codes are used
```

---

## Method 3: Test Data Persistence (Definitive)

### Test 1: User Signup Persistence

```bash
# 1. Sign up new user "TestUser123" 
# 2. Check database:

SELECT * FROM users WHERE name = 'TestUser123';

# Expected: 1 row with all data
# If 0 rows → Not being saved!
```

---

### Test 2: Session Persistence

```bash
# 1. Sign up and get session token
# In browser console:
JSON.parse(localStorage.getItem('napalmsky_session')).sessionToken

# 2. Check database:
SELECT * FROM sessions WHERE session_token = 'YOUR_TOKEN_HERE';

# Expected: 1 row with user_id, expires_at, etc.
# If 0 rows → Sessions not being saved!
```

---

### Test 3: Chat History Persistence

```bash
# 1. Make a video call (at least 5 seconds)
# 2. Check database:

SELECT * FROM chat_history ORDER BY started_at DESC LIMIT 1;

# Expected: Your recent call with partner_name, duration, messages
# If 0 rows → History not being saved!
```

---

### Test 4: Cooldown Persistence

```bash
# 1. Complete a call or decline an invite
# 2. Check database:

SELECT user_id_1, user_id_2, expires_at, created_at
FROM cooldowns
WHERE expires_at > NOW()
ORDER BY created_at DESC
LIMIT 5;

# Expected: Recent cooldown entries
# If 0 rows → Cooldowns only in memory!
```

---

### Test 5: Invite Code Persistence

```bash
# 1. Pay or use QR code (get your own invite code)
# 2. Check database:

SELECT code, type, max_uses, uses_remaining, created_by_name
FROM invite_codes
WHERE type = 'user'
ORDER BY created_at DESC
LIMIT 5;

# Expected: Your invite code with 4 uses
# If 0 rows → Codes not being saved!
```

---

## Method 4: API Endpoint Tests

### Test User Data Endpoint:

```bash
# Get your session token from browser localStorage
# Then:

curl -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  https://napalmsky-production.up.railway.app/user/me

# Expected JSON response with:
# - userId, name, gender
# - selfieUrl, videoUrl (if uploaded)
# - paidStatus
# - timerTotalSeconds, sessionCount

# If 404 → User not in database!
```

---

### Test History Endpoint:

```bash
curl -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  https://napalmsky-production.up.railway.app/room/history

# Expected JSON response with:
# { history: [ { partnerId, partnerName, duration, messages, ... } ] }

# If empty array but you made calls → History not persisting!
```

---

### Test Payment Status Endpoint:

```bash
curl -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  https://napalmsky-production.up.railway.app/payment/status

# Expected JSON response with:
# { paidStatus: 'paid' or 'qr_verified', myInviteCode: 'ABC123...', ... }

# If paidStatus is 'unpaid' but you paid → Payment data not saved!
```

---

## Method 5: Railway Dashboard Database Browser

### Using Railway UI:

1. **Railway Dashboard** → Your Project
2. **Click PostgreSQL service** (not backend)
3. **Click "Data" tab**
4. **Browse tables directly:**
   - Click `users` → See all user records
   - Click `sessions` → See active sessions
   - Click `chat_history` → See call history
   - Click `invite_codes` → See QR codes

**Very convenient for quick checks!**

---

## 🐛 **Common Issues & Diagnostics**

### Issue 1: Data Saved But Not Persisting

**Symptoms:**
- Data appears immediately after creation
- Disappears after server restart
- Database queries return empty

**Cause:** Data only in memory, not hitting PostgreSQL

**Fix:**
```sql
-- Check for INSERT errors in Railway logs
-- Look for:
[Store] Failed to create user in database: [error details]
[Store] Failed to create session in database: [error details]

-- Common causes:
-- 1. Column mismatch (schema out of date)
-- 2. Constraint violation (duplicate key)
-- 3. Permission denied
```

---

### Issue 2: Some Data Persists, Some Doesn't

**Check which operations work:**

```sql
-- Test each table
SELECT COUNT(*) FROM users;        -- Works?
SELECT COUNT(*) FROM sessions;     -- Works?
SELECT COUNT(*) FROM chat_history; -- Works?
SELECT COUNT(*) FROM invite_codes; -- Works?

-- If some work, some don't → Partial schema or table-specific errors
```

---

### Issue 3: Old Data vs New Data

**Symptoms:**
- Users created before schema → Not in database
- Users created after schema → In database

**Verification:**

```sql
-- Check creation times
SELECT name, created_at, 
       CASE 
         WHEN created_at < '2025-10-14 00:00:00' THEN 'Before schema'
         ELSE 'After schema'
       END as period
FROM users
ORDER BY created_at DESC;

-- Users "Before schema" only exist in memory
-- Users "After schema" should be in PostgreSQL
```

---

## 📊 **Health Check Script**

Create this file: `check-database-health.sql`

```sql
-- Database Health Check for Napalm Sky
-- Run with: psql $DATABASE_URL < check-database-health.sql

\echo '=== NAPALM SKY DATABASE HEALTH CHECK ==='
\echo ''

\echo '1. Tables:'
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
\echo ''

\echo '2. Record Counts:'
SELECT 
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM sessions WHERE expires_at > NOW()) as active_sessions,
  (SELECT COUNT(*) FROM chat_history) as chat_history,
  (SELECT COUNT(*) FROM cooldowns WHERE expires_at > NOW()) as active_cooldowns,
  (SELECT COUNT(*) FROM invite_codes WHERE is_active = TRUE) as active_codes,
  (SELECT COUNT(*) FROM reports) as reports;
\echo ''

\echo '3. Recent Activity (Last 24h):'
SELECT 
  (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '24 hours') as new_users,
  (SELECT COUNT(*) FROM sessions WHERE created_at > NOW() - INTERVAL '24 hours') as new_sessions,
  (SELECT COUNT(*) FROM chat_history WHERE started_at > NOW() - INTERVAL '24 hours') as recent_calls;
\echo ''

\echo '4. Data Integrity:'
SELECT 
  (SELECT COUNT(*) FROM users WHERE selfie_url IS NULL AND paid_status IN ('paid', 'qr_verified')) as paid_users_no_selfie,
  (SELECT COUNT(*) FROM users WHERE video_url IS NULL AND paid_status IN ('paid', 'qr_verified')) as paid_users_no_video;
\echo ''

\echo '5. Storage Usage:'
SELECT 
  pg_size_pretty(pg_database_size(current_database())) as database_size,
  pg_size_pretty(pg_total_relation_size('users')) as users_table_size,
  pg_size_pretty(pg_total_relation_size('sessions')) as sessions_table_size,
  pg_size_pretty(pg_total_relation_size('chat_history')) as history_table_size;
\echo ''

\echo '=== HEALTH CHECK COMPLETE ==='
```

**Run it:**
```bash
cd /Users/hansonyan/Desktop/Napalmsky
railway run psql $DATABASE_URL < check-database-health.sql
```

---

## 🎯 **Expected Results**

### Healthy Database:
```
Users: 10+ (number of signups)
Active Sessions: 5+ (number of logged-in users)
Chat History: 3+ (number of calls made)
Active Cooldowns: 2+ (recent user pairs)
Active Codes: 10+ (paid users + admin codes)
Reports: 0+ (depends on usage)

New Users (24h): 5+
New Sessions (24h): 10+
Recent Calls (24h): 2+

Paid Users No Selfie: 0 (all should have selfies)
Paid Users No Video: 0 (all should have videos)

Database Size: 1-10 MB (depends on usage)
```

### Unhealthy (Memory Only):
```
All counts: 0
Database Size: < 100 KB (just schema)

← Nothing is being saved!
```

---

## 🔧 **Troubleshooting**

### If Counts Are All Zero:

**Diagnosis:**
```bash
# Check Railway logs for INSERT errors
railway logs | grep "Failed to"

# Look for:
[Store] Failed to create user in database: [error]
[Store] Failed to create session in database: [error]
[Database] Query error: { ... }
```

**Common Causes:**
1. Schema not applied (tables don't exist)
2. Column mismatch (schema outdated)
3. Permission denied (user can't INSERT)
4. Connection lost (network issue)

---

### If Some Tables Have Data, Others Don't:

**Check each operation:**

```sql
-- Test INSERT directly
INSERT INTO users (user_id, name, gender, account_type, paid_status, created_at, updated_at)
VALUES (gen_random_uuid(), 'Test User', 'unspecified', 'guest', 'unpaid', NOW(), NOW());

-- If this works → Backend code issue
-- If this fails → Database permission/schema issue
```

---

## 📈 **Monitor Data Growth**

### Track Over Time:

```sql
-- Run this daily
SELECT 
  DATE(created_at) as date,
  COUNT(*) as new_users
FROM users
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 7;

-- Shows user growth per day
-- Should increase if app is being used
```

---

### Check Latest Activity:

```sql
-- Who signed up recently?
SELECT name, gender, paid_status, created_at
FROM users
ORDER BY created_at DESC
LIMIT 5;

-- Recent video calls
SELECT u1.name as user1, u2.name as user2, duration, started_at
FROM chat_history ch
JOIN users u1 ON ch.user_id = u1.user_id
JOIN users u2 ON ch.partner_id = u2.user_id
ORDER BY started_at DESC
LIMIT 5;

-- Recent invite code usage
SELECT code, type, created_by_name, 
       max_uses - uses_remaining as times_used,
       uses_remaining
FROM invite_codes
WHERE is_active = TRUE
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🧪 **End-to-End Persistence Test**

### Complete Test Flow:

**Step 1: Create Test User**
```bash
1. Sign up as "PersistenceTest"
2. Upload selfie + video
3. Pay or use QR code
```

**Step 2: Check User in Database**
```sql
SELECT * FROM users WHERE name = 'PersistenceTest';

-- Verify:
-- ✅ user_id exists
-- ✅ selfie_url is NOT NULL
-- ✅ video_url is NOT NULL
-- ✅ paid_status is 'paid' or 'qr_verified'
-- ✅ my_invite_code is NOT NULL
```

**Step 3: Check Session**
```sql
SELECT s.*, u.name
FROM sessions s
JOIN users u ON s.user_id = u.user_id
WHERE u.name = 'PersistenceTest';

-- Verify:
-- ✅ session_token exists
-- ✅ expires_at > NOW()
-- ✅ user_id matches
```

**Step 4: Make a Call**
```bash
1. Match with another user
2. Video call for 30+ seconds
3. End call
```

**Step 5: Check History**
```sql
SELECT ch.*, u.name as partner
FROM chat_history ch
JOIN users u ON ch.partner_id = u.user_id
WHERE ch.user_id = (SELECT user_id FROM users WHERE name = 'PersistenceTest');

-- Verify:
-- ✅ Chat record exists
-- ✅ partner_name is correct
-- ✅ duration > 0
-- ✅ messages array has content
```

**Step 6: Check Metrics**
```sql
SELECT name, timer_total_seconds, session_count, last_sessions
FROM users
WHERE name = 'PersistenceTest';

-- Verify:
-- ✅ timer_total_seconds increased
-- ✅ session_count = 1
-- ✅ last_sessions has entry
```

**Step 7: Restart Server**
```bash
# Railway Dashboard → Deployments → Manual Deploy
# Wait 3 minutes
```

**Step 8: Verify Data Survived**
```sql
-- Run all queries again
SELECT * FROM users WHERE name = 'PersistenceTest';
SELECT * FROM sessions WHERE user_id = (SELECT user_id FROM users WHERE name = 'PersistenceTest');
SELECT * FROM chat_history WHERE user_id = (SELECT user_id FROM users WHERE name = 'PersistenceTest');

-- ALL should still return data! ✅
```

---

## 🚨 **Red Flags**

### Data Loss Indicators:

1. **Logs say "PostgreSQL" but queries return 0 rows**
   - Connection working but INSERTs failing
   - Check for SQL errors in logs

2. **Data exists but disappears after restart**
   - Not actually writing to PostgreSQL
   - Only writing to memory
   - Check INSERT query logs

3. **Some users in DB, others not**
   - Intermittent connection issues
   - Check Railway logs for database errors

4. **Sessions table always empty**
   - Session creation failing
   - Critical for auth persistence!

---

## ✅ **Success Criteria**

**All of these should be TRUE:**

- [ ] Railway logs show "Using PostgreSQL storage"
- [ ] Railway logs show "PostgreSQL connection successful"
- [ ] All 10 tables exist in database
- [ ] `users` table has rows = number of signups
- [ ] `sessions` table has rows = number of logged-in users
- [ ] `chat_history` table has rows = number of calls made
- [ ] Recent user query returns latest signups
- [ ] Data survives Railway restart
- [ ] No "Failed to create/update" errors in logs

**If all ✅ → Database persistence is working perfectly!**

---

## 📝 **Quick Verification Command**

Run this in one go:

```sql
-- Copy/paste into psql session
SELECT 
  'Users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 'Sessions (active)', COUNT(*) FROM sessions WHERE expires_at > NOW()
UNION ALL SELECT 'Chat History', COUNT(*) FROM chat_history
UNION ALL SELECT 'Cooldowns (active)', COUNT(*) FROM cooldowns WHERE expires_at > NOW()
UNION ALL SELECT 'Invite Codes (active)', COUNT(*) FROM invite_codes WHERE is_active = TRUE
UNION ALL SELECT 'Reports', COUNT(*) FROM reports
UNION ALL SELECT 'Ban Records', COUNT(*) FROM ban_records
UNION ALL SELECT 'IP Bans', COUNT(*) FROM ip_bans
UNION ALL SELECT 'Referral Notifications', COUNT(*) FROM referral_notifications
ORDER BY table_name;

-- All counts should be > 0 if app is being used with PostgreSQL
```

---

## 🎯 **Summary**

**To verify persistence:**
1. Check Railway logs for PostgreSQL success messages
2. Query database directly (counts, recent data)
3. Test by creating data → restart → check if it survived
4. Use API endpoints to verify data is accessible

**If any test fails → Data is NOT persisting correctly!**

See this guide anytime you want to verify your database is working.

