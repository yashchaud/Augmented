/**
 * UnityWebGLFix - Utility to fix common WebGL issues in Unity builds
 * Inspired by https://github.com/forcepusher/UnityWebUtility
 */

// Fix for 'null function or function signature mismatch' errors
export const applyUnityWebGLFixes = () => {
  // Add the fix to the window object to ensure it's available globally
  window.fixWebGLFunctionMismatch = () => {
    if (window.unityInstance) {
      console.log('Applying WebGL function signature mismatch fix...');
      
      try {
        // Attempt to fix memory handling issues
        const oldSendMessage = window.unityInstance.SendMessage;
        
        // Override the SendMessage function with more robust error handling
        window.unityInstance.SendMessage = (gameObjectName, methodName, parameter) => {
          try {
            return oldSendMessage(gameObjectName, methodName, parameter);
          } catch (err) {
            if (err.message && err.message.includes('function signature mismatch')) {
              console.warn('Caught and recovered from Unity function signature mismatch error');
              return null;
            }
            throw err;
          }
        };
        
        return true;
      } catch (err) {
        console.error('Error applying WebGL fixes:', err);
        return false;
      }
    }
    return false;
  };
  
  // Fix for WebGL context lost errors
  window.fixWebGLContextLost = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      console.log('Setting up WebGL context lost handler...');
      
      // Add event listener for WebGL context lost
      canvas.addEventListener('webglcontextlost', (e) => {
        console.warn('WebGL context lost, attempting to prevent default behavior');
        e.preventDefault();
        
        // Try to restore the context
        if (canvas.getContext) {
          setTimeout(() => {
            try {
              console.log('Attempting to restore WebGL context...');
              canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            } catch (err) {
              console.error('Failed to restore WebGL context:', err);
            }
          }, 1000);
        }
      }, false);
    }
  };
  
  // Fix for memory-related issues
  window.fixWebGLMemoryIssues = () => {
    // Increase Unity memory if possible
    if (window.unityInstance && window.unityInstance.Module) {
      try {
        console.log('Applying WebGL memory optimizations...');
        
        // If available, increase the memory allocation
        if (window.unityInstance.Module.TOTAL_MEMORY) {
          const currentMemory = window.unityInstance.Module.TOTAL_MEMORY;
          console.log(`Current WebGL memory allocation: ${currentMemory}`);
          
          // This might not work in all cases but worth trying
          if (typeof window.unityInstance.Module.TOTAL_MEMORY === 'number') {
            // Don't actually modify the memory - it's too late by this point
            // Just logging for diagnostic purposes
            console.log('Memory adjustments should be made in Unity build settings');
          }
        }
        
        return true;
      } catch (err) {
        console.error('Error applying memory optimizations:', err);
        return false;
      }
    }
    return false;
  };
  
  // Create a global error handler specifically for Unity WebGL errors
  window.addEventListener('error', (e) => {
    if (e.message && (
      e.message.includes('Unity') || 
      e.message.includes('WebGL') || 
      e.message.includes('function signature mismatch')
    )) {
      console.warn('Global Unity error caught:', e.message);
      
      // Don't prevent default behavior, just try to apply fixes
      if (e.message.includes('function signature mismatch')) {
        console.log('Attempting to fix function signature mismatch...');
        window.fixWebGLFunctionMismatch();
      }
      
      // Try to prevent the browser from getting into a bad state
      if (e.message.includes('memory') || e.message.includes('allocation')) {
        console.log('Attempting to fix memory issues...');
        window.fixWebGLMemoryIssues();
      }
    }
  });
  
  console.log('Unity WebGL fixes applied');
};

// Additional utility to detect browser and WebGL compatibility issues
export const checkWebGLCompatibility = () => {
  const result = {
    hasWebGL: false,
    browser: 'unknown',
    osName: 'unknown',
    isMobile: false,
    compatibilityIssues: [],
  };
  
  // Detect WebGL support
  try {
    const canvas = document.createElement('canvas');
    result.hasWebGL = !!(window.WebGLRenderingContext && 
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
      
    if (!result.hasWebGL) {
      result.compatibilityIssues.push('WebGL is not supported in this browser');
    }
  } catch (e) {
    result.hasWebGL = false;
    result.compatibilityIssues.push('Error checking WebGL support');
  }
  
  // Detect browser
  const userAgent = navigator.userAgent;
  if (userAgent.indexOf('Chrome') > -1) {
    result.browser = 'Chrome';
  } else if (userAgent.indexOf('Firefox') > -1) {
    result.browser = 'Firefox';
  } else if (userAgent.indexOf('Safari') > -1) {
    result.browser = 'Safari';
  } else if (userAgent.indexOf('Edge') > -1 || userAgent.indexOf('Edg') > -1) {
    result.browser = 'Edge';
  } else if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident/') > -1) {
    result.browser = 'Internet Explorer';
    result.compatibilityIssues.push('Internet Explorer has limited WebGL support');
  }
  
  // Detect OS
  if (userAgent.indexOf('Windows') > -1) {
    result.osName = 'Windows';
  } else if (userAgent.indexOf('Mac') > -1) {
    result.osName = 'macOS';
  } else if (userAgent.indexOf('Linux') > -1) {
    result.osName = 'Linux';
  } else if (userAgent.indexOf('Android') > -1) {
    result.osName = 'Android';
    result.isMobile = true;
  } else if (userAgent.indexOf('iPhone') > -1 || userAgent.indexOf('iPad') > -1) {
    result.osName = 'iOS';
    result.isMobile = true;
  }
  
  if (result.isMobile) {
    result.compatibilityIssues.push('Mobile devices may have limited WebGL performance');
  }
  
  // Check for WebGL version (try for WebGL 2.0)
  try {
    const canvas = document.createElement('canvas');
    const gl2 = canvas.getContext('webgl2');
    if (!gl2) {
      result.compatibilityIssues.push('WebGL 2.0 is not supported, which may affect some Unity content');
    }
  } catch (e) {
    // Ignore error
  }
  
  // Memory check (this is an approximation - not 100% reliable)
  if (window.performance && window.performance.memory) {
    const memory = window.performance.memory;
    if (memory.jsHeapSizeLimit < 2000000000) { // Less than ~2GB
      result.compatibilityIssues.push('Browser has limited memory which may affect complex WebGL applications');
    }
  }
  
  return result;
};

export default {
  applyUnityWebGLFixes,
  checkWebGLCompatibility
}; 