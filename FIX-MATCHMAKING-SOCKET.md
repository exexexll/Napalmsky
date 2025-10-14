# Fix Matchmaking Socket Authentication

## 🔍 Problem Identified

Your logs show:
- ✅ Payment works (connected to Railway)
- ❌ Socket authentication fails
- ❌ Matchmaking shows 0 users

**Root Cause:** Frontend is connecting to Railway for API calls but trying to use localhost for socket connections (or vice versa).

---

## ✅ Solution: Sync Environment Variables

### Option 1: Fix Vercel Deployment (Recommended for Production)

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Select your Napalmsky project

2. **Go to Settings → Environment Variables**

3. **Add/Update these variables:**
   ```env
   NEXT_PUBLIC_API_BASE=https://napalmsky-production.up.railway.app
   NEXT_PUBLIC_SOCKET_URL=https://napalmsky-production.up.railway.app
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SHYeECLjhKpSECUaXRBLM81BTxurmaEs7oBEIWV5D7s8oFTfpRaNEpQca6VBoE3vJM8OC5i7Db8rZwFb1DL0u3L00XE01cdaQ
   ```

4. **Redeploy:**
   - Go to Deployments tab
   - Click "Redeploy" on latest deployment
   - Wait ~2 minutes

5. **Test:**
   - Go to your Vercel URL
   - Open browser console (F12)
   - Should see: `[Socket] Authenticated`

---

### Option 2: Fix Local Development (Recommended for Testing)

1. **Update .env.local:**

```bash
cat > .env.local << 'EOF'
# Frontend Environment Variables (Local Development)
NEXT_PUBLIC_API_BASE=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SHYeECLjhKpSECUaXRBLM81BTxurmaEs7oBEIWV5D7s8oFTfpRaNEpQca6VBoE3vJM8OC5i7Db8rZwFb1DL0u3L00XE01cdaQ
EOF
```

2. **Restart Frontend:**

```bash
# Kill current Next.js dev server
pkill -f "next dev"

# Start fresh
npm run dev
```

3. **Make sure backend is running:**

```bash
cd server
npm run dev
```

4. **Test:**
   - Go to http://localhost:3000
   - Navigate to matchmaking
   - Should see users appear

---

## 🔍 Verify Which Environment You're Using

Run this to check:

```bash
#!/bin/bash
echo "=== Environment Check ==="
echo ""
echo "Frontend URL in browser:"
echo "  • localhost:3000 → Using local development"
echo "  • *.vercel.app → Using Vercel production"
echo ""
echo "Current .env.local settings:"
cat .env.local
echo ""
echo "Is local backend running?"
ps aux | grep "tsx.*server" | grep -v grep && echo "✅ Yes" || echo "❌ No"
```

---

## 🐛 Debugging Socket Issues

### Check 1: Is Socket Connecting?

Look for in console:
```
✅ [Socket] Connected: 2qaRyhiO6sXJt9C3AAAb
❌ [Socket] Authentication failed
```

### Check 2: Session Token Valid?

Open browser console and run:
```javascript
// Check if session exists
const session = JSON.parse(localStorage.getItem('napalmsky_session'));
console.log('Session:', session);

// Should show:
// { userId: "xxx", sessionToken: "xxx", accountType: "paid" }
```

### Check 3: CORS Issues?

If socket can't connect at all:

1. **Check Railway ALLOWED_ORIGINS:**
   - Railway Dashboard → Variables
   - Should include your Vercel URL:
   ```
   ALLOWED_ORIGINS=https://your-app.vercel.app,https://napalmsky.com
   ```

2. **Redeploy Railway** after changing

---

## 🎯 Expected Working Flow

### Successful Socket Connection:
```
[Socket] Connected: 2qaRyhiO6sXJt9C3AAAb
[Socket] Authenticated
[Matchmake] Socket authenticated, now joining presence and queue
[Matchmake] Loading initial queue...
[Matchmake] 🔍 Users array changed - now has: 3 users
```

### Failed Socket Connection:
```
[Socket] Connected: 2qaRyhiO6sXJt9C3AAAb
[Socket] Authentication failed  ← Problem here
[Matchmake] Session found: Object
[Matchmake] 🔍 Users array changed - now has: 0 users
```

---

## 🚨 Common Issues

### Issue: Session from localhost, trying Railway

**Symptoms:**
- Created account on localhost:3000
- Testing on Vercel deployment
- Socket auth fails

**Fix:** Create a new account on Vercel deployment

### Issue: Missing NEXT_PUBLIC_SOCKET_URL

**Symptoms:**
- Socket connects to wrong server
- Mixed localhost/production connections

**Fix:** Set `NEXT_PUBLIC_SOCKET_URL` in Vercel

### Issue: Railway CORS blocking Vercel

**Symptoms:**
- Socket connection rejected immediately
- CORS errors in console

**Fix:** Add Vercel URL to Railway's `ALLOWED_ORIGINS`

---

## ✅ Final Verification

After fix, you should see:

1. **Browser Console:**
   ```
   [Socket] Connected: xxxxx
   [Socket] Authenticated ← Success!
   [Matchmake] Loading initial queue...
   [Matchmake] 🔍 Users array changed - now has: X users
   ```

2. **Matchmaking UI:**
   - Users appear in the queue
   - Can click to match
   - Video calls work

3. **No Errors:**
   - No `[Socket] Authentication failed`
   - No CORS errors
   - No connection timeouts

---

## 🔧 Quick Test Script

```bash
#!/bin/bash
echo "=== Socket Authentication Test ==="
echo ""

# Test Railway health
echo "1. Testing Railway backend..."
curl -s https://napalmsky-production.up.railway.app/health && echo " ✅" || echo " ❌"

# Test local backend
echo "2. Testing local backend..."
curl -s http://localhost:3001/health && echo " ✅" || echo " ❌"

# Check environment
echo ""
echo "3. Frontend environment:"
echo "   API_BASE: $(grep NEXT_PUBLIC_API_BASE .env.local | cut -d= -f2)"
echo "   SOCKET_URL: $(grep NEXT_PUBLIC_SOCKET_URL .env.local | cut -d= -f2)"

echo ""
echo "👉 Make sure API_BASE and SOCKET_URL point to the SAME backend!"
```

Save as `test-socket.sh`, run with `chmod +x test-socket.sh && ./test-socket.sh`

---

## 🎯 Recommended Setup

### For Local Development:
```env
# .env.local
NEXT_PUBLIC_API_BASE=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### For Vercel Production:
```env
# Vercel Environment Variables
NEXT_PUBLIC_API_BASE=https://napalmsky-production.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://napalmsky-production.up.railway.app
```

### For Railway Backend:
```env
# Railway Variables
ALLOWED_ORIGINS=http://localhost:3000,https://your-app.vercel.app
PORT=3001
NODE_ENV=production
```

---

That's it! Once environment variables are synced, socket authentication will work. 🚀

