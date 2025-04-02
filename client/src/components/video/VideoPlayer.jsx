import { useState, useEffect, useRef } from 'react';
import { Box, Paper, Typography, IconButton, CircularProgress } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { streamVideo } from '../../api';

const VideoPlayer = ({ video, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const videoRef = useRef(null);

  useEffect(() => {
    if (video) {
      setLoading(true);
      setError('');
    }
  }, [video]);

  const handleLoadError = () => {
    console.error('Video failed to load');
    setError('Failed to load video. Please try again later.');
    setLoading(false);
  };

  const handleVideoLoad = () => {
    console.log('Video loaded successfully');
    setLoading(false);
  };

  if (!video) {
    return null;
  }

  const videoStreamUrl = streamVideo(video._id);

  return (
    <Paper elevation={3} sx={{ mt: 2, p: 2, position: 'relative' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">{video.title}</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {loading && (
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            minHeight: '300px' 
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Box sx={{ mt: 2 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      <Box
        sx={{
          width: '100%',
          display: loading ? 'none' : 'block',
        }}
      >
        <video
          ref={videoRef}
          controls
          width="100%"
          preload="metadata"
          onCanPlay={handleVideoLoad}
          onError={handleLoadError}
          style={{ maxHeight: '70vh' }}
        >
          <source src={videoStreamUrl} type={video.contentType} />
          Your browser does not support the video tag.
        </video>
      </Box>
    </Paper>
  );
};

export default VideoPlayer; 