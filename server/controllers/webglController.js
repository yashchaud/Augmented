const fs = require('fs');
const path = require('path');
const WebGL = require('../models/webglModel');
const { promisify } = require('util');
const extract = require('extract-zip');

// Helper function to create directory if it doesn't exist
const createDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
};

// Helper function to recursively set file permissions for WebGL files
const setFilePermissions = (directory) => {
  const files = fs.readdirSync(directory);
  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);
    
    // Set read permissions for all files
    try {
      fs.chmodSync(filePath, 0o755); // rwxr-xr-x permission
      
      if (stats.isDirectory()) {
        setFilePermissions(filePath); // Recurse into subdirectories
      }
    } catch (error) {
      console.error(`Error setting permissions for ${filePath}:`, error);
    }
  });
};

// Upload and extract a WebGL project
const uploadWebGL = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { title, description } = req.body;
    const { filename, mimetype, size, path: filePath } = req.file;
    
    console.log(`Uploading WebGL project: ${filename} (${size} bytes)`);
    console.log(`Uploaded file path: ${filePath}`);
    
    // Validate file is a zip
    if (!mimetype.includes('zip') && !filename.toLowerCase().endsWith('.zip')) {
      console.error('Uploaded file is not a zip archive');
      return res.status(400).json({ message: 'Uploaded file must be a zip archive' });
    }
    
    // First create the WebGL document to get a MongoDB ID
    const webgl = new WebGL({
      title: title || path.parse(filename).name,
      description: description || '',
      size,
      // Initialize these fields with temporary values until we extract the files
      folderPath: 'pending',
      indexPath: 'pending',
      isUnityProject: false
    });
    
    // Save to generate the MongoDB ID
    const savedWebGL = await webgl.save();
    const documentId = savedWebGL._id.toString();
    
    // Create a directory using the MongoDB ID
    const projectDir = path.join(__dirname, '..', 'uploads', 'webgl', documentId);
    
    console.log(`Creating project directory using ID: ${documentId}`);
    console.log(`Project directory path: ${projectDir}`);
    
    try {
      fs.mkdirSync(projectDir, { recursive: true });
      console.log(`Project directory created successfully`);
    } catch (dirError) {
      console.error(`Error creating project directory: ${dirError.message}`);
      // Clean up the database entry since we couldn't create the directory
      await WebGL.findByIdAndDelete(documentId);
      return res.status(500).json({ message: 'Failed to create project directory' });
    }
    
    // Extract the zip file
    try {
      console.log(`Extracting zip file to: ${projectDir}`);
      await extract(filePath, { dir: projectDir });
      console.log(`Zip file extracted successfully`);
      
      // Set proper permissions for all extracted files
      console.log(`Setting file permissions in: ${projectDir}`);
      setFilePermissions(projectDir);
      console.log(`File permissions set successfully`);
      
      // Find index.html file
      const findIndexHtml = (dir) => {
        console.log(`Searching for index.html in: ${dir}`);
        const files = fs.readdirSync(dir);
        console.log(`Directory contents: ${files.join(', ')}`);
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.isDirectory()) {
            const result = findIndexHtml(filePath);
            if (result) return result;
          } else if (file.toLowerCase() === 'index.html') {
            console.log(`Found index.html at: ${filePath}`);
            return filePath;
          }
        }
        return null;
      };
      
      const indexPath = findIndexHtml(projectDir);
      
      if (!indexPath) {
        console.error('No index.html found in WebGL project');
        // Clean up if no index.html found
        fs.rmSync(projectDir, { recursive: true, force: true });
        await WebGL.findByIdAndDelete(documentId);
        return res.status(400).json({ message: 'No index.html found in WebGL project' });
      }
      
      // Verify if it's a Unity WebGL project by checking for common Unity WebGL files
      const buildDirPath = path.join(path.dirname(indexPath), 'Build');
      const isUnityProject = fs.existsSync(buildDirPath);
      
      if (isUnityProject) {
        console.log(`Detected Unity WebGL project. Build directory: ${buildDirPath}`);
        // List the Build directory contents
        try {
          const buildFiles = fs.readdirSync(buildDirPath);
          console.log(`Build directory contents: ${buildFiles.join(', ')}`);
        } catch (err) {
          console.error(`Error reading Build directory: ${err.message}`);
        }
      } else {
        console.log('Not a Unity WebGL project or Build directory not found');
      }
      
      // Inject compatibility script for Unity WebGL if it's a Unity project
      if (isUnityProject) {
        try {
          let indexContent = fs.readFileSync(indexPath, 'utf8');
          
          // Script to help with WebGL compatibility and communication
          const compatibilityScript = `
<script>
  // Unity WebGL Compatibility Helper
  window.addEventListener('load', function() {
    // Check for WebGL support first
    function detectWebGLContext() {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return (gl && gl instanceof WebGLRenderingContext);
    }
    
    if (!detectWebGLContext()) {
      window.parent.postMessage({ type: 'unityError', message: 'WebGL is not supported or enabled in your browser' }, '*');
      return;
    }
    
    // The instance where Unity will be stored after loading
    let unityInstanceRef = null;
    
    // Override createUnityInstance to track progress and completion
    if (typeof createUnityInstance === 'function') {
      const originalCreateUnityInstance = createUnityInstance;
      window.createUnityInstance = function(canvas, config, progressCallback) {
        return originalCreateUnityInstance(canvas, config, function(progress) {
          // Report progress to parent window
          window.parent.postMessage({ type: 'unityProgress', progress: progress }, '*');
          
          // Call original progress callback if provided
          if (typeof progressCallback === 'function') {
            progressCallback(progress);
          }
          
          // When loading is complete
          if (progress >= 1.0) {
            // Give a small delay for Unity to initialize
            setTimeout(function() {
              window.parent.postMessage('unityLoaded', '*');
            }, 1000);
          }
        })
        .then(function(unityInstance) {
          // Store Unity instance for later reference
          unityInstanceRef = unityInstance;
          window.unityInstance = unityInstance;
          
          // Setup additional message listener for parent communication
          window.addEventListener('message', function(e) {
            if (e.data && e.data.type === 'unityCommand' && unityInstanceRef) {
              try {
                // Handle commands from parent
                if (e.data.action === 'fullscreen') {
                  unityInstanceRef.SetFullscreen(1);
                }
              } catch (err) {
                console.error('Error executing Unity command:', err);
              }
            }
          });
          
          return unityInstance;
        })
        .catch(function(error) {
          console.error('Unity WebGL error:', error);
          window.parent.postMessage({ 
            type: 'unityError', 
            message: error.toString() 
          }, '*');
          throw error;
        });
      };
    }
    
    // Backup timer to notify parent window if Unity takes too long to initialize
    // or if createUnityInstance doesn't exist
    setTimeout(function() {
      if (!unityInstanceRef && !window.unityInstance) {
        window.parent.postMessage({ 
          type: 'unityProgress', 
          progress: 0.5,
          message: 'Unity is taking longer than expected to initialize'
        }, '*');
        
        // Additional timeout as a last resort
        setTimeout(function() {
          window.parent.postMessage('unityLoaded', '*');
        }, 10000);
      }
    }, 5000);
  });
</script>`;
          
          // Insert the compatibility script right before the closing </body> tag
          indexContent = indexContent.replace('</body>', compatibilityScript + '\n</body>');
          fs.writeFileSync(indexPath, indexContent);
        } catch (err) {
          console.error('Error injecting compatibility script:', err);
          // Continue even if we couldn't inject the script
        }
      }
      
      // Get relative path from uploads directory
      const relativeIndexPath = path.relative(
        path.join(__dirname, '..', 'uploads'),
        indexPath
      );
      
      // Update the WebGL record with the actual paths
      savedWebGL.folderPath = projectDir;  // Store the full absolute path
      savedWebGL.indexPath = relativeIndexPath;  // Store the path relative to uploads directory
      savedWebGL.isUnityProject = isUnityProject;
      await savedWebGL.save();
      
      // Remove the original zip file
      fs.unlinkSync(filePath);
      
      res.status(201).json(savedWebGL);
    } catch (error) {
      console.error('Error extracting WebGL project:', error);
      console.error('Error details:', JSON.stringify({
        message: error.message,
        stack: error.stack,
        code: error.code,
        fileName: req.file?.filename,
        fileSize: req.file?.size,
        projectDir
      }));
      
      // Clean up on error
      if (fs.existsSync(projectDir)) {
        fs.rmSync(projectDir, { recursive: true, force: true });
      }
      // Delete the database entry
      await WebGL.findByIdAndDelete(documentId);
      return res.status(500).json({ message: 'Failed to extract WebGL project' });
    }
  } catch (error) {
    console.error('Error uploading WebGL project:', error);
    res.status(500).json({ message: 'Server error during WebGL upload' });
  }
};

