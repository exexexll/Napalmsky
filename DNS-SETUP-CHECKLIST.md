# ✅ DNS Setup Checklist - Print This Out!

## 🎯 **Quick Reference Card**

---

## 📋 **Squarespace: napalmsky.com**

### **Option A: Nameservers** (Recommended)
```
☐ Log in: https://account.squarespace.com
☐ Click: Domains → napalmsky.com
☐ Click: DNS Settings
☐ Select: Use Custom Nameservers
☐ Enter: ns1.vercel-dns.com
☐ Enter: ns2.vercel-dns.com
☐ Click: Save
☐ Confirm: Yes
```

### **Option B: DNS Records**
```
☐ Log in: https://account.squarespace.com
☐ Click: Domains → napalmsky.com  
☐ Click: DNS Settings
☐ Delete: Existing A and CNAME records
☐ Add A Record:
   Type: A
   Host: @
   Data: 76.76.21.21
☐ Add CNAME:
   Type: CNAME
   Host: www
   Data: cname.vercel-dns.com
☐ Click: Save
```

---

## 📋 **Vercel: Add Domains**

```
☐ Log in: https://vercel.com
☐ Click: Your Napalmsky project
☐ Click: Settings → Domains
☐ Click: Add
☐ Enter: napalmsky.com
☐ Click: Add again
☐ Enter: www.napalmsky.com
☐ Click: Add again
☐ Enter: napalmskyblacklist.com
☐ Click: Add again
☐ Enter: www.napalmskyblacklist.com
```

---

## 📋 **Vercel: Environment Variables**

```
☐ Still in Settings
☐ Click: Environment Variables
☐ Add Variable:
   Key: NEXT_PUBLIC_APP_URL
   Value: https://napalmsky.com
   Environment: Production
☐ Add Variable:
   Key: NEXT_PUBLIC_API_BASE
   Value: https://your-railway-app.railway.app
   Environment: Production
☐ Click: Save
☐ Go to: Deployments tab
☐ Click: Redeploy latest
```

---

## 📋 **Verification** (After 30 minutes)

```
☐ Check: https://www.whatsmydns.net/#A/napalmsky.com
   Expected: 76.76.21.21 globally ✅

☐ Open: https://napalmsky.com
   Expected: Your app loads ✅

☐ Check: Browser shows 🔒 (SSL active)

☐ Press: F12 → Console tab
   Expected: NO console.log messages ✅

☐ Open: https://napalmskyblacklist.com
   Expected: Blacklist page without header ✅

☐ Test: All features work
   - Onboarding
   - Video calls
   - Matchmaking
   - Payments
```

---

## ⏰ **Timeline**

```
0 min:   Push code to GitHub
5 min:   Vercel auto-builds
10 min:  Configure DNS in Squarespace
15 min:  Add domains in Vercel
20 min:  DNS starts propagating
30 min:  napalmsky.com might be live!
2 hours: Definitely live (max propagation time)
```

---

## 🆘 **Quick Troubleshooting**

**Domain not loading?**
→ Check whatsmydns.net (might not be propagated yet)

**Console logs still showing?**
→ Hard refresh (Cmd+Shift+R), redeploy in Vercel

**SSL certificate error?**
→ Wait 15 more minutes (Vercel is provisioning)

**Blacklist shows header?**
→ Hard refresh browser, verify code deployed

---

## 📞 **DNS Values - Copy-Paste Ready**

### **For A Records:**
```
76.76.21.21
```

### **For CNAME (www):**
```
cname.vercel-dns.com
```

### **For Nameservers:**
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

---

## 🎯 **Success Criteria**

All boxes checked = Successful deployment!

```
☐ napalmsky.com loads app
☐ www.napalmsky.com redirects to napalmsky.com
☐ napalmskyblacklist.com loads blacklist
☐ SSL active on both (🔒 in browser)
☐ Console logs hidden in production
☐ Security headers present (curl -I)
☐ All features work
☐ Blacklist has no global header
```

---

**Print this checklist and follow step-by-step!** 📋✅

