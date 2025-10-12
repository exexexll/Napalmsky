# 🌩️ Napalm Sky - Cloud Deployment Strategy V2 (Production-Ready)

> **Version 2.0** - Incorporating Professional Review Feedback  
> **Updated:** October 10, 2025  
> **Changes from V1:** Security fixes, cost optimizations, single-cloud approach

---

## ⚠️ Critical Changes from V1

### Security Fixes (MUST IMPLEMENT)
1. **TURN Credentials Protection** - Move from client-side to server-side endpoint
2. **Rate Limiting** - Add IP-based throttling for auth endpoints
3. **Environment Variable Isolation** - Remove NEXT_PUBLIC_ from secrets

### Cost Optimizations (50% Savings Year 1)
1. **Cloudflare TURN** - $0.05/GB vs Twilio $0.40/GB (8x cheaper)
2. **Upstash Redis** - $5/month vs ElastiCache $50/month (early stage)
3. **Vercel Free Tier** - Stay on free tier longer

### Architecture Simplifications
1. **Single-Cloud Core** - AWS for infrastructure, specialized services for edges
2. **Realistic Latency** - Single region <200ms (US), multi-region future phase
3. **Aggressive Auto-Scaling** - Buffer instances + faster scale-out

---

## 1. Revised Architecture Overview

```
                            USERS (Global)
                                  │
                    ┌─────────────▼───────────┐
                    │   Cloudflare (Free)     │
                    │   - CDN Caching         │
                    │   - DDoS Protection     │
                    │   - SSL Termination     │
                    └─────────────┬───────────┘
                                  │
                    ┌─────────────▼───────────┐
                    │   AWS Route53 (DNS)     │
                    │   - Latency Routing     │
                    │   - Health Checks       │
                    └─────────────┬───────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          ▼                       ▼                       ▼
   ┌────────────┐         ┌────────────┐         ┌────────────┐
   │  Vercel    │         │  Vercel    │         │  Vercel    │
   │  (Edge 1)  │         │  (Edge 2)  │         │  (Edge 3)  │
   │  Next.js   │         │  Next.js   │         │  Next.js   │
   └─────┬──────┘         └─────┬──────┘         └─────┬──────┘
         │                      │                       │
         └──────────────────────┼───────────────────────┘
                                │
                    ┌───────────▼────────────┐
                    │  AWS ALB               │
                    │  - WebSocket Support   │
                    │  - Sticky Sessions     │
                    │  - Health Checks       │
                    └───────────┬────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
          ▼                     ▼                     ▼
   ┌────────────┐        ┌────────────┐       ┌────────────┐
   │ ECS Task 1 │◄──────►│ ECS Task 2 │◄─────►│ ECS Task 3 │
   │ Node/Expr  │ Redis  │ Node/Expr  │ Redis │ Node/Expr  │
   │ Socket.io  │ Pub/Sub│ Socket.io  │ Pub/Sub│ Socket.io │
   └─────┬──────┘        └─────┬──────┘       └─────┬──────┘
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
   ┌────────────┐       ┌────────────┐      ┌─────────────┐
   │ PostgreSQL │       │  Upstash   │      │     S3      │
   │  RDS       │       │  Redis     │      │ CloudFront  │
   │  Multi-AZ  │       │  Serverless│      │  CDN        │
   │ + Replica  │       │  Pay/Use   │      │  Media      │
   └────────────┘       └────────────┘      └─────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Cloudflare TURN    │
                    │  (WebRTC Relay)     │
                    │  $0.05/GB           │
                    └─────────────────────┘
```

**Key Changes from V1:**
- ✅ Single AWS region (us-east-1) for core infrastructure
- ✅ Upstash Redis instead of ElastiCache (early stage)
- ✅ Cloudflare TURN instead of Twilio (cost savings)
- ✅ Vercel free tier (upgrade only when needed)

---

## 2. Critical Security Fixes

### 2.1 TURN Credential Protection (MANDATORY)

**❌ V1 Approach (INSECURE):**
```typescript
// Frontend - Credentials exposed in bundle!
const turnConfig = {
  urls: process.env.NEXT_PUBLIC_TURN_SERVER,
  username: process.env.NEXT_PUBLIC_TURN_USERNAME, // ⚠️ VISIBLE TO ALL USERS
  credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL
};
```

