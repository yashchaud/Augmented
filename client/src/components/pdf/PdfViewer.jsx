import { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  Button, 
  CircularProgress, 
  Pagination,
  Grid,
  Divider,
  Tooltip
} from '@mui/material';
import { 
  Close as CloseIcon, 
  Download as DownloadIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
} from '@mui/icons-material';
import { viewPdf, extractPdfPage } from '../../api';

// Using public CDN for PDF.js viewer - replace with your hosted version when available
const PDF_JS_VIEWER_URL = 'https://mozilla.github.io/pdf.js/web/viewer.html';

const PdfViewer = ({ pdf, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [thumbnails, setThumbnails] = useState([]);
  const [loadingThumbnails, setLoadingThumbnails] = useState(true);
  const containerRef = useRef(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (pdf) {
      setLoading(true);
      setTotalPages(pdf.pageCount || 0);
      setPage(1); // reset to first page whenever we get a new PDF
      generateThumbnails();
    }

    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    };
  }, [pdf]);

  const generateThumbnails = async () => {
    if (!pdf || !pdf.pageCount) return;
    setLoadingThumbnails(true);
    const thumbnailArray = Array.from({ length: pdf.pageCount }, (_, i) => i + 1);
    setThumbnails(thumbnailArray);
    setLoadingThumbnails(false);
  };

  // Generate PDF.js viewer URL with proper parameters
  const getPdfJsViewerUrl = (pdfUrl, pageNumber = 1) => {
    // Make sure the PDF URL is absolute
    const absolutePdfUrl = pdfUrl.startsWith('http') 
      ? pdfUrl 
      : `${window.location.origin}${pdfUrl}`;
    
    // Encode the PDF URL to safely pass it as a parameter
    const encodedPdfUrl = encodeURIComponent(absolutePdfUrl);
    
    return `${PDF_JS_VIEWER_URL}?file=${encodedPdfUrl}#page=${pageNumber}`;
  };

  // Set iframe to specific page using PDF.js viewer
  const setIframeToPage = (pageNumber) => {
    if (!pdf) return;
    const pdfUrl = viewPdf(pdf._id);
    const viewerUrl = getPdfJsViewerUrl(pdfUrl, pageNumber);
    
    if (iframeRef.current) {
      iframeRef.current.src = viewerUrl;
    }
  };

  // handle Pagination widget
  const handlePageChange = (event, value) => {
    if (value !== page) {
      setPage(value);
      setIframeToPage(value);
    }
  };

  // handle thumbnail clicks
  const handleThumbnailClick = (pageNum) => {
    if (pageNum !== page) {
      setPage(pageNum);
      setIframeToPage(pageNum);
      // On small screens, scroll back to the top
      if (window.innerWidth < 960) {
        containerRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleDownloadPage = () => {
    if (pdf && page) {
      window.open(extractPdfPage(pdf._id, page), '_blank');
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => console.error('Error enabling fullscreen:', err));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(err => console.error('Error exiting fullscreen:', err));
    }
  };

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleLoadError = () => {
    setError('Failed to load PDF. Please try again later.');
    setLoading(false);
  };

  // Get initial URL for the PDF.js viewer
  const pdfUrl = pdf ? viewPdf(pdf._id) : '';
  const initialUrl = pdf ? getPdfJsViewerUrl(pdfUrl, page) : '';

  if (!pdf) return null;

  return (
    <Paper
      elevation={3}
      sx={{
        mt: 2,
        p: 2,
        position: 'relative',
        ...(isFullscreen && {
          height: '100vh',
          width: '100vw',
          m: 0,
          p: 2,
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
        })
      }}
      ref={containerRef}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1,
          ...(isFullscreen && { flex: '0 0 auto' })
        }}
      >
        <Typography variant="h6">{pdf.title}</Typography>
        <Box>
          <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
            <IconButton onClick={toggleFullscreen} size="small" sx={{ mr: 1 }}>
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Content */}
      <Grid
        container
        spacing={2}
        sx={{
          ...(isFullscreen && { flex: '1 1 auto', overflow: 'hidden' })
        }}
      >
        {/* Thumbnails Column */}
        <Grid
          item
          xs={12}
          md={2}
          sx={{
            display: { xs: 'none', md: 'block' },
            overflowY: 'auto',
            maxHeight: isFullscreen ? 'calc(100vh - 140px)' : '70vh',
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Pages
          </Typography>
          <Divider sx={{ mb: 1 }} />
          {loadingThumbnails ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                overflowY: 'auto',
              }}
            >
              {thumbnails.map(pageNum => (
                <Box
                  key={pageNum}
                  onClick={() => handleThumbnailClick(pageNum)}
                  sx={{
                    cursor: 'pointer',
                    border: page === pageNum ? '2px solid #1976d2' : '1px solid #e0e0e0',
                    borderRadius: 1,
                    position: 'relative',
                    height: '100px',
                    overflow: 'hidden',
                    backgroundColor: '#f5f5f5',
                    '&:hover': {
                      borderColor: page === pageNum ? '#1976d2' : '#bbdefb',
                    },
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      fontSize: '1.5rem',
                      color: '#9e9e9e',
                    }}
                  >
                    {pageNum}
                  </Box>
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      bgcolor: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      textAlign: 'center',
                      fontSize: '0.7rem',
                      padding: '2px 0',
                    }}
                  >
                    Page {pageNum}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Grid>

        {/* PDF Viewer Column */}
        <Grid
          item
          xs={12}
          md={10}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            ...(isFullscreen && { height: 'calc(100vh - 140px)' }),
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="body2">
              Page {page} of {totalPages}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadPage}
                disabled={!totalPages}
              >
                Download Page
              </Button>
            </Box>
          </Box>

          {/* Loading / Error States */}
          {loading && (
            <Box
              sx={{
                flex: '1 1 auto',
                minHeight: '500px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <CircularProgress />
            </Box>
          )}
          {error && (
            <Box sx={{ mt: 2 }}>
              <Typography color="error">{error}</Typography>
            </Box>
          )}

          {/* Iframe */}
          <Box
            sx={{
              width: '100%',
              display: loading ? 'none' : 'block',
              flex: '1 1 auto',
              overflow: 'hidden',
              position: 'relative',
              height: isFullscreen ? 'calc(100vh - 200px)' : '70vh',
              border: '1px solid #e0e0e0',
              borderRadius: 1,
            }}
          >
            <iframe
              ref={iframeRef}
              src={initialUrl}
              width="100%"
              height="100%"
              style={{ border: 'none', display: 'block' }}
              onLoad={handleIframeLoad}
              onError={handleLoadError}
              title={`${pdf.title} - Page ${page}`}
              allow="fullscreen"
              sandbox="allow-same-origin allow-scripts allow-forms"
            />
          </Box>

          {/* Pagination */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              mt: 2,
              flexWrap: 'wrap',
              gap: 1,
              flex: '0 0 auto',
            }}
          >
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              disabled={loading}
              siblingCount={1}
              boundaryCount={1}
            />
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default PdfViewer;
