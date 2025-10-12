# 🚀 Quick Deployment Checklist

This is a condensed action checklist extracted from the comprehensive Cloud Deployment Strategy.

---

## Pre-Deployment Setup (1 Day)

### 1. Cloud Account Setup
- [ ] Create AWS account (or Fly.io/GCP/Azure)
- [ ] Add payment method
- [ ] Enable MFA on root account
- [ ] Create IAM admin user (AWS)
- [ ] Install AWS CLI: `brew install awscli` (Mac) or `curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"` (Linux)
- [ ] Configure credentials: `aws configure`

### 2. Domain Setup
- [ ] Purchase domain (napalmsky.com) - $10-15/year
- [ ] Create Cloudflare account (free tier)
- [ ] Add domain to Cloudflare DNS
- [ ] Update nameservers at domain registrar

### 3. Service Accounts
- [ ] Stripe: Create production account, get live API keys
- [ ] Twilio: Sign up for TURN server service ($20 credit free)
- [ ] DataDog/Sentry: Create monitoring account (free tier)

---

## Week 1: Database & Storage

### Day 1-2: Database Setup
```bash
# AWS RDS PostgreSQL
- [ ] Navigate to RDS Console
- [ ] Click "Create Database"
- [ ] Select: PostgreSQL 15
- [ ] Instance: db.t4g.micro (Dev) or db.t4g.small (Prod)
- [ ] Storage: 20GB SSD, enable autoscaling to 100GB
- [ ] VPC: Default VPC, create new security group
- [ ] Security Group: Allow port 5432 from your IP + ECS subnet
- [ ] Set master password (save in password manager!)
- [ ] Enable automated backups (7-day retention)
- [ ] Enable Multi-AZ for production
- [ ] Wait ~10 minutes for creation
- [ ] Copy endpoint URL: `napalmsky-db.xxxxx.us-east-1.rds.amazonaws.com`
```

```bash
# Run Schema Creation
- [ ] Connect: `psql -h [endpoint] -U postgres -d napalmsky`
- [ ] Copy schema from CLOUD-DEPLOYMENT-STRATEGY.md Section 2.1
- [ ] Execute CREATE TABLE statements
- [ ] Verify: `\dt` (should show 10+ tables)
- [ ] Create read replica: RDS Console → Actions → Create read replica
```

### Day 3-4: File Storage (S3)
```bash
# Create S3 Bucket
- [ ] Navigate to S3 Console
- [ ] Click "Create Bucket"
- [ ] Name: napalmsky-media-prod
- [ ] Region: us-east-1 (or closest to users)
- [ ] Block Public Access: OFF (we'll use signed URLs)
- [ ] Versioning: Enabled
- [ ] Encryption: Enable (AES-256)
- [ ] Create bucket

# CloudFront CDN Setup
- [ ] Navigate to CloudFront Console
- [ ] Create Distribution
- [ ] Origin: napalmsky-media-prod.s3.amazonaws.com
- [ ] Viewer Protocol: Redirect HTTP to HTTPS
- [ ] Cache Policy: CachingOptimized
- [ ] Price Class: Use all edge locations (or limit to US/EU)
- [ ] Wait ~15 minutes for deployment
- [ ] Copy Distribution URL: `d1234567890abcd.cloudfront.net`
- [ ] (Optional) Add custom domain: cdn.napalmsky.com
```

```bash
# Migrate Existing Uploads
cd server
aws s3 sync uploads/ s3://napalmsky-media-prod/users/
```

### Day 5-6: Code Migration
```bash
# Install Dependencies
cd server
npm install pg @aws-sdk/client-s3 @aws-sdk/s3-request-presigner bcrypt

# Update .env
- [ ] Copy DATABASE_URL from RDS endpoint
- [ ] Copy AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
- [ ] Copy CDN_BASE_URL from CloudFront

# Replace store.ts with database
- [ ] Copy database.ts from Section 7.3
- [ ] Update auth.ts, media.ts, user.ts to use query()
- [ ] Test locally: npm run dev
- [ ] Verify signup works with database
- [ ] Verify file uploads go to S3
```

