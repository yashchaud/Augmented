const express = require('express');
const { 
  uploadVideo, 
  getVideos, 
  getVideoById, 
  streamVideo, 
  deleteVideo 
} = require('../controllers/videoController');
const { upload } = require('../middleware/uploadMiddleware');

const router = express.Router();

// @route   POST /api/video
// @desc    Upload a video
// @access  Public
router.post('/', upload.single('video'), uploadVideo);

// @route   GET /api/video
// @desc    Get all videos
// @access  Public
router.get('/', getVideos);

// Important: More specific routes first
// @route   GET /api/video/stream/:id
// @desc    Stream video - Public access for media streaming
// @access  Public
router.get('/stream/:id', streamVideo);

// @route   GET /api/video/:id
// @desc    Get video by ID
// @access  Public
router.get('/:id', getVideoById);

// @route   DELETE /api/video/:id
// @desc    Delete video
// @access  Public
router.delete('/:id', deleteVideo);

module.exports = router; 