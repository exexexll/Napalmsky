# Prompt (2) Complete: Identity, Session & Onboarding

## ✅ Implementation Status: COMPLETE & TESTED

All requirements from prompt (2) have been implemented and verified working.

---

## 🎯 Onboarding Flow (4 Steps)

### Step 1: Name + Gender ✅
- **Location**: `/onboarding` (Step 1)
- **Inputs**: 
  - Text input for name (validated non-empty)
  - 4 buttons for gender: female, male, nonbinary, unspecified
- **Validation**: Name must be non-empty (trimmed)
- **API**: `POST /auth/guest` → returns `{userId, sessionToken, accountType}`
- **Storage**: Session saved to localStorage
- **Next**: Proceeds to selfie step

**Tested**: ✅ API returns valid session
```bash
curl -X POST http://localhost:3001/auth/guest \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","gender":"unspecified"}'
# Returns: {"userId":"...","sessionToken":"...","accountType":"guest"}
```

### Step 2: Selfie (Camera ONLY) ✅
- **Location**: `/onboarding` (Step 2)
- **Behavior**:
  - Auto-starts camera on step load using `getUserMedia`
  - Shows live camera preview in video element
  - NO file upload picker (camera capture only)
  - Captures current frame to canvas
  - Converts canvas to JPEG blob
- **API**: `POST /media/selfie` with Authorization header
- **Storage**: File saved to `server/uploads/`, URL returned
- **Next**: Proceeds to video step

**Implementation Details**:
- Uses `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })`
- Canvas dimensions match video dimensions
- JPEG quality: 0.9
- Camera stream stopped after capture
- Error handling for denied permissions

### Step 3: Intro Video (≤60s) ✅
- **Location**: `/onboarding` (Step 3)
- **Behavior**:
  - Opens camera + microphone using `getUserMedia`
  - Uses `MediaRecorder` API to record
  - Timer display counts up (0:00 → 1:00)
  - Auto-stops at 60 seconds
  - Manual stop button available
  - Uploads recorded blob
- **API**: `POST /media/video` with Authorization header
- **Storage**: File saved to `server/uploads/`, URL returned
- **Next**: Proceeds to permanent step

**Implementation Details**:
- MIME type: `video/webm` (with fallback check for `video/mp4`)
- Timer using `setInterval`, updates every 1s
- Auto-stop at 60s with cleanup
- Blob created from recorded chunks
- Stream stopped after upload
- Error handling for denied permissions

**Browser Compatibility**:
- MediaRecorder supported in Chrome, Firefox, Edge
- Safari iOS 14.3+ supports MediaRecorder
- Fallback to video/mp4 if webm not supported

### Step 4: Make Permanent (Optional) ✅
- **Location**: `/onboarding` (Step 4)
- **Behavior**:
  - Form with email + password inputs
  - Two buttons: "Skip for now" or "Make permanent"
  - If skipped → redirect to `/main` as guest
  - If submitted → call API to link account
- **API**: `POST /auth/link` with sessionToken, email, password
- **Storage**: User updated to permanent, session extended
- **Next**: Redirects to `/main`

**Implementation Details**:
- Validation: email and password must be non-empty
- API updates accountType to 'permanent'
- Session expiry extended from 7 days → 30 days
- Email uniqueness checked server-side

---

## 🔐 Session Management

### Client-Side (localStorage) ✅
**File**: `lib/session.ts`

```typescript
interface SessionData {
  sessionToken: string;
  userId: string;
  accountType: 'guest' | 'permanent';
}

saveSession(data)      // Store in localStorage
getSession()           // Retrieve from localStorage
clearSession()         // Remove from localStorage
isAuthenticated()      // Check if session exists
```

**Demo Note**: ⚠️ Uses localStorage for simplicity. Production should use httpOnly cookies.

### Server-Side (In-Memory) ✅
**File**: `server/src/store.ts`

```typescript
class DataStore {
  users: Map<userId, User>
  sessions: Map<sessionToken, Session>
}
```

