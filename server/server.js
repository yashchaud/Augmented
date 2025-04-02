const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./config/db');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

// Ensure all upload directories exist
const createUploadDirs = () => {
  const dirs = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'uploads', 'videos'),
    path.join(__dirname, 'uploads', 'pdfs'),
    path.join(__dirname, 'uploads', 'audio'),
    path.join(__dirname, 'uploads', 'webgl')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      console.log(`Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

const app = express();

// Middleware
app.use(express.json({ limit: '300mb' }));
app.use(cors());
app.use(bodyParser.json({ limit: '300mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '300mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Middleware for WebGL route and asset handling
app.use('/api/webgl/view', (req, res, next) => {
  // Allow service workers to control pages under their scope
  res.setHeader('Service-Worker-Allowed', '/');
  
  // Cross-origin isolation needed for proper service worker operation
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  
  // Add CORS headers for WebGL content
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  console.log(`[WebGL API Access] ${req.method} ${req.originalUrl}`);
  
  // Special handling for OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Middleware to set correct headers for WebGL content accessed via the /uploads path
app.use('/uploads/webgl', (req, res, next) => {
  const filePath = req.path;
  console.log(`[Static WebGL Access] ${req.method} ${req.originalUrl} (Path: ${filePath})`);
  
  // Special handling for Unity WebGL files
  const ext = path.extname(filePath).toLowerCase();
  
  // Set CORS headers for all WebGL content
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  // Set appropriate content type based on file extension
  if (ext === '.wasm') {
    res.setHeader('Content-Type', 'application/wasm');
  } else if (ext === '.unityweb') {
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Encoding', 'gzip');
  } else if (ext === '.js') {
    res.setHeader('Content-Type', 'application/javascript');
  } else if (ext === '.mem') {
    res.setHeader('Content-Type', 'application/octet-stream');
  } else if (ext === '.data') {
    res.setHeader('Content-Type', 'application/octet-stream');
  } else if (ext === '.json') {
    res.setHeader('Content-Type', 'application/json');
  } else if (ext === '.css') {
    res.setHeader('Content-Type', 'text/css');
  } else if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.gif') {
    res.setHeader('Content-Type', `image/${ext.substring(1)}`);
  }
  
  // Disable caching for development to prevent stale content issues
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Allow CORS for WebGL to work in iframe
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  
  // Special handling for OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Make uploads directory static with enhanced logging
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path) => {
    console.log(`[Static File] Serving: ${path}`);
    
    // Add CORS headers for all static content
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    // Get file extension
    const ext = path.split('.').pop().toLowerCase();
    
    // Add additional headers for specific file types if needed
    if (ext === 'html') {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      // Disable caching for HTML files to prevent stale content
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (ext === 'data' || ext === 'wasm' || ext === 'unityweb') {
      res.setHeader('Content-Type', 'application/octet-stream');
      if (ext === 'unityweb') {
        res.setHeader('Content-Encoding', 'gzip');
      }
    } else if (ext === 'js') {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (ext === 'css') {
      res.setHeader('Content-Type', 'text/css');
    } else if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) {
      res.setHeader('Content-Type', `image/${ext}`);
    }
  }
}));

// Routes
app.use('/api/video', require('./routes/videoRoutes'));
app.use('/api/pdf', require('./routes/pdfRoutes'));
app.use('/api/audio', require('./routes/audioRoutes'));
app.use('/api/webgl', require('./routes/webglRoutes'));

// Basic route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 