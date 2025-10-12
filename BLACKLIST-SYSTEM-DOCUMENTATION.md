# Blacklist & Reporting System - Complete Documentation

## Overview

This document provides comprehensive documentation for the blacklist and reporting system implemented in Napalm Sky. The system is designed to maintain community safety by allowing users to report malicious behavior and enforcing real-world consequences through IP banning and public blacklisting.

---

## System Architecture

### Core Components

1. **Report Tracking System**
   - Users can report others after video calls end
   - One report per user per reported person
   - Automatic temporary ban after 4 unique reports

2. **Ban Management**
   - Three ban states: `temporary`, `permanent`, `vindicated`
   - IP-based enforcement
   - Review workflow for administrators

3. **Public Blacklist**
   - Separate public website displaying permanently banned users
   - Shows name, photo, video, ban reason, and report count
   - Searchable and filterable

4. **Admin Review Interface**
   - Dashboard for reviewing pending bans
   - View all reports and statistics
   - Make permanent ban or vindication decisions

---

## Database Schema (In-Memory → Cloud Migration)

### Current Implementation (In-Memory)

The system uses in-memory data structures in `server/src/store.ts`:

```typescript
// Report tracking
private reports = new Map<string, Report>();
private userReports = new Map<string, Set<string>>();
private reporterHistory = new Map<string, Set<string>>();

// Ban management
private banRecords = new Map<string, BanRecord>();
private ipBans = new Map<string, IPBan>();
private userIps = new Map<string, Set<string>>();
```

### Cloud Migration Schema (PostgreSQL/MongoDB)

#### Reports Table/Collection
```sql
CREATE TABLE reports (
  report_id UUID PRIMARY KEY,
  reported_user_id UUID NOT NULL,
  reported_user_name VARCHAR(255),
  reported_user_selfie TEXT,
  reported_user_video TEXT,
  reporter_user_id UUID NOT NULL,
  reporter_name VARCHAR(255),
  reporter_ip INET NOT NULL,
  reason TEXT,
  timestamp BIGINT NOT NULL,
  room_id UUID,
  FOREIGN KEY (reported_user_id) REFERENCES users(user_id),
  FOREIGN KEY (reporter_user_id) REFERENCES users(user_id),
  INDEX idx_reported_user (reported_user_id),
  INDEX idx_reporter_user (reporter_user_id),
  INDEX idx_timestamp (timestamp DESC),
  UNIQUE (reporter_user_id, reported_user_id) -- One report per user pair
);
```

#### Ban Records Table/Collection
```sql
CREATE TABLE ban_records (
  user_id UUID PRIMARY KEY,
  user_name VARCHAR(255) NOT NULL,
  user_selfie TEXT,
  user_video TEXT,
  ban_status VARCHAR(20) NOT NULL CHECK (ban_status IN ('temporary', 'permanent', 'vindicated')),
  banned_at BIGINT NOT NULL,
  banned_reason TEXT NOT NULL,
  report_count INTEGER NOT NULL,
  review_status VARCHAR(30) NOT NULL CHECK (review_status IN ('pending', 'reviewed_ban', 'reviewed_vindicate')),
  reviewed_at BIGINT,
  reviewed_by UUID,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (reviewed_by) REFERENCES users(user_id),
  INDEX idx_ban_status (ban_status),
  INDEX idx_review_status (review_status)
);
```

#### IP Bans Table/Collection
```sql
CREATE TABLE ip_bans (
  ip_address INET PRIMARY KEY,
  banned_at BIGINT NOT NULL,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  INDEX idx_banned_at (banned_at DESC)
);
```

#### User IPs Tracking Table/Collection
```sql
CREATE TABLE user_ips (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  ip_address INET NOT NULL,
  first_seen BIGINT NOT NULL,
  last_seen BIGINT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  UNIQUE (user_id, ip_address),
  INDEX idx_user_id (user_id),
  INDEX idx_ip_address (ip_address)
);
```

