# 📋 Squarespace DNS Configuration - Exact Steps

## 🎯 **Goal**

Connect your Squarespace domain `napalmsky.com` to Vercel where your app is deployed.

---

## 🌐 **Step-by-Step Instructions**

### **Step 1: Log into Squarespace (2 minutes)**

1. **Open browser and go to:**
   ```
   https://account.squarespace.com
   ```

2. **Log in** with your Squarespace credentials

3. **After login, you'll see your account dashboard**

---

### **Step 2: Find Your Domain (1 minute)**

1. **Look for navigation menu on the left**
2. **Click: "Domains"** (should show a list of your domains)
3. **Find: napalmsky.com** in the list
4. **Click on: napalmsky.com** to open domain settings

---

### **Step 3: Access DNS Settings (1 minute)**

You'll see several options:

```
┌─────────────────────────────────┐
│ napalmsky.com                   │
├─────────────────────────────────┤
│ Overview                        │
│ DNS Settings          ← CLICK   │
│ Email                           │
│ Transfer Domain                 │
│ Auto-Renew                      │
└─────────────────────────────────┘
```

**Click: "DNS Settings"** or **"Advanced DNS Settings"**

---

### **Step 4: Choose Configuration Method**

You'll have two options - **choose ONE**:

---

## ✅ **METHOD A: Change Nameservers** (Recommended - Easier)

### **This transfers DNS control to Vercel (simplest)**

1. **In DNS Settings, find:**
   ```
   Nameservers
   ○ Use Squarespace Nameservers
   ○ Use Custom Nameservers  ← SELECT THIS
   ```

2. **Click: "Use Custom Nameservers"**

3. **Enter Vercel Nameservers:**
   ```
   ┌────────────────────────────────────┐
   │ Nameserver 1:                      │
   │ ns1.vercel-dns.com                 │
   ├────────────────────────────────────┤
   │ Nameserver 2:                      │
   │ ns2.vercel-dns.com                 │
   └────────────────────────────────────┘
   ```

4. **Warning will appear:**
   ```
   ⚠️ Changing nameservers will transfer DNS control
      to Vercel. Your Squarespace email forwarding
      and other DNS records will stop working.
   ```

5. **Click: "Save" or "Apply Changes"**

6. **Confirm: "Yes, I understand"**

7. **✅ Done!** DNS now controlled by Vercel

**Pros:**
- ✅ Simplest method
- ✅ Vercel manages everything
- ✅ Fastest propagation (5-30 min)
- ✅ Auto SSL certificate

**Cons:**
- ❌ Lose Squarespace email forwarding
- ❌ Must manage all DNS in Vercel

---

## ✅ **METHOD B: Add DNS Records** (Keep Squarespace DNS)

### **This keeps Squarespace in control, just points domain to Vercel**

1. **In DNS Settings, find "DNS Records" section**

2. **Remove Conflicting Records:**
   - Look for existing `A` records with Host: `@`
   - Click the **trash icon** ❌ next to each one
   - Look for existing `CNAME` with Host: `www`
   - Click the **trash icon** ❌ to delete

3. **Add Vercel A Record:**
   ```
   Click: "+ Add Record" or "Add DNS Record"
   
   ┌────────────────────────────────────┐
   │ Record Type: A                     │
   │                                    │
   │ Host: @                            │
   │                                    │
   │ Data/Points to: 76.76.21.21        │
   │                                    │
   │ TTL: 3600 (or Auto)                │
   └────────────────────────────────────┘
   
   Click: "Add" or "Save"
   ```

4. **Add Vercel CNAME for www:**
   ```
   Click: "+ Add Record" again
   
   ┌────────────────────────────────────┐
   │ Record Type: CNAME                 │
   │                                    │
   │ Host: www                          │
   │                                    │
   │ Data/Points to:                    │
   │ cname.vercel-dns.com               │
   │                                    │
   │ TTL: 3600 (or Auto)                │
   └────────────────────────────────────┘
   
   Click: "Add" or "Save"
   ```

5. **Save All Changes:**
   - Look for "Save" or "Apply" button at top/bottom
   - Click it to commit changes

6. **✅ Done!** Records configured

