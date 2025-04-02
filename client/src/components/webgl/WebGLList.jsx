import { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Button, Grid, CircularProgress } from '@mui/material';
import { Delete as DeleteIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { getWebGLProjects, deleteWebGL } from '../../api';

const WebGLList = ({ onSelectProject, refreshList, onRefreshComplete }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, [refreshList]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await getWebGLProjects();
      setProjects(response.data);
      if (onRefreshComplete) onRefreshComplete();
    } catch (err) {
      console.error('Error fetching WebGL projects:', err);
      setError('Failed to load WebGL projects. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteWebGL(id);
      setProjects(projects.filter((project) => project._id !== id));
    } catch (err) {
      console.error('Error deleting WebGL project:', err);
      setError('Failed to delete WebGL project. Please try again.');
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
        <Button variant="outlined" onClick={fetchProjects} sx={{ mt: 1 }}>
          Try Again
        </Button>
      </Box>
    );
  }

  if (projects.length === 0) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography>No WebGL projects available. Upload a project to get started.</Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      {projects.map((project) => (
        <Grid item xs={12} sm={6} md={4} key={project._id}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" noWrap title={project.title}>
                {project.title}
              </Typography>
              {project.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {project.description}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                {new Date(project.createdAt).toLocaleString()}
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Button
                  variant="contained"
                  startIcon={<ViewIcon />}
                  onClick={() => onSelectProject(project)}
                  size="small"
                >
                  View
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleDelete(project._id)}
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

export default WebGLList; 