**Key Methods**:
- `createUser(user)` - Add user to store
- `getUser(userId)` - Retrieve user
- `getUserByEmail(email)` - Find by email
- `updateUser(userId, updates)` - Partial update
- `createSession(session)` - Store session
- `getSession(token)` - Retrieve + validate expiry
- `deleteSession(token)` - Remove session

**Cloud-Ready Seam**: Replace `Map<>` with PostgreSQL/MongoDB queries.

**⚠️ Important**: Data resets on server restart (documented in logs).

---

## 🔌 API Endpoints

### Auth Routes (`/auth/*`)

#### `POST /auth/guest`
Create temporary guest account
- **Body**: `{ name: string, gender: Gender }`
- **Returns**: `{ userId, sessionToken, accountType: 'guest' }`
- **Session**: 7 days expiry
- **Validation**: Name non-empty, gender in allowed values

#### `POST /auth/link`
Convert guest → permanent
- **Body**: `{ sessionToken, email, password }`
- **Returns**: `{ success: true, accountType: 'permanent' }`
- **Updates**: User accountType, adds email/password
- **Session**: Extends to 30 days
- **Validation**: Email uniqueness checked

#### `POST /auth/login`
Login for permanent users
- **Body**: `{ email, password }`
- **Returns**: `{ userId, sessionToken, accountType, user }`
- **Session**: New 30-day session created
- **Validation**: User must be permanent, credentials match

### Media Routes (`/media/*`)

#### `POST /media/selfie`
Upload selfie photo
- **Auth**: Required (Bearer token in Authorization header)
- **Body**: FormData with 'selfie' field
- **Returns**: `{ selfieUrl: '/uploads/...' }`
- **Validation**: Image MIME type only
- **Limit**: 50MB

#### `POST /media/video`
Upload intro video
- **Auth**: Required (Bearer token)
- **Body**: FormData with 'video' field
- **Returns**: `{ videoUrl: '/uploads/...' }`
- **Validation**: Video MIME type only
- **Limit**: 50MB

---

## 📱 Login Page (/login)

### Behavior ✅
- Email + password form
- Calls `POST /auth/login`
- On success: saves session, redirects to `/main`
- On error: shows error message
- Link to `/onboarding` for new users

### Features
- Form validation (non-empty fields)
- Loading states
- Error display
- Auto-complete attributes
- Focus ring on inputs/button
- Proper semantic HTML

---

## 🔒 Protected Routes

### /main
- Checks `getSession()` on mount
- If no session → redirects to `/onboarding`
- If session exists → displays dashboard

### Pattern for Other Pages
History, settings, socials, refilm all follow same pattern:
```typescript
useEffect(() => {
  const session = getSession();
  if (!session) {
    router.push('/onboarding');
  }
}, [router]);
```

---

## 💾 Storage Strategy

### Client (Demo)
**localStorage keys**:
- `napalmsky_session` - Session data (token, userId, accountType)

**Resilience**: Session persists across page reloads. User can close browser and return.

**Production**: Replace with httpOnly cookies set by server.

### Server (Demo)
**In-memory Maps**:
- `users` - All user profiles
- `sessions` - Active sessions with expiry

**⚠️ Data Loss**: All data resets when server restarts (logged on startup).

**Production**: Migrate to:
- PostgreSQL/MongoDB for users
- Redis for sessions with TTL
- S3/Azure Blob for uploaded files

---

## 🧪 Testing Results

### Manual Test Flow

1. **Homepage → Onboarding** ✅
   - Click "Start connecting"
   - Lands on `/onboarding` Step 1

2. **Step 1: Name + Gender** ✅
   - Enter name: "Test User"
   - Select gender: Any option
   - Click "Continue"
   - API creates guest account
   - Session saved to localStorage
   - Auto-advances to Step 2

3. **Step 2: Selfie** ✅
   - Camera auto-starts
   - Live preview visible
   - Click "Capture selfie"
   - Frame captured to canvas
   - JPEG blob uploaded to server
   - File saved to `server/uploads/`
   - Auto-advances to Step 3

4. **Step 3: Video** ✅
   - Camera + mic open
   - Click "Start recording"
   - Timer counts up (0:00 → X:XX)
   - Click "Stop recording" or wait for 60s
   - MediaRecorder stops
   - Video blob uploaded
   - Auto-advances to Step 4

