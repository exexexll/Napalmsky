# Comprehensive Code Review Plan

## Total Source Files to Review:
- app/ directory: ~30 page files
- components/ directory: ~50 component files  
- lib/ directory: ~15 utility files
- server/src/ directory: ~30 backend files

Total: ~125 source files, ~50,000+ lines of code

## Review Strategy:

### Phase 1: Critical Matchmaking System (Changed Recently)
1. lib/backgroundQueue.ts
2. components/matchmake/MatchmakeOverlay.tsx
3. components/matchmake/UserCard.tsx
4. components/matchmake/CalleeNotification.tsx
5. components/GlobalCallHandler.tsx
6. app/main/page.tsx
7. app/onboarding/page.tsx
8. app/refilm/page.tsx

### Phase 2: Server Endpoints (Profile/Matchmaking)
9. server/src/room.ts
10. server/src/user.ts
11. server/src/media.ts
12. server/src/auth.ts
13. server/src/store.ts

### Phase 3: Supporting Systems
14-125. All other files

## What to Check:
- Video requirements removed everywhere
- Photo-only checks consistent
- No broken imports
- No undefined variables
- Admin QR flow works
- Background queue compatibility
- Database queries correct

Starting review...
