# ✅ Payment-First Flow - Line-by-Line Verification

**Date:** October 16, 2025  
**Status:** ✅ REVERTED TO PAYMENT FIRST  
**Build:** ✅ SUCCESS

---

## 🔍 Complete Flow Trace (Referral User B)

### Step 1: Click Referral Link
```
URL: napalmsky.com/onboarding?ref=6HOEZLU8RR

File: app/onboarding/page.tsx
Lines 51-81:

51: useEffect(() => {
69:   if (ref) {
70:     setReferralCode(ref);
72:     sessionStorage.setItem('onboarding_ref_code', ref); ✅ STORED!
73:     console.log('[Onboarding] Referral code from URL:', ref);
...
154:   if (ref) {
155:     getReferralInfo(ref)
156:       .then(data => {
157:         setReferrerName(data.targetUserName);  // "Jason"
158:         setTargetUser(data.targetUser);        // User C's data
159:         console.log('[Onboarding] Being introduced to:', data.targetUserName);

Result:
✅ referralCode state: '6HOEZLU8RR'
✅ sessionStorage: 'onboarding_ref_code' = '6HOEZLU8RR'
✅ referrerName: 'Jason'
✅ targetUser: User C's full data
```

### Step 2: User B Enters Name "Alex" + Gender
```
File: app/onboarding/page.tsx
Line 550-571: Shows name form with referral banner ✅

Line 170-214: handleNameSubmit() runs:

180: const response = await createGuestAccount(name, gender, referralCode, inviteCode);
     - Backend creates user with:
       - introducedTo: User C's userId
       - introducedBy: User A's userId  
       - paidStatus: 'unpaid' (no invite code)

189-194: if (response.wasReferred) {
           setTargetUser(response.targetUser);  ✅ Set again from response
           setTargetOnline(response.targetOnline); ✅

196-205: PAYMENT CHECK (REVERTED TO FIRST!)
198: if (response.paidStatus === 'unpaid' && !response.inviteCodeUsed) {
199:   console.log('[Onboarding] User needs to pay - redirecting to paywall FIRST');
200:   sessionStorage.setItem('redirecting_to_paywall', 'true');
201:   sessionStorage.setItem('return_to_onboarding', 'true'); ✅ CRITICAL!
202:   router.push('/paywall');
203:   return; ✅ STOPS HERE, goes to paywall
...

Result:
✅ sessionStorage: 'return_to_onboarding' = 'true'
✅ Redirects to: /paywall
✅ Has NOT done selfie/video yet
```

### Step 3: Paywall Page
```
File: app/paywall/page.tsx

Shows: "Pay $0.50 & Continue" button
User clicks → Stripe checkout opens
```

### Step 4: User Pays on Stripe
```
Stripe webhook processes payment:
- paidStatus = 'paid'
- Generates invite code
- Redirects to: /payment-success?session_id=XXX
```

### Step 5: Payment Success Page
```
File: app/payment-success/page.tsx
Line 161-178:

163: onClick={() => {
164:   const returnToOnboarding = sessionStorage.getItem('return_to_onboarding');
     
166:   if (returnToOnboarding) {
167:     console.log('[Payment Success] Returning to onboarding to complete profile');
168:     sessionStorage.removeItem('return_to_onboarding'); ✅ CLEAN UP
169:     router.push('/onboarding'); ✅ BACK TO ONBOARDING!
...

Result:
✅ Checks sessionStorage flag
✅ Flag exists: 'return_to_onboarding' = 'true'
✅ Redirects to: /onboarding
✅ User still needs to do selfie + video
```

### Step 6: Return to Onboarding (Now Paid!)
```
File: app/onboarding/page.tsx
Lines 74-137: useEffect with existing session check

74: const existingSession = getSession();
78: if (existingSession) {
79-89: Check for ref/invite in URL
        - No ref in URL now (came from payment-success)
        - But sessionStorage still has it! ✅

94: fetch('/user/me') to check profile
97: .then(data => {
100:   const hasCompletedProfile = data.selfieUrl && data.videoUrl;
      - Result: FALSE (no selfie or video yet!)

115-128: Profile incomplete - resume onboarding
116:   setSessionToken(existingSession.sessionToken);
117:   setUserId(existingSession.userId);
      
121-127: Determine which step:
122:   if (!data.selfieUrl) {
123:     setStep('selfie'); ✅ RESUMES AT SELFIE!

Result:
✅ Resumes at selfie step
✅ User now has paid status
✅ sessionStorage still has ref code
```

### Step 7: Complete Selfie
```
User captures selfie → Upload → setStep('video')
```

