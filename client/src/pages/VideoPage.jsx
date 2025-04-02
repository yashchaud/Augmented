import { useState } from 'react';
import { Container, Typography, Divider, Box } from '@mui/material';
import VideoUpload from '../components/video/VideoUpload';
import VideoList from '../components/video/VideoList';
import VideoPlayer from '../components/video/VideoPlayer';

const VideoPage = () => {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadSuccess = () => {
    setRefreshKey(prevKey => prevKey + 1);
    setIsUploading(true);
  };

  const handleRefreshComplete = () => {
    setIsUploading(false);
  };

  const handleSelectVideo = (video) => {
    setSelectedVideo(video);
    // Scroll to the top if needed
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Video Streaming
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Upload and stream video content directly within the application.
      </Typography>

      <VideoUpload onUploadSuccess={handleUploadSuccess} />
      
      {selectedVideo && (
        <VideoPlayer 
          video={selectedVideo} 
          onClose={() => setSelectedVideo(null)} 
        />
      )}

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Your Videos
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <VideoList 
          onSelectVideo={handleSelectVideo} 
          refreshList={refreshKey}
          onRefreshComplete={handleRefreshComplete}
        />
        
        {isUploading && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
            Refreshing video list...
          </Typography>
        )}
      </Box>
    </Container>
  );
};

export default VideoPage; 