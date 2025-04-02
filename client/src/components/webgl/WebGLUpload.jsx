import { useState } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Paper, 
  Typography, 
  CircularProgress,
  Alert,
  IconButton,
  Link
} from '@mui/material';
import { CloudUpload as UploadIcon, Close as CloseIcon, Info as InfoIcon } from '@mui/icons-material';
import { uploadWebGL } from '../../api';

const WebGLUpload = ({ onUploadSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type (should be a zip file)
      if (!selectedFile.name.endsWith('.zip')) {
        setError('Please upload a valid ZIP file containing WebGL content');
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
      setError('Please select a ZIP file');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const formData = new FormData();
      formData.append('webgl', file);
      formData.append('title', title || file.name);
      if (description) {
        formData.append('description', description);
      }
      
      await uploadWebGL(formData);
      
      setSuccess(true);
      setTitle('');
      setDescription('');
      setFile(null);
      
      // Reset the file input
      const fileInput = document.getElementById('webgl-upload-input');
      if (fileInput) fileInput.value = '';
      
      // Notify parent component
      if (onUploadSuccess) onUploadSuccess();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error uploading WebGL:', err);
      setError('Failed to upload WebGL project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">
          Upload WebGL Project
        </Typography>
        <IconButton
          onClick={() => setShowInfo(!showInfo)}
          color="primary"
          title="WebGL Upload Information"
        >
          <InfoIcon />
        </IconButton>
      </Box>

      {showInfo && (
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => setShowInfo(false)}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
        >
          <Typography variant="body2" paragraph>
            <strong>Uploading Unity WebGL Projects:</strong>
          </Typography>
          <Typography variant="body2" component="div">
            <ol style={{ marginLeft: '1rem', paddingLeft: 0 }}>
              <li>Build your Unity project with WebGL template</li>
              <li>Compress the entire build folder as a ZIP file</li>
              <li>Ensure the ZIP contains index.html at root or in a subdirectory</li>
              <li>Maximum file size: 100MB</li>
            </ol>
          </Typography>
          <Typography variant="body2">
            <Link href="https://docs.unity3d.com/Manual/webgl-building.html" target="_blank" rel="noopener">
              Unity WebGL documentation
            </Link>
          </Typography>
        </Alert>
      )}
      
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
          WebGL project uploaded successfully!
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
          label="Project Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          margin="normal"
          variant="outlined"
        />
        
        <TextField
          fullWidth
          label="Description (Optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          margin="normal"
          variant="outlined"
          multiline
          rows={2}
        />
        
        <Box sx={{ mt: 2, mb: 2 }}>
          <input
            id="webgl-upload-input"
            type="file"
            accept=".zip"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <label htmlFor="webgl-upload-input">
            <Button 
              variant="outlined" 
              component="span"
              startIcon={<UploadIcon />}
              fullWidth
            >
              {file ? file.name : 'Choose ZIP File'}
            </Button>
          </label>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Upload a ZIP file containing your WebGL project with an index.html file. For Unity WebGL projects, 
            click the info icon above for guidance.
          </Typography>
        </Box>
        
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={loading || !file}
          startIcon={loading ? <CircularProgress size={24} color="inherit" /> : null}
        >
          {loading ? 'Uploading...' : 'Upload WebGL Project'}
        </Button>
      </Box>
    </Paper>
  );
};

export default WebGLUpload; 