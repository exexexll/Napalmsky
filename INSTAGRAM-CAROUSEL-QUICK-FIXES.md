# Instagram Carousel - Quick Fixes (1 Day Sprint)

**Target**: Fix 5 critical issues in 6 hours  
**Impact**: Major UX improvement with minimal effort

---

## 🎯 FIX #1: ADD LOADING SKELETON (2 hours)

### Problem
Users see blank screen for 5+ seconds while Instagram embed loads.

### Solution
Add loading skeleton that displays immediately while waiting for Instagram.

### Implementation

**File**: `components/InstagramEmbed.tsx`

```typescript
// Add state
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

// Update useEffect
useEffect(() => {
  setLoading(true);
  setError(null);
  
  const timeout = setTimeout(() => {
    if (!processedRef.current) {
      setError('Instagram post is taking longer than expected');
    }
  }, 8000); // 8 second timeout
  
  // ... existing logic
  
  return () => clearTimeout(timeout);
}, [postUrl]);

// Update handleScriptLoad
const handleScriptLoad = () => {
  scriptLoadedRef.current = true;
  
  if ((window as any).instgrm?.Embeds && containerRef.current) {
    (window as any).instgrm.Embeds.process();
    processedRef.current = true;
    onLoad?.();
    setLoading(false); // ✅ Stop loading
  }
};

// Render loading state
return (
  <>
    <Script ... />
    
    <div className="w-full h-full ...">
      {/* LOADING SKELETON */}
      {loading && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <div className="w-full max-w-md animate-pulse space-y-4 p-8">
            {/* Image skeleton */}
            <div className="aspect-square bg-gray-700 rounded-xl" />
            
            {/* Caption skeleton */}
            <div className="space-y-2">
              <div className="h-4 bg-gray-700 rounded w-3/4" />
              <div className="h-4 bg-gray-700 rounded w-1/2" />
            </div>
            
            {/* Engagement skeleton */}
            <div className="flex gap-4">
              <div className="h-4 bg-gray-700 rounded w-20" />
              <div className="h-4 bg-gray-700 rounded w-20" />
            </div>
          </div>
        </div>
      )}
      
      {/* ERROR STATE */}
      {error && !loading && (
        <div className="absolute inset-0 bg-black flex items-center justify-center p-8">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-red-400 font-bold">Failed to load post</h3>
            </div>
            
            <p className="text-white/70 mb-4 text-sm">
              This Instagram post may be deleted, private, or Instagram's servers are slow.
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  if ((window as any).instgrm?.Embeds) {
                    (window as any).instgrm.Embeds.process();
                  }
                }}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium transition-all"
              >
                Retry
              </button>
              
              <a
                href={postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 rounded-lg text-white font-medium text-center transition-all"
              >
                View on Instagram
              </a>
            </div>
          </div>
        </div>
      )}
      
      {/* ACTUAL EMBED (hide while loading) */}
      <div className={loading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}>
        <div className="absolute top-0 h-4 bg-black z-10" />
        <div className="absolute bottom-0 h-8 bg-black z-10" />
        
        <style jsx>{`...`}</style>
        
        <blockquote ... />
      </div>
    </div>
  </>
);
```

### Testing
1. Navigate to `/socials`, add a valid Instagram post
2. Go to `/main`, open matchmaking
3. See skeleton loader immediately (not blank screen)
4. Post should fade in smoothly after loading
5. Test with slow network (throttle to 3G in DevTools)

---

## 🎯 FIX #2: FIX KEYBOARD NAVIGATION (30 minutes)

### Problem
Left arrow key doesn't work (comment instead of function call on line 118).

### Solution
Call the correct function.

### Implementation

**File**: `components/matchmake/UserCard.tsx`

**Lines 112-127** - Find this code:

```typescript
// ENHANCEMENT: Keyboard navigation
useEffect(() => {
  if (totalMedia <= 1 || !isActive) return;
  
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      // Navigate Instagram photos();  // ❌ BUG: This is a comment!
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleSwipeLeft();
    }
  };
  
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [totalMedia, isActive, currentMediaIndex, handleSwipeLeft, handleSwipeRight]);
```

**Replace with**:

