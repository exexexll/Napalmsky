# ⚡ Quick Deploy Checklist - napalmsky.com

**Total Time: ~2 hours** | **Cost: $5-10/month**

---

## 📝 Pre-Deployment Prep (5 minutes)

- [ ] Have GitHub account ready
- [ ] Have credit card for Railway ($5/month)
- [ ] Get Stripe API keys: https://dashboard.stripe.com/apikeys
- [ ] Access Squarespace DNS: https://account.squarespace.com

---

## 🚂 Part 1: Railway Backend (45 min)

### 1.1 Push to GitHub (if not already done)
```bash
cd /Users/hansonyan/Desktop/Napalmsky
git init
git add .
git commit -m "Initial commit"
# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/napalmsky.git
git push -u origin main
```

### 1.2 Deploy to Railway
1. ✅ Go to https://railway.app
2. ✅ Sign up with GitHub
3. ✅ New Project → Deploy from GitHub → Select napalmsky
4. ✅ Add environment variables (see below)
5. ✅ Wait for deploy (3-5 min)
6. ✅ Generate domain in Settings → Networking
7. ✅ Copy URL: `_____________________.up.railway.app`

### 1.3 Environment Variables for Railway
```bash
PORT=3001
NODE_ENV=production
ALLOWED_ORIGINS=https://napalmsky.com,https://www.napalmsky.com
STRIPE_SECRET_KEY=sk_live_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_KEY
```

### 1.4 Add PostgreSQL
1. ✅ Railway → New → Database → PostgreSQL
2. ✅ Copy connection URL from Connect tab
3. ✅ Run on your Mac:
   ```bash
   brew install postgresql
   psql postgresql://YOUR_URL < server/schema.sql
   ```

### 1.5 Add Redis (optional)
1. ✅ Railway → New → Database → Redis
2. ✅ Auto-configures REDIS_URL

---

## ▲ Part 2: Vercel Frontend (20 min)

### 2.1 Deploy to Vercel
1. ✅ Go to https://vercel.com
2. ✅ Sign up with GitHub
3. ✅ New Project → Import napalmsky repo
4. ✅ Add environment variables (see below)
5. ✅ Deploy (2-3 min)
6. ✅ Copy preview URL: `napalmsky.vercel.app`

### 2.2 Environment Variables for Vercel
```bash
NEXT_PUBLIC_API_BASE=https://YOUR_RAILWAY_URL.up.railway.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY
```

### 2.3 Test Preview Site
1. ✅ Visit `napalmsky.vercel.app`
2. ✅ Landing page loads
3. ✅ Click "Get Started"
4. ✅ Onboarding works

---

## 🌐 Part 3: Squarespace DNS (15 min)

### 3.1 Add DNS Records
1. ✅ Login to Squarespace: https://account.squarespace.com
2. ✅ Settings → Domains → napalmsky.com → DNS Settings
3. ✅ Add these records:

**Record 1: Root Domain**
- Type: `A`
- Host: `@`
- Value: `76.76.21.21` (Vercel IP)
- TTL: `3600`

**Record 2: WWW Subdomain**
- Type: `CNAME`
- Host: `www`
- Value: `cname.vercel-dns.com`
- TTL: `3600`

**Record 3: API Subdomain**
- Type: `CNAME`
- Host: `api`
- Value: `YOUR_RAILWAY_URL.up.railway.app`
- TTL: `3600`

**Record 4: Domain Verification (get from Vercel)**
- Type: `TXT`
- Host: `@`
- Value: `vc-domain-verify=...` (copy from Vercel)
- TTL: `3600`

### 3.2 Connect Domain in Vercel
1. ✅ Vercel → Project → Settings → Domains
2. ✅ Add: `napalmsky.com`
3. ✅ Add: `www.napalmsky.com`
4. ✅ Wait 15-30 min for DNS propagation

---

## 🔄 Part 4: Update URLs (10 min)

### 4.1 Update Railway Variables
1. ✅ Railway → Variables → Update:
   ```bash
   ALLOWED_ORIGINS=https://napalmsky.com,https://www.napalmsky.com
   ```
2. ✅ Redeploy

### 4.2 Update Vercel Variables
1. ✅ Vercel → Settings → Environment Variables → Update:
   ```bash
   NEXT_PUBLIC_API_BASE=https://api.napalmsky.com
   ```
2. ✅ Deployments → Redeploy

