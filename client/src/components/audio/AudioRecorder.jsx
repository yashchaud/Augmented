import { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Paper, 
  Typography, 
  CircularProgress,
  Alert,
  IconButton,
  Stack
} from '@mui/material';
import { 
  MicNone as MicIcon, 
  Stop as StopIcon, 
  Save as SaveIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon
} from '@mui/icons-material';
import { uploadAudio } from '../../api';

const AudioRecorder = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioPlayerRef = useRef(null);

  // Clean up audio URL when component unmounts
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Start recording timer
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  // Stop recording timer
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Format time as mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start recording
  const startRecording = async () => {
    try {
      // Reset state
      setIsRecording(false);
      setAudioBlob(null);
      setAudioUrl('');
      setRecordingTime(0);
      setError('');
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Set state
        setAudioBlob(audioBlob);
        setAudioUrl(audioUrl);
        
        // Stop all tracks in the stream
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      
      // Start timer
      startTimer();
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Could not access microphone. Please check permissions.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopTimer();
      
      // Set default title with timestamp
      if (!title) {
        const date = new Date();
        setTitle(`Recording ${date.toLocaleString()}`);
      }
    }
  };

  // Play/pause recorded audio
  const togglePlayback = () => {
    if (!audioPlayerRef.current) return;
    
    if (isPlaying) {
      audioPlayerRef.current.pause();
    } else {
      audioPlayerRef.current.play();
    }
    
    setIsPlaying(!isPlaying);
  };

  // Handle playback ended
  const handlePlaybackEnded = () => {
    setIsPlaying(false);
  };

  // Discard recording
  const discardRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopTimer();
    }
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    setAudioBlob(null);
    setAudioUrl('');
    setRecordingTime(0);
    setTitle('');
  };

  // Save recording
  const saveRecording = async () => {
    if (!audioBlob) {
      setError('No recording to save');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const formData = new FormData();
      
      // Add .webm extension to make server recognize the file type
      const audioFile = new File([audioBlob], `${title || 'recording'}.webm`, { 
        type: 'audio/webm' 
      });
      
      formData.append('audio', audioFile);
      formData.append('title', title || `Recording ${new Date().toLocaleString()}`);
      
      await uploadAudio(formData);
      
      setSuccess(true);
      setAudioBlob(null);
      setAudioUrl('');
      setRecordingTime(0);
      setTitle('');
      
      // Notify parent component
      if (onRecordingComplete) onRecordingComplete();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving recording:', err);
      setError('Failed to save recording. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Audio Recorder
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
          Recording saved successfully!
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
      
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Typography variant="h3" component="div" sx={{ fontFamily: 'monospace' }}>
          {formatTime(recordingTime)}
        </Typography>
      </Box>
      
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        {!isRecording && !audioBlob ? (
          <Button
            variant="contained"
            color="primary"
            startIcon={<MicIcon />}
            fullWidth
            onClick={startRecording}
          >
            Start Recording
          </Button>
        ) : (
          <>
            {isRecording ? (
              <Button
                variant="contained"
                color="error"
                startIcon={<StopIcon />}
                fullWidth
                onClick={stopRecording}
              >
                Stop Recording
              </Button>
            ) : (
              <>
                <Button
                  variant="outlined"
                  startIcon={isPlaying ? <PauseIcon /> : <PlayIcon />}
                  onClick={togglePlayback}
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={saveRecording}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={discardRecording}
                >
                  Discard
                </Button>
              </>
            )}
          </>
        )}
      </Stack>
      
      {audioBlob && (
        <>
          <audio 
            ref={audioPlayerRef} 
            src={audioUrl} 
            onEnded={handlePlaybackEnded} 
            style={{ display: 'none' }} 
          />
          
          <TextField
            fullWidth
            label="Recording Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            margin="normal"
            variant="outlined"
            placeholder="Enter a title for your recording"
          />
        </>
      )}
      
      {isRecording && (
        <Typography 
          variant="body2" 
          color="error" 
          sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <span style={{ 
            display: 'inline-block', 
            width: '10px', 
            height: '10px', 
            borderRadius: '50%', 
            backgroundColor: 'red',
            marginRight: '8px',
            animation: 'pulse 1s infinite'
          }} />
          Recording in progress...
        </Typography>
      )}
    </Paper>
  );
};

export default AudioRecorder; 