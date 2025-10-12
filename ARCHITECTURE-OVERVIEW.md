# 🏗️ Napalm Sky - Production Architecture Overview

**Quick Reference Guide for Cloud Deployment**

---

## System Architecture Diagram

```
                            USERS (Global)
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │   Cloudflare CDN        │
                    │   - DDoS Protection     │
                    │   - SSL Termination     │
                    │   - Static Asset Cache  │
                    └─────────────┬───────────┘
                                  │
                    ┌─────────────▼───────────┐
                    │   DNS (Route53)         │
                    │   - napalmsky.com       │
                    │   - api.napalmsky.com   │
                    │   - cdn.napalmsky.com   │
                    └─────────────┬───────────┘
                                  │
                    ┌─────────────▼───────────┐
                    │  Load Balancer (ALB)    │
                    │  - SSL Certificate      │
                    │  - Health Checks        │
                    │  - Sticky Sessions      │
                    └─────────────┬───────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          ▼                       ▼                       ▼
   ┌────────────┐         ┌────────────┐         ┌────────────┐
   │  Frontend  │         │  Frontend  │         │  Frontend  │
   │  Vercel    │         │  Vercel    │         │  Vercel    │
   │  (Next.js) │         │  (Edge)    │         │  (Edge)    │
   └─────┬──────┘         └─────┬──────┘         └─────┬──────┘
         │                      │                       │
         └──────────────────────┼───────────────────────┘
                                │
                                │ HTTPS API Calls
                                │
                    ┌───────────▼────────────┐
                    │  API Gateway           │
                    │  (ALB + ECS Cluster)   │
                    └───────────┬────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
          ▼                     ▼                     ▼
   ┌────────────┐        ┌────────────┐       ┌────────────┐
   │ API Server │        │ API Server │       │ API Server │
   │   Node.js  │◄──────►│   Node.js  │◄─────►│   Node.js  │
   │  Express   │  Redis │  Express   │ Redis │  Express   │
   │ Socket.io  │  Pub/  │ Socket.io  │ Sub   │ Socket.io  │
   └─────┬──────┘  Sub   └─────┬──────┘       └─────┬──────┘
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
   ┌────────────┐       ┌────────────┐      ┌─────────────┐
   │ PostgreSQL │       │   Redis    │      │     S3      │
   │  (Primary) │       │  ElastiCache│      │ CloudFront  │
   │            │       │  - Cache   │      │  - Selfies  │
   │ + Replica  │       │  - Queue   │      │  - Videos   │
   └────────────┘       │  - Presence│      └─────────────┘
                        └────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  TURN Server        │
                    │  (Twilio)           │
                    │  WebRTC NAT Relay   │
                    └─────────────────────┘
```

---

## Component Responsibilities

### 🌐 Frontend (Next.js on Vercel)
**Purpose:** User interface, SEO, initial page rendering

**Tech Stack:**
- Next.js 14 (App Router, SSR)
- React 18
- TypeScript
- Tailwind CSS
- Framer Motion (animations)
- Socket.io-client (real-time)

**Pages:**
- `/` - Landing page
- `/onboarding` - Signup flow
- `/main` - Dashboard
- `/matchmake` - User reel
- `/room/[roomId]` - Video chat
- `/history` - Past conversations
- `/settings` - User settings

**Key Features:**
- Server-side rendering for SEO
- Edge caching (global CDN)
- Auto-deployment from Git
- Zero downtime deploys

---

### 🔧 Backend API (Node.js on ECS)
**Purpose:** Business logic, authentication, matchmaking

**Tech Stack:**
- Node.js 18
- Express
- TypeScript
- Socket.io (real-time events)
- PostgreSQL client (pg)
- AWS SDK (S3 uploads)
- Stripe SDK (payments)

