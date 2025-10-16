# 🗑️ Abandoned Upload Analysis & Cleanup Strategy

## 🔍 Current Situation

### What Happens When User Aborts After Paywall

#### Scenario:
```
1. User completes: Name → Selfie → Video
2. Files uploaded:
   ├─ Selfie: Uploaded to Cloudinary (or local /uploads/)
   ├─ Video: Uploaded to Cloudinary (or local /uploads/)
   └─ User record: Has selfieUrl + videoUrl
   
3. Payment check runs → paidStatus: 'unpaid'
4. Redirects to /paywall
5. User closes tab / navigates away WITHOUT paying
```

#### Result - Storage Waste:
```
❌ Selfie stored: ~400 KB (optimized)
❌ Video stored: ~7-8 MB (optimized)  
❌ Total wasted: ~8 MB per abandoned user
❌ User record in database: paidStatus='unpaid', complete profile
```

---

## 🚨 Potential Problems

### Problem #1: Storage Bloat
```
If 100 users abandon after paywall:
- Storage waste: 100 × 8 MB = 800 MB
- Cloudinary costs: ~$0.02/GB = $0.016/month
- Not huge, but accumulates over time

If 1000 users abandon:
- Storage waste: 8 GB
- Cost: ~$0.16/month
- Database bloat: 1000 unpaid user records
```

### Problem #2: Spam/Abuse Vector
```
Malicious user could:
1. Create account
2. Upload random files
3. Abandon at paywall
4. Repeat 100 times
5. Waste 800 MB storage
6. No payment required for uploads!
```

### Problem #3: Database Clutter
```
Unpaid users with complete profiles:
- Take up database space
- Appear in admin queries
- Confusing analytics
- Never actually use platform
```

---

## ✅ Current Cleanup (What Exists)

### Memory Manager Cleanup
**File:** `server/src/memory-manager.ts`

```typescript
Current cleanup targets:
✅ Expired sessions (> expiry time)
✅ Old call history (> 7 days)
✅ Expired cooldowns
✅ Stale presence (offline > 1 hour)
✅ Expired active invites (> 5 minutes)

NOT cleaned:
❌ Abandoned user profiles
❌ Unpaid user media files
❌ Incomplete user accounts
```

**Verdict:** No cleanup for abandoned uploads currently!

---

## 🎯 Recommended Solutions

### Solution #1: Time-Based Cleanup (RECOMMENDED)

**Strategy:** Delete unpaid users after 7 days if never completed payment

```typescript
// Add to server/src/memory-manager.ts

private async cleanupAbandonedProfiles(): Promise<number> {
  if (!this.useDatabase) return 0;
  
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  let cleaned = 0;
  
  try {
    // Find unpaid users older than 7 days with media uploads
    const result = await query(
      `SELECT user_id, selfie_url, video_url 
       FROM users 
       WHERE paid_status = 'unpaid' 
       AND (selfie_url IS NOT NULL OR video_url IS NOT NULL)
       AND created_at < $1`,
      [new Date(sevenDaysAgo)]
    );
    
    for (const row of result.rows) {
      // Delete from Cloudinary (if using cloud storage)
      if (useCloudinary && row.selfie_url) {
        await deleteFromCloudinary(row.selfie_url);
      }
      if (useCloudinary && row.video_url) {
        await deleteFromCloudinary(row.video_url);
      }
      
      // Delete user record
      await query('DELETE FROM users WHERE user_id = $1', [row.user_id]);
      cleaned++;
    }
    
    console.log(`[Cleanup] Removed ${cleaned} abandoned unpaid profiles`);
  } catch (error) {
    console.error('[Cleanup] Failed to clean abandoned profiles:', error);
  }
  
  return cleaned;
}

// Add to runCleanup():
totalCleaned += await this.cleanupAbandonedProfiles();
```

**Benefits:**
- ✅ Automatically removes abandoned profiles
- ✅ Frees storage space
- ✅ Cleans database
- ✅ Runs every 3 minutes (existing schedule)

---

### Solution #2: Upload Limits (QUICK FIX)

**Strategy:** Limit uploads per IP address before payment

