# 🗄️ Persistent Storage - Complete Setup Guide

## 📊 **Current Storage System**

Your app uses a **hybrid storage system**:

### What's Stored Where:

| Data Type | In-Memory | PostgreSQL | Notes |
|-----------|-----------|------------|-------|
| Users | ✅ Cache | ✅ If DATABASE_URL set | User profiles, payment status |
| Sessions | ✅ Cache | ✅ If DATABASE_URL set | **Lost on restart without DB!** |
| Chat History | ✅ Only | ✅ If DATABASE_URL set | Past conversations |
| Cooldowns | ✅ Only | ✅ If DATABASE_URL set | 24h restrictions |
| Invite Codes | ✅ Only | ✅ If DATABASE_URL set | QR codes, uses remaining |
| Reports | ✅ Only | ✅ If DATABASE_URL set | User reports |
| Ban Records | ✅ Only | ✅ If DATABASE_URL set | Moderation data |
| **Presence** | ✅ Only | ❌ Never | Who's online (real-time) |
| **Active Invites** | ✅ Only | ❌ Never | Pending call invites (temporary) |
| **Active Rooms** | ✅ Only | ❌ Never | Ongoing video calls (temporary) |

---

## 🚨 **Critical Issue: Sessions**

**Without DATABASE_URL:**
```
User signs up → Session in memory only
Railway restarts → Session DELETED
User refreshes → "Authentication failed" ❌
Must sign up again!
```

**With DATABASE_URL:**
```
User signs up → Session in memory + PostgreSQL
Railway restarts → Memory cleared
User refreshes → Session loaded from DB ✅
Auth succeeds!
```

---

## ✅ **Setup PostgreSQL Persistence (Railway)**

### Option 1: Railway PostgreSQL Plugin (Easiest)

**Step 1: Add PostgreSQL**
1. Go to Railway Dashboard
2. Click your Napalmsky project
3. Click "+ New"
4. Select "Database" → "PostgreSQL"
5. Railway creates a new PostgreSQL instance

**Step 2: Connect to Backend**
1. Railway automatically creates `DATABASE_URL` variable
2. Links it to your backend service
3. Format: `postgresql://postgres:password@host:port/database`

**Step 3: Run Database Schema**

```bash
# Option A: Use Railway CLI
railway login
railway link  # Select your project
railway run psql $DATABASE_URL < server/schema.sql

# Option B: Use psql directly
psql "postgresql://user:pass@host:port/dbname" < server/schema.sql

# Option C: Connect and paste schema
railway run psql $DATABASE_URL
# Then paste contents of server/schema.sql
```

**Step 4: Verify Tables Created**

```sql
-- In psql session
\dt

-- Should show:
--  users
--  sessions  ← Critical!
--  chat_history
--  cooldowns
--  invite_codes
--  reports
--  ban_records
--  ip_bans
--  referral_notifications
--  audit_log
```

**Step 5: Restart Backend**

Railway will auto-restart. Check logs:
```
✅ [Store] Using PostgreSQL storage
✅ [Store] ✅ PostgreSQL connection successful
```

**Done! Sessions now persist forever!**

---

### Option 2: External PostgreSQL (AWS RDS, Heroku, etc.)

**Step 1: Create PostgreSQL Database**
- AWS RDS, Heroku Postgres, Supabase, etc.
- Get connection string

**Step 2: Add to Railway**
1. Railway → Variables
2. Add: `DATABASE_URL=postgresql://...`
3. Save

**Step 3: Run Schema**
```bash
psql $DATABASE_URL < server/schema.sql
```

**Step 4: Verify**
- Check Railway logs for successful connection
- Test signup → restart → should still be logged in

---

## 🧪 **Test Persistence**

### Test 1: Session Persistence

```bash
# 1. Sign up new account
# 2. Note your session token:
localStorage.getItem('napalmsky_session')

# 3. Manually restart Railway:
# Railway Dashboard → Deployments → Click "Redeploy"

# 4. Wait for redeploy (~3 min)

# 5. Refresh browser

# Expected:
# ✅ Still logged in (with PostgreSQL)
# ❌ "Authentication failed" (without PostgreSQL)
```

### Test 2: Data Persistence

