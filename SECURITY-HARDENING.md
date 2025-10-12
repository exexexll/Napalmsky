# 🔒 Security Hardening Checklist for Napalm Sky

> **Production-Ready Security - Protect Your Users & Platform**  
> **Created:** October 10, 2025  
> **Compliance:** GDPR, CCPA, OWASP Top 10

---

## Executive Summary

This comprehensive security checklist covers **authentication, data protection, network security, and compliance** for production deployment. Each item includes implementation guidance and priority level.

**Critical Security Fixes from Review:**
- ⚠️ **TURN Credentials** - Move to backend endpoint (CRITICAL)
- ⚠️ **Rate Limiting** - Prevent brute force attacks (HIGH)
- ⚠️ **Password Hashing** - Replace plain text with bcrypt (CRITICAL)

---

## Table of Contents

1. [Pre-Deployment Critical Fixes](#1-pre-deployment-critical-fixes)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Data Protection](#3-data-protection)
4. [Network Security](#4-network-security)
5. [Application Security](#5-application-security)
6. [Infrastructure Security](#6-infrastructure-security)
7. [Monitoring & Incident Response](#7-monitoring--incident-response)
8. [Compliance (GDPR/CCPA)](#8-compliance-gdprccpa)
9. [Security Testing](#9-security-testing)
10. [Security Maintenance Schedule](#10-security-maintenance-schedule)

---

## 1. Pre-Deployment Critical Fixes

### ⚠️ CRITICAL: TURN Credentials Exposure

**Issue:** TURN credentials exposed in client-side code via `NEXT_PUBLIC_` environment variables.

**Risk:** Anyone can view source code and steal credentials to use your TURN server.

**Fix Required:**

```typescript
// ❌ INSECURE (Current)
// Frontend: app/room/[roomId]/page.tsx
const turnConfig = {
  urls: process.env.NEXT_PUBLIC_TURN_SERVER,
  username: process.env.NEXT_PUBLIC_TURN_USERNAME, // ⚠️ EXPOSED
  credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL
};

// ✅ SECURE (Required)
// Backend: server/src/turn.ts
router.get('/turn/credentials', requireAuth, async (req, res) => {
  // Generate time-limited credentials (1 hour)
  const response = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${process.env.CLOUDFLARE_TURN_KEY}/credentials/generate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ttl: 3600 })
    }
  );
  
  const { iceServers } = await response.json();
  res.json({ iceServers, expiresAt: Date.now() + 3600000 });
});

// Frontend: Fetch from backend
const { iceServers } = await fetch(`${API_BASE}/turn/credentials`, {
  headers: { 'Authorization': `Bearer ${sessionToken}` }
}).then(r => r.json());
```

**Checklist:**
- [ ] Create `/turn/credentials` endpoint (backend)
- [ ] Add `requireAuth` middleware
- [ ] Remove `NEXT_PUBLIC_TURN_*` variables
- [ ] Update frontend to fetch from backend
- [ ] Test video calls still work
- [ ] Verify credentials expire after 1 hour

---

### ⚠️ CRITICAL: Password Hashing

**Issue:** Passwords stored in plain text in database.

**Risk:** Database breach exposes all user passwords.

**Fix Required:**

```typescript
// ❌ INSECURE (Current)
// server/src/auth.ts
const user: User = {
  userId: uuidv4(),
  email: req.body.email,
  password: req.body.password // Plain text!
};

// Login check
if (user.password !== req.body.password) {
  return res.status(401).json({ error: 'Invalid credentials' });
}

// ✅ SECURE (Required)
import bcrypt from 'bcrypt';

// Registration
const password_hash = await bcrypt.hash(req.body.password, 12); // Cost factor 12
const user: User = {
  userId: uuidv4(),
  email: req.body.email,
  password_hash // Hashed!
};

// Login check
const valid = await bcrypt.compare(req.body.password, user.password_hash);
if (!valid) {
  return res.status(401).json({ error: 'Invalid credentials' });
}
```

**Checklist:**
- [ ] Install bcrypt: `npm install bcrypt @types/bcrypt`
- [ ] Update registration to hash passwords (cost factor: 12)
- [ ] Update login to compare with bcrypt
- [ ] Update database schema: `password` → `password_hash`
- [ ] Migrate existing users (force password reset)
- [ ] Test login/registration still works
- [ ] Document password policy (min 8 chars, etc.)

---

### 🔴 HIGH: Rate Limiting

**Issue:** No rate limiting on authentication endpoints.

**Risk:** Brute force attacks, credential stuffing, DDoS.

**Fix Required:**

```typescript
// server/src/rate-limit.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL });
await redisClient.connect();

// Auth endpoints: 5 attempts per 15 minutes
export const authLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:auth:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again in 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// API endpoints: 100 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please slow down',
});

// TURN endpoint: 10 per hour
export const turnLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many TURN credential requests',
});

// Apply to routes
app.use('/auth', authLimiter);
app.use('/api', apiLimiter);
app.use('/turn', turnLimiter);
```

**Checklist:**
- [ ] Install: `npm install express-rate-limit rate-limit-redis`
- [ ] Create rate-limit.ts middleware
- [ ] Apply to auth routes (5/15min)
- [ ] Apply to API routes (100/15min)
- [ ] Apply to TURN route (10/hour)
- [ ] Test rate limiting works (try >5 failed logins)
- [ ] Add logging for rate limit violations
- [ ] Monitor false positives (legitimate users blocked)

---

## 2. Authentication & Authorization

### 2.1 Session Management

**Secure Session Tokens:**
```typescript
// ✅ Use cryptographically secure tokens
import { v4 as uuidv4 } from 'uuid';

const sessionToken = uuidv4(); // 128-bit random
// Example: "550e8400-e29b-41d4-a716-446655440000"

// ❌ Don't use predictable tokens
// const sessionToken = Date.now().toString(); // INSECURE
```

**Session Expiry:**
```typescript
// Guest accounts: 7 days
const guestExpiry = Date.now() + (7 * 24 * 60 * 60 * 1000);

// Permanent accounts: 30 days
const permanentExpiry = Date.now() + (30 * 24 * 60 * 60 * 1000);

// Admin accounts: 1 day (more sensitive)
const adminExpiry = Date.now() + (1 * 24 * 60 * 60 * 1000);
```

**Session Rotation:**
```typescript
// On privilege escalation
function upgradeToAdmin(userId: string, oldSession: string) {
  // Delete old session
  store.deleteSession(oldSession);
  
  // Create new session with elevated privileges
  const newSession = createSession(userId, { role: 'admin' });
  
  return newSession;
}
```

**Checklist:**
- [ ] Use UUIDs for session tokens
- [ ] Set appropriate expiry times
- [ ] Implement session rotation on privilege change
- [ ] Store session IP address (for audit)
- [ ] Implement "logout from all devices" feature
- [ ] Auto-cleanup expired sessions (daily cron)

---

### 2.2 Multi-Factor Authentication (Admin)

**TOTP Implementation:**
```typescript
// For admin/moderator accounts only (initially)
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

// Setup MFA
router.post('/admin/mfa/setup', requireAdmin, async (req, res) => {
  const secret = speakeasy.generateSecret({
    name: `Napalm Sky (${req.user.name})`,
    issuer: 'Napalm Sky'
  });
  
  // Generate QR code
  const qrCode = await QRCode.toDataURL(secret.otpauth_url);
  
  // Store secret (encrypted!)
  await updateUser(req.userId, {
    mfaSecret: encrypt(secret.base32),
    mfaEnabled: false // Not enabled until verified
  });
  
  res.json({ qrCode, secret: secret.base32 });
});

// Verify MFA
router.post('/admin/mfa/verify', requireAdmin, async (req, res) => {
  const { token } = req.body;
  const user = await getUser(req.userId);
  
  const verified = speakeasy.totp.verify({
    secret: decrypt(user.mfaSecret),
    encoding: 'base32',
    token: token,
    window: 1 // Allow 1 step before/after for clock skew
  });
  
  if (verified) {
    await updateUser(req.userId, { mfaEnabled: true });
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid code' });
  }
});

// Enforce MFA on admin login
router.post('/admin/login', async (req, res) => {
  const user = await authenticateUser(req.body);
  
  if (user.mfaEnabled) {
    // Return temporary token (not full session)
    const tempToken = createTempToken(user.userId);
    return res.json({ requiresMFA: true, tempToken });
  }
  
  // Normal login flow
  const session = createSession(user.userId);
  res.json({ sessionToken: session.sessionToken });
});
```

**Checklist:**
- [ ] Install: `npm install speakeasy qrcode`
- [ ] Implement MFA setup endpoint
- [ ] Implement MFA verification endpoint
- [ ] Enforce MFA for admin accounts
- [ ] Provide backup codes (if user loses device)
- [ ] Test with Google Authenticator app
- [ ] Document MFA setup in admin guide

---

### 2.3 Password Policy

**Strong Password Requirements:**
```typescript
function validatePassword(password: string): { valid: boolean; error?: string } {
  // Minimum 8 characters
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  
  // At least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  
  // At least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  
  // At least one number
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  
  // (Optional) At least one special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character' };
  }
  
  // Check against common passwords
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    return { valid: false, error: 'Password is too common, please choose a different one' };
  }
  
  return { valid: true };
}
```

**Checklist:**
- [ ] Implement password validation function
- [ ] Enforce on registration and password change
- [ ] Add common password list (top 10,000)
- [ ] Display password strength indicator (frontend)
- [ ] Implement "forgot password" flow
- [ ] Require password change after account compromise

---

## 3. Data Protection

### 3.1 Encryption at Rest

**Database Encryption (RDS):**
```bash
# Enable encryption at rest (must be done at creation)
aws rds create-db-instance \
  --db-instance-identifier napalmsky-db \
  --storage-encrypted \
  --kms-key-id arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012 \
  --engine postgres \
  --engine-version 15.3
```

**S3 Encryption:**
```bash
# Enable default encryption for bucket
aws s3api put-bucket-encryption \
  --bucket napalmsky-media-prod \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

**Checklist:**
- [ ] Enable RDS encryption at rest (AES-256)
- [ ] Enable S3 bucket encryption (AES-256)
- [ ] Enable EBS encryption for EC2 volumes
- [ ] Use AWS KMS for key management
- [ ] Rotate encryption keys annually
- [ ] Document encryption key recovery procedure

---

### 3.2 Encryption in Transit

**TLS/HTTPS Everywhere:**
```typescript
// Force HTTPS on all endpoints
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// Strict Transport Security (HSTS)
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  next();
});

// Upgrade insecure requests
res.setHeader('Content-Security-Policy', 'upgrade-insecure-requests');
```

**Database Connections:**
```javascript
// PostgreSQL: Require SSL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca-certificate.crt').toString()
  }
});

// Redis: Use TLS connection
const redisClient = createClient({
  url: process.env.REDIS_URL, // rediss:// (not redis://)
  socket: {
    tls: true,
    rejectUnauthorized: true
  }
});
```

**Checklist:**
- [ ] Enforce HTTPS (redirect HTTP → HTTPS)
- [ ] Enable HSTS header (1 year)
- [ ] Use TLS 1.3 (disable TLS 1.0, 1.1)
- [ ] Configure SSL certificates (ACM or Let's Encrypt)
- [ ] Enable SSL for database connections
- [ ] Enable TLS for Redis connections
- [ ] Test with SSL Labs (A+ rating)

---

### 3.3 Sensitive Data Handling

**Never Log Sensitive Data:**
```typescript
// ❌ BAD
console.log('User login:', { email, password });

// ✅ GOOD
console.log('User login:', { email, password: '[REDACTED]' });

// Sanitize logs automatically
function sanitizeLogs(data: any) {
  const sensitive = ['password', 'sessionToken', 'apiKey', 'secret'];
  const sanitized = { ...data };
  
  for (const key of sensitive) {
    if (sanitized[key]) {
      sanitized[key] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

console.log('User data:', sanitizeLogs(user));
```

**Secure Data Deletion:**
```typescript
// GDPR: Right to be forgotten
async function deleteUserData(userId: string) {
  // 1. Delete user record (or anonymize)
  await db.query('UPDATE users SET name = $1, email = NULL, selfie_url = NULL WHERE user_id = $2', 
    [`Deleted User ${userId.substring(0, 8)}`, userId]);
  
  // 2. Delete media files from S3
  const userFiles = await s3.listObjects({
    Bucket: 'napalmsky-media-prod',
    Prefix: `users/${userId}/`
  });
  
  await s3.deleteObjects({
    Bucket: 'napalmsky-media-prod',
    Delete: { Objects: userFiles.Contents.map(f => ({ Key: f.Key })) }
  });
  
  // 3. Delete chat history
  await db.query('DELETE FROM chat_history WHERE user_id = $1 OR partner_id = $1', [userId]);
  
  // 4. Invalidate sessions
  await db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
  
  // 5. Log deletion (audit trail)
  await db.query('INSERT INTO audit_log (action, user_id, timestamp) VALUES ($1, $2, $3)',
    ['USER_DELETED', userId, Date.now()]);
  
  console.log(`User ${userId} data deleted`);
}
```

**Checklist:**
- [ ] Never log passwords, tokens, or API keys
- [ ] Sanitize logs automatically
- [ ] Implement secure data deletion (GDPR)
- [ ] Anonymize data instead of deleting (if needed for analytics)
- [ ] Keep audit trail of deletions
- [ ] Test data deletion process

---

## 4. Network Security

### 4.1 VPC Configuration

**Private Subnets:**
```yaml
# Database and Redis should NOT have public IPs
VPC:
  CIDR: 10.0.0.0/16
  
  PublicSubnets:
    - 10.0.1.0/24 (us-east-1a) # Load balancer
    - 10.0.2.0/24 (us-east-1b) # Load balancer
  
  PrivateSubnets:
    - 10.0.10.0/24 (us-east-1a) # ECS tasks, RDS, Redis
    - 10.0.11.0/24 (us-east-1b) # ECS tasks, RDS, Redis

InternetGateway: Public subnets only
NATGateway: For private subnets to reach internet (updates, etc.)
```

**Security Groups:**
```yaml
# ALB Security Group
alb-sg:
  IngressRules:
    - Port: 443 (HTTPS)
      Source: 0.0.0.0/0 (Internet)
    - Port: 80 (HTTP)
      Source: 0.0.0.0/0 (Internet)
  EgressRules:
    - Port: 3001
      Destination: ecs-sg (Backend tasks)

# ECS Tasks Security Group
ecs-sg:
  IngressRules:
    - Port: 3001
      Source: alb-sg (Load balancer only)
  EgressRules:
    - Port: 5432
      Destination: rds-sg (Database)
    - Port: 6379
      Destination: redis-sg (Redis)
    - Port: 443
      Destination: 0.0.0.0/0 (Internet for API calls)

# RDS Security Group
rds-sg:
  IngressRules:
    - Port: 5432
      Source: ecs-sg (Application servers only)
  EgressRules: None

# Redis Security Group
redis-sg:
  IngressRules:
    - Port: 6379
      Source: ecs-sg (Application servers only)
  EgressRules: None
```

**Checklist:**
- [ ] Create VPC with public and private subnets
- [ ] Place database in private subnet (no public IP)
- [ ] Place Redis in private subnet
- [ ] Configure security groups (whitelist only)
- [ ] Use security group references (not IP addresses)
- [ ] Enable VPC Flow Logs (audit network traffic)
- [ ] Review security groups quarterly

---

### 4.2 WAF (Web Application Firewall)

**AWS WAF Rules:**
```yaml
# Block common attack patterns
WAF:
  Rules:
    - Name: SQL Injection Protection
      Priority: 1
      Action: BLOCK
      Statement: Matches SQL injection patterns
    
    - Name: XSS Protection
      Priority: 2
      Action: BLOCK
      Statement: Matches XSS patterns
    
    - Name: Rate Limiting (IP)
      Priority: 3
      Action: BLOCK
      Statement: >100 requests/5 minutes from single IP
    
    - Name: Geo Blocking (Optional)
      Priority: 4
      Action: BLOCK
      Statement: Block specific countries (if needed)
    
    - Name: Known Bad IPs
      Priority: 5
      Action: BLOCK
      Statement: IP reputation list
```

**Cloudflare WAF (Alternative):**
```
# Free tier includes:
- OWASP Top 10 protection
- DDoS mitigation (unlimited)
- Rate limiting (basic)
- IP reputation blocking

# Enable in Cloudflare Dashboard:
Security → WAF → Managed Rules → Enable
```

**Checklist:**
- [ ] Enable AWS WAF on ALB (or Cloudflare WAF)
- [ ] Configure SQL injection protection
- [ ] Configure XSS protection
- [ ] Enable rate limiting (IP-based)
- [ ] Add known malicious IPs to blocklist
- [ ] Monitor WAF logs weekly
- [ ] Fine-tune rules (reduce false positives)

---

### 4.3 DDoS Protection

**AWS Shield Standard (Free):**
- Automatic protection against L3/L4 attacks
- Enabled by default on ALB, CloudFront
- No configuration needed

**Cloudflare (Free):**
- Unlimited DDoS mitigation
- Automatic traffic filtering
- 200+ global data centers

**Application-Level Protection:**
```typescript
// Connection limits
const server = http.createServer(app);
server.maxConnections = 10000; // Prevent connection exhaustion

// Socket.io rate limiting
io.use((socket, next) => {
  const ip = socket.handshake.address;
  
  // Max 10 connections per IP
  const connections = getConnectionCount(ip);
  if (connections > 10) {
    console.warn(`[DDoS] Blocked excessive connections from ${ip}`);
    return next(new Error('Too many connections'));
  }
  
  next();
});
```

**Checklist:**
- [ ] AWS Shield Standard enabled (auto)
- [ ] Cloudflare proxy enabled (optional but recommended)
- [ ] Configure connection limits
- [ ] Add Socket.io rate limiting
- [ ] Monitor traffic patterns (detect anomalies)
- [ ] Create DDoS response plan
- [ ] Test with load testing tool (verify thresholds)

---

## 5. Application Security

### 5.1 Input Validation & Sanitization

**Validate All Inputs:**
```typescript
// Use validation library
import Joi from 'joi';

const userSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  gender: Joi.string().valid('female', 'male', 'nonbinary', 'unspecified').required()
});

router.post('/auth/guest', async (req, res) => {
  // Validate input
  const { error, value } = userSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  
  // Safe to use validated data
  const user = await createUser(value);
  res.json(user);
});
```

**Sanitize User Content:**
```typescript
// Sanitize chat messages (prevent XSS)
import DOMPurify from 'isomorphic-dompurify';

socket.on('room:chat', ({ roomId, text }) => {
  // Sanitize input
  let sanitized = text || '';
  
  // Strip HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Limit length
  sanitized = sanitized.substring(0, 500);
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Don't send empty messages
  if (!sanitized) {
    return;
  }
  
  const message = {
    from: currentUserId,
    text: sanitized,
    timestamp: Date.now(),
    type: 'message'
  };
  
  io.to(roomId).emit('room:chat', message);
});
```

**Checklist:**
- [ ] Install validation library (Joi or Zod)
- [ ] Validate all user inputs (backend)
- [ ] Sanitize text content (HTML strip)
- [ ] Limit input lengths (prevent DoS)
- [ ] Validate file uploads (type, size)
- [ ] Use parameterized SQL queries (prevent injection)
- [ ] Test with malicious payloads

---

### 5.2 SQL Injection Prevention

**Always Use Parameterized Queries:**
```typescript
// ❌ VULNERABLE to SQL injection
const userId = req.query.userId;
const result = await db.query(`SELECT * FROM users WHERE user_id = '${userId}'`);
// Attack: userId = "' OR '1'='1" → Returns all users!

// ✅ SAFE: Parameterized query
const userId = req.query.userId;
const result = await db.query('SELECT * FROM users WHERE user_id = $1', [userId]);
// Attack fails: userId treated as literal string
```

**Use ORM (Optional):**
```typescript
// Sequelize, TypeORM, or Prisma automatically parameterize queries
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const user = await prisma.user.findUnique({
  where: { userId: req.query.userId }
});
// Automatically safe from SQL injection
```

**Checklist:**
- [ ] Use parameterized queries ($1, $2, etc.)
- [ ] Never concatenate user input into SQL
- [ ] Review all database queries for injection risk
- [ ] Use ORM if feasible (Prisma, TypeORM)
- [ ] Enable database audit logging
- [ ] Test with SQL injection payloads

---

### 5.3 XSS Prevention

**Content Security Policy (CSP):**
```typescript
// Set CSP headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.napalmsky.com wss://api.napalmsky.com",
      "frame-src https://js.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join('; ')
  );
  next();
});
```

**React Auto-Escaping:**
```typescript
// ✅ React automatically escapes by default
const username = "<script>alert('XSS')</script>";
return <div>{username}</div>; // Safe: Renders as text, not HTML

// ❌ dangerouslySetInnerHTML bypasses escaping
return <div dangerouslySetInnerHTML={{ __html: username }} />; // DANGEROUS!

// ✅ If you must render HTML, sanitize first
import DOMPurify from 'isomorphic-dompurify';
const clean = DOMPurify.sanitize(userContent);
return <div dangerouslySetInnerHTML={{ __html: clean }} />;
```

**Checklist:**
- [ ] Set Content-Security-Policy header
- [ ] Never use `dangerouslySetInnerHTML` without sanitization
- [ ] Sanitize user-generated content (DOMPurify)
- [ ] Escape JSON in HTML context
- [ ] Test with XSS payloads (OWASP test strings)

---

### 5.4 CSRF Protection

**CSRF Tokens:**
```typescript
// For forms (if not using JSON API)
import csrf from 'csurf';

const csrfProtection = csrf({ cookie: true });

app.get('/form', csrfProtection, (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});

app.post('/form', csrfProtection, (req, res) => {
  // Protected against CSRF
});
```

**SameSite Cookies:**
```typescript
// For session cookies
res.cookie('sessionToken', token, {
  httpOnly: true, // Prevent JavaScript access
  secure: true, // HTTPS only
  sameSite: 'strict', // Prevent CSRF
  maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
});
```

**Checklist:**
- [ ] Use JSON API (not HTML forms) - reduces CSRF risk
- [ ] Set SameSite=Strict on cookies
- [ ] Verify Origin/Referer headers
- [ ] Use CSRF tokens for state-changing operations
- [ ] Test CSRF protection (try cross-site request)

---

## 6. Infrastructure Security

### 6.1 AWS IAM Best Practices

**Principle of Least Privilege:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::napalmsky-media-prod/users/*"
    }
  ]
}
```

**Separate Roles:**
```yaml
Roles:
  - Name: napalmsky-ecs-task-role
    Permissions:
      - S3: Read/Write media bucket
      - RDS: Connect to database
      - Redis: Connect to cluster
      - CloudWatch: Write logs
  
  - Name: napalmsky-admin-role
    Permissions:
      - Full access (use sparingly)
      - MFA required
  
  - Name: napalmsky-developer-role
    Permissions:
      - Read-only access to production
      - Full access to staging
```

**Checklist:**
- [ ] Enable MFA on root account (CRITICAL)
- [ ] Delete root access keys (never use root)
- [ ] Create IAM users for team members
- [ ] Use IAM roles (not access keys) for services
- [ ] Implement least privilege
- [ ] Rotate IAM access keys every 90 days
- [ ] Enable CloudTrail (audit all API calls)
- [ ] Review IAM policies quarterly

---

### 6.2 Secrets Management

**Use AWS Secrets Manager:**
```typescript
// ❌ BAD: Secrets in environment variables
const DATABASE_URL = process.env.DATABASE_URL;

// ✅ GOOD: Fetch from Secrets Manager
import { SecretsManager } from '@aws-sdk/client-secrets-manager';
const client = new SecretsManager({ region: 'us-east-1' });

async function getSecret(secretName: string) {
  const response = await client.getSecretValue({ SecretId: secretName });
  return JSON.parse(response.SecretString);
}

const secrets = await getSecret('napalmsky/production');
const DATABASE_URL = secrets.DATABASE_URL;
```

**Environment Variable Hygiene:**
```bash
# ✅ Non-sensitive env vars (safe in .env)
NODE_ENV=production
PORT=3001

# ⚠️ Sensitive env vars (use Secrets Manager)
DATABASE_URL=... # Secret
STRIPE_SECRET_KEY=... # Secret
AWS_SECRET_ACCESS_KEY=... # Secret
```

**Checklist:**
- [ ] Use AWS Secrets Manager for sensitive data
- [ ] Rotate secrets every 90 days (automated)
- [ ] Never commit secrets to Git
- [ ] Use `.gitignore` for `.env` files
- [ ] Encrypt secrets at rest (KMS)
- [ ] Limit access to secrets (IAM policies)
- [ ] Audit secret access (CloudTrail)

---

### 6.3 Container Security

**Secure Dockerfile:**
```dockerfile
# ✅ Use specific version (not :latest)
FROM node:18-alpine

# ✅ Run as non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# ✅ Copy only necessary files
COPY --chown=nodejs:nodejs package*.json ./
RUN npm ci --production
COPY --chown=nodejs:nodejs . .

# ✅ Drop privileges
EXPOSE 3001
CMD ["npm", "start"]
```

**Image Scanning:**
```bash
# Scan for vulnerabilities
docker scan napalmsky-api:latest

# Or use AWS ECR scanning
aws ecr start-image-scan --repository-name napalmsky-api --image-id imageTag=latest
```

**Checklist:**
- [ ] Use specific base image versions (not :latest)
- [ ] Run container as non-root user
- [ ] Scan images for vulnerabilities weekly
- [ ] Remove unnecessary packages (minimize attack surface)
- [ ] Use multi-stage builds (smaller images)
- [ ] Sign images (Docker Content Trust)
- [ ] Keep base images updated (security patches)

---

## 7. Monitoring & Incident Response

### 7.1 Security Monitoring

**Failed Login Attempts:**
```typescript
// Log failed logins
router.post('/auth/login', async (req, res) => {
  const user = await getUserByEmail(req.body.email);
  
  if (!user || !await bcrypt.compare(req.body.password, user.password_hash)) {
    // Log failed attempt
    await db.query(`
      INSERT INTO audit_log (event_type, user_id, ip_address, details, timestamp)
      VALUES ($1, $2, $3, $4, $5)
    `, ['FAILED_LOGIN', user?.userId || null, req.ip, { email: req.body.email }, Date.now()]);
    
    // Alert on 10+ failed attempts
    const recentFailures = await db.query(`
      SELECT COUNT(*) FROM audit_log
      WHERE event_type = 'FAILED_LOGIN' AND ip_address = $1
      AND timestamp > $2
    `, [req.ip, Date.now() - 3600000]); // Last hour
    
    if (recentFailures.rows[0].count >= 10) {
      await sendSlackAlert(`🚨 Brute force attack detected from IP ${req.ip}`);
    }
    
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Successful login
  await db.query(`
    INSERT INTO audit_log (event_type, user_id, ip_address, timestamp)
    VALUES ($1, $2, $3, $4)
  `, ['LOGIN_SUCCESS', user.userId, req.ip, Date.now()]);
  
  // ... rest of login logic
});
```

**Anomaly Detection:**
```typescript
// Detect unusual activity
async function detectAnomalies(userId: string) {
  const user = await getUser(userId);
  
  // Check for impossible travel
  const lastLogin = await getLastLogin(userId);
  if (lastLogin) {
    const distance = calculateDistance(lastLogin.location, currentLocation);
    const timeDiff = Date.now() - lastLogin.timestamp;
    const speed = distance / (timeDiff / 3600000); // km/h
    
    if (speed > 1000) { // Faster than airplane
      await sendAlert(`⚠️ Impossible travel detected for user ${user.name}`);
      await sendEmail(user.email, 'Unusual login activity detected');
    }
  }
  
  // Check for multiple simultaneous sessions
  const activeSessions = await getActiveSessions(userId);
  if (activeSessions.length > 5) {
    await sendAlert(`⚠️ User ${user.name} has ${activeSessions.length} active sessions`);
  }
}
```

**Checklist:**
- [ ] Log all authentication events
- [ ] Alert on 10+ failed login attempts (1 hour)
- [ ] Monitor for unusual activity patterns
- [ ] Set up CloudWatch alarms for errors
- [ ] Enable AWS GuardDuty (threat detection)
- [ ] Review security logs weekly
- [ ] Create security dashboard (Grafana/CloudWatch)

---

### 7.2 Incident Response Plan

**Response Procedure:**
```
1. DETECTION (Automated alerts)
   - Failed login spike
   - Data breach attempt
   - DDoS attack
   - Server compromise

2. ASSESSMENT (Within 15 minutes)
   - Severity: Critical / High / Medium / Low
   - Scope: Number of users affected
   - Data: What data may be compromised

3. CONTAINMENT (Within 1 hour)
   - Block malicious IPs
   - Revoke compromised credentials
   - Isolate affected systems
   - Enable maintenance mode if needed

4. ERADICATION (Within 4 hours)
   - Patch vulnerability
   - Remove malware
   - Reset compromised accounts
   - Deploy fixes

5. RECOVERY (Within 24 hours)
   - Restore from backups if needed
   - Verify systems are clean
   - Resume normal operations
   - Monitor for re-infection

6. POST-MORTEM (Within 1 week)
   - Document incident
   - Identify root cause
   - Update procedures
   - Prevent recurrence
```

**Communication Plan:**
```yaml
Internal:
  - Slack: #security-incidents (immediate)
  - Email: security@napalmsky.com
  - PagerDuty: On-call engineer

External (if data breach):
  - Email: Affected users within 72 hours
  - Website: Status page update
  - Social Media: Public statement
  - Authorities: Report to data protection authority (GDPR)
```

**Checklist:**
- [ ] Document incident response plan
- [ ] Assign incident response team
- [ ] Set up PagerDuty (on-call rotation)
- [ ] Create communication templates
- [ ] Test incident response (annual drill)
- [ ] Maintain incident log (track all incidents)

---

## 8. Compliance (GDPR/CCPA)

### 8.1 Data Subject Rights

**Right to Access:**
```typescript
// User data export
router.get('/user/export', requireAuth, async (req, res) => {
  const user = await getUser(req.userId);
  const history = await getHistory(req.userId);
  const sessions = await getSessions(req.userId);
  
  const export Data = {
    profile: user,
    chatHistory: history,
    activeSessions: sessions,
    exportedAt: new Date().toISOString()
  };
  
  res.json(exportData);
});
```

**Right to Deletion:**
```typescript
// Implement in SECURITY-HARDENING.md Section 3.3
// Already covered above
```

**Right to Rectification:**
```typescript
// User profile update
router.put('/user/me', requireAuth, async (req, res) => {
  const updates = {
    name: req.body.name,
    gender: req.body.gender,
    socials: req.body.socials
  };
  
  await updateUser(req.userId, updates);
  res.json({ success: true });
});
```

**Checklist:**
- [ ] Implement data export endpoint
- [ ] Implement data deletion endpoint
- [ ] Implement data update endpoint
- [ ] Respond to data requests within 30 days (GDPR)
- [ ] Keep audit log of data requests
- [ ] Document data processing activities

---

### 8.2 Cookie Consent

**Cookie Banner:**
```typescript
// components/CookieBanner.tsx
export function CookieBanner() {
  const [accepted, setAccepted] = useState(false);
  
  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (consent) setAccepted(true);
  }, []);
  
  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'true');
    setAccepted(true);
    // Enable analytics/tracking
  };
  
  if (accepted) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4">
      <p>We use cookies to improve your experience. 
        <a href="/privacy">Learn more</a>
      </p>
      <button onClick={handleAccept}>Accept</button>
    </div>
  );
}
```

**Checklist:**
- [ ] Add cookie consent banner
- [ ] Document all cookies used
- [ ] Only essential cookies before consent
- [ ] Allow users to withdraw consent
- [ ] Link to privacy policy

---

### 8.3 Privacy Policy & Terms

**Required Pages:**
```
/privacy
- What data we collect
- How we use it
- Who we share it with
- How long we keep it
- User rights (access, deletion)
- Contact information

/terms
- Service terms
- User conduct
- Intellectual property
- Liability limitations
- Dispute resolution
```

**Checklist:**
- [ ] Create privacy policy (lawyer reviewed)
- [ ] Create terms of service (lawyer reviewed)
- [ ] Link from footer of all pages
- [ ] Require acceptance on signup
- [ ] Update annually (or when data practices change)
- [ ] Notify users of policy changes

---

## 9. Security Testing

### 9.1 Automated Security Scanning

**OWASP ZAP:**
```bash
# Install
docker pull owasp/zap2docker-stable

# Run automated scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://napalmsky.com \
  -r zap-report.html

# Review report for vulnerabilities
cat zap-report.html
```

**npm audit:**
```bash
# Check for vulnerable dependencies
npm audit

# Fix automatically (if possible)
npm audit fix

# Review and update manually
npm outdated
npm update
```

**Checklist:**
- [ ] Run OWASP ZAP scan monthly
- [ ] Run `npm audit` weekly
- [ ] Review and fix HIGH/CRITICAL vulnerabilities
- [ ] Update dependencies quarterly
- [ ] Subscribe to security advisories (GitHub, npm)

---

### 9.2 Penetration Testing

**Test Scenarios:**
```
1. SQL Injection
   - Try: userId=' OR '1'='1
   - Try: userId='; DROP TABLE users; --
   - Expected: Blocked or escaped

2. XSS (Cross-Site Scripting)
   - Try: name=<script>alert('XSS')</script>
   - Try: message=<img src=x onerror=alert('XSS')>
   - Expected: Escaped or sanitized

3. CSRF (Cross-Site Request Forgery)
   - Try: Submit form from external site
   - Expected: Blocked (SameSite cookie or token)

4. Brute Force
   - Try: 100 failed login attempts
   - Expected: Rate limited after 5 attempts

5. Session Hijacking
   - Try: Copy session token, use from different IP
   - Expected: (Optional) Detect IP change, require re-auth

6. File Upload
   - Try: Upload PHP/executable file
   - Expected: Rejected (only accept images/videos)

7. TURN Credentials
   - Try: Extract credentials from client code
   - Expected: Not visible (server-side endpoint only)
```

**Checklist:**
- [ ] Perform manual penetration testing
- [ ] Test all endpoints with malicious payloads
- [ ] Hire professional pentesters (annual)
- [ ] Fix all HIGH/CRITICAL findings
- [ ] Retest after fixes
- [ ] Document all test results

---

## 10. Security Maintenance Schedule

### Daily
- [ ] Review CloudWatch alarms
- [ ] Check failed login attempts
- [ ] Monitor error rates (Sentry)

### Weekly
- [ ] Run `npm audit`
- [ ] Review security logs
- [ ] Check for unusual activity

### Monthly
- [ ] Run OWASP ZAP scan
- [ ] Review AWS security alerts
- [ ] Update dependencies
- [ ] Review IAM permissions

### Quarterly
- [ ] Rotate secrets (database passwords, API keys)
- [ ] Review security policies
- [ ] Test backup restoration
- [ ] Test incident response procedures

### Annually
- [ ] Professional penetration test
- [ ] Security audit by third party
- [ ] Update privacy policy/terms
- [ ] Review and update security training
- [ ] Test disaster recovery (full failover)

---

## Appendix: Security Checklist Summary

### Pre-Launch Critical

- [ ] ⚠️ TURN credentials moved to backend endpoint
- [ ] ⚠️ Passwords hashed with bcrypt (cost 12)
- [ ] ⚠️ Rate limiting on auth endpoints (5/15min)
- [ ] ⚠️ HTTPS enforced (HTTP redirects)
- [ ] ⚠️ Database encryption at rest enabled
- [ ] ⚠️ S3 bucket encryption enabled
- [ ] ⚠️ Security groups configured (private subnets)
- [ ] ⚠️ No secrets in client-side code

### Post-Launch Monitoring

- [ ] CloudWatch alarms configured
- [ ] Sentry error tracking enabled
- [ ] Failed login alerts set up
- [ ] Cost anomaly detection enabled
- [ ] Backup restoration tested
- [ ] Incident response plan documented

### Ongoing Maintenance

- [ ] Weekly: npm audit
- [ ] Monthly: OWASP ZAP scan
- [ ] Quarterly: Rotate secrets
- [ ] Annually: Professional pentest

---

*Security Hardening Guide - October 10, 2025*  
*Production-ready security for Napalm Sky* 🔒

