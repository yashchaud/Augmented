import { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Button, Grid, CircularProgress } from '@mui/material';
import { Delete as DeleteIcon, PlayArrow as PlayIcon } from '@mui/icons-material';
import { getVideos, deleteVideo } from '../../api';

const VideoList = ({ onSelectVideo, refreshList, onRefreshComplete }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchVideos();
  }, [refreshList]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const response = await getVideos();
      setVideos(response.data);
      if (onRefreshComplete) onRefreshComplete();
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError('Failed to load videos. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteVideo(id);
      setVideos(videos.filter((video) => video._id !== id));
    } catch (err) {
      console.error('Error deleting video:', err);
      setError('Failed to delete video. Please try again.');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography color="error">{error}</Typography>
        <Button variant="outlined" onClick={fetchVideos} sx={{ mt: 1 }}>
          Try Again
        </Button>
      </Box>
    );
  }

  if (videos.length === 0) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography>No videos available. Upload a video to get started.</Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      {videos.map((video) => (
        <Grid item xs={12} sm={6} md={4} key={video._id}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" noWrap title={video.title}>
                {video.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {new Date(video.createdAt).toLocaleString()}
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Button
                  variant="contained"
                  startIcon={<PlayIcon />}
                  onClick={() => onSelectVideo(video)}
                  size="small"
                >
                  Play
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleDelete(video._id)}
                  size="small"
                >
                  Delete
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default VideoList; 