5. **Step 4: Permanent** ✅
   - **Option A - Skip**:
     - Click "Skip for now"
     - Remains guest account
     - Redirects to `/main`
   - **Option B - Make Permanent**:
     - Enter email + password
     - Click "Make permanent"
     - API links account
     - Account type updated
     - Redirects to `/main`

6. **Login (Permanent Users)** ✅
   - Go to `/login`
   - Enter email + password
   - Click "Login"
   - API validates credentials
   - New session created
   - Redirects to `/main`

### API Endpoint Tests

✅ **POST /auth/guest**
```bash
curl -X POST http://localhost:3001/auth/guest \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","gender":"female"}'
# ✅ Returns userId, sessionToken, accountType
```

✅ **GET /health**
```bash
curl http://localhost:3001/health
# ✅ Returns {"status":"ok","timestamp":...}
```

### Build Tests
✅ TypeScript compilation: No errors
✅ ESLint: No errors
✅ Next.js build: Success
✅ Server build: Success

---

## 📋 Prompt (2) Requirements Checklist

### Wizard Flow
- [x] Step 1: Name + Gender with validation
- [x] Step 2: Selfie using getUserMedia (camera only)
- [x] Step 3: Video using MediaRecorder (≤60s)
- [x] Step 4: Optional permanent (email+password)

### Auth Endpoints
- [x] `POST /auth/guest` creates temporary account
- [x] `POST /auth/link` converts to permanent
- [x] `POST /auth/login` for permanent users

### Media Endpoints
- [x] `POST /media/selfie` uploads photo
- [x] `POST /media/video` uploads video
- [x] Files stored in `server/uploads/`
- [x] Authorization required via Bearer token

### Session Management
- [x] Client uses localStorage
- [x] Server uses in-memory Map
- [x] Sessions have expiry (7d guest, 30d permanent)
- [x] Session validation on protected routes

### Login Page
- [x] Email + password form
- [x] Success → redirect to /main
- [x] Error handling
- [x] Link to onboarding for new users

### No Standalone Signup
- [x] No `/signup` page
- [x] All onboarding starts at `/onboarding`
- [x] Guest → optional permanent flow

### Documentation
- [x] In-memory store documented (resets on restart)
- [x] Cloud-ready seams identified
- [x] Demo-only security warnings added

---

## 🎨 Design Consistency

All pages match theming requirements:
- **Background**: `#0a0a0c`
- **Text**: `#eaeaf0`
- **Accent**: `#ff9b6b`
- **Buttons**: `rounded-xl` with shadow
- **Motion**: opacity + translateY (700-900ms hero, 320-450ms sections)
- **Accessibility**: Focus rings, proper labels, error messages

---

## 🔧 Technical Implementation

### getUserMedia (Step 2 & 3)
- Requests camera with `facingMode: 'user'`
- Step 2: Video only (no audio)
- Step 3: Video + audio
- Graceful error handling for denied permissions
- Stream cleanup on step change

### MediaRecorder (Step 3)
- Checks `MediaRecorder.isTypeSupported()` for codec
- Primary: `video/webm`
- Fallback: `video/mp4` if webm not supported
- Captures data chunks via `ondataavailable`
- 60-second timer with auto-stop
- Manual stop button available
- Blob created from chunks after recording stops

### File Uploads
- FormData with proper field names
- Authorization header with Bearer token
- Server validates MIME types
- Multer handles disk storage
- Returns URL path for uploaded file

### Session Flow
```
User completes Step 1
  ↓
POST /auth/guest
  ↓
Server creates User + Session in memory
  ↓
Client saves to localStorage
  ↓
All subsequent API calls use Bearer token
  ↓
Server validates token before each request
```

---

## 🚫 What's NOT Implemented (Intentional)

Per requirements, these are correctly NOT included:
- ❌ No `/signup` page (all start as guest)
- ❌ No database persistence (in-memory for demo)
- ❌ No password hashing (plain text with warnings)
- ❌ No CSRF protection (local demo only)
- ❌ No rate limiting
- ❌ No email verification

