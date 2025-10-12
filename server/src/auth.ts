import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Server as SocketServer } from 'socket.io';
import bcrypt from 'bcrypt';
import { store } from './store';
import { User, Session } from './types';

/**
 * Create auth routes with Socket.io dependency injection
 * This ensures Socket.io is available immediately, fixing race conditions
 */
export function createAuthRoutes(
  io: SocketServer,
  activeSockets: Map<string, string>
) {
  const router = express.Router();

/**
 * POST /auth/guest
 * Create a temporary guest account
 * Optional: referralCode to track who referred this user
 * Optional: inviteCode for paywall bypass (QR code access)
 */
router.post('/guest', (req: any, res) => {
  const { name, gender, referralCode, inviteCode } = req.body;
  const ip = req.userIp; // Set by middleware with centralized IP extraction

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (!['female', 'male', 'nonbinary', 'unspecified'].includes(gender)) {
    return res.status(400).json({ error: 'Invalid gender' });
  }

  const userId = uuidv4();
  const sessionToken = uuidv4();

  // PAYWALL CHECK: Validate invite code if provided
  let codeVerified = false;
  let codeUsed: string | undefined;
  
  if (inviteCode) {
    const sanitizedCode = inviteCode.trim().toUpperCase();
    
    // Validate code format first (prevent injection)
    if (!/^[A-Z0-9]{16}$/.test(sanitizedCode)) {
      return res.status(400).json({ error: 'Invalid invite code format' });
    }

    // Use the code (this checks validity, uses remaining, etc.)
    const result = store.useInviteCode(sanitizedCode, userId, name.trim());
    
    if (!result.success) {
      console.warn(`[Auth] Invalid invite code used: ${sanitizedCode} - ${result.error}`);
      return res.status(403).json({ 
        error: result.error,
        requiresPayment: true,
      });
    }

    codeVerified = true;
    codeUsed = sanitizedCode;
    console.log(`[Auth] ✅ User ${name} verified via invite code: ${sanitizedCode}`);
  }

  // Generate invite code for new user (if they used an invite code or paid)
  // This creates viral growth: every verified user can invite 4 more
  let newUserInviteCode: string | undefined;
  if (codeVerified) {
    // Import the code generation function
    const crypto = require('crypto');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    const randomBytes = crypto.randomBytes(16);
    for (let i = 0; i < 16; i++) {
      code += chars[randomBytes[i] % chars.length];
    }
    
    newUserInviteCode = code;
    
    // Create invite code entry for this new user
    const newInviteCode: import('./types').InviteCode = {
      code: newUserInviteCode,
      createdBy: userId,
      createdByName: name.trim(),
      createdAt: Date.now(),
      type: 'user',
      maxUses: 4,
      usesRemaining: 4,
      usedBy: [],
      isActive: true,
    };
    
    store.createInviteCode(newInviteCode);
    console.log(`[Auth] Generated 4-use invite code for new user ${name}: ${newUserInviteCode}`);
  }

  // Check if referral code is valid (matchmaker system)
  let referralInfo: any = null;
  if (referralCode) {
    referralInfo = store.getReferralMapping(referralCode);
    if (!referralInfo) {
      console.warn(`[Auth] Invalid referral code: ${referralCode}`);
    } else {
      console.log(`[Auth] Valid intro: ${referralInfo.createdByName} introducing someone to ${referralInfo.targetName}`);
    }
  }

  const user: User = {
    userId,
    name: name.trim(),
    gender,
    accountType: 'guest',
    createdAt: Date.now(),
    banStatus: 'none',
    // Paywall status
    paidStatus: codeVerified ? 'qr_verified' : 'unpaid',
    inviteCodeUsed: codeUsed,
    // New user's own invite code (if they were verified)
    myInviteCode: newUserInviteCode,
    inviteCodeUsesRemaining: newUserInviteCode ? 4 : 0,
    // Store introduction info if this is via referral
    ...(referralInfo && {
      introducedTo: referralInfo.targetUserId,
      introducedViaCode: referralCode,
      introducedBy: referralInfo.createdByUserId,
    }),
  };

  const session: Session = {
    sessionToken,
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days for guest
    ipAddress: ip,
  };

  store.createUser(user);
  store.createSession(session);
  
  // Track IP for this user
  store.addUserIp(userId, ip);

  // If this signup was via referral, notify the TARGET user (person being introduced to)
  if (referralInfo) {
    // Create notification for the TARGET user
    const notification: import('./types').ReferralNotification = {
      id: uuidv4(),
      forUserId: referralInfo.targetUserId, // The person on the card
      referredUserId: userId, // The new signup
      referredName: user.name,
      introducedBy: referralInfo.createdByUserId,
      introducedByName: referralInfo.createdByName,
      timestamp: Date.now(),
      read: false,
    };
    store.createReferralNotification(notification);
    
    console.log(`[Referral] Notification created for ${referralInfo.targetName}: ${user.name} was introduced by ${referralInfo.createdByName}`);
    
    // If target user is online, send notification immediately via Socket.io
    if (io && activeSockets) {
      const targetSocketId = activeSockets.get(referralInfo.targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('referral:notification', {
          message: `${user.name} wants to connect with you!`,
          notification,
        });
        console.log(`[Referral] ✅ Sent instant notification to ${referralInfo.targetName} (online)`);
      } else {
        console.log(`[Referral] Target user ${referralInfo.targetName} is offline - notification saved for later`);
      }
    }
  }

  // Check if target is online for immediate matching
  let targetOnline = false;
  let targetUser = null;
  if (referralInfo) {
    const presence = store.getPresence(referralInfo.targetUserId);
    targetOnline = !!(presence && presence.online && presence.available);
    targetUser = store.getUser(referralInfo.targetUserId);
  }

  res.json({
    userId,
    sessionToken,
    accountType: 'guest',
    wasReferred: !!referralInfo,
    introducedTo: referralInfo?.targetName,
    targetUser: targetUser ? {
      userId: targetUser.userId,
      name: targetUser.name,
      gender: targetUser.gender,
      selfieUrl: targetUser.selfieUrl,
      videoUrl: targetUser.videoUrl,
    } : null,
    targetOnline,
    referralCode: referralCode || null,
    // Paywall status
    paidStatus: user.paidStatus,
    requiresPayment: !codeVerified, // If not verified by code, needs payment
  });
});

/**
 * POST /auth/link
 * Convert guest account to permanent by linking email+password
 */
router.post('/link', async (req, res) => {
  const { sessionToken, email, password } = req.body;

  if (!sessionToken || !email || !password) {
    return res.status(400).json({ error: 'Session token, email, and password are required' });
  }

  const session = store.getSession(sessionToken);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  const user = store.getUser(session.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Check if email already exists
  const existingUser = store.getUserByEmail(email);
  if (existingUser && existingUser.userId !== user.userId) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  // Hash password with bcrypt (cost factor: 12)
  const password_hash = await bcrypt.hash(password, 12);
  
  // Update user to permanent
  store.updateUser(user.userId, {
    accountType: 'permanent',
    email,
    password_hash, // ✅ Securely hashed with bcrypt
  });

  // Extend session expiry for permanent users
  const extendedSession: Session = {
    ...session,
    expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
  };
  store.createSession(extendedSession);

  res.json({
    success: true,
    accountType: 'permanent',
  });
});

/**
 * POST /auth/login
 * Login with email+password (permanent users only)
 */
router.post('/login', async (req: any, res) => {
  const { email, password } = req.body;
  const ip = req.userIp; // Set by middleware with centralized IP extraction

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = store.getUserByEmail(email);
  if (!user || user.accountType !== 'permanent') {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // ✅ Secure password comparison with bcrypt
  if (!user.password_hash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Check if user is banned
  if (store.isUserBanned(user.userId)) {
    const banRecord = store.getBanRecord(user.userId);
    return res.status(403).json({ 
      error: 'Account suspended',
      banned: true,
      banStatus: user.banStatus,
      message: banRecord?.banStatus === 'temporary' 
        ? 'Your account has been temporarily suspended pending review.'
        : 'Your account has been permanently banned.',
      reviewStatus: banRecord?.reviewStatus,
    });
  }

  const sessionToken = uuidv4();
  const session: Session = {
    sessionToken,
    userId: user.userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
    ipAddress: ip,
  };

  store.createSession(session);
  
  // Track IP for this user
  store.addUserIp(user.userId, ip);

  res.json({
    userId: user.userId,
    sessionToken,
    accountType: user.accountType,
    user: {
      name: user.name,
      email: user.email,
      selfieUrl: user.selfieUrl,
      videoUrl: user.videoUrl,
    },
  });
});

  return router;
}

// Default export for backward compatibility
export default createAuthRoutes;

