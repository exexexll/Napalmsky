# 🏗️ Deployment Architecture - napalmsky.com

**Visual guide to your deployment setup**

---

## 🌐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         YOUR USERS                              │
│                    (anywhere in the world)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    Browser visits:
                    napalmsky.com
                             │
                             ▼
┌────────────────────────────────────────────────────────────────┐
│                   SQUARESPACE DNS                              │
│                   (napalmsky.com)                              │
│                                                                │
│  Records:                                                      │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ napalmsky.com → 76.76.21.21 (Vercel)              │     │
│  │ www.napalmsky.com → cname.vercel-dns.com          │     │
│  │ api.napalmsky.com → railway.app (Backend)          │     │
│  └─────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            │                                 │
            ▼                                 ▼
┌──────────────────────┐          ┌──────────────────────┐
│   VERCEL FRONTEND    │          │  RAILWAY BACKEND     │
│   (napalmsky.com)    │◄────────►│  (api.napalmsky.com) │
│                      │   API    │                      │
│  • Next.js 14       │   Calls  │  • Node.js/Express  │
│  • React            │          │  • Socket.io        │
│  • TailwindCSS      │          │  • WebRTC signaling │
│  • Static assets    │          │  • REST API         │
│  • Server-side      │          │                      │
│    rendering        │          │  Services:           │
│                      │          │  ├─ PostgreSQL DB   │
│  Cost: FREE         │          │  └─ Redis Cache     │
│                      │          │                      │
└──────────────────────┘          │  Cost: $5-10/month  │
                                  └──────────────────────┘
                                            │
                           ┌────────────────┼────────────────┐
                           │                │                │
                           ▼                ▼                ▼
                  ┌──────────────┐ ┌──────────────┐ ┌─────────────┐
                  │  PostgreSQL  │ │    Redis     │ │   Stripe    │
                  │   Database   │ │    Cache     │ │  Payments   │
                  │              │ │              │ │             │
                  │ • Users      │ │ • Sessions  │ │ • $0.01     │
                  │ • Sessions   │ │ • Presence  │ │   checkout  │
                  │ • History    │ │ • Queue     │ │ • Webhooks  │
                  │ • Cooldowns  │ │             │ │             │
                  │              │ │             │ │             │
                  │ Included in  │ │ Included in │ │ Pay per use │
                  │ Railway      │ │ Railway     │ │             │
                  └──────────────┘ └──────────────┘ └─────────────┘
```

---

## 🔄 Data Flow Examples

### Example 1: User Visits Site

```
1. User types: napalmsky.com
   │
   ▼
2. DNS lookup (Squarespace)
   • napalmsky.com → 76.76.21.21
   │
   ▼
3. Request reaches Vercel
   • Vercel serves Next.js app
   • Landing page HTML returned
   │
   ▼
4. Browser loads page
   • Displays hero section
   • Shows "Get Started" button
```

### Example 2: User Signs Up

```
1. User clicks "Get Started"
   │
   ▼
2. Frontend (Vercel)
   • Renders onboarding form
   • Collects name + gender
   │
   ▼
3. API Call to Backend (Railway)
   POST https://api.napalmsky.com/auth/guest
   {name: "John", gender: "male"}
   │
   ▼
4. Backend processes:
   • Validates input
   • Creates user in PostgreSQL
   • Generates session token
   • Stores in Redis cache
   │
   ▼
5. Response to Frontend
   {sessionToken: "abc123", userId: "xyz789"}
   │
   ▼
6. Frontend stores in localStorage
   • Redirects to selfie step
```

### Example 3: Payment Flow

```
1. User clicks "Pay $0.01"
   │
   ▼
2. Frontend → Backend
   POST https://api.napalmsky.com/payment/create-checkout
   │
   ▼
3. Backend → Stripe API
   • Creates checkout session
   • Returns Stripe URL
   │
   ▼
4. Frontend redirects to Stripe
   • User enters card: 4242 4242 4242 4242
   • Stripe processes payment
   │
   ▼
5. Stripe → Backend Webhook
   POST https://api.napalmsky.com/payment/webhook
   {payment_intent.succeeded}
   │
   ▼
6. Backend updates database
   • User.paidStatus = 'paid'
   • Generates QR code (4 uses)
   │
   ▼
7. Stripe redirects to success page
   https://napalmsky.com/payment-success?session_id=...
   │
   ▼
8. Frontend displays QR code
   • "You can invite 4 friends!"
```

### Example 4: Video Call

```
1. User A opens matchmaking
   │
   ▼
2. Frontend → Backend
   GET https://api.napalmsky.com/room/queue
   │
   ▼
3. Backend queries database
   • Exclude cooldowns (PostgreSQL)
   • Filter banned users
   • Return available users
   │
   ▼