// Get all WebGL projects
const getWebGLProjects = async (req, res) => {
  try {
    const projects = await WebGL.find({}).sort({ createdAt: -1 });
    res.status(200).json(projects);
  } catch (error) {
    console.error('Error fetching WebGL projects:', error);
    res.status(500).json({ message: 'Server error while fetching WebGL projects' });
  }
};

// Get a single WebGL project by ID
const getWebGLById = async (req, res) => {
  try {
    const project = await WebGL.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'WebGL project not found' });
    }
    
    res.status(200).json(project);
  } catch (error) {
    console.error('Error fetching WebGL project:', error);
    res.status(500).json({ message: 'Server error while fetching WebGL project' });
  }
};

// Delete a WebGL project
const deleteWebGL = async (req, res) => {
  try {
    const project = await WebGL.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'WebGL project not found' });
    }
    
    // Remove the project directory
    if (fs.existsSync(project.folderPath)) {
      fs.rmSync(project.folderPath, { recursive: true, force: true });
    }
    
    // Remove from database
    await project.deleteOne();
    
    res.status(200).json({ message: 'WebGL project removed' });
  } catch (error) {
    console.error('Error deleting WebGL project:', error);
    res.status(500).json({ message: 'Server error while deleting WebGL project' });
  }
};

// View WebGL project - serve the index.html file directly
const viewWebGL = async (req, res) => {
  try {
    console.log(`Original URL: ${req.originalUrl}`);
    console.log(`Request params: ${JSON.stringify(req.params)}`);
    
    // Check if this is a request to a common build directory pattern without project ID
    if (req.originalUrl.match(/\/api\/webgl\/view\/(Build|TemplateData)\//)) {
      console.error(`Invalid request path missing project ID: ${req.originalUrl}`);
      return res.status(400).json({ 
        message: 'Invalid WebGL request. Project ID missing.', 
        error: 'Path should be /api/webgl/view/PROJECT_ID/Build/... not /api/webgl/view/Build/...'
      });
    }
    
    console.log(`Attempting to find WebGL project with ID: ${req.params.id}`);
    
    // Validate MongoDB ID format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      console.error(`Invalid MongoDB ID format: ${req.params.id}`);
      return res.status(400).json({ message: 'Invalid WebGL project ID format' });
    }

    // Check if project directory exists on disk, even if it's not in the database
    const projectId = req.params.id;
    const projectDir = path.join(__dirname, '..', 'uploads', 'webgl', projectId);
    
    // If directory doesn't exist, then we can't serve anything
    if (!fs.existsSync(projectDir)) {
      console.error(`Project directory not found: ${projectDir}`);
      return res.status(404).json({ message: 'WebGL project directory not found' });
    }
    
    // Try to get the project from the database
    let project = await WebGL.findById(projectId);
    
    // If the project doesn't exist in the database but the directory exists,
    // auto-register the project in the database
    if (!project) {
      console.log(`Project not found in database but directory exists. Auto-registering...`);

      const webGLDir = path.join(projectDir, 'WebGL');
      const webGLBuildDir = path.join(webGLDir, 'Build');
      const webGLIndexPath = path.join(webGLDir, 'index.html');
      
      console.log(`WebGL directory: ${webGLDir} - exists: ${fs.existsSync(webGLDir)}`);
      console.log(`WebGL Build directory: ${webGLBuildDir} - exists: ${fs.existsSync(webGLBuildDir)}`);
      console.log(`WebGL index path: ${webGLIndexPath} - exists: ${fs.existsSync(webGLIndexPath)}`);
      
      // Only proceed if the WebGL index file exists
      if (!fs.existsSync(webGLIndexPath)) {
        console.error(`WebGL index file not found: ${webGLIndexPath}`);
        return res.status(404).json({ message: 'WebGL index file not found' });
      }
      
      // Get relative path for index.html (from uploads directory)
      const relativeIndexPath = path.relative(
        path.join(__dirname, '..', 'uploads'),
        webGLIndexPath
      );
      
      // Create a new WebGL project entry in the database
      project = new WebGL({
        _id: projectId,
        title: 'Auto-Recovered WebGL Project',
        description: 'Auto-registered project from existing folder',
        folderPath: projectDir,
        indexPath: relativeIndexPath,
        isUnityProject: fs.existsSync(webGLBuildDir),
        size: 0 // We could calculate the size if needed
      });
      
      // Save to database
      try {
        await project.save();
        console.log(`Auto-registered project in database: ${projectId}`);
      } catch (err) {
        console.error(`Error auto-registering project: ${err.message}`);
        // Continue anyway - we'll try to serve the files
      }
    }
    
    // Now either we have the existing project, or we created a new one
    console.log(`Found/Created WebGL project: ${project?.title || 'Unknown'}`);
    if (project) {
      console.log(`Project data:`, JSON.stringify({
        _id: project._id,
        title: project.title,
        folderPath: project.folderPath,
        indexPath: project.indexPath,
        isUnityProject: project.isUnityProject
      }));
    }
    
    // Extract the path after the project ID to determine what file to serve
    const requestUrl = req.originalUrl;
    const basePathRegex = new RegExp(`/api/webgl/view/${projectId}/?`);
    let relativePath = requestUrl.replace(basePathRegex, '');
    
    console.log(`Extracted relative path: "${relativePath}"`);
    
    // If no specific file requested (or just root), serve index.html
    if (!relativePath || relativePath === '' || relativePath === '/') {
      console.log(`Setting index.html as default path`);
      relativePath = 'index.html';
    }
    
    // Special processing for index.html to inject compatibility fixes
    if (relativePath === 'index.html') {
      console.log(`Serving index.html with WebGL compatibility fixes`);
      
      try {
        // Find the index.html file first
        let indexFilePath = null;
        for (const tryPath of possiblePaths) {
          if (fs.existsSync(tryPath)) {
            indexFilePath = tryPath;
            break;
          }
        }
        
        if (!indexFilePath) {
          console.error(`Could not find index.html file`);
          return res.status(404).json({ message: 'WebGL index.html file not found' });
        }
        
        // Read the original index.html content
        let indexContent = fs.readFileSync(indexFilePath, 'utf8');
        
        // Check if this is a Unity WebGL file by looking for Unity's script tags
        const isUnityWebGL = 
          indexContent.includes('UnityLoader.js') || 
          indexContent.includes('unity-webgl') || 
          indexContent.includes('createUnityInstance') ||
          indexContent.includes('UnityProgress');
        
        if (isUnityWebGL) {
          console.log('Detected Unity WebGL project, adding compatibility fixes...');
          
          // Function to fix null function or function signature mismatch errors
          const webGLFixes = `
<script>
// Unity WebGL compatibility fixes
window.addEventListener('load', function() {
  // Check for WebGL support
  function detectWebGL() {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && 
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  }
  
  if (!detectWebGL()) {
    console.error('WebGL is not supported in this browser');
    return;
  }
  
  // Fix for "function signature mismatch" errors
  function fixWebGLFunctionMismatch() {
    if (window.unityInstance) {
      console.log('Applying WebGL function signature mismatch fix...');
      
      // Store original SendMessage function
      const originalSendMessage = window.unityInstance.SendMessage;
      
      // Override with error-catching version
      window.unityInstance.SendMessage = function(gameObjectName, methodName, parameter) {
        try {
          return originalSendMessage(gameObjectName, methodName, parameter);
        } catch (err) {
          if (err.message && err.message.includes('function signature mismatch')) {
            console.warn('Caught and recovered from Unity function signature mismatch error');
            return null;
          }
          throw err;
        }
      };
    }
  }
  
  // Fix for WebGL context lost errors
  function setupContextLostHandler() {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('webglcontextlost', function(e) {
        console.warn('WebGL context lost, attempting to prevent default');
        e.preventDefault();
        
        // Try to restore the context
        if (canvas.getContext) {
          setTimeout(function() {
            console.log('Attempting to restore WebGL context...');
            canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
          }, 1000);
        }
      }, false);
    }
  }
  
  // Watch for the unityInstance to be created
  const originalCreateUnityInstance = window.createUnityInstance;
  if (typeof originalCreateUnityInstance === 'function') {
    window.createUnityInstance = function() {
      return originalCreateUnityInstance.apply(this, arguments)
        .then(function(unityInstance) {
          // Store global reference to Unity instance
          window.unityInstance = unityInstance;
          
          // Apply fixes
          fixWebGLFunctionMismatch();
          setupContextLostHandler();
          
          return unityInstance;
        });
    };
  }
  
  // Global error handler for Unity WebGL errors
  window.addEventListener('error', function(e) {
    if (e.message && (
      e.message.includes('Unity') || 
      e.message.includes('WebGL') || 
      e.message.includes('function signature mismatch')
    )) {
      console.warn('Caught Unity WebGL error:', e.message);
      
      // Try to apply fixes
      if (window.unityInstance) {
        fixWebGLFunctionMismatch();
      }
    }
  });
});
</script>`;
          
          // Inject the fixes before the closing </head> tag
          indexContent = indexContent.replace('</head>', webGLFixes + '\n</head>');
          
          // Set headers
          res.setHeader('Content-Type', 'text/html');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cache-Control', 'no-cache'); // Don't cache our modified version
          
          // Send the modified content
          return res.send(indexContent);
        } else {
          // Not a Unity WebGL project, continue with normal file serving
          console.log('Not a Unity WebGL project, serving original index.html');
          filePath = indexFilePath;
        }
      } catch (err) {
        console.error('Error modifying index.html:', err);
        // Continue with normal file serving if modification fails
      }
    }
    
    // Support multiple WebGL folder structure variations
    // We'll try several possible file locations in order
    const possiblePaths = [
      // Try standard WebGL structure first
      path.join(projectDir, 'WebGL', relativePath),
      // Try direct from project root
      path.join(projectDir, relativePath),
      // Try with Build as the root
      path.join(projectDir, 'Build', relativePath),
    ];
    
    // Check custom paths for index.html
    if (relativePath === 'index.html') {
      // Add the path from the database if it exists
      if (project && project.indexPath) {
        const fullIndexPath = path.join(__dirname, '..', 'uploads', project.indexPath);
        console.log(`Adding database index path: ${fullIndexPath}`);
        possiblePaths.unshift(fullIndexPath); // Add with highest priority
      }
    }
    
    let filePath = null;
    let fileFound = false;
    
    // Try each possible path until we find one that exists
    for (const tryPath of possiblePaths) {
      if (fs.existsSync(tryPath)) {
        filePath = tryPath;
        fileFound = true;
        console.log(`Found file at: ${filePath}`);
        break;
      } else {
        console.log(`File not found at: ${tryPath}`);
      }
    }
    
    if (!fileFound) {
      console.error(`WebGL file not found: ${relativePath}`);
      return res.status(404).json({ message: 'WebGL file not found' });
    }
    
    // Get file extension for content type
    const ext = path.extname(filePath).toLowerCase();
    console.log(`File extension: ${ext}`);
    
    // Set proper content types based on file extension
    const contentTypeMap = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.css': 'text/css',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.wasm': 'application/wasm',
      '.data': 'application/octet-stream',
      '.mem': 'application/octet-stream',
      '.symbols.json': 'application/json',
      '.framework.js': 'application/javascript',
      '.loader.js': 'application/javascript'
    };
    
    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    console.log(`Serving with content type: ${contentType}`);
    
    // Set headers for improved caching and CORS
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Stream the file to the response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    // Handle errors in the stream
    fileStream.on('error', error => {
      console.error(`Error streaming file: ${error.message}`);
      // If streaming fails and response hasn't been sent yet
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error streaming WebGL file' });
      } else {
        // If headers were already sent, just end the response
        res.end();
      }
    });
  } catch (error) {
    console.error('Error serving WebGL content:', error);
    res.status(500).json({ message: 'Server error while serving WebGL content', error: error.message });
  }
};

module.exports = {
  uploadWebGL,
  getWebGLProjects,
  getWebGLById,
  deleteWebGL,
  viewWebGL,
}; 