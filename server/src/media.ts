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
        // Upload to Cloudinary
        console.log('[Upload] Uploading video to Cloudinary...');
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'napalmsky/videos',
          resource_type: 'video',
          format: 'mp4',
          transformation: [
            { width: 1280, height: 720, crop: 'limit' },
            { quality: 'auto:good' }
          ]
        });
        videoUrl = result.secure_url;
        
        // Delete local temp file
        fs.unlinkSync(req.file.path);
        console.log(`[Upload] ✅ Video uploaded to Cloudinary for user ${req.userId.substring(0, 8)}`);
      } else {
        // Fallback to local storage (for development)
        const apiBase = process.env.API_BASE || `${req.protocol}://${req.get('host')}`;
        videoUrl = `${apiBase}/uploads/${req.file.filename}`;
        console.log(`[Upload] ⚠️  Using local storage (Cloudinary not configured)`);
      }

      await store.updateUser(req.userId, { videoUrl });
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

export default router;