**✅ V2 Approach (SECURE):**

**Backend Endpoint:**
```typescript
// server/src/turn.ts
import express from 'express';
import { requireAuth } from './auth-middleware';

const router = express.Router();

// Generate time-limited TURN credentials
router.get('/turn/credentials', requireAuth, async (req: any, res) => {
  try {
    // Option 1: Cloudflare TURN (Recommended for cost)
    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${process.env.CLOUDFLARE_TURN_KEY}/credentials/generate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ttl: 3600 // 1 hour expiry
        })
      }
    );
    
    const turnData = await response.json();
    
    // Option 2: Twilio TURN (Alternative)
    // const turnData = await twilioClient.tokens.create({ ttl: 3600 });
    
    res.json({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        ...turnData.iceServers
      ],
      expiresAt: Date.now() + 3600000 // 1 hour
    });
    
    console.log(`[TURN] Generated credentials for user ${req.userId.substring(0, 8)}`);
  } catch (error) {
    console.error('[TURN] Failed to generate credentials:', error);
    
    // Fallback: STUN only (70% success rate)
    res.json({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
  }
});

export default router;
```

**Frontend Usage:**
```typescript
// app/room/[roomId]/page.tsx
async function setupWebRTC() {
  // Fetch credentials from backend
  const response = await fetch(`${API_BASE}/turn/credentials`, {
    headers: {
      'Authorization': `Bearer ${sessionToken}`
    }
  });
  
  const { iceServers } = await response.json();
  
  // Now create peer connection with secured credentials
  const pc = new RTCPeerConnection({ iceServers });
  
  // Rest of WebRTC setup...
}
```

**Benefits:**
- ✅ Credentials never exposed in client bundle
- ✅ Time-limited (1 hour) - auto-expire even if stolen
- ✅ Authenticated users only
- ✅ Can rotate keys without frontend deploy
- ✅ Can switch providers (Cloudflare ↔ Twilio) transparently

---

### 2.2 Rate Limiting (Prevent Brute Force)

**Implementation:**
```typescript
// server/src/rate-limit.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL });
await redisClient.connect();

// Auth endpoints: 5 attempts per 15 minutes per IP
export const authLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:auth:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, please try again in 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// API endpoints: 100 requests per 15 minutes per IP
export const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:api:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please slow down',
});

// TURN endpoint: 10 per hour (prevent credential farming)
export const turnLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:turn:'
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many TURN credential requests',
});
```

**Apply to routes:**
```typescript
// server/src/index.ts
import { authLimiter, apiLimiter, turnLimiter } from './rate-limit';

app.use('/auth', authLimiter);
app.use('/api', apiLimiter);
app.use('/turn', turnLimiter);
```

---

## 3. Optimized Cost Structure

### 3.1 Updated Monthly Costs (0-1,000 Users)

| Service | V1 Cost | V2 Cost | Savings | Notes |
|---------|---------|---------|---------|-------|
| **Frontend (Vercel)** | $20 | $0 | $20 | Free tier (100GB bandwidth) |
| **Backend (ECS Fargate)** | $120 | $120 | $0 | 3 tasks × $40/month |
| **Database (RDS)** | $80 | $80 | $0 | db.t4g.small Multi-AZ |
| **Cache (Redis)** | $50 | $5 | $45 | Upstash vs ElastiCache |
| **Storage (S3+CloudFront)** | $25 | $25 | $0 | 250GB media + 1TB transfer |
| **Load Balancer (ALB)** | $25 | $25 | $0 | Standard pricing |
| **TURN Server** | $80 | $10 | $70 | Cloudflare vs Twilio |
| **Monitoring (DataDog)** | $15 | $0 | $15 | CloudWatch (free tier) |
| **Domain + SSL** | $5 | $5 | $0 | Route53 + ACM |
| **TOTAL (1,000 users)** | **$420** | **$270** | **$150 (36%)** | |

**Cost per user:** $0.27/month (down from $0.42)

### 3.2 Break-Even Analysis (Updated)

**With $0.99/month Subscription:**
```
Revenue per user:    $0.99/month
Cost per user:       $0.27/month
Profit per user:     $0.72/month
Margin:              73%

Break-even:          ~100 paid users (covers $99 base infrastructure)
Profitable at:       200+ users
```

