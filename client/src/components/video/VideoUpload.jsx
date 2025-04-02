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
import { uploadVideo } from '../../api';

const VideoUpload = ({ onUploadSuccess }) => {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.type.startsWith('video/')) {
        setError('Please upload a valid video file');
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
      setError('Please select a video file');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const formData = new FormData();
      formData.append('video', file);
      formData.append('title', title || file.name);
      
      await uploadVideo(formData);
      
      setSuccess(true);
      setTitle('');
      setFile(null);
      
      // Reset the file input
      const fileInput = document.getElementById('video-upload-input');
      if (fileInput) fileInput.value = '';
      
      // Notify parent component
      if (onUploadSuccess) onUploadSuccess();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error uploading video:', err);
      setError('Failed to upload video. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Upload Video
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
          Video uploaded successfully!
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
          label="Video Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          margin="normal"
          variant="outlined"
        />
        
        <Box sx={{ mt: 2, mb: 2 }}>
          <input
            id="video-upload-input"
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <label htmlFor="video-upload-input">
            <Button 
              variant="outlined" 
              component="span"
              startIcon={<UploadIcon />}
              fullWidth
            >
              {file ? file.name : 'Choose Video File'}
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
          {loading ? 'Uploading...' : 'Upload Video'}
        </Button>
      </Box>
    </Paper>
  );
};

export default VideoUpload; 