**Endpoints:**
```
Authentication:
POST   /auth/guest              - Create guest account
POST   /auth/login              - Login with email/password
POST   /auth/link               - Convert guest → permanent

Media:
POST   /media/selfie            - Upload profile photo
POST   /media/video             - Upload intro video

Matchmaking:
GET    /room/queue              - Get available users
POST   /room/direct-match       - Initiate call with specific user

User:
GET    /user/me                 - Get current user profile
PUT    /user/me                 - Update profile
GET    /user/history            - Get call history

Payment:
POST   /payment/create-checkout - Create Stripe checkout
POST   /payment/apply-code      - Redeem invite code
GET    /payment/status          - Check payment status

Admin:
GET    /admin/stats             - Platform statistics
POST   /admin/generate-code     - Create invite codes
```

**Socket.io Events:**
```
Client → Server:
- auth                      - Authenticate connection
- presence:join             - Mark user online
- queue:join                - Enter matchmaking queue
- call:invite               - Send call request
- call:accept               - Accept incoming call
- call:decline              - Decline incoming call
- call:rescind              - Cancel outgoing request
- rtc:offer/answer/ice      - WebRTC signaling
- room:chat                 - Send text message
- room:giveSocial           - Share social media
- call:end                  - End video call

Server → Client:
- auth:success/failed       - Auth result
- presence:update           - User online/offline
- queue:update              - Matchmaking pool changed
- call:notify               - Incoming call request
- call:start                - Call accepted, join room
- call:declined             - Call rejected
- call:rescinded            - Call cancelled
- rtc:offer/answer/ice      - WebRTC signaling
- room:chat                 - Receive message
- room:socialShared         - Receive social links
- session:finalized         - Call ended, history saved
```

---

### 🗄️ Database (PostgreSQL on RDS)
**Purpose:** Persistent data storage

**Tables:**
```
users                  - User accounts and profiles
sessions               - Authentication tokens
chat_history           - Past conversations
cooldowns              - 24h matching restrictions
invite_codes           - QR code/referral system
reports                - User safety reports
ban_records            - Moderation actions
referral_notifications - Matchmaker notifications
```

**Key Features:**
- Automatic backups (daily)
- Point-in-time recovery (35 days)
- Read replica (query offloading)
- Multi-AZ failover (99.95% uptime)
- Connection pooling (max 100 connections)

**Scaling:**
- Vertical: Increase instance size (t4g.micro → t4g.large)
- Horizontal: Add read replicas (route read queries)
- Partitioning: Shard by user_id for 100K+ users

---

### ⚡ Redis (ElastiCache)
**Purpose:** Fast caching, real-time state management

**Use Cases:**
```
Presence Tracking:
  Key: presence:{userId}
  Value: {socketId, online, available, lastActiveAt}
  TTL: 10 minutes

Session Cache:
  Key: session:{token}
  Value: userId
  TTL: 7-30 days

Active Invites:
  Key: invite:{inviteId}
  Value: {fromUserId, toUserId, callerSeconds, createdAt}
  TTL: 30 seconds

Rate Limiting:
  Key: ratelimit:{ipAddress}:{endpoint}
  Value: counter
  TTL: 1 hour

Socket.io Pub/Sub:
  Channel: socket.io-adapter
  Purpose: Cross-server event broadcasting
```

**Performance:**
- <1ms read latency
- <5ms write latency
- 100K+ ops/second
- Automatic failover (replica)

---

### 📦 File Storage (S3 + CloudFront)
**Purpose:** Media uploads (selfies, videos)

**Structure:**
```
napalmsky-media-prod/
├── users/
│   ├── {userId}/
│   │   ├── selfie-1696891234567.jpg   (500KB)
│   │   └── intro-1696891234567.webm   (10MB)
│
├── temp/
│   └── (auto-delete after 1 day)
```

**Features:**
- Server-side encryption (AES-256)
- Signed URLs (1-hour expiry)
- CloudFront CDN (global edge cache)
- Lifecycle policies (archive after 90 days)
- Versioning (keep 10 versions)

**Costs:**
- Storage: $0.023/GB/month
- GET requests: $0.0004 per 1,000
- CloudFront transfer: $0.085/GB
- **Example:** 10K users × 5MB avg = 50GB = $1.15/month storage

