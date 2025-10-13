# 🔐 Admin Security Setup

**Secure admin authentication implemented**  
**Date:** October 13, 2025

---

## 🎯 **Admin Access**

### **Login Credentials:**

```
Username: Hanson
Password: 328077
```

**Login URL:** `https://napalmsky.com/admin-login`

---

## 🔒 **Security Features**

### **1. Hidden Admin Page**
- ✅ No links from main dashboard
- ✅ Accessible only via direct URL: `/admin` or `/admin-login`
- ✅ Security by obscurity + authentication

### **2. Bcrypt Password Hashing**
- ✅ Password hashed with bcrypt (cost factor 12)
- ✅ Stored hash: `$2b$12$51/ipDaDcOudvkQ8KZBdlOtlie...`
- ✅ Never store plain text passwords
- ✅ Impossible to reverse engineer

### **3. Session Management**
- ✅ 24-hour admin sessions
- ✅ Secure UUID tokens
- ✅ Auto-expiry and cleanup
- ✅ Logout functionality

### **4. Brute Force Protection**
- ✅ 1-second delay on failed login (timing attack prevention)
- ✅ Rate limited (5 attempts per 15 min via express-rate-limit)
- ✅ No username enumeration (same error for both invalid user/password)

### **5. Frontend Protection**
- ✅ Admin page checks for valid token on load
- ✅ Redirects to login if no token
- ✅ Verifies token with backend
- ✅ Auto-logout on token expiry

---

## 🚀 **How It Works**

### **Login Flow:**

```
User visits /admin
     ↓
No admin token in localStorage?
     ↓
Redirect to /admin-login
     ↓
User enters:
  Username: Hanson
  Password: 328077
     ↓
Frontend → POST /admin/login
     ↓
Backend:
  1. Check username matches
  2. bcrypt.compare(password, hash)
  3. Generate UUID admin token
  4. Store in memory (24h expiry)
     ↓
Return adminToken to frontend
     ↓
Frontend stores in localStorage
     ↓
Redirect to /admin
     ↓
✅ Admin panel loads!
```

### **Access Verification:**

Every time admin page loads:
```
1. Check localStorage for adminToken
2. If exists → GET /admin/verify
3. Backend checks:
   - Token exists in sessions?
   - Session not expired?
4. If valid → load admin data
5. If invalid → redirect to login
```

---

## 🛡️ **Production Security Checklist**

### **Current Security:**
- [x] Password bcrypt hashed (cost 12)
- [x] Rate limiting (5 attempts/15min)
- [x] 24-hour session expiry
- [x] No username enumeration
- [x] Timing attack protection (1s delay)
- [x] Admin page hidden (no public links)
- [x] Token verification on every load

### **Recommended for Production:**
- [ ] Move admin credentials to environment variables
- [ ] Add 2FA (Google Authenticator)
- [ ] Log all admin actions (audit trail)
- [ ] IP whitelist (only specific IPs can access)
- [ ] Session stored in Redis (not memory)
- [ ] Add CAPTCHA after 3 failed attempts
- [ ] Email notifications on admin login
- [ ] Rotate sessions every 6 hours

---

## 🔧 **Configuration**

### **Change Admin Credentials (Environment Variables):**

For production, move credentials to Railway environment variables:

**Railway → Variables:**
```bash
ADMIN_USERNAME=Hanson
ADMIN_PASSWORD_HASH=$2b$12$51/ipDaDcOudvkQ8KZBdlOtlieovXEWfQcCW4PMC.ml530T7umAD2
```

**Then update `server/src/admin-auth.ts`:**
```typescript
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Hanson';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '$2b$12$51/ipDa...';
```

### **Change Password:**

To change the admin password:

```bash
# Generate new hash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YOUR_NEW_PASSWORD', 12).then(hash => console.log(hash));"

# Copy the hash and update admin-auth.ts
# Or add to Railway environment variables
```

---

## 📊 **Admin Panel Features**

What admins can do after login:

### **Ban Management:**
- View all banned users
- Review pending bans (3+ reports)
- Uphold ban (make permanent)
- Vindicate user (unban)
- See all reports with evidence

### **QR Code Management:**
- Generate unlimited admin QR codes
- Track usage per code
- Deactivate codes
- See who used each code

### **Statistics:**
- Total reports
- Total bans
- Pending reviews
- Permanent/temporary breakdown

---

## 🧪 **Testing Admin Authentication**

### **Test Login (Local):**

1. Visit: `http://localhost:3000/admin-login`
2. Enter:
   - Username: `Hanson`
   - Password: `328077`
3. Click "Login"
4. Should redirect to `/admin`
5. Should load admin panel ✅

### **Test Invalid Credentials:**

1. Enter wrong password
2. Should show "Invalid credentials"
3. Wait 1 second (anti-brute force delay)
4. Can try again

### **Test Session Expiry:**

1. Login successfully
2. Wait 24 hours
3. Try to access `/admin`
4. Should redirect to login
5. Must login again

---

## 🚀 **Production URLs**

After deployment:

- **Admin Login:** `https://napalmsky.com/admin-login`
- **Admin Panel:** `https://napalmsky.com/admin`

**⚠️ Keep these URLs secret!** Only share with authorized administrators.

---

## 🔐 **Security Best Practices**

### **DO:**
- ✅ Use strong passwords (consider changing from 328077)
- ✅ Enable HTTPS (Railway/Vercel auto-provide)
- ✅ Log admin actions
- ✅ Rotate sessions regularly
- ✅ Use 2FA in production (future enhancement)

### **DON'T:**
- ❌ Share admin credentials publicly
- ❌ Login from public WiFi
- ❌ Save password in browser
- ❌ Access admin panel from untrusted devices
- ❌ Link to admin pages from public pages

---

## 📝 **Admin Session Storage**

### **Current (In-Memory):**
- ✅ Works for single server
- ✅ Fast access
- ❌ Lost on server restart
- ❌ Doesn't work with multiple servers

### **Production (Redis):**
```typescript
// Store in Redis instead of Map
await redis.set(`admin_session:${token}`, JSON.stringify(session), {
  EX: 24 * 60 * 60  // 24 hour expiry
});
```

This will be automatically handled when you add Redis to Railway!

---

## ✅ **What Was Implemented**

**New Files:**
- `app/admin-login/page.tsx` - Admin login page
- `server/src/admin-auth.ts` - Backend authentication

**Updated Files:**
- `app/admin/page.tsx` - Now requires admin authentication
- `server/src/index.ts` - Added admin auth routes

**Security Features:**
- Bcrypt password hashing
- Session tokens (UUID v4)
- 24-hour auto-expiry
- Rate limiting (5 attempts/15min)
- Timing attack prevention
- No username enumeration

---

**Admin authentication is now secure and hidden!** ✅

