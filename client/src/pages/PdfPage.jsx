import { useState } from 'react';
import { Container, Typography, Divider, Box } from '@mui/material';
import PdfUpload from '../components/pdf/PdfUpload';
import PdfList from '../components/pdf/PdfList';
import PdfViewer from '../components/pdf/PdfViewer';

const PdfPage = () => {
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadSuccess = () => {
    setRefreshKey(prevKey => prevKey + 1);
    setIsUploading(true);
  };

  const handleRefreshComplete = () => {
    setIsUploading(false);
  };

  const handleSelectPdf = (pdf) => {
    setSelectedPdf(pdf);
    // Scroll to the top if needed
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        PDF Viewer
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Upload, view, and download PDFs with multi-page support.
      </Typography>

      <PdfUpload onUploadSuccess={handleUploadSuccess} />
      
      {selectedPdf && (
        <PdfViewer 
          pdf={selectedPdf} 
          onClose={() => setSelectedPdf(null)} 
        />
      )}

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Your PDFs
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <PdfList 
          onSelectPdf={handleSelectPdf} 
          refreshList={refreshKey}
          onRefreshComplete={handleRefreshComplete}
        />
        
        {isUploading && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
            Refreshing PDF list...
          </Typography>
        )}
      </Box>
    </Container>
  );
};

export default PdfPage; 