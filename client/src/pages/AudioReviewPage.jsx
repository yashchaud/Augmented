import { useState } from 'react';
import { Container, Typography, Divider, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AudioList from '../components/audio/AudioList';

const AudioReviewPage = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
    setIsLoading(true);
  };

  const handleRefreshComplete = () => {
    setIsLoading(false);
  };

  const goToRecordPage = () => {
    navigate('/audio-recorder');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Audio Review
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Manage and play your audio recordings.
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Button 
          variant="contained" 
          onClick={goToRecordPage}
        >
          Record New Audio
        </Button>
        <Button 
          variant="outlined" 
          onClick={handleRefresh}
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : 'Refresh List'}
        </Button>
      </Box>

      <Divider sx={{ mb: 4 }} />
      
      <AudioList 
        refreshList={refreshKey}
        onRefreshComplete={handleRefreshComplete}
      />
      
      {isLoading && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic', textAlign: 'center' }}>
          Refreshing audio list...
        </Typography>
      )}
    </Container>
  );
};

export default AudioReviewPage; 