const express = require('express');
const { 
  uploadPdf, 
  getPdfs, 
  getPdfById, 
  streamPdf, 
  extractPdfPage, 
  deletePdf 
} = require('../controllers/pdfController');
const { upload } = require('../middleware/uploadMiddleware');

const router = express.Router();

// @route   POST /api/pdf
// @desc    Upload a PDF
// @access  Public
router.post('/', upload.single('pdf'), uploadPdf);

// @route   GET /api/pdf
// @desc    Get all PDFs
// @access  Public
router.get('/', getPdfs);

// Important: More specific routes first
// @route   GET /api/pdf/view/:id
// @desc    View PDF - Public access for viewing
// @access  Public
router.get('/view/:id', streamPdf);

// @route   GET /api/pdf/extract/:id
// @desc    Extract PDF page - Public access for downloading
// @access  Public
router.get('/extract/:id', extractPdfPage);

// @route   GET /api/pdf/:id
// @desc    Get PDF by ID
// @access  Public
router.get('/:id', getPdfById);

// @route   DELETE /api/pdf/:id
// @desc    Delete PDF
// @access  Public
router.delete('/:id', deletePdf);

module.exports = router; 