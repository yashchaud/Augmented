/**
 * Recovery script for WebGL projects
 * This script scans the webgl uploads directory and ensures all projects are registered in the database
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const WebGL = require('./models/webglModel');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/blogforcontent')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Helper function to create directory if it doesn't exist
const createDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
};

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads', 'webgl');
createDir(uploadsDir);

async function recoverProjects() {
  try {
    console.log('Starting WebGL project recovery...');
    
    // Get all project directories from the filesystem
    const projectDirs = fs.readdirSync(uploadsDir)
      .filter(item => {
        const fullPath = path.join(uploadsDir, item);
        return fs.statSync(fullPath).isDirectory() && item.match(/^[0-9a-fA-F]{24}$/);
      });
    
    console.log(`Found ${projectDirs.length} potential project directories on disk`);
    
    // Check each directory and ensure it's in the database
    for (const projectId of projectDirs) {
      console.log(`\nProcessing project: ${projectId}`);
      
      // Check if project exists in database
      const existingProject = await WebGL.findById(projectId);
      
      if (existingProject) {
        console.log(`✅ Project already exists in database`);
        continue;
      }
      
      // Project not in database, check if files exist
      const projectDir = path.join(uploadsDir, projectId);
      const webGLDir = path.join(projectDir, 'WebGL');
      const webGLIndexPath = path.join(webGLDir, 'index.html');
      const webGLBuildDir = path.join(webGLDir, 'Build');
      
      console.log(`- Project directory: ${projectDir} - exists: ${fs.existsSync(projectDir)}`);
      console.log(`- WebGL directory: ${webGLDir} - exists: ${fs.existsSync(webGLDir)}`);
      console.log(`- WebGL index file: ${webGLIndexPath} - exists: ${fs.existsSync(webGLIndexPath)}`);
      console.log(`- WebGL Build directory: ${webGLBuildDir} - exists: ${fs.existsSync(webGLBuildDir)}`);
      
      // Check if this is a valid WebGL project (must have index.html)
      if (!fs.existsSync(webGLIndexPath)) {
        console.log(`❌ Not a valid WebGL project - missing index.html`);
        continue;
      }
      
      // Get relative path for index.html (from uploads directory)
      const relativeIndexPath = path.relative(
        path.join(__dirname, 'uploads'),
        webGLIndexPath
      );
      
      // Calculate size (optional)
      let totalSize = 0;
      if (fs.existsSync(webGLBuildDir)) {
        const buildFiles = fs.readdirSync(webGLBuildDir);
        buildFiles.forEach(file => {
          try {
            const filePath = path.join(webGLBuildDir, file);
            const stats = fs.statSync(filePath);
            totalSize += stats.size;
          } catch (err) {
            console.error(`Error getting file size: ${err.message}`);
          }
        });
      }
      
      // Create new project in database
      const newProject = new WebGL({
        _id: projectId,
        title: 'Recovered WebGL Project',
        description: 'Auto-registered project from existing folder',
        folderPath: projectDir,
        indexPath: relativeIndexPath,
        isUnityProject: fs.existsSync(webGLBuildDir),
        size: totalSize
      });
      
      // Save to database
      await newProject.save();
      console.log(`✅ Successfully registered project in database`);
    }
    
    console.log('\nRecovery process complete!');
    mongoose.disconnect();
  } catch (err) {
    console.error('Error during recovery:', err);
    mongoose.disconnect();
    process.exit(1);
  }
}

// Run the recovery process
recoverProjects(); 