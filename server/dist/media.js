"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const store_1 = require("./store");
const router = express_1.default.Router();
/**
 * Multer configuration for file uploads
 * ⚠️ Stores files locally for demo
 * Cloud-ready seam: Replace with S3/Azure Blob/Cloudinary in production
 */
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        cb(null, `${file.fieldname}-${uniqueSuffix}${path_1.default.extname(file.originalname)}`);
    },
});
const upload = (0, multer_1.default)({
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
        }
        else if (file.fieldname === 'video') {
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
function requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Authorization required' });
    }
    const session = store_1.store.getSession(token);
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
router.post('/selfie', requireAuth, (req, res) => {
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
            // Use full URL with API base for proper CORS and serving
            const selfieUrl = `http://localhost:3001/uploads/${req.file.filename}`;
            store_1.store.updateUser(req.userId, { selfieUrl });
            console.log(`[Upload] ✅ Selfie uploaded successfully for user ${req.userId.substring(0, 8)}`);
            res.json({ selfieUrl });
        }
        catch (error) {
            // Rollback: delete uploaded file if database update fails
            const fs = require('fs');
            fs.unlink(req.file.path, (unlinkErr) => {
                if (unlinkErr) {
                    console.error('[Upload] Failed to delete orphaned file:', unlinkErr);
                }
            });
            console.error('[Upload] Database update failed:', error);
            res.status(500).json({ error: 'Failed to save upload' });
        }
    });
});
/**
 * POST /media/video
 * Upload intro video (≤60s)
 */
router.post('/video', requireAuth, (req, res) => {
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
            // Use full URL with API base for proper CORS and serving
            const videoUrl = `http://localhost:3001/uploads/${req.file.filename}`;
            store_1.store.updateUser(req.userId, { videoUrl });
            console.log(`[Upload] ✅ Video uploaded successfully for user ${req.userId.substring(0, 8)}`);
            res.json({ videoUrl });
        }
        catch (error) {
            // Rollback: delete uploaded file if database update fails
            const fs = require('fs');
            fs.unlink(req.file.path, (unlinkErr) => {
                if (unlinkErr) {
                    console.error('[Upload] Failed to delete orphaned file:', unlinkErr);
                }
            });
            console.error('[Upload] Database update failed:', error);
            res.status(500).json({ error: 'Failed to save upload' });
        }
    });
});
exports.default = router;
