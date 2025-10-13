# 🗄️ Railway Database Setup Guide

**Complete guide for PostgreSQL & Redis integration**

---

## 📋 **Overview**

You'll add two databases to your Railway project:

1. **PostgreSQL** - Persistent data storage (users, sessions, history)
2. **Redis** - Fast caching (sessions, presence, queue)

**Total Time:** 15-20 minutes  
**Cost:** Included in Railway's $5-10/month plan

---

## 🐘 **Part 1: Add PostgreSQL** (10 minutes)

### **Step 1: Add PostgreSQL Service**

1. Go to your **Railway project dashboard**
2. Click the **"+ New"** button (top right)
3. Select **"Database"**
4. Click **"PostgreSQL"**
5. Railway will create the database (takes 30-60 seconds)

You'll see a new card appear: **"PostgreSQL"**

### **Step 2: Verify DATABASE_URL is Set**

Railway automatically creates an environment variable:

1. Click on your **backend service** (Napalmsky)
2. Go to **"Variables"** tab
3. You should see: `DATABASE_URL` (auto-configured by Railway ✅)

**Value looks like:**
```
postgresql://postgres:PASSWORD@postgres.railway.internal:5432/railway
```

**If it's there** = Railway linked it automatically! ✅

**If it's NOT there:**
1. Click "+ New Variable"
2. Reference Variable → Select PostgreSQL → DATABASE_URL
3. Save

### **Step 3: Get External Connection URL**

To initialize the database schema from your Mac:

1. Click on the **PostgreSQL service** (the database card)
2. Go to **"Connect"** tab
3. Look for **"Postgres Connection URL"** or **"TCP Proxy"**
4. **Copy the PUBLIC/EXTERNAL URL** (has a port like :6543 or similar)

**It looks like:**
```
postgresql://postgres:PASSWORD@containers-us-west-37.railway.app:6543/railway
```

**Paste that URL here when you have it!**

### **Step 4: Initialize Database Schema**

Once you have the external URL, run on your Mac:

```bash
# Make sure PostgreSQL is in your PATH
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"

# Initialize the database (replace with your actual URL)
psql "postgresql://postgres:PASSWORD@containers-us-west-XX.railway.app:XXXX/railway" < /Users/hansonyan/Desktop/Napalmsky/server/schema.sql
```

**Expected output:**
```
CREATE TABLE
CREATE INDEX
CREATE TABLE
CREATE INDEX
...
✅ Schema initialized successfully!
```

This creates all 10 tables:
- users
- sessions  
- chat_history
- cooldowns
- invite_codes
- reports
- ban_records
- ip_bans
- referral_notifications
- audit_log

### **Step 5: Verify Tables Were Created**

```bash
# Connect to database
psql "YOUR_EXTERNAL_URL"

# List all tables
\dt

# Should show 10 tables
# Quit
\q
```

---

## 🔴 **Part 2: Add Redis** (5 minutes)

### **Step 1: Add Redis Service**

1. Back in Railway project dashboard
2. Click **"+ New"** again
3. Select **"Database"**
4. Click **"Redis"**
5. Railway will create Redis (takes 15-30 seconds)

You'll see a new card: **"Redis"**

### **Step 2: Verify REDIS_URL is Set**

1. Click on your **backend service**
2. Go to **"Variables"** tab
3. Should see: `REDIS_URL` (auto-configured ✅)

**Value looks like:**
```
redis://default:PASSWORD@redis.railway.internal:6379
```

**If not there:**
1. Click "+ New Variable"
2. Reference Variable → Select Redis → REDIS_URL
3. Save

### **Step 3: Redis Will Auto-Connect**

Your backend code already supports Redis!

When `REDIS_URL` is set, your backend will:
- ✅ Use Redis for session caching
- ✅ Use Redis for Socket.io clustering
- ✅ Use Redis for presence tracking

**No code changes needed!** ✅

---

## ✅ **Verification Checklist**

### **PostgreSQL:**
- [ ] PostgreSQL service added in Railway
- [ ] DATABASE_URL appears in backend variables
- [ ] External URL obtained
- [ ] Schema.sql initialized successfully
- [ ] 10 tables created (\dt command shows them)

### **Redis:**
- [ ] Redis service added in Railway
- [ ] REDIS_URL appears in backend variables
- [ ] Backend will auto-connect on next deploy

---

## 🔄 **Redeploy Backend**

After adding databases:

1. Railway → Backend service → **"Deployments"** tab
2. Click **"Redeploy"** (or push new code to GitHub)
3. Watch logs for:
   ```
   ✅ Connected to PostgreSQL
   ✅ Connected to Redis  
   ✅ Server running on port 3001
   ```

---

## 🧪 **Test Database Connection**

### **Test PostgreSQL:**

Visit your backend and create a user:
```bash
curl -X POST https://YOUR-RAILWAY-URL.up.railway.app/auth/guest \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","gender":"male"}'
```

Then check database:
```sql
psql "YOUR_EXTERNAL_URL"
SELECT * FROM users;
-- Should show the test user!
```

### **Test Redis:**

Redis will be used automatically for:
- Session caching (faster lookups)
- Socket.io clustering (multiple servers)
- Presence tracking (who's online)

Check Redis dashboard in Railway to see activity!

---

## 💰 **Cost Breakdown**

| Service | Storage | Cost |
|---------|---------|------|
| PostgreSQL | 1GB free | $0/month |
| PostgreSQL | 1-5GB | $0.25/GB/month |
| Redis | 1GB free | $0/month |
| Redis | 1-5GB | $0.20/GB/month |

**For 100 users:** ~0.5GB PostgreSQL + 0.1GB Redis = $0.125/month

**Very affordable!** ✅

---

## 🔍 **Monitoring**

### **PostgreSQL Dashboard (Railway):**
- Storage used
- Connection count
- Query performance
- Backup status

### **Redis Dashboard (Railway):**
- Memory used
- Commands/second
- Hit rate
- Connected clients

---

## 🛠️ **Management**

### **Database Backups:**

Railway automatically backs up PostgreSQL:
- Daily automated backups
- 7-day retention
- One-click restore

**Manual backup:**
```bash
pg_dump "YOUR_EXTERNAL_URL" > backup_$(date +%Y%m%d).sql
```

### **Redis Snapshots:**

Railway automatically snapshots Redis:
- Hourly snapshots
- 7-day retention

---

## 📝 **Next Steps After Setup**

1. **Initialize PostgreSQL schema** (see Step 4 above)
2. **Verify both databases connected**
3. **Redeploy backend**
4. **Test user signup** (should save to PostgreSQL)
5. **Check Railway dashboards** (see activity)

---

## 🎯 **Ready to Add Databases?**

**Follow these steps in order:**

1. ✅ **Add PostgreSQL** (Part 1 above)
2. ✅ **Get external URL** and paste it here
3. ✅ **I'll initialize the schema** for you
4. ✅ **Add Redis** (Part 2 above)
5. ✅ **Redeploy backend**
6. ✅ **Test everything works!**

---

**Let me know when you've added PostgreSQL and have the external connection URL!** 🚀

