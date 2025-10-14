# 🚨 Run Database Schema - Sessions Table Missing

## 🔴 **The Issue**

DATABASE_URL is set, but auth is failing because **the sessions table doesn't exist yet!**

Your Railway logs show:
```
✅ [Store] Using PostgreSQL storage
✅ [Store] ✅ PostgreSQL connection successful
```

But sessions aren't persisting because the **schema hasn't been applied** to create the tables.

---

## ✅ **Quick Fix (5 Minutes)**

### Step 1: Connect to Railway PostgreSQL

```bash
# Option A: Use Railway CLI (Recommended)
railway login
railway link  # Select your Napalmsky project
railway run psql $DATABASE_URL
```

**Or:**

```bash
# Option B: Get DATABASE_URL from Railway Dashboard
# Railway → Your Project → Backend Service → Variables → DATABASE_URL
# Copy the full connection string

# Then connect:
psql "postgresql://postgres:password@region.railway.app:5432/railway"
```

---

### Step 2: Check if Tables Exist

```sql
-- In psql session
\dt

-- If you see NO TABLES or missing 'sessions' table:
-- Tables:
--  users
--  sessions  ← Must have this!
--  chat_history
--  cooldowns
--  invite_codes
--  etc.

-- If sessions table is missing → That's why auth fails!
```

---

### Step 3: Run the Schema

**From your local terminal:**

```bash
cd /Users/hansonyan/Desktop/Napalmsky

# Run schema file
railway run psql $DATABASE_URL < server/schema.sql
```

**Or paste it manually:**

```bash
# Connect
railway run psql $DATABASE_URL

# Then paste entire contents of server/schema.sql
# (Copy from /Users/hansonyan/Desktop/Napalmsky/server/schema.sql)
```

---

### Step 4: Verify Tables Created

```sql
-- In psql session
\dt

-- Should now show all tables:
List of relations
 Schema |        Name              | Type  |  Owner  
--------+--------------------------+-------+---------
 public | users                    | table | postgres
 public | sessions                 | table | postgres  ← This one!
 public | chat_history             | table | postgres
 public | cooldowns                | table | postgres
 public | invite_codes             | table | postgres
 public | reports                  | table | postgres
 public | ban_records              | table | postgres
 public | ip_bans                  | table | postgres
 public | referral_notifications   | table | postgres
 public | audit_log                | table | postgres
(10 rows)
```

---

### Step 5: Restart Railway Backend

```bash
# Railway Dashboard → Deployments → Manual Deploy
# Or just wait, it will auto-deploy on next push
```

---

### Step 6: Test

1. **Clear localStorage:** `localStorage.clear()`
2. **Sign up new account**
3. **Manually restart Railway** (Deployments → Redeploy)
4. **Wait 3 minutes**
5. **Refresh browser**
6. **Expected:** Still logged in! ✅

---

## 🧪 **Quick Test if Schema is Applied**

Run this query:

```sql
-- Check if sessions table exists and has structure
\d sessions

-- Should show:
Table "public.sessions"
    Column     |            Type             
---------------+-----------------------------
 session_token | uuid                        
 user_id       | uuid                        
 ip_address    | inet                        
 created_at    | timestamp without time zone 
 expires_at    | timestamp without time zone 
```

**If this fails:** Schema not applied, sessions can't be saved!

---

## 🎯 **Expected Result**

### Before Schema:
```
Sign up → Session in memory only
Railway restarts → Auth fails ❌
```

### After Schema:
```
Sign up → Session in memory + PostgreSQL
Railway restarts → Session loads from DB ✅
Auth succeeds!
```

---

## 📝 **Summary**

**If you have DATABASE_URL set but auth is failing:**
1. Schema probably not applied
2. Sessions table doesn't exist
3. Sessions can't be saved to database
4. Falls back to memory-only
5. Lost on restart

**Fix:** Run `server/schema.sql` against your Railway PostgreSQL NOW!

---

## 🚀 **Alternative: Quick Schema Run**

```bash
# One command to rule them all:
cd /Users/hansonyan/Desktop/Napalmsky
railway link
railway run 'psql $DATABASE_URL < server/schema.sql'

# Or if that doesn't work:
cat server/schema.sql | railway run psql $DATABASE_URL
```

---

**Run the schema NOW and auth failures will stop!** 🎯

