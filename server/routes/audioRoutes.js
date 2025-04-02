const express = require('express');
const { 
  uploadAudio, 
  getAudios, 
  getAudioById, 
  streamAudio, 
  updateAudio, 
  deleteAudio 
} = require('../controllers/audioController');
const { upload } = require('../middleware/uploadMiddleware');

const router = express.Router();

// @route   POST /api/audio
// @desc    Upload an audio recording
// @access  Public
router.post('/', upload.single('audio'), uploadAudio);

// @route   GET /api/audio
// @desc    Get all audio recordings
// @access  Public
router.get('/', getAudios);

// @route   GET /api/audio/stream/:id
// @desc    Stream audio - Public access for debugging
// @access  Public
router.get('/stream/:id', streamAudio);

// @route   GET /api/audio/:id
// @desc    Get audio by ID
// @access  Public
router.get('/:id', getAudioById);

// @route   PUT /api/audio/:id
// @desc    Update audio
// @access  Public
router.put('/:id', updateAudio);

// @route   DELETE /api/audio/:id
// @desc    Delete audio
// @access  Public
router.delete('/:id', deleteAudio);

module.exports = router; 