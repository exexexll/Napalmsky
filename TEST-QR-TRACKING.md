# Test QR Code Tracking - Step by Step
**Goal:** Verify uses are deducted and new users get codes

---

## 🧪 **Test Scenario**

### **User A (Original):**
- Signs up first
- Uses bypass button
- Gets code with 4 uses
- Should see in settings: "4 / 4 left"

### **User B (Friend):**
- Uses User A's QR code
- Signs up successfully
- Should get their OWN 4-use code
- User A's code: "3 / 4 left"

### **User C (Friend of B):**
- Uses User B's QR code
- Signs up successfully  
- Gets their OWN 4-use code
- User B's code: "3 / 4 left"

---

## 📋 **Step-by-Step Test**

### **Step 1: Create User A**

1. **Clear browser:**
   ```javascript
   localStorage.clear();
   ```

2. **Sign up:**
   - Go to: http://localhost:3000/onboarding
   - Name: "Alice"
   - Gender: Female
   - Click Continue

3. **Bypass payment:**
   - Should see paywall
   - Click yellow button: "🧪 TEST: Bypass Payment"
   - Should redirect to /main

4. **Check settings:**
   - Go to: http://localhost:3000/settings
   - See debug panel:
     ```
     Status: paid
     My Code: XXXXXXXXXXXXXX (16 characters)
     Uses Left: 4 / 4
     Total Used: 0
     ```
   - See purple box with QR code
   - **Copy the invite code** (you'll need it for step 2)

---

### **Step 2: Create User B (Using Alice's Code)**

1. **Open incognito window**

2. **Visit Alice's invite link:**
   ```
   http://localhost:3000/onboarding?inviteCode=ALICE_CODE_HERE
   ```

3. **Sign up:**
   - Name: "Bob"
   - Gender: Male
   - Click Continue
   - **Should skip paywall!** (no payment required)

4. **Complete onboarding:**
   - Take selfie
   - Record video
   - Should access /main

5. **Check Bob's settings:**
   - Go to: http://localhost:3000/settings
   - Debug panel should show:
     ```
     Status: qr_verified
     My Code: YYYYYYYYYYYYYYYY (Bob's own code)
     Uses Left: 4 / 4
     Total Used: 0
     Joined Via: ALICE_CODE_HERE
     ```
   - **Bob should have his own QR code!** ✅

---

### **Step 3: Verify Alice's Uses Decreased**

1. **Go back to Alice's window** (original browser)

2. **Go to settings** or **refresh settings page**

3. **Debug panel should now show:**
   ```
   Status: paid
   My Code: XXXXXXXXXXXXXX
   Uses Left: 3 / 4  ← DECREASED!
   Total Used: 1     ← INCREASED!
   ```

4. **Purple box should show:** "3 / 4 left"

---

## ✅ **Expected Server Logs**

### **When User A Bypasses:**
```
[TEST] Bypassing payment for Alice
[CodeGen] Generated code: ALICE_CODE_16CHAR
[InviteCode] Created user code: ALICE_CODE_16CHAR (4 uses)
[TEST] ✅ Generated test invite code ALICE_CODE_16CHAR for Alice (4 uses)
```

### **When User B Signs Up with Alice's Code:**
```
[InviteCode] Code ALICE_CODE_16CHAR used by Bob - 3 uses remaining  ← DECREMENTED!
[Auth] ✅ User Bob verified via invite code: ALICE_CODE_16CHAR
[Auth] Generated 4-use invite code for new user Bob: BOB_CODE_16CHAR  ← BOB GETS CODE!
[InviteCode] Created user code: BOB_CODE_16CHAR (4 uses)
```

### **When Alice Checks Settings Again:**
```
GET /payment/status
# Returns: usesRemaining: 3, totalUsed: 1
```

---

## 🎯 **What You Should See**

### **Alice's Settings:**
- Before Bob signs up: "4 / 4 left"
- After Bob signs up: "3 / 4 left" ✅

### **Bob's Settings:**
- Has his own code (different from Alice's)
- Shows: "4 / 4 left"
- Shows: "Joined Via: ALICE_CODE"
- Has his own QR code to share ✅

---

## 🔍 **Debugging**

### **If Alice's counter doesn't decrease:**

1. **Check server logs** for:
   ```
   [InviteCode] Code XXXX used by Bob - 3 uses remaining
   ```
   If you see this, it IS working!

2. **Refresh Alice's settings page** - It fetches fresh data from server

3. **Check debug panel** - Shows real-time data from store

### **If Bob doesn't get a code:**

1. **Check server logs** for:
   ```
   [Auth] Generated 4-use invite code for new user Bob: YYYYYYYYYYYY
   ```
   
2. **If missing:** The auth.ts fix didn't apply - restart server

3. **Check Bob's settings debug panel** - Should show "My Code: YYYY..."

---

## ✅ **Success Criteria**

✅ Alice starts with: 4 / 4 left  
✅ Bob signs up using Alice's code  
✅ Alice now shows: 3 / 4 left  
✅ Bob gets his own code: 4 / 4 left  
✅ Bob's debug shows: "Joined Via: ALICE_CODE"  
✅ Bob can share his code with 4 more people  

---

**Test this flow now with the updated code!** 🎉