**Scaling Economics:**
| Users | Revenue | Costs | Profit | Margin |
|-------|---------|-------|--------|--------|
| 100 | $99 | $145 | -$46 | -46% |
| 500 | $495 | $215 | $280 | 57% |
| 1,000 | $990 | $270 | $720 | 73% |
| 5,000 | $4,950 | $1,100 | $3,850 | 78% |
| 10,000 | $9,900 | $2,800 | $7,100 | 72% |

**Key Insight:** Profitability achieved at ~200 users (vs 480 in V1)

---

### 3.3 When to Upgrade Services

**Redis: Upstash → ElastiCache**
```
Trigger: >100 operations/second sustained
OR:      Redis costs exceed $50/month on Upstash
OR:      Need VPC-level isolation (compliance)

Action:  Provision cache.t4g.small ElastiCache
Cost:    $50/month (fixed)
Benefit: Lower latency (<1ms), guaranteed resources
```

**TURN: Cloudflare → Self-Hosted coturn**
```
Trigger: TURN costs exceed $200/month
OR:      >50,000 video calls/month

Action:  Deploy coturn on EC2 t3.medium
Cost:    $30/month instance + bandwidth (cheaper at scale)
Benefit: $0.01/GB bandwidth vs $0.05/GB Cloudflare
Note:    Requires DevOps maintenance
```

**Frontend: Vercel Free → Pro**
```
Trigger: Bandwidth exceeds 100GB/month
OR:      Need custom domains (>1)
OR:      Need team features

Action:  Upgrade to Vercel Pro
Cost:    $20/month per member
Benefit: 1TB bandwidth, priority support
```

---

## 4. Improved Auto-Scaling Configuration

### 4.1 Aggressive Scale-Out (Prevent Request Failures)

**Problem in V1:** Fargate takes 40-60 seconds to launch tasks, causing brief overload during spikes.

**V2 Solution:**
```yaml
# ECS Service Configuration
service: napalmsky-api
cluster: napalmsky-prod

# Keep buffer instances warm
desiredCount: 3  # Changed from 2 (one extra as buffer)
minHealthyPercent: 100
maxPercent: 200

# Target Tracking (Recommended)
autoScaling:
  targetTrackingScaling:
    - type: ECSServiceAverageCPUUtilization
      targetValue: 60  # Scale at 60% (not 70%)
      scaleOutCooldown: 30  # Fast scale-up (30s)
      scaleInCooldown: 600  # Slow scale-down (10min)
    
    - type: ECSServiceAverageMemoryUtilization
      targetValue: 70  # Memory threshold
      scaleOutCooldown: 30
      scaleInCooldown: 600

# Step Scaling (For sudden spikes)
stepScaling:
  - metricName: ActiveConnectionCount
    threshold: 400 per instance
    scaleBy: +2 tasks
    cooldown: 30s
    
  - metricName: TargetResponseTime
    threshold: >500ms for 1 minute
    scaleBy: +1 task
    cooldown: 60s

# Scaling Limits
minInstances: 3  # Always 3 (high availability + buffer)
maxInstances: 15  # Increased from 10
```

**Why This Works:**
- Buffer instance absorbs initial spike
- Lower CPU threshold (60% vs 70%) = earlier scale-up
- Faster cooldown (30s) = rapid response
- Multiple triggers (CPU, memory, connections, latency)

---

### 4.2 Load Balancer Optimization

**ALB Configuration (No NGINX Needed):**
```yaml
# Application Load Balancer
loadBalancer:
  type: application
  scheme: internet-facing
  
  # Listeners
  listeners:
    - port: 443
      protocol: HTTPS
      certificates:
        - arn: arn:aws:acm:us-east-1:xxx:certificate/xxx
      defaultActions:
        - type: forward
          targetGroup: napalmsky-api-tg
    
    - port: 80
      protocol: HTTP
      defaultActions:
        - type: redirect
          redirectConfig:
            protocol: HTTPS
            port: 443
            statusCode: HTTP_301

# Target Group
targetGroup:
  name: napalmsky-api-tg
  port: 3001
  protocol: HTTP
  targetType: ip  # For Fargate
  
  # Sticky Sessions (for WebSocket)
  stickinessConfig:
    enabled: true
    type: lb_cookie
    durationSeconds: 86400  # 24 hours
  
  # Health Check
  healthCheck:
    enabled: true
    path: /health
    interval: 30
    timeout: 5
    healthyThreshold: 2
    unhealthyThreshold: 3
    matcher: 200
  
  # Connection Draining
  deregistrationDelay: 30  # Graceful shutdown (30s)
  
  # WebSocket Support (automatic on ALB)
  # No additional config needed
```

