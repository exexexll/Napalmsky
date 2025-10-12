# 🚀 Napalm Sky Deployment Guide - Squarespace Domain

**Your Domain:** napalmsky.com (purchased via Squarespace)  
**Challenge:** Squarespace cannot host Node.js backends  
**Solution:** Use Railway.app + Vercel, point Squarespace domain to them

---

## 📋 Overview

Your app has 3 parts that need hosting:

1. **Frontend** (Next.js) → Deploy to **Vercel** (free tier)
2. **Backend** (Node.js/Express/Socket.io) → Deploy to **Railway.app** ($5-10/month)
3. **Domain** (napalmsky.com) → Configure DNS in **Squarespace** to point to above

**Total Cost:** $5-10/month (Railway) + $0 (Vercel free tier)

---

## 🎯 Quick Start Timeline

- **Part 1:** Railway Backend Setup (30-45 minutes)
- **Part 2:** Vercel Frontend Setup (15-20 minutes)
- **Part 3:** Squarespace DNS Configuration (10-15 minutes)
- **Part 4:** Environment Variables & Testing (20-30 minutes)

**Total Time:** ~2 hours

---

## Part 1: Deploy Backend to Railway.app

### Why Railway?
- ✅ Easiest Node.js hosting for beginners
- ✅ Built-in PostgreSQL & Redis
- ✅ WebSocket/Socket.io support
- ✅ Free $5 credit, then ~$10/month
- ✅ Auto-deploy from GitHub
- ✅ Built-in SSL certificates

### Step 1.1: Create Railway Account

1. Go to https://railway.app
2. Click **"Start a New Project"**
3. Sign up with GitHub (recommended) or email
4. Verify your email

### Step 1.2: Create a New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Connect your GitHub account
4. If you don't have a GitHub repo yet:
   ```bash
   # In your Napalmsky directory:
   cd /Users/hansonyan/Desktop/Napalmsky
   git init
   git add .
   git commit -m "Initial commit"
   
   # Create repo on GitHub (via web interface)
   # Then:
   git remote add origin https://github.com/YOUR_USERNAME/napalmsky.git
   git push -u origin main
   ```

### Step 1.3: Deploy Backend Service

1. In Railway, select your `napalmsky` repository
2. Railway will auto-detect it's a Node.js app
3. Click **"Add variables"** and add these:

```bash
# Required Environment Variables
PORT=3001
NODE_ENV=production

# Frontend URL (we'll update this in Part 2)
ALLOWED_ORIGINS=https://napalmsky.com,https://www.napalmsky.com

# Stripe Keys (get from https://dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_live_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# Twilio TURN (optional, for better WebRTC)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
```

4. Click **"Deploy"**
5. Wait 3-5 minutes for build to complete

### Step 1.4: Get Your Railway Backend URL

1. Once deployed, click on your service
2. Go to **Settings** tab
3. Scroll to **Networking** section
4. Click **"Generate Domain"**
5. Railway will give you a URL like: `napalmsky-production.up.railway.app`
6. **Copy this URL** - you'll need it later

### Step 1.5: Add PostgreSQL Database

1. In your Railway project, click **"New"**
2. Select **"Database"**
3. Choose **"PostgreSQL"**
4. Railway will automatically create a database and set `DATABASE_URL` environment variable
5. Click on the PostgreSQL service
6. Go to **"Connect"** tab
7. Copy the **"Postgres Connection URL"**
8. It looks like: `postgresql://postgres:password@host:port/railway`

### Step 1.6: Initialize Database Schema

1. Install `psql` on your Mac (if not installed):
   ```bash
   brew install postgresql
   ```

2. Connect to your Railway database:
   ```bash
   # Use the connection URL you copied
   psql postgresql://postgres:PASSWORD@HOST:PORT/railway
   ```

3. Run your schema:
   ```bash
   # From your Napalmsky directory
   psql postgresql://YOUR_CONNECTION_URL < server/schema.sql
   ```

4. Verify tables were created:
   ```sql
   \dt  -- List all tables
   \q   -- Quit
   ```

### Step 1.7: Add Redis (Optional but Recommended)