4. User A sees User B's card
   • Clicks "Talk to them"
   │
   ▼
5. Socket.io Real-time (WebSocket)
   Client A ──[call:invite]──> Backend
   Backend ──[call:notify]──> Client B
   │
   ▼
6. User B accepts
   Client B ──[call:accept]──> Backend
   Backend ──[call:start]──> Both clients
   │
   ▼
7. WebRTC Peer-to-Peer Setup
   Client A ──[rtc:offer]──> Backend ──> Client B
   Client B ──[rtc:answer]──> Backend ──> Client A
   Client A ←─[ICE candidates]─→ Client B
   │
   ▼
8. Direct P2P Video Connection
   Client A ←──────────────────→ Client B
   (Video/audio flows directly, not through server!)
   │
   ▼
9. Call ends after timer
   Both ──[call:end]──> Backend
   Backend saves to PostgreSQL:
   • chat_history table
   • cooldowns table (24h)
```

---

## 🔌 Connection Points

### Frontend → Backend Communication

| Type | Protocol | Example | Purpose |
|------|----------|---------|---------|
| **REST API** | HTTPS | `POST /auth/guest` | User actions |
| **WebSocket** | WSS | Socket.io events | Real-time updates |
| **WebRTC** | P2P | Video/audio | Peer-to-peer media |

### Backend → Database

| Database | Protocol | Purpose | Location |
|----------|----------|---------|----------|
| PostgreSQL | TCP | Persistent data | Railway |
| Redis | TCP | Fast cache | Railway |

### Backend → External Services

| Service | Purpose | Cost |
|---------|---------|------|
| Stripe | Payments | $0.30/transaction |
| Twilio | TURN server (WebRTC) | $0.004/minute |

---

## 🌍 Geographic Distribution

```
┌──────────────────────────────────────────────────────────┐
│                    GLOBAL COVERAGE                       │
└──────────────────────────────────────────────────────────┘

  🌎 North America           🌍 Europe           🌏 Asia
  ┌──────────────┐          ┌──────────────┐   ┌──────────────┐
  │   Vercel     │          │   Vercel     │   │   Vercel     │
  │   Edge CDN   │          │   Edge CDN   │   │   Edge CDN   │
  │              │          │              │   │              │
  │ (Frontend)   │          │ (Frontend)   │   │ (Frontend)   │
  └──────────────┘          └──────────────┘   └──────────────┘
         │                         │                   │
         └─────────────────────────┼───────────────────┘
                                   │
                                   ▼
                        ┌──────────────────┐
                        │   Railway        │
                        │   US-East-1      │
                        │                  │
                        │   (Backend)      │
                        │   + Database     │
                        └──────────────────┘

Frontend: Distributed globally (Vercel Edge)
Backend: Single region (Railway - expandable later)
```

**Latency:**
- Frontend: <50ms globally (Vercel CDN)
- Backend API: 50-200ms (single region)
- WebRTC Video: <100ms (peer-to-peer)

---

## 📦 Deployment Pipeline

### Automatic Deployment (when you push to GitHub)

```
┌────────────────────────────────────────────────────────┐
│  1. Developer (You)                                    │
│     └─> git push origin main                          │
└───────────────────────┬────────────────────────────────┘
                        │
                        ├─────────────────┬──────────────┐
                        ▼                 ▼              ▼
            ┌──────────────────┐  ┌─────────────┐  ┌────────────┐
            │  GitHub Repo     │  │   Vercel    │  │  Railway   │
            │                  │  │   watches   │  │  watches   │
            │  • main branch   │  │   repo      │  │  repo      │
            └──────────────────┘  └──────┬──────┘  └─────┬──────┘
                                         │               │
                        ┌────────────────┘               │
                        ▼                                ▼
            ┌──────────────────────┐       ┌──────────────────────┐
            │  2. Build Frontend   │       │  2. Build Backend    │
            │     npm run build    │       │     cd server        │
            │     Next.js compile  │       │     npm install      │
            │                      │       │     npm run build    │
            └──────────┬───────────┘       └──────────┬───────────┘
                       │                              │
                       ▼                              ▼
            ┌──────────────────────┐       ┌──────────────────────┐
            │  3. Deploy           │       │  3. Deploy           │
            │     Edge CDN         │       │     Docker Container │
            │     (Global)         │       │     (US-East-1)      │
            └──────────┬───────────┘       └──────────┬───────────┘
                       │                              │
                       └──────────────┬───────────────┘
                                      ▼
                          ┌───────────────────────┐
                          │  4. Live! 🎉         │
                          │     napalmsky.com     │
                          └───────────────────────┘
