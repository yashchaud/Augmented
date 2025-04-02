import axios from 'axios';

// Make API URL dynamic based on environment
// In production, use the same host that serves the frontend
// In development, use localhost
const API_URL = (process.env.NODE_ENV === 'production' || window.location.hostname !== 'localhost')
  ? `${window.location.origin}/api`
  : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Set the auth token for any initial load
const userData = localStorage.getItem('user');
if (userData) {
  const parsedUser = JSON.parse(userData);
  api.defaults.headers.common['Authorization'] = `Bearer ${parsedUser.token}`;
}

// Get token for direct API calls
const getAuthToken = () => {
  const userData = localStorage.getItem('user');
  if (userData) {
    const parsedUser = JSON.parse(userData);
    return parsedUser.token;
  }
  return null;
};

// Get URL with auth token for direct API calls
const getAuthUrl = (url) => {
  const token = getAuthToken();
  if (token) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${token}`;
  }
  return url;
};

// Auth API calls
export const login = (credentials) => api.post('/users/login', credentials);
export const register = (userData) => api.post('/users', userData);
export const getUserProfile = () => api.get('/users/profile');

// Video API calls
export const uploadVideo = (formData) => {
  return api.post('/video', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getVideos = () => api.get('/video');
export const getVideoById = (id) => api.get(`/video/${id}`);
export const streamVideo = (id) => getAuthUrl(`${API_URL}/video/stream/${id}`);
export const deleteVideo = (id) => api.delete(`/video/${id}`);

// PDF API calls
export const uploadPdf = (formData) => {
  return api.post('/pdf', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getPdfs = () => api.get('/pdf');
export const getPdfById = (id) => api.get(`/pdf/${id}`);
export const viewPdf = (id) => getAuthUrl(`${API_URL}/pdf/view/${id}`);
export const extractPdfPage = (id, pageNumber) => getAuthUrl(`${API_URL}/pdf/extract/${id}?pageNumber=${pageNumber}`);
export const deletePdf = (id) => api.delete(`/pdf/${id}`);

// Audio API calls
export const uploadAudio = (formData) => {
  return api.post('/audio', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getAudios = () => api.get('/audio');
export const getAudioById = (id) => api.get(`/audio/${id}`);
export const streamAudio = (id) => getAuthUrl(`${API_URL}/audio/stream/${id}`);
export const updateAudio = (id, data) => api.put(`/audio/${id}`, data);
export const deleteAudio = (id) => api.delete(`/audio/${id}`);

// WebGL API calls
export const uploadWebGL = (formData) => {
  return api.post('/webgl', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getWebGLProjects = () => api.get('/webgl');
export const getWebGLById = (id) => api.get(`/webgl/${id}`);
export const deleteWebGL = (id) => api.delete(`/webgl/${id}`);

// Return the base URL for viewing WebGL content
// This endpoint will serve the index.html or any WebGL assets
export const viewWebGL = (id) => getAuthUrl(`${API_URL}/webgl/view/${id}`);

// Helper function to get the specific WebGL path with the confirmed structure
export const getWebGLFilePath = (id, filePath) => {
  // If a specific file path is provided, append it to the base URL
  if (filePath) {
    return getAuthUrl(`${API_URL}/webgl/view/${id}/${filePath}`);
  }
  return getAuthUrl(`${API_URL}/webgl/view/${id}`);
};

// Intercept requests to add auth token
api.interceptors.request.use(
  (config) => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      config.headers.Authorization = `Bearer ${parsedUser.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercept 401 responses to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api; 