**Pros:**
- ✅ Keep Squarespace email
- ✅ Keep other DNS records
- ✅ More control

**Cons:**
- ❌ Slightly more complex
- ❌ Slower propagation (30 min - 2 hours)

---

## 🔍 **Verification**

### **Immediately After Saving:**

1. **Check Squarespace Dashboard:**
   - DNS Records section should show:
     ```
     A     @      76.76.21.21       3600
     CNAME www    cname.vercel-dns.com  3600
     ```

2. **Check Vercel Dashboard:**
   - Go to: Vercel → Your Project → Settings → Domains
   - Should show:
     ```
     ⏳ napalmsky.com - Pending Configuration
     ⏳ www.napalmsky.com - Pending Configuration
     ```

---

### **After 15-30 Minutes:**

1. **Check DNS Propagation:**
   - Go to: https://www.whatsmydns.net/#A/napalmsky.com
   - Select: "A" record type
   - Enter: napalmsky.com
   - Click: "Search"
   - **Should show:** Green checkmarks globally with IP `76.76.21.21`

2. **Check Vercel:**
   - Refresh: Vercel → Settings → Domains
   - Should now show:
     ```
     ✅ napalmsky.com - Valid Configuration
     ✅ www.napalmsky.com - Valid Configuration
     🔒 SSL Certificate: Active
     ```

3. **Test in Browser:**
   ```
   1. Open: https://napalmsky.com
   2. Should load your app! 🎉
   3. Check URL bar: Should show 🔒 (SSL active)
   4. Press F12 → Console
   5. Should see: NO console.log messages ✅
   ```

---

## 📋 **For napalmskyblacklist.com**

### **Same Process, Different Domain:**

1. **In Squarespace (or your registrar for this domain):**
   - Find: napalmskyblacklist.com
   - Go to: DNS Settings

2. **Add Records:**
   ```
   A Record:
   Host: @
   Data: 76.76.21.21
   
   CNAME:
   Host: www
   Data: cname.vercel-dns.com
   ```

3. **In Vercel:**
   - Add: napalmskyblacklist.com
   - Vercel will automatically route to /blacklist page

4. **Verify:**
   - https://napalmskyblacklist.com → Shows blacklist
   - Global header is hidden ✅

---

## ⚠️ **Common Mistakes**

### **❌ Wrong: Typing IP as hostname**
```
WRONG: cname.vercel-dns.com → 76.76.21.21
RIGHT: @ → 76.76.21.21
```

### **❌ Wrong: Using @ in CNAME**
```
WRONG: 
  Type: CNAME
  Host: @
  
RIGHT:
  Type: A
  Host: @
```

### **❌ Wrong: Adding http:// or https://**
```
WRONG: Data: https://cname.vercel-dns.com
RIGHT: Data: cname.vercel-dns.com
```

### **❌ Wrong: Leaving old Squarespace A records**
```
Delete ALL existing A records before adding Vercel's
Otherwise domain will point to wrong place
```

---

## 🎯 **Final Checklist**

Before you start:
- [ ] Code changes committed (I did this already ✅)
- [ ] Vercel account ready
- [ ] Squarespace account ready
- [ ] Both domains owned (napalmsky.com + napalmskyblacklist.com)

During setup:
- [ ] Added domains in Vercel
- [ ] Copied DNS values from Vercel
- [ ] Updated DNS in Squarespace
- [ ] Saved all changes

After setup:
- [ ] Waited 30+ minutes
- [ ] Checked DNS propagation (whatsmydns.net)
- [ ] Verified Vercel shows "Valid Configuration"
- [ ] Tested both domains in browser
- [ ] Verified console logs hidden
- [ ] Verified blacklist header hidden

---

## 🎊 **When Complete**

You'll have:
- ✅ napalmsky.com → Your full app
- ✅ napalmskyblacklist.com → Blacklist only (no header)
- ✅ Console logs hidden in production
- ✅ Security headers enforced
- ✅ SSL/TLS encryption
- ✅ Professional production setup

**Ready to go live!** 🌐🚀

---

**NEXT STEP:** Tell me when you're ready, and I'll commit and push these changes!

