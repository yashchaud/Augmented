import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Container } from '@mui/material';

import Navigation from './components/Navigation';
import VideoPage from './pages/VideoPage';
import PdfPage from './pages/PdfPage';
import AudioRecordingPage from './pages/AudioRecordingPage';
import WebGLPage from './pages/WebGLPage';
import AudioReviewPage from './pages/AudioReviewPage';

// Create a modern theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3a7bd5',
      light: '#63a4ff',
      dark: '#0d47a1',
      contrastText: '#fff',
    },
    secondary: {
      main: '#00d2ff',
      light: '#6effff',
      dark: '#0099cc',
      contrastText: '#000',
    },
    background: {
      default: '#f7f9fc',
      paper: '#ffffff',
    },
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ff9800',
    },
    info: {
      main: '#03a9f4',
    },
    success: {
      main: '#4caf50',
    },
    text: {
      primary: '#2d3748',
      secondary: '#718096',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0px 2px 1px -1px rgba(0,0,0,0.05),0px 1px 1px 0px rgba(0,0,0,0.03),0px 1px 3px 0px rgba(0,0,0,0.05)',
    '0px 3px 3px -2px rgba(0,0,0,0.05),0px 2px 6px 0px rgba(0,0,0,0.05),0px 1px 8px 0px rgba(0,0,0,0.07)',
    '0px 3px 4px -2px rgba(0,0,0,0.06),0px 3px 8px 0px rgba(0,0,0,0.06),0px 1px 12px 0px rgba(0,0,0,0.08)',
    '0px 2px 5px -1px rgba(0,0,0,0.06),0px 4px 10px 0px rgba(0,0,0,0.07),0px 1px 14px 0px rgba(0,0,0,0.09)',
    '0px 3px 6px -1px rgba(0,0,0,0.07),0px 5px 12px 0px rgba(0,0,0,0.08),0px 1px 18px 0px rgba(0,0,0,0.10)',
    '0px 4px 6px -2px rgba(0,0,0,0.07),0px 6px 14px 0px rgba(0,0,0,0.09),0px 1px 20px 0px rgba(0,0,0,0.11)',
    '0px 5px 7px -2px rgba(0,0,0,0.07),0px 7px 16px 0px rgba(0,0,0,0.10),0px 2px 22px 0px rgba(0,0,0,0.12)',
    '0px 5px 8px -2px rgba(0,0,0,0.08),0px 8px 18px 0px rgba(0,0,0,0.11),0px 2px 24px 0px rgba(0,0,0,0.13)',
    '0px 6px 9px -3px rgba(0,0,0,0.09),0px 9px 20px 0px rgba(0,0,0,0.12),0px 2px 26px 0px rgba(0,0,0,0.14)',
    '0px 6px 10px -3px rgba(0,0,0,0.09),0px 10px 22px 0px rgba(0,0,0,0.13),0px 3px 28px 0px rgba(0,0,0,0.15)',
    '0px 7px 11px -3px rgba(0,0,0,0.10),0px 11px 24px 0px rgba(0,0,0,0.14),0px 3px 30px 0px rgba(0,0,0,0.16)',
    '0px 7px 12px -4px rgba(0,0,0,0.10),0px 12px 26px 0px rgba(0,0,0,0.15),0px 3px 32px 0px rgba(0,0,0,0.17)',
    '0px 7px 13px -4px rgba(0,0,0,0.11),0px 13px 28px 0px rgba(0,0,0,0.16),0px 4px 34px 0px rgba(0,0,0,0.18)',
    '0px 8px 14px -4px rgba(0,0,0,0.11),0px 14px 30px 0px rgba(0,0,0,0.17),0px 4px 36px 0px rgba(0,0,0,0.19)',
    '0px 8px 15px -5px rgba(0,0,0,0.12),0px 15px 32px 0px rgba(0,0,0,0.18),0px 4px 38px 0px rgba(0,0,0,0.20)',
    '0px 8px 16px -5px rgba(0,0,0,0.12),0px 16px 34px 0px rgba(0,0,0,0.19),0px 5px 40px 0px rgba(0,0,0,0.21)',
    '0px 9px 17px -5px rgba(0,0,0,0.13),0px 17px 36px 0px rgba(0,0,0,0.20),0px 5px 42px 0px rgba(0,0,0,0.22)',
    '0px 9px 18px -6px rgba(0,0,0,0.13),0px 18px 38px 0px rgba(0,0,0,0.21),0px 5px 44px 0px rgba(0,0,0,0.23)',
    '0px 10px 19px -6px rgba(0,0,0,0.14),0px 19px 40px 0px rgba(0,0,0,0.22),0px 6px 46px 0px rgba(0,0,0,0.24)',
    '0px 10px 20px -6px rgba(0,0,0,0.14),0px 20px 42px 0px rgba(0,0,0,0.23),0px 6px 48px 0px rgba(0,0,0,0.25)',
    '0px 10px 21px -7px rgba(0,0,0,0.15),0px 21px 44px 0px rgba(0,0,0,0.24),0px 6px 50px 0px rgba(0,0,0,0.26)',
    '0px 11px 22px -7px rgba(0,0,0,0.15),0px 22px 46px 0px rgba(0,0,0,0.25),0px 7px 52px 0px rgba(0,0,0,0.27)',
    '0px 11px 23px -7px rgba(0,0,0,0.16),0px 23px 48px 0px rgba(0,0,0,0.26),0px 7px 54px 0px rgba(0,0,0,0.28)',
  ],
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 16px',
        },
        contained: {
          boxShadow: '0 4px 12px rgba(58, 123, 213, 0.2)',
          '&:hover': {
            boxShadow: '0 6px 16px rgba(58, 123, 213, 0.3)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 5px 15px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 16,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: 'none',
          boxShadow: '0 2px 15px rgba(0,0,0,0.05)',
        },
      },
    },
  },
});

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
          <Navigation />
          <Box 
            component="main" 
            sx={{ 
              flexGrow: 1, 
              width: { sm: `calc(100% - 240px)` },
              mt: '64px', // AppBar height
              p: 3,
              backgroundColor: 'background.default',
              transition: 'all 0.3s ease',
              overflow: 'auto',
            }}
          >
            <Container maxWidth="xl" sx={{ py: 3 }}>
              <Routes>
                <Route path="/" element={<VideoPage />} />
                <Route path="/video" element={<VideoPage />} />
                <Route path="/pdf" element={<PdfPage />} />
                <Route path="/audio-recorder" element={<AudioRecordingPage />} />
                <Route path="/webgl" element={<WebGLPage />} />
                <Route path="/audio-review" element={<AudioReviewPage />} />
              </Routes>
            </Container>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
};

export default App;