### Step 8: Complete Video
```
File: app/onboarding/page.tsx
Lines 383-459: Video upload completion

432-459: After video uploads:

437: const storedRef = sessionStorage.getItem('onboarding_ref_code');
     - Result: '6HOEZLU8RR' ✅ FOUND!

439: if (targetUser || storedRef) {
     - Condition: TRUE ✅

441-451: if (storedRef && !targetUser) {
           - Fetch target user from ref code
444:       const refData = await fetch('.../referral/info/${storedRef}');
445:       setTargetUser(refData.targetUser); ✅
446:       setReferrerName(refData.createdByName); ✅
447:       setTargetOnline(refData.targetOnline); ✅

453: console.log('[Onboarding] Showing introduction screen for referral user');
454: setStep('introduction'); ✅ SHOULD SHOW INTRODUCTION!

Result:
✅ targetUser is set
✅ referrerName is set  
✅ step changed to 'introduction'
✅ SHOULD SHOW INTRODUCTION SCREEN!
```

### Step 9: Introduction Screen
```
File: app/onboarding/page.tsx
Line 821-833:

821: {step === 'introduction' && targetUser && (
822:   <IntroductionComplete
823:     targetUser={targetUser}
824:     introducedBy={referrerName || 'a friend'}
825:     isTargetOnline={targetOnline}
826:     referralCode={referralCode || ''}
827:     onCallNow={handleCallTarget}
828:     onSkip={handleSkipIntroduction}
829:   />
830: )}

Result:
✅ Condition: step === 'introduction' ✅
✅ Condition: targetUser exists ✅
✅ Should render IntroductionComplete component!

Component shows:
- User C's (Jason's) photo
- "Introduced by Hansen"
- Online status
- "Call them now" button
```

### Step 10: Click "Call Them Now"
```
File: app/onboarding/page.tsx
Line 518-527: handleCallTarget()

520:   localStorage.setItem('napalmsky_direct_match_target', targetUser.userId);
521:   localStorage.setItem('napalmsky_auto_invite', 'true');
523:   router.push('/main?openMatchmaking=true&targetUser=' + targetUser.userId);

Result:
✅ Opens /main with matchmaking overlay
✅ Direct matches to User C (Jason)
```

---

## 🔍 Why Introduction Screen Might Not Show

### Potential Issue #1: targetUser Not Set
```
Check: Line 445 - setTargetUser(refData.targetUser)
- Does refData.targetUser exist?
- Is fetch successful?
- Add console.log to verify
```

### Potential Issue #2: Condition Fails
```
Check: Line 821 - {step === 'introduction' && targetUser && (
- Is step actually 'introduction'?
- Is targetUser actually set with data?
- Is it truthy?
```

### Potential Issue #3: Ref Code Lost
```
Check: Line 437 - sessionStorage.getItem('onboarding_ref_code')
- Does it still exist after payment redirect?
- Was it cleared somewhere?
- Check browser sessionStorage
```

---

## ✅ Flow Verification Checklist

### Normal User (No Referral)
```
1. Name → Unpaid → /paywall ✅
2. Pay → /payment-success → /onboarding ✅
3. Selfie → Video ✅
4. No ref code → step='permanent' ✅
5. Skip → /main ✅

Expected: ✅ WORKS
```

### Invite Code User (No Referral)
```
1. Name + code → Verified → Selfie ✅
2. Selfie → Video ✅
3. No ref code → step='permanent' ✅
4. Skip → /main ✅

Expected: ✅ WORKS
```

### Referral User (No Invite Code) - YOUR SCENARIO
```
1. /onboarding?ref=XXX
2. Name → Unpaid → /paywall ✅
3. Pay → /payment-success
   - Has 'return_to_onboarding' flag → /onboarding ✅
4. Selfie → Video ✅
5. Has ref code in sessionStorage → Fetch target
6. setStep('introduction') ✅
7. SHOULD SHOW INTRODUCTION SCREEN

Question: Why doesn't it show?

Debug steps needed:
- Log targetUser value at line 821
- Log step value at line 821
- Check if condition passes
```

---

## 🚀 Testing Instructions

To verify introduction screen shows:

```javascript
// Add console logs:

// After line 445:
console.log('[DEBUG] targetUser after fetch:', targetUser);
console.log('[DEBUG] referrerName after fetch:', referrerName);

// Before line 454:
console.log('[DEBUG] About to setStep(introduction), targetUser:', targetUser);

// At line 821:
console.log('[DEBUG] Rendering check - step:', step, 'targetUser:', targetUser);
```

Then test:
1. Click referral link
2. Enter name
3. See paywall → Pay
4. See payment success → Continue
5. Complete selfie → video
6. Check console for DEBUG logs
7. Should see introduction screen

---

## ✅ Current Status

**Payment Timing:** ✅ FIRST (before profile)  
**Flow:** Name → Paywall → Payment → Selfie → Video → Introduction  
**sessionStorage:** ✅ Preserves ref code  
**Build:** ✅ SUCCESS  

**Ready to test - introduction screen SHOULD show!**

If it doesn't, the console logs will tell us exactly why.

