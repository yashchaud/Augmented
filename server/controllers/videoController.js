const fs = require('fs');
const path = require('path');
const Video = require('../models/videoModel');

// Upload a video
const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { title } = req.body;
    const { filename, mimetype, size, path: filePath } = req.file;

    const video = new Video({
      title: title || filename,
      filename,
      filePath,
      contentType: mimetype,
      size,
    });

    const savedVideo = await video.save();
    res.status(201).json(savedVideo);
  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ message: 'Server error during video upload' });
  }
};

// Get all videos
const getVideos = async (req, res) => {
  try {
    const videos = await Video.find({}).sort({ createdAt: -1 });
    res.status(200).json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ message: 'Server error while fetching videos' });
  }
};

// Get a single video by ID
const getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
    res.status(200).json(video);
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({ message: 'Server error while fetching video' });
  }
};

// Stream video
const streamVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
    const videoPath = video.filePath;
    
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ message: 'Video file not found on server' });
    }
    
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      
      // Ensure valid range
      if (isNaN(start) || isNaN(end) || start >= fileSize || end >= fileSize) {
        res.status(416).send('Requested Range Not Satisfiable');
        return;
      }
      
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': video.contentType,
      };
      
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      // Send the entire file if no range is specified
      const head = {
        'Content-Length': fileSize,
        'Content-Type': video.contentType,
        'Accept-Ranges': 'bytes',
      };
      
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    console.error('Error streaming video:', error);
    res.status(500).json({ message: 'Server error during video streaming' });
  }
};

// Delete a video
const deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
    // Remove the file from the filesystem
    if (fs.existsSync(video.filePath)) {
      fs.unlinkSync(video.filePath);
    }
    
    // Remove from database
    await video.deleteOne();
    
    res.status(200).json({ message: 'Video removed' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ message: 'Server error while deleting video' });
  }
};

module.exports = {
  uploadVideo,
  getVideos,
  getVideoById,
  streamVideo,
  deleteVideo,
}; 