---

### 🎥 TURN Server (Twilio)
**Purpose:** WebRTC relay for NAT traversal

**Why Needed?**
- STUN only: ~70% connection success
- TURN relay: ~95% connection success
- Required for: Corporate firewalls, symmetric NAT, restrictive networks

**Configuration:**
```javascript
iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: 'turn:global.turn.twilio.com:3478',
    username: process.env.TWILIO_TURN_USER,
    credential: process.env.TWILIO_TURN_PASS
  }
]
```

**Costs:**
- STUN: Free (Google)
- TURN: $0.004/minute
- 5-min call: $0.02
- 1,000 calls/month: $20
- Alternative: Self-host coturn (~$30/month VPS)

---

## Data Flow Examples

### Example 1: User Signup
```
1. User enters name + gender → Frontend
2. Frontend: POST /auth/guest {name, gender, inviteCode}
3. Backend: 
   - Validate input
   - Create user in database
   - Generate session token
   - If inviteCode: Verify and use
   - Store session in Redis (cache)
4. Frontend: Store sessionToken in localStorage
5. Redirect to /onboarding (upload photos)
```

### Example 2: Starting a Video Call
```
1. User A: Clicks "Talk to User B" → Frontend
2. Frontend: socket.emit('call:invite', {toUserId: B, requestedSeconds: 300})
3. Backend:
   - Verify A is authenticated
   - Check if B is online (Redis presence)
   - Check cooldown (PostgreSQL)
   - Create invite (Redis, 30s TTL)
   - socket.to(B).emit('call:notify', {fromUser: A, ...})
4. User B: Sees notification → Sets duration (200s) → Accepts
5. Frontend B: socket.emit('call:accept', {inviteId, requestedSeconds: 200})
6. Backend:
   - Calculate average: (300 + 200) / 2 = 250s
   - Create room (Redis)
   - Mark both unavailable (Redis presence)
   - socket.to(A).emit('call:start', {roomId, agreedSeconds: 250})
   - socket.to(B).emit('call:start', {roomId, agreedSeconds: 250})
7. Frontend A & B:
   - Join room via Socket.io
   - Exchange WebRTC offer/answer/ICE (via Socket.io)
   - Establish peer-to-peer video connection
   - Start timer countdown (250s)
8. Timer expires OR user clicks "End Call":
   - socket.emit('call:end', {roomId})
   - Backend: Save to chat_history (PostgreSQL)
   - Backend: Set 24h cooldown (PostgreSQL)
   - Backend: Mark both available (Redis)
```

### Example 3: Presence Tracking
```
1. User connects to Socket.io:
   - socket.on('connect')
   - socket.emit('auth', {sessionToken})
2. Backend:
   - Verify token (check Redis cache → fallback to database)
   - Store mapping: activeSockets.set(userId, socketId)
   - Update Redis: SET presence:{userId} {online: true, available: false}
   - Broadcast: io.emit('presence:update', {userId, online: true})
3. User opens matchmaking:
   - socket.emit('queue:join')
   - Backend: Update Redis: SET presence:{userId} {available: true}
   - Broadcast: io.emit('queue:update', {userId, available: true})
4. User disconnects:
   - socket.on('disconnect')
   - Backend: Delete from Redis: DEL presence:{userId}
   - Broadcast: io.emit('presence:update', {userId, online: false})
```

---

## Scaling Thresholds

### 0-100 Users (Current State)
**Infrastructure:**
- Frontend: Vercel Hobby (free)
- Backend: 2 ECS tasks (t4g.micro)
- Database: db.t4g.micro
- Redis: cache.t4g.micro
- S3 + CloudFront: Pay-per-use

**Cost:** $125/month  
**Response Time:** <100ms  
**Uptime:** 99.9%

---

### 100-500 Users
**Infrastructure:**
- Frontend: Vercel Pro ($20/month)
- Backend: 2-3 ECS tasks (auto-scale)
- Database: db.t4g.small (2 vCPU, 2GB RAM)
- Redis: cache.t4g.small
- S3 + CloudFront: ~100GB storage

