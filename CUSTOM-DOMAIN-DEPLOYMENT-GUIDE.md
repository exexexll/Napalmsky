# 🌐 Custom Domain Deployment Guide

## 🎯 **Your Requirements**

1. ✅ Deploy main app to **napalmsky.com** (Squarespace domain → Vercel)
2. ✅ Deploy blacklist to **napalmskyblacklist.com** (without header)
3. ✅ Hide all debug console messages in production
4. ✅ Reinforce security for production

---

## 📋 **Part 1: Connect napalmsky.com to Vercel**

### **Step 1: Configure Vercel**

1. **Go to Vercel Dashboard:**
   - Navigate to: https://vercel.com/dashboard
   - Select your `Napalmsky` project
   - Click **"Settings"** → **"Domains"**

2. **Add Custom Domain:**
   - Click **"Add Domain"**
   - Enter: `napalmsky.com`
   - Click **"Add"**
   
3. **Vercel will show DNS configuration:**
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

---

### **Step 2: Configure Squarespace DNS**

1. **Log into Squarespace:**
   - Go to: https://account.squarespace.com/domains
   - Find `napalmsky.com`
   - Click **"Manage Domain"**

2. **Go to DNS Settings:**
   - Click **"Advanced DNS Settings"** or **"DNS Settings"**
   - You'll see a list of DNS records

3. **Update DNS Records:**

   **Remove existing records:**
   - Delete any existing `A` records pointing to Squarespace
   - Delete any existing `CNAME` records for `www`

   **Add Vercel records:**
   ```
   Type: A
   Host: @
   Data: 76.76.21.21
   TTL: 3600 (or Auto)
   
   Type: CNAME  
   Host: www
   Data: cname.vercel-dns.com
   TTL: 3600 (or Auto)
   ```

4. **Save Changes**

---

### **Step 3: Wait for DNS Propagation**

- **Time:** 5 minutes to 48 hours (usually 15-30 minutes)
- **Check status:** https://www.whatsmydns.net/#A/napalmsky.com

**When ready, Vercel will show:**
```
✅ napalmsky.com - Valid Configuration
✅ www.napalmsky.com - Valid Configuration
```

---

## 📋 **Part 2: Deploy Blacklist to napalmskyblacklist.com**

### **Option A: Subdomain on Same Vercel Project** (Recommended)

This keeps everything in one project but serves blacklist on a different domain.

1. **Add Domain in Vercel:**
   - Go to **Settings** → **Domains**
   - Click **"Add Domain"**
   - Enter: `napalmskyblacklist.com`
   - Vercel will provide DNS configuration

2. **Configure DNS (Squarespace or other registrar):**
   ```
   Type: A
   Host: @
   Data: 76.76.21.21
   
   Type: CNAME
   Host: www
   Data: cname.vercel-dns.com
   ```

3. **Add Vercel Rewrites** (in `next.config.js`):
   ```javascript
   // This will be added in the implementation below
   ```

---

### **Option B: Separate Vercel Project** (If you want complete separation)

Create a second Vercel project just for blacklist:
1. Create new Next.js project with just the blacklist page
2. Deploy to Vercel
3. Connect napalmskyblacklist.com to that project

**Downside:** Maintain two codebases
**Recommended:** Use Option A (same project, different domain)

---

## 📋 **Part 3: Hide Console Logs in Production**

### **Current Issue:**
Your codebase has **418 console.log statements** across 71 files.

In production, these:
- ❌ Expose internal logic
- ❌ Leak sensitive data
- ❌ Slow down performance
- ❌ Look unprofessional

### **Solution: Automatic Removal in Production**

I'll implement this in the next step.

---

## 📋 **Part 4: Security Hardening**

### **Current Security State:**
✅ Rate limiting (already implemented)
✅ CORS configuration (already implemented)
✅ Input sanitization (already implemented)
✅ SQL injection prevention (parameterized queries)
✅ XSS protection (security headers)

### **Additional Hardening Needed:**
1. ❌ Console logs expose logic
2. ❌ Source maps in production (expose code)
3. ❌ Environment variables in client
4. ❌ No CSP (Content Security Policy)
5. ❌ No request signing

I'll implement all of these in the next steps.

---

## 🎯 **Implementation Plan**

I will now implement:

### **1. Console Log Removal** (automatic in production)
### **2. Security Hardening** (CSP, headers, etc.)
### **3. Blacklist Subdomain** (hide header, configure routing)
### **4. Domain Configuration Files** (vercel.json)

Let me implement these now...

