# Quick Fix - 401 Unauthorized Error

## Issue
Getting "401 Unauthorized" when opening matchmaking overlay.

## Root Cause
The session in localStorage might be expired or the user needs to complete onboarding first.

## Solution

### Option 1: Complete Onboarding (Recommended)
```
1. Go to: http://localhost:3000
2. Click "Start connecting"
3. Complete all 4 steps:
   - Name + Gender
   - Take selfie
   - Record video
   - Skip or make permanent
4. You'll land on /main
5. Now click "Matchmake Now"
6. Should see 6 mock users!
```

### Option 2: Clear Session and Re-onboard
```
1. Open browser console (F12)
2. Run: localStorage.clear()
3. Refresh page
4. Complete onboarding again
```

### Option 3: Login (If you made a permanent account)
```
1. Go to: http://localhost:3000/login
2. Enter your email + password
3. Click Login
4. Go to /main
5. Click "Matchmake Now"
```

## Verification

After completing onboarding, you should see in console:
```
[Matchmake] Session found: { userId: "...", accountType: "guest" }
[Matchmake] Loading initial reel...
[API] Fetching reel: { cursor: undefined, limit: 20 }
[API] Reel loaded: 6 users
```

Then you'll see 6 user cards:
- Emma (female)
- James (male)  
- Sam (nonbinary)
- Sofia (female)
- Alex (male)
- Taylor (unspecified)

All with profile pictures, videos, and "Talk to..." buttons!

## Still Not Working?

Check browser console for the exact error message and share it.

