# Instagram Carousel - System Architecture & Flow

**Date**: November 19, 2025

---

## 🏗️ SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐        ┌──────────────────┐          │
│  │  /socials page   │        │  /main page      │          │
│  │                  │        │                  │          │
│  │  ┌────────────┐  │        │  ┌────────────┐ │          │
│  │  │  Social    │  │        │  │ Matchmake  │ │          │
│  │  │   Post     │◄─┼────────┼─►│  Overlay   │ │          │
│  │  │  Manager   │  │        │  │            │ │          │
│  │  └─────┬──────┘  │        │  └─────┬──────┘ │          │
│  │        │         │        │        │        │          │
│  │        │ saves   │        │        │ shows  │          │
│  │        ▼         │        │        ▼        │          │
│  │   [Posts Array] │        │  ┌────────────┐ │          │
│  │        │         │        │  │  UserCard  │ │          │
│  │        │         │        │  │            │ │          │
│  └────────┼─────────┘        │  │  ┌──────┐  │ │          │
│           │                  │  │  │ IG   │  │ │          │
│           │                  │  │  │Embed │  │ │          │
│           │                  │  │  └──────┘  │ │          │
│           │                  │  └────────────┘ │          │
│           │                  └─────────────────┘          │
│           │                                                │
└───────────┼────────────────────────────────────────────────┘
            │
            │ HTTP POST /instagram/posts
            │ HTTP GET  /instagram/posts
            ▼
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────┐         │
│  │  server/src/instagram.ts (Router)              │         │
│  │                                                 │         │
│  │  POST /posts   →  Validate URLs  →  Save      │         │
│  │  GET  /posts   →  Fetch from DB  →  Return    │         │
│  └──────────────────────┬──────────────────────────┘        │
│                         │                                    │
│                         ▼                                    │
│  ┌────────────────────────────────────────────────┐         │
│  │  server/src/store.ts (Data Layer)             │         │
│  │                                                 │         │
│  │  updateUser({ instagramPosts: [...] })        │         │
│  │  getUser(userId) → user.instagramPosts         │         │
│  └──────────────────────┬──────────────────────────┘        │
│                         │                                    │
│                         ▼                                    │
│  ┌────────────────────────────────────────────────┐         │
│  │  PostgreSQL Database                           │         │
│  │                                                 │         │
│  │  users table                                   │         │
│  │  ├─ user_id (uuid)                            │         │
│  │  ├─ name (text)                               │         │
│  │  ├─ instagram_posts (text[])  ← Array of URLs│         │
│  │  └─ ... other fields                          │         │
│  └─────────────────────────────────────────────────┘        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
            │
            │ Queried by room.ts
            ▼
┌─────────────────────────────────────────────────────────────┐
│  GET /room/queue  →  Returns matchmaking queue              │
│                                                              │
│  Response:                                                   │
│  {                                                           │
│    users: [                                                  │
│      {                                                       │
│        userId: "...",                                        │
│        name: "Alice",                                        │
│        videoUrl: "...",                                      │
│        instagramPosts: [                                     │
│          "https://instagram.com/p/ABC/",                     │
│          "https://instagram.com/p/DEF/"                      │
│        ]                                                     │
│      }                                                       │
│    ]                                                         │
│  }                                                           │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔄 USER FLOW: ADDING POSTS

```
┌──────────────────────────────────────────────────────────────┐
│ Step 1: User navigates to /socials page                     │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 2: SocialPostManager component renders                 │
│                                                              │
│  ┌────────────────────────────────────────────────┐         │
│  │ 📸 Instagram Posts (0/10)                      │         │
│  │                                                 │         │
│  │ [Paste Instagram post URL...]          [Add]  │         │
│  │                                                 │         │
│  │ 📷 No Instagram posts yet                      │         │
│  │                                                 │         │
│  │ How to get post URL:                           │         │
│  │ 1. Open Instagram post                         │         │
│  │ 2. Click ⋯ (three dots)                       │         │
│  │ 3. Select "Copy link"                          │         │
│  │ 4. Paste link above                            │         │
│  └────────────────────────────────────────────────┘         │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 3: User pastes URL                                     │
│  "https://www.instagram.com/p/DN-AsYIDeL0/"                 │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 4: Frontend validates URL format                       │
│  ✅ Matches pattern: /instagram.com/(p|reel)/[A-Za-z0-9]/   │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 5: URL added to local state                            │
│                                                              │
│  posts = [                                                   │
│    "https://www.instagram.com/p/DN-AsYIDeL0/"               │
│  ]                                                           │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 6: UI updates to show post in list                     │
│                                                              │
│  ┌────────────────────────────────────────────────┐         │
│  │ [1] https://www.instagram.com/p/DN-AsYIDeL0/   │         │
│  │     Position 2 (after intro video)             │         │
│  │     [↑] [↓] [×]                                │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
│  [Save 1 Post]                                              │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 7: User clicks "Save 1 Post"                           │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 8: Frontend sends POST to API                          │
│                                                              │
│  POST /instagram/posts                                      │
│  Headers: { Authorization: "Bearer <token>" }              │
│  Body: {                                                     │
│    posts: ["https://www.instagram.com/p/DN-AsYIDeL0/"]     │
│  }                                                           │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 9: Backend validates session                           │
│  ✅ Token valid                                              │
│  ✅ Session active                                           │
│  ✅ User authenticated                                       │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 10: Backend validates posts                            │
│  ✅ Is array                                                 │
│  ✅ Length ≤ 10                                              │
│  ✅ Each URL matches pattern                                 │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 11: Backend saves to database                          │
│                                                              │
│  UPDATE users                                                │
│  SET instagram_posts = $1                                    │
│  WHERE user_id = $2                                          │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 12: Backend responds success                           │
│                                                              │
│  Response: {                                                 │
│    success: true,                                            │
│    posts: ["https://www.instagram.com/p/DN-AsYIDeL0/"]     │
│  }                                                           │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 13: Frontend shows success message                     │
│  ✅ Instagram posts saved: 1                                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔄 USER FLOW: VIEWING POSTS IN CAROUSEL

```
┌──────────────────────────────────────────────────────────────┐
│ Step 1: User navigates to /main (matchmaking)               │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 2: Frontend requests matchmaking queue                 │
│                                                              │
│  GET /room/queue                                             │
│  Headers: { Authorization: "Bearer <token>" }              │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 3: Backend fetches online users + their posts          │
│                                                              │
│  SELECT * FROM users                                         │
│  WHERE user_id IN (online_user_ids)                          │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 4: Backend returns queue with Instagram posts          │
│                                                              │
│  Response: {                                                 │
│    users: [                                                  │
│      {                                                       │
│        name: "Alice",                                        │
│        instagramPosts: [                                     │
│          "https://instagram.com/p/ABC/",                     │
│          "https://instagram.com/p/DEF/"                      │
│        ]                                                     │
│      }                                                       │
│    ]                                                         │
│  }                                                           │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 5: UserCard component renders for first user           │
│                                                              │
│  ┌────────────────────────────────────────────┐             │
│  │ Alice, 22                        📍 2.3 mi │             │
│  │                                             │             │
│  │         [Photo with overlay]                │             │
│  │                                             │             │
│  │         [Instagram Post #1]                 │             │
│  │                                             │             │
│  │                                             │             │
│  │                                             │             │
│  │                                             │             │
│  │                                             │             │
│  │ [More Posts →]                              │             │
│  │                                             │             │
│  │ [300 seconds]    [Talk to her]              │             │
│  └────────────────────────────────────────────┘             │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 6: UserCard builds mediaItems array                    │
│                                                              │
│  const mediaItems = [                                        │
│    { type: 'instagram', url: 'https://...com/p/ABC/' },    │
│    { type: 'instagram', url: 'https://...com/p/DEF/' }     │
│  ];                                                          │
│  currentMediaIndex = 0  ← Start at first post               │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 7: InstagramEmbed component renders                    │
│                                                              │
│  postUrl = mediaItems[0].url                                 │
│  Loading Instagram post...                                   │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 8: Instagram embed.js script loads                     │
│                                                              │
│  <script src="https://www.instagram.com/embed.js" />       │
│  window.instgrm.Embeds.process()                            │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 9: Instagram processes blockquote → iframe             │
│                                                              │
│  <blockquote data-instgrm-permalink="...">                  │
│    ↓ transforms to                                           │
│  <iframe src="https://instagram.com/p/ABC/embed">           │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 10: Instagram post renders in iframe                   │
│                                                              │
│  ┌────────────────────────────────────────────┐             │
│  │ [Instagram Post Image]                     │             │
│  │                                             │             │
│  │ ❤️ 1,234 likes                              │             │
│  │                                             │             │
│  │ Alice: "Love this place! 🌅"               │             │
│  │                                             │             │
│  │ View on Instagram →                         │             │
│  └────────────────────────────────────────────┘             │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 11: User clicks "More Posts" or swipes left            │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 12: currentMediaIndex increments                       │
│  currentMediaIndex = 1                                       │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 13: InstagramEmbed re-renders with new URL             │
│  postUrl = mediaItems[1].url                                 │
│  Loading next post...                                        │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 14: Instagram post #2 loads and displays               │
│  [Repeat Steps 8-10 for second post]                        │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔌 COMPONENT INTERACTION DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                     app/socials/page.tsx                    │
│                    (Integration Layer)                       │
└───────────┬─────────────────────────────────────┬───────────┘
            │                                     │
            │ Renders                             │ Saves via
            ▼                                     ▼
┌──────────────────────────┐        ┌──────────────────────────┐
│  SocialPostManager.tsx   │        │  API: /instagram/posts   │
│  (Management UI)         │        │  (Backend endpoint)      │
│                          │        │                          │
│  - Add post URL          │───────►│  POST /posts             │
│  - Validate format       │  saves │  - Validate array        │
│  - Reorder (↑↓)         │        │  - Check length ≤ 10     │
│  - Remove (×)           │        │  - Validate each URL     │
│  - Preview list          │        │  - Update database       │
└──────────────────────────┘        └──────────────────────────┘
                                                 │
                                                 │ stores in
                                                 ▼
                                    ┌──────────────────────────┐
                                    │  users.instagram_posts   │
                                    │  (PostgreSQL text[])     │
                                    └──────────────────────────┘
                                                 │
                                                 │ queried by
                                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                     GET /room/queue                          │
│                  (Matchmaking endpoint)                      │
│                                                              │
│  Returns: users with instagramPosts field                   │
└───────────┬─────────────────────────────────────────────────┘
            │
            │ consumed by
            ▼
┌──────────────────────────────────────────────────────────────┐
│                  components/matchmake/UserCard.tsx           │
│                     (Display Layer)                          │
│                                                              │
│  ┌───────────────────────────────────────────────┐          │
│  │  Builds mediaItems array from instagramPosts  │          │
│  │  Manages currentMediaIndex state              │          │
│  │  Handles swipe/keyboard navigation            │          │
│  └─────────────────────┬─────────────────────────┘          │
│                        │                                     │
│                        │ Renders                             │
│                        ▼                                     │
│  ┌───────────────────────────────────────────────┐          │
│  │    components/InstagramEmbed.tsx              │          │
│  │    (Embed Renderer)                           │          │
│  │                                                │          │
│  │  - Loads Instagram embed.js                   │          │
│  │  - Processes blockquote → iframe              │          │
│  │  - Applies custom CSS styling                 │          │
│  │  - Handles loading/error states               │          │
│  └───────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────┘
                        │
                        │ loads from
                        ▼
┌──────────────────────────────────────────────────────────────┐
│              Instagram CDN (External)                        │
│              https://www.instagram.com/embed.js              │
│                                                              │
│  Transforms blockquote to iframe                            │
│  Loads post content from Instagram servers                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 🗂️ DATA FLOW

### 1. Post URL Format
```
Input:  "https://www.instagram.com/p/DN-AsYIDeL0/?utm_source=ig_web"
         ↓ normalized
Output: "https://www.instagram.com/p/DN-AsYIDeL0/"
```

### 2. Storage Format (Database)
```sql
-- users table schema
CREATE TABLE users (
  user_id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  instagram_posts TEXT[] DEFAULT '{}',  ← Array of URLs
  -- ... other fields
);

-- Example data
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Alice",
  "instagram_posts": [
    "https://www.instagram.com/p/ABC123/",
    "https://www.instagram.com/p/DEF456/"
  ]
}
```

### 3. API Response Format
```json
// GET /instagram/posts
{
  "posts": [
    "https://www.instagram.com/p/ABC123/",
    "https://www.instagram.com/p/DEF456/"
  ]
}

// GET /room/queue
{
  "users": [
    {
      "userId": "...",
      "name": "Alice",
      "videoUrl": "https://...",
      "instagramPosts": [
        "https://www.instagram.com/p/ABC123/",
        "https://www.instagram.com/p/DEF456/"
      ]
    }
  ]
}
```

### 4. Frontend State Format
```typescript
// SocialPostManager state
const [posts, setPosts] = useState<string[]>([
  "https://www.instagram.com/p/ABC123/",
  "https://www.instagram.com/p/DEF456/"
]);

// UserCard mediaItems
const mediaItems = [
  { type: 'instagram', url: 'https://instagram.com/p/ABC123/' },
  { type: 'instagram', url: 'https://instagram.com/p/DEF456/' }
];

// Current position
const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
```

---

## 📊 CURRENT SYSTEM METRICS

### Performance
- **Average load time**: 3-5 seconds (Instagram embed)
- **Script size**: ~50KB (Instagram embed.js)
- **Retry attempts**: Up to 5 (with 1s delays)
- **Preloading**: All posts preloaded immediately

### Scale
- **Max posts per user**: 10
- **Average posts per user**: ~2-3 (estimated)
- **Total Instagram embeds**: N users × avg 2.5 posts

### Code Size
- **Frontend**: ~1,500 lines (3 components)
- **Backend**: ~400 lines (3 files)
- **Total**: ~1,900 lines

---

## 🎯 CURRENT BOTTLENECKS

### 1. Instagram Embed Loading (5s)
```
User sees blank screen
       ↓
[0s] InstagramEmbed mounts
       ↓
[0.5s] Script element created
       ↓
[1.5s] embed.js downloads
       ↓
[2s] window.instgrm available
       ↓
[3s] Embeds.process() called
       ↓
[4s] iframe created
       ↓
[5s] Post content loads
       ↓
User finally sees post
```

### 2. No Caching
- Every post loads fresh from Instagram
- No service worker caching
- No CDN for embed.js
- Script loaded per component instance

### 3. Synchronous Processing
- Waits for script to load
- Blocks on Embeds.process()
- No parallel post loading
- No intersection observer (loads even off-screen)

---

## 🔄 PROPOSED ARCHITECTURE (Future)

```
┌──────────────────────────────────────────────────────────────┐
│                     IMPROVED FRONTEND                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────┐             │
│  │  SocialPostManager                          │             │
│  │  + Visual thumbnails                        │             │
│  │  + Drag-and-drop reordering                │             │
│  │  + Real-time validation                     │             │
│  │  + Instagram API import                     │             │
│  └────────────────────────────────────────────┘             │
│                                                              │
│  ┌────────────────────────────────────────────┐             │
│  │  UserCard                                   │             │
│  │  + Carousel indicators (dots)               │             │
│  │  + Loading skeletons                        │             │
│  │  + Error boundaries                         │             │
│  │  + Performance monitoring                   │             │
│  └────────────────────────────────────────────┘             │
│                                                              │
│  ┌────────────────────────────────────────────┐             │
│  │  InstagramDisplay (replaces Embed)         │             │
│  │  + Direct image rendering (no iframe)      │             │
│  │  + Lazy loading with IntersectionObserver  │             │
│  │  + Cached thumbnails                        │             │
│  └────────────────────────────────────────────┘             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                     IMPROVED BACKEND                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────┐             │
│  │  Enhanced API                               │             │
│  │  + Post validation (exists, public)         │             │
│  │  + Metadata fetching (thumbnail, caption)   │             │
│  │  + Analytics tracking (views, duration)     │             │
│  └────────────────────────────────────────────┘             │
│                                                              │
│  ┌────────────────────────────────────────────┐             │
│  │  Rich Database Schema                       │             │
│  │                                              │             │
│  │  instagram_posts (JSONB):                   │             │
│  │  [                                           │             │
│  │    {                                         │             │
│  │      url: "...",                            │             │
│  │      thumbnail: "...",                      │             │
│  │      caption: "...",                        │             │
│  │      likes: 1234,                           │             │
│  │      views: 567,                            │             │
│  │      avgDuration: 8.5,                      │             │
│  │      invitesGenerated: 12                   │             │
│  │    }                                         │             │
│  │  ]                                           │             │
│  └────────────────────────────────────────────┘             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

**Document Version**: 1.0  
**Last Updated**: November 19, 2025

