import { useState } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Paper, 
  Typography, 
  CircularProgress,
  Alert,
  IconButton
} from '@mui/material';
import { CloudUpload as UploadIcon, Close as CloseIcon } from '@mui/icons-material';
import { uploadPdf } from '../../api';

const PdfUpload = ({ onUploadSuccess }) => {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      if (selectedFile.type !== 'application/pdf') {
        setError('Please upload a valid PDF file');
        return;
      }
      
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.split('.')[0]);
      }
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('title', title || file.name);
      
      await uploadPdf(formData);
      
      setSuccess(true);
      setTitle('');
      setFile(null);
      
      // Reset the file input
      const fileInput = document.getElementById('pdf-upload-input');
      if (fileInput) fileInput.value = '';
      
      // Notify parent component
      if (onUploadSuccess) onUploadSuccess();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error uploading PDF:', err);
      setError('Failed to upload PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Upload PDF
      </Typography>
      
      {success && (
        <Alert 
          severity="success" 
          sx={{ mb: 2 }}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => setSuccess(false)}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
        >
          PDF uploaded successfully!
        </Alert>
      )}
      
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => setError('')}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
        >
          {error}
        </Alert>
      )}
      
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <TextField
          fullWidth
          label="PDF Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          margin="normal"
          variant="outlined"
        />
        
        <Box sx={{ mt: 2, mb: 2 }}>
          <input
            id="pdf-upload-input"
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <label htmlFor="pdf-upload-input">
            <Button 
              variant="outlined" 
              component="span"
              startIcon={<UploadIcon />}
              fullWidth
            >
              {file ? file.name : 'Choose PDF File'}
            </Button>
          </label>
        </Box>
        
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={loading || !file}
          startIcon={loading ? <CircularProgress size={24} color="inherit" /> : null}
        >
          {loading ? 'Uploading...' : 'Upload PDF'}
        </Button>
      </Box>
    </Paper>
  );
};

export default PdfUpload; 