```typescript
// ENHANCEMENT: Keyboard navigation
useEffect(() => {
  if (totalMedia <= 1 || !isActive) return;
  
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handleSwipeRight(); // ✅ Go to previous post
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleSwipeLeft(); // ✅ Go to next post
    }
  };
  
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [totalMedia, isActive, currentMediaIndex, handleSwipeLeft, handleSwipeRight]);
```

### Testing
1. Navigate to `/main`, open matchmaking
2. View user with multiple Instagram posts
3. Press ← key → should go to previous post
4. Press → key → should go to next post
5. Verify wraps around (last → first, first → last)

---

## 🎯 FIX #3: ADD CAROUSEL INDICATORS (1 hour)

### Problem
Users don't know which post they're viewing or how many posts exist.

### Solution
Add dots at bottom showing position and allowing quick jump.

### Implementation

**File**: `components/matchmake/UserCard.tsx`

**After line 629** (after Instagram posts div), add:

```typescript
{/* Carousel Indicators - Only show if multiple posts */}
{mediaItems.length > 1 && (
  <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="pointer-events-auto"
    >
      <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
        {mediaItems.map((_, idx) => (
          <button
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              setCurrentMediaIndex(idx);
            }}
            className={`
              transition-all duration-300 rounded-full
              ${idx === currentMediaIndex 
                ? 'w-8 h-2.5 bg-gradient-to-r from-purple-400 to-pink-400' 
                : 'w-2.5 h-2.5 bg-white/40 hover:bg-white/60 hover:scale-110'
              }
            `}
            title={`Post ${idx + 1}`}
            aria-label={`Go to post ${idx + 1}`}
          />
        ))}
        
        {/* Optional: Show numeric position */}
        <div className="ml-2 pl-2 border-l border-white/20">
          <span className="text-white/70 text-xs font-mono">
            {currentMediaIndex + 1}/{mediaItems.length}
          </span>
        </div>
      </div>
    </motion.div>
  </div>
)}
```

### Alternative: Simpler Version (No Animation)

```typescript
{/* Carousel Dots - Simple version */}
{mediaItems.length > 1 && (
  <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30">
    <div className="flex gap-2 bg-black/70 px-3 py-1.5 rounded-full">
      {mediaItems.map((_, idx) => (
        <button
          key={idx}
          onClick={() => setCurrentMediaIndex(idx)}
          className={`
            rounded-full transition-all
            ${idx === currentMediaIndex 
              ? 'w-6 h-2 bg-white' 
              : 'w-2 h-2 bg-white/40 hover:bg-white/60'
            }
          `}
        />
      ))}
    </div>
  </div>
)}
```

### Testing
1. Navigate to `/main`, open matchmaking
2. View user with 3+ Instagram posts
3. See dots at bottom
4. Current dot should be elongated/highlighted
5. Click any dot → should jump to that post
6. Swipe/arrow → dots should update

---

## 🎯 FIX #4: REMOVE DEAD CODE (1 hour)

### Problem
100+ lines of unused video logic makes code confusing.

### Solution
Delete all video-related code that's no longer used.

### Implementation

**File**: `components/matchmake/UserCard.tsx`

**Lines to DELETE**:

1. **Line 81**: `const videoRef = useRef<HTMLVideoElement>(null);`
2. **Lines 49-50**: 
   ```typescript
   const [isVideoPaused, setIsVideoPaused] = useState(false);
   const [videoOrientation, setVideoOrientation] = useState<'portrait' | 'landscape' | 'unknown'>('unknown');
   ```
3. **Lines 129-151**: Entire video orientation detection useEffect
4. **Lines 153-171**: Video cleanup useEffect
5. **Lines 227-267**: Video autoplay logic useEffect
6. **Lines 269-323**: handleVideoTap function

**Keep only**:
- currentMediaIndex state
- mediaItems array (Instagram posts only)
- handleSwipeLeft/Right functions
- Keyboard navigation (after fixing)
- Swipe handlers

### After Cleanup - Code should look like:

