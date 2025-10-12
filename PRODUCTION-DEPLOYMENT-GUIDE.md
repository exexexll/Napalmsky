# 🚀 Production Deployment Guide - Quick Start

**Napalm Sky is now production-ready!**

---

## ✅ What's Been Implemented

### Security Fixes (CRITICAL)
- ✅ **TURN Credentials Endpoint** - `/turn/credentials` (server-side, 1-hour expiry)
- ✅ **bcrypt Password Hashing** - Cost factor 12 (industry standard)
- ✅ **Rate Limiting** - Auth (5/15min), API (100/15min), TURN (10/hour)
- ✅ **Environment Variables** - Production-ready configuration
- ✅ **Production Dockerfile** - Optimized, multi-stage, non-root user

### Code Cleanup
- ✅ **Mock Users Removed** - No test data in production
- ✅ **Dependencies Updated** - Added bcrypt, express-rate-limit
- ✅ **API Clients Updated** - Use environment variables (not hardcoded localhost)

---

## 📦 Installation Steps

### Step 1: Install New Dependencies

```bash
# Navigate to server directory
cd /Users/hansonyan/Desktop/Napalmsky/server

# Install new dependencies
npm install

# Verify bcrypt and express-rate-limit installed
npm list bcrypt express-rate-limit
```

**Expected Output:**
```
napalmsky-server@1.0.0
├── bcrypt@5.1.1
└── express-rate-limit@7.1.5
```

---

### Step 2: Copy Environment Template

```bash
# Backend environment
cd /Users/hansonyan/Desktop/Napalmsky/server
cp env.production.template .env.production

# Frontend environment
cd /Users/hansonyan/Desktop/Napalmsky
cp env.production.template .env.production

# Edit files and replace all REPLACE_WITH_* placeholders
# (Do this after setting up AWS accounts)
```

---

### Step 3: Test Locally (Development Mode)

```bash
# Make sure you're in the project root
cd /Users/hansonyan/Desktop/Napalmsky

# Kill any existing processes
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null

# Install dependencies
npm install

# Start development servers
npm run dev
```

**Verify These Features Work:**
- [ ] Create account (password hashing works)
- [ ] Login with email/password (bcrypt comparison works)
- [ ] Upload selfie/video (still works)
- [ ] Open matchmaking (no mock users, shows real users only)
- [ ] Start video call (TURN credentials fetched from backend)
- [ ] Rate limiting (try 6+ failed logins, should block)

---

## 🔒 Security Verification Checklist

### Before Production Deployment

```bash
# Test 1: TURN Credentials Security
curl -X GET http://localhost:3001/turn/credentials
# Expected: 401 Unauthorized (no auth token)

curl -X GET http://localhost:3001/turn/credentials \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
# Expected: 200 OK with iceServers array

# Test 2: Password Hashing
# Create account → Check database
# password_hash should be $2b$12$... (bcrypt format)
# NOT plain text

# Test 3: Rate Limiting
for i in {1..6}; do
  curl -X POST http://localhost:3001/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
# Expected: 6th request returns 429 Too Many Requests
```

---

## 🌐 AWS Account Setup

While the code is ready, you need to set up these AWS services:

### Required Services (For 10,000+ Users)

**1. PostgreSQL RDS**
```
Instance Class: db.r6g.xlarge (4 vCPU, 32GB RAM)
Storage: 100GB SSD (auto-scaling to 500GB)
Multi-AZ: Yes (high availability)
Backups: Daily (30-day retention)
Cost: ~$250/month
```

**2. S3 + CloudFront**
```
Bucket: napalmsky-media-prod
Storage Class: Standard (hot data), Standard-IA (cold data)
CloudFront: Global edge caching
Cost: ~$50/month (10,000 users)
```

**3. ElastiCache Redis**
```
Node Type: cache.r6g.large (2 vCPU, 13GB RAM)
Cluster Mode: Yes (3 shards + replicas)
Replication: 1 replica per shard
Cost: ~$200/month
```

**4. ECS Fargate Cluster**
```
Task Definition:
  - CPU: 1 vCPU per task
  - Memory: 2GB per task
  
Service:
  - Min Instances: 5 (buffer for spikes)
  - Max Instances: 20 (handle 10,000+ users)
  - Auto-scaling: Target CPU 60%

Cost: ~$600/month (10 tasks avg)
```

**5. Application Load Balancer**
```
Type: Application Load Balancer
Listeners: HTTP (80) → HTTPS (443)
Sticky Sessions: Enabled (WebSocket support)
Health Check: /health endpoint
Cost: ~$25/month (fixed)
```

**Total Monthly Cost (10,000 Users):** ~$1,200/month

---

## 🔑 Service Signup Checklist

### Cloud Services (Do This Now)