**Benefits:**
- ✅ No separate NGINX layer to manage
- ✅ Native WebSocket upgrade support
- ✅ Automatic SSL termination
- ✅ Health checks with auto-deregistration
- ✅ Sticky sessions for long-lived connections

---

## 5. Realistic Latency Expectations

### 5.1 Single-Region Performance (us-east-1)

**Actual RTT from us-east-1 to:**
```
US East Coast:      20-50ms    ✅ Excellent
US Midwest:         50-80ms    ✅ Good
US West Coast:      80-120ms   ✅ Acceptable
Europe (London):    80-120ms   ✅ Acceptable
Europe (Frankfurt): 100-140ms  ⚠️ Marginal
Asia (Tokyo):       150-200ms  ⚠️ Marginal
Asia (Mumbai):      250-350ms  ❌ Poor
Australia:          250-300ms  ❌ Poor
```

**V2 Revised Goal:**
- **US Users:** <100ms API latency ✅
- **EU Users:** <150ms API latency ⚠️ (acceptable for launch)
- **Asia/AU Users:** <300ms ❌ (plan multi-region expansion)

**Note:** Cloudflare CDN serves static assets globally (<50ms everywhere), but API/WebSocket calls traverse to us-east-1.

---

### 5.2 Multi-Region Expansion Plan (Future)

**When to Expand:**
- >30% users from Europe (add eu-west-1)
- >30% users from Asia (add ap-southeast-1)
- User complaints about latency
- Want <100ms globally

**Multi-Region Architecture:**
```
Regions:
  - us-east-1 (Virginia)    - Primary
  - eu-west-1 (Ireland)     - Secondary
  - ap-southeast-1 (Singapore) - Tertiary

Routing:
  - Route53 Latency-Based Routing
  - User → Nearest Region
  - Cross-region database replication

Database:
  - Write Primary: us-east-1
  - Read Replicas: eu-west-1, ap-southeast-1
  - Writes replicate in <1 second

Redis:
  - Per-region Redis cluster
  - Cross-region pub/sub (eventual consistency okay)

Cost Impact:
  - +100% infrastructure (3x regions)
  - Worth it when >5,000 global users
```

**Decision Point:** Monitor user geography in analytics. If >30% non-US, plan expansion in Month 6-12.

---

## 6. Updated Implementation Roadmap

### Week 1-2: Foundation (Security First)

**Day 1-2: Database Setup**
```bash
✅ Provision RDS PostgreSQL
✅ Enable encryption at rest
✅ Configure Multi-AZ
✅ Set up daily backups
✅ Create read replica (standby)
```

**Day 3-4: Security Hardening**
```bash
✅ Implement bcrypt password hashing
✅ Add rate limiting middleware
✅ Create TURN credentials endpoint
✅ Remove NEXT_PUBLIC_ from secrets
✅ Configure AWS WAF rules
```

**Day 5-6: Redis Setup**
```bash
✅ Sign up for Upstash account
✅ Create Redis database (US region)
✅ Configure Socket.io Redis adapter
✅ Test cross-server messaging
✅ Set up cost alerts ($10 threshold)
```

**Day 7: S3 + CloudFront**
```bash
✅ Create S3 bucket (napalmsky-media-prod)
✅ Configure CloudFront distribution
✅ Update media upload code (S3 SDK)
✅ Migrate existing uploads
✅ Test signed URLs
```

---

### Week 3-4: Deployment & Scaling

**Day 8-9: Containerization**
```dockerfile
# server/Dockerfile
FROM node:18-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --production

# Copy source
COPY . .
RUN npm run build

# Security: Run as non-root
USER node

EXPOSE 3001
CMD ["npm", "start"]
```

```bash
✅ Build Docker image
✅ Push to AWS ECR
✅ Test locally with docker-compose
```