```typescript
export function UserCard({ ... }) {
  // States
  const [seconds, setSeconds] = useState(300);
  const [showTimerModal, setShowTimerModal] = useState(false);
  // ... other UI states
  
  // INSTAGRAM CAROUSEL: Current index
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  
  // Build media items (Instagram posts only)
  const mediaItems = [
    ...(user.instagramPosts || []).map(postUrl => ({ 
      type: 'instagram' as const, 
      url: postUrl 
    }))
  ];
  const totalMedia = mediaItems.length;
  
  // Preloading
  useEffect(() => {
    // ... existing preload logic
  }, [mediaItems, currentMediaIndex]);
  
  // Navigation
  const handleSwipeLeft = () => { /* ... */ };
  const handleSwipeRight = () => { /* ... */ };
  const swipeHandlers = useSwipeable({ /* ... */ });
  
  // Keyboard navigation
  useEffect(() => {
    // ... fixed keyboard logic
  }, [totalMedia, isActive, currentMediaIndex]);
  
  // ... rest of component (timers, modals, etc.)
  
  return (
    <div ...>
      {/* User info overlay */}
      
      {/* Background photo */}
      <div className="absolute inset-0">
        <Image src={user.selfieUrl} ... />
      </div>
      
      {/* Instagram posts */}
      {mediaItems.length > 0 && (
        <div className="absolute inset-0" {...swipeHandlers}>
          <InstagramEmbed postUrl={mediaItems[currentMediaIndex].url} />
        </div>
      )}
      
      {/* Carousel indicators */}
      {/* ... from Fix #3 */}
      
      {/* Controls */}
      {/* ... existing controls */}
    </div>
  );
}
```

### Testing
1. Verify app compiles without errors
2. Navigate to `/main`, open matchmaking
3. Instagram posts should still work
4. No video-related bugs
5. File should be ~100 lines shorter

---

## 🎯 FIX #5: IMPROVE "MORE POSTS" BUTTON (1.5 hours)

### Problem
Button is small, vague ("More Posts" → how many more?), easy to miss.

### Solution
Make button more prominent, show exact position (e.g., "1 of 5 Posts →").

### Implementation

**File**: `components/matchmake/UserCard.tsx`

**Lines 647-662** - Find this code:

```typescript
{/* More Posts Button - Above Introduce Friend */}
{totalMedia > 1 && (
  <div className="flex justify-end mb-3">
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleSwipeLeft();
      }}
      className="rounded-xl bg-white/95 hover:bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
    >
      <span>More Posts</span>
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>
)}
```

**Replace with**:

```typescript
{/* Instagram Carousel Navigation */}
{totalMedia > 1 && (
  <div className="flex justify-between items-center mb-3 gap-3">
    {/* Previous Button (only if not on first post) */}
    {currentMediaIndex > 0 && (
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={(e) => {
          e.stopPropagation();
          handleSwipeRight();
        }}
        className="rounded-xl bg-black/70 backdrop-blur-md hover:bg-black/80 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2 border border-white/20"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        <span>Previous</span>
      </motion.button>
    )}
    
    {/* Center: Position Indicator */}
    <div className="flex-1 flex justify-center">
      <div className="bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
        <span className="text-white font-mono text-sm">
          📷 {currentMediaIndex + 1} of {totalMedia}
        </span>
      </div>
    </div>
    
    {/* Next Button (only if not on last post) */}
    {currentMediaIndex < totalMedia - 1 && (
      <motion.button
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={(e) => {
          e.stopPropagation();
          handleSwipeLeft();
        }}
        className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 px-4 py-2 text-sm font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
      >
        <span>Next Post</span>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </motion.button>
    )}
  </div>
)}
```

### Alternative: Simpler Single Button

```typescript
{/* Instagram Posts Navigation - Simple version */}
{totalMedia > 1 && (
  <div className="flex justify-center mb-3">
    <div className="flex items-center gap-3 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
      {/* Previous */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleSwipeRight();
        }}
        disabled={currentMediaIndex === 0}
        className="p-1.5 hover:bg-white/10 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      {/* Position */}
      <span className="text-white font-mono text-sm font-bold">
        {currentMediaIndex + 1} / {totalMedia}
      </span>
      
      {/* Next */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleSwipeLeft();
        }}
        disabled={currentMediaIndex === totalMedia - 1}
        className="p-1.5 hover:bg-white/10 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </div>
)}
```

### Testing
1. Navigate to `/main`, open matchmaking
2. View user with 3+ posts
3. See navigation bar with position indicator
4. Verify "Previous" only shows when not on first post
5. Verify "Next" only shows when not on last post
6. Click buttons → should navigate correctly

