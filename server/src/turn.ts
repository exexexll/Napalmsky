import express from 'express';
import { store } from './store';

const router = express.Router();

/**
 * Middleware to verify session token
 */
async function requireAuth(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  const session = await store.getSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  // SECURITY: Check if session is still active
  const isActive = await store.isSessionActive(token);
  if (!isActive) {
    return res.status(401).json({ 
      error: 'Session invalidated',
      sessionInvalidated: true
    });
  }

  // Check if user is banned
  if (store.isUserBanned(session.userId)) {
    return res.status(403).json({ error: 'Account suspended', banned: true });
  }

  req.userId = session.userId;
  next();
}

/**
 * GET /turn/credentials
 * Generate time-limited TURN credentials (1 hour expiry)
 * SECURITY: Credentials never exposed to client code
 */
router.get('/credentials', requireAuth, async (req: any, res) => {
  try {
    const userId = req.userId;
    console.log(`[TURN] Generating credentials for user ${userId.substring(0, 8)}`);

    // Option 1: Cloudflare TURN (Recommended - 8x cheaper)
    if (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_TURN_KEY) {
      try {
        const response = await fetch(
          `https://rtc.live.cloudflare.com/v1/turn/keys/${process.env.CLOUDFLARE_TURN_KEY}/credentials/generate`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ttl: 3600 // 1 hour expiry
            })
          }
        );

        if (!response.ok) {
          throw new Error(`Cloudflare TURN API error: ${response.status}`);
        }

        const turnData: any = await response.json();
        
        return res.json({
          iceServers: [
            // Free STUN servers (always available)
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            // Cloudflare TURN (secure, time-limited)
            ...turnData.iceServers
          ],
          expiresAt: Date.now() + 3600000, // 1 hour
          provider: 'cloudflare'
        });
      } catch (cloudflareError) {
        console.error('[TURN] Cloudflare TURN error:', cloudflareError);
        // Fall through to Twilio or STUN-only
      }
    }

    // Option 2: Twilio TURN (Fallback)
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      console.log('[TURN] ✅ Twilio credentials detected, attempting to generate TURN credentials...');
      try {
        const twilio = require('twilio');
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        
        console.log('[TURN] Calling Twilio API to create token...');
        const token = await client.tokens.create({ ttl: 3600 });
        
        console.log('[TURN] ✅ Twilio token created successfully!');
        console.log('[TURN] ICE servers received:', token.iceServers?.length || 0);
        
        return res.json({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            ...token.iceServers
          ],
          expiresAt: Date.now() + 3600000,
          provider: 'twilio'
        });
      } catch (twilioError: any) {
        console.error('[TURN] ❌ Twilio TURN error:', twilioError.message || twilioError);
        console.error('[TURN] Error details:', JSON.stringify(twilioError, null, 2));
        // Fall through to free public TURN
      }
    } else {
      console.log('[TURN] ⚠️ Twilio credentials NOT found in environment variables');
    }

    // Option 3: Free Public TURN Servers (Fallback - better than STUN-only)
    console.warn('[TURN] No premium TURN configured, using free public TURN servers');
    return res.json({
      iceServers: [
        // STUN servers (NAT discovery)
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        // Free public TURN servers (relay for NAT traversal)
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443?transport=tcp',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ],
      expiresAt: Date.now() + 3600000,
      provider: 'free-public-turn',
      warning: 'Using free public TURN - for production, configure Cloudflare TURN'
    });

  } catch (error) {
    console.error('[TURN] Failed to generate credentials:', error);
    
    // Emergency fallback: STUN-only
    res.json({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ],
      expiresAt: Date.now() + 3600000,
      provider: 'fallback'
    });
  }
});

/**
 * GET /turn/status
 * Check which TURN provider is configured (for debugging)
 */
router.get('/status', requireAuth, (req: any, res) => {
  const status = {
    cloudflare: !!(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_TURN_KEY),
    twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    timestamp: Date.now()
  };

  res.json(status);
});

export default router;

