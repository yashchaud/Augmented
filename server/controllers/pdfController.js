const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const PDF = require('../models/pdfModel');

// Upload a PDF
const uploadPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { title } = req.body;
    const { filename, mimetype, size, path: filePath } = req.file;

    // Get page count
    let pageCount = 0;
    try {
      const pdfBuffer = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      pageCount = pdfDoc.getPageCount();
    } catch (err) {
      console.error('Error getting page count:', err);
    }

    const pdf = new PDF({
      title: title || filename,
      filename,
      filePath,
      contentType: mimetype,
      size,
      pageCount,
    });

    const savedPdf = await pdf.save();
    res.status(201).json(savedPdf);
  } catch (error) {
    console.error('Error uploading PDF:', error);
    res.status(500).json({ message: 'Server error during PDF upload' });
  }
};

// Get all PDFs
const getPdfs = async (req, res) => {
  try {
    const pdfs = await PDF.find({}).sort({ createdAt: -1 });
    res.status(200).json(pdfs);
  } catch (error) {
    console.error('Error fetching PDFs:', error);
    res.status(500).json({ message: 'Server error while fetching PDFs' });
  }
};

// Get a single PDF by ID
const getPdfById = async (req, res) => {
  try {
    const pdf = await PDF.findById(req.params.id);
    
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }
    
    res.status(200).json(pdf);
  } catch (error) {
    console.error('Error fetching PDF:', error);
    res.status(500).json({ message: 'Server error while fetching PDF' });
  }
};

// Stream PDF
const streamPdf = async (req, res) => {
  try {
    const pdf = await PDF.findById(req.params.id);
    
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }
    
    const pdfPath = pdf.filePath;
    
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ message: 'PDF file not found' });
    }
    
    const stat = fs.statSync(pdfPath);
    
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=${pdf.filename}`);
    
    const stream = fs.createReadStream(pdfPath);
    stream.pipe(res);
  } catch (error) {
    console.error('Error streaming PDF:', error);
    res.status(500).json({ message: 'Server error during PDF streaming' });
  }
};

// Extract a specific page from a PDF
const extractPdfPage = async (req, res) => {
  try {
    const { id } = req.params;
    const { pageNumber } = req.query;
    
    if (!pageNumber || isNaN(pageNumber)) {
      return res.status(400).json({ message: 'Valid page number required' });
    }
    
    const pdf = await PDF.findById(id);
    
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }
    
    const pageIndex = parseInt(pageNumber, 10) - 1; // Convert to 0-based index
    
    if (pageIndex < 0 || pageIndex >= pdf.pageCount) {
      return res.status(400).json({ message: 'Page number out of range' });
    }
    
    // Load the PDF
    const pdfBytes = fs.readFileSync(pdf.filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Create a new document with just the requested page
    const newPdfDoc = await PDFDocument.create();
    const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageIndex]);
    newPdfDoc.addPage(copiedPage);
    
    // Save the new single-page PDF
    const newPdfBytes = await newPdfDoc.save();
    
    // Send the response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="page-${pageNumber}-${pdf.filename}"`);
    res.send(Buffer.from(newPdfBytes));
  } catch (error) {
    console.error('Error extracting PDF page:', error);
    res.status(500).json({ message: 'Server error while extracting PDF page' });
  }
};

// Delete a PDF
const deletePdf = async (req, res) => {
  try {
    const pdf = await PDF.findById(req.params.id);
    
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }
    
    // Remove the file from the filesystem
    if (fs.existsSync(pdf.filePath)) {
      fs.unlinkSync(pdf.filePath);
    }
    
    // Remove from database
    await pdf.deleteOne();
    
    res.status(200).json({ message: 'PDF removed' });
  } catch (error) {
    console.error('Error deleting PDF:', error);
    res.status(500).json({ message: 'Server error while deleting PDF' });
  }
};

module.exports = {
  uploadPdf,
  getPdfs,
  getPdfById,
  streamPdf,
  extractPdfPage,
  deletePdf,
}; 