```bash
# 1. Make a video call
# 2. Check history page - should show chat
# 3. Restart Railway
# 4. Check history again

# Expected:
# ✅ Chat history still there (with PostgreSQL)
# ❌ History empty (without PostgreSQL)
```

---

## 📊 **How the Hybrid System Works**

```typescript
// server/src/store.ts:51
private useDatabase = !!process.env.DATABASE_URL;

async createSession(session: Session): Promise<void> {
  // Always save to memory (fast access)
  this.sessions.set(session.sessionToken, session);
  
  // Also save to PostgreSQL if available
  if (this.useDatabase) {
    await query(`INSERT INTO sessions ...`, [session...]);
  }
}

async getSession(sessionToken: string): Promise<Session | undefined> {
  // Check memory first (fast!)
  let session = this.sessions.get(sessionToken);
  
  // If not in memory and DB available, check there
  if (!session && this.useDatabase) {
    const result = await query('SELECT * FROM sessions WHERE session_token = $1', [sessionToken]);
    if (result.rows.length > 0) {
      session = convertToSession(result.rows[0]);
      this.sessions.set(sessionToken, session);  // Cache it!
    }
  }
  
  return session;
}
```

**Benefits:**
- ✅ Fast reads (memory cache)
- ✅ Persistent writes (PostgreSQL)
- ✅ Auto-recovery (loads from DB on restart)
- ✅ Graceful fallback (works without DB for dev)

---

## 🔧 **Troubleshooting**

### Issue: "Using in-memory storage" (should be PostgreSQL)

**Cause:** DATABASE_URL not set or connection failed

**Check:**
```bash
# Railway Dashboard → Variables
# Look for DATABASE_URL

# Should be:
DATABASE_URL=postgresql://postgres:***@region.railway.app:5432/railway

# If missing → Add PostgreSQL plugin
# If present but connection fails → Check credentials
```

---

### Issue: Sessions still lost after setting DATABASE_URL

**Possible causes:**
1. Schema not run (tables don't exist)
2. Database credentials wrong
3. Firewall blocking connection

**Verify:**
```bash
# Connect to database
psql $DATABASE_URL

# List tables
\dt

# If no tables → Run schema!
# If has tables → Check if sessions are being inserted:
SELECT COUNT(*) FROM sessions;
```

---

### Issue: "Slow query detected" in logs

**This is normal!** First query is slow (~200ms) because:
- Establishing connection pool
- SSL handshake
- Cache warming

Subsequent queries are fast (~2-5ms).

---

## 💰 **Cost**

### Railway PostgreSQL:
- **Free tier:** 512MB storage, 1GB transfer
- **Paid:** $5/month for 1GB, $10/month for 2GB
- **Recommended:** Starter plan for production

### Alternative (Free):
- **Supabase:** 500MB free forever
- **Neon:** 3GB free tier
- Both provide PostgreSQL connection string

---

## 🎯 **What to Do Now**

### 1. Check if DATABASE_URL is Set

```bash
# Railway Dashboard → Backend Service → Variables
# Look for: DATABASE_URL

# If exists: postgresql://...
# Status: ✅ Good, but verify connection in logs

# If missing:
# Status: ❌ Add PostgreSQL plugin NOW!
```

### 2. Verify Connection in Logs

```
Look for:
✅ [Store] Using PostgreSQL storage
✅ [Store] ✅ PostgreSQL connection successful

If you see:
❌ [Store] Using in-memory storage
❌ [Store] ❌ PostgreSQL connection failed
→ DATABASE_URL not working!
```

### 3. Run Schema (If Not Done)

```bash
railway link
railway run psql $DATABASE_URL < server/schema.sql
```

### 4. Test

```bash
# Sign up → restart Railway → should still be logged in!
```

---

## 📝 **Summary**

**The auth failures you're seeing are because:**
- Railway restarted
- Sessions were only in memory
- All sessions were deleted
- Users' localStorage has invalid tokens

**Fix:**
1. Ensure `DATABASE_URL` is set and working
2. Run schema to create tables
3. Restart server
4. Sessions will now persist!

**Immediate workaround:**
- Users clear localStorage and re-signup

---

See `SESSION-PERSISTENCE-FIX.md` for detailed diagnostics.

**Check your Railway DATABASE_URL variable right now!** 🔍