**Day 10-11: ECS Deployment**
```bash
✅ Create ECS cluster (Fargate)
✅ Create task definition (512 CPU, 1GB RAM)
✅ Create service (min: 3, max: 15)
✅ Configure ALB target group
✅ Set up health checks
✅ Enable auto-scaling policies
```

**Day 12-13: Load Balancer & DNS**
```bash
✅ Create Application Load Balancer
✅ Configure HTTPS listener (443)
✅ Attach SSL certificate (ACM)
✅ Set up sticky sessions
✅ Configure Route53 DNS
✅ Point api.napalmsky.com to ALB
```

**Day 14: SSL & Domain**
```bash
✅ Request ACM certificate (*.napalmsky.com)
✅ Add CNAME records for validation
✅ Wait for validation (~15 min)
✅ Test HTTPS access
✅ Redirect HTTP → HTTPS
```

---

### Week 5-6: WebRTC & Monitoring

**Day 15-16: Cloudflare TURN Setup**
```bash
✅ Sign up for Cloudflare account
✅ Enable TURN service (Workers/Stream tab)
✅ Generate API keys
✅ Implement /turn/credentials endpoint
✅ Test from frontend (video call)
✅ Verify <95% connection success
```

**Day 17-18: Monitoring Setup**
```bash
# Free Monitoring (CloudWatch + Sentry)
✅ Enable CloudWatch Container Insights
✅ Create dashboards (CPU, Memory, Latency)
✅ Set up alarms (>80% CPU, >1% errors)
✅ Configure Sentry error tracking
✅ Add PagerDuty integration (on-call)
```

**Day 19-20: Load Testing**
```yaml
# load-test.yml (Artillery)
config:
  target: "https://api.napalmsky.com"
  phases:
    - duration: 300  # 5 minutes
      arrivalRate: 10  # 10 users/second
      rampTo: 50       # Ramp to 50/second
  
scenarios:
    - name: "Signup and matchmaking"
      flow:
        - post:
            url: "/auth/guest"
            json:
              name: "Test User"
              gender: "unspecified"
        - think: 2
        - get:
            url: "/room/queue"
            headers:
              Authorization: "Bearer {{ sessionToken }}"
```

```bash
✅ Run 1,000 concurrent user test
✅ Monitor auto-scaling behavior
✅ Check error rates (<0.1%)
✅ Verify latency (p95 <200ms)
✅ Optimize slow queries
```

**Day 21: Performance Tuning**
```bash
✅ Add database indexes (slow query log)
✅ Enable gzip compression
✅ Optimize images (WebP format)
✅ Configure CloudFront cache headers
✅ Review and right-size resources
```

---

### Week 7-8: Security & Launch

**Day 22-23: Security Audit**
```bash
# OWASP ZAP Scan
✅ Run automated security scan
✅ Fix HIGH/CRITICAL vulnerabilities
✅ Implement CSP headers
✅ Review CORS configuration
✅ Test SQL injection prevention
✅ Verify bcrypt password hashing

# Manual Testing
✅ Test rate limiting (brute force)
✅ Test TURN credential expiry
✅ Verify S3 bucket permissions
✅ Check for exposed secrets
```

**Day 24-25: Documentation**
```bash
✅ Write deployment runbook
✅ Create incident response guide
✅ Document rollback procedures
✅ Update README with production URLs
✅ Create admin playbook
```

**Day 26-27: Beta Testing**
```bash
✅ Invite 50-100 beta testers
✅ Generate admin invite codes
✅ Monitor error rates (Sentry)
✅ Collect feedback (Google Forms)
✅ Fix critical bugs (<24 hours)
✅ Optimize based on real usage
```

**Day 28: Pre-Launch Checklist**
```bash
# Infrastructure
✅ All health checks passing
✅ Auto-scaling tested
✅ Backups enabled and tested
✅ Monitoring alerts configured
✅ SSL certificates valid (>60 days)

# Security
✅ Rate limiting active
✅ TURN credentials secure
✅ No secrets in client bundle
✅ WAF rules enabled
✅ Encryption at rest/transit

# Performance
✅ API response time <200ms (p95)
✅ Video call success rate >95%
✅ Database query time <50ms (p95)
✅ Frontend load time <2 seconds

# Business
✅ Payment flow tested (Stripe live keys)
✅ Invite code system working
✅ Terms of Service published
✅ Privacy Policy published
✅ Support email configured

# LAUNCH 🚀
✅ DNS propagation complete
✅ Final backup taken
✅ Team on-call (24h monitoring)
✅ Press release ready
✅ Social media posts scheduled
```

