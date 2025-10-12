# Direct Match & Enhanced Referral System - Implementation Strategy

## Current Referral Flow

**Actors:**
- **User A** (Introducer): Creates intro link
- **User B** (Target): Person being introduced to  
- **User C** (New user): Signs up via link to meet User B

**Current System:**
```typescript
// Referral Mapping
{
  code: "ABC12345",
  targetUserId: "user-b-id",
  targetName: "User B",
  createdByUserId: "user-a-id",
  createdByName: "User A",
  createdAt: timestamp
}

// After User C signs up:
// - Notification created FOR User B
// - Notification contains: User C's userId and name
// - But no direct link between them
```

---

## New Features to Implement

### 1. Store Introduction Relationship
Track that User C was introduced to User B via referral code

### 2. "Call Now" Button in Notification (User B side)
- User B receives notification: "User C wants to connect with you!"
- Button: "Call Now"
- Checks if User C is online
- If online: Sends direct invite
- If offline: Shows "User C is not online right now"

### 3. Direct Match After Onboarding (User C side)
After User C completes onboarding, show:
- Message: "You were introduced to User B!"
- Check if User B is online
- If online: Show "Call User B Now" button
- If offline: "User B is not online. Come back later!"

### 4. Direct Match Code Input (User C side)
On main page, add input field:
- "Have an intro code? Enter it here: [input] [Match]"
- User C enters: "ABC12345"
- System finds User B from code
- Check if User B is online
- Navigate to User B's card OR send direct invite

### 5. Introduction Context on Cards
When browsing, if users were introduced:
- Show badge: "Introduced by User A"
- Prioritize in reel

---

## Implementation Details

### Backend Changes

#### 1. Update User Type - Store Introduction
```typescript
// server/src/types.ts
export interface User {
  // ... existing fields
  introducedTo?: string;  // userId they were introduced to (target)
  introducedViaCode?: string;  // referral code used
  introducedBy?: string;  // userId of person who made intro (creator)
}
```

#### 2. Update Auth Route - Save Introduction Info
```typescript
// server/src/auth.ts - POST /auth/guest
if (referralInfo) {
  const user: User = {
    // ... existing fields
    introducedTo: referralInfo.targetUserId,
    introducedViaCode: referralCode,
    introducedBy: referralInfo.createdByUserId,
  };
}
```

#### 3. New Referral Endpoints
```typescript
// GET /referral/target-status/:code
// Check if target user is online and available
// Returns: { targetUserId, targetName, isOnline, isAvailable }

// POST /referral/direct-match
// Body: { referralCode }
// Checks if target is online, returns target user info
// Returns: { target: User, isOnline, canCall }
```

#### 4. Update Notifications - Include Action Data
```typescript
export interface ReferralNotification {
  // ... existing fields
  referredUserId: string;  // User C's ID
  referredName: string;    // User C's name
  canCallNow?: boolean;    // Is User C online?
}
```

#### 5. Socket Event for Direct Invites
```typescript
// New event: 'referral:direct-invite'
// Sent when User B clicks "Call Now" from notification
// Or when User C clicks "Call User B Now" after signup
```

### Frontend Changes

#### 1. Update Notification Component - Add "Call Now"
```typescript
// components/ReferralNotifications.tsx
<button onClick={() => handleCallNow(notification.referredUserId)}>
  {isOnline ? 'Call Now' : 'Offline'}
</button>
```

#### 2. Post-Onboarding Introduction Screen
```typescript
// app/onboarding/page.tsx
// After completing onboarding with ref code:
if (wasReferred && targetUserInfo) {
  // Show special screen
  <IntroductionComplete
    targetUser={targetUserInfo}
    isTargetOnline={isOnline}
    onCallNow={handleCallTarget}
  />
}
```

#### 3. Direct Match Input on Main Page
```typescript
// app/main/page.tsx
<DirectMatchInput
  onMatch={(code) => handleDirectMatch(code)}
/>

// Shows:
// "Have an intro code? [_______] [Match]"
// On match: Checks online status → navigates to card or shows offline message
```

#### 4. Enhanced User Cards - Show Introduction Badge
```typescript
// components/matchmake/UserCard.tsx
{user.wasIntroducedByMe && (
  <Badge>Introduced by {introducerName}</Badge>
)}
```

#### 5. Update Matchmaking - Prioritize Introductions
```typescript
// components/matchmake/MatchmakeOverlay.tsx
// Sort users: introductions first, then others
const sortedUsers = [
  ...usersIntroducedToMe,
  ...otherUsers
];
```

---

## User Flows

### Flow 1: User B Calls User C from Notification

```
1. User C signs up via intro link
2. User B receives notification popup
3. User B sees: "User C wants to connect with you! [Call Now]"
4. User B clicks "Call Now"
5. System checks if User C is online
   - If YES: Opens matchmaking with User C's card
   - If NO: Shows toast "User C is not online right now"
```

