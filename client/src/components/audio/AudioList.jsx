import { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Grid, 
  CircularProgress,
  IconButton,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Slider,
  Stack
} from '@mui/material';
import { 
  Delete as DeleteIcon, 
  PlayArrow as PlayIcon, 
  Pause as PauseIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { getAudios, deleteAudio, updateAudio, streamAudio } from '../../api';

const AudioList = ({ refreshList, onRefreshComplete }) => {
  const [audios, setAudios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editId, setEditId] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const audioRef = useRef(new Audio());

  useEffect(() => {
    fetchAudios();
  }, [refreshList]);

  useEffect(() => {
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleDurationChange = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, []);

  const fetchAudios = async () => {
    try {
      setLoading(true);
      const response = await getAudios();
      setAudios(response.data);
      if (onRefreshComplete) onRefreshComplete();
    } catch (err) {
      console.error('Error fetching audios:', err);
      setError('Failed to load audio recordings. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = (audio) => {
    const audioElement = audioRef.current;

    if (currentAudio && currentAudio._id === audio._id) {
      // Same audio - toggle play/pause
      if (isPlaying) {
        audioElement.pause();
      } else {
        audioElement.play();
      }
      setIsPlaying(!isPlaying);
    } else {
      // Different audio - load and play
      if (isPlaying) {
        audioElement.pause();
      }
      audioElement.src = streamAudio(audio._id);
      audioElement.load();
      audioElement.play();
      setCurrentAudio(audio);
      setIsPlaying(true);
    }
  };

  const handleTimeChange = (event, newValue) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newValue;
      setCurrentTime(newValue);
    }
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleOpenEditDialog = (audio) => {
    setEditId(audio._id);
    setEditTitle(audio.title);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditId(null);
    setEditTitle('');
  };

  const handleSaveEdit = async () => {
    try {
      await updateAudio(editId, { title: editTitle });
      setAudios(audios.map(audio => 
        audio._id === editId ? { ...audio, title: editTitle } : audio
      ));
      handleCloseEditDialog();
    } catch (err) {
      console.error('Error updating audio:', err);
      setError('Failed to update audio title. Please try again.');
    }
  };

  const handleOpenDeleteDialog = (id) => {
    setDeleteId(id);
    setConfirmDeleteOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setConfirmDeleteOpen(false);
    setDeleteId(null);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteAudio(deleteId);
      
      // If deleting currently playing audio, stop playback
      if (currentAudio && currentAudio._id === deleteId) {
        audioRef.current.pause();
        setIsPlaying(false);
        setCurrentAudio(null);
      }
      
      setAudios(audios.filter((audio) => audio._id !== deleteId));
      handleCloseDeleteDialog();
    } catch (err) {
      console.error('Error deleting audio:', err);
      setError('Failed to delete audio. Please try again.');
      handleCloseDeleteDialog();
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
        <Button variant="outlined" onClick={fetchAudios} sx={{ mt: 1 }}>
          Try Again
        </Button>
      </Box>
    );
  }

  if (audios.length === 0) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography>No audio recordings available. Record audio to get started.</Typography>
      </Box>
    );
  }

  return (
    <>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {audios.map((audio) => (
          <Grid item xs={12} key={audio._id}>
            <Card variant="outlined">
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={4}>
                    <Typography variant="h6" noWrap title={audio.title}>
                      {audio.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(audio.createdAt).toLocaleString()}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={5}>
                    {currentAudio && currentAudio._id === audio._id ? (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <IconButton 
                          onClick={() => handlePlayPause(audio)}
                          color="primary"
                        >
                          {isPlaying ? <PauseIcon /> : <PlayIcon />}
                        </IconButton>
                        <Box sx={{ flexGrow: 1 }}>
                          <Slider
                            value={currentTime}
                            onChange={handleTimeChange}
                            max={duration || 100}
                            min={0}
                            size="small"
                          />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption">{formatTime(currentTime)}</Typography>
                            <Typography variant="caption">{formatTime(duration)}</Typography>
                          </Box>
                        </Box>
                      </Stack>
                    ) : (
                      <Button
                        variant="outlined"
                        startIcon={<PlayIcon />}
                        onClick={() => handlePlayPause(audio)}
                        size="small"
                      >
                        Play
                      </Button>
                    )}
                  </Grid>
                  
                  <Grid item xs={12} sm={3} container justifyContent="flex-end">
                    <IconButton
                      onClick={() => handleOpenEditDialog(audio)}
                      color="primary"
                      size="small"
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleOpenDeleteDialog(audio._id)}
                      color="error"
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog}>
        <DialogTitle>Edit Recording Title</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Update the title of your audio recording.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Title"
            fullWidth
            variant="outlined"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={!editTitle.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this audio recording? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AudioList; 