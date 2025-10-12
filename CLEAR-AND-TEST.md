# Clear Browser & Test - Quick Guide

## 🧹 **Step 1: Clear Browser (REQUIRED)**

**Open browser console (F12) and paste:**
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

This will:
- Clear old invalid sessions
- Remove all cached data
- Refresh the page

---

## ✅ **Step 2: Test Onboarding**

Now visit: http://localhost:3000/onboarding

**Should work normally:**
- ✅ Doesn't auto-redirect anymore
- ✅ Can enter name + gender
- ✅ Proceeds to paywall

---

## 🎯 **Step 3: Test Hover Animation**

1. Create account
2. Use bypass button
3. Go to matchmaking
4. **Hover on/off the card**
5. Watch UI minimize smoothly
6. **Navigate to next card** - should load without flickering

---

## 🔧 **What I Fixed:**

### **Issue 1: Auto-Redirect**
- **Problem:** Onboarding was redirecting even with invalid session
- **Fix:** Now validates session with server first
- **Result:** Invalid sessions get cleared, onboarding works

### **Issue 2: 401 Errors**
- **Cause:** Old sessions in localStorage after server restart
- **Fix:** Clear localStorage (step 1 above)
- **Prevention:** Session validation added

### **Issue 3: Hover Flickering**
- **Problem:** Animation played on card load
- **Fix:** Added `initial` props to all motion components
- **Result:** Loads instantly, animates only on hover change

---

**All servers running! Just clear browser and test.** 🎉

