import { useState, useEffect, useRef } from 'react';
import { Box, Typography, CircularProgress, Alert, LinearProgress, Button } from '@mui/material';
import { Unity, useUnityContext } from 'react-unity-webgl';
import { applyUnityWebGLFixes, checkWebGLCompatibility } from './UnityWebGLPlayerFix';

const UnityWebGLPlayer = ({ src, title, height = '70vh', pathStructure, projectId }) => {
  const [error, setError] = useState('');
  const [loadingFailed, setLoadingFailed] = useState(false);
  const [loadingState, setLoadingState] = useState('initializing');
  const [isInitialized, setIsInitialized] = useState(false);
  const [compatibilityInfo, setCompatibilityInfo] = useState(null);
  const [fixesApplied, setFixesApplied] = useState(false);
  const unityContextRef = useRef(null);
  
  // Check WebGL compatibility
  useEffect(() => {
    const compatibility = checkWebGLCompatibility();
    setCompatibilityInfo(compatibility);
    
    if (compatibility.compatibilityIssues.length > 0) {
      console.warn('WebGL compatibility issues:', compatibility.compatibilityIssues);
    }
  }, []);
  
  // Apply WebGL fixes once when component mounts
  useEffect(() => {
    if (!fixesApplied) {
      applyUnityWebGLFixes();
      setFixesApplied(true);
    }
  }, [fixesApplied]);
  
  // Ensure correct path format for WebGL files
  const getWebGLPath = () => {
    switch(pathStructure) {
      case 'webgl':
        return {
          loaderUrl: `${src}/Build/WebGL.loader.js`,
          dataUrl: `${src}/Build/WebGL.data`,
          frameworkUrl: `${src}/Build/WebGL.framework.js`,
          codeUrl: `${src}/Build/WebGL.wasm`,
        };
      case 'direct':
        return {
          loaderUrl: `${src}/Build/WebGL.loader.js`,
          dataUrl: `${src}/Build/WebGL.data`,
          frameworkUrl: `${src}/Build/WebGL.framework.js`,
          codeUrl: `${src}/Build/WebGL.wasm`,
        };
      case 'root':
        return {
          loaderUrl: `${src}/WebGL.loader.js`,
          dataUrl: `${src}/WebGL.data`,
          frameworkUrl: `${src}/WebGL.framework.js`,
          codeUrl: `${src}/WebGL.wasm`,
        };
      case 'fallback':
      default:
        if (projectId) {
          const apiUrl = src.substring(0, src.lastIndexOf(`/${projectId}`));
          const fullUrl = `${apiUrl}/${projectId}/WebGL`;
          return {
            loaderUrl: `${fullUrl}/Build/WebGL.loader.js`,
            dataUrl: `${fullUrl}/Build/WebGL.data`,
            frameworkUrl: `${fullUrl}/Build/WebGL.framework.js`,
            codeUrl: `${fullUrl}/Build/WebGL.wasm`,
          };
        } else {
          return {
            loaderUrl: `${src}/WebGL/Build/WebGL.loader.js`,
            dataUrl: `${src}/WebGL/Build/WebGL.data`,
            frameworkUrl: `${src}/WebGL/Build/WebGL.framework.js`,
            codeUrl: `${src}/WebGL/Build/WebGL.wasm`,
          };
        }
    }
  };
  
  const paths = getWebGLPath();
  
  // Create Unity context with proper error handling
  const {
    unityProvider,
    isLoaded,
    loadingProgression,
    error: unityError,
    addEventListener,
    removeEventListener,
    sendMessage
  } = useUnityContext({
    loaderUrl: paths.loaderUrl,
    dataUrl: paths.dataUrl,
    frameworkUrl: paths.frameworkUrl,
    codeUrl: paths.codeUrl,
    streamingAssetsUrl: "StreamingAssets",
    companyName: "Life",
    productName: "i-Come To Life",
    productVersion: "0.1.0",
    webglContextAttributes: {
      preserveDrawingBuffer: true,
      powerPreference: 'default',
      failIfMajorPerformanceCaveat: false,
      desynchronized: false,
      antialias: true
    },
    showBanner: (msg, type) => {
      if (type === 'error') {
        setError(`Unity Error: ${msg}`);
        setLoadingFailed(true);
        setLoadingState('error');
      }
    },
  });

  // Store Unity context in ref
  useEffect(() => {
    unityContextRef.current = { unityProvider, isLoaded, sendMessage };
    
    if (unityProvider && unityProvider.Module) {
      window.unityInstance = unityProvider;
      window.unityModule = unityProvider.Module;
    }
  }, [unityProvider, isLoaded, sendMessage]);
  
  const loadingProgress = Math.round(loadingProgression * 100);

  // Initialize Unity context
  useEffect(() => {
    if (!isInitialized) {
      setLoadingState('initializing');
      
      const verifyFiles = async () => {
        try {
          const checkUrl = async (url, name) => {
            try {
              const response = await fetch(url, { method: 'HEAD' });
              return response.ok;
            } catch (err) {
              return false;
            }
          };
          
          const loaderOk = await checkUrl(paths.loaderUrl, 'loader');
          const dataOk = await checkUrl(paths.dataUrl, 'data');
          const frameworkOk = await checkUrl(paths.frameworkUrl, 'framework');
          const codeOk = await checkUrl(paths.codeUrl, 'code');
          
          if (!loaderOk || !dataOk || !frameworkOk || !codeOk) {
            setError('Could not access all required Unity WebGL files. Files may be missing or have a different structure.');
            setLoadingFailed(true);
          }
        } catch (error) {
          console.error('Error verifying file access:', error);
        }
      };
      
      verifyFiles();

      const initTimer = setTimeout(() => {
        setIsInitialized(true);
        setLoadingState('loading');
      }, 1000);

      return () => clearTimeout(initTimer);
    }
  }, [isInitialized, src, paths]);

  // Log loading progress
  useEffect(() => {
    if (isInitialized && loadingProgress > 0) {
      setLoadingState('loading');
    }
  }, [loadingProgress, isInitialized]);

  // Handle Unity errors
  useEffect(() => {
    if (unityError) {
      setError(unityError.message || 'Failed to load Unity WebGL content');
      setLoadingFailed(true);
      setLoadingState('error');
    }
  }, [unityError]);
  
  // Handle Unity events
  useEffect(() => {
    const handleError = (errorEvent) => {
      setError(errorEvent.message || 'Failed to load Unity WebGL content');
      setLoadingFailed(true);
      setLoadingState('error');
    };

    const handleLoaded = () => {
      setLoadingState('loaded');
      
      if (window.fixWebGLFunctionMismatch) {
        try {
          window.fixWebGLFunctionMismatch();
          window.fixWebGLContextLost();
        } catch (e) {
          console.error('Error applying WebGL fixes after load:', e);
        }
      }
    };

    const handleProgress = (progress) => {
      if (progress > 0) {
        setLoadingState('loading');
      }
    };
    
    addEventListener('error', handleError);
    addEventListener('loaded', handleLoaded);
    addEventListener('progress', handleProgress);
    
    const handleWindowError = (event) => {
      if (event.message && (
          event.message.includes('Unity') || 
          event.message.includes('WebGL') || 
          event.message.includes('.js') ||
          event.message.includes('.wasm') ||
          event.message.includes('RuntimeError') ||
          event.message.includes('function signature mismatch')
        )) {
        
        if (event.message.includes('function signature mismatch')) {
          setError(`Unity WebGL runtime error: The application contains incompatible code. This is an internal Unity WebGL error, not a problem with loading the files.`);
        } else if (event.message.includes('memory')) {
          setError(`Unity WebGL memory error: The application ran out of memory. Try closing other tabs or applications and refreshing.`);
        } else {
          setError(`Unity WebGL runtime error: ${event.message}`);
        }
        
        setLoadingFailed(true);
        setLoadingState('error');
        
        if (event.message.includes('function signature mismatch') && window.fixWebGLFunctionMismatch) {
          try {
            window.fixWebGLFunctionMismatch();
          } catch (e) {
            console.error('Error applying function mismatch fix:', e);
          }
        }
      }
    };
    
    window.addEventListener('error', handleWindowError);
    
    return () => {
      removeEventListener('error', handleError);
      removeEventListener('loaded', handleLoaded);
      removeEventListener('progress', handleProgress);
      window.removeEventListener('error', handleWindowError);
    };
  }, [addEventListener, removeEventListener]);

  const handleRetryInNewTab = () => {
    if (src && projectId) {
      const apiUrl = src.substring(0, src.lastIndexOf(`/${projectId}`));
      const webglUrl = `${apiUrl}/${projectId}`;
      window.open(webglUrl, '_blank');
    } else {
      window.open(src, '_blank');
    }
  };

  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
      {compatibilityInfo && compatibilityInfo.compatibilityIssues.length > 0 && (
        <Alert 
          severity="warning" 
          variant="filled"
          sx={{ 
            mb: 3, 
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}
        >
          <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 1 }}>
            WebGL Compatibility Notice ({compatibilityInfo.browser} on {compatibilityInfo.osName})
          </Typography>
          <ul style={{ margin: 0, paddingLeft: "20px" }}>
            {compatibilityInfo.compatibilityIssues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
        </Alert>
      )}
      
      {!isLoaded && !loadingFailed && (
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            height: height,
            flexDirection: 'column',
            backgroundColor: 'rgba(0,0,0,0.02)',
            borderRadius: 3,
            padding: 4,
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.03)',
            backdropFilter: 'blur(5px)'
          }}
        >
          <Typography 
            variant="h5" 
            color="primary.main" 
            fontWeight="600" 
            sx={{ mb: 3 }}
          >
            Loading {title}
          </Typography>
          
          {loadingProgress > 0 ? (
            <Box sx={{ width: '100%', maxWidth: 400, mb: 3 }}>
              <LinearProgress 
                variant="determinate" 
                value={loadingProgress} 
                sx={{ 
                  height: 12, 
                  borderRadius: 6,
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 6,
                    backgroundImage: 'linear-gradient(to right, #3a7bd5, #00d2ff)'
                  }
                }}
              />
              <Typography 
                variant="body2" 
                color="text.secondary" 
                align="center" 
                sx={{ mt: 1, fontWeight: 500 }}
              >
                {loadingProgress}%
              </Typography>
            </Box>
          ) : (
            <CircularProgress 
              sx={{ 
                mb: 3,
                color: 'primary.main'
              }} 
              thickness={4}
              size={60}
            />
          )}
          
          <Typography 
            variant="body2" 
            color="text.secondary"
            align="center"
            sx={{ maxWidth: 500 }}
          >
            {loadingState === 'initializing' && "Initializing Unity WebGL content... This may take a moment."}
            {loadingState === 'loading' && "Unity WebGL content is loading... Please wait."}
            {loadingState === 'error' && "Error loading Unity WebGL content. Please try again."}
          </Typography>
          
          <Alert 
            severity="info" 
            variant="outlined"
            sx={{ 
              mt: 4, 
              maxWidth: 500,
              borderRadius: 2,
              backgroundColor: 'rgba(3, 169, 244, 0.04)'
            }}
          >
            WebGL content performs best on Chrome or Edge browsers. First load may be slower.
            Subsequent visits will load faster thanks to browser caching.
          </Alert>
        </Box>
      )}
      
      {(error || loadingFailed) && (
        <Alert 
          severity="error" 
          variant="filled"
          sx={{ 
            mt: 3, 
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(211, 47, 47, 0.2)'
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>WebGL Error</Typography>
          <Typography sx={{ mb: 2 }}>{error || 'Failed to load Unity WebGL content'}</Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            If this is a runtime error with "function signature mismatch", it indicates the Unity WebGL build 
            may have compatibility issues with your browser. This is an issue with the WebGL application itself,
            not with the file loading.
          </Typography>
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" fontWeight="600">Troubleshooting:</Typography>
            <ul style={{ paddingLeft: "20px", marginTop: "10px" }}>
              <li>Try using a different browser (Chrome or Edge recommended)</li>
              <li>Make sure your graphics drivers are up to date</li>
              <li>Disable browser extensions that might interfere with WebGL</li>
              <li>Try opening the WebGL application in a new tab</li>
            </ul>
            
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleRetryInNewTab}
                sx={{ 
                  borderRadius: 2,
                  fontWeight: 600,
                  px: 3,
                  py: 1,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  '&:hover': {
                    boxShadow: '0 6px 15px rgba(0,0,0,0.2)'
                  }
                }}
              >
                Open in New Tab
              </Button>
            </Box>
          </Box>
        </Alert>
      )}
      
      <Box
        sx={{
          width: '100%',
          display: isLoaded && !loadingFailed ? 'block' : 'none',
          height: height,
          overflow: 'hidden',
          position: 'relative',
          borderRadius: 3,
          boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
        }}
      >
        <Unity 
          unityProvider={unityProvider}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
        />
      </Box>
    </Box>
  );
};

export default UnityWebGLPlayer; 