---

## 7. Cost Monitoring & Alerts

### 7.1 AWS Budgets Setup

```bash
# Set up cost alerts
aws budgets create-budget \
  --account-id 123456789012 \
  --budget '{
    "BudgetName": "napalmsky-monthly",
    "BudgetLimit": {
      "Amount": "300",
      "Unit": "USD"
    },
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }' \
  --notifications-with-subscribers '[{
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 80,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [{
      "SubscriptionType": "EMAIL",
      "Address": "admin@napalmsky.com"
    }]
  }]'
```

**Alert Thresholds:**
- 50% of budget: Email notification
- 80% of budget: Email + Slack alert
- 100% of budget: Urgent investigation
- 150% of budget: Emergency shutdown plan

---

### 7.2 Service-Specific Monitoring

**Upstash Redis:**
```javascript
// Monitor daily cost
const upstashCost = await fetch('https://api.upstash.com/v2/redis/billing', {
  headers: { 'Authorization': `Bearer ${UPSTASH_API_KEY}` }
}).then(r => r.json());

if (upstashCost.currentMonth > 50) {
  alert('Upstash exceeding $50/month - consider ElastiCache');
}
```

**Cloudflare TURN:**
```javascript
// Monitor TURN usage
const turnUsage = await fetch('https://api.cloudflare.com/client/v4/accounts/{id}/stream/analytics', {
  headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` }
}).then(r => r.json());

const turnCostEstimate = turnUsage.totalGB * 0.05;
if (turnCostEstimate > 200) {
  alert('TURN costs high - consider self-hosted coturn');
}
```

**CloudFront Bandwidth:**
```bash
# Check daily bandwidth
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name BytesDownloaded \
  --dimensions Name=DistributionId,Value=E1234567890ABC \
  --start-time 2025-10-01T00:00:00Z \
  --end-time 2025-10-10T00:00:00Z \
  --period 86400 \
  --statistics Sum
```

---

## 8. Disaster Recovery Procedures

### 8.1 Database Failover (RTO: 5 minutes)

**Scenario:** Primary RDS instance fails

**Automatic Failover (Multi-AZ):**
```
1. RDS detects failure (health check)
2. Promotes standby to primary (30-60 seconds)
3. DNS endpoint updates automatically
4. Application reconnects (connection retry logic)
5. Total downtime: 1-2 minutes
```

**Manual Failover (If auto-fail doesn't work):**
```bash
# Promote read replica
aws rds promote-read-replica \
  --db-instance-identifier napalmsky-db-replica

# Update application environment variable
# DATABASE_URL=postgresql://napalmsky-db-replica.xxxxx.rds.amazonaws.com:5432/napalmsky_prod

# Restart ECS tasks to pick up new endpoint
aws ecs update-service \
  --cluster napalmsky-prod \
  --service napalmsky-api \
  --force-new-deployment
```

---

### 8.2 Region-Wide Outage (RTO: 30 minutes)

**Scenario:** AWS us-east-1 region down

**Recovery Steps:**
```bash
# 1. Activate DR region (us-west-2)
# (Pre-deployed standby infrastructure)

# 2. Promote us-west-2 read replica to primary
aws rds promote-read-replica \
  --db-instance-identifier napalmsky-db-usw2-replica \
  --region us-west-2

# 3. Update Route53 to point to us-west-2 ALB
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.napalmsky.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z3AADJGX6KTTL2",
          "DNSName": "napalmsky-usw2-alb-123.us-west-2.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'

# 4. Scale up us-west-2 ECS service
aws ecs update-service \
  --cluster napalmsky-prod-usw2 \
  --service napalmsky-api \
  --desired-count 3 \
  --region us-west-2

