# Blacklist System - Quick Start Guide

## 🚀 Get Started in 5 Minutes

This guide will help you test the complete blacklist and reporting system locally.

---

## Step 1: Start the Servers

### Terminal 1 - Backend Server
```bash
cd server
npm install   # If you haven't already
npm run dev
```

You should see:
```
🚀 Server running on port 3001
   API: http://localhost:3001
   WebSocket: ws://localhost:3001
```

### Terminal 2 - Frontend Server
```bash
# From project root
npm install   # If you haven't already
npm run dev
```

You should see:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
```

---

## Step 2: Test the Report Flow

### A. Create Test Users

1. Open **4 different browser windows** (use incognito/private windows)
2. In each window, go to `http://localhost:3000`
3. Create a user account in each:
   - Window 1: "Reporter1" 
   - Window 2: "Reporter2"
   - Window 3: "Reporter3"
   - Window 4: "Reporter4"

4. Create one more user who will be the "target" (the one getting reported):
   - Window 5 (regular browser): "BadUser"

### B. Simulate a Call and Report

**In Window 1 (Reporter1):**
1. Complete onboarding (name, selfie, video)
2. Go to `/main` (dashboard)
3. Note: In a real scenario, you'd call "BadUser" first, but for testing we can simulate

**Directly test reporting:**

Open browser console and run:
```javascript
// Get your session token
const session = JSON.parse(localStorage.getItem('napalmsky_session'));

// Replace with BadUser's userId (check their localStorage in Window 5)
const badUserId = 'PASTE_BADUSER_USERID_HERE';

// Submit report
fetch('http://localhost:3001/report/user', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.sessionToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reportedUserId: badUserId,
    reason: 'Inappropriate behavior during call'
  })
}).then(r => r.json()).then(console.log);
```

### C. Repeat for All Reporters

Repeat Step B in Windows 2, 3, and 4 with Reporter2, Reporter3, and Reporter4.

**On the 4th report**, you'll see:
```json
{
  "success": true,
  "reportId": "...",
  "autoBanned": true,
  "reportCount": 4,
  "message": "Report submitted. User has been temporarily banned pending review."
}
```

---

## Step 3: Check Ban Status

### A. BadUser Tries to Access Site