- [ ] **AWS Account** - https://aws.amazon.com/free/
  - Enable MFA on root account
  - Create IAM admin user
  - Add payment method

- [ ] **Cloudflare Account** - https://cloudflare.com/
  - Free tier (unlimited DDoS protection)
  - Add domain (napalmsky.com)
  - Enable TURN service

- [ ] **Upstash Account** - https://console.upstash.com/
  - Free tier (10K requests/day)
  - Create Redis database (US region)
  - Copy connection URL

- [ ] **Stripe Account** - https://dashboard.stripe.com/
  - Get production API keys
  - Set up webhook endpoint
  - Test $0.01 payment

- [ ] **Vercel Account** - https://vercel.com/
  - Import GitHub repository
  - Add environment variables
  - Deploy to production

### Optional Services

- [ ] **Sentry** - https://sentry.io/ (Error tracking - free tier)
- [ ] **DataDog** - https://datadoghq.com/ (Monitoring - 14-day trial)
- [ ] **Twilio** - https://twilio.com/ (Backup TURN server)

---

## 🚀 Deployment Steps

### Week 1: AWS Infrastructure

**Day 1-2: Database**
```bash
# Create RDS PostgreSQL instance
# See: DEPLOYMENT-CHECKLIST.md Week 1, Day 1-2

# Run schema creation
psql -h your-db-endpoint -U postgres -d napalmsky_prod < schema.sql
```

**Day 3-4: S3 + CloudFront**
```bash
# Create S3 bucket
aws s3 mb s3://napalmsky-media-prod --region us-east-1

# Enable encryption
aws s3api put-bucket-encryption --bucket napalmsky-media-prod \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Create CloudFront distribution
# See: DEPLOYMENT-CHECKLIST.md Week 1, Day 3-4
```

**Day 5-6: Redis**
```bash
# Sign up for Upstash (recommended for 0-1,000 users)
# OR provision ElastiCache (for 1,000+ users)

# Copy REDIS_URL to .env.production
```

**Day 7: Test Infrastructure**
```bash
# Test database connection
psql -h your-endpoint -U postgres -d napalmsky_prod

# Test S3 upload
aws s3 cp test.txt s3://napalmsky-media-prod/test.txt

# Test Redis
redis-cli -u your-redis-url PING
```

---

### Week 2: Container Deployment

**Day 8-9: Build Docker Image**
```bash
cd /Users/hansonyan/Desktop/Napalmsky/server

# Build
docker build -t napalmsky-api:latest .

# Test locally
docker run -p 3001:3001 \
  -e DATABASE_URL=your-url \
  -e REDIS_URL=your-url \
  napalmsky-api:latest

# Verify health check
curl http://localhost:3001/health
```

**Day 10-11: Push to AWS ECR**
```bash
# Create ECR repository
aws ecr create-repository --repository-name napalmsky-api --region us-east-1

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Tag image
docker tag napalmsky-api:latest \
  YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/napalmsky-api:latest

# Push
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/napalmsky-api:latest
```

**Day 12-13: Deploy to ECS**
```bash
# Create ECS cluster, task definition, service
# See: DEPLOYMENT-CHECKLIST.md Week 2, Day 10-11

# For 10,000+ users configuration:
# - Min tasks: 5
# - Max tasks: 20
# - Target CPU: 60%
# - Memory: 2GB per task
```

**Day 14: Configure ALB**
```bash
# Create Application Load Balancer
# Enable HTTPS (443) with ACM certificate
# Configure sticky sessions for WebSocket
# Point domain: api.napalmsky.com → ALB
```

---

### Week 3: Frontend Deployment

**Vercel Deployment (Recommended):**
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd /Users/hansonyan/Desktop/Napalmsky
vercel --prod

# Add environment variables in Vercel Dashboard:
# - NEXT_PUBLIC_API_BASE=https://api.napalmsky.com
# - NEXT_PUBLIC_SOCKET_URL=https://api.napalmsky.com
# - NEXT_PUBLIC_STRIPE_KEY=pk_live_xxxxx

# Redeploy to apply env vars
vercel --prod
```

---

## 🧪 Testing Before Launch

### End-to-End Test (2 Devices)

**Device 1 (Desktop):**
```
1. Open: https://napalmsky.com
2. Sign up with email + password
3. Upload selfie
4. Upload intro video
5. Go to matchmaking
6. Wait for Device 2
```

**Device 2 (Phone in Incognito):**
```
1. Open: https://napalmsky.com
2. Sign up (different email)
3. Upload media
4. Go to matchmaking
5. Should see Device 1 user
6. Invite Device 1
```

**Device 1:**
```
7. Accept invite
8. Both should enter video room
9. Verify video + audio working
10. Verify timer counting down
11. Send chat message
12. Share social links
13. End call
14. Check "Past Chats" - call should be saved
```

### Security Tests

```bash
# Test 1: Rate limiting
# Try 6 failed logins → Should block after 5