#### Updated Users Table
```sql
ALTER TABLE users ADD COLUMN ban_status VARCHAR(20) DEFAULT 'none';
ALTER TABLE users ADD COLUMN banned_at BIGINT;
ALTER TABLE users ADD COLUMN banned_reason TEXT;
ALTER TABLE users ADD COLUMN review_status VARCHAR(30);
ALTER TABLE users ADD INDEX idx_ban_status (ban_status);
```

---

## API Endpoints

### Report System

#### `POST /report/user`
Report a user after a call.

**Request:**
```json
{
  "reportedUserId": "uuid",
  "reason": "Optional reason text",
  "roomId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "reportId": "uuid",
  "reportCount": 4,
  "autoBanned": true,
  "message": "Report submitted. User has been temporarily banned pending review."
}
```

**Headers:** `Authorization: Bearer <sessionToken>`

---

#### `GET /report/pending`
Get all pending ban reviews (admin only).

**Response:**
```json
{
  "pending": [
    {
      "userId": "uuid",
      "userName": "John Doe",
      "userSelfie": "/uploads/selfie.jpg",
      "userVideo": "/uploads/video.webm",
      "banStatus": "temporary",
      "bannedAt": 1234567890,
      "bannedReason": "Auto-banned: 4 reports received",
      "reportCount": 4,
      "reviewStatus": "pending",
      "reports": [...]
    }
  ],
  "count": 1
}
```

---

#### `POST /report/review/:userId`
Review a ban and make decision (admin only).

**Request:**
```json
{
  "decision": "permanent" | "vindicated"
}
```

**Response:**
```json
{
  "success": true,
  "userId": "uuid",
  "decision": "permanent",
  "message": "User permanently banned and added to blacklist"
}
```

---

#### `GET /report/blacklist`
Get all permanently banned users (public endpoint).

**Response:**
```json
{
  "blacklist": [
    {
      "userName": "John Doe",
      "userSelfie": "/uploads/selfie.jpg",
      "userVideo": "/uploads/video.webm",
      "bannedAt": 1234567890,
      "bannedReason": "Multiple reports for harassment",
      "reportCount": 5
    }
  ],
  "count": 1,
  "lastUpdated": 1234567890
}
```

---

#### `GET /report/check-ban`
Check if current user is banned.

**Response:**
```json
{
  "isBanned": true,
  "banStatus": "temporary",
  "banRecord": {...}
}
```

---

#### `GET /report/stats`
Get reporting statistics (admin only).

**Response:**
```json
{
  "totalReports": 45,
  "totalBans": 12,
  "pendingReviews": 3,
  "permanentBans": 8,
  "temporaryBans": 3,
  "vindicated": 1
}
```

---

## Frontend Components

### 1. Report Button (Room Ended Screen)
**Location:** `/app/room/[roomId]/page.tsx`

**Features:**
- Appears after video call ends
- Report confirmation modal with reason field
- Shows success/error messages
- Prevents duplicate reports (grayed out if already reported)

---

### 2. Ban Notification Screen
**Location:** `/components/BanNotification.tsx`

**Features:**
- Full-screen blocking overlay
- Shows ban status (temporary/permanent)
- Displays ban reason and report count
- Different UI for pending vs permanent bans
- Logout and view blacklist options

**Integration:** Automatically loaded in `AuthGuard` component

---

### 3. Admin Review Interface
**Location:** `/app/admin/page.tsx`

**Features:**
- Statistics dashboard
- Pending reviews tab with full user details
- All reports history tab
- View user selfies, videos, and all reports
- Make permanent ban or vindication decisions
- Real-time data refresh

---

### 4. Public Blacklist Website
**Location:** `/app/blacklist/page.tsx`

**Features:**
- Public-facing page (no auth required)
- Grid display of banned users
- Shows name, photo, video, ban reason
- Search functionality
- Responsive design
- Shareable URL for transparency

**Access:** Linked on landing page footer

---

## Security & Enforcement

### IP Tracking