**In Window 5 (BadUser's window):**

1. Refresh the page
2. You should immediately see the **Ban Notification Screen** 🚫

The screen shows:
- "Account Suspended"
- "Your account has been temporarily suspended..."
- Report count: 4
- Ban reason: "Auto-banned: 4 reports received"
- Status: "Pending Review"

### B. Try to Login Again

1. Click "Logout" on the ban screen
2. Try to login again with BadUser's account
3. You'll get a 403 error: "Account suspended"

### C. Check IP Ban

Open a new incognito window from the same computer (same IP):
1. Try to access `http://localhost:3000`
2. You'll get a 403 error immediately (IP is banned)

---

## Step 4: Admin Review

### A. Access Admin Panel

**In any reporter's window (or create a new admin account):**

1. Navigate to `http://localhost:3000/admin`
2. You should see the **Admin Dashboard**

### B. Review the Ban

You'll see:
- **Statistics Card:**
  - Total Reports: 4
  - Pending Reviews: 1
  - Temporary Bans: 1

- **Pending Reviews Tab:**
  - BadUser's profile with photo
  - "4 reports • Banned [date]"
  - All 4 reports listed with reasons

### C. Make a Decision

**Option 1: Permanent Ban**
1. Click "Permanent Ban" button
2. BadUser is now permanently banned
3. Added to public blacklist

**Option 2: Vindicate**
1. Click "Vindicate" button
2. Ban is lifted
3. BadUser can access site again
4. IP is unbanned

---

## Step 5: View Public Blacklist

### A. Navigate to Blacklist

1. Go to `http://localhost:3000/blacklist`
2. No authentication required - it's public!

### B. See Banned Users

If you chose "Permanent Ban" in Step 4:
- You'll see BadUser in the grid
- Photo, name, video displayed
- Ban reason: "Multiple reports for harassment" (or custom reason)
- Report count: 4

### C. Test Search

Type "Bad" in the search box → BadUser appears

---

## Step 6: Test Vindication (Optional)

If you chose "Permanent Ban" in Step 4, you can test vindication:

### A. Go Back to Admin Panel
1. Navigate to `/admin`
2. You won't see BadUser in "Pending" anymore (already reviewed)

### B. To Re-Test:
You'll need to reset the system or create a new test user.

---

## 🎯 Quick Test Checklist

Use this checklist to verify everything works:

- [ ] Created 5 test users (4 reporters + 1 target)
- [ ] Submitted 4 reports from different users
- [ ] Saw "autoBanned: true" on 4th report
- [ ] Ban notification screen appeared for banned user
- [ ] Banned user cannot login (403 error)
- [ ] IP ban prevents access (even from new session)
- [ ] Admin panel shows pending review
- [ ] Admin panel displays all reports correctly
- [ ] Made permanent ban decision
- [ ] Saw banned user on public blacklist
- [ ] Search works on blacklist page
- [ ] Tested vindication (optional)

---

## 🔍 Debugging Tips

### Can't See Ban Notification?

Check browser console for errors. Make sure:
```javascript
// BanNotification component is loaded in AuthGuard
// Check in browser DevTools:
localStorage.getItem('napalmsky_session')  // Should have token
```

### Reports Not Counting?

Check server console:
```
[Report] User BadUser reported by Reporter1
[Report] User BadUser now has 1 reports
```

### IP Ban Not Working?

Check server console:
```
[Security] 🚫 Blocked request from banned IP: ::1
```

Note: On localhost, IP might be `::1` (IPv6) or `127.0.0.1`

### Admin Panel Empty?

Make sure you:
1. Have valid session token
2. Submitted at least 4 reports
3. Triggered auto-ban

---

## 📱 Test on Different Devices (Optional)

To test IP ban across devices:

1. Deploy to local network (use your computer's IP)
2. Access from phone and laptop on same WiFi
3. Ban a user from laptop
4. Try to access from phone → Blocked!

---

## 🎓 Understanding the Flow

```
Reporter1 reports BadUser → Report 1/4
Reporter2 reports BadUser → Report 2/4  
Reporter3 reports BadUser → Report 3/4
Reporter4 reports BadUser → Report 4/4 → AUTO-BAN! 🚫

BadUser banned (temporary) → Review status: Pending
↓
Admin reviews → Sees all 4 reports + evidence
↓
Admin decides:
  → Permanent Ban → Public Blacklist ☠️
  OR
  → Vindicate → Ban Lifted ✅
```

---

## 🆘 Common Issues

### "Cannot find module './referral'"
This is a TypeScript compilation issue. Solution:
```bash
cd server
npm run build  # Rebuild TypeScript
npm run dev    # Restart
```

### "CORS Error"
Make sure:
- Server is running on port 3001
- Frontend is running on port 3000
- Check `server/src/index.ts` CORS settings

### "User not found"
Make sure you're using the correct userId from localStorage:
```javascript
JSON.parse(localStorage.getItem('napalmsky_session')).userId
```

---

## 🎉 Success!

If you completed all steps, you've successfully tested:
✅ Report submission
✅ Auto-ban at 4 reports  
✅ IP ban enforcement
✅ Ban notification screen
✅ Admin review workflow
✅ Public blacklist

**The system is fully functional!**

---

## 📚 Next Steps

- Read `BLACKLIST-SYSTEM-DOCUMENTATION.md` for full technical details
- Read `IMPLEMENTATION-SUMMARY.md` for feature overview
- Check API documentation for integration
- Follow cloud deployment guide when ready

---

## 🤝 Need Help?

Check these files:
- **Full Documentation:** `BLACKLIST-SYSTEM-DOCUMENTATION.md`
- **Implementation Summary:** `IMPLEMENTATION-SUMMARY.md`
- **Code Comments:** Inline comments in all files

---

Happy testing! 🚀