---

## 💳 Part 5: Stripe Webhook (5 min)

1. ✅ Go to https://dashboard.stripe.com/webhooks
2. ✅ Add endpoint: `https://api.napalmsky.com/payment/webhook`
3. ✅ Select events: `payment_intent.succeeded`, `checkout.session.completed`
4. ✅ Copy signing secret (starts with `whsec_`)
5. ✅ Railway → Variables → Update `STRIPE_WEBHOOK_SECRET`
6. ✅ Redeploy

---

## ✅ Part 6: Test Everything (15 min)

### Backend Health Check
```bash
curl https://api.napalmsky.com/health
# Should return: {"status":"ok"}
```

### Full User Flow
1. ✅ Visit https://napalmsky.com
2. ✅ Click "Get Started"
3. ✅ Enter name + gender
4. ✅ Take selfie
5. ✅ Record video
6. ✅ Get redirected to paywall
7. ✅ Click "Pay $0.01"
8. ✅ Complete Stripe checkout (use test card: 4242 4242 4242 4242)
9. ✅ Get redirected back
10. ✅ See QR code generated
11. ✅ Main dashboard loads
12. ✅ Click "Matchmake"
13. ✅ See available users

### Two-User Video Call Test
1. ✅ Open napalmsky.com in Chrome (User A)
2. ✅ Open napalmsky.com in Safari Private (User B)
3. ✅ Both sign up and pay
4. ✅ User A: Matchmaking → See User B → Click timer → Talk
5. ✅ User B: Accept incoming call
6. ✅ Both redirected to video room
7. ✅ Video/audio works
8. ✅ Timer counts down
9. ✅ Chat messages work
10. ✅ Call ends → History shows log

---

## 🐛 Troubleshooting

### "Can't connect to API"
```bash
# Check DNS propagated:
nslookup api.napalmsky.com
# Should show Railway IP

# Check backend is up:
curl https://api.napalmsky.com/health
```

### "WebSocket connection failed"
- Check browser console for specific error
- Verify Railway service is running
- Check CORS settings include your domain

### "Stripe payment not working"
- Verify webhook endpoint in Stripe dashboard
- Check webhook secret matches Railway variable
- Look at Stripe webhook logs for errors

### "Uploads not persisting"
- Railway has ephemeral filesystem
- Add S3 storage (see full guide)
- For testing: uploads work until container restarts

---

## 📊 Your URLs After Deployment

| Service | URL | Purpose |
|---------|-----|---------|
| **Main Site** | https://napalmsky.com | Landing page, app |
| **WWW** | https://www.napalmsky.com | Auto-redirects to main |
| **API** | https://api.napalmsky.com | Backend server |
| **Railway** | Your Railway URL | Backup API access |
| **Vercel Preview** | napalmsky.vercel.app | Staging/testing |

---

## 🎉 You're Live!

**What you just deployed:**
- ✅ Full-stack video dating platform
- ✅ Real-time WebSocket connections
- ✅ WebRTC video calls
- ✅ Stripe payments ($0.01 paywall)
- ✅ QR code invite system
- ✅ PostgreSQL database
- ✅ Redis caching
- ✅ SSL/HTTPS everywhere
- ✅ Custom domain

**Next steps:**
- Share with friends for beta testing
- Monitor Railway logs for errors
- Set up analytics (Google Analytics)
- Add error tracking (Sentry - optional)

**When to scale:**
- **500+ users:** Add S3 for media storage
- **1,000+ users:** Add CloudFront CDN
- **5,000+ users:** Migrate to AWS (see `CLOUD-DEPLOYMENT-STRATEGY-V2.md`)

---

## 💰 Monthly Costs

- Railway: $5-10
- Vercel: $0 (free tier)
- Stripe: $0.30 per transaction
- Twilio TURN: ~$0.004/minute

**Total: ~$10/month for first 100 users**

---

## 📚 Full Documentation

- **Complete guide:** `SQUARESPACE-DEPLOYMENT-GUIDE.md`
- **AWS migration:** `CLOUD-DEPLOYMENT-STRATEGY-V2.md`
- **Security:** `SECURITY-HARDENING.md`
- **Testing:** `TESTING-GUIDE.md`

---

**Questions?** Check `SQUARESPACE-DEPLOYMENT-GUIDE.md` for detailed troubleshooting.

**Good luck! 🚀**

