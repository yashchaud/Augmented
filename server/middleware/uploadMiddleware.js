const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const createUploadDirs = () => {
  const dirs = ['uploads', 'uploads/videos', 'uploads/pdfs', 'uploads/audio', 'uploads/webgl'];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    if (file.mimetype.startsWith('video/')) {
      uploadPath += 'videos/';
    } else if (file.mimetype === 'application/pdf') {
      uploadPath += 'pdfs/';
    } else if (file.mimetype.startsWith('audio/')) {
      uploadPath += 'audio/';
    } else {
      uploadPath += 'webgl/';
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Sanitize filename - remove invalid characters for Windows
    const sanitizedName = file.originalname
      .replace(/\s+/g, '-')
      .replace(/[<>:"/\\|?*]/g, '_');
    
    cb(null, `${Date.now()}-${sanitizedName}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
  const allowedAudioTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'];
  
  if (
    file.mimetype === 'application/pdf' ||
    allowedVideoTypes.includes(file.mimetype) ||
    allowedAudioTypes.includes(file.mimetype) ||
    (file.fieldname === 'webgl' && (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed'))
  ) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 300 * 1024 * 1024 }, // 300MB limit
});

module.exports = { upload }; 