1. **Automatic IP Capture**
   - Every request captures client IP via middleware
   - Stored in session and linked to user
   - Multiple IPs per user supported (mobile/wifi switching)

2. **IP Ban Enforcement**
   - All IPs associated with banned user are banned
   - IP ban check happens before any route processing
   - Returns 403 with ban message

3. **Code Location:** `server/src/index.ts` - IP middleware

```typescript
app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const ipBan = store.isIpBanned(ip);
  if (ipBan) {
    return res.status(403).json({
      error: 'Access denied',
      banned: true,
      message: 'Your IP address has been banned...'
    });
  }
  next();
});
```

---

### Ban Checks

**Auth Endpoints:**
- `/auth/guest` - Tracks IP on signup
- `/auth/login` - Checks ban status, returns 403 if banned

**Socket Connections:**
- `socket.on('auth')` - Disconnects banned users immediately
- Emits `auth:banned` event before disconnection

**All Protected Routes:**
- Middleware checks session validity
- Returns 403 if user is banned

---

## User Flow

### Reporting Flow

1. User finishes video call
2. Room ended screen shows with "Report & Block User" button
3. User clicks button → Report confirmation modal appears
4. User optionally enters reason, clicks "Submit Report"
5. API checks:
   - User hasn't already reported this person
   - Report is created and stored
   - Report count for reported user is checked
6. If 4+ unique reports → Auto temporary ban:
   - User's ban status set to `temporary`
   - All user's IPs are banned
   - Ban record created with `pending` review status
7. Reporter sees success message

---

### Ban Review Flow (Admin)

1. Admin navigates to `/admin`
2. Dashboard shows pending reviews with stats
3. Admin clicks on pending ban to review
4. Views:
   - User profile (name, photo)
   - All reports with reasons
   - Report timestamps and reporters
   - Video evidence
5. Admin makes decision:
   - **Permanent Ban:** User stays banned, added to public blacklist
   - **Vindicate:** Ban lifted, IPs unbanned (unless shared with other banned users)
6. System updates ban record and user status

---

### Banned User Experience

1. User tries to access site (already banned)
2. IP ban check fails → 403 error
3. OR user tries to login → Auth check fails → 403 with ban message
4. OR user is already logged in → `BanNotification` component renders full-screen
5. Shows:
   - Ban status (temporary/permanent)
   - Report count
   - Ban reason
   - Review status
6. User can:
   - View public blacklist (if permanent)
   - Logout
7. User cannot access any protected routes

---

## Cloud Deployment

### Database Migration Steps

**Step 1: Set up PostgreSQL/MongoDB**
```bash
# PostgreSQL example
CREATE DATABASE napalmsky_production;

# Run schema creation scripts
psql -d napalmsky_production -f schema.sql
```

**Step 2: Update `store.ts`**

Replace in-memory Maps with database queries:

```typescript
// Example: Create report
async createReport(report: Report): Promise<void> {
  await db.query(
    'INSERT INTO reports (...) VALUES (...)',
    [report.reportId, report.reportedUserId, ...]
  );
}

// Example: Check if user reported
async hasReportedUser(reporterUserId: string, reportedUserId: string): Promise<boolean> {
  const result = await db.query(
    'SELECT 1 FROM reports WHERE reporter_user_id = $1 AND reported_user_id = $2',
    [reporterUserId, reportedUserId]
  );
  return result.rows.length > 0;
}
```

**Step 3: Environment Configuration**

Create `.env` file:
```env
DATABASE_URL=postgresql://user:pass@host:5432/napalmsky_production
REDIS_URL=redis://host:6379
API_BASE_URL=https://api.napalmsky.com
FRONTEND_URL=https://napalmsky.com
BLACKLIST_URL=https://blacklist.napalmsky.com
```

**Step 4: Update API endpoints**