### Flow 2: User C Calls User B After Onboarding

```
1. User C completes onboarding with ref=ABC12345
2. Instead of going to main page, sees special screen:
   "You were introduced to User B!"
   [Profile preview of User B]
3. System checks if User B is online
   - If YES: Shows "Call User B Now" button
   - If NO: Shows "User B is not online. You can find them in matchmaking later!"
4. User C clicks "Call Now" (if online)
5. Opens matchmaking with User B's card ready to call
```

### Flow 3: User C Uses Direct Match Code

```
1. User C is on main page
2. Sees: "Have an intro code? [_______] [Match]"
3. User C enters: "ABC12345"
4. Clicks "Match"
5. System fetches target info (User B)
6. Checks if User B is online
   - If YES: Opens matchmaking, finds User B's card
   - If NO: Shows "User B (from intro) is not online"
```

### Flow 4: Introduction Context in Browsing

```
1. User C opens matchmaking
2. Browses through cards
3. When User B's card appears:
   - Shows badge: "👥 Introduced by User A"
   - Card is prioritized (appears first in reel)
4. User C remembers context and can call
```

---

## Database Schema (Cloud-Ready)

### Users Table Updates
```sql
ALTER TABLE users 
  ADD COLUMN introduced_to UUID,
  ADD COLUMN introduced_via_code VARCHAR(10),
  ADD COLUMN introduced_by UUID,
  ADD INDEX idx_introduced_to (introduced_to),
  ADD INDEX idx_introduced_via_code (introduced_via_code);
```

### Referral Notifications Updates
```sql
ALTER TABLE referral_notifications
  ADD COLUMN can_call_now BOOLEAN DEFAULT FALSE;
```

---

## API Endpoints Summary

### New Endpoints
```
GET  /referral/target-status/:code
     - Check if target is online
     - Returns: { targetUserId, targetName, isOnline, isAvailable }

POST /referral/direct-match
     - Body: { referralCode }
     - Returns: { targetUser, isOnline, canCall }

GET  /referral/my-introductions
     - Get list of people introduced to me
     - Returns: [{ userId, name, introducedBy, createdAt, isOnline }]
```

### Updated Endpoints
```
POST /auth/guest
     - Now stores: introducedTo, introducedViaCode, introducedBy
     - Returns: { ..., targetUser: { id, name }, targetOnline: boolean }
```

---

## Component Files to Create/Update

### New Components
```
components/DirectMatchInput.tsx          - Code input widget
components/IntroductionComplete.tsx      - Post-onboarding screen
components/IntroductionBadge.tsx         - Badge for user cards
```

### Updated Components
```
components/ReferralNotifications.tsx     - Add "Call Now" button
components/matchmake/UserCard.tsx        - Show introduction badge
components/matchmake/MatchmakeOverlay.tsx - Prioritize introductions
app/onboarding/page.tsx                  - Show introduction screen
app/main/page.tsx                        - Add direct match input
```

---

## Testing Checklist

### Test 1: User B Calls User C
- [ ] User C signs up → User B gets notification
- [ ] User C is online → "Call Now" button works
- [ ] User C is offline → Shows "Offline" message
- [ ] Clicking "Call Now" opens matchmaking with User C's card

### Test 2: User C Calls User B After Signup
- [ ] User C completes onboarding → sees introduction screen
- [ ] User B is online → Shows "Call Now" button
- [ ] User B is offline → Shows offline message
- [ ] Clicking "Call Now" navigates to User B's card

### Test 3: Direct Match Code
- [ ] User C enters valid code → finds User B
- [ ] User B is online → navigates to card
- [ ] User B is offline → shows message
- [ ] Invalid code → shows error

### Test 4: Introduction Context
- [ ] User B's card shows "Introduced by User A" badge
- [ ] User B appears first in User C's reel
- [ ] Works for both User B → User C and User C → User B

---

## Implementation Order

1. ✅ Backend: Update types to store introduction relationships
2. ✅ Backend: Update auth route to save intro info
3. ✅ Backend: Add target status endpoint
4. ✅ Backend: Add direct match endpoint
5. ✅ Frontend: Update notification with "Call Now"
6. ✅ Frontend: Create post-onboarding introduction screen
7. ✅ Frontend: Create direct match input widget
8. ✅ Frontend: Add introduction badges to cards
9. ✅ Frontend: Prioritize introductions in reel
10. ✅ Testing: All flows end-to-end

---

## Key Principles

1. **Only online users can call each other** - No exceptions
2. **Clear messaging when offline** - "User B is not online right now"
3. **Introduction context always visible** - Badge shows who introduced them
4. **Direct match is optional** - Users can still browse normally
5. **Referral code is the key** - Code links User C → User B

This creates a seamless introduction system with direct matching!