# 5. Verify health checks passing
# 6. Monitor error rates and latency
# 7. Communicate status to users
```

**Total Recovery Time:** 15-30 minutes

---

## 9. Updated Service Decisions

### 9.1 Redis: Upstash (Early Stage) → ElastiCache (Scale)

**Use Upstash When:**
- <100 active users
- <50 operations/second
- Cost is top priority
- Don't need VPC isolation

**Migrate to ElastiCache When:**
- >100 operations/second sustained
- Monthly Upstash bill exceeds $50
- Need <1ms latency (Upstash is 5-20ms)
- Need VPC-level security (compliance)
- Want guaranteed resources

**Migration Path:**
```bash
# 1. Provision ElastiCache (takes ~15 minutes)
aws elasticache create-cache-cluster \
  --cache-cluster-id napalmsky-redis \
  --cache-node-type cache.t4g.small \
  --engine redis \
  --num-cache-nodes 1 \
  --preferred-availability-zone us-east-1a

# 2. Update REDIS_URL environment variable
# REDIS_URL=redis://napalmsky-redis.xxxxx.cache.amazonaws.com:6379

# 3. Deploy with zero downtime (Redis adapter reconnects)
# 4. Monitor for errors
# 5. Deactivate Upstash database
```

---

### 9.2 TURN: Cloudflare (Launch) → Self-Hosted (Scale)

**Cloudflare TURN Pricing:**
```
$0.05/GB for TURN relay traffic
Example: 10,000 calls/month × 50MB avg = 500GB = $25/month
```

**When to Self-Host:**
```
Trigger: Monthly TURN costs exceed $200
OR:      >50,000 video calls/month
OR:      Want multi-region TURN servers

Self-Hosted Cost:
- EC2 t3.medium: $30/month
- Data transfer: $0.09/GB (first 10TB)
- 500GB transfer: $45/month
- Total: ~$75/month vs $25 Cloudflare

Conclusion: Cloudflare cheaper until ~2,000GB/month usage
```

**coturn Setup (If Needed):**
```bash
# EC2 UserData script
#!/bin/bash
apt-get update
apt-get install -y coturn

# Configure coturn
cat > /etc/turnserver.conf <<EOF
listening-port=3478
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=${TURN_SECRET}
realm=napalmsky.com
total-quota=100
stale-nonce=600
cert=/etc/letsencrypt/live/turn.napalmsky.com/cert.pem
pkey=/etc/letsencrypt/live/turn.napalmsky.com/privkey.pem
EOF

systemctl enable coturn
systemctl start coturn
```

---

## 10. Updated Environment Variables

### Production .env (Backend)

```bash
# ===== SERVER CONFIGURATION =====
NODE_ENV=production
PORT=3001

# ===== ALLOWED ORIGINS =====
ALLOWED_ORIGINS=https://napalmsky.com,https://www.napalmsky.com

# ===== DATABASE =====
DATABASE_URL=postgresql://napalmsky:PASSWORD@napalmsky-db.xxxxx.us-east-1.rds.amazonaws.com:5432/napalmsky_prod
DATABASE_POOL_MAX=20
DATABASE_POOL_MIN=2
DATABASE_TIMEOUT=30000

# ===== REDIS (Upstash Serverless) =====
REDIS_URL=rediss://default:PASSWORD@us1-xxx-xxx-xxx.upstash.io:6379

# ===== AWS S3 =====
AWS_S3_BUCKET=napalmsky-media-prod
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CDN_BASE_URL=https://d1234567890abcd.cloudfront.net

# ===== CLOUDFLARE TURN (Primary) =====
CLOUDFLARE_API_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLOUDFLARE_TURN_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ===== TWILIO TURN (Backup) =====
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ===== STRIPE =====
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ===== SECURITY =====
JWT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SESSION_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BCRYPT_ROUNDS=12

# ===== MONITORING =====
SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@sentry.io/xxxxxxx
SENTRY_ENVIRONMENT=production

# ===== RATE LIMITING =====
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AUTH_MAX=5

# ===== CLOUDWATCH (Optional) =====
AWS_CLOUDWATCH_LOG_GROUP=/aws/ecs/napalmsky-api
AWS_CLOUDWATCH_LOG_STREAM=napalmsky-api
```

### Production .env.local (Frontend)

```bash
# API Configuration
NEXT_PUBLIC_API_BASE=https://api.napalmsky.com
NEXT_PUBLIC_SOCKET_URL=https://api.napalmsky.com

