const express = require('express');
const { 
  uploadWebGL, 
  getWebGLProjects, 
  getWebGLById, 
  deleteWebGL,
  viewWebGL
} = require('../controllers/webglController');
const { upload } = require('../middleware/uploadMiddleware');

const router = express.Router();

// @route   POST /api/webgl
// @desc    Upload a WebGL project
// @access  Public
router.post('/', upload.single('webgl'), uploadWebGL);

// @route   GET /api/webgl
// @desc    Get all WebGL projects
// @access  Public
router.get('/', getWebGLProjects);

// @route   GET /api/webgl/view/:id/WebGL
// @desc    View WebGL project (serves the index.html file directly)
// @access  Public
router.get('/view/:id/WebGL', viewWebGL);

// @route   GET /api/webgl/view/:id
// @desc    View WebGL project (serves the index.html file directly)
// @access  Public
router.get('/view/:id', viewWebGL);

// @route   GET /api/webgl/view/:id/*
// @desc    View WebGL assets (serves all WebGL related files)
// @access  Public
router.get('/view/:id/*', viewWebGL);

// @route   GET /api/webgl/:id
// @desc    Get WebGL project by ID
// @access  Public
router.get('/:id', getWebGLById);

// @route   DELETE /api/webgl/:id
// @desc    Delete WebGL project
// @access  Public
router.delete('/:id', deleteWebGL);

module.exports = router; 