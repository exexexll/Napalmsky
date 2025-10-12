# Environment Variables Setup Guide

This guide explains how to configure environment variables for local development and production deployment.

## Frontend (.env.local)

Create a file `.env.local` in the root directory:

```bash
# API Base URL (backend server)
NEXT_PUBLIC_API_BASE=http://localhost:3001

# Socket.io URL  
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

# Production values (example):
# NEXT_PUBLIC_API_BASE=https://api.napalmsky.com
# NEXT_PUBLIC_SOCKET_URL=https://api.napalmsky.com
```

## Backend (server/.env)

Create a file `server/.env`:

```bash
# Server Configuration
NODE_ENV=development
PORT=3001

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Allowed Origins (comma-separated for multiple)
ALLOWED_ORIGINS=http://localhost:3000

# Production values (example):
# NODE_ENV=production
# PORT=3001
# FRONTEND_URL=https://napalmsky.com
# ALLOWED_ORIGINS=https://napalmsky.com,https://www.napalmsky.com

# Database (for cloud migration)
# DATABASE_URL=postgresql://user:pass@host:5432/napalmsky

# Redis (for Socket.io scaling)
# REDIS_URL=redis://localhost:6379

# File Storage (for cloud migration)
# AWS_S3_BUCKET=napalmsky-media
# AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=your_key
# AWS_SECRET_ACCESS_KEY=your_secret
# CDN_BASE_URL=https://cdn.napalmsky.com

# TURN Server (for WebRTC)
# TURN_SERVER=turn:turn.napalmsky.com:3478
# TURN_USERNAME=napalmsky
# TURN_CREDENTIAL=your_credential
```

## Usage in Code

### Frontend Files to Update

**lib/api.ts:**
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';
```

**lib/matchmaking.ts:**
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';
```

**lib/socket.ts:**
```typescript
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
```

### Backend Files to Update

**server/src/index.ts:**
```typescript
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
```

**server/src/media.ts:**
```typescript
const CDN_BASE = process.env.CDN_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
const selfieUrl = `${CDN_BASE}/uploads/${req.file.filename}`;
```

## Quick Setup (Local Development)

```bash
# Create frontend env file
echo "NEXT_PUBLIC_API_BASE=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001" > .env.local

# Create backend env file
echo "NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000" > server/.env

# Install dotenv for server
cd server && npm install dotenv && cd ..
```

## Loading Environment Variables

**Server (server/src/index.ts):**
```typescript
// Add at the very top of the file
import dotenv from 'dotenv';
dotenv.config();

// Now process.env.PORT, etc. will be available
```

**Frontend:**
Next.js automatically loads `.env.local` - no additional setup needed!

## Security Notes

- ⚠️ Never commit `.env` or `.env.local` files to git
- ✅ `.gitignore` already excludes these files
- ✅ `.env.example` files are safe to commit (no actual secrets)
- 🔒 In production, use proper secret management (AWS Secrets Manager, etc.)

## Verification

Test that environment variables are loaded:

```bash
# Frontend (in browser console):
console.log(process.env.NEXT_PUBLIC_API_BASE);

# Backend (in terminal):
node -e "require('dotenv').config(); console.log(process.env.PORT);"
```

