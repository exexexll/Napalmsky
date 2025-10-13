import express from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Admin credentials (hashed password for security)
// Username: Hanson
// Password: 328077
const ADMIN_USERNAME = 'Hanson';
const ADMIN_PASSWORD_HASH = '$2b$12$51/ipDaDcOudvkQ8KZBdlOtlieovXEWfQcCW4PMC.ml530T7umAD2'; // bcrypt hash of "328077"

// Store admin sessions in memory (cloud: use Redis)
const adminSessions = new Map<string, { username: string; createdAt: number }>();

// Admin session expiry: 24 hours
const ADMIN_SESSION_EXPIRY = 24 * 60 * 60 * 1000;

/**
 * POST /admin/login
 * Authenticate admin user
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    // Check username
    if (username !== ADMIN_USERNAME) {
      // Add delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password with bcrypt
    const isValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    
    if (!isValid) {
      // Add delay to prevent brute force
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate admin session token
    const adminToken = uuidv4();
    
    // Store session
    adminSessions.set(adminToken, {
      username: ADMIN_USERNAME,
      createdAt: Date.now(),
    });

    console.log('[Admin] Admin logged in:', ADMIN_USERNAME);

    res.json({
      adminToken,
      username: ADMIN_USERNAME,
    });
  } catch (error) {
    console.error('[Admin] Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /admin/logout
 * Logout admin user
 */
router.post('/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (token && adminSessions.has(token)) {
    adminSessions.delete(token);
    console.log('[Admin] Admin logged out');
  }

  res.json({ success: true });
});

/**
 * Middleware: Verify admin authentication
 * Use this to protect admin routes
 */
export function requireAdmin(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  const session = adminSessions.get(token);

  if (!session) {
    return res.status(401).json({ error: 'Invalid admin session' });
  }

  // Check if session expired
  if (Date.now() - session.createdAt > ADMIN_SESSION_EXPIRY) {
    adminSessions.delete(token);
    return res.status(401).json({ error: 'Admin session expired' });
  }

  // Attach admin info to request
  req.adminUser = session.username;
  next();
}

/**
 * GET /admin/verify
 * Verify admin token is still valid
 */
router.get('/verify', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ valid: false });
  }

  const session = adminSessions.get(token);

  if (!session || Date.now() - session.createdAt > ADMIN_SESSION_EXPIRY) {
    if (session) adminSessions.delete(token);
    return res.status(401).json({ valid: false });
  }

  res.json({ 
    valid: true,
    username: session.username,
  });
});

// Clean up expired sessions every hour
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of adminSessions.entries()) {
    if (now - session.createdAt > ADMIN_SESSION_EXPIRY) {
      adminSessions.delete(token);
    }
  }
}, 60 * 60 * 1000);

export default router;