---

## ✅ FINAL TESTING CHECKLIST

After all 5 fixes, test complete flow:

### Adding Posts
- [ ] Go to `/socials`
- [ ] Add 3 Instagram posts
- [ ] See list with reorder buttons
- [ ] Click "Save 3 Posts"
- [ ] See success message

### Viewing Carousel
- [ ] Go to `/main`
- [ ] Open matchmaking
- [ ] View user with Instagram posts
- [ ] See loading skeleton immediately (not blank)
- [ ] Posts load smoothly after skeleton
- [ ] See carousel dots at bottom
- [ ] See position indicator (1/3)
- [ ] Click next → goes to post 2
- [ ] Click previous → goes back to post 1
- [ ] Press → key → goes to next post
- [ ] Press ← key → goes to previous post
- [ ] Swipe left → goes to next post
- [ ] Swipe right → goes to previous post
- [ ] Dots update with position
- [ ] Click dot → jumps to that post

### Error Handling
- [ ] Add invalid Instagram URL
- [ ] See error state (not blank screen)
- [ ] Click "Retry" → tries again
- [ ] Click "View on Instagram" → opens in new tab

### Mobile
- [ ] Test on mobile Chrome
- [ ] Loading skeleton responsive
- [ ] Carousel dots visible and tappable
- [ ] Swipe gestures smooth
- [ ] Navigation buttons sized well

---

## 📊 EXPECTED RESULTS

### Before Fixes
- ❌ Blank screen for 5+ seconds
- ❌ Keyboard navigation broken
- ❌ No idea which post you're viewing
- ❌ 100+ lines of dead code
- ❌ Vague "More Posts" button

### After Fixes
- ✅ Loading skeleton shows immediately
- ✅ Smooth fade-in when post loads
- ✅ Clear error states with retry
- ✅ Keyboard navigation works perfectly
- ✅ Dots show exact position
- ✅ Click dots to jump to any post
- ✅ Clean codebase (100 lines removed)
- ✅ Clear position indicator (1 of 5)
- ✅ Previous/Next buttons
- ✅ Professional, polished feel

### Performance
- ⚡ **Perceived load time**: 0s (skeleton shows immediately)
- ⚡ **Code size**: -100 lines (10% reduction)
- ⚡ **User understanding**: 100% (always know position)

### UX Score
- Before: **4/10** (functional but rough)
- After: **8/10** (polished, professional)

---

## 🚀 DEPLOYMENT

### 1. Test Locally
```bash
npm run dev
# Test all scenarios above
```

### 2. Commit Changes
```bash
git add components/InstagramEmbed.tsx
git add components/matchmake/UserCard.tsx
git commit -m "fix: Instagram carousel UX improvements

- Add loading skeleton and error states
- Fix keyboard navigation (left arrow)
- Add carousel position indicators (dots)
- Remove dead video code (~100 lines)
- Improve navigation buttons with position

Fixes 5 critical UX issues in 1 day sprint"
```

### 3. Deploy
```bash
git push origin master
# Railway auto-deploys
```

### 4. Monitor
- Check error logs for Instagram embed failures
- Monitor user engagement with carousel
- Gather feedback on new indicators

---

## 💡 TIPS

### Development
- Test with slow network (DevTools → Network → Slow 3G)
- Test with multiple posts (1, 3, 5, 10)
- Test keyboard shortcuts on desktop
- Test swipe gestures on real mobile device

### Edge Cases
- User with 0 Instagram posts (should show photo only)
- User with 1 Instagram post (no indicators needed)
- Instagram post is deleted (error state should show)
- Instagram post is private (error state should show)
- Instagram servers slow (skeleton should show for 8s, then error)

### Common Mistakes
- Don't forget to import `motion` from framer-motion for animations
- Make sure to stop propagation on button clicks (e.stopPropagation())
- Verify arrow key handlers are swapped correctly (left=previous, right=next)
- Test that dots update when using keyboard/swipe (not just clicking dots)

---

**Document Version**: 1.0  
**Last Updated**: November 19, 2025  
**Estimated Time**: 6 hours  
**Priority**: 🔥 Critical  
**Status**: Ready to implement

