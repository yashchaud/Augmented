import { useState } from 'react';
import { Container, Typography, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AudioRecorder from '../components/audio/AudioRecorder';

const AudioRecordingPage = () => {
  const [recordingCompleted, setRecordingCompleted] = useState(false);
  const navigate = useNavigate();

  const handleRecordingComplete = () => {
    setRecordingCompleted(true);
  };

  const goToReviewPage = () => {
    navigate('/audio-review');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Audio Recording
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Record your voice and save it to the database.
      </Typography>

      <AudioRecorder onRecordingComplete={handleRecordingComplete} />
      
      {recordingCompleted && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Your recording has been saved! You can view and manage all your recordings in the review page.
          </Typography>
          <Button variant="contained" onClick={goToReviewPage}>
            Go to Audio Review
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default AudioRecordingPage; 