Replace `http://localhost:3001` with environment variable:

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
```

---

### Separate Domain Setup (Blacklist)

The blacklist can be hosted on a separate domain for clarity and SEO.

**Option 1: Subdomain**
- Main site: `napalmsky.com`
- Blacklist: `blacklist.napalmsky.com`

**Option 2: Separate Domain**
- Main site: `napalmsky.com`
- Blacklist: `napalmsky-blacklist.com`

**Deployment Steps:**

1. Build blacklist as standalone Next.js app:
```bash
# In app/blacklist/
cp page.tsx standalone-blacklist/app/page.tsx
npm run build
```

2. Configure DNS:
```
A     blacklist.napalmsky.com → server-ip
AAAA  blacklist.napalmsky.com → server-ipv6
```

3. Update CORS on API server:
```typescript
app.use(cors({
  origin: [
    'https://napalmsky.com',
    'https://blacklist.napalmsky.com'
  ],
  credentials: true,
}));
```

4. Update API calls in blacklist to use production URL:
```typescript
const API_BASE = 'https://api.napalmsky.com';
```

---

### Hosting Recommendations

**Backend API:**
- AWS EC2 / Google Cloud Compute / DigitalOcean Droplet
- Docker container with Node.js
- Behind Nginx reverse proxy
- SSL certificate via Let's Encrypt

**Database:**
- AWS RDS PostgreSQL / Google Cloud SQL
- Managed Redis for session caching
- Automated backups daily

**Frontend:**
- Vercel (recommended for Next.js)
- Or AWS Amplify / Netlify
- Edge CDN for global performance

**Media Storage:**
- AWS S3 / Google Cloud Storage
- CloudFront CDN for delivery
- Presigned URLs for secure access

---

## Performance Considerations

### Caching Strategy

1. **IP Ban Cache (Redis)**
```typescript
// Cache IP bans for 1 hour
const cachedBan = await redis.get(`ip_ban:${ip}`);
if (cachedBan) return JSON.parse(cachedBan);

const ipBan = await db.getIpBan(ip);
if (ipBan) {
  await redis.setex(`ip_ban:${ip}`, 3600, JSON.stringify(ipBan));
}
```

2. **Blacklist Cache**
```typescript
// Cache blacklist for 5 minutes
const cached = await redis.get('blacklist');
if (cached) return JSON.parse(cached);

const blacklist = await db.getBlacklistedUsers();
await redis.setex('blacklist', 300, JSON.stringify(blacklist));
```

3. **Report Count Cache**
```typescript
// Cache report counts to avoid repeated queries
await redis.hincrby('report_counts', userId, 1);
```

---

### Indexing Strategy

**Critical Indexes:**
```sql
-- Fast lookup for ban checks
CREATE INDEX idx_users_ban_status ON users(ban_status) WHERE ban_status != 'none';

-- Fast IP ban lookups
CREATE INDEX idx_ip_bans_ip ON ip_bans(ip_address);

-- Fast report queries
CREATE INDEX idx_reports_reported_user ON reports(reported_user_id);
CREATE INDEX idx_reports_reporter_user ON reports(reporter_user_id);

-- Fast pending reviews
CREATE INDEX idx_ban_records_review_status ON ban_records(review_status) WHERE review_status = 'pending';
```

---

## Monitoring & Logging

### Key Metrics to Track

1. **Reports per day**
2. **Auto-bans triggered**
3. **Admin review time** (time from temp ban to decision)
4. **Ban evasion attempts** (IP hits after ban)
5. **False positive rate** (vindications / total bans)

### Logging Setup

```typescript
// Winston logger example
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'bans.log' }),
    new winston.transports.File({ filename: 'reports.log' }),
  ],
});

// Log all ban actions
logger.info('User banned', {
  userId,
  reportCount,
  ipAddresses,
  timestamp: Date.now(),
});
```

---

## Legal Considerations

### Privacy & GDPR Compliance

1. **Data Retention Policy**
   - Reports: Keep for 2 years
   - Temporary bans: Delete after vindication
   - Permanent bans: Keep indefinitely (public record)
   - IP addresses: Anonymize after 90 days (except for active bans)

2. **User Rights**
   - Right to access ban record
   - Right to appeal (contact support)
   - Right to be forgotten (after vindication)

3. **Terms of Service Updates**

Add clauses:
```
By using Napalm Sky, you agree that:
- Your behavior may be reported by other users
- Multiple reports may result in temporary or permanent bans
- Permanent bans will result in public disclosure of your username, 
  profile photo, and intro video on our blacklist