```typescript
// Add to server/src/media.ts

// Track uploads per IP (in-memory, resets on restart)
const uploadTracker = new Map<string, { count: number; firstUpload: number }>();

async function checkUploadLimit(ip: string): boolean {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const maxUploadsPerHour = 5; // Allow 5 unpaid uploads per hour per IP
  
  let record = uploadTracker.get(ip);
  
  // Clean old records
  if (record && (now - record.firstUpload) > oneHour) {
    uploadTracker.delete(ip);
    record = undefined;
  }
  
  if (!record) {
    uploadTracker.set(ip, { count: 1, firstUpload: now });
    return true; // Allow
  }
  
  if (record.count >= maxUploadsPerHour) {
    return false; // Block
  }
  
  record.count++;
  return true; // Allow
}

// In upload routes:
router.post('/selfie', requireAuth, async (req, res) => {
  const ip = req.userIp || req.ip;
  
  // Check if user is paid
  const user = await store.getUser(req.userId);
  const isPaid = user?.paidStatus === 'paid' || user?.paidStatus === 'qr_verified';
  
  // Only enforce limit for unpaid users
  if (!isPaid && !checkUploadLimit(ip)) {
    return res.status(429).json({
      error: 'Upload limit reached. Please complete payment to upload more files.'
    });
  }
  
  // Continue with upload...
});
```

**Benefits:**
- ✅ Prevents spam abuse
- ✅ Simple to implement
- ✅ Doesn't affect paid users
- ✅ Protects storage

---

### Solution #3: Lazy Upload (ADVANCED)

**Strategy:** Don't upload to Cloudinary until payment confirmed

```typescript
// Modified approach:
1. User records selfie/video
2. Upload to LOCAL /uploads/ only (temp)
3. After payment confirmed:
   └─ Upload to Cloudinary
   └─ Delete local temp files
4. If user abandons:
   └─ Local temp files deleted after 24 hours
   └─ No Cloudinary cost!
```

**Implementation:**
- More complex
- Better for cost optimization
- Requires background job system

---

## 🎯 Immediate Answer to Your Question

### What Happens Now (Current State):

```
User Journey:
1. Name → Account created (database)
2. Selfie → Uploaded & stored (Cloudinary/local)
3. Video → Uploaded & stored (Cloudinary/local)
4. Payment check → Redirect to /paywall
5. User closes tab

Result:
❌ Files remain in storage (wasted ~8 MB)
❌ User record in database (paidStatus='unpaid')
❌ No automatic cleanup
❌ Files stay forever unless manually deleted
```

### Cost Impact:
```
Cloudinary free tier: 25 GB
Estimated abandoned users: 20-30% of signups
If 100 signups/month:
- 30 abandon after profile
- Waste: 30 × 8 MB = 240 MB/month
- Annual: 2.88 GB (11% of free tier)
- Cost: Minimal but grows over time
```

### Current Mitigation:
```
✅ Upload optimization reduces file sizes (70-80% smaller)
✅ Optimized files waste less space
❌ No cleanup of abandoned profiles
❌ No upload limits for unpaid users
```

---

## 💡 Recommended Action

### Option A: Implement Time-Based Cleanup (RECOMMENDED)
```
Priority: HIGH
Effort: 2-3 hours
Impact: Prevents storage bloat long-term

Add to memory-manager.ts:
- Cleanup abandoned unpaid profiles after 7 days
- Delete associated media files
- Runs automatically every day
```

### Option B: Add Upload Limits
```
Priority: MEDIUM
Effort: 30 minutes  
Impact: Prevents abuse

Add to media.ts:
- Limit unpaid users to 5 uploads per hour per IP
- Paid users: unlimited
- Simple spam prevention
```

### Option C: Do Nothing (Current State)
```
Risk: LOW-MEDIUM
- Storage waste accumulates slowly
- Free tier sufficient for now (25 GB)
- Can implement cleanup later if needed
```

---

## 🚀 Quick Fix Available

I can implement **Solution #1 (Time-Based Cleanup)** or **Solution #2 (Upload Limits)** right now if you want.

Otherwise, current state is:
- ✅ Functional (referral flow works)
- ✅ Not critical (won't break anything)
- ⚠️ Minor storage waste (manageable)
- 📊 Monitor and implement cleanup later if needed

**Your choice - deploy as-is or add cleanup now?**

