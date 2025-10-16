import express from 'express';
import multer from 'multer';
import path from 'path';
import { store } from './store';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

const router = express.Router();

// Configure Cloudinary (uses environment variables)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Check if Cloudinary is configured
const useCloudinary = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY);

/**
 * Multer configuration for file uploads
 * ⚠️ Stores files locally for demo
 * Cloud-ready seam: Replace with S3/Azure Blob/Cloudinary in production
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    console.log(`Upload attempt - Field: ${file.fieldname}, MIME: ${file.mimetype}, Original: ${file.originalname}`);
    
    if (file.fieldname === 'selfie') {
      if (!file.mimetype.startsWith('image/')) {
        console.error(`Rejected selfie - MIME type: ${file.mimetype}`);
        return cb(new Error('Only images allowed for selfie'));
      }
    } else if (file.fieldname === 'video') {
      // Accept video MIME types and also application/octet-stream (fallback for some browsers)
      const isVideo = file.mimetype.startsWith('video/') || 
                      file.mimetype === 'application/octet-stream' ||
                      file.originalname.match(/\.(webm|mp4|mov|avi)$/i);
      
      if (!isVideo) {
        console.error(`Rejected video - MIME type: ${file.mimetype}, filename: ${file.originalname}`);
        return cb(new Error('Only videos allowed for intro video'));
      }
    }
    cb(null, true);
  },
});

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

  req.userId = session.userId;
  next();
}

/**
 * POST /media/selfie
 * Upload selfie photo (camera-captured only)
 */
router.post('/selfie', requireAuth, (req: any, res) => {
  upload.single('selfie')(req, res, async (err) => {
    // Handle multer errors
    if (err) {
      console.error('[Upload] Multer error:', err);
      return res.status(500).json({ 
        error: 'Upload failed: ' + err.message 
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      let selfieUrl: string;

      if (useCloudinary) {
        // Upload to Cloudinary
        console.log('[Upload] Uploading selfie to Cloudinary...');
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'napalmsky/selfies',
          resource_type: 'image',
          format: 'jpg',
          transformation: [
            { width: 800, height: 800, crop: 'limit' },
            { quality: 'auto:good' }
          ]
        });
        selfieUrl = result.secure_url;
        
        // Delete local temp file
        fs.unlinkSync(req.file.path);
        console.log(`[Upload] ✅ Selfie uploaded to Cloudinary for user ${req.userId.substring(0, 8)}`);
      } else {
        // Fallback to local storage (for development)
        const apiBase = process.env.API_BASE || `${req.protocol}://${req.get('host')}`;
        selfieUrl = `${apiBase}/uploads/${req.file.filename}`;
        console.log(`[Upload] ⚠️  Using local storage (Cloudinary not configured)`);
      }

      await store.updateUser(req.userId, { selfieUrl });
      res.json({ selfieUrl });
    } catch (error: any) {
      // Rollback: delete uploaded file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      console.error('[Upload] Upload failed:', error);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  });
});

/**
 * POST /media/video
 * Upload intro video (≤60s)
 */
router.post('/video', requireAuth, (req: any, res) => {
  upload.single('video')(req, res, async (err) => {
    // Handle multer errors
    if (err) {
      console.error('[Upload] Multer error:', err);
      return res.status(500).json({ 
        error: 'Upload failed: ' + err.message 
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      let videoUrl: string;

      if (useCloudinary) {
        // OPTIMIZATION: Return immediately, process in background
        // This prevents 10-30 second wait for Cloudinary processing
        const tempFilename = req.file.filename;
        const apiBase = process.env.API_BASE || `${req.protocol}://${req.get('host')}`;
        const tempUrl = `${apiBase}/uploads/${tempFilename}`;
        
        console.log('[Upload] File received, processing in background...');
        
        // Return temp URL immediately (user can continue)
        videoUrl = tempUrl;
        await store.updateUser(req.userId, { videoUrl: tempUrl });
        
        res.json({ videoUrl: tempUrl, processing: true });
        
        // BACKGROUND PROCESSING: Upload to Cloudinary async (don't block response)
        processVideoInBackground(req.file.path, req.userId, tempFilename);
        return;
      } else {
        // Fallback to local storage (for development)
        const apiBase = process.env.API_BASE || `${req.protocol}://${req.get('host')}`;
        videoUrl = `${apiBase}/uploads/${req.file.filename}`;
        console.log(`[Upload] ⚠️  Using local storage (Cloudinary not configured)`);
        
        await store.updateUser(req.userId, { videoUrl });
      }
      
      // Check if this user was introduced via referral - send notification NOW (after profile complete)
      const user = await store.getUser(req.userId);
      if (user && user.introducedTo && user.introducedBy && user.introducedViaCode) {
        const targetUser = await store.getUser(user.introducedTo);
        const introducerUser = await store.getUser(user.introducedBy);
        
        if (targetUser && introducerUser) {
          // Create notification for the TARGET user (person they were introduced to)
          const notification: any = {
            id: require('uuid').v4(),
            forUserId: user.introducedTo,
            referredUserId: user.userId,
            referredName: user.name,
            introducedBy: user.introducedBy,
            introducedByName: introducerUser.name,
            timestamp: Date.now(),
            read: false,
          };
          
          await store.createReferralNotification(notification);
          console.log(`[Referral] Notification created after profile completion for ${targetUser.name}: ${user.name} is now ready`);
          
          // TODO: Send via Socket.io if target is online
          // This would require access to io and activeSockets which aren't available in media routes
          // For now, notification will be delivered when target user next authenticates
        }
      }
      
      res.json({ videoUrl });
    } catch (error: any) {
      // Rollback: delete uploaded file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      console.error('[Upload] Upload failed:', error);
      res.status(500).json({ error: 'Failed to upload video' });
    }
  });
});

/**
 * Background video processing
 * Uploads to Cloudinary without blocking the response
 * Updates user with final URL when complete
 */
async function processVideoInBackground(
  localPath: string, 
  userId: string,
  tempFilename: string
) {
  try {
    console.log(`[Upload] 🔄 Starting background processing for user ${userId.substring(0, 8)}`);
    
    // Upload to Cloudinary with optimized settings
    const result = await cloudinary.uploader.upload(localPath, {
      folder: 'napalmsky/videos',
      resource_type: 'video',
      format: 'mp4',
      // OPTIMIZED: Faster processing with eager transformation
      eager: [
        { width: 1280, height: 720, crop: 'limit', quality: 'auto:good' }
      ],
      eager_async: false, // Process immediately for faster availability
    });
    
    const finalUrl = result.secure_url;
    console.log(`[Upload] ✅ Cloudinary upload complete: ${finalUrl}`);
    
    // Update user with final Cloudinary URL
    await store.updateUser(userId, { videoUrl: finalUrl });
    console.log(`[Upload] ✅ User ${userId.substring(0, 8)} video URL updated to Cloudinary`);
    
    // Delete local temp file
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      console.log(`[Upload] 🗑️  Deleted temp file: ${tempFilename}`);
    }
    
    console.log(`[Upload] 🎉 Background processing complete for user ${userId.substring(0, 8)}`);
  } catch (error: any) {
    console.error(`[Upload] ❌ Background processing failed for user ${userId.substring(0, 8)}:`, error.message);
    // Keep temp URL - user can still use platform
    // Admin can manually re-process failed videos if needed
  }
}

export default router;