### Day 7: Environment Variables
```bash
# Create production .env
- [ ] Copy template from Section 7.1
- [ ] Replace ALL placeholders with real values
- [ ] Test: `node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL);"`
```

---

## Week 2: Deployment & Scaling

### Day 8-9: Redis Setup
```bash
# AWS ElastiCache
- [ ] Navigate to ElastiCache Console
- [ ] Create Redis Cluster
- [ ] Version: Redis 7.x
- [ ] Node type: cache.t4g.micro
- [ ] Number of replicas: 1
- [ ] Subnet group: Same VPC as RDS
- [ ] Security group: Allow port 6379 from ECS
- [ ] Wait ~10 minutes
- [ ] Copy endpoint: napalmsky-redis.xxxxx.cache.amazonaws.com

# Update code
cd server
npm install @socket.io/redis-adapter redis
- [ ] Copy Socket.io clustering code from Section 7.5
- [ ] Update index.ts
- [ ] Test locally (need Redis running)
```

### Day 10-11: Container Deployment
```bash
# Create Dockerfile
- [ ] Create server/Dockerfile:

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]

# Build and push to AWS ECR
aws ecr create-repository --repository-name napalmsky-api
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin [account-id].dkr.ecr.us-east-1.amazonaws.com
docker build -t napalmsky-api .
docker tag napalmsky-api:latest [account-id].dkr.ecr.us-east-1.amazonaws.com/napalmsky-api:latest
docker push [account-id].dkr.ecr.us-east-1.amazonaws.com/napalmsky-api:latest
```

```bash
# Create ECS Cluster
- [ ] Navigate to ECS Console
- [ ] Create Cluster: napalmsky-prod
- [ ] Infrastructure: AWS Fargate (serverless)

# Create Task Definition
- [ ] Navigate to Task Definitions
- [ ] Create new task definition
- [ ] Name: napalmsky-api
- [ ] Container:
      Image: [ECR URL from above]
      CPU: 512 (0.5 vCPU)
      Memory: 1024 (1GB)
      Port: 3001
      Environment variables: Load from .env
- [ ] Create

# Create Service
- [ ] Navigate to cluster → Services → Create
- [ ] Launch type: Fargate
- [ ] Task definition: napalmsky-api
- [ ] Desired tasks: 2 (high availability)
- [ ] Load balancer: Create new Application Load Balancer
- [ ] Target group: HTTP 3001
- [ ] Health check: /health
- [ ] Auto-scaling: Target tracking (CPU 70%)
- [ ] Min: 2, Max: 10
- [ ] Wait ~5 minutes for deployment
```

### Day 12-13: Load Balancer & DNS
```bash
# Application Load Balancer (created with ECS Service)
- [ ] Navigate to EC2 → Load Balancers
- [ ] Find napalmsky-alb
- [ ] Copy DNS name: napalmsky-alb-123456789.us-east-1.elb.amazonaws.com

# Configure DNS (Cloudflare)
- [ ] Add A record: api.napalmsky.com → [ALB IP]
   OR
- [ ] Add CNAME: api.napalmsky.com → [ALB DNS name]
- [ ] Add A record: www.napalmsky.com → [Vercel IP]
- [ ] Add A record: napalmsky.com → [Vercel IP]
```

### Day 14: SSL Certificates
```bash
# AWS Certificate Manager
- [ ] Navigate to ACM Console
- [ ] Request certificate
- [ ] Domain: *.napalmsky.com (wildcard)
- [ ] Validation: DNS validation
- [ ] Copy CNAME records to Cloudflare DNS
- [ ] Wait ~5-15 minutes for validation
- [ ] Attach certificate to ALB:
      ALB → Listeners → Add HTTPS:443
      Certificate: Select from ACM
      Redirect HTTP → HTTPS
```

---

## Week 3: Frontend Deployment

### Day 15-16: Vercel Deployment
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd /Users/hansonyan/Desktop/Napalmsky
vercel login
vercel --prod

# Configure Environment Variables (Vercel Dashboard)
- [ ] NEXT_PUBLIC_API_BASE=https://api.napalmsky.com
- [ ] NEXT_PUBLIC_SOCKET_URL=https://api.napalmsky.com
- [ ] Redeploy to apply changes

# Configure Custom Domain
- [ ] Vercel Dashboard → Settings → Domains
- [ ] Add: napalmsky.com
- [ ] Add: www.napalmsky.com
- [ ] Copy DNS records to Cloudflare
```