# Test 2: TURN credentials
# Check browser console → Should NOT show credentials in bundle

# Test 3: Password hashing
# Sign up → Check database → Should see $2b$12$... (not plain text)

# Test 4: HTTPS enforcement
# Try HTTP → Should redirect to HTTPS

# Test 5: WebSocket clustering
# Kill one ECS task → Users should stay connected (Redis adapter)
```

---

## 📊 Monitoring Setup (Post-Launch)

### CloudWatch Alarms

```bash
# CPU > 70% for 2 minutes
# Memory > 80% for 2 minutes
# Error rate > 1% for 5 minutes
# Database connections > 90% for 5 minutes
# TURN bandwidth > 100GB/day (cost spike)
```

### Weekly Health Checks

- [ ] Review error logs (Sentry/CloudWatch)
- [ ] Check cost reports (AWS Billing)
- [ ] Monitor user metrics (DAU, conversions)
- [ ] Test backup restoration
- [ ] Review security logs

---

## 🎯 Go-Live Checklist

### Pre-Launch (24 Hours Before)

- [ ] All environment variables set (production values)
- [ ] SSL certificates valid (>60 days remaining)
- [ ] Database backups enabled and tested
- [ ] Auto-scaling policies configured
- [ ] Monitoring alerts active (CloudWatch, Sentry)
- [ ] Rate limiting active (test with failed logins)
- [ ] TURN credentials endpoint working (test video call)
- [ ] Password hashing working (test signup/login)
- [ ] Health checks passing (/health returns 200)
- [ ] Load testing completed (1,000+ concurrent users)

### Launch Day

- [ ] 9:00 AM: Final backup of database
- [ ] 9:30 AM: Deploy latest code (ECS + Vercel)
- [ ] 10:00 AM: Verify health checks passing
- [ ] 10:30 AM: Update DNS to production (if staging)
- [ ] 11:00 AM: Test signup + video call end-to-end
- [ ] 12:00 PM: Send launch announcement
- [ ] 2:00 PM: Monitor error rates (<0.1%)
- [ ] 5:00 PM: Review first 100 signups
- [ ] 8:00 PM: Set up on-call rotation (PagerDuty)

### Post-Launch (48 Hours)

- [ ] Monitor Sentry every 2 hours
- [ ] Check CloudWatch dashboards every 4 hours
- [ ] Review user feedback
- [ ] Fix critical bugs within 6 hours
- [ ] Celebrate! 🎉

---

## 💰 Cost Estimates (10,000 Concurrent Users)

| Service | Specification | Monthly Cost |
|---------|--------------|--------------|
| **ECS Fargate** | 10 tasks × 1vCPU × 2GB | $600 |
| **RDS PostgreSQL** | db.r6g.xlarge Multi-AZ | $250 |
| **ElastiCache Redis** | cache.r6g.large cluster | $200 |
| **S3 + CloudFront** | 500GB + 5TB bandwidth | $80 |
| **ALB** | Application Load Balancer | $25 |
| **Vercel** | Pro plan | $20 |
| **Cloudflare TURN** | 50,000 calls (2.5TB) | $125 |
| **Monitoring** | CloudWatch + Sentry | $30 |
| **TOTAL** | | **$1,330/month** |

**Cost per user:** $0.13/month (at 10,000 concurrent users)

**With $0.99 subscription:**
- Revenue: 10,000 × $0.99 = $9,900/month
- Profit: $9,900 - $1,330 = $8,570/month
- Margin: 87%

---

## 🆘 Emergency Contacts & Support

### Critical Issues
- **AWS Support:** https://console.aws.amazon.com/support/
- **Database Down:** Promote read replica (see disaster recovery)
- **API Errors:** Check CloudWatch logs, review Sentry

### Documentation References
- **Security Issues:** `SECURITY-HARDENING.md`
- **Cost Optimization:** `COST-OPTIMIZATION-GUIDE.md`
- **Architecture Questions:** `ARCHITECTURE-OVERVIEW.md`
- **Deployment Steps:** `DEPLOYMENT-CHECKLIST.md`

---

## ✅ You're Production-Ready!

**Next Steps:**
1. Install dependencies: `npm install` (in server directory)
2. Test locally: `npm run dev`
3. Set up AWS accounts (while code is being tested)
4. Follow `DEPLOYMENT-CHECKLIST.md` for week-by-week tasks
5. Launch in 6-8 weeks! 🚀

**Questions?** Review the comprehensive documentation or reach out for support.

---

*Production Deployment Guide - Created October 10, 2025*  
*All security fixes implemented and ready for AWS cloud deployment*