1. In Railway project, click **"New"** → **"Database"** → **"Redis"**
2. Railway will set `REDIS_URL` automatically
3. Your backend will use this for session caching and Socket.io clustering

### Step 1.8: Configure Build Command

1. In Railway, go to your backend service **Settings**
2. Scroll to **"Build"** section
3. Set **Build Command:**
   ```bash
   cd server && npm install && npm run build
   ```
4. Set **Start Command:**
   ```bash
   cd server && npm start
   ```

5. Click **"Deploy"** to redeploy with new commands

---

## Part 2: Deploy Frontend to Vercel

### Step 2.1: Create Vercel Account

1. Go to https://vercel.com
2. Click **"Sign Up"**
3. Sign up with GitHub (recommended)

### Step 2.2: Import Your Project

1. Click **"Add New..."** → **"Project"**
2. Select your `napalmsky` repository
3. Vercel will auto-detect Next.js

### Step 2.3: Configure Environment Variables

Click **"Environment Variables"** and add:

```bash
# Backend API URL (use your Railway URL from Step 1.4)
NEXT_PUBLIC_API_BASE=https://napalmsky-production.up.railway.app

# Stripe Public Key (get from Stripe dashboard)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE
```

### Step 2.4: Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes
3. Vercel will give you a preview URL like: `napalmsky.vercel.app`
4. Test it! Click the URL and verify the landing page loads

### Step 2.5: Add Custom Domain

1. In Vercel dashboard, go to your project
2. Click **"Settings"** → **"Domains"**
3. Enter: `napalmsky.com`
4. Click **"Add"**
5. Vercel will show you DNS records to add (keep this page open)

---

## Part 3: Configure Squarespace DNS

### Step 3.1: Access Squarespace DNS Settings

1. Log into Squarespace: https://account.squarespace.com
2. Go to **Settings** → **Domains**
3. Click on **napalmsky.com**
4. Click **"DNS Settings"**

### Step 3.2: Add Vercel DNS Records (for Frontend)

Vercel gave you records in Step 2.5. Add them:

**For Root Domain (napalmsky.com):**
- Type: `A`
- Host: `@`
- Value: `76.76.21.21` (Vercel's IP)
- TTL: 3600

**For WWW subdomain:**
- Type: `CNAME`
- Host: `www`
- Value: `cname.vercel-dns.com`
- TTL: 3600

**For Domain Verification:**
- Type: `TXT`
- Host: `@`
- Value: (copy from Vercel, looks like `vc-domain-verify=...`)
- TTL: 3600

### Step 3.3: Add Railway DNS Records (for Backend API)

**For API subdomain:**
- Type: `CNAME`
- Host: `api`
- Value: `napalmsky-production.up.railway.app` (your Railway domain)
- TTL: 3600

This makes your backend accessible at: `https://api.napalmsky.com`

### Step 3.4: Wait for DNS Propagation

- DNS changes take 5 minutes to 48 hours
- Usually propagates in 15-30 minutes
- Check status: https://dnschecker.org

---

## Part 4: Update Environment Variables

### Step 4.1: Update Railway Backend

Go back to Railway → Your backend service → Variables:

Update `ALLOWED_ORIGINS`:
```bash
ALLOWED_ORIGINS=https://napalmsky.com,https://www.napalmsky.com,https://napalmsky.vercel.app
```

Click **"Deploy"** to restart with new variables.

### Step 4.2: Update Vercel Frontend

Go to Vercel → Your project → Settings → Environment Variables:

Update `NEXT_PUBLIC_API_BASE`:
```bash
# Change from Railway URL to your custom domain
NEXT_PUBLIC_API_BASE=https://api.napalmsky.com
```

Click **"Save"** then **"Redeploy"** (go to Deployments → click "..." → Redeploy)

---

## Part 5: Configure Stripe Webhooks

### Step 5.1: Add Webhook Endpoint

1. Go to Stripe Dashboard: https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Enter URL: `https://api.napalmsky.com/payment/webhook`
4. Select events:
   - `payment_intent.succeeded`
   - `checkout.session.completed`
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_...`)

### Step 5.2: Update Railway with Webhook Secret

1. Go to Railway → Backend service → Variables
2. Update `STRIPE_WEBHOOK_SECRET` with the secret you just copied
3. Click **"Deploy"**

---

## Part 6: Test Your Deployment

### Test Checklist

1. **Frontend (napalmsky.com)**
   ```
   ✅ https://napalmsky.com loads
   ✅ Landing page displays correctly
   ✅ "Get Started" button works
   ```

2. **Backend API (api.napalmsky.com)**
   ```bash
   # Test health endpoint
   curl https://api.napalmsky.com/health
   
   # Should return: {"status":"ok"}
   ```

3. **WebSocket Connection**
   - Open browser console on napalmsky.com
   - Should see: `[Socket.io] Connected to server`
   - Check for errors

4. **Full User Flow**
   ```
   ✅ Sign up (name + gender)
   ✅ Upload selfie
   ✅ Record video
   ✅ Redirected to paywall
   ✅ Stripe checkout works
   ✅ Payment success redirect
   ✅ Main dashboard loads
   ✅ Matchmaking opens
   ✅ Can see other users
   ```

5. **WebRTC Video Call**
   ```
   ✅ Two users can see each other's video
   ✅ Audio works
   ✅ Timer counts down
   ✅ Chat messages send
   ✅ Call ends properly
   ✅ History shows call log
   ```

---

## 🔧 Troubleshooting

### Issue: "Failed to connect to API"

**Check:**
1. Railway backend is running: `https://api.napalmsky.com/health`
2. CORS is configured with your domain in `ALLOWED_ORIGINS`
3. DNS has propagated: https://dnschecker.org/?query=api.napalmsky.com

**Fix:**
```bash
# In Railway, verify ALLOWED_ORIGINS includes:
ALLOWED_ORIGINS=https://napalmsky.com,https://www.napalmsky.com
```

### Issue: "WebSocket connection failed"

**Check:**
1. Railway supports WebSockets (it does by default)
2. No proxy/firewall blocking WSS connections
3. Browser console for specific error

**Fix:**
```javascript
// In lib/config.ts, verify API_BASE
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.napalmsky.com';
```

### Issue: "Stripe payment not completing"

**Check:**
1. Stripe webhook endpoint is correct: `https://api.napalmsky.com/payment/webhook`
2. Webhook secret is set in Railway
3. Using live keys (not test keys) in production

**Fix:**
- Verify webhook is receiving events in Stripe Dashboard → Webhooks → Click endpoint → View logs

### Issue: "Video/selfie uploads failing"

**Cause:** Railway ephemeral filesystem - files are lost on restart

**Solution:** You need to add S3 storage:

1. Create AWS S3 bucket (see `CLOUD-DEPLOYMENT-STRATEGY-V2.md`)
2. Add environment variables to Railway:
   ```bash
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   AWS_S3_BUCKET=napalmsky-media
   AWS_REGION=us-east-1
   ```
3. Backend will automatically use S3 (code already supports it)

### Issue: "Database connection errors"

**Check:**
1. Railway PostgreSQL is running
2. `DATABASE_URL` is set in Railway environment variables
3. Schema was initialized

**Fix:**
```bash
# Reconnect to database and check tables
psql $DATABASE_URL
\dt  # Should show 10 tables
```

### Issue: "Site loads but looks broken"

**Cause:** Static assets not loading

**Fix:**
1. In Vercel, check build logs for errors
2. Verify all files in `/public` folder were deployed
3. Check browser console for 404 errors
4. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

---

## 💰 Cost Breakdown

### Monthly Costs

| Service | Plan | Cost | Purpose |
|---------|------|------|---------|
| Railway | Hobby | $5-10 | Backend + PostgreSQL + Redis |
| Vercel | Free | $0 | Frontend hosting |
| Stripe | Pay-as-you-go | ~$0.30 per transaction | Payments |
| Twilio TURN | Pay-as-you-go | ~$0.004/min | WebRTC relay |

**Total:** ~$10-15/month for first 100 users

**Cost per user:** ~$0.10-0.15/month

### When to Upgrade

**Railway → AWS (at 500+ users):**
- Cost: $10/mo → $50+/mo
- Better: Scalability, monitoring, control

**Vercel Free → Pro (at 10K visitors/mo):**
- Cost: $0 → $20/mo
- Better: Analytics, more bandwidth

---

## 🚀 Next Steps After Deployment

### Week 1: Monitor & Fix
- [ ] Check Railway logs for errors
- [ ] Monitor Stripe dashboard for payment issues
- [ ] Test on different browsers (Chrome, Safari, Firefox)
- [ ] Test on mobile devices
- [ ] Ask friends to test signup flow

### Week 2: Optimize
- [ ] Add S3 for persistent media storage
- [ ] Enable Redis for faster session caching
- [ ] Add Sentry for error tracking
- [ ] Set up Google Analytics

### Week 3: Scale
- [ ] Add CloudFront CDN for media
- [ ] Optimize database queries
- [ ] Add database backups
- [ ] Set up monitoring alerts

### Month 2+: Growth
- [ ] Migrate to AWS for better scalability (follow `CLOUD-DEPLOYMENT-STRATEGY-V2.md`)
- [ ] Add email notifications
- [ ] Implement advanced analytics
- [ ] A/B test paywall pricing

---

## 📞 Support Resources

**Railway Issues:**
- Docs: https://docs.railway.app
- Discord: https://discord.gg/railway
- Status: https://railway.statuspage.io

**Vercel Issues:**
- Docs: https://vercel.com/docs
- Support: https://vercel.com/support
- Status: https://www.vercel-status.com

**Squarespace DNS:**
- Help: https://support.squarespace.com/hc/en-us/articles/205812378
- Contact: https://support.squarespace.com/hc/en-us/requests/new

**Stripe:**
- Dashboard: https://dashboard.stripe.com
- Docs: https://stripe.com/docs
- Support: https://support.stripe.com

---

## ✅ Deployment Checklist

### Before Going Live

- [ ] All environment variables set (Railway + Vercel)
- [ ] Database schema initialized
- [ ] DNS records added in Squarespace
- [ ] SSL certificates active (Railway + Vercel auto-provide)
- [ ] Stripe webhook configured
- [ ] Test payment ($0.01) completes successfully
- [ ] QR code generation works
- [ ] Video call connects between two users
- [ ] Mobile testing completed
- [ ] Error tracking set up (optional: Sentry)

### Launch Day

- [ ] Final test of entire user flow
- [ ] Share link with 5 friends for beta test
- [ ] Monitor Railway logs for errors
- [ ] Check Stripe dashboard for payments
- [ ] Post on social media
- [ ] Celebrate! 🎉

---

## 🎓 Alternative Hosting Options

If Railway doesn't work for you:

### Option 2: Render.com
- Similar to Railway
- Free tier available (slower)
- Good alternative
- Tutorial: https://render.com/docs/deploy-node-express-app

### Option 3: Heroku
- $7/month for hobby tier
- More established than Railway
- Good documentation
- Tutorial: https://devcenter.heroku.com/articles/deploying-nodejs

### Option 4: DigitalOcean App Platform
- $12/month minimum
- More control than Railway
- Tutorial: https://docs.digitalocean.com/products/app-platform/how-to/deploy-from-github/

### Option 5: AWS (Full Production)
- $50-100+/month
- Best for scaling to 1,000+ users
- Follow your existing guide: `CLOUD-DEPLOYMENT-STRATEGY-V2.md`

---

## 🔐 Security Checklist (Before Launch)

- [ ] Change all default passwords
- [ ] Use live Stripe keys (not test keys)
- [ ] Never commit `.env` files to Git
- [ ] Enable 2FA on Railway, Vercel, Stripe
- [ ] Set up database backups (Railway auto-backs up)
- [ ] Review CORS settings (only allow your domain)
- [ ] Test rate limiting (try 10 failed logins)
- [ ] Verify HTTPS is enforced (no HTTP access)

---

*Good luck with your deployment! 🚀*

*If you run into issues, check the troubleshooting section or review your existing deployment docs (`CLOUD-DEPLOYMENT-STRATEGY-V2.md`) for AWS migration when you're ready to scale.*

