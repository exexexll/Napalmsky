# Invite Code Tracking - Comprehensive Test
**Goal:** Verify uses are deducted correctly and only for NEW users

---

## 🎯 **How Tracking Works Now**

### **Invite Code Deduction Rules:**

| Scenario | Code Used? | Counter Change |
|----------|-----------|----------------|
| **New user signs up via QR** | ✅ YES | 4 → 3 |
| **Registered user clicks QR link** | ❌ NO | Stays 4 |
| **New user completes onboarding** | ✅ YES | Counted |
| **New user abandons after name** | ❌ NO | Not counted |
| **Admin QR code used** | N/A | Unlimited (no counter) |

---

## 🧪 **Complete Test Flow**

### **Setup: Create User A (Original)**

```
1. Clear browser: localStorage.clear()
2. Visit: http://localhost:3000/onboarding
3. Name: "Alice"
4. Click Continue
5. Click: 🧪 TEST: Bypass Payment
6. Should redirect to /main
7. Go to: http://localhost:3000/settings
8. See: "Friend Invites" with code
9. COPY the invite link
10. Note the counter: "4 / 4 left"
```

**Expected Server Logs:**
```
[TEST] Bypassing payment for Alice
[CodeGen] Generated code: ALICE16CHARCODE
[InviteCode] Created user code: ALICE16CHARCODE (4 uses)
```

---

### **Test 1: NEW User Uses Code (Should Deduct)**

```
1. Open incognito window
2. Paste Alice's invite link
   Example: http://localhost:3000/onboarding?inviteCode=ALICE16CHARCODE
3. Name: "Bob"
4. Click Continue
5. Should skip paywall ✅
6. Complete selfie + video
7. Access /main
8. Go to Bob's settings
9. Bob should see:
   - Status: qr_verified
   - My Code: BOB16CHARCODE (his own code)
   - Uses Left: 4 / 4
   - Joined Via: ALICE16CHARCODE
```

**Expected Server Logs:**
```
[InviteCode] Code ALICE16CHARCODE used by Bob - 3 uses remaining  ← DEDUCTED!
[Auth] ✅ User Bob verified via invite code: ALICE16CHARCODE
[Auth] Generated 4-use invite code for new user Bob: BOB16CHARCODE  ← BOB GETS OWN CODE!
```

**Go back to Alice's window:**
```
10. Refresh Alice's settings
11. Should now show: "3 / 4 left"  ✅
12. Debug panel: "Total Used: 1"
```

---

### **Test 2: REGISTERED User Clicks Code (Should NOT Deduct)**

```
1. In Alice's window, copy invite link again
2. Open NEW incognito window
3. Name: "Charlie"
4. Complete signup (use bypass button)
5. Now Charlie is registered with his own code
6. In Charlie's window, paste ALICE's invite link in address bar
7. Press Enter
```

**Expected Behavior:**
```
Browser: Redirects to http://localhost:3000/main
Console: [Onboarding] Registered user clicking invite code - redirecting to main (no code used)
```

**Server Logs (Should NOT see):**
```
❌ Should NOT see: [InviteCode] Code ALICE16CHARCODE used by Charlie...
```

**Check Alice's Settings:**
```
8. Go back to Alice's window
9. Refresh settings
10. Should STILL show: "3 / 4 left"  ✅ (no change!)
11. Debug: "Total Used: 1" (only Bob counted)
```

---

### **Test 3: Multiple New Users (Full Depletion)**

**Use Alice's code 3 more times with NEW users:**

```
User B (Bob): 4 → 3 ✅ (done above)
User C (Carol): 3 → 2
User D (Dave): 2 → 1
User E (Eve): 1 → 0

After 4 new signups:
Alice's counter: "0 / 4 left"
Alice's debug: "Total Used: 4"
Code still exists but disabled
```

**Try to use Alice's code again:**
```
User F tries to sign up with Alice's code
Server returns error: "This invite code has been fully used"
User F must pay $0.01 or find another code
```

---

## 🔍 **Verification Points**

### **In Settings Debug Panel:**

✅ **Correct Display:**
```
Status: paid (or qr_verified)
My Code: XXXXXXXXXXXXXX
Uses Left: 3 / 4
Total Used: 1
Joined Via: YYYYYYYYYYYY (if you used someone else's code)
```

### **In Server Logs:**

✅ **When NEW user signs up:**
```
[InviteCode] Code XXXX used by UserName - 3 uses remaining
[Auth] ✅ User UserName verified via invite code: XXXX
[Auth] Generated 4-use invite code for new user UserName: YYYY
```

✅ **When REGISTERED user clicks:**
```
[Onboarding] Registered user clicking invite code - redirecting to main (no code used)
(No InviteCode usage log)
```

---

## 📊 **Tracking Summary**

### **What Gets Counted:**
- ✅ New user completes name + gender (uses code during signup)
- ✅ User successfully onboards (gets their own code)
- ✅ Each successful referral = -1 from counter

### **What Doesn't Get Counted:**
- ❌ Registered user clicks invite link (redirects to main)
- ❌ User abandons signup before clicking Continue
- ❌ Invalid code attempts (failed validations)
- ❌ Admin QR codes (unlimited by design)

---

## ✅ **Viral Growth Chain**

```
Alice pays $0.01
   ↓
Gets 4-use code
   ↓
Shares with Bob, Carol, Dave, Eve (4 new users)
   ↓
Each of them gets 4-use code
   ↓
4 users × 4 codes = 16 potential new users
   ↓
And so on...
```

**Network Effect:** Each paid user can grow the network by 4× in their tier!

---

## 🎯 **Test All Scenarios Now**

With the updated code:
1. ✅ New users deduct from counter
2. ✅ Registered users don't deduct
3. ✅ New users get their own 4-use code
4. ✅ Counter shows real-time from InviteCode store
5. ✅ Debug panel shows full tracking

**Test and verify the counters update correctly!** 🎉