**Cost:** $265/month  
**Response Time:** <150ms  
**Uptime:** 99.95%

**Changes:**
- Enable database read replica
- Add CloudWatch detailed monitoring
- Configure DataDog dashboards

---

### 500-1,000 Users
**Infrastructure:**
- Frontend: Vercel Pro + Edge caching
- Backend: 3-5 ECS tasks (auto-scale on CPU)
- Database: db.t4g.medium (2 vCPU, 4GB RAM)
- Redis: cache.t4g.medium (cluster mode)
- S3 + CloudFront: ~250GB storage

**Cost:** $480/month  
**Response Time:** <200ms  
**Uptime:** 99.99%

**Changes:**
- Add database connection pooling (pgbouncer)
- Enable Redis cluster mode (3 shards)
- Configure auto-scaling policies

---

### 1,000-5,000 Users
**Infrastructure:**
- Frontend: Vercel Pro + multiple regions
- Backend: 5-8 ECS tasks (multi-region)
- Database: db.r6g.large (2 vCPU, 16GB RAM) + 2 read replicas
- Redis: cache.r6g.large (cluster mode, 6 shards)
- S3 + CloudFront: ~1TB storage

**Cost:** $1,380/month  
**Response Time:** <200ms globally  
**Uptime:** 99.99%

**Changes:**
- Multi-region deployment (US + EU)
- Database sharding (partition by user_id)
- Advanced caching (Redis + CDN)

---

### 5,000+ Users
**Infrastructure:**
- Custom architecture (contact for quote)
- Kubernetes (GKE or EKS)
- Multi-region active-active
- Database federation
- Advanced CDN (Cloudflare Enterprise)

**Cost:** $3,000+/month  
**Response Time:** <100ms globally  
**Uptime:** 99.999% (five nines)

**Changes:**
- Microservices architecture
- Service mesh (Istio)
- Global load balancing
- Advanced monitoring (full observability)

---

## Cost Breakdown (1,000 Users)

| Service | Monthly Cost | Annual Cost |
|---------|-------------|-------------|
| ECS Fargate (API) | $120 | $1,440 |
| RDS PostgreSQL | $80 | $960 |
| ElastiCache Redis | $50 | $600 |
| S3 Storage (250GB) | $6 | $72 |
| CloudFront (1TB transfer) | $85 | $1,020 |
| ALB (Load Balancer) | $25 | $300 |
| Vercel Pro | $20 | $240 |
| Twilio TURN | $80 | $960 |
| DataDog Monitoring | $15 | $180 |
| **Total** | **$481** | **$5,772** |

**Cost per user:** $0.48/month  
**Break-even (with $0.99 subscription):** ~480 users

---

## Monitoring Dashboards

### Key Metrics to Track

**Infrastructure:**
- CPU Utilization (target: <70%)
- Memory Utilization (target: <80%)
- Disk Space (target: <80%)
- Network Bandwidth (alert if >1TB/day spike)

**Application:**
- API Response Time (p50, p95, p99)
- Error Rate (target: <0.1%)
- Active Connections (Socket.io)
- Database Query Time (p95 <50ms)
- Cache Hit Rate (target: >90%)

**Business:**
- Daily Active Users (DAU)
- Signups per day
- Payment conversion rate
- Video calls per day
- Average call duration
- User retention (D1, D7, D30)

**Costs:**
- AWS daily spend
- Twilio TURN minutes
- S3 storage growth
- CloudFront bandwidth

---

## Security Checklist

### ✅ Implemented
- [x] HTTPS enforcement (TLS 1.3)
- [x] Database encryption at rest (AES-256)
- [x] Secure session tokens (UUID v4)
- [x] CORS configuration
- [x] Input validation (all endpoints)
- [x] SQL injection prevention (parameterized queries)
- [x] XSS protection (React auto-escaping)