### Day 17-18: WebRTC TURN Server
```bash
# Twilio Setup
- [ ] Sign up: https://www.twilio.com/console
- [ ] Navigate to: Console → Network Traversal Service
- [ ] Create API Key → Copy credentials
- [ ] Update .env:
      TURN_SERVER=turn:global.turn.twilio.com:3478
      TURN_USERNAME=[from console]
      TURN_CREDENTIAL=[from console]

# Update Frontend
- [ ] Update app/room/[roomId]/page.tsx with TURN config (Section 7.6)
- [ ] Redeploy frontend
- [ ] Test video call from behind corporate firewall
```

---

## Week 4: Monitoring & Security

### Day 19-20: Monitoring Setup
```bash
# Sentry (Error Tracking)
- [ ] Sign up: https://sentry.io
- [ ] Create project: napalmsky-prod
- [ ] Copy DSN
- [ ] Install: npm install @sentry/node @sentry/nextjs
- [ ] Configure in server/src/index.ts and next.config.js
- [ ] Test: throw new Error('Test error')

# DataDog (Metrics)
- [ ] Sign up: https://www.datadoghq.com
- [ ] Install agent on ECS:
      Add datadog/agent:latest as sidecar container
      API_KEY from DataDog console
- [ ] Create dashboards for: CPU, Memory, Response Time, Error Rate
```

### Day 21-22: Security Hardening
```bash
# Enable bcrypt password hashing
- [ ] Update auth.ts with bcrypt (Section 7.7)
- [ ] Test login/signup

# Rate Limiting
npm install express-rate-limit
- [ ] Add to server:
      import rateLimit from 'express-rate-limit';
      const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
      });
      app.use('/api/', limiter);

# Security Headers
npm install helmet
- [ ] Add: app.use(helmet());

# OWASP ZAP Scan
- [ ] Download: https://www.zaproxy.org/download/
- [ ] Run automated scan on https://napalmsky.com
- [ ] Fix any HIGH/CRITICAL issues
```

### Day 23-24: Load Testing
```bash
# Install Artillery
npm install -g artillery

# Create load-test.yml
- [ ] Copy from examples online
- [ ] Configure: 1000 virtual users, 5 min duration
- [ ] Target: https://api.napalmsky.com

# Run Test
artillery run load-test.yml

# Monitor:
- [ ] DataDog dashboards (CPU, memory, response time)
- [ ] ECS auto-scaling (should scale from 2 → 4+ instances)
- [ ] Database connections (should be <50% of max)
- [ ] Error rate (should be <1%)

# Optimize:
- [ ] If slow queries: Add database indexes
- [ ] If high CPU: Increase instance size or count
- [ ] If high memory: Check for memory leaks
```

---

## Week 5: Beta Testing & Launch Prep

### Day 25-26: Beta Testing
```bash
# Invite Beta Testers
- [ ] Create list of 50-100 testers
- [ ] Generate admin invite codes: POST /payment/admin/generate-code-test
- [ ] Send emails with:
      - Signup link with code
      - Testing instructions
      - Feedback form (Google Forms)

# Monitor Beta
- [ ] Check Sentry for errors (daily)
- [ ] Review DataDog metrics (daily)
- [ ] Read feedback forms (daily)
- [ ] Fix critical bugs within 24 hours
```

### Day 27: Final Checklist
```bash
# Pre-Launch Verification
- [ ] SSL certificates valid (check https://napalmsky.com)
- [ ] Video calls work (test with 2 devices)
- [ ] Payment flow works (test Stripe $0.01 charge)
- [ ] Invite codes work (test QR code signup)
- [ ] Monitoring alerts configured (test by triggering)
- [ ] Backups enabled (verify last backup timestamp)
- [ ] DNS propagation complete (check https://dnschecker.org)
- [ ] Terms of Service + Privacy Policy published
- [ ] Support email configured (support@napalmsky.com)
- [ ] Analytics tracking (Google Analytics or Mixpanel)

# Performance Benchmarks
- [ ] Homepage load time: <2 seconds
- [ ] API response time: <200ms (p95)
- [ ] Video call connect time: <5 seconds
- [ ] WebRTC success rate: >95%
```