```

**Deploy time:**
- Vercel: 2-3 minutes
- Railway: 3-5 minutes
- Total: ~5 minutes from push to live

---

## 🔐 Security Layers

```
┌────────────────────────────────────────────────────────────┐
│  Layer 1: Transport Security                               │
│  • HTTPS/TLS 1.3 (Vercel + Railway auto-provide)         │
│  • WebSocket Secure (WSS)                                  │
└────────────────────────────────────────────────────────────┘
                              │
┌────────────────────────────────────────────────────────────┐
│  Layer 2: Application Security                             │
│  • CORS (only napalmsky.com allowed)                      │
│  • Rate limiting (5 requests/15min auth)                  │
│  • bcrypt password hashing (cost 12)                      │
│  • Session tokens (UUID v4, 7-30 day expiry)             │
└────────────────────────────────────────────────────────────┘
                              │
┌────────────────────────────────────────────────────────────┐
│  Layer 3: Data Security                                    │
│  • PostgreSQL encryption at rest (Railway default)         │
│  • Redis encryption in transit (Railway default)           │
│  • SQL injection prevention (parameterized queries)        │
└────────────────────────────────────────────────────────────┘
                              │
┌────────────────────────────────────────────────────────────┐
│  Layer 4: Payment Security                                 │
│  • Stripe PCI compliance (handles all card data)          │
│  • Webhook signature verification                          │
│  • No card data touches your server                        │
└────────────────────────────────────────────────────────────┘
```

---

## 💰 Cost Scaling Path

### Your Current Setup (Railway + Vercel)

```
Users        | Monthly Cost | Per User | Notes
-------------|--------------|----------|------------------
0-100        | $10          | $0.10    | Current setup ✅
100-500      | $15          | $0.03    | Add Redis premium
500-1,000    | $25          | $0.025   | Upgrade Railway plan
1,000-5,000  | $50-100      | $0.02    | Consider AWS migration
5,000+       | $200+        | $0.04    | Full AWS (see guide)
```

### When to Migrate to AWS

**Stick with Railway if:**
- ✅ < 1,000 users
- ✅ < $50/month is acceptable
- ✅ Simple management preferred
- ✅ Limited tech team

**Migrate to AWS if:**
- ❌ > 1,000 concurrent users
- ❌ Need multi-region deployment
- ❌ Need advanced monitoring
- ❌ Cost optimization critical (saves ~40%)

---

## 🔄 Upgrade Path

### Today: Railway + Vercel
```
Frontend: Vercel Free ($0)
Backend: Railway Hobby ($10)
Total: $10/month
```

### Month 3: Railway Pro + S3
```
Frontend: Vercel Free ($0)
Backend: Railway Pro ($20)
Storage: AWS S3 ($5)
Total: $25/month
```

### Month 6: Full AWS (1,000+ users)
```
Frontend: Vercel Pro ($20)
Backend: AWS ECS ($120)
Database: AWS RDS ($80)
Cache: AWS ElastiCache ($50)
Storage: AWS S3 + CloudFront ($15)
Total: $285/month
Follow: CLOUD-DEPLOYMENT-STRATEGY-V2.md
```

---

## 🛠️ Management Dashboards

### Where to Monitor Everything

| Service | Dashboard URL | What to Check |
|---------|--------------|---------------|
| **Railway** | railway.app/project/[id] | CPU, memory, logs, deploys |
| **Vercel** | vercel.com/[username] | Build status, analytics, domains |
| **Squarespace** | account.squarespace.com | DNS records, domain renewal |
| **Stripe** | dashboard.stripe.com | Payments, webhooks, customers |
| **PostgreSQL** | Railway → Database tab | Queries, storage, connections |

---

## 📊 Monitoring Checklist

### Daily (First Week)
- [ ] Check Railway logs for errors
- [ ] Verify payments in Stripe dashboard
- [ ] Test video calls work
- [ ] Check DNS still resolves correctly

### Weekly
- [ ] Review Stripe transaction logs
- [ ] Check database size (PostgreSQL)
- [ ] Monitor Railway usage/costs
- [ ] Test full signup flow

### Monthly
- [ ] Review total costs
- [ ] Check for security updates
- [ ] Update dependencies
- [ ] Database backup verification

---

## 🚀 Go Live Checklist

Before announcing to the world:

- [ ] All DNS records propagated (15-30 min)
- [ ] HTTPS works (no browser warnings)
- [ ] Test payment completes ($0.01)
- [ ] QR code generates after payment
- [ ] Video call works between 2 users
- [ ] Chat messages send
- [ ] Call history logs correctly
- [ ] Mobile browser testing (iOS Safari, Android Chrome)
- [ ] Ask 3 friends to test full flow
- [ ] Monitor first 10 signups for issues

---

**You're ready to deploy! Follow the checklist in `QUICK-DEPLOY-CHECKLIST.md`**

**Questions?** See full guide: `SQUARESPACE-DEPLOYMENT-GUIDE.md`