### 🔄 To Implement
- [ ] bcrypt password hashing (currently plain text)
- [ ] Rate limiting (5 requests/second per IP)
- [ ] JWT tokens (replace session tokens)
- [ ] MFA for admin accounts (TOTP)
- [ ] Content Security Policy headers
- [ ] API key rotation (every 90 days)
- [ ] Penetration testing (quarterly)

### 🚨 Critical for Production
- [ ] WAF rules (block SQL injection, XSS patterns)
- [ ] DDoS protection (Cloudflare + AWS Shield)
- [ ] IP blocking (ban malicious IPs)
- [ ] Audit logging (who accessed what, when)
- [ ] Data retention policy (GDPR compliance)
- [ ] Privacy policy + Terms of Service
- [ ] HTTPS certificate auto-renewal
- [ ] Backup encryption (AES-256)

---

## Quick Commands Reference

### Database
```bash
# Connect to production database
psql -h napalmsky-db.xxxxx.rds.amazonaws.com -U postgres -d napalmsky_prod

# Run backup
pg_dump -h [endpoint] -U postgres napalmsky_prod > backup_$(date +%Y%m%d).sql

# Restore backup
psql -h [endpoint] -U postgres napalmsky_prod < backup_20251010.sql

# Check database size
SELECT pg_size_pretty(pg_database_size('napalmsky_prod'));

# Show slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Docker
```bash
# Build image
docker build -t napalmsky-api .

# Run locally
docker run -p 3001:3001 --env-file .env napalmsky-api

# Push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin [ecr-url]
docker tag napalmsky-api:latest [ecr-url]/napalmsky-api:latest
docker push [ecr-url]/napalmsky-api:latest
```

### ECS
```bash
# Deploy new version
aws ecs update-service --cluster napalmsky-prod --service napalmsky-api --force-new-deployment

# Scale instances
aws ecs update-service --cluster napalmsky-prod --service napalmsky-api --desired-count 5

# View logs
aws logs tail /aws/ecs/napalmsky-api --follow
```

### Monitoring
```bash
# Check API health
curl https://api.napalmsky.com/health

# Test load balancer
curl -I https://api.napalmsky.com

# Check SSL certificate
openssl s_client -connect api.napalmsky.com:443 -servername api.napalmsky.com

# Test WebSocket
wscat -c wss://api.napalmsky.com/socket.io/
```

---

## Emergency Contacts

**Cloud Provider Issues:**
- AWS Support: https://console.aws.amazon.com/support/
- Vercel Support: https://vercel.com/help

**Service Issues:**
- Stripe Status: https://status.stripe.com/
- Twilio Status: https://status.twilio.com/
- Cloudflare Status: https://www.cloudflarestatus.com/

**Monitoring:**
- DataDog Alerts: https://app.datadoghq.com/monitors
- Sentry Errors: https://sentry.io/organizations/napalmsky/issues/

**On-Call Rotation:**
- Primary: [Your Email]
- Secondary: [Team Email]
- PagerDuty: https://napalmsky.pagerduty.com

---

## Next Steps

1. **Read Full Strategy:** `CLOUD-DEPLOYMENT-STRATEGY.md` (comprehensive 10K+ word guide)
2. **Follow Checklist:** `DEPLOYMENT-CHECKLIST.md` (step-by-step tasks)
3. **Set up AWS Account:** Create account, configure IAM, add payment
4. **Provision Database:** Follow Day 1-2 tasks from checklist
5. **Deploy Backend:** Follow Week 2 tasks from checklist

**Estimated Timeline:** 6-8 weeks to production-ready

**Need Help?** Review the documentation files:
- Technical details → `CLOUD-DEPLOYMENT-STRATEGY.md`
- Step-by-step guide → `DEPLOYMENT-CHECKLIST.md`
- Current issues → `KNOWN-ISSUES.md`
- Testing → `TESTING-GUIDE.md`

---

*Architecture designed for Napalm Sky - Speed Dating Platform*  
*Last updated: October 10, 2025*