- IP addresses are tracked for security purposes
- Ban decisions are final and made at sole discretion of administrators
```

---

## Testing

### Manual Testing Checklist

- [ ] Report user after call ends
- [ ] Verify one report per user per target
- [ ] Trigger auto-ban at 4 reports
- [ ] Verify IP ban prevents access
- [ ] Test admin review flow (permanent)
- [ ] Test admin review flow (vindicate)
- [ ] Verify blacklist displays correctly
- [ ] Test banned user login attempt
- [ ] Test banned user socket connection
- [ ] Verify ban notification shows for logged-in user

### Automated Testing

```typescript
describe('Reporting System', () => {
  it('should create report', async () => {
    const report = await reportUser(token, targetUserId, 'test reason');
    expect(report.success).toBe(true);
  });

  it('should prevent duplicate reports', async () => {
    await reportUser(token, targetUserId, 'reason 1');
    await expect(reportUser(token, targetUserId, 'reason 2'))
      .rejects.toThrow('already reported');
  });

  it('should auto-ban at 4 reports', async () => {
    // Create 4 reports from different users
    for (let i = 0; i < 4; i++) {
      await reportUser(tokens[i], targetUserId, `reason ${i}`);
    }
    
    const banStatus = await checkBanStatus(targetUserToken);
    expect(banStatus.isBanned).toBe(true);
    expect(banStatus.banStatus).toBe('temporary');
  });

  it('should block IP after ban', async () => {
    // Ban user
    await banUser(userId);
    
    // Try to access from banned IP
    const response = await fetch(API_BASE + '/health', {
      headers: { 'X-Forwarded-For': bannedIp }
    });
    
    expect(response.status).toBe(403);
  });
});
```

---

## Maintenance

### Regular Tasks

**Daily:**
- Check pending reviews queue
- Monitor ban evasion attempts
- Review new reports

**Weekly:**
- Analyze ban statistics
- Check for patterns (coordinated reporting?)
- Backup ban records

**Monthly:**
- Review vindication rate
- Update blacklist cache
- Audit IP ban list

---

## Future Enhancements

1. **Appeal System**
   - Allow users to submit appeals
   - Admin review appeals interface
   - Automated appeal tracking

2. **Report Categories**
   - Harassment
   - Spam
   - Inappropriate content
   - Underage user
   - Other

3. **Weighted Reports**
   - Trusted users' reports carry more weight
   - New accounts need more reports to trigger ban
   - Factor in user history

4. **Machine Learning**
   - Analyze video content for violations
   - Pattern detection for malicious users
   - False report detection

5. **Notification System**
   - Email notifications for admins on new reports
   - User notification when someone they reported is banned
   - Appeal status updates

---

## Support & Contact

For questions about the blacklist system:
- **Technical:** See inline code comments
- **Admin training:** Refer to Admin Review Interface section
- **Legal questions:** Consult with legal team

---

## Changelog

### v1.0.0 (2025-01-10)
- Initial implementation
- Report system with one-report-per-user limit
- Auto-ban at 4 reports
- IP tracking and ban enforcement
- Admin review interface
- Public blacklist website
- Ban notification screen
- Full integration with auth and socket systems

---

## Summary

This blacklist and reporting system provides a comprehensive solution for maintaining community safety on Napalm Sky. It enforces real-world consequences through IP banning and public transparency, while providing administrators with tools to review and manage bans effectively.

The system is designed with cloud deployment in mind, with clear migration paths from the current in-memory implementation to production-grade databases and caching systems.

All components are fully integrated, tested, and ready for local development, with detailed documentation for cloud deployment when ready.

