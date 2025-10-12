import express from 'express';
import { store } from './store';
import { v4 as uuidv4 } from 'uuid';
import { requirePayment } from './paywall-guard';

const router = express.Router();

/**
 * Middleware to verify session token
 */
function requireAuth(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  const session = store.getSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  req.userId = session.userId;
  next();
}

/**
 * GET /room/history
 * Get user's chat history
 */
router.get('/history', requireAuth, (req: any, res) => {
  const history = store.getHistory(req.userId);
  res.json({ history });
});

/**
 * GET /room/debug/presence
 * Debug endpoint to see all presence state
 */
router.get('/debug/presence', requireAuth, (req: any, res) => {
  const allUsers = Array.from(store['presence'].entries()).map(([userId, presence]) => {
    const user = store.getUser(userId);
    const isSelf = userId === req.userId;
    const hasCooldown = store.hasCooldown(req.userId, userId);
    const isReported = store.hasReportedUser(req.userId, userId);
    
    return {
      userId: userId.substring(0, 8),
      name: user?.name || 'Unknown',
      online: presence.online,
      available: presence.available,
      socketId: presence.socketId?.substring(0, 8),
      isSelf,
      hasCooldown,
      isReported,
    };
  });
  
  const availableOthers = allUsers.filter(u => u.online && u.available && !u.isSelf);
  const canActuallyMatch = availableOthers.filter(u => !u.isReported); // Exclude reported users
  
  console.log(`[Debug API] User ${req.userId.substring(0, 8)} requesting debug`);
  console.log(`[Debug API] Total: ${allUsers.length}, Online: ${allUsers.filter(u => u.online).length}, Available (excluding self): ${availableOthers.length}, Can Match (after reports): ${canActuallyMatch.length}`);
  
  res.json({
    totalUsers: allUsers.length,
    onlineUsers: allUsers.filter(u => u.online).length,
    availableUsers: allUsers.filter(u => u.online && u.available).length,
    availableOthers: availableOthers.length,
    canActuallyMatch: canActuallyMatch.length, // This is the accurate number
    users: allUsers,
  });
});

/**
 * GET /room/me
 * Get current user info including timer total
 */
router.get('/me', requireAuth, (req: any, res) => {
  const user = store.getUser(req.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const timerTotal = store.getTimerTotal(req.userId);

  res.json({
    userId: user.userId,
    name: user.name,
    selfieUrl: user.selfieUrl,
    timerTotal,
  });
});

/**
 * GET /room/queue
 * Get list of online & available users (algorithm-free)
 * PROTECTED: Requires payment or valid invite code
 */
router.get('/queue', requirePayment, (req: any, res) => {
  const onlineUsers = store.getAllOnlineAvailable(req.userId);
  const testMode = req.query.testMode === 'true';
  const totalAvailable = onlineUsers.length; // Total before any filtering
  
  console.log(`[Queue API] ========================================`);
  console.log(`[Queue API] User ${req.userId.substring(0, 8)} requesting queue`);
  console.log(`[Queue API] Test Mode: ${testMode}`);
  console.log(`[Queue API] Total online & available (excluding self): ${totalAvailable}`);
  console.log(`[Queue API] User IDs: ${onlineUsers.map(uid => uid.substring(0, 8)).join(', ')}`);
  
  const users = onlineUsers
    .map(uid => {
      const user = store.getUser(uid);
      if (!user) {
        console.log(`[Queue API] ⚠️  User ${uid.substring(0, 8)} in presence but not in users store`);
        return null;
      }
      
      // Hide if current user has reported this user
      if (store.hasReportedUser(req.userId, uid)) {
        console.log(`[Queue API] 🚫 Hiding ${user.name} (reported by current user)`);
        return null;
      }
      
      // Check cooldown (mark but don't filter, unless test mode)
      const hasCooldown = !testMode && store.hasCooldown(req.userId, uid);
      const cooldownExpiry = hasCooldown ? store.getCooldownExpiry(req.userId, uid) : null;

      if (hasCooldown) {
        console.log(`[Queue API] ⏰ Marking ${user.name} with cooldown (showing but disabled)`);
      } else {
        console.log(`[Queue API] ✅ Including ${user.name} (${uid.substring(0, 8)})`);
      }

      // Check if this user was introduced to the current user
      const wasIntroducedToMe = user.introducedTo === req.userId;
      const introducedByUser = wasIntroducedToMe && user.introducedBy 
        ? store.getUser(user.introducedBy) 
        : null;

      return {
        userId: user.userId,
        name: user.name,
        gender: user.gender,
        selfieUrl: user.selfieUrl,
        videoUrl: user.videoUrl,
        hasCooldown,
        cooldownExpiry,
        wasIntroducedToMe,
        introducedBy: introducedByUser?.name || null,
      };
    })
    .filter(Boolean);

  console.log(`[Queue API] Final result: ${users.length} users (${users.filter((u: any) => u.hasCooldown).length} with cooldown)`);
  console.log(`[Queue API] Returning: ${users.map((u: any) => `${u.name}${u.hasCooldown ? ' [COOLDOWN]' : ''}`).join(', ')}`);
  console.log(`[Queue API] Total available count: ${totalAvailable}`);
  console.log(`[Queue API] ========================================`);
  res.json({ users, totalAvailable });
});

/**
 * GET /room/reel
 * Random batch of online users (uniform shuffle, no algorithm)
 * PROTECTED: Requires payment or valid invite code
 */
router.get('/reel', requirePayment, (req: any, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const cursor = req.query.cursor as string || uuidv4();

  const onlineUsers = store.getAllOnlineAvailable(req.userId);
  const seen = store.getSeen(cursor);

  // Filter out seen users and cooldowns
  const unseen = onlineUsers.filter(uid => {
    if (seen.has(uid)) return false;
    if (store.hasCooldown(req.userId, uid)) return false;
    return true;
  });

  // Random shuffle (Fisher-Yates)
  const shuffled = [...unseen];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Take batch
  const batch = shuffled.slice(0, limit);

  // Mark as seen
  batch.forEach(uid => store.addSeen(cursor, uid));

  // Map to user data
  const items = batch
    .map(uid => {
      const user = store.getUser(uid);
      if (!user) return null;

      return {
        userId: user.userId,
        name: user.name,
        gender: user.gender,
        selfieUrl: user.selfieUrl,
        videoUrl: user.videoUrl,
      };
    })
    .filter(Boolean);

  res.json({
    items,
    cursor,
    hasMore: shuffled.length > limit,
  });
});

export default router;

