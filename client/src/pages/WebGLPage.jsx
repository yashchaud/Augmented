import { useState } from 'react';
import { Container, Typography, Divider, Box } from '@mui/material';
import WebGLUpload from '../components/webgl/WebGLUpload';
import WebGLList from '../components/webgl/WebGLList';
import WebGLViewer from '../components/webgl/WebGLViewer';

const WebGLPage = () => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadSuccess = () => {
    setRefreshKey(prevKey => prevKey + 1);
    setIsUploading(true);
  };

  const handleRefreshComplete = () => {
    setIsUploading(false);
  };

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    // Scroll to the top if needed
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        WebGL Player
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Upload and view WebGL projects in the browser.
      </Typography>

      <WebGLUpload onUploadSuccess={handleUploadSuccess} />
      
      {selectedProject && (
        <WebGLViewer 
          project={selectedProject} 
          onClose={() => setSelectedProject(null)} 
        />
      )}

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Your WebGL Projects
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <WebGLList 
          onSelectProject={handleSelectProject} 
          refreshList={refreshKey}
          onRefreshComplete={handleRefreshComplete}
        />
        
        {isUploading && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
            Refreshing project list...
          </Typography>
        )}
      </Box>
    </Container>
  );
};

export default WebGLPage; 