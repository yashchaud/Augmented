import { useState, useEffect } from 'react';
import { Box, Paper, Typography, IconButton, Alert, Button, CircularProgress } from '@mui/material';
import { Close as CloseIcon, OpenInNew as OpenInNewIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import UnityWebGLPlayer from './UnityWebGLPlayer';
import axios from 'axios';
import { getWebGLById, viewWebGL } from '../../api';

const WebGLViewer = ({ project, onClose }) => {
  const [error, setError] = useState('');
  const [directUrl, setDirectUrl] = useState('');
  const [isVerifying, setIsVerifying] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [pathStructure, setPathStructure] = useState(''); // Store which path structure works
  
  const verifyProject = async () => {
    if (!project?._id) {
      setError('Invalid project data');
      setIsVerifying(false);
      return;
    }
    
    try {
      console.log(`Verifying project exists: ${project._id}`);
      setIsVerifying(true);
      
      // Check if the project exists in the database
      const projectResponse = await getWebGLById(project._id);
      console.log('Project details from API:', projectResponse.data);
      
      // Get the URL for the WebGL project
      const webglUrl = viewWebGL(project._id);
      console.log(`WebGL URL: ${webglUrl}`);
      
      // Verify the index file exists
      try {
        // First check if the main index.html is accessible
        const indexResponse = await axios.get(webglUrl);
        if (indexResponse.status === 200) {
          console.log('WebGL index.html is accessible');
          
          // Test both potential file paths (with and without /WebGL/) to see which one works
          const testPaths = async () => {
            console.log('Testing WebGL file paths...');
            
            // Define paths to test
            const pathsToTest = [
              // Path with WebGL directory
              {
                label: 'With WebGL directory',
                pathType: 'webgl',
                loaderUrl: `${webglUrl}/WebGL/Build/WebGL.loader.js`,
                baseUrl: `${webglUrl}/WebGL`
              },
              // Path without WebGL directory (for already processed URLs)
              {
                label: 'Without WebGL directory',
                pathType: 'direct',
                loaderUrl: `${webglUrl}/Build/WebGL.loader.js`,
                baseUrl: webglUrl
              },
              // Fallback direct project folder path
              {
                label: 'Direct project path',
                pathType: 'root',
                loaderUrl: `${webglUrl}/WebGL.loader.js`,
                baseUrl: webglUrl
              }
            ];
            
            let foundWorkingPath = false;
            
            // Test each path
            for (const path of pathsToTest) {
              try {
                console.log(`Testing path: ${path.loaderUrl}`);
                const response = await axios.head(path.loaderUrl);
                if (response.status === 200) {
                  console.log(`✅ Found working path: ${path.label}`);
                  console.log(`Working URL: ${path.loaderUrl}`);
                  console.log(`Base URL: ${path.baseUrl}`);
                  foundWorkingPath = true;
                  
                  // Store which path structure worked
                  setPathStructure(path.pathType);
                  setDirectUrl(path.baseUrl);
                  setError('');
                  return true;
                }
              } catch (err) {
                console.log(`❌ Path not accessible: ${path.label}`);
                console.log(`Failed URL: ${path.loaderUrl}`);
                // Continue trying other paths
              }
            }
            
            // If we get here and we haven't found a working path but have a webglUrl,
            // set it anyway as a fallback and let the Unity player try to handle it
            if (!foundWorkingPath) {
              console.warn('No working path found, using default URL as fallback');
              setPathStructure('fallback');
              setDirectUrl(webglUrl);
              return false;
            }
          };
          
          // Run the path test
          await testPaths();
        }
      } catch (endpointErr) {
        console.error('Error accessing WebGL files:', endpointErr);
        setError('Unable to access WebGL content. The project files may be missing or corrupted.');
      }
    } catch (err) {
      console.error('Error verifying WebGL project:', err);
      setError('Project not found or no longer available.');
    } finally {
      setIsVerifying(false);
    }
  };
  
  useEffect(() => {
    if (project) {
      setError('');
      setIsVerifying(true);
      setDirectUrl('');
      setPathStructure('');
      verifyProject();
    }
  }, [project, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const openInNewTab = () => {
    if (project && directUrl) {
      window.open(directUrl, '_blank');
    }
  };

  if (!project) {
    return null;
  }

  return (
    <Paper elevation={3} sx={{ mt: 2, p: 2, position: 'relative' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">{project.title}</Typography>
        <Box>
          {!isVerifying && (
            <IconButton 
              onClick={handleRetry} 
              size="small" 
              title="Retry loading" 
              sx={{ mr: 1 }}
            >
              <RefreshIcon />
            </IconButton>
          )}
          <IconButton 
            onClick={openInNewTab} 
            size="small" 
            title="Open in new tab" 
            sx={{ mr: 1 }}
            disabled={!directUrl}
          >
            <OpenInNewIcon />
          </IconButton>
          <IconButton onClick={onClose} size="small" title="Close">
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {project.description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {project.description}
        </Typography>
      )}

      <Alert severity="info" sx={{ mb: 2 }}>
        This is a Unity WebGL application. If it doesn't load properly, try the "Open in new tab" button.
        You may need to click inside the frame to interact with it.
      </Alert>

      {isVerifying && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ ml: 2 }}>
            Verifying WebGL project...
          </Typography>
        </Box>
      )}

      {error && (
        <Box sx={{ mt: 2 }}>
          <Alert severity="error">
            <Typography sx={{ mb: 1 }}>{error}</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={handleRetry}
                startIcon={<RefreshIcon />}
              >
                Retry
              </Button>
              {directUrl && (
                <Button 
                  variant="contained" 
                  size="small" 
                  onClick={openInNewTab}
                  startIcon={<OpenInNewIcon />}
                >
                  Open in new tab
                </Button>
              )}
            </Box>
          </Alert>
        </Box>
      )}

      {directUrl && !isVerifying && !error && (
        <UnityWebGLPlayer 
          src={directUrl} 
          title={project.title} 
          height="70vh"
          pathStructure={pathStructure}
          projectId={project._id}
        />
      )}
    </Paper>
  );
};

export default WebGLViewer; 