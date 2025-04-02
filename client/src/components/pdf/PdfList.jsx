import { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Button, Grid, CircularProgress } from '@mui/material';
import { Delete as DeleteIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { getPdfs, deletePdf } from '../../api';

const PdfList = ({ onSelectPdf, refreshList, onRefreshComplete }) => {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPdfs();
  }, [refreshList]);

  const fetchPdfs = async () => {
    try {
      setLoading(true);
      const response = await getPdfs();
      setPdfs(response.data);
      if (onRefreshComplete) onRefreshComplete();
    } catch (err) {
      console.error('Error fetching PDFs:', err);
      setError('Failed to load PDFs. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deletePdf(id);
      setPdfs(pdfs.filter((pdf) => pdf._id !== id));
    } catch (err) {
      console.error('Error deleting PDF:', err);
      setError('Failed to delete PDF. Please try again.');
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
        <Button variant="outlined" onClick={fetchPdfs} sx={{ mt: 1 }}>
          Try Again
        </Button>
      </Box>
    );
  }

  if (pdfs.length === 0) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography>No PDFs available. Upload a PDF to get started.</Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      {pdfs.map((pdf) => (
        <Grid item xs={12} sm={6} md={4} key={pdf._id}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" noWrap title={pdf.title}>
                {pdf.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pages: {pdf.pageCount || 'Unknown'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {new Date(pdf.createdAt).toLocaleString()}
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Button
                  variant="contained"
                  startIcon={<ViewIcon />}
                  onClick={() => onSelectPdf(pdf)}
                  size="small"
                >
                  View
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleDelete(pdf._id)}
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

export default PdfList; 