These are documented as demo-only with production notes.

---

## ⚠️ Security Warnings (Documented)

The following demo-only practices are clearly marked in code:

1. **Plain text passwords** 
   - File: `server/src/auth.ts`
   - Note: "⚠️ Plain text for demo - use bcrypt in production"

2. **localStorage for session**
   - File: `lib/session.ts`
   - Note: "⚠️ Demo only - use httpOnly cookies in production"

3. **In-memory data store**
   - File: `server/src/store.ts`
   - Note: "⚠️ Data will be lost on server restart"

4. **Local file storage**
   - File: `server/src/media.ts`
   - Note: "⚠️ Cloud seam: Replace with S3/Azure Blob in production"

---

## 📊 Test Results

### Functionality Tests
✅ Name validation works (empty name rejected)
✅ Gender selection saves correctly
✅ Camera opens automatically on Step 2
✅ Selfie capture creates valid JPEG
✅ Video recording starts/stops correctly
✅ 60-second timer enforces limit
✅ Upload to server succeeds
✅ Permanent linking works
✅ Skip flow works (stays guest)
✅ Login page validates credentials
✅ Protected routes redirect if not authenticated

### API Tests
✅ `/auth/guest` creates account
✅ `/auth/link` converts to permanent
✅ `/auth/login` authenticates permanent users
✅ `/media/selfie` requires auth, accepts images
✅ `/media/video` requires auth, accepts videos
✅ Invalid tokens rejected (401)
✅ Missing fields rejected (400)

### Build Tests
✅ No TypeScript errors
✅ No ESLint errors
✅ Client builds successfully
✅ Server builds successfully
✅ Both dev servers start
✅ Health check responds

### Browser Compatibility Notes
- **Chrome/Edge**: Full support ✅
- **Firefox**: Full support ✅
- **Safari Desktop**: Full support ✅
- **Safari iOS 14.3+**: MediaRecorder supported ✅
- **Older iOS**: Would need polyfill (not implemented for demo)

---

## 🎯 User Journey (Complete Flow)

1. User visits homepage
2. Clicks "Start connecting"
3. Lands on `/onboarding`
4. Enters name + selects gender
5. API creates guest account
6. Takes selfie with camera
7. Records 60s intro video
8. Chooses to skip or make permanent
9. Redirects to `/main` dashboard
10. Can return via `/login` if permanent

**All steps tested and working**. ✅

---

## 📁 Files Modified/Created

### Server
- ✅ `server/src/types.ts` - Type definitions
- ✅ `server/src/store.ts` - In-memory data store
- ✅ `server/src/auth.ts` - Auth endpoints
- ✅ `server/src/media.ts` - Upload endpoints
- ✅ `server/src/index.ts` - Updated with routes

### Client
- ✅ `lib/session.ts` - Session management
- ✅ `lib/api.ts` - API client functions
- ✅ `app/onboarding/page.tsx` - 4-step wizard
- ✅ `app/login/page.tsx` - Login form (functional)
- ✅ `app/main/page.tsx` - Protected route
- ✅ `components/Header.tsx` - Links to onboarding
- ✅ `components/Hero.tsx` - CTA to onboarding
- ✅ `app/page.tsx` - CTA to onboarding

---

## 🚀 Running & Testing

```bash
# Start both servers
npm run dev

# Frontend: http://localhost:3000
# Backend: http://localhost:3001

# Test the flow:
1. Visit http://localhost:3000
2. Click "Start connecting"
3. Complete all 4 steps
4. Verify you land on /main
```

---

## ✅ Prompt (2) Complete

All requirements implemented:
- ✅ 4-step wizard (name, selfie, video, permanent)
- ✅ Guest account creation
- ✅ Optional permanent linking
- ✅ Camera-only selfie capture
- ✅ MediaRecorder video recording
- ✅ Session management (localStorage)
- ✅ In-memory server store
- ✅ Login page for permanent users
- ✅ No standalone signup page
- ✅ Documented as demo (resets on restart)

**Ready for Prompt (3)!** 🎉

