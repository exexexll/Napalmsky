# Open Signup Toggle Feature - Complete Implementation Plan

## PHASE 1: CURRENT SYSTEM DIAGNOSIS

### Current Verification Flow:
1. User goes to /check-access or landing page
2. System checks for invite code or valid session
3. WITHOUT invite code → Redirected to /waitlist
4. WITH invite code → Allowed to /onboarding
5. After onboarding → paidStatus = 'qr_grace_period'
6. After 4 sessions → paidStatus = 'qr_verified'

### Current Guards:
- auth.ts line 42-50: Requires invite code
- onboarding/page.tsx line 90-155: Waitlist protection
- check-access/page.tsx: Routes to waitlist if no code
- main/page.tsx: Checks paidStatus
- server guards on /room, /matchmaking endpoints

### Current paid_status values:
- 'unpaid' - No access
- 'paid' - Stripe payment (deprecated)
- 'qr_verified' - 4+ sessions completed
- 'qr_grace_period' - Using invite code, <4 sessions

## PHASE 2: NEW "OPEN SIGNUP" FEATURE DESIGN

### Admin Toggle:
- Location: Admin panel, new toggle switch
- Database: New field `open_signup_enabled` (boolean)
- Server endpoint: GET/POST /admin/open-signup-settings

### New Signup Flow (When Toggle ON):
```
Landing → /onboarding (no waitlist redirect)
  ↓
Name/Age/Terms → Photo → Optional Email → Done
  ↓
paidStatus = 'open_signup' (new status)
  ↓
Access to matchmaking ✅
```

### New Signup Flow (When Toggle OFF):
```
Current flow (invite-only) remains unchanged
```

## PHASE 3: FILES TO MODIFY

### Backend (Server):
1. server/src/types.ts
   - Add 'open_signup' to PaidStatus type
   
2. server/src/auth.ts  
   - Check open signup flag before requiring invite code
   - New /auth/guest-open route

3. server/src/index.ts
   - Add global openSignupEnabled flag
   - Load from database on startup

4. server/src/event-admin.ts (or new file)
   - Add open signup toggle endpoints

5. server/schema.sql
   - Add open_signup_settings table

6. server/src/store.ts
   - Methods to get/set open signup status

### Frontend (App):
7. app/admin/page.tsx
   - Add "Open Signup" toggle section
   - Load and save toggle state

8. app/check-access/page.tsx
   - Check open signup status
   - Skip waitlist if enabled

9. app/onboarding/page.tsx
   - Skip invite code requirement if open signup
   - Add age field to name step
   - Make email truly optional

10. app/landing or app/page.tsx
    - Update CTA based on open signup status

### Middleware/Guards:
11. server/src/paywall-guard.ts
    - Accept 'open_signup' status

12. All protected routes
    - Update paidStatus checks to include 'open_signup'

## PHASE 4: IMPLEMENTATION CHECKLIST

### Database:
- [ ] Create open_signup_settings table
- [ ] Add migration script
- [ ] Default: disabled (invite-only)

### Backend:
- [ ] Add 'open_signup' to PaidStatus type
- [ ] Create /auth/guest-open endpoint (no invite code required)
- [ ] Create /admin/open-signup GET/POST endpoints
- [ ] Load open signup flag on server startup
- [ ] Update all paidStatus checks to include 'open_signup'

### Frontend:
- [ ] Admin toggle UI
- [ ] Remove waitlist redirect when open signup enabled
- [ ] Add age field to onboarding
- [ ] Make email optional in onboarding
- [ ] Update check-access logic

### Testing:
- [ ] Toggle ON → Can signup without code
- [ ] Toggle OFF → Requires code (existing flow)
- [ ] Both flows work independently
- [ ] No breaking changes to existing users

## PHASE 5: EDGE CASES

### Security:
- What if someone toggles while users are signing up?
- Cache open signup status on client (TTL 5 min)?
- Rate limit open signups (prevent spam)?

### User Experience:
- Existing invite code users still get codes?
- Open signup users get codes after X sessions?
- What about USC admin QR codes (keep working)?

### Data:
- How to distinguish open signup users in analytics?
- Migration for existing users?

## ESTIMATED CHANGES:
- Database: 1 new table
- Backend: ~15 files modified, ~200 lines
- Frontend: ~6 files modified, ~150 lines
- Total: ~20 commits

## RISKS:
- Breaking existing invite-only flow
- Security holes if not gated properly
- Database migration required

Ready to implement?
