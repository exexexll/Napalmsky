# 🔍 Issues Analysis Before Fixes

## Issue 1: Timer Freezing on CalleeNotification

**Problem:** User B's timer input freezes when they try to change it

**Investigation:**
- Component: `components/matchmake/CalleeNotification.tsx`
- Timer state: `const [seconds, setSeconds] = useState(invite.requestedSeconds);` - Line 25 ✅
- Input handler: `handleSecondsChange` - Line 64-67 ✅
- Input element: Line 142-149 ✅

**Potential Issue:**
- The `timeLeft` countdown (20s to respond) runs every second
- Multiple re-renders might cause input lag
- Or the value formatting with `padStart(3, '0')` might interfere with typing

**Not a bug in code logic** - might be performance/UX issue.

---

## Issue 2: Notification Sent Too Early

**Problem:** User B (referrer) gets notification when User C enters name, but User C hasn't finished onboarding yet (no selfie/video), so shows as "not online"

**Current Flow:**
```
User A introduces User C to User B
  ↓
User C clicks referral link
  ↓
User C enters name → Submits ← NOTIFICATION SENT HERE!
  ↓
Backend creates notification for User B
  ↓
User B sees: "User C wants to connect!"
  ↓
User B checks - User C is "offline" (hasn't completed profile yet)
  ↓
User C still doing: Selfie → Video → Complete profile
  ↓
User C finally online but User B already saw them as offline
```

**Location:** `server/src/auth.ts:145-174`

**Fix Needed:**
- Don't send notification when name is submitted
- Send notification AFTER profile is complete (selfie + video uploaded)
- Or send notification after user joins queue for first time

---

## Issue 3: Chrome Notification Popup

**Status:** ✅ NOT USING Chrome notifications!

Searched for:
- `new Notification`
- `Notification.permission`
- `requestPermission`

**Result:** No matches found

**The app uses custom in-app notifications via `ReferralNotifications` component.** This is already correct!

---

## Issue 4: Manifesto Page Text

**Current:** Long personal story about saying no, missing out on love, etc.

**Requested:** Shorter, more focused text emphasizing:
- 500 Days of Summer quote
- Serendipity and trying again
- Sanctuary for wanderers
- No algorithms, equal ground
- Carpe Diem message

**Action:** Replace entire manifesto content with user's provided text.

---

## 📝 Summary

**Issue 1 (Timer):** Might be UX/performance, not a bug - will review input behavior  
**Issue 2 (Notification):** REAL BUG - notification sent too early ✅  
**Issue 3 (Chrome notif):** NOT AN ISSUE - already using custom ✅  
**Issue 4 (Manifesto):** Easy text replacement ✅  

Proceeding with fixes...