# Stripe Public Key
NEXT_PUBLIC_STRIPE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Analytics (Optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Environment
NEXT_PUBLIC_ENV=production

# ⚠️ NO SECRETS HERE - All NEXT_PUBLIC_ vars are exposed to client
```

---

## 11. Success Metrics & KPIs

### Infrastructure Metrics

**Target SLAs:**
```
Uptime:              99.9% (43 minutes downtime/month max)
API Latency (p95):   <200ms
API Latency (p99):   <500ms
Error Rate:          <0.1%
WebRTC Success:      >95%
Database Query:      <50ms (p95)
```

**Week 1 Goals:**
- [ ] 99% uptime
- [ ] <5 critical errors
- [ ] <300ms API latency (p95)
- [ ] 100 signups

**Month 1 Goals:**
- [ ] 99.9% uptime
- [ ] <0.1% error rate
- [ ] <200ms API latency (p95)
- [ ] 500+ signups, 200+ paid users

**Month 3 Goals:**
- [ ] 99.95% uptime
- [ ] <0.05% error rate
- [ ] <150ms API latency (p95)
- [ ] 5,000+ signups, 2,000+ paid users
- [ ] Break-even or profitable

---

## 12. Migration Checklist (V1 → V2)

**If you already deployed V1, here's how to migrate:**

### Step 1: Security Fixes (Critical)
- [ ] Deploy TURN credentials endpoint
- [ ] Remove NEXT_PUBLIC_TURN_* from frontend
- [ ] Add rate limiting middleware
- [ ] Update frontend to fetch TURN from backend
- [ ] Test video calls still work

### Step 2: Cost Optimizations (Optional)
- [ ] Sign up for Upstash account
- [ ] Migrate Redis data (or start fresh)
- [ ] Update REDIS_URL environment variable
- [ ] Test Socket.io clustering still works
- [ ] Monitor Upstash costs for 1 week
- [ ] (Optional) Sign up for Cloudflare TURN
- [ ] (Optional) Implement Cloudflare TURN endpoint
- [ ] (Optional) Test and switch if working

### Step 3: Scaling Improvements
- [ ] Update ECS service min instances: 2 → 3
- [ ] Update auto-scaling target CPU: 70% → 60%
- [ ] Add step scaling policy (connections)
- [ ] Test with load testing (Artillery)
- [ ] Verify no request failures during scale-up

### Step 4: Monitoring
- [ ] Set up CloudWatch dashboards
- [ ] Configure cost alerts (AWS Budgets)
- [ ] Add Sentry error tracking
- [ ] Create PagerDuty on-call rotation
- [ ] Document incident response procedures

---

## 13. Conclusion & Next Steps

**V2 Improvements Summary:**
- ✅ **Security:** TURN credentials protected, rate limiting added
- ✅ **Cost:** 36% reduction ($420 → $270/month for 1,000 users)
- ✅ **Scalability:** Aggressive auto-scaling, buffer instances
- ✅ **Simplicity:** Single-cloud core, specialized edge services
- ✅ **Reliability:** Improved failover, realistic SLAs

**Ready to Deploy?**

1. **Read:** This document (V2) completely
2. **Review:** Security section (critical fixes)
3. **Decide:** Upstash vs ElastiCache for launch
4. **Decide:** Cloudflare vs Twilio TURN
5. **Follow:** Updated implementation roadmap (Week 1-8)
6. **Monitor:** Costs and performance closely
7. **Iterate:** Upgrade services as usage grows

**Estimated Timeline:** 6-8 weeks to production-ready  
**Estimated Initial Investment:** $300-500 (setup + first month)  
**Break-Even:** ~200 paid users ($0.99/month subscription)  
**Profitability:** 500+ users with 73% margins  

**Questions?** Reference:
- **COST-OPTIMIZATION-GUIDE.md** - Detailed cost analysis
- **SECURITY-HARDENING.md** - Complete security checklist
- **ARCHITECTURE-OVERVIEW.md** - Visual diagrams
- **DEPLOYMENT-CHECKLIST.md** - Step-by-step tasks

---

*Strategy Version 2.0 - October 10, 2025*  
*Incorporating professional review feedback*  
*Ready for production deployment* 🚀