### Day 28: LAUNCH 🚀
```bash
# Launch Day Tasks
- [ ] 9:00 AM: Final backup of database
- [ ] 9:30 AM: Verify health checks passing
- [ ] 10:00 AM: Update DNS to production (if using separate staging)
- [ ] 10:30 AM: Monitor error rates (should be ~0%)
- [ ] 11:00 AM: Send launch announcement (email, social media)
- [ ] 12:00 PM: Post on Product Hunt / Reddit / HackerNews
- [ ] 2:00 PM: Check user signups (goal: 10+ in first 2 hours)
- [ ] 5:00 PM: Review metrics and fix any issues
- [ ] 8:00 PM: Set up on-call rotation (PagerDuty)

# Post-Launch Monitoring (48 hours)
- [ ] Check Sentry every 2 hours
- [ ] Review DataDog dashboards every 4 hours
- [ ] Respond to user feedback within 2 hours
- [ ] Fix critical bugs within 6 hours
- [ ] Celebrate! 🎉
```

---

## Monthly Maintenance

### Week 1 of Month
- [ ] Review AWS bill (optimize unused resources)
- [ ] Review Sentry errors (fix common issues)
- [ ] Database backup restoration test
- [ ] Security patches (update dependencies)
- [ ] Performance review (slow queries, optimization)

### Week 2 of Month
- [ ] User feedback review (plan features)
- [ ] A/B testing results (conversion optimization)
- [ ] Marketing metrics (CAC, LTV, churn)
- [ ] Content updates (blog, social media)

### Week 3 of Month
- [ ] Infrastructure scaling review (right-size instances)
- [ ] CDN cache hit rate (optimize caching)
- [ ] Database indexes (add for slow queries)
- [ ] Code refactoring (technical debt)

### Week 4 of Month
- [ ] Security audit (OWASP scan)
- [ ] Penetration testing (hire consultant)
- [ ] Disaster recovery drill (test failover)
- [ ] Documentation updates

---

## Emergency Procedures

### Database Failure
1. Check RDS console for status
2. If Multi-AZ: Automatic failover (wait 2 minutes)
3. If single-AZ: Restore from latest snapshot (10-30 min)
4. Update connection string if endpoint changed
5. Verify application connectivity

### API Server Down
1. Check ECS console: Task status
2. Check CloudWatch logs: Errors in /aws/ecs/napalmsky-api
3. If unhealthy: ECS auto-replaces task (wait 2 minutes)
4. If scaling issue: Manually increase desired count
5. If critical: Rollback to previous task definition

### High Error Rate (>1%)
1. Check Sentry: Identify error type
2. Check DataDog: Correlate with metrics spike
3. If database: Check connection pool exhaustion
4. If memory: Check for memory leak (restart tasks)
5. If external API: Check Stripe/Twilio status pages

---

## Cost Optimization Tips

### Monthly Review (Save 20-40%)
- [ ] Delete unused S3 files (temp uploads)
- [ ] Right-size RDS instance (downgrade if CPU <20%)
- [ ] Enable S3 Intelligent-Tiering (auto-move to cheaper storage)
- [ ] Review CloudFront cache settings (increase TTL)
- [ ] Delete old CloudWatch logs (>30 days)
- [ ] Use Spot Instances for non-critical tasks
- [ ] Reserve instances for baseline capacity (1-year commit)

### Monitoring Alerts
Set up billing alerts:
- [ ] $50/month (warning)
- [ ] $100/month (investigate)
- [ ] $200/month (urgent review)

---

## Success Metrics (First 3 Months)

### Month 1: Launch
- [ ] 500+ signups
- [ ] 200+ paid users (40% conversion)
- [ ] 100+ daily active users (20% retention)
- [ ] <0.5% error rate
- [ ] <$500 infrastructure costs

### Month 2: Growth
- [ ] 2,000+ signups (4x growth)
- [ ] 800+ paid users
- [ ] 400+ daily active users
- [ ] 95%+ WebRTC success rate
- [ ] <$1,000 infrastructure costs

### Month 3: Scale
- [ ] 5,000+ signups (2.5x growth)
- [ ] 2,000+ paid users
- [ ] 1,000+ daily active users
- [ ] Break-even or profitable
- [ ] <$2,000 infrastructure costs

---

**Total Implementation Time:** 6-8 weeks  
**Estimated Setup Costs:** $500-1,000  
**Monthly Operating Costs:** $125-500 (scales with users)  

For detailed technical implementation, refer to `CLOUD-DEPLOYMENT-STRATEGY.md`.

