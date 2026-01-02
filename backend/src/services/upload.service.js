/**
 * File Upload Service
 * 
 * Handles file uploads with:
 * - Size limits
 * - Type validation
 * - Secure filename generation
 * - Storage management
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Configuration from environment
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,jpg,jpeg,png').split(',');

// Ensure upload directory exists
const uploadDirs = {
    documents: path.join(UPLOAD_DIR, 'documents'),
    profiles: path.join(UPLOAD_DIR, 'profiles'),
    attachments: path.join(UPLOAD_DIR, 'attachments'),
    temp: path.join(UPLOAD_DIR, 'temp')
};

Object.values(uploadDirs).forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// MIME type mappings
const MIME_TYPES = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xls': 'application/vnd.ms-excel',
    'csv': 'text/csv'
};

/**
 * Generate secure filename
 */
function generateSecureFilename(originalName) {
    const ext = path.extname(originalName).toLowerCase();
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `${timestamp}_${random}${ext}`;
}

/**
 * Validate file type
 */
function validateFileType(file, allowedTypes = ALLOWED_TYPES) {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mimeType = file.mimetype;
    
    if (!allowedTypes.includes(ext)) {
        return { valid: false, error: `File type .${ext} not allowed. Allowed: ${allowedTypes.join(', ')}` };
    }
    
    // Verify MIME type matches extension
    const expectedMime = MIME_TYPES[ext];
    if (expectedMime && mimeType !== expectedMime) {
        return { valid: false, error: 'File type does not match content' };
    }
    
    return { valid: true };
}

/**
 * Storage configuration for different upload types
 */
const storageConfig = (folder) => multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = uploadDirs[folder] || uploadDirs.attachments;
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, generateSecureFilename(file.originalname));
    }
});

/**
 * Create multer upload middleware
 */
function createUploader(folder, options = {}) {
    const {
        maxSize = MAX_FILE_SIZE,
        allowedTypes = ALLOWED_TYPES,
        maxFiles = 5
    } = options;

    return multer({
        storage: storageConfig(folder),
        limits: {
            fileSize: maxSize,
            files: maxFiles
        },
        fileFilter: (req, file, cb) => {
            const validation = validateFileType(file, allowedTypes);
            if (!validation.valid) {
                cb(new Error(validation.error), false);
            } else {
                cb(null, true);
            }
        }
    });
}

// Pre-configured uploaders
const uploaders = {
    // Single document upload
    document: createUploader('documents', {
        allowedTypes: ['pdf', 'doc', 'docx'],
        maxSize: 5 * 1024 * 1024 // 5MB
    }),
    
    // Profile picture upload
    profilePicture: createUploader('profiles', {
        allowedTypes: ['jpg', 'jpeg', 'png'],
        maxSize: 2 * 1024 * 1024 // 2MB
    }),
    
    // General attachment
    attachment: createUploader('attachments'),
    
    // Multiple files
    multipleAttachments: createUploader('attachments', { maxFiles: 10 })
};

/**
 * Delete a file
 */
function deleteFile(filePath) {
    return new Promise((resolve, reject) => {
        const fullPath = path.join(UPLOAD_DIR, filePath);
        
        if (!fs.existsSync(fullPath)) {
            resolve({ deleted: false, reason: 'File not found' });
            return;
        }
        
        fs.unlink(fullPath, (err) => {
            if (err) reject(err);
            else resolve({ deleted: true, path: filePath });
        });
    });
}

/**
 * Get file info
 */
function getFileInfo(filePath) {
    const fullPath = path.join(UPLOAD_DIR, filePath);
    
    if (!fs.existsSync(fullPath)) {
        return null;
    }
    
    const stats = fs.statSync(fullPath);
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    
    return {
        path: filePath,
        fullPath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        extension: ext,
        mimeType: MIME_TYPES[ext] || 'application/octet-stream'
    };
}

/**
 * Clean up temp files older than 24 hours
 */
function cleanupTempFiles() {
    const tempDir = uploadDirs.temp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    fs.readdir(tempDir, (err, files) => {
        if (err) return;
        
        files.forEach(file => {
            const filePath = path.join(tempDir, file);
            fs.stat(filePath, (err, stats) => {
                if (err) return;
                
                if (Date.now() - stats.mtime.getTime() > maxAge) {
                    fs.unlink(filePath, () => {});
                }
            });
        });
    });
}

// Schedule cleanup every 6 hours
setInterval(cleanupTempFiles, 6 * 60 * 60 * 1000);

/**
 * Express middleware for handling upload errors
 */
function handleUploadError(err, req, res, next) {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'File Too Large',
                message: `File size exceeds limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                error: 'Too Many Files',
                message: 'Maximum number of files exceeded'
            });
        }
    }
    
    if (err.message.includes('File type')) {
        return res.status(400).json({
            error: 'Invalid File Type',
            message: err.message
        });
    }
    
    next(err);
}

module.exports = {
    uploaders,
    createUploader,
    deleteFile,
    getFileInfo,
    handleUploadError,
    uploadDirs,
    ALLOWED_TYPES,
    MAX_